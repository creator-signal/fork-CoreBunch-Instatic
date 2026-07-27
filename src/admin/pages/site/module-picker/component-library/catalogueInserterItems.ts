import {
  resolveComponentLibraryAvailability,
  type ComponentLibraryDependencyState,
  type ComponentLibraryEntry,
  type ComponentLibraryImplementation,
} from '@core/component-library'
import type { VisualComponent } from '@core/visualComponents'
import { resolveVisualComponent } from '@core/visual-components-schema'
import {
  moduleWireForId,
  wireFromTree,
  type WireNode,
} from '../moduleWireframes'

export type CatalogueInserterAccent =
  | 'mint'
  | 'lilac'
  | 'sky'
  | 'peach'
  | 'rose'

export interface CatalogueInserterItem {
  key: string
  id: string
  kind: 'component'
  source: 'catalogue'
  name: string
  description: string
  accent: CatalogueInserterAccent
  wire: WireNode
  searchText: string
  entry: ComponentLibraryEntry
  category: string
  presetId?: string
  variantId?: string
  disabledReason?: string
}

function backingImplementation(
  implementation: ComponentLibraryImplementation,
): Exclude<ComponentLibraryImplementation, { type: 'capability-backed' }> {
  return implementation.type === 'capability-backed'
    ? implementation.backing
    : implementation
}

function defaultPresetId(entry: ComponentLibraryEntry): string | undefined {
  const implementation = backingImplementation(entry.implementation)
  return implementation.type === 'primitive'
    ? implementation.presetId ?? entry.presets[0]?.id
    : entry.presets[0]?.id
}

function accentForCategory(category: string): CatalogueInserterAccent {
  if (category === 'Forms') return 'mint'
  if (category === 'Media') return 'sky'
  if (category === 'Typography') return 'peach'
  if (category === 'Interactive' || category === 'Embed') return 'rose'
  return 'lilac'
}

function catalogueWire(
  entry: ComponentLibraryEntry,
  visualComponents: readonly VisualComponent[],
): WireNode {
  const implementation = backingImplementation(entry.implementation)
  if (implementation.type === 'primitive') {
    return moduleWireForId(implementation.moduleId, entry.category)
  }
  if (implementation.type === 'visual-component') {
    const component = resolveVisualComponent(
      visualComponents,
      implementation.componentId,
    )
    return component
      ? wireFromTree(component.tree)
      : moduleWireForId('base.visual-component-ref', entry.category)
  }
  return moduleWireForId('base.container', entry.category)
}

function catalogueDisabledReason(
  entry: ComponentLibraryEntry,
  dependencyState: ComponentLibraryDependencyState | undefined,
  canEditComponents: boolean,
): string | undefined {
  if (!canEditComponents) {
    return 'You do not have permission to insert governed components.'
  }
  const implementation = backingImplementation(entry.implementation)
  if (implementation.type === 'template-component') {
    return 'Template components are authored in a template document.'
  }
  if (!dependencyState) return undefined
  const availability = resolveComponentLibraryAvailability(entry, dependencyState)
  if (availability.health !== 'unavailable') return undefined
  const unavailable = availability.issues
    .filter((issue) => issue.health === 'unavailable')
    .map((issue) => issue.id)
  return unavailable.length > 0
    ? `Requires ${unavailable.join(', ')}.`
    : 'A required component dependency is unavailable.'
}

export function getCatalogueComponentItems(
  entries: readonly ComponentLibraryEntry[],
  visualComponents: readonly VisualComponent[],
  dependencyState?: ComponentLibraryDependencyState,
  canEditComponents = true,
): CatalogueInserterItem[] {
  return entries.map((entry) => {
    const presetId = defaultPresetId(entry)
    const variantId = entry.variants[0]?.id
    const disabledReason = catalogueDisabledReason(
      entry,
      dependencyState,
      canEditComponents,
    )
    return {
      key: `component:${entry.id}`,
      id: entry.id,
      kind: 'component',
      source: 'catalogue',
      name: entry.name,
      description: entry.description,
      accent: accentForCategory(entry.category),
      entry,
      category: entry.category,
      ...(presetId ? { presetId } : {}),
      ...(variantId ? { variantId } : {}),
      wire: catalogueWire(entry, visualComponents),
      searchText: [
        entry.name,
        entry.id,
        entry.category,
        entry.description,
        entry.implementation.type,
        ...entry.tags,
        ...entry.presets.map((preset) => preset.name),
        ...entry.variants.map((variant) => variant.name),
      ].join(' ').toLowerCase(),
      ...(disabledReason ? { disabledReason } : {}),
    }
  })
}

export function composeCatalogueComponentGroups(
  items: readonly CatalogueInserterItem[],
): {
  items: CatalogueInserterItem[]
  labelByKey: Map<string, string>
} {
  const categoryOrder = [
    'Structure',
    'Editorial',
    'Typography',
    'Navigation',
    'Content',
    'Design',
    'Interactive',
    'Media',
    'Embed',
    'Template',
  ]
  const categories = new Map<string, CatalogueInserterItem[]>()
  for (const item of items) {
    const categoryItems = categories.get(item.category) ?? []
    categoryItems.push(item)
    categories.set(item.category, categoryItems)
  }
  const orderedCategories = [...categories.entries()].sort(
    ([left], [right]) => {
      const leftIndex = categoryOrder.indexOf(left)
      const rightIndex = categoryOrder.indexOf(right)
      if (leftIndex !== rightIndex) {
        if (leftIndex < 0) return 1
        if (rightIndex < 0) return -1
        return leftIndex - rightIndex
      }
      return left.localeCompare(right)
    },
  )
  const ordered = orderedCategories.flatMap(([, categoryItems]) => categoryItems)
  const labelByKey = new Map<string, string>()
  for (const [category, categoryItems] of orderedCategories) {
    const first = categoryItems[0]
    if (first) {
      labelByKey.set(first.key, category === 'Structure' ? 'Layout' : category)
    }
  }
  return { items: ordered, labelByKey }
}
