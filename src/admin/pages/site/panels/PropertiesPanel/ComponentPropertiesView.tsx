import type { AnyModuleDefinition, PropertyControl } from '@core/module-engine'
import {
  analyseComponentLibraryAccessibility,
  componentLibraryRegistry,
  findComponentLibraryConversionCandidates,
  resolveComponentLibraryInstanceStatus,
  type ComponentLibraryConversionCandidate,
  type ComponentLibraryEntry,
  type ComponentLibraryField,
  type ComponentLibraryImplementation,
} from '@core/component-library'
import type { PageNode, SiteDocument } from '@core/page-tree'
import {
  resolveVisualComponent,
  type VCParam,
} from '@core/visual-components-schema'
import { safePropOverrides } from '@core/visualComponents'
import { useEditorPermissions } from '@site/editorPermissionsContext'
import { selectActiveCanvasPage, useEditorStore } from '@site/store/store'
import { PropertyControlRenderer } from '@site/property-controls/PropertyControlRenderer'
import { Button } from '@ui/components/Button'
import { EmptyState } from '@ui/components/EmptyState'
import { Dialog } from '@ui/components/Dialog'
import { Select } from '@ui/components/Select'
import { TagPill } from '@ui/components/TagPill'
import { pushToast } from '@ui/components/Toast'
import { useState } from 'react'
import styles from './ComponentPropertiesView.module.css'

interface ComponentPropertiesViewProps {
  node: PageNode
  definition: AnyModuleDefinition
  entry: ComponentLibraryEntry | undefined
  latestEntry: ComponentLibraryEntry | undefined
}

export function ComponentPropertiesView({
  node,
  definition,
  entry,
  latestEntry,
}: ComponentPropertiesViewProps) {
  const permissions = useEditorPermissions()
  const setLayersViewMode = useEditorStore((state) => state.setLayersViewMode)
  const updateField = useEditorStore((state) => state.updateComponentLibraryField)
  const applyOption = useEditorStore((state) => state.applyComponentLibraryOption)
  const activePage = useEditorStore(selectActiveCanvasPage)
  const site = useEditorStore((state) => state.site)
  const blockingRuleIds = useEditorStore(
    (state) => state.site?.settings.accessibility?.blockingRuleIds,
  )
  const convertPrimitive = useEditorStore(
    (state) => state.convertFreeformPrimitiveToComponent,
  )
  const metadata = node.catalogueInstance
  const accessibilityDiagnostics = activePage
    ? analyseComponentLibraryAccessibility(
        activePage,
        componentLibraryRegistry,
        { blockingRuleIds: blockingRuleIds ?? [] },
        site?.visualComponents ?? [],
      ).filter((diagnostic) => diagnostic.nodeId === node.id)
    : []
  const [conversionOpen, setConversionOpen] = useState(false)
  const conversionCandidates = metadata
    ? []
    : findComponentLibraryConversionCandidates(
        node,
        componentLibraryRegistry.list(),
        (moduleId) => moduleId === definition.id ? definition.defaults : undefined,
      )

  if (!metadata || !entry) {
    return (
      <>
        <div className={styles.locked}>
          <EmptyState
            variant="centered"
            title={metadata ? 'Component definition unavailable' : 'Component Block'}
            description={metadata
              ? `The retained definition for ${metadata.entryId}@${metadata.entryVersion} is not installed. This content remains intact and read-only in Components view.`
              : 'This block has no governed Component Library mapping. Switch to HTML view to inspect its implementation or convert it through an approved workflow.'}
            action={permissions.canEditStructure ? (
              <div className={styles.lockedActions}>
                {conversionCandidates.length > 0 ? (
                  <Button variant="primary" onClick={() => setConversionOpen(true)}>
                    Preview conversion
                  </Button>
                ) : null}
                <Button variant="secondary" onClick={() => setLayersViewMode('html')}>
                  Open HTML view
                </Button>
              </div>
            ) : undefined}
          />
        </div>
        <ComponentConversionDialog
          open={conversionOpen}
          node={node}
          candidates={conversionCandidates}
          onClose={() => setConversionOpen(false)}
          onConvert={(candidate) => {
            const converted = convertPrimitive(
              node.id,
              candidate.entry.id,
              candidate.presetId,
            )
            if (!converted) {
              pushToast({
                kind: 'error',
                title: 'Conversion no longer eligible',
                body: 'The node or catalogue definition changed. Review it and try again.',
                location: 'component-library',
              })
              return
            }
            setConversionOpen(false)
            pushToast({
              kind: 'success',
              title: `Converted to ${candidate.entry.name}`,
              body: 'Props, children and styles were preserved. Undo restores the freeform state.',
              location: 'component-library',
            })
          }}
        />
      </>
    )
  }

  const status = resolveComponentLibraryInstanceStatus(metadata, latestEntry)
  const canApplyOptions = permissions.canEditComponents

  return (
    <div className={styles.surface} data-testid="component-properties-view">
      <header className={styles.header}>
        <div>
          <h3>{entry.name}</h3>
          <p>{entry.id} · authored with v{metadata.entryVersion}</p>
        </div>
        <div className={styles.pills}>
          <TagPill
            label={statusLabel(status)}
            size="xs"
            muted={status !== 'current'}
          />
          <TagPill label={entry.category} size="xs" muted />
        </div>
      </header>

      <p className={styles.description}>{entry.description}</p>

      {status !== 'current' ? (
        <div className={styles.notice} role="status">
          {statusGuidance(status)}
        </div>
      ) : null}

      {entry.presets.length > 0 ? (
        <OptionControl
          label="Preset"
          value={metadata.presetId ?? ''}
          options={entry.presets}
          disabled={!canApplyOptions}
          onChange={(optionId) => applyOption(node.id, 'preset', optionId)}
        />
      ) : null}
      {entry.variants.length > 0 ? (
        <OptionControl
          label="Variant"
          value={metadata.variantId ?? ''}
          options={entry.variants}
          disabled={!canApplyOptions}
          onChange={(optionId) => applyOption(node.id, 'variant', optionId)}
        />
      ) : null}

      <section className={styles.section}>
        <h4>Content and configuration</h4>
        {entry.fields.length === 0 ? (
          <p className={styles.empty}>This component exposes no instance fields.</p>
        ) : entry.fields.map((field) => {
          const control = componentLibraryFieldControl(
            entry,
            field,
            definition,
            site,
          )
          if (!control || control.hidden) {
            return (
              <div key={field.key} className={styles.unavailableField}>
                <span>{field.label}</span>
                <span>Control unavailable in this installed implementation.</span>
              </div>
            )
          }
          return (
            <div key={field.key} className={styles.field}>
              <PropertyControlRenderer
                propKey={field.key}
                control={{
                  ...control,
                  label: field.label,
                }}
                value={componentLibraryFieldValue(entry, field, node, site)}
                onChange={(key, value) => updateField(node.id, key, value)}
                disabled={
                  !permissions.canEditComponents ||
                  status === 'definition-missing' ||
                  status === 'version-ahead'
                }
                permissionOverride={permissions.canEditComponents}
              />
              {field.description ? (
                <p className={styles.fieldDescription}>{field.description}</p>
              ) : null}
            </div>
          )
        })}
      </section>

      {entry.slots.length > 0 ? (
        <section className={styles.section}>
          <h4>Slots</h4>
          <ul className={styles.slotList}>
            {entry.slots.map((slot) => (
              <li key={slot.id}>
                <span>{slot.name}</span>
                <span>
                  {slot.description ?? 'Governed child content'}
                  {' · '}
                  {slot.minItems}{slot.maxItems === undefined ? '+' : `–${slot.maxItems}`} items
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(entry.accessibility?.checks.length ?? 0) > 0 ? (
        <section className={styles.section}>
          <h4>Accessibility contract</h4>
          <ul className={styles.slotList}>
            {entry.accessibility?.checks.map((check) => (
              <li key={check.rule}>
                <span>
                  {check.category}
                  {' · '}
                  {check.enforcement.replace('-', ' ')}
                </span>
                <span>{check.summary}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {accessibilityDiagnostics.length > 0 ? (
        <section
          className={styles.section}
          aria-label="Accessibility diagnostics"
        >
          <h4>Accessibility diagnostics</h4>
          <ul className={styles.diagnosticList}>
            {accessibilityDiagnostics.map((diagnostic) => (
              <li
                key={`${diagnostic.rule}:${diagnostic.message}`}
                data-blocking={diagnostic.blocking ? 'true' : 'false'}
              >
                <span>
                  {diagnostic.blocking ? 'Publication blocker' : diagnostic.severity}
                  {' · '}
                  {diagnostic.rule}
                </span>
                <span>{diagnostic.message}</span>
                <span>{diagnostic.remediation}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {entry.documentation.usage || entry.documentation.accessibility ? (
        <section className={styles.guidance}>
          {entry.documentation.usage ? (
            <div>
              <h4>Usage</h4>
              <p>{entry.documentation.usage}</p>
            </div>
          ) : null}
          {entry.documentation.accessibility ? (
            <div>
              <h4>Accessibility</h4>
              <p>{entry.documentation.accessibility}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {permissions.canEditStructure ? (
        <Button
          variant="ghost"
          size="xs"
          align="start"
          onClick={() => setLayersViewMode('html')}
        >
          Inspect implementation in HTML view
        </Button>
      ) : null}
    </div>
  )
}

function ComponentConversionDialog({
  open,
  node,
  candidates,
  onClose,
  onConvert,
}: {
  open: boolean
  node: PageNode
  candidates: readonly ComponentLibraryConversionCandidate[]
  onClose: () => void
  onConvert: (candidate: ComponentLibraryConversionCandidate) => void
}) {
  const [selectedKey, setSelectedKey] = useState('')
  const selected = candidates.find((candidate) => candidateKey(candidate) === selectedKey) ??
    candidates[0]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Convert to governed component"
      eyebrow="Lossless preview"
      size="md"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!selected}
            onClick={() => selected && onConvert(selected)}
          >
            Convert component
          </Button>
        </>
      )}
    >
      {selected ? (
        <div className={styles.conversionPreview}>
          <label className={styles.conversionChoice}>
            <span>Governed definition</span>
            <Select
              value={candidateKey(selected)}
              options={candidates.map((candidate) => ({
                value: candidateKey(candidate),
                label: `${candidate.entry.name}${candidate.presetId ? ` · ${candidate.presetId}` : ''}`,
              }))}
              onChange={(event) => setSelectedKey(event.target.value)}
            />
          </label>
          <div className={styles.notice}>
            This conversion writes catalogue identity only. It does not change the
            backing module, props, child order, classes, styles or rendered output.
          </div>
          <section className={styles.section}>
            <h4>Author fields</h4>
            {selected.fields.length > 0 ? (
              <ul className={styles.conversionFields}>
                {selected.fields.map((field) => (
                  <li key={field.key}>
                    <span>{field.label}</span>
                    <span>{previewValue(field.value)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className={styles.empty}>No author fields are mapped.</p>}
          </section>
          <section className={styles.section}>
            <h4>Preserved implementation</h4>
            <p className={styles.empty}>
              {selected.retainedChildCount} child
              {selected.retainedChildCount === 1 ? '' : 'ren'} retained
              {selected.retainsStyling ? '; existing classes and style overrides retained' : ''}
              . Node {node.id} remains the backing identity.
            </p>
          </section>
        </div>
      ) : (
        <EmptyState
          plain
          title="No lossless conversion is available"
          description="The implementation no longer matches an installed catalogue definition."
        />
      )}
    </Dialog>
  )
}

function candidateKey(candidate: ComponentLibraryConversionCandidate): string {
  return `${candidate.entry.id}:${candidate.presetId ?? ''}`
}

function previewValue(value: unknown): string {
  if (typeof value === 'string') return value || 'Empty'
  if (value === undefined) return 'Not set'
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

interface LibraryOption {
  id: string
  name: string
}

function OptionControl({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string
  value: string
  options: readonly LibraryOption[]
  disabled: boolean
  onChange: (value: string) => void
}) {
  const selectOptions = [
    ...(!value ? [{ value: '', label: `Choose ${label.toLowerCase()}…`, disabled: true }] : []),
    ...options.map((option) => ({ value: option.id, label: option.name })),
  ]
  return (
    <label className={styles.option}>
      <span>{label}</span>
      <Select
        value={value}
        options={selectOptions}
        fieldSize="sm"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function componentLibraryFieldControl(
  entry: ComponentLibraryEntry,
  field: ComponentLibraryField,
  definition: AnyModuleDefinition,
  site: SiteDocument | null,
): PropertyControl | undefined {
  const implementation = componentLibraryBacking(entry.implementation)
  if (implementation.type !== 'visual-component') {
    const control = definition.schema[field.key] as PropertyControl | undefined
    return control && field.description
      ? { ...control, description: field.description }
      : control
  }

  const visualComponent = resolveVisualComponent(
    site?.visualComponents,
    implementation.componentId,
  )
  const parameter = visualComponent?.params.find(
    (candidate) => candidate.id === field.key,
  )
  return parameter ? visualComponentParameterControl(parameter, field) : undefined
}

function componentLibraryFieldValue(
  entry: ComponentLibraryEntry,
  field: ComponentLibraryField,
  node: PageNode,
  site: SiteDocument | null,
): unknown {
  const implementation = componentLibraryBacking(entry.implementation)
  if (implementation.type !== 'visual-component') {
    return node.props[field.key]
  }
  const overrides = safePropOverrides(node.props)
  if (Object.prototype.hasOwnProperty.call(overrides, field.key)) {
    return overrides[field.key]
  }
  return resolveVisualComponent(
    site?.visualComponents,
    implementation.componentId,
  )?.params.find((candidate) => candidate.id === field.key)?.defaultValue
}

function visualComponentParameterControl(
  parameter: VCParam,
  field: ComponentLibraryField,
): PropertyControl | undefined {
  const shared = {
    label: field.label,
    ...(field.description ? { description: field.description } : {}),
  }
  switch (parameter.type) {
    case 'string':
      return { ...shared, type: 'text' }
    case 'richText':
      return { ...shared, type: 'richtext' }
    case 'url':
      return { ...shared, type: 'url' }
    case 'image':
      return { ...shared, type: 'image' }
    case 'number':
      return { ...shared, type: 'number' }
    case 'boolean':
      return { ...shared, type: 'toggle' }
    case 'color':
      return { ...shared, type: 'color' }
    case 'enum':
      return {
        ...shared,
        type: 'select',
        options: (parameter.enumOptions ?? []).map((value) => ({
          label: value.replaceAll('-', ' '),
          value,
        })),
      }
    default:
      return undefined
  }
}

function componentLibraryBacking(
  implementation: ComponentLibraryImplementation,
): Exclude<ComponentLibraryImplementation, { type: 'capability-backed' }> {
  return implementation.type === 'capability-backed'
    ? implementation.backing
    : implementation
}

function statusLabel(
  status: ReturnType<typeof resolveComponentLibraryInstanceStatus>,
): string {
  return status === 'current' ? 'current' : status.replaceAll('-', ' ')
}

function statusGuidance(
  status: ReturnType<typeof resolveComponentLibraryInstanceStatus>,
): string {
  switch (status) {
    case 'migration-required':
      return 'A newer definition is installed. An administrator must preview and run its migration before this instance upgrades.'
    case 'version-pinned':
      return 'This instance is pinned to its retained definition version.'
    case 'version-ahead':
      return 'This instance was authored with a newer definition. Install that version before editing.'
    case 'invalid-preset':
      return 'The saved preset is not declared by this retained definition.'
    case 'invalid-variant':
      return 'The saved variant is not declared by this retained definition.'
    case 'definition-missing':
      return 'The component definition is not installed.'
    default:
      return ''
  }
}
