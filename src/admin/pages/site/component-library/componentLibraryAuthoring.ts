import {
  componentLibraryPatternRegistry,
  componentLibraryRegistry,
  resolveComponentLibraryPlacement,
  type ComponentLibraryEntry,
  type ComponentLibraryImplementation,
  type ComponentLibraryPlacementResult,
} from '@core/component-library'
import { getMissingModuleDependencies, registry } from '@core/module-engine'
import type {
  CatalogueInstanceMetadata,
  Page,
  PageNode,
} from '@core/page-tree'
import { selectVisualComponentById } from '@core/page-tree'
import type { EditorStore } from '@site/store/types'
import type { InsertLocation } from '@site/store/insertLocation'

export interface InsertComponentLibraryEntryOptions {
  presetId?: string
  variantId?: string
}

export type InsertComponentLibraryEntryResult =
  | {
      ok: true
      nodeId: string
      metadata: CatalogueInstanceMetadata
    }
  | {
      ok: false
      error: string
    }

/**
 * Insert a governed catalogue entry through the canonical editor store.
 *
 * Both the component picker and browser-bridged AI tools call this function,
 * so placement policy, backing implementation, dependency installation, and
 * retained catalogue identity cannot drift between human and agent authoring.
 */
export function insertComponentLibraryEntry(
  store: EditorStore,
  page: Page,
  entry: ComponentLibraryEntry,
  location: InsertLocation,
  options: InsertComponentLibraryEntryOptions = {},
): InsertComponentLibraryEntryResult {
  if (!page.nodes[location.parentId]) {
    return { ok: false, error: `Parent node not found: ${location.parentId}` }
  }

  const implementation = backingImplementation(entry.implementation)
  const placement = resolveComponentLibraryEntryPlacement(page, entry, location)
  if (!placement.allowed) return { ok: false, error: placement.message }

  const presetId = options.presetId ??
    (implementation.type === 'primitive' ? implementation.presetId : undefined)
  const variantId = options.variantId
  const preset = presetId
    ? entry.presets.find((candidate) => candidate.id === presetId)
    : undefined
  if (presetId && !preset) {
    return {
      ok: false,
      error: `Preset "${presetId}" is not declared by ${entry.id}.`,
    }
  }
  const variant = variantId
    ? entry.variants.find((candidate) => candidate.id === variantId)
    : undefined
  if (variantId && !variant) {
    return {
      ok: false,
      error: `Variant "${variantId}" is not declared by ${entry.id}.`,
    }
  }

  const metadata = createInstanceMetadata(entry, presetId, variantId)
  let nodeId: string | null

  if (implementation.type === 'primitive') {
    const mod = registry.get(implementation.moduleId)
    if (!mod) {
      return {
        ok: false,
        error: `Module "${implementation.moduleId}" is not registered.`,
      }
    }
    nodeId = store.insertNode(
      mod.id,
      { ...mod.defaults, ...preset?.values, ...variant?.values },
      location.parentId,
      location.index,
      { catalogueInstance: metadata },
    )
    if (nodeId) {
      for (const dependency of getMissingModuleDependencies(mod, store.packageJson)) {
        store.setDependency(dependency.name, dependency.version, dependency.dev)
      }
    }
  } else if (implementation.type === 'visual-component') {
    if (!store.site || !selectVisualComponentById(store.site, implementation.componentId)) {
      return {
        ok: false,
        error: `Visual Component "${implementation.componentId}" is not installed.`,
      }
    }
    nodeId = store.insertComponentRef(
      location.parentId,
      implementation.componentId,
      location.index,
      { catalogueInstance: metadata },
    )
  } else if (implementation.type === 'pattern') {
    const fragment = componentLibraryPatternRegistry.materialize(
      implementation.patternId,
      metadata,
      variant?.values,
    )
    if (!fragment) {
      return {
        ok: false,
        error: `Pattern "${implementation.patternId}" is not registered.`,
      }
    }
    nodeId = store.insertImportedNodes(location.parentId, fragment, {
      index: location.index,
    })[0] ?? null
  } else {
    return {
      ok: false,
      error: 'Template-role placement is not available in this canvas.',
    }
  }

  if (!nodeId) {
    return {
      ok: false,
      error: `The editor refused to insert ${entry.id} at ${location.parentId}.`,
    }
  }
  store.selectNode(nodeId)
  return { ok: true, nodeId, metadata }
}

/**
 * Resolve the insertion policy without mutating the page. The picker, Agent/MCP
 * bridge and insertion action use this same preflight so disabled UI explains
 * the exact policy the write path enforces.
 */
export function resolveComponentLibraryEntryPlacement(
  page: Page,
  entry: ComponentLibraryEntry,
  location: InsertLocation,
): ComponentLibraryPlacementResult {
  return resolveComponentLibraryPlacement(
    entry,
    componentLibraryPlacementContext(page, location.parentId, entry.id),
  )
}

function componentLibraryPlacementContext(
  page: Page,
  targetParentId: string,
  entryId: string,
) {
  const targetParent = page.nodes[targetParentId]
  const slotOwner = targetParent?.moduleId === 'base.slot-instance'
    ? parentNode(page, targetParent)
    : undefined
  const parentNodeForPolicy = slotOwner ?? targetParent
  const parentEntry = componentLibraryEntryForNode(parentNodeForPolicy)
  const slotName = targetParent?.moduleId === 'base.slot-instance'
    ? String(targetParent.props.slotName ?? '')
    : ''
  const slot = slotName
    ? parentEntry?.slots.find((candidate) => candidate.id === slotName)
    : undefined
  return {
    documentKind: page.template ? 'template' as const : 'page' as const,
    existingDocumentEntryCount: Object.values(page.nodes).filter(
      (node) => node.catalogueInstance?.entryId === entryId,
    ).length,
    ...(parentEntry ? { parentEntry } : {}),
    ...(slot ? { slot } : {}),
    parentIsPageRoot: targetParentId === page.rootNodeId,
    existingChildCount: targetParent?.children.length ?? 0,
  }
}

function componentLibraryEntryForNode(
  node: PageNode | undefined,
): ComponentLibraryEntry | undefined {
  const metadata = node?.catalogueInstance
  return metadata
    ? componentLibraryRegistry.getVersion(metadata.entryId, metadata.entryVersion)
    : undefined
}

function parentNode(page: Page, node: PageNode): PageNode | undefined {
  if (node.parentId) return page.nodes[node.parentId]
  return Object.values(page.nodes).find((candidate) => candidate.children.includes(node.id))
}

function backingImplementation(
  implementation: ComponentLibraryImplementation,
): Exclude<ComponentLibraryImplementation, { type: 'capability-backed' }> {
  return implementation.type === 'capability-backed'
    ? implementation.backing
    : implementation
}

function createInstanceMetadata(
  entry: ComponentLibraryEntry,
  presetId: string | undefined,
  variantId: string | undefined,
): CatalogueInstanceMetadata {
  const capabilityId = entry.requirements.capabilities[0]
  const providerAdapterId = entry.requirements.providerAdapters[0]
  return {
    entryId: entry.id,
    entryVersion: entry.version,
    ...(presetId ? { presetId } : {}),
    ...(variantId ? { variantId } : {}),
    ...(entry.implementation.type === 'capability-backed'
      ? {
          ...(capabilityId ? { capabilityId } : {}),
          ...(providerAdapterId ? { providerAdapterId } : {}),
        }
      : {}),
  }
}
