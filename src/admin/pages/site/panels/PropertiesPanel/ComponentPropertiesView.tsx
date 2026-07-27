import type { AnyModuleDefinition, PropertyControl } from '@core/module-engine'
import {
  resolveComponentLibraryInstanceStatus,
  type ComponentLibraryEntry,
} from '@core/component-library'
import type { PageNode } from '@core/page-tree'
import { useEditorPermissions } from '@site/editorPermissionsContext'
import { useEditorStore } from '@site/store/store'
import { PropertyControlRenderer } from '@site/property-controls/PropertyControlRenderer'
import { Button } from '@ui/components/Button'
import { EmptyState } from '@ui/components/EmptyState'
import { Select } from '@ui/components/Select'
import { TagPill } from '@ui/components/TagPill'
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
  const metadata = node.catalogueInstance

  if (!metadata || !entry) {
    return (
      <div className={styles.locked}>
        <EmptyState
          variant="centered"
          title={metadata ? 'Component definition unavailable' : 'Custom / Freeform content'}
          description={metadata
            ? `The retained definition for ${metadata.entryId}@${metadata.entryVersion} is not installed. This content remains intact and read-only in Components view.`
            : 'This content has no governed Component Library mapping. Switch to HTML view to inspect its implementation or convert it through an approved workflow.'}
          action={permissions.canEditStructure ? (
            <Button variant="secondary" onClick={() => setLayersViewMode('html')}>
              Open HTML view
            </Button>
          ) : undefined}
        />
      </div>
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
          const control = definition.schema[field.key] as PropertyControl | undefined
          if (!control || control.hidden) {
            return (
              <div key={field.key} className={styles.unavailableField}>
                <span>{field.label}</span>
                <span>Control unavailable in this installed implementation.</span>
              </div>
            )
          }
          return (
            <PropertyControlRenderer
              key={field.key}
              propKey={field.key}
              control={{
                ...control,
                label: field.label,
              }}
              value={node.props[field.key]}
              onChange={(key, value) => updateField(node.id, key, value)}
              disabled={
                !permissions.canEditComponents ||
                status === 'definition-missing' ||
                status === 'version-ahead'
              }
              permissionOverride={permissions.canEditComponents}
            />
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
