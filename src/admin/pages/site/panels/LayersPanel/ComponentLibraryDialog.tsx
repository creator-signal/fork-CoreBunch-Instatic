import { useState } from 'react'
import {
  componentLibrarySourceKey,
  componentLibrarySourceLabel,
  filterComponentLibraryEntries,
  resolveComponentLibraryAvailability,
  type ComponentLibraryAvailability,
  type ComponentLibraryDependencyState,
  type ComponentLibraryEntry,
  type ComponentLibraryImplementation,
  type ComponentLibraryImplementationType,
  type ComponentLibrarySourceType,
  type ComponentLibraryStatus,
} from '@core/component-library'
import { ModuleIcon } from '@site/ui/ModuleIcon'
import { useEditorPermissions } from '@site/editorPermissionsContext'
import { useInsertComponentLibraryEntry } from '@site/hooks/useInsertComponentLibraryEntry'
import { resolveInsertLocation } from '@site/store/insertLocation'
import { selectActiveCanvasPage, useEditorStore } from '@site/store/store'
import { resolveComponentLibraryEntryPlacement } from '@site/component-library/componentLibraryAuthoring'
import {
  useComponentLibraryDependencyState,
  useComponentLibraryEntries,
} from '@site/component-library/useComponentLibraryCatalogue'
import { Button } from '@ui/components/Button'
import { Dialog } from '@ui/components/Dialog'
import { EmptyState } from '@ui/components/EmptyState'
import { FilterBar, type FilterBarItem } from '@ui/components/FilterBar'
import { Select } from '@ui/components/Select'
import { TagPill } from '@ui/components/TagPill'
import styles from './ComponentLibraryDialog.module.css'

const ALL = 'all'
const IMPLEMENTATION_OPTIONS = [
  { value: ALL, label: 'All implementations' },
  { value: 'primitive', label: 'Primitive' },
  { value: 'visual-component', label: 'Visual component' },
  { value: 'pattern', label: 'Pattern' },
  { value: 'template-component', label: 'Template component' },
  { value: 'capability-backed', label: 'Capability-backed' },
]

const SOURCE_OPTIONS = [
  { value: ALL, label: 'All sources' },
  { value: 'built-in', label: 'Built-in' },
  { value: 'site', label: 'Site' },
  { value: 'design-system', label: 'Design system' },
  { value: 'plugin', label: 'Plugin' },
]

const STATUS_OPTIONS = [
  { value: ALL, label: 'All statuses' },
  { value: 'stable', label: 'Stable' },
  { value: 'experimental', label: 'Experimental' },
  { value: 'deprecated', label: 'Deprecated' },
]

interface ComponentLibraryDialogProps {
  open: boolean
  onClose: () => void
  dependencyState?: ComponentLibraryDependencyState
}

export function ComponentLibraryDialog({
  open,
  onClose,
  dependencyState,
}: ComponentLibraryDialogProps) {
  const permissions = useEditorPermissions()
  const entries = useComponentLibraryEntries()
  const resolvedDependencyState = useComponentLibraryDependencyState(
    open,
    dependencyState,
  )
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(ALL)
  const [implementationType, setImplementationType] = useState(ALL)
  const [source, setSource] = useState(ALL)
  const [provider, setProvider] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [selectedId, setSelectedId] = useState(entries[0]?.id ?? '')
  const [presetId, setPresetId] = useState(defaultPresetId(entries[0]))
  const [variantId, setVariantId] = useState(defaultVariantId(entries[0]))
  const insertEntry = useInsertComponentLibraryEntry()
  const canvasPage = useEditorStore(selectActiveCanvasPage)
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId)

  const categories = Array.from(new Set(entries.map((entry) => entry.category))).sort()
  const categoryItems: FilterBarItem<string>[] = [
    { value: ALL, label: 'All' },
    ...categories.map((value) => ({ value, label: value })),
  ]
  const providerOptions = [
    { value: ALL, label: 'All providers' },
    ...Array.from(
      new Map(entries.map((entry) => [
        componentLibrarySourceKey(entry),
        componentLibrarySourceLabel(entry),
      ])).entries(),
    )
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label)),
  ]
  const filteredEntries = filterComponentLibraryEntries(entries, {
    search,
    categories: category === ALL ? [] : [category],
    implementationTypes: implementationType === ALL
      ? []
      : [implementationType as ComponentLibraryImplementationType],
    sources: source === ALL ? [] : [source as ComponentLibrarySourceType],
    statuses: status === ALL ? [] : [status as ComponentLibraryStatus],
  }).filter((entry) =>
    provider === ALL || componentLibrarySourceKey(entry) === provider)
  const selectedEntry =
    filteredEntries.find((entry) => entry.id === selectedId) ??
    filteredEntries[0]
  const availability = selectedEntry
    ? resolveComponentLibraryAvailability(selectedEntry, resolvedDependencyState)
    : null
  const insertionSupported = selectedEntry
    ? supportsCanvasInsertion(selectedEntry.implementation)
    : false
  const insertionLocation = canvasPage
    ? resolveInsertLocation(
        canvasPage,
        selectedNodeId ?? canvasPage.rootNodeId,
      )
    : null
  const placement = selectedEntry && canvasPage && insertionLocation
    ? resolveComponentLibraryEntryPlacement(
        canvasPage,
        selectedEntry,
        insertionLocation,
      )
    : null
  const placementBlockReason = placement && !placement.allowed
    ? placement.message
    : undefined
  const insertionBlockReason = selectedEntry
    ? componentInsertionBlockReason({
        availability,
        insertionSupported,
        canEditComponents: permissions.canEditComponents,
        placementBlockReason,
      })
    : undefined

  const selectEntry = (entry: ComponentLibraryEntry): void => {
    setSelectedId(entry.id)
    setPresetId(defaultPresetId(entry))
    setVariantId(defaultVariantId(entry))
  }

  const handleInsert = (): void => {
    if (
      !permissions.canEditComponents ||
      !selectedEntry ||
      availability?.health === 'unavailable'
    ) return
    const inserted = insertEntry(selectedEntry, {
      ...(presetId ? { presetId } : {}),
      ...(variantId ? { variantId } : {}),
    })
    if (inserted) onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Component Library"
      eyebrow="Authoring"
      size="2xl"
      bodyClassName={styles.dialogBody}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleInsert}
            disabled={
              !selectedEntry ||
              !permissions.canEditComponents ||
              availability?.health === 'unavailable' ||
              !insertionSupported ||
              Boolean(placementBlockReason)
            }
            tooltip={insertionBlockReason}
          >
            Insert component
          </Button>
        </>
      }
    >
      <div className={styles.filters}>
        <FilterBar
          items={categoryItems}
          value={category}
          onValueChange={setCategory}
          search={{
            value: search,
            onValueChange: setSearch,
            onClear: () => setSearch(''),
            placeholder: 'Search components, fields and presets…',
            ariaLabel: 'Search Component Library',
          }}
          groupLabel="Filter components by category"
        />
        <div className={styles.selectFilters}>
          <Select
            value={implementationType}
            options={IMPLEMENTATION_OPTIONS}
            aria-label="Filter by implementation type"
            fieldSize="sm"
            onChange={(event) => setImplementationType(event.target.value)}
          />
          <Select
            value={source}
            options={SOURCE_OPTIONS}
            aria-label="Filter by source"
            fieldSize="sm"
            onChange={(event) => setSource(event.target.value)}
          />
          <Select
            value={status}
            options={STATUS_OPTIONS}
            aria-label="Filter by status"
            fieldSize="sm"
            onChange={(event) => setStatus(event.target.value)}
          />
          <Select
            value={provider}
            options={providerOptions}
            aria-label="Filter by provider"
            fieldSize="sm"
            onChange={(event) => setProvider(event.target.value)}
          />
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.results} role="listbox" aria-label="Components">
          <p className={styles.resultCount}>{filteredEntries.length} components</p>
          {filteredEntries.length === 0 ? (
            <EmptyState
              plain
              compact
              title="No components match"
              description="Adjust the search or filters to see more components."
            />
          ) : filteredEntries.map((entry) => (
            <ComponentLibraryResult
              key={entry.id}
              entry={entry}
              selected={entry.id === selectedEntry?.id}
              onSelect={() => selectEntry(entry)}
            />
          ))}
        </div>

        <div className={styles.details} aria-live="polite">
          {selectedEntry ? (
            <ComponentLibraryDetails
              entry={selectedEntry}
              availability={availability ?? {
                health: 'unavailable',
                issues: [],
              }}
              placementBlockReason={placementBlockReason}
              presetId={presetId}
              onPresetChange={setPresetId}
              variantId={variantId}
              onVariantChange={setVariantId}
            />
          ) : (
            <EmptyState
              plain
              title="Choose a component"
              description="Select a catalogue entry to inspect its authoring contract."
            />
          )}
        </div>
      </div>
    </Dialog>
  )
}

interface ComponentLibraryResultProps {
  entry: ComponentLibraryEntry
  selected: boolean
  onSelect: () => void
}

function ComponentLibraryResult({
  entry,
  selected,
  onSelect,
}: ComponentLibraryResultProps) {
  return (
    <Button
      variant="ghost"
      size="md"
      align="start"
      fullWidth
      role="option"
      aria-selected={selected}
      className={styles.result}
      data-selected={selected ? 'true' : undefined}
      onClick={onSelect}
    >
      <span className={styles.resultIcon}>
        <ModuleIcon moduleId={moduleIdForEntry(entry)} size={14} aria-hidden="true" />
      </span>
      <span className={styles.resultText}>
        <span className={styles.resultName}>{entry.name}</span>
        <span className={styles.resultDescription}>{entry.description}</span>
      </span>
      <span className={styles.resultBadges} aria-hidden="true">
        <TagPill label={componentLibrarySourceLabel(entry)} size="xs" />
        <TagPill label={entry.category} size="xs" muted />
      </span>
    </Button>
  )
}

interface ComponentLibraryDetailsProps {
  entry: ComponentLibraryEntry
  availability: ComponentLibraryAvailability
  placementBlockReason?: string
  presetId: string
  onPresetChange: (value: string) => void
  variantId: string
  onVariantChange: (value: string) => void
}

function ComponentLibraryDetails({
  entry,
  availability,
  placementBlockReason,
  presetId,
  onPresetChange,
  variantId,
  onVariantChange,
}: ComponentLibraryDetailsProps) {
  return (
    <>
      <div className={styles.detailHeader}>
        <span className={styles.detailIcon}>
          <ModuleIcon moduleId={moduleIdForEntry(entry)} size={18} aria-hidden="true" />
        </span>
        <div>
          <h3 className={styles.detailTitle}>{entry.name}</h3>
          <p className={styles.detailId}>{entry.id} · v{entry.version}</p>
        </div>
      </div>
      <p className={styles.detailDescription}>{entry.description}</p>
      <div className={styles.pills}>
        <TagPill label={implementationLabel(entry.implementation.type)} size="xs" />
        <TagPill label={componentLibrarySourceLabel(entry)} size="xs" />
        <TagPill label={entry.status} size="xs" muted={entry.status !== 'stable'} />
        <TagPill
          label={availability.health}
          size="xs"
          muted={availability.health !== 'available'}
        />
      </div>

      {placementBlockReason ? (
        <div
          className={styles.availabilityNotice}
          role="status"
          data-health="unavailable"
        >
          <strong>Choose the shared template</strong>
          <span>{placementBlockReason}</span>
        </div>
      ) : null}

      {availability.health !== 'available' ? (
        <div
          className={styles.availabilityNotice}
          role="status"
          data-health={availability.health}
        >
          <strong>
            {availability.health === 'unavailable'
              ? 'Insertion unavailable'
              : 'Dependency degraded'}
          </strong>
          <span>{dependencyAvailabilitySummary(availability)}</span>
        </div>
      ) : null}

      {entry.presets.length > 0 ? (
        <label className={styles.field}>
          <span>Preset</span>
          <Select
            value={presetId}
            options={entry.presets.map((preset) => ({
              value: preset.id,
              label: preset.name,
            }))}
            fieldSize="sm"
            onChange={(event) => onPresetChange(event.target.value)}
          />
        </label>
      ) : null}

      {entry.variants.length > 0 ? (
        <label className={styles.field}>
          <span>Variant</span>
          <Select
            value={variantId}
            options={entry.variants.map((variant) => ({
              value: variant.id,
              label: variant.name,
            }))}
            fieldSize="sm"
            onChange={(event) => onVariantChange(event.target.value)}
          />
        </label>
      ) : null}

      <DetailSection
        title="Placement"
        items={componentPlacementLabels(entry)}
        empty="This component can be placed in pages and templates."
      />
      <DetailSection
        title="Author fields"
        items={entry.fields.map((field) =>
          `${field.label} · ${field.type}${field.required ? ' · required' : ''}`,
        )}
        empty="This component exposes no governed author fields."
      />
      <DetailSection
        title="Slots"
        items={entry.slots.map((slot) =>
          `${slot.name} · ${slot.minItems}${slot.maxItems === undefined ? '+' : `–${slot.maxItems}`} items`,
        )}
        empty="This component has no named authoring slots."
      />
      <DetailSection
        title="Dependencies"
        items={availability.issues.map(dependencyIssueLabel)}
        empty="All required capabilities, provider adapters and plugins are available."
      />
      {entry.documentation.usage ? (
        <DetailSection title="Usage" items={[entry.documentation.usage]} />
      ) : null}
      {entry.documentation.accessibility ? (
        <DetailSection title="Accessibility" items={[entry.documentation.accessibility]} />
      ) : null}
    </>
  )
}

function DetailSection({
  title,
  items,
  empty,
}: {
  title: string
  items: readonly string[]
  empty?: string
}) {
  return (
    <section className={styles.detailSection}>
      <h4>{title}</h4>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : empty ? <p>{empty}</p> : null}
    </section>
  )
}

function defaultPresetId(entry: ComponentLibraryEntry | undefined): string {
  if (!entry) return ''
  const implementation = entry.implementation.type === 'capability-backed'
    ? entry.implementation.backing
    : entry.implementation
  return implementation.type === 'primitive'
    ? implementation.presetId ?? entry.presets[0]?.id ?? ''
    : entry.presets[0]?.id ?? ''
}

function defaultVariantId(entry: ComponentLibraryEntry | undefined): string {
  return entry?.variants[0]?.id ?? ''
}

function supportsCanvasInsertion(implementation: ComponentLibraryImplementation): boolean {
  const backing = implementation.type === 'capability-backed'
    ? implementation.backing
    : implementation
  return backing.type === 'primitive' ||
    backing.type === 'visual-component' ||
    backing.type === 'pattern'
}

function moduleIdForEntry(entry: ComponentLibraryEntry): string | undefined {
  const implementation = entry.implementation.type === 'capability-backed'
    ? entry.implementation.backing
    : entry.implementation
  if (implementation.type === 'primitive') return implementation.moduleId
  if (implementation.type === 'visual-component') return 'base.visual-component-ref'
  return undefined
}

function implementationLabel(type: ComponentLibraryImplementationType): string {
  return type.replaceAll('-', ' ')
}

function dependencyIssueLabel(
  issue: ComponentLibraryAvailability['issues'][number],
): string {
  return `${dependencyKindLabel(issue.kind)} · ${issue.id} · ${issue.health}`
}

function dependencyKindLabel(
  kind: ComponentLibraryAvailability['issues'][number]['kind'],
): string {
  if (kind === 'provider-adapter') return 'Provider adapter'
  return kind.charAt(0).toUpperCase() + kind.slice(1)
}

function dependencyAvailabilitySummary(
  availability: ComponentLibraryAvailability,
): string {
  if (availability.issues.length === 0) {
    return 'No dependency details are available.'
  }
  const unavailable = availability.issues
    .filter((issue) => issue.health === 'unavailable')
    .map((issue) => `${dependencyKindLabel(issue.kind)} “${issue.id}”`)
  const degraded = availability.issues
    .filter((issue) => issue.health === 'degraded')
    .map((issue) => `${dependencyKindLabel(issue.kind)} “${issue.id}”`)
  const parts = [
    unavailable.length > 0
      ? `${joinReadable(unavailable)} ${unavailable.length === 1 ? 'is' : 'are'} unavailable`
      : '',
    degraded.length > 0
      ? `${joinReadable(degraded)} ${degraded.length === 1 ? 'is' : 'are'} degraded`
      : '',
  ].filter(Boolean)
  return `${parts.join('; ')}.`
}

function joinReadable(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}

function componentInsertionBlockReason({
  availability,
  insertionSupported,
  canEditComponents,
  placementBlockReason,
}: {
  availability: ComponentLibraryAvailability | null
  insertionSupported: boolean
  canEditComponents: boolean
  placementBlockReason?: string
}): string | undefined {
  if (!canEditComponents) {
    return 'You do not have permission to insert governed components.'
  }
  if (!insertionSupported) {
    return 'This implementation type is not available for canvas insertion yet.'
  }
  if (placementBlockReason) return placementBlockReason
  if (availability?.health === 'unavailable') {
    return dependencyAvailabilitySummary(availability)
  }
  return undefined
}

function componentPlacementLabels(entry: ComponentLibraryEntry): string[] {
  const kinds = entry.constraints.allowedDocumentKinds
  if (!kinds) return []
  return kinds.map((kind) => kind === 'template'
    ? 'Shared templates only'
    : 'Ordinary pages')
}
