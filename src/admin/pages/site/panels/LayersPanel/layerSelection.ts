import type { ComponentTreeProjection } from './componentTreeProjection'

/**
 * Resolve a canvas/HTML selection to the nearest row visible in Components
 * view. Pattern implementation descendants map to their declared boundary;
 * ordinary visible nodes map to themselves.
 */
export function resolveComponentLayerSelection(
  projection: ComponentTreeProjection,
  selectedNodeId: string | null,
): string | null {
  if (!selectedNodeId) return null
  return projection.selectionOwnerByNodeId[selectedNodeId] ?? null
}
