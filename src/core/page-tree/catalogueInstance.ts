/**
 * Component Library instance identity stored on an ordinary page-tree node.
 *
 * This metadata identifies how the authoring UI should project a node or
 * subtree. It does not contain rendered markup and does not replace a Visual
 * Component reference's canonical `props.componentId`.
 */

import { Type, type Static } from '@core/utils/typeboxHelpers'
import { compiledCheck } from '@core/utils/typeboxCompiler'

export const CatalogueInstanceMetadataSchema = Type.Object({
  /** Stable namespaced Component Library entry id. */
  entryId: Type.String({ minLength: 1 }),
  /** Entry or schema version used when this instance was authored. */
  entryVersion: Type.String({ minLength: 1 }),
  /** Author-facing preset backed by the entry's canonical implementation. */
  presetId: Type.Optional(Type.String({ minLength: 1 })),
  /**
   * Present on a pattern root. The listed backing nodes remain visible and
   * authorable while implementation-only descendants collapse behind the
   * pattern boundary in Components view.
   */
  pattern: Type.Optional(Type.Object({
    authorableNodeIds: Type.Array(Type.String({ minLength: 1 })),
  })),
  /** Platform capability required by a capability-backed entry. */
  capabilityId: Type.Optional(Type.String({ minLength: 1 })),
  /** Configured provider adapter selected for the capability, when applicable. */
  providerAdapterId: Type.Optional(Type.String({ minLength: 1 })),
})

export type CatalogueInstanceMetadata = Static<typeof CatalogueInstanceMetadataSchema>

/**
 * Tolerantly parse optional catalogue metadata at the persisted-node boundary.
 * Invalid optional metadata is dropped while the backing page node remains
 * usable in the HTML projection.
 */
export function parseCatalogueInstanceMetadata(
  raw: unknown,
): CatalogueInstanceMetadata | undefined {
  return compiledCheck(CatalogueInstanceMetadataSchema, raw)
    ? raw
    : undefined
}
