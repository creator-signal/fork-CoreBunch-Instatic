/**
 * Page write diff validator for PUT /admin/api/cms/pages.
 *
 * The pages endpoint owns both dangerous roster reconciliation and ordinary
 * node edits. A coarse `site.structure.edit` gate protects deletion, but it
 * also blocks the copy-editor role from saving text/image/link edits because
 * page trees now live in data_rows instead of the site shell.
 *
 * This validator splits an already-validated partial page write by category:
 *   - components: approved catalogue insert/remove/move, declared fields and
 *                 preset/variant transitions.
 *   - structure: page roster, page metadata, node topology, module identity,
 *                non-content module props.
 *   - content:   props whose module schema marks them content-editable.
 *   - style:     class assignments, inline styles, breakpoint overrides.
 */
import type { CoreCapability } from '../../auth/capabilities'
import { ForbiddenSiteChangeError } from './siteDiff'
import {
  componentLibraryRegistry,
  resolveComponentLibraryPlacement,
  type ComponentLibraryEntry,
  type ComponentLibraryImplementation,
} from '@core/component-library'
import { registry, resolvePropertyControlCategory } from '@core/module-engine'
import type { CatalogueInstanceMetadata, Page, PageNode } from '@core/page-tree'
import '@modules/base'

type PageChangeKind = 'components' | 'structure' | 'content' | 'style'

const CAP_FOR_KIND: Record<PageChangeKind, CoreCapability> = {
  components: 'site.components.edit',
  structure: 'site.structure.edit',
  content: 'site.content.edit',
  style: 'site.style.edit',
}

interface PageDiffInput {
  previousPages: readonly Page[]
  changedPages: readonly Page[]
  deletedPageIds: ReadonlySet<string>
  capabilities: readonly CoreCapability[]
}

function allowed(capabilities: readonly CoreCapability[], kind: PageChangeKind): boolean {
  return capabilities.includes(CAP_FOR_KIND[kind])
}

function requireChange(
  capabilities: readonly CoreCapability[],
  kind: PageChangeKind,
  path: string,
  detail: string,
): void {
  if (!allowed(capabilities, kind)) {
    throw new ForbiddenSiteChangeError(kind, path, detail)
  }
}

function requireGovernedChange(
  capabilities: readonly CoreCapability[],
  path: string,
  detail: string,
): void {
  if (
    !capabilities.includes('site.components.edit') &&
    !capabilities.includes('site.structure.edit')
  ) {
    throw new ForbiddenSiteChangeError('components', path, detail)
  }
}

export function validatePageWriteDiff({
  previousPages,
  changedPages,
  deletedPageIds,
  capabilities,
}: PageDiffInput): void {
  if (
    capabilities.includes('site.structure.edit') &&
    capabilities.includes('site.content.edit') &&
    capabilities.includes('site.style.edit')
  ) {
    return
  }

  if (deletedPageIds.size > 0) {
    requireChange(
      capabilities,
      'structure',
      'pageIds',
      `pages deleted ${Array.from(deletedPageIds).join(', ')}`,
    )
  }

  const previousById = new Map(previousPages.map((page) => [page.id, page]))
  for (const page of changedPages) {
    const previous = previousById.get(page.id)
    if (!previous) {
      requireChange(capabilities, 'structure', `pages.${page.id}`, 'page created')
      continue
    }
    diffPage(capabilities, previous, page)
  }
}

function diffPage(capabilities: readonly CoreCapability[], previous: Page, next: Page): void {
  const pagePath = `pages.${next.id}`

  if (previous.slug !== next.slug) {
    requireChange(capabilities, 'structure', `${pagePath}.slug`, `${previous.slug} -> ${next.slug}`)
  }
  if (previous.title !== next.title) {
    requireChange(capabilities, 'structure', `${pagePath}.title`, 'page title changed')
  }
  if (previous.rootNodeId !== next.rootNodeId) {
    requireChange(capabilities, 'structure', `${pagePath}.rootNodeId`, 'root node changed')
  }
  if (!deepEqual(previous.template, next.template)) {
    requireChange(capabilities, 'structure', `${pagePath}.template`, 'template settings changed')
  }

  diffNodes(capabilities, pagePath, previous.nodes, next.nodes)
}

function diffNodes(
  capabilities: readonly CoreCapability[],
  pagePath: string,
  previous: Record<string, PageNode>,
  next: Record<string, PageNode>,
): void {
  const nodeIds = new Set([...Object.keys(previous), ...Object.keys(next)])
  for (const nodeId of nodeIds) {
    const prevNode = previous[nodeId]
    const nextNode = next[nodeId]
    const nodePath = `${pagePath}.nodes.${nodeId}`

    if (!prevNode || !nextNode) {
      const changedNode = prevNode ?? nextNode
      if (changedNode && isValidGovernedStandaloneNode(changedNode)) {
        requireGovernedChange(
          capabilities,
          nodePath,
          prevNode ? 'governed component removed' : 'governed component added',
        )
      } else {
        requireChange(capabilities, 'structure', nodePath, prevNode ? 'node removed' : 'node added')
      }
      continue
    }

    diffNode(capabilities, nodePath, prevNode, nextNode, previous, next)
  }
}

function diffNode(
  capabilities: readonly CoreCapability[],
  nodePath: string,
  previous: PageNode,
  next: PageNode,
  previousNodes: Record<string, PageNode>,
  nextNodes: Record<string, PageNode>,
): void {
  if (previous.moduleId !== next.moduleId) {
    requireChange(capabilities, 'structure', `${nodePath}.moduleId`, 'module changed')
    return
  }

  if (!deepEqual(previous.children, next.children)) {
    const changedIds = changedChildIds(previous.children, next.children)
    const governedTopology = changedIds.length > 0 && changedIds.every((nodeId) => {
      const node = nextNodes[nodeId] ?? previousNodes[nodeId]
      return node !== undefined && governedEntryForNode(node) !== undefined
    })
    if (governedTopology) {
      if (!capabilities.includes('site.structure.edit')) {
        for (const changedId of changedIds) {
          if (!nextNodes[changedId]) continue
          const placement = placementForNode(changedId, nextNodes)
          if (!placement.allowed) {
            throw new ForbiddenSiteChangeError(
              'components',
              `${nodePath}.children`,
              placement.message,
            )
          }
        }
      }
      requireGovernedChange(capabilities, `${nodePath}.children`, 'governed component order changed')
    } else {
      requireChange(capabilities, 'structure', `${nodePath}.children`, 'children changed')
    }
  }
  if (!deepEqual(previous.label, next.label)) {
    requireChange(capabilities, 'structure', `${nodePath}.label`, 'label changed')
  }
  if (!deepEqual(previous.locked, next.locked)) {
    requireChange(capabilities, 'structure', `${nodePath}.locked`, 'locked flag changed')
  }
  if (!deepEqual(previous.hidden, next.hidden)) {
    requireChange(capabilities, 'structure', `${nodePath}.hidden`, 'hidden flag changed')
  }
  if (!deepEqual(previous.propBindings, next.propBindings)) {
    requireChange(capabilities, 'structure', `${nodePath}.propBindings`, 'prop bindings changed')
  }
  if (!deepEqual(previous.dynamicBindings, next.dynamicBindings)) {
    requireChange(capabilities, 'structure', `${nodePath}.dynamicBindings`, 'dynamic bindings changed')
  }
  if (!deepEqual(previous.catalogueInstance, next.catalogueInstance)) {
    if (isApprovedCatalogueMetadataChange(previous, next)) {
      requireGovernedChange(
        capabilities,
        `${nodePath}.catalogueInstance`,
        'approved component option changed',
      )
    } else {
      requireChange(
        capabilities,
        'structure',
        `${nodePath}.catalogueInstance`,
        'catalogue identity changed',
      )
    }
  }

  if (!deepEqual(previous.classIds, next.classIds)) {
    requireChange(capabilities, 'style', `${nodePath}.classIds`, 'class assignments changed')
  }
  if (!deepEqual(previous.inlineStyles, next.inlineStyles)) {
    requireChange(capabilities, 'style', `${nodePath}.inlineStyles`, 'inline styles changed')
  }
  if (!deepEqual(previous.breakpointOverrides, next.breakpointOverrides)) {
    requireChange(capabilities, 'style', `${nodePath}.breakpointOverrides`, 'breakpoint overrides changed')
  }

  diffNodeProps(capabilities, nodePath, previous, next)
}

function diffNodeProps(
  capabilities: readonly CoreCapability[],
  nodePath: string,
  previous: PageNode,
  next: PageNode,
): void {
  const propKeys = new Set([...Object.keys(previous.props), ...Object.keys(next.props)])
  for (const propKey of propKeys) {
    if (deepEqual(previous.props[propKey], next.props[propKey])) continue
    const path = `${nodePath}.props.${propKey}`
    if (isApprovedGovernedPropChange(previous, next, propKey)) {
      const fallbackKind = propChangeKind(previous.moduleId, propKey)
      if (
        capabilities.includes('site.components.edit') ||
        capabilities.includes('site.structure.edit') ||
        allowed(capabilities, fallbackKind)
      ) {
        continue
      }
      throw new ForbiddenSiteChangeError('components', path, 'governed component field changed')
    }
    const kind = propChangeKind(previous.moduleId, propKey)
    requireChange(capabilities, kind, path, 'prop changed')
  }
}

function isApprovedGovernedPropChange(
  previous: PageNode,
  next: PageNode,
  propKey: string,
): boolean {
  const previousEntry = governedEntryForNode(previous)
  const nextEntry = governedEntryForNode(next)
  if (!previousEntry || !nextEntry || previousEntry.id !== nextEntry.id) return false
  if (previousEntry.version !== nextEntry.version) return false
  if (nextEntry.fields.some((field) => field.key === propKey)) return true

  return approvedOptions(nextEntry, next.catalogueInstance).some(
    (option) =>
      Object.prototype.hasOwnProperty.call(option.values, propKey) &&
      deepEqual(next.props[propKey], option.values[propKey]),
  )
}

function isApprovedCatalogueMetadataChange(previous: PageNode, next: PageNode): boolean {
  const previousMetadata = previous.catalogueInstance
  const nextMetadata = next.catalogueInstance
  const entry = governedEntryForNode(next)
  if (!previousMetadata || !nextMetadata || !entry) return false
  if (
    previousMetadata.entryId !== nextMetadata.entryId ||
    previousMetadata.entryVersion !== nextMetadata.entryVersion ||
    previousMetadata.pinnedVersion !== nextMetadata.pinnedVersion ||
    !deepEqual(previousMetadata.pattern, nextMetadata.pattern) ||
    previousMetadata.capabilityId !== nextMetadata.capabilityId ||
    previousMetadata.providerAdapterId !== nextMetadata.providerAdapterId
  ) {
    return false
  }
  if (!validOptionIds(entry, nextMetadata)) return false

  const changedPreset = previousMetadata.presetId !== nextMetadata.presetId
  const changedVariant = previousMetadata.variantId !== nextMetadata.variantId
  if (!changedPreset && !changedVariant) return false
  if (
    (changedPreset && !nextMetadata.presetId) ||
    (changedVariant && !nextMetadata.variantId)
  ) {
    return false
  }
  const changedOptions = approvedOptions(entry, nextMetadata)
    .filter((option) =>
      (changedPreset && option.id === nextMetadata.presetId) ||
      (changedVariant && option.id === nextMetadata.variantId),
    )
  const expectedChangedOptions = Number(changedPreset) + Number(changedVariant)
  return changedOptions.length === expectedChangedOptions &&
    changedOptions.every((option) =>
      Object.entries(option.values).every(([key, value]) => deepEqual(next.props[key], value)),
    )
}

function approvedOptions(
  entry: ComponentLibraryEntry,
  metadata: CatalogueInstanceMetadata | undefined,
) {
  if (!metadata) return []
  return [
    ...entry.presets.filter((option) => option.id === metadata.presetId),
    ...entry.variants.filter((option) => option.id === metadata.variantId),
  ]
}

function governedEntryForNode(node: PageNode): ComponentLibraryEntry | undefined {
  const metadata = node.catalogueInstance
  if (!metadata) return undefined
  const entry = componentLibraryRegistry.getVersion(metadata.entryId, metadata.entryVersion)
  if (!entry || !validOptionIds(entry, metadata)) return undefined
  const implementation = backingImplementation(entry.implementation)
  if (implementation.type !== 'primitive' || implementation.moduleId !== node.moduleId) {
    return undefined
  }
  if (entry.implementation.type === 'capability-backed') {
    const capabilityId = entry.requirements.capabilities[0]
    const providerAdapterId = entry.requirements.providerAdapters[0]
    if (
      metadata.capabilityId !== capabilityId ||
      metadata.providerAdapterId !== providerAdapterId
    ) {
      return undefined
    }
  } else if (metadata.capabilityId || metadata.providerAdapterId) {
    return undefined
  }
  return entry
}

function placementForNode(
  nodeId: string,
  nodes: Record<string, PageNode>,
) {
  const node = nodes[nodeId]
  const entry = node ? governedEntryForNode(node) : undefined
  if (!entry) {
    return {
      allowed: false as const,
      code: 'parent-required' as const,
      message: 'The moved node is not a valid governed component.',
    }
  }

  const targetParent = parentNodeFor(nodes, nodeId)
  const slotOwner = targetParent?.moduleId === 'base.slot-instance'
    ? parentNodeFor(nodes, targetParent.id)
    : undefined
  const parentEntry = slotOwner
    ? governedEntryForNode(slotOwner)
    : targetParent
      ? governedEntryForNode(targetParent)
      : undefined
  const slotName = targetParent?.moduleId === 'base.slot-instance'
    ? String(targetParent.props.slotName ?? '')
    : ''
  const slot = slotName
    ? parentEntry?.slots.find((candidate) => candidate.id === slotName)
    : undefined
  return resolveComponentLibraryPlacement(entry, {
    ...(parentEntry ? { parentEntry } : {}),
    ...(slot ? { slot } : {}),
    // The server validates the post-change tree, while the shared resolver
    // accepts the count before the candidate is placed.
    existingChildCount:
      targetParent?.children.filter((childId) => childId !== nodeId).length ?? 0,
  })
}

function parentNodeFor(
  nodes: Record<string, PageNode>,
  childId: string,
): PageNode | undefined {
  const child = nodes[childId]
  if (child?.parentId) return nodes[child.parentId]
  return Object.values(nodes).find((candidate) => candidate.children.includes(childId))
}

function isValidGovernedStandaloneNode(node: PageNode): boolean {
  const entry = governedEntryForNode(node)
  if (!entry) return false
  const definition = registry.get(node.moduleId)
  if (!definition) return false
  if (
    node.children.length > 0 ||
    node.classIds.length > 0 ||
    Object.keys(node.breakpointOverrides).length > 0 ||
    (node.inlineStyles && Object.keys(node.inlineStyles).length > 0) ||
    node.propBindings ||
    node.dynamicBindings ||
    node.label !== undefined ||
    node.locked !== undefined ||
    node.hidden !== undefined ||
    node.catalogueInstance?.pinnedVersion !== undefined ||
    node.catalogueInstance?.pattern !== undefined
  ) {
    return false
  }

  const permittedProps = new Set(entry.fields.map((field) => field.key))
  for (const option of approvedOptions(entry, node.catalogueInstance)) {
    for (const [key, value] of Object.entries(option.values)) {
      permittedProps.add(key)
      if (!deepEqual(node.props[key], value)) return false
    }
  }
  const propKeys = new Set([...Object.keys(definition.defaults), ...Object.keys(node.props)])
  for (const key of propKeys) {
    if (permittedProps.has(key)) continue
    if (!deepEqual(node.props[key], definition.defaults[key])) return false
  }
  return true
}

function validOptionIds(
  entry: ComponentLibraryEntry,
  metadata: CatalogueInstanceMetadata,
): boolean {
  return (
    (!metadata.presetId || entry.presets.some((option) => option.id === metadata.presetId)) &&
    (!metadata.variantId || entry.variants.some((option) => option.id === metadata.variantId))
  )
}

function backingImplementation(
  implementation: ComponentLibraryImplementation,
): Exclude<ComponentLibraryImplementation, { type: 'capability-backed' }> {
  return implementation.type === 'capability-backed'
    ? implementation.backing
    : implementation
}

function changedChildIds(previous: readonly string[], next: readonly string[]): string[] {
  const ids = new Set([...previous, ...next])
  return Array.from(ids).filter(
    (id) => previous.indexOf(id) !== next.indexOf(id),
  )
}

function propChangeKind(moduleId: string, propKey: string): PageChangeKind {
  const control = registry.get(moduleId)?.schema[propKey]
  if (!control) return 'structure'
  return resolvePropertyControlCategory(control) === 'content' ? 'content' : 'structure'
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null) return a === b
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object') return false
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }
  if (Array.isArray(b)) return false

  const aKeys = Object.keys(a as Record<string, unknown>)
  const bKeys = Object.keys(b as Record<string, unknown>)
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false
    }
  }
  return true
}
