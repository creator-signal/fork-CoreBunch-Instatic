/** Opaque optimistic precondition for authenticated content import/publication.
 * Only CMS shell/table/row content participates; sessions, audit, credentials,
 * author display data and bookkeeping timestamps are deliberately excluded.
 */
import { createHash } from 'node:crypto'
import type { DbClient } from '../db/client'
import { getDraftSite } from './site'
import { listDataTables } from './data/tables'
import { listDataRows } from './data/rows'
import { listMediaAssetsForExport } from './media'
import { listExportableMediaFolders } from './mediaFolders'
import { listExportableRedirects } from './data/publish'

export const DRAFT_CONTENT_GUARD_VERSION = 1
export const DRAFT_CONTENT_HEADER = 'X-Instatic-Expected-Draft-Hash'
export class DraftContentChangedError extends Error {
  constructor() { super('draft_content_changed') }
}

export function expectedDraftContentHash(req: Request): string | undefined {
  const value = req.headers.get(DRAFT_CONTENT_HEADER)
  if (value === null) return undefined
  if (!/^[a-f0-9]{64}$/.test(value)) throw new TypeError('invalid_draft_content_hash')
  return value
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record).filter((key) => record[key] !== undefined).sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export async function getDraftContentHash(db: DbClient): Promise<string> {
  const shell = await getDraftSite(db)
  const tables = (await listDataTables(db)).toSorted((a, b) => a.id.localeCompare(b.id))
  const contentTables = []
  for (const table of tables) {
    const rows = (await listDataRows(db, table.id)).toSorted((a, b) => a.id.localeCompare(b.id))
    contentTables.push({
      id: table.id, name: table.name, slug: table.slug, kind: table.kind,
      singularLabel: table.singularLabel, pluralLabel: table.pluralLabel,
      routeBase: table.routeBase, primaryFieldId: table.primaryFieldId,
      fields: table.fields, system: table.system,
      rows: rows.map((row) => ({ id: row.id, tableId: row.tableId, cells: row.cells,
        slug: row.slug, status: row.status, scheduledPublishAt: row.scheduledPublishAt })),
    })
  }
  const contentShell = shell ? (({ createdAt: _created, updatedAt: _updated, ...content }) => content)(shell) : null
  const media = (await listMediaAssetsForExport(db)).toSorted((a, b) => a.id.localeCompare(b.id)).map((asset) => ({
    id: asset.id, publicPath: asset.publicPath, storageAdapterId: asset.storageAdapterId, externallyHosted: asset.externallyHosted, filename: asset.filename, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes,
    altText: asset.altText, caption: asset.caption, title: asset.title, tags: asset.tags,
    width: asset.width, height: asset.height, durationMs: asset.durationMs,
    dominantColor: asset.dominantColor, blurHash: asset.blurHash, storagePath: asset.storagePath,
    posterPath: asset.posterPath, folderIds: asset.folderIds.toSorted(),
  }))
  const mediaFolders = (await listExportableMediaFolders(db)).toSorted((a, b) => a.id.localeCompare(b.id))
  const redirects = (await listExportableRedirects(db)).toSorted((a, b) => a.id.localeCompare(b.id))
  return createHash('sha256').update(canonicalJson({ shell: contentShell, tables: contentTables, media, mediaFolders, redirects })).digest('hex')
}

/** Called only INSIDE the caller's write transaction. PostgreSQL's default
 * READ COMMITTED must also exclude a concurrent writer after comparison.
 * SQLite's adapter serializes its transactions. Fixed table names only.
 */
export async function assertDraftContentHash(tx: DbClient, expected?: string): Promise<void> {
  if (expected === undefined) return
  if (tx.dialect === 'postgres') {
    await tx.unsafe('lock table site, data_tables, data_rows, media_assets, media_folders, media_asset_folders, data_row_redirects in share row exclusive mode')
  }
  if (await getDraftContentHash(tx) !== expected) throw new DraftContentChangedError()
}

/** Guarded transactions reserve SQLite's connection against outside direct
 * statements as well as other transactions. PostgreSQL uses fixed table locks.
 */
export function draftContentTransaction<T>(
  db: DbClient, expected: string | undefined, operation: (tx: DbClient) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await assertDraftContentHash(tx, expected)
    return operation(tx)
  }, { isolateStatements: expected !== undefined })
}
