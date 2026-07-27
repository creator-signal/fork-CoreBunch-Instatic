import { componentLibraryRegistry } from '@core/component-library'
import type { CatalogueInstanceMetadata } from '@core/page-tree'

export function initialComponentLibraryVariantValues(
  metadata: CatalogueInstanceMetadata | undefined,
): Record<string, unknown> {
  if (!metadata?.variantId) return {}
  return componentLibraryRegistry
    .getVersion(metadata.entryId, metadata.entryVersion)
    ?.variants.find((variant) => variant.id === metadata.variantId)
    ?.values ?? {}
}
