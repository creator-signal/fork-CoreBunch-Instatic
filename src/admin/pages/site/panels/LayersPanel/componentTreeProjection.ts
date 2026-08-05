import type { Page, PageNode } from '@core/page-tree'
import type {
  ComponentLibraryEntry,
  ComponentLibraryInstanceStatus,
  ComponentLibraryStatus,
} from '@core/component-library'
import { resolveComponentLibraryInstanceStatus } from '@core/component-library'
import type { VisualComponent } from '@core/visualComponents'

export type ComponentLayerKind =
  | 'page'
  | 'primitive'
  | 'visualComponent'
  | 'pattern'
  | 'templateComponent'
  | 'capabilityBacked'
  | 'slot'
  | 'freeform'

export type ComponentLayerStatus =
  | ComponentLibraryStatus
  | Exclude<
      ComponentLibraryInstanceStatus,
      'current' | 'definition-missing'
    >
  | 'missing-library-entry'
  | 'missing-component'

export interface ComponentLayerRow {
  /** Deterministic projection key. Backed rows use their persisted node id. */
  key: string
  /** Existing page-tree node that owns selection, hover and mutations. */
  nodeId: string
  moduleId: string
  label: string
  kind: ComponentLayerKind
  status?: ComponentLayerStatus
  entryId?: string
  presetId?: string
  /** Owning template for read-only composed rows. Absent for active-page rows. */
  sourcePageId?: string
  sourcePageTitle?: string
  sourceRoot?: boolean
  readOnly: boolean
  children: ComponentLayerRow[]
}

export interface ComponentTreeProjection {
  roots: ComponentLayerRow[]
  /**
   * Visible rows map to themselves. Hidden implementation descendants map to
   * their nearest governed owner; unrelated freeform nodes are intentionally
   * absent because Components view does not invent a boundary for them.
   */
  selectionOwnerByNodeId: Readonly<Record<string, string>>
}

interface BuildComponentTreeProjectionOptions {
  page: Page
  /** Publish-order wrapper templates, outermost first. */
  wrapperTemplates?: readonly Page[]
  moduleNames: Readonly<Record<string, string>>
  visualComponents: ReadonlyArray<Pick<VisualComponent, 'id' | 'name'>>
  catalogueEntries?: ReadonlyArray<ComponentLibraryEntry>
}

/**
 * Build the author-facing Layers projection from the active page tree.
 *
 * No content is copied or mutated. Every visible row is backed by an existing
 * node id, and every hidden pattern descendant resolves to its nearest visible
 * pattern or authorable-region boundary through `selectionOwnerByNodeId`.
 */
export function buildComponentTreeProjection({
  page,
  wrapperTemplates = [],
  moduleNames,
  visualComponents,
  catalogueEntries = [],
}: BuildComponentTreeProjectionOptions): ComponentTreeProjection {
  const projection = buildUnfilteredComponentTreeProjection({
    page,
    wrapperTemplates,
    moduleNames,
    visualComponents,
    catalogueEntries,
  })
  return retainCatalogueComponentRows(projection, page)
}

/**
 * Build the complete compositional projection before the author-facing filter
 * is applied. Keeping the template outlet in this intermediate tree lets the
 * active page be spliced into wrapper templates without making ordinary HTML
 * nodes visible in Components view.
 */
function buildUnfilteredComponentTreeProjection({
  page,
  wrapperTemplates = [],
  moduleNames,
  visualComponents,
  catalogueEntries = [],
}: BuildComponentTreeProjectionOptions): ComponentTreeProjection {
  const entryById = new Map(catalogueEntries.map((entry) => [entry.id, entry]))
  const componentNameById = new Map(visualComponents.map((component) => [
    component.id,
    component.name,
  ]))
  const selectionOwnerByNodeId: Record<string, string> = {}
  const parentByNodeId = buildParentIndex(page.nodes)
  const projecting = new Set<string>()

  const markSubtreeOwner = (rootNodeId: string, ownerNodeId: string): void => {
    const pending = [rootNodeId]
    const seen = new Set<string>()
    while (pending.length > 0) {
      const nodeId = pending.pop()
      if (!nodeId || seen.has(nodeId)) continue
      seen.add(nodeId)
      const node = page.nodes[nodeId]
      if (!node) continue
      selectionOwnerByNodeId[nodeId] = ownerNodeId
      pending.push(...node.children)
    }
  }

  const projectNode = (nodeId: string, root = false): ComponentLayerRow | null => {
    const node = page.nodes[nodeId]
    if (!node || projecting.has(nodeId)) return null

    projecting.add(nodeId)
    selectionOwnerByNodeId[nodeId] = nodeId

    if (root) {
      const children = node.children.flatMap((childId) => {
        const child = projectNode(childId)
        return child ? [child] : []
      })
      projecting.delete(nodeId)
      return {
        key: nodeId,
        nodeId,
        moduleId: node.moduleId,
        label: page.title,
        kind: 'page',
        readOnly: false,
        children,
      }
    }

    const metadata = node.catalogueInstance
    const entry = metadata ? entryById.get(metadata.entryId) : undefined

    if (metadata?.pattern) {
      markSubtreeOwner(nodeId, nodeId)
      const declared = new Set(
        metadata.pattern.authorableNodeIds.filter((candidateId) =>
          candidateId !== nodeId &&
          isDescendantOf(candidateId, nodeId, parentByNodeId)),
      )
      const authorableRoots = [...declared].filter((candidateId) =>
        !hasAncestorInSet(candidateId, declared, parentByNodeId),
      )
      const children = authorableRoots.flatMap((childId) => {
        const child = projectNode(childId)
        return child ? [child] : []
      })
      projecting.delete(nodeId)
      return {
        key: nodeId,
        nodeId,
        moduleId: node.moduleId,
        label: entryLabel(node, entry, moduleNames),
        kind: 'pattern',
        status: componentLayerStatus(node, entry),
        entryId: metadata.entryId,
        presetId: metadata.presetId,
        readOnly: false,
        children,
      }
    }

    const children = node.children.flatMap((childId) => {
      const child = projectNode(childId)
      return child ? [child] : []
    })
    const row = projectOrdinaryNode({
      node,
      children,
      entry,
      componentNameById,
      moduleNames,
    })
    projecting.delete(nodeId)
    return row
  }

  const root = projectNode(page.rootNodeId, true)
  const activeProjection = {
    roots: root ? [root] : [],
    selectionOwnerByNodeId,
  }
  if (!root || wrapperTemplates.length === 0) return activeProjection

  let composedRoot = root
  for (let index = wrapperTemplates.length - 1; index >= 0; index -= 1) {
    const template = wrapperTemplates[index]
    const templateProjection = buildUnfilteredComponentTreeProjection({
      page: template,
      moduleNames,
      visualComponents,
      catalogueEntries,
    })
    const templateRoot = templateProjection.roots[0]
    if (!templateRoot) continue
    const ownedRoot = markTemplateOwnership(templateRoot, template)
    composedRoot = replaceFirstTemplateOutlet(ownedRoot, composedRoot).row
  }

  return {
    roots: [composedRoot],
    selectionOwnerByNodeId,
  }
}

/**
 * Components view is an inventory of catalogue-stamped component instances,
 * not a friendlier spelling of the DOM tree. Ordinary/freeform rows and raw
 * Visual Component references are therefore removed while catalogue instances
 * are hoisted through them in page order. Page and template roots remain only
 * when they contain an instance inserted from the Component Library.
 */
function retainCatalogueComponentRows(
  projection: ComponentTreeProjection,
  page: Page,
): ComponentTreeProjection {
  const visibleNodeIds = new Set<string>()
  const catalogueOwnerIds = new Set<string>()

  const retainRow = (
    row: ComponentLayerRow,
    catalogueAncestorId: string | null,
  ): ComponentLayerRow[] => {
    const isContextRow = row.kind === 'page' || row.sourceRoot === true
    const isCatalogueInstance = Boolean(row.entryId)
    const isGovernedSlot = row.kind === 'slot' && catalogueAncestorId !== null
    const isCatalogueRow = isCatalogueInstance || isGovernedSlot

    if (!isContextRow && !isCatalogueRow) {
      return row.children.flatMap((child) =>
        retainRow(child, catalogueAncestorId),
      )
    }

    const nextCatalogueAncestorId = isCatalogueRow
      ? row.nodeId
      : catalogueAncestorId
    const children = row.children.flatMap((child) =>
      retainRow(child, nextCatalogueAncestorId),
    )

    if (isContextRow && children.length === 0) return []

    if (page.nodes[row.nodeId]) {
      visibleNodeIds.add(row.nodeId)
      if (isCatalogueRow) catalogueOwnerIds.add(row.nodeId)
    }
    return [{ ...row, children }]
  }

  const roots = projection.roots.flatMap((row) => retainRow(row, null))
  const parentByNodeId = buildParentIndex(page.nodes)
  const selectionOwnerByNodeId: Record<string, string> = {}

  for (const nodeId of Object.keys(page.nodes)) {
    if (visibleNodeIds.has(nodeId)) {
      selectionOwnerByNodeId[nodeId] = nodeId
      continue
    }

    let ancestorId = parentByNodeId.get(nodeId)
    const seen = new Set<string>()
    while (ancestorId && !seen.has(ancestorId)) {
      if (catalogueOwnerIds.has(ancestorId)) {
        selectionOwnerByNodeId[nodeId] = ancestorId
        break
      }
      seen.add(ancestorId)
      ancestorId = parentByNodeId.get(ancestorId)
    }
  }

  return { roots, selectionOwnerByNodeId }
}

interface ProjectOrdinaryNodeOptions {
  node: PageNode
  children: ComponentLayerRow[]
  entry: ComponentLibraryEntry | undefined
  componentNameById: ReadonlyMap<string, string>
  moduleNames: Readonly<Record<string, string>>
}

function projectOrdinaryNode({
  node,
  children,
  entry,
  componentNameById,
  moduleNames,
}: ProjectOrdinaryNodeOptions): ComponentLayerRow {
  const metadata = node.catalogueInstance
  const base = {
    key: node.id,
    nodeId: node.id,
    moduleId: node.moduleId,
    entryId: metadata?.entryId,
    presetId: metadata?.presetId,
    readOnly: Boolean(node.locked),
    children,
  }

  if (node.moduleId === 'base.visual-component-ref') {
    const componentId = stringProp(node, 'componentId')
    const componentName = componentId ? componentNameById.get(componentId) : undefined
    return {
      ...base,
      label: entry
        ? entryLabel(node, entry, moduleNames)
        : componentName ?? 'Missing Visual Component',
      kind: 'visualComponent',
      status: componentName
        ? entry?.status ?? (metadata ? 'missing-library-entry' : undefined)
        : 'missing-component',
    }
  }

  if (node.moduleId === 'base.slot-instance') {
    const slotName = stringProp(node, 'slotName') ?? 'children'
    return {
      ...base,
      label: `Slot: ${slotName}`,
      kind: 'slot',
    }
  }

  if (entry) {
    return {
      ...base,
      label: entryLabel(node, entry, moduleNames),
      kind: componentLayerKind(entry),
      status: componentLayerStatus(node, entry),
    }
  }

  return {
    ...base,
    label: metadata
      ? `Missing library entry: ${metadata.entryId}`
      : `Component Block: ${node.label ?? moduleNames[node.moduleId] ?? node.moduleId}`,
    kind: 'freeform',
    status: metadata ? 'missing-library-entry' : undefined,
    readOnly: true,
  }
}

function componentLayerStatus(
  node: PageNode,
  entry: ComponentLibraryEntry | undefined,
): ComponentLayerStatus {
  const metadata = node.catalogueInstance
  if (!metadata) return entry?.status ?? 'missing-library-entry'
  const instanceStatus = resolveComponentLibraryInstanceStatus(metadata, entry)
  if (instanceStatus === 'definition-missing') return 'missing-library-entry'
  return instanceStatus === 'current'
    ? entry?.status ?? 'missing-library-entry'
    : instanceStatus
}

function entryLabel(
  node: PageNode,
  entry: ComponentLibraryEntry | undefined,
  moduleNames: Readonly<Record<string, string>>,
): string {
  if (!entry) {
    return node.catalogueInstance
      ? `Missing library entry: ${node.catalogueInstance.entryId}`
      : node.label ?? moduleNames[node.moduleId] ?? node.moduleId
  }
  const presetId = node.catalogueInstance?.presetId
  return presetId
    ? entry.presets.find((preset) => preset.id === presetId)?.name ?? entry.name
    : entry.name
}

function componentLayerKind(entry: ComponentLibraryEntry): ComponentLayerKind {
  switch (entry.implementation.type) {
    case 'visual-component':
      return 'visualComponent'
    case 'template-component':
      return 'templateComponent'
    case 'capability-backed':
      return 'capabilityBacked'
    default:
      return entry.implementation.type
  }
}

function stringProp(node: PageNode, key: string): string | null {
  const value = node.props[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

function buildParentIndex(nodes: Readonly<Record<string, PageNode>>): ReadonlyMap<string, string> {
  const parentByNodeId = new Map<string, string>()
  for (const node of Object.values(nodes)) {
    for (const childId of node.children) {
      if (!parentByNodeId.has(childId)) parentByNodeId.set(childId, node.id)
    }
  }
  return parentByNodeId
}

function isDescendantOf(
  nodeId: string,
  ancestorId: string,
  parentByNodeId: ReadonlyMap<string, string>,
): boolean {
  let current = parentByNodeId.get(nodeId)
  const seen = new Set<string>()
  while (current && !seen.has(current)) {
    if (current === ancestorId) return true
    seen.add(current)
    current = parentByNodeId.get(current)
  }
  return false
}

function hasAncestorInSet(
  nodeId: string,
  candidates: ReadonlySet<string>,
  parentByNodeId: ReadonlyMap<string, string>,
): boolean {
  let current = parentByNodeId.get(nodeId)
  const seen = new Set<string>()
  while (current && !seen.has(current)) {
    if (candidates.has(current)) return true
    seen.add(current)
    current = parentByNodeId.get(current)
  }
  return false
}

function markTemplateOwnership(
  row: ComponentLayerRow,
  template: Page,
  root = true,
): ComponentLayerRow {
  return {
    ...row,
    key: `template:${template.id}:${row.key}`,
    ...(root
      ? {
          label: `${template.title} template`,
          kind: 'templateComponent' as const,
        }
      : {}),
    sourcePageId: template.id,
    sourcePageTitle: template.title,
    ...(root ? { sourceRoot: true } : {}),
    readOnly: true,
    children: row.children.map((child) =>
      markTemplateOwnership(child, template, false),
    ),
  }
}

function replaceFirstTemplateOutlet(
  row: ComponentLayerRow,
  content: ComponentLayerRow,
): { row: ComponentLayerRow; replaced: boolean } {
  if (row.moduleId === 'base.outlet') {
    return { row: content, replaced: true }
  }

  const children: ComponentLayerRow[] = []
  let replaced = false
  for (const child of row.children) {
    if (replaced) {
      children.push(child)
      continue
    }
    const result = replaceFirstTemplateOutlet(child, content)
    children.push(result.row)
    replaced = result.replaced
  }
  return {
    row: children === row.children ? row : { ...row, children },
    replaced,
  }
}
