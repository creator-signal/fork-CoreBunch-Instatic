import type {
  ComponentLibraryDocumentKind,
  ComponentLibraryEntry,
  ComponentLibraryImplementationType,
  ComponentLibrarySlot,
} from './schemas'

export type ComponentLibraryPlacementIssueCode =
  | 'document-rejects-entry'
  | 'document-entry-limit'
  | 'parent-required'
  | 'parent-ungoverned'
  | 'parent-is-leaf'
  | 'parent-rejects-child'
  | 'slot-rejects-entry'
  | 'slot-rejects-implementation'
  | 'slot-full'

export type ComponentLibraryPlacementResult =
  | { allowed: true }
  | {
      allowed: false
      code: ComponentLibraryPlacementIssueCode
      message: string
    }

export interface ComponentLibraryPlacementContext {
  /** Editable document receiving the component. */
  documentKind?: ComponentLibraryDocumentKind
  /** Current instances of this entry in the document, excluding a moved node. */
  existingDocumentEntryCount?: number
  /** Governed parent entry, or the slot owner's entry for named slots. */
  parentEntry?: ComponentLibraryEntry
  /** The page-tree root is the only intentionally ungoverned parent. */
  parentIsPageRoot?: boolean
  /** Named slot receiving the child, when insertion targets a slot instance. */
  slot?: ComponentLibrarySlot
  /** Current direct child count in the target parent/slot. */
  existingChildCount: number
}

/**
 * Resolve the catalogue-level composition contract before a node is inserted
 * or moved. This is intentionally page-tree agnostic so editor DnD, inserters
 * and server diff validation can share exactly the same decision.
 */
export function resolveComponentLibraryPlacement(
  entry: ComponentLibraryEntry,
  context: ComponentLibraryPlacementContext,
): ComponentLibraryPlacementResult {
  const allowedDocumentKinds = entry.constraints.allowedDocumentKinds
  if (
    allowedDocumentKinds !== undefined &&
    (!context.documentKind || !allowedDocumentKinds.includes(context.documentKind))
  ) {
    return denied(
      'document-rejects-entry',
      allowedDocumentKinds.length === 1 && allowedDocumentKinds[0] === 'template'
        ? `${entry.name} is shared site chrome and can only be placed in a template.`
        : `${entry.name} can only be placed in ${formatDocumentKinds(allowedDocumentKinds)}.`,
    )
  }

  const maxInstances = entry.constraints.maxInstancesPerDocument
  if (
    maxInstances !== undefined &&
    (context.existingDocumentEntryCount ?? 0) >= maxInstances
  ) {
    return denied(
      'document-entry-limit',
      `${entry.name} allows at most ${maxInstances} instance${maxInstances === 1 ? '' : 's'} per ${context.documentKind ?? 'document'}.`,
    )
  }

  const allowedParents = entry.constraints.allowedParentEntryIds
  if (
    allowedParents !== undefined &&
    (!context.parentEntry || !allowedParents.includes(context.parentEntry.id))
  ) {
    return denied(
      'parent-required',
      `${entry.name} must be placed inside ${formatEntryIds(allowedParents)}.`,
    )
  }

  if (context.parentEntry?.composition === 'leaf') {
    return denied(
      'parent-is-leaf',
      `${context.parentEntry.name} owns its complete content and cannot contain child components.`,
    )
  }

  const allowedChildren = context.parentEntry?.constraints.allowedChildEntryIds
  if (allowedChildren !== undefined && !allowedChildren.includes(entry.id)) {
    return denied(
      'parent-rejects-child',
      `${context.parentEntry!.name} does not allow ${entry.name} as a direct child.`,
    )
  }

  if (!context.parentEntry && !context.parentIsPageRoot) {
    return denied(
      'parent-ungoverned',
      `${entry.name} cannot be placed inside an unmapped Component Block.`,
    )
  }

  const slot = context.slot
  if (!slot) return { allowed: true }

  if (slot.allowedEntryIds !== undefined && !slot.allowedEntryIds.includes(entry.id)) {
    return denied(
      'slot-rejects-entry',
      `${entry.name} is not allowed in the ${slot.name} slot.`,
    )
  }

  if (
    slot.allowedImplementationTypes !== undefined &&
    !slot.allowedImplementationTypes.includes(entry.implementation.type)
  ) {
    return denied(
      'slot-rejects-implementation',
      `${slot.name} accepts ${formatImplementationTypes(slot.allowedImplementationTypes)}, ` +
        `not ${entry.implementation.type.replaceAll('-', ' ')}.`,
    )
  }

  if (slot.maxItems !== undefined && context.existingChildCount >= slot.maxItems) {
    return denied(
      'slot-full',
      `${slot.name} allows at most ${slot.maxItems} item${slot.maxItems === 1 ? '' : 's'}.`,
    )
  }

  return { allowed: true }
}

function formatDocumentKinds(kinds: readonly ComponentLibraryDocumentKind[]): string {
  if (kinds.length === 0) return 'an approved document'
  const labels = kinds.map((kind) => kind === 'template' ? 'templates' : 'pages')
  if (labels.length === 1) return labels[0]!
  return `${labels.slice(0, -1).join(', ')} or ${labels.at(-1)}`
}

function denied(
  code: ComponentLibraryPlacementIssueCode,
  message: string,
): ComponentLibraryPlacementResult {
  return { allowed: false, code, message }
}

function formatEntryIds(ids: readonly string[]): string {
  if (ids.length === 0) return 'an approved parent'
  if (ids.length === 1) return ids[0]!
  return `${ids.slice(0, -1).join(', ')} or ${ids.at(-1)}`
}

function formatImplementationTypes(
  types: readonly ComponentLibraryImplementationType[],
): string {
  return types.map((type) => type.replaceAll('-', ' ')).join(' or ')
}
