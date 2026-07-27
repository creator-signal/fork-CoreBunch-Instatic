import {
  componentLibraryRegistry,
  parseComponentLibraryEntry,
  type ComponentLibraryEntry,
  type ComponentLibraryImplementation,
} from '@core/component-library'
import { registry } from '@core/module-engine'
import {
  assertPluginPermission,
  type PluginManifest,
} from '@core/plugin-sdk'

const MAX_COMPONENT_LIBRARY_ENTRIES = 500
const registeredByPlugin = new Map<string, Set<string>>()

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
