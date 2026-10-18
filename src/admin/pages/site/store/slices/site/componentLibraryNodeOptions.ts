import {
  componentLibraryRegistry,
  canUpgradeComponentContentFields,
  type ComponentLibraryImplementation,
} from '@core/component-library'
import type { CatalogueInstanceMetadata, PageNode } from '@core/page-tree'

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

export function upgradeComponentLibraryNodeContentFields(node: PageNode | undefined, targetVersion: string): boolean {
  const metadata = node?.catalogueInstance
  if (!node || !metadata || metadata.pinnedVersion) return false
  const source = componentLibraryRegistry.getVersion(metadata.entryId, metadata.entryVersion)
  const target = componentLibraryRegistry.get(metadata.entryId)
  if (!target || target.version !== targetVersion || !canUpgradeComponentContentFields(source, target)) return false
  const implementation = target.implementation
  if (implementation.type === 'primitive' && node.moduleId !== implementation.moduleId) return false
  if (implementation.type === 'visual-component'
    && (node.moduleId !== 'base.visual-component-ref' || node.props.componentId !== implementation.componentId)) return false
  node.catalogueInstance = { ...metadata, entryVersion: target.version }
  return true
}

export function updateComponentLibraryNodeField(node: PageNode | undefined, fieldKey: string, value: unknown): boolean {
  const metadata = node?.catalogueInstance
  if (!node || !metadata) return false
  const entry = componentLibraryRegistry.getVersion(metadata.entryId, metadata.entryVersion)
  if (!entry?.fields.some((field) => field.key === fieldKey)) return false
  const implementation = backingComponentLibraryImplementation(
    entry.implementation,
  )
  if (implementation.type === 'primitive') {
    if (implementation.moduleId !== node.moduleId) return false
    node.props[fieldKey] = value
  } else if (implementation.type === 'visual-component') {
    if (
      node.moduleId !== 'base.visual-component-ref' ||
      node.props.componentId !== implementation.componentId
    ) {
      return false
    }
    node.props.propOverrides = {
      ...safeComponentLibraryOverrides(node.props.propOverrides),
      [fieldKey]: value,
    }
  } else if (implementation.type === 'pattern') node.props[fieldKey] = value
  else {
    return false
  }
  return true
}
