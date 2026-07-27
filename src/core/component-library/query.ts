import type {
  ComponentLibraryEntry,
  ComponentLibraryImplementationType,
  ComponentLibrarySourceType,
  ComponentLibraryStatus,
} from './schemas'

export interface ComponentLibraryFilter {
  search?: string
  categories?: readonly string[]
  implementationTypes?: readonly ComponentLibraryImplementationType[]
  sources?: readonly ComponentLibrarySourceType[]
  statuses?: readonly ComponentLibraryStatus[]
}

function implementationType(entry: ComponentLibraryEntry): ComponentLibraryImplementationType {
  return entry.implementation.type
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('en-US')
}

function entrySearchText(entry: ComponentLibraryEntry): string {
  return normalize([
    entry.id,
    entry.name,
    entry.description,
    entry.category,
    ...entry.tags,
    ...entry.fields.flatMap((field) => [field.key, field.label, field.description ?? '']),
    ...entry.variants.flatMap((variant) => [variant.id, variant.name, variant.description ?? '']),
    ...entry.presets.flatMap((preset) => [preset.id, preset.name, preset.description ?? '']),
    ...entry.slots.flatMap((slot) => [slot.id, slot.name, slot.description ?? '']),
  ].join(' '))
}

export function compareComponentLibraryEntries(
  left: ComponentLibraryEntry,
  right: ComponentLibraryEntry,
): number {
  const leftKey = normalize(`${left.category}\u0000${left.name}\u0000${left.id}`)
  const rightKey = normalize(`${right.category}\u0000${right.name}\u0000${right.id}`)
  if (leftKey < rightKey) return -1
  if (leftKey > rightKey) return 1
  return 0
}

/**
 * Filter and deterministically sort entries for every catalogue surface.
 * Search terms use AND semantics so adding a term narrows the result set.
 */
export function filterComponentLibraryEntries(
  entries: readonly ComponentLibraryEntry[],
  filter: ComponentLibraryFilter = {},
): ComponentLibraryEntry[] {
  const terms = normalize(filter.search ?? '').split(/\s+/).filter(Boolean)
  const categories = new Set(filter.categories ?? [])
  const types = new Set(filter.implementationTypes ?? [])
  const sources = new Set(filter.sources ?? [])
  const statuses = new Set(filter.statuses ?? [])

  return entries
    .filter((entry) => {
      if (categories.size > 0 && !categories.has(entry.category)) return false
      if (types.size > 0 && !types.has(implementationType(entry))) return false
      if (sources.size > 0 && !sources.has(entry.source.type)) return false
      if (statuses.size > 0 && !statuses.has(entry.status)) return false

      if (terms.length === 0) return true
      const searchText = entrySearchText(entry)
      return terms.every((term) => searchText.includes(term))
    })
    .sort(compareComponentLibraryEntries)
}
