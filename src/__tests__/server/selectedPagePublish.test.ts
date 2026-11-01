import { expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createSqliteClient } from '../../../server/db/sqlite'
import { sqliteMigrations } from '../../../server/db/migrations-sqlite'
import { runMigrations } from '../../../server/db/runMigrations'
import { makePage, makeSite } from '../publisher/helpers'
import { saveDraftSite } from '../../../server/repositories/site'
import { createUser } from '../../../server/repositories/users'
import { createDataRow, getDataRow, saveDataRowDraft } from '../../../server/repositories/data'
import { getPublishedPageBySlug } from '../../../server/repositories/publish'
import { persistDataRowPublish } from '../../../server/repositories/data/publish'
import { publishDraftSite } from '../../../server/publish/publishSite'
import { publishDataRow } from '../../../server/publish/publishRow'
import { readArtefact } from '../../../server/publish/staticArtefact'
import { renderPublishedSnapshot } from '../../../server/publish/publicRenderer'
import { pageToCells } from '@core/data/pageFromRow'

function page(id: string, text: string) {
  return { ...makePage({ root: { moduleId: 'base.body', children: ['text'] }, text: { moduleId: 'base.text', props: { text } } }), id, slug: id, title: id }
}

for (const repairHistoricalVersion of [false, true]) test(`selected page publishes its snapshot and HTML without publishing neighbours; repair=${repairHistoricalVersion}`, async () => {
  const db = createSqliteClient(':memory:')
  await runMigrations(db, sqliteMigrations)
  const activeVersion = async (id: string) => (await db<{ active_version_id: string }>`select active_version_id from data_rows where id = ${id}`).rows[0].active_version_id
  const uploads = await mkdtemp(join(tmpdir(), 'selected-page-'))
  try {
    const { rows } = await db<{ id: string }>`select id from roles limit 1`
    const user = await createUser(db, { email: 'publisher@example.test', displayName: 'Synthetic publisher', passwordHash: 'not-a-login', roleId: rows[0].id, allowOwnerRole: true })
    await saveDraftSite(db, makeSite())
    for (const id of ['notice', 'neighbour']) await createDataRow(db, { id, tableId: 'pages', slug: id, cells: pageToCells(page(id, `Published ${id}`)) }, user.id)
    await publishDraftSite(db, user.id, uploads)
    const oldNeighbourVersion = await activeVersion('neighbour')
    await saveDraftSite(db, makeSite({ name: 'PRIVATE DRAFT SITE SHELL' }))
    await saveDataRowDraft(db, 'neighbour', { cells: pageToCells(page('neighbour', 'PRIVATE UNREVIEWED DRAFT')), slug: 'neighbour' }, user.id)
    await saveDataRowDraft(db, 'notice', { cells: pageToCells(page('notice', 'Approved diagnostics consent and withdrawal')), slug: 'notice' }, user.id)
    if (repairHistoricalVersion) await persistDataRowPublish(db, 'notice', user.id)
    const result = await publishDataRow(db, 'notice', user.id, uploads)
    expect(await activeVersion('notice')).toBe(result.version.id)
    const published = await getPublishedPageBySlug(db, 'notice')
    expect(published).not.toBeNull()
    expect(published?.site.name).toBe('Test SiteDocument')
    const rendered = await renderPublishedSnapshot(published!, { db, url: new URL('https://example.test/notice') })
    expect(rendered.html).toContain('Approved diagnostics consent and withdrawal')
    expect(rendered.html).not.toContain('PRIVATE UNREVIEWED DRAFT')
    expect(await readArtefact(uploads, '/notice')).toContain('Approved diagnostics consent and withdrawal')
    expect(await readArtefact(uploads, '/neighbour')).toContain('Published neighbour')
    expect(await activeVersion('neighbour')).toBe(oldNeighbourVersion)
    expect((await getDataRow(db, 'neighbour'))?.cells).toEqual(pageToCells(page('neighbour', 'PRIVATE UNREVIEWED DRAFT')))
    // System/scheduler publication uses the same path and preserves history.
    const repeated = await publishDataRow(db, 'notice', null, uploads)
    expect(repeated.version.versionNumber).toBe(result.version.versionNumber + 1)
    expect(repeated.version.publishedByUserId).toBeNull()
  } finally {
    await db.close?.()
    await rm(uploads, { recursive: true, force: true })
  }
})
