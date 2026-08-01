import {
  componentLibraryRegistry,
  type ComponentLibraryImplementation,
} from '@core/component-library'
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

export function backingComponentLibraryImplementation(
  implementation: ComponentLibraryImplementation,
): Exclude<ComponentLibraryImplementation, { type: 'capability-backed' }> {
  return implementation.type === 'capability-backed'
    ? implementation.backing
    : implementation
}

export function safeComponentLibraryOverrides(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}
