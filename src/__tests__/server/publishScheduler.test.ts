import { afterEach, describe, expect, it } from 'bun:test'
import type { DbClient } from '../../../server/db'
import { tickPublishScheduler } from '../../../server/publish/publishScheduler'
import { getDataRow, listDuePublishSchedules } from '../../../server/repositories/data/rows'
import type { TestDb } from '../helpers/createTestDb'
import { createSqliteClient } from '../../../server/db/sqlite'
import { sqliteMigrations } from '../../../server/db/migrations-sqlite'
import { runMigrations } from '../../../server/db/runMigrations'
import { makePage, makeSite } from '../publisher/helpers'
import { pageToCells } from '@core/data/pageFromRow'
import { saveDraftSite } from '../../../server/repositories/site'
import { createUser } from '../../../server/repositories/users'
import { createDataRow } from '../../../server/repositories/data'
import { publishDraftSite } from '../../../server/publish/publishSite'

async function seedScheduledPageRow(
  db: DbClient,
  input: { rowId: string; slug: string; scheduledAt: string },
): Promise<void> {
  // An individual page publishes against an already published site shell.
  // Use real page cells, rather than a metadata-only row with no page tree.
  const { rows } = await db<{ id: string }>`select id from roles limit 1`
  const user = await createUser(db, { email: 'scheduler@example.test', displayName: 'Synthetic publisher', passwordHash: 'not-a-login', roleId: rows[0].id, allowOwnerRole: true })
  await saveDraftSite(db, makeSite())
  const home = { ...makePage({ root: { moduleId: 'base.body' } }), id: 'published-home', slug: 'index' }
  await createDataRow(db, { id: home.id, tableId: 'pages', slug: home.slug, cells: pageToCells(home) }, user.id)
  await publishDraftSite(db, user.id)
  const scheduled = { ...home, id: input.rowId, slug: input.slug, title: 'Scheduled page' }
  await db`
    insert into data_rows (id, table_id, cells_json, slug, status, scheduled_publish_at)
    values (
      ${input.rowId},
      ${'pages'},
      ${pageToCells(scheduled)},
      ${input.slug},
      ${'scheduled'},
      ${input.scheduledAt}
    )
  `
}

describe('publish scheduler', () => {
  const cleanupFns: Array<() => Promise<void>> = []

  afterEach(async () => {
    while (cleanupFns.length) await cleanupFns.pop()?.()
  })

  async function makeDb(): Promise<TestDb> {
    const db = createSqliteClient(':memory:')
    await runMigrations(db, sqliteMigrations)
    const testDb = { db, cleanup: async () => { await db.close?.() } }
    cleanupFns.push(testDb.cleanup)
    return testDb
  }

  it('publishes due scheduled page rows as system publishes (PUBLISH-002)', async () => {
    const { db } = await makeDb()
    const rowId = 'scheduled-page-row'
    const scheduledAt = new Date(Date.now() - 60_000).toISOString()
    await seedScheduledPageRow(db, {
      rowId,
      slug: 'scheduled-page',
      scheduledAt,
    })

    await expect(listDuePublishSchedules(db, new Date().toISOString(), 25)).resolves.toHaveLength(1)

    await tickPublishScheduler(db)

    const row = await getDataRow(db, rowId)
    expect(row).toMatchObject({
      id: rowId,
      tableId: 'pages',
      slug: 'scheduled-page',
      status: 'published',
      publishedByUserId: null,
      updatedByUserId: null,
      scheduledPublishAt: scheduledAt,
    })
    expect(row?.publishedAt).toBeString()
    await expect(listDuePublishSchedules(db, new Date().toISOString(), 25)).resolves.toHaveLength(0)

    const { rows: dataRows } = await db<{ active_version_id: string | null }>`
      select active_version_id
      from data_rows
      where id = ${rowId}
    `
    expect(dataRows[0]?.active_version_id).toBeString()

    const { rows: versions } = await db<{ row_id: string; slug: string; published_by_user_id: string | null }>`
      select row_id, slug, published_by_user_id
      from data_row_versions
      where row_id = ${rowId}
    `
    expect(versions).toEqual([
      {
        row_id: rowId,
        slug: 'scheduled-page',
        published_by_user_id: null,
      },
    ])
  })
})
