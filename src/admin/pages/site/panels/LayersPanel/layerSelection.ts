import type { ComponentTreeProjection } from './componentTreeProjection'

/**
 * Resolve a canvas/HTML selection to the nearest row visible in Components
 * view. Governed implementation descendants map to their declared boundary;
 * unrelated imported/freeform nodes have no Components-view selection.
 */
export function resolveComponentLayerSelection(
  projection: ComponentTreeProjection,
  selectedNodeId: string | null,
): string | null {
  if (!selectedNodeId) return null
  return projection.selectionOwnerByNodeId[selectedNodeId] ?? null
}
