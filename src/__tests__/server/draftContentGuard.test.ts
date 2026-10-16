import { zipSync } from 'fflate'
import { handleImportArchiveRoute } from '../../../server/handlers/cms/importArchive'
import { describe, expect, it } from 'bun:test'
import { createSqliteClient } from '../../../server/db/sqlite'
import { runMigrations } from '../../../server/db/runMigrations'
import { sqliteMigrations } from '../../../server/db/migrations-sqlite'
import { createUser } from '../../../server/repositories/users'
import { createSession } from '../../../server/auth/sessions'
import { hashSessionToken, SESSION_COOKIE_NAME } from '../../../server/auth/tokens'
import { createDataRow, saveDataRowDraft, listDataRows, listDataTables } from '../../../server/repositories/data'
import { saveDraftSite } from '../../../server/repositories/site'
import { pageToCells } from '@core/data/pageFromRow'
import type { DbClient } from '../../../server/db/client'
import { normalizeSiteRuntimeConfig } from '@core/site-runtime'
import { getDraftContentHash, assertDraftContentHash, draftContentTransaction, DraftContentChangedError, expectedDraftContentHash } from '../../../server/repositories/draftContentGuard'
import { getDraftPublishStatus, persistSitePublish } from '../../../server/repositories/publish'
import { handleImportRoute } from '../../../server/handlers/cms/import'
import { handlePublishRoutes } from '../../../server/handlers/cms/publish'
import { publishDraftSite } from '../../../server/publish/publishSite'
import { registerPublishFlush } from '../../../server/publish/publishFlush'
import { bumpPublishVersionSerialized } from '../../../server/publish/publishState'

async function fixture() {
  const db = createSqliteClient(':memory:')
  await runMigrations(db, sqliteMigrations)
  const test = { db, cleanup: async () => { await db.close?.(); Bun.gc(true) } }
  await createUser(db, { id: 'owner', email: 'synthetic@example.test', displayName: 'Synthetic', passwordHash: 'unused', roleId: 'admin' })
  const token = crypto.randomUUID()
  await createSession(db, { idHash: await hashSessionToken(token), userId: 'owner', expiresAt: new Date('2030-01-01'), ipAddress: null, userAgent: 'test', stepUpExpiresAt: new Date('2030-01-01') })
  await db`update sessions set last_seen_at = ${new Date('2029-01-01').toISOString()}`
  await saveDraftSite(db, { id: 'default', name: 'Synthetic', files: [], visualComponents: [], breakpoints: [], settings: { shortcuts: {} }, styleRules: {}, packageJson: { dependencies: {}, devDependencies: {} }, runtime: normalizeSiteRuntimeConfig(undefined), createdAt: 1, updatedAt: 1 })
  await createDataRow(db, { id: 'layout', tableId: 'layouts', slug: 'synthetic', cells: { title: 'Original' } }, 'owner')
  const req = (path: string, hash?: string, body?: unknown) => { const request = new Request(`http://localhost/admin/api/cms/${path}`, { method: 'POST', headers: { cookie: `${SESSION_COOKIE_NAME}=${token}`, 'content-type': 'application/json', ...(hash === undefined ? {} : { 'X-Instatic-Expected-Draft-Hash': hash }) }, body: JSON.stringify(body ?? {}) }); request.headers.set('cookie', `${SESSION_COOKIE_NAME}=${token}`); return request }
  const bundle = async () => ({ schemaVersion: 1, exportedAt: new Date().toISOString(), tables: await listDataTables(db), rows: (await listDataRows(db, 'layouts')).map((row) => ({ ...row, cells: { title: 'Imported' } })) })
  return { ...test, req, bundle }
}

describe('atomic draft content guards', () => {
  it('binds authored custom/layout content and status, ignoring bookkeeping timestamps', async () => {
    const { db, cleanup } = await fixture()
    try {
      const initial = await getDraftContentHash(db)
      await db`update data_rows set updated_at = '2026-01-01', seq = seq + 1 where id = 'layout'`
      expect(await getDraftContentHash(db)).toBe(initial)
      await db`update data_rows set status = 'unpublished' where id = 'layout'`
      expect(await getDraftContentHash(db)).not.toBe(initial)
      expect(await getDraftPublishStatus(db)).toMatchObject({ contentGuardVersion: 1, draftContentHash: await getDraftContentHash(db) })
    } finally { await cleanup() }
  })

  it('rejects author edits between preview and import before overwriting', async () => {
    const { db, req, bundle, cleanup } = await fixture()
    try {
      const hash = await getDraftContentHash(db)
      const archive = await bundle()
      await saveDataRowDraft(db, 'layout', { cells: { title: 'Author edit' }, slug: 'synthetic' }, 'owner')
      const response = await handleImportRoute(req('import?strategy=merge-overwrite', hash, archive), db)
      expect(response?.status).toBe(409)
      expect(await response?.json()).toEqual({ error: 'draft_content_changed' })
      expect((await listDataRows(db, 'layouts'))[0].cells.title).toBe('Author edit')
    } finally { await cleanup() }
  })

  it('allows an unchanged guarded import and preserves legacy import compatibility', async () => {
    const { db, req, bundle, cleanup } = await fixture()
    try {
      const response = await handleImportRoute(req('import?strategy=merge-overwrite', await getDraftContentHash(db), await bundle()), db)
      expect(response?.status).toBe(200)
      expect((await listDataRows(db, 'layouts'))[0].cells.title).toBe('Imported')
      expect((await handleImportRoute(req('import?strategy=merge-add', undefined, await bundle()), db))?.status).toBe(200)
    } finally { await cleanup() }
  })

  it('rejects collaborative changes during publish flush without publishing or deadlocking version bumps', async () => {
    const { db, req, cleanup } = await fixture()
    const hash = await getDraftContentHash(db)
    const detach = registerPublishFlush(async () => {
      await saveDataRowDraft(db, 'layout', { cells: { title: 'Collaboration edit' }, slug: 'synthetic' }, 'owner')
      await bumpPublishVersionSerialized()
    })
    try {
      const response = await handlePublishRoutes(req('publish', hash), db)
      expect(response?.status).toBe(409)
      expect((await db`select id from site_snapshots`).rows).toHaveLength(0)
    } finally { detach(); await cleanup() }
  })

  it('rechecks inside persistence and rolls back before any published snapshot write', async () => {
    const { db, cleanup } = await fixture()
    try {
      const hash = await getDraftContentHash(db)
      await saveDataRowDraft(db, 'layout', { cells: { title: 'Build-time edit' }, slug: 'synthetic' }, 'owner')
      await expect(persistSitePublish(db, { expectedDraftContentHash: hash, siteSnapshotId: 'blocked', site: {} as never, serializedImportmap: null, pages: [], publishedByUserId: 'owner' })).rejects.toBeInstanceOf(DraftContentChangedError)
      expect((await db`select id from site_snapshots`).rows).toHaveLength(0)
      await expect(db.transaction((tx) => assertDraftContentHash(tx, hash))).rejects.toBeInstanceOf(DraftContentChangedError)
    } finally { await cleanup() }
  })

  it('allows unchanged guarded publication and normal legacy publication', async () => {
    const { db, cleanup } = await fixture()
    try {
      expect(await publishDraftSite(db, 'owner', undefined, await getDraftContentHash(db))).toEqual({ publishedPages: 0 })
      expect(await publishDraftSite(db, 'owner')).toEqual({ publishedPages: 0 })
    } finally { await cleanup() }
  })

  it('publishes an unchanged guarded page while preserving its authored body', async () => {
    const { db, cleanup } = await fixture()
    try {
      await createDataRow(db, { id: 'home', tableId: 'pages', slug: 'index', cells: pageToCells({
        id: 'home', title: 'Home', slug: 'index', rootNodeId: 'root', nodes: {
          root: { id: 'root', moduleId: 'base.body', props: {}, children: ['text'], classIds: [], breakpointOverrides: {} },
          text: { id: 'text', moduleId: 'base.text', props: { text: 'Synthetic governed migration' }, children: [], classIds: [], breakpointOverrides: {} },
        },
      }) }, 'owner')
      const hash = await getDraftContentHash(db)
      expect(await publishDraftSite(db, 'owner', undefined, hash)).toEqual({ publishedPages: 1 })
      const rows = await listDataRows(db, 'pages')
      expect(rows[0].status).toBe('published')
      expect(rows[0].cells.title).toBe('Home')
      expect(await getDraftContentHash(db)).not.toBe(hash)
    } finally { await cleanup() }
  })

  it('locks fixed PostgreSQL content tables before the first guarded comparison read', async () => {
    const { db, cleanup } = await fixture()
    try {
      const events: string[] = []
      const tx = Object.assign(async (strings: TemplateStringsArray, ...values: unknown[]) => {
        events.push('read')
        return db(strings, ...values)
      }, { dialect: 'postgres', unsafe: async (sql: string, params?: unknown[]) => {
        if (sql.startsWith('lock table ')) { events.push(sql); return { rows: [], rowCount: 0 } }
        return db.unsafe(sql, params)
      } }) as DbClient
      await assertDraftContentHash(tx, await getDraftContentHash(db))
      expect(events[0]).toBe('lock table site, data_tables, data_rows, media_assets, media_folders, media_asset_folders, data_row_redirects in share row exclusive mode')
      expect(events[1]).toBe('read')
    } finally { await cleanup() }
  })

  it('holds same-connection author writes outside a guarded transaction until rollback', async () => {
    const { db, cleanup } = await fixture()
    const entered = Promise.withResolvers<void>()
    const release = Promise.withResolvers<void>()
    try {
      const pending = draftContentTransaction(db, await getDraftContentHash(db), async (tx) => {
        await tx`update data_rows set cells_json = ${{ title: 'Temporary migration' }} where id = 'layout'`
        entered.resolve()
        await release.promise
        throw new DraftContentChangedError()
      })
      // Observe rejection immediately; this is an expected rollback.
      const rejected = pending.then(() => null, (error: unknown) => error)
      await entered.promise
      let authorFinished = false
      const author = db`update data_rows set cells_json = ${{ title: 'Author after preview' }} where id = 'layout'`.then(() => { authorFinished = true })
      await Promise.resolve()
      await Promise.resolve()
      expect(authorFinished).toBe(false)
      release.resolve()
      expect(await rejected).toBeInstanceOf(DraftContentChangedError)
      await author
      expect((await listDataRows(db, 'layouts'))[0].cells.title).toBe('Author after preview')
    } finally { release.resolve(); await cleanup() }
  })

  it('does not let an escaped historical owner bypass a later guarded transaction', async () => {
    const { db, cleanup } = await fixture()
    const wakeEscaped = Promise.withResolvers<void>()
    const entered = Promise.withResolvers<void>()
    const release = Promise.withResolvers<void>()
    let escaped!: Promise<unknown>
    let escapedFinished = false
    try {
      await draftContentTransaction(db, await getDraftContentHash(db), async () => {
        escaped = (async () => {
          await wakeEscaped.promise
          await db`update data_rows set cells_json = ${{ title: 'Escaped owner' }} where id = 'layout'`
          escapedFinished = true
        })()
      })
      const current = draftContentTransaction(db, await getDraftContentHash(db), async () => {
        entered.resolve()
        await release.promise
      })
      await entered.promise
      wakeEscaped.resolve()
      await Promise.resolve()
      await Promise.resolve()
      expect(escapedFinished).toBe(false)
      release.resolve()
      await current
      await escaped
      expect((await listDataRows(db, 'layouts'))[0].cells.title).toBe('Escaped owner')
    } finally { wakeEscaped.resolve(); release.resolve(); await cleanup() }
  })

  it('rejects nested guarded transactions explicitly and recovers the queue after failure', async () => {
    const { db, cleanup } = await fixture()
    try {
      await draftContentTransaction(db, await getDraftContentHash(db), async () => {
        await expect(db.transaction(async () => undefined)).rejects.toThrow('nested SQLite transaction is not supported')
      })
      await expect(draftContentTransaction(db, '0'.repeat(64), async () => undefined)).rejects.toBeInstanceOf(DraftContentChangedError)
      await db.transaction(async (tx) => { await tx`update data_rows set cells_json = ${{ title: 'Queue recovered' }} where id = 'layout'` })
      expect((await listDataRows(db, 'layouts'))[0].cells.title).toBe('Queue recovered')
    } finally { await cleanup() }
  })

  it('denies guarded media payloads before collaboration flush or content mutation', async () => {
    const { db, req, bundle, cleanup } = await fixture()
    let flushed = false
    const detach = registerPublishFlush(async () => { flushed = true })
    try {
      const original = await getDraftContentHash(db)
      const payload = { ...await bundle(), mediaFolders: [{ id: 'folder', parentId: null, name: 'Folder', slug: 'folder', sortOrder: 0 }] }
      const response = await handleImportRoute(req('import?strategy=merge-overwrite', original, payload), db)
      expect(response?.status).toBe(400)
      expect(flushed).toBe(false)
      expect(await getDraftContentHash(db)).toBe(original)
    } finally { detach(); await cleanup() }
  })

  it('retains the precondition through archive import and rejects ancillary data before writes', async () => {
    const { db, req, bundle, cleanup } = await fixture()
    const archiveRequest = (payload: unknown, hash: string) => {
      const bytes = zipSync({ '.instatic/site-bundle.json': new TextEncoder().encode(JSON.stringify(payload)) }, { level: 0 })
      const request = new Request('http://localhost/admin/api/cms/import/archive?strategy=merge-overwrite', {
        method: 'POST', body: bytes, headers: { 'content-type': 'application/zip', 'X-Instatic-Expected-Draft-Hash': hash },
      })
      request.headers.set('cookie', req('test').headers.get('cookie')!)
      return request
    }
    try {
      const hash = await getDraftContentHash(db)
      const payload = await bundle()
      await saveDataRowDraft(db, 'layout', { cells: { title: 'Author archive edit' }, slug: 'synthetic' }, 'owner')
      expect((await handleImportArchiveRoute(archiveRequest(payload, hash), db))?.status).toBe(409)
      expect((await listDataRows(db, 'layouts'))[0].cells.title).toBe('Author archive edit')
      const folders = { ...payload, mediaFolders: [{ id: 'folder', parentId: null, name: 'Folder', slug: 'folder', sortOrder: 0 }] }
      expect((await handleImportArchiveRoute(archiveRequest(folders, await getDraftContentHash(db)), db))?.status).toBe(400)
      expect((await db`select id from media_folders`).rows).toHaveLength(0)
    } finally { await cleanup() }
  })

  it('strictly validates optional precondition headers', () => {
    expect(expectedDraftContentHash(new Request('http://localhost'))).toBeUndefined()
    expect(() => expectedDraftContentHash(new Request('http://localhost', { headers: { 'X-Instatic-Expected-Draft-Hash': 'bad' } }))).toThrow('invalid_draft_content_hash')
  })
})
