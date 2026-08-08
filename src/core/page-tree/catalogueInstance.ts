/**
 * Component Library instance identity stored on an ordinary page-tree node.
 *
 * This metadata identifies how the authoring UI should project a node or
 * subtree. It does not contain rendered markup and does not replace a Visual
 * Component reference's canonical `props.componentId`.
 */

import { Type, type Static } from '@core/utils/typeboxHelpers'
import { compiledCheck } from '@core/utils/typeboxCompiler'

export const CREATOR_SIGNAL_CATALOGUE_ENTRY_NAMESPACE =
  'creator-signal.site.catalogue'

const LEGACY_MAPPED_CATALOGUE_ENTRY_PREFIX = 'base.'
const CREATOR_SIGNAL_CATALOGUE_ENTRY_PREFIX =
  `${CREATOR_SIGNAL_CATALOGUE_ENTRY_NAMESPACE}.`

const SEMVER_PATTERN =
  '^[0-9]+\\.[0-9]+\\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$'

export const CatalogueInstanceMetadataSchema = Type.Object({
  /** Stable namespaced Component Library entry id. */
  entryId: Type.String({ minLength: 1 }),
  /** Entry or schema version used when this instance was authored. */
  entryVersion: Type.String({ pattern: SEMVER_PATTERN }),
  /** Explicitly retained definition version for an instance awaiting upgrade. */
  pinnedVersion: Type.Optional(Type.String({ pattern: SEMVER_PATTERN })),
  /** Author-facing preset backed by the entry's canonical implementation. */
  presetId: Type.Optional(Type.String({ minLength: 1 })),
  /** Approved variant whose values were applied to this instance. */
  variantId: Type.Optional(Type.String({ minLength: 1 })),
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
 * Resolve the public identity of an entry from the mapped component catalogue.
 *
 * The implementation modules remain first-party `base.*` modules. Only the
 * author-facing catalogue identity belongs to the Creator Signal namespace.
 */
export function creatorSignalCatalogueEntryId(entryId: string): string {
  if (entryId.startsWith(CREATOR_SIGNAL_CATALOGUE_ENTRY_PREFIX)) return entryId
  if (!entryId.startsWith(LEGACY_MAPPED_CATALOGUE_ENTRY_PREFIX)) return entryId
  return `${CREATOR_SIGNAL_CATALOGUE_ENTRY_PREFIX}${entryId.slice(LEGACY_MAPPED_CATALOGUE_ENTRY_PREFIX.length)}`
}

/**
 * Tolerantly parse optional catalogue metadata at the persisted-node boundary.
 * Invalid optional metadata is dropped while the backing page node remains
 * usable in the HTML projection.
 */
export function parseCatalogueInstanceMetadata(
  raw: unknown,
): CatalogueInstanceMetadata | undefined {
  if (!compiledCheck(CatalogueInstanceMetadataSchema, raw)) return undefined
  const entryId = creatorSignalCatalogueEntryId(raw.entryId)
  return entryId === raw.entryId ? raw : { ...raw, entryId }
}
