import {
  componentLibraryRegistry,
  findComponentLibraryUsages,
  parseComponentLibraryEntry,
  type ComponentLibraryEntry,
  type ComponentLibraryImplementation,
  type ComponentLibraryUsage,
} from '@core/component-library'
import type { BaseNode, SiteDocument } from '@core/page-tree'
import { registry } from '@core/module-engine'
import {
  assertPluginPermission,
  type PluginManifest,
} from '@core/plugin-sdk'

const MAX_COMPONENT_LIBRARY_ENTRIES = 500
const registeredByPlugin = new Map<string, Set<string>>()

export interface PluginComponentLibraryLifecycleBlocker {
  entryId: string
  entryName?: string
  usages: ComponentLibraryUsage[]
  replacementEntryId?: string
  replacementAvailable: boolean
}

/**
 * Validate and atomically register a plugin-owned governed catalogue pack.
 *
 * The pack is declarative JSON, not executable plugin code. Ownership,
 * namespace, schema and primitive-module resolution are checked before any
 * registry mutation occurs.
 */
export function activatePluginComponentLibraryPack(
  manifest: PluginManifest,
  raw: unknown,
): ComponentLibraryEntry[] {
  assertPluginPermission(manifest, 'componentLibrary.register')
  if (!Array.isArray(raw)) {
    throw new Error(
      `Plugin "${manifest.id}" Component Library pack must be a JSON array.`,
    )
  }
  if (raw.length > MAX_COMPONENT_LIBRARY_ENTRIES) {
    throw new Error(
      `Plugin "${manifest.id}" Component Library pack exceeds ${MAX_COMPONENT_LIBRARY_ENTRIES} entries.`,
    )
  }

  const entries = raw.map((candidate) => parseComponentLibraryEntry(candidate))
  const entryIds = new Set<string>()
  for (const entry of entries) {
    assertPluginEntryOwnership(manifest.id, entry)
    if (entryIds.has(entry.id)) {
      throw new Error(
        `Plugin "${manifest.id}" Component Library pack contains duplicate entry "${entry.id}".`,
      )
    }
    entryIds.add(entry.id)
    assertPrimitiveImplementationAvailable(manifest.id, entry)
  }

  deactivatePluginComponentLibraryPack(manifest.id)
  try {
    for (const entry of entries) componentLibraryRegistry.register(entry)
  } catch (error) {
    componentLibraryRegistry.unregisterSource({
      type: 'plugin',
      pluginId: manifest.id,
    })
    throw error
  }
  registeredByPlugin.set(manifest.id, entryIds)
  return entries
}

export function deactivatePluginComponentLibraryPack(pluginId: string): void {
  if (!registeredByPlugin.has(pluginId)) return
  componentLibraryRegistry.unregisterSource({ type: 'plugin', pluginId })
  registeredByPlugin.delete(pluginId)
}

export function resetPluginComponentLibraryPacks(): void {
  for (const pluginId of registeredByPlugin.keys()) {
    componentLibraryRegistry.unregisterSource({ type: 'plugin', pluginId })
  }
  registeredByPlugin.clear()
}

export function listPluginComponentLibraryEntryIds(pluginId: string): string[] {
  return [...(registeredByPlugin.get(pluginId) ?? [])].sort()
}

/**
 * Find persisted catalogue instances that would lose their owning definition
 * when a plugin is disabled or removed.
 *
 * Discovery uses the stamped `<pluginId>.*` instance identity rather than the
 * in-memory registration roster. This keeps the safety check effective for a
 * corrupt manifest, a partially activated plugin, or a server restarted after
 * the plugin entry registry was cleared. A declared replacement is returned as
 * remediation guidance, but the old instance remains a blocker until a
 * migration or conversion has actually rewritten the persisted node.
 */
export function findPluginComponentLibraryLifecycleBlockers(
  site: SiteDocument,
  pluginId: string,
): PluginComponentLibraryLifecycleBlocker[] {
  const entryIds = new Set<string>()
  const collectPluginEntryId = (node: BaseNode) => {
    const entryId = node.catalogueInstance?.entryId
    if (entryId?.startsWith(`${pluginId}.`)) entryIds.add(entryId)
  }

  for (const page of site.pages) {
    Object.values(page.nodes).forEach(collectPluginEntryId)
  }
  for (const component of site.visualComponents) {
    Object.values(component.tree.nodes).forEach(collectPluginEntryId)
  }

  return [...entryIds].sort().map((entryId) => {
    const entry = componentLibraryRegistry.get(entryId)
    const replacementEntryId = entry?.replacementEntryId
    const replacement = replacementEntryId
      ? componentLibraryRegistry.get(replacementEntryId)
      : undefined
    const replacementAvailable = Boolean(
      replacement &&
      !(
        replacement.source.type === 'plugin' &&
        replacement.source.pluginId === pluginId
      ),
    )
    return {
      entryId,
      ...(entry?.name ? { entryName: entry.name } : {}),
      usages: findComponentLibraryUsages(site, entryId),
      ...(replacementEntryId ? { replacementEntryId } : {}),
      replacementAvailable,
    }
  })
}

function assertPluginEntryOwnership(
  pluginId: string,
  entry: ComponentLibraryEntry,
): void {
  if (!entry.id.startsWith(`${pluginId}.`)) {
    throw new Error(
      `Plugin "${pluginId}" Component Library entry "${entry.id}" is outside its namespace.`,
    )
  }
  if (
    entry.source.type !== 'plugin' ||
    entry.source.pluginId !== pluginId
  ) {
    throw new Error(
      `Plugin "${pluginId}" Component Library entry "${entry.id}" has invalid source ownership.`,
    )
  }
}

function assertPrimitiveImplementationAvailable(
  pluginId: string,
  entry: ComponentLibraryEntry,
): void {
  const implementation = backingImplementation(entry.implementation)
  if (
    implementation.type === 'primitive' &&
    !registry.has(implementation.moduleId)
  ) {
    throw new Error(
      `Plugin "${pluginId}" Component Library entry "${entry.id}" references ` +
      `unregistered module "${implementation.moduleId}".`,
    )
  }
}

function backingImplementation(
  implementation: ComponentLibraryImplementation,
): Exclude<ComponentLibraryImplementation, { type: 'capability-backed' }> {
  return implementation.type === 'capability-backed'
    ? implementation.backing
    : implementation
}
