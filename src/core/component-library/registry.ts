import { parseComponentLibraryEntry } from './definition'
import { compareComponentLibraryEntries } from './query'
import { compareComponentLibraryVersions } from './version'
import type {
  ComponentLibraryEntry,
  ComponentLibrarySource,
} from './schemas'

type ComponentLibraryRegistryListener = () => void

export class ComponentLibraryRegistry {
  private readonly entries = new Map<string, ComponentLibraryEntry>()
  private readonly versions = new Map<string, Map<string, ComponentLibraryEntry>>()
  private readonly listeners = new Set<ComponentLibraryRegistryListener>()
  private currentGeneration = 0

  register(raw: unknown): ComponentLibraryEntry {
    const entry = parseComponentLibraryEntry(raw)
    if (this.entries.has(entry.id)) {
      throw new Error(
        `[ComponentLibraryRegistry] Entry "${entry.id}" is already registered. ` +
          'Use registerOrReplace() to intentionally replace it.',
      )
    }

    this.entries.set(entry.id, entry)
    this.rememberVersion(entry)
    this.emitChange()
    return entry
  }

  registerOrReplace(raw: unknown): ComponentLibraryEntry {
    const entry = parseComponentLibraryEntry(raw)
    this.entries.set(entry.id, entry)
    this.rememberVersion(entry)
    this.emitChange()
    return entry
  }

  unregister(id: string): void {
    const removed = this.entries.delete(id)
    this.versions.delete(id)
    if (removed) this.emitChange()
  }

  unregisterSource(source: ComponentLibrarySource): void {
    let changed = false
    for (const [id, entry] of this.entries) {
      if (!sameSource(entry.source, source)) continue
      this.entries.delete(id)
      this.versions.delete(id)
      changed = true
    }
    if (changed) this.emitChange()
  }

  get(id: string): ComponentLibraryEntry | undefined {
    return this.entries.get(id)
  }

  getOrThrow(id: string): ComponentLibraryEntry {
    const entry = this.entries.get(id)
    if (!entry) {
      throw new Error(
        `[ComponentLibraryRegistry] Entry "${id}" is not registered.`,
      )
    }
    return entry
  }

  /**
   * Resolve a retained definition version for pinned instances, migration
   * previews and rollback. Intentional replacements retain prior versions
   * until the entry or owning source is unregistered.
   */
  getVersion(id: string, version: string): ComponentLibraryEntry | undefined {
    return this.versions.get(id)?.get(version)
  }

  listVersions(id: string): ComponentLibraryEntry[] {
    return Array.from(this.versions.get(id)?.values() ?? [])
      .sort((left, right) =>
        compareComponentLibraryVersions(left.version, right.version),
      )
  }

  has(id: string): boolean {
    return this.entries.has(id)
  }

  list(): ComponentLibraryEntry[] {
    return Array.from(this.entries.values()).sort(compareComponentLibraryEntries)
  }

  generation(): number {
    return this.currentGeneration
  }

  subscribe(listener: ComponentLibraryRegistryListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  get size(): number {
    return this.entries.size
  }

  private emitChange(): void {
    this.currentGeneration += 1
    for (const listener of this.listeners) listener()
  }

  private rememberVersion(entry: ComponentLibraryEntry): void {
    let definitions = this.versions.get(entry.id)
    if (!definitions) {
      definitions = new Map()
      this.versions.set(entry.id, definitions)
    }
    definitions.set(entry.version, entry)
  }
}

export const componentLibraryRegistry = new ComponentLibraryRegistry()

function sameSource(
  left: ComponentLibrarySource,
  right: ComponentLibrarySource,
): boolean {
  if (left.type !== right.type) return false
  if (left.type === 'plugin' && right.type === 'plugin') {
    return left.pluginId === right.pluginId
  }
  if (left.type === 'design-system' && right.type === 'design-system') {
    return left.id === right.id
  }
  return true
}
