import * as Y from 'yjs'
import { parseCatalogueInstanceMetadata } from '@core/page-tree'
import { dataMap, treeMap } from './schema'

const MIGRATION_ORIGIN = 'creator-signal-catalogue-namespace-migration'

/**
 * Rewrite catalogue identities inside a hydrated collaboration document.
 *
 * Page/component nodes are stored as Y.Maps, while saved layouts retain one
 * plain snapshot value. Both must move with the SQL-derived row projection so
 * a later collaboration persist cannot restore the legacy public identity.
 */
export function migrateCreatorSignalCatalogueNamespace(doc: Y.Doc): boolean {
  let changed = false
  doc.transact(() => {
    const nodes = treeMap(doc).get('nodes')
    if (nodes instanceof Y.Map) {
      for (const node of nodes.values()) {
        if (!(node instanceof Y.Map)) continue
        const raw = node.get('catalogueInstance')
        const metadata = parseCatalogueInstanceMetadata(raw)
        if (!metadata || !hasLegacyEntryId(raw, metadata.entryId)) continue
        node.set('catalogueInstance', metadata)
        changed = true
      }
    }

    const snapshot = dataMap(doc).get('snapshot')
    const migratedSnapshot = migrateSnapshotValue(snapshot)
    if (migratedSnapshot.changed) {
      dataMap(doc).set('snapshot', migratedSnapshot.value)
      changed = true
    }
  }, MIGRATION_ORIGIN)
  return changed
}

function hasLegacyEntryId(raw: unknown, canonicalEntryId: string): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  const entryId = (raw as Record<string, unknown>).entryId
  return typeof entryId === 'string' && entryId !== canonicalEntryId
}

function migrateSnapshotValue(value: unknown): { value: unknown; changed: boolean } {
  if (Array.isArray(value)) {
    let changed = false
    const next = value.map((item) => {
      const migrated = migrateSnapshotValue(item)
      changed ||= migrated.changed
      return migrated.value
    })
    return changed ? { value: next, changed: true } : { value, changed: false }
  }
  if (!value || typeof value !== 'object') return { value, changed: false }

  let changed = false
  const record = value as Record<string, unknown>
  const next: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(record)) {
    if (key === 'catalogueInstance') {
      const metadata = parseCatalogueInstanceMetadata(item)
      next[key] = metadata ?? item
      changed ||= Boolean(metadata && hasLegacyEntryId(item, metadata.entryId))
      continue
    }
    const migrated = migrateSnapshotValue(item)
    next[key] = migrated.value
    changed ||= migrated.changed
  }
  return changed ? { value: next, changed: true } : { value, changed: false }
}
