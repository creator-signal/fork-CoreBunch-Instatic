import { registry } from '@core/module-engine'
import {
  componentLibraryPatternRegistry,
  componentLibraryRegistry,
  resolveComponentLibraryPlacement,
  type ComponentLibraryEntry,
  type ComponentLibraryImplementation,
} from '@core/component-library'
import type {
  CatalogueInstanceMetadata,
  Page,
  PageNode,
} from '@core/page-tree'
import { selectVisualComponentById } from '@core/page-tree'
import { pushToast } from '@ui/components/Toast'
import { resolveInsertLocation } from '@site/store/insertLocation'
import type { InsertLocation } from '@site/store/insertLocation'
import { selectActiveCanvasPage, useEditorStore } from '@site/store/store'
import { useInsertModule } from './useInsertModule'

export interface InsertComponentLibraryEntryOptions {
  presetId?: string
  variantId?: string
  showSuccessToast?: boolean
}

/**
 * Insert a catalogue entry through its canonical page-tree implementation.
 *
 * The backing node remains ordinary editor content; the catalogue identity is
 * stamped atomically so Components view can project it without maintaining a
 * parallel document model.
 */
export function useInsertComponentLibraryEntry() {
  const canvasPage = useEditorStore(selectActiveCanvasPage)
  const site = useEditorStore((state) => state.site)
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId)
  const insertComponentRef = useEditorStore((state) => state.insertComponentRef)
  const insertImportedNodes = useEditorStore((state) => state.insertImportedNodes)
  const selectNode = useEditorStore((state) => state.selectNode)
  const insertModule = useInsertModule()

  return (
    entry: ComponentLibraryEntry,
    options: InsertComponentLibraryEntryOptions = {},
    explicitTarget?: InsertLocation,
  ): string | null => {
    if (!canvasPage) return null

    const implementation = backingImplementation(entry.implementation)
    const location = explicitTarget ?? resolveInsertLocation(
      canvasPage,
      selectedNodeId ?? canvasPage.rootNodeId,
    )
    if (!location) return null
    const placement = resolveComponentLibraryPlacement(
      entry,
      componentLibraryPlacementContext(canvasPage, location.parentId),
    )
    if (!placement.allowed) {
      pushUnsupportedEntryToast(entry, placement.message)
      return null
    }
    const presetId = options.presetId ??
      (implementation.type === 'primitive' ? implementation.presetId : undefined)
    const variantId = options.variantId
    const variantValues = variantId
      ? entry.variants.find((variant) => variant.id === variantId)?.values
      : undefined
    const metadata = createInstanceMetadata(entry, presetId, variantId)

    let nodeId: string | null
    if (implementation.type === 'primitive') {
      const mod = registry.get(implementation.moduleId)
      if (!mod) {
        pushUnsupportedEntryToast(entry, `Module "${implementation.moduleId}" is not registered.`)
        return null
      }

      const presetValues = presetId
        ? entry.presets.find((preset) => preset.id === presetId)?.values
        : undefined
      nodeId = insertModule(mod, location, {
        defaults: { ...mod.defaults, ...presetValues, ...variantValues },
        catalogueInstance: metadata,
      })
    } else if (implementation.type === 'visual-component') {
      if (
        !site ||
        !selectVisualComponentById(site, implementation.componentId)
      ) {
        pushUnsupportedEntryToast(
          entry,
          `Visual Component "${implementation.componentId}" is not installed.`,
        )
        return null
      }
      nodeId = insertComponentRef(
        location.parentId,
        implementation.componentId,
        location.index,
        { catalogueInstance: metadata },
      )
      if (nodeId) selectNode(nodeId)
    } else if (implementation.type === 'pattern') {
      const fragment = componentLibraryPatternRegistry.materialize(
        implementation.patternId,
        metadata,
        variantValues,
      )
      if (!fragment) {
        pushUnsupportedEntryToast(
          entry,
          `Pattern "${implementation.patternId}" is not registered.`,
        )
        return null
      }
      nodeId = insertImportedNodes(location.parentId, fragment, {
        index: location.index,
      })[0] ?? null
      if (nodeId) selectNode(nodeId)
    } else {
      pushUnsupportedEntryToast(
        entry,
        'Template-role placement is not available in this canvas.',
      )
      return null
    }

    if (!nodeId) return null
    if (options.showSuccessToast !== false) {
      pushToast({
        kind: 'success',
        title: `Inserted ${entry.name}`,
        body: 'Inserted at the current selection.',
        location: 'component-library',
      })
    }
    return nodeId
  }
}

function componentLibraryPlacementContext(page: Page, targetParentId: string) {
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

function pushUnsupportedEntryToast(entry: ComponentLibraryEntry, body: string): void {
  pushToast({
    kind: 'error',
    title: `Could not insert ${entry.name}`,
    body,
    location: 'component-library',
  })
}
