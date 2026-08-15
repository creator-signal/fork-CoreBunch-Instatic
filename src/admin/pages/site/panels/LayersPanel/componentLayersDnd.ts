import {
  componentLibraryRegistry,
  resolveComponentLibraryPlacement,
} from '@core/component-library'
import { registry } from '@core/module-engine'
import {
  resolvePageTreeDropTarget,
  type Page,
  type PageTreeDropPosition,
  type PageTreeDropTarget,
  type PageNode,
} from '@core/page-tree'

export type ComponentLayerDropResolution =
  | {
      allowed: true
      target: PageTreeDropTarget
    }
  | {
      allowed: false
      reason: string
    }

interface ResolveComponentLayerDropInput {
  page: Page
  draggedId: string
  overId: string
  position: PageTreeDropPosition
}

/**
 * Resolve a whole-boundary Components-view move against both page-tree safety
 * and catalogue composition policy. The backing node ID is the move unit, so a
 * pattern or Visual Component row carries its complete persisted subtree.
 */
export function resolveComponentLayerDrop({
  page,
  draggedId,
  overId,
  position,
}: ResolveComponentLayerDropInput): ComponentLayerDropResolution {
  const draggedNode = page.nodes[draggedId]
  const draggedEntry = componentLibraryEntryForNode(draggedNode)
  if (!draggedNode || !draggedEntry || draggedNode.locked || draggedId === page.rootNodeId) {
    return denied('Only an unlocked governed component boundary can be moved.')
  }

  const target = resolvePageTreeDropTarget({
    tree: page,
    draggedId,
    overId,
    zone: position,
    canHaveChildren: (moduleId) => registry.get(moduleId)?.canHaveChildren === true,
  })
  if (!target) {
    return denied('That drop would create an invalid, cyclic, or unchanged hierarchy.')
  }

  const targetParent = page.nodes[target.parentId]
  const slotOwner = targetParent?.moduleId === 'base.slot-instance'
    ? parentNodeFor(page, targetParent.id)
    : undefined
  const parentEntry = componentLibraryEntryForNode(slotOwner ?? targetParent)
  const slotName = targetParent?.moduleId === 'base.slot-instance'
    ? String(targetParent.props.slotName ?? '')
    : ''
  const slot = slotName
    ? parentEntry?.slots.find((candidate) => candidate.id === slotName)
    : undefined
  const placement = resolveComponentLibraryPlacement(draggedEntry, {
    documentKind: page.template ? 'template' : 'page',
    existingDocumentEntryCount: Object.values(page.nodes).filter(
      (node) =>
        node.id !== draggedId &&
        node.catalogueInstance?.entryId === draggedEntry.id,
    ).length,
    ...(parentEntry ? { parentEntry } : {}),
    ...(slot ? { slot } : {}),
    parentIsPageRoot: target.parentId === page.rootNodeId,
    existingChildCount: targetParent
      ? targetParent.children.filter((childId) => childId !== draggedId).length
      : 0,
  })
  if (!placement.allowed) return denied(placement.message)

  return { allowed: true, target }
}

function componentLibraryEntryForNode(node: PageNode | undefined) {
  const metadata = node?.catalogueInstance
  return metadata
    ? componentLibraryRegistry.getVersion(metadata.entryId, metadata.entryVersion)
    : undefined
}

function parentNodeFor(page: Page, childId: string): PageNode | undefined {
  const child = page.nodes[childId]
  if (child?.parentId) return page.nodes[child.parentId]
  return Object.values(page.nodes).find((candidate) => candidate.children.includes(childId))
}

function denied(reason: string): ComponentLayerDropResolution {
  return { allowed: false, reason }
}
