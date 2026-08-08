import { afterEach, describe, expect, it } from 'bun:test'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { createDbClient } from '../../../server/db'
import { pgMigrations } from '../../../server/db/migrations-pg'
import { sqliteMigrations } from '../../../server/db/migrations-sqlite'
import { runMigrations } from '../../../server/db/runMigrations'

const MIGRATION_ID = '028_creator_signal_catalogue_namespace'
const PREFIX = 'creator-signal.site.catalogue.'
const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => (
    fs.rm(directory, { recursive: true, force: true })
  )))
})

describe('Creator Signal catalogue namespace database migration', () => {
  it('migrates persisted catalogue keys without rewriting implementation IDs', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'instatic-catalogue-'))
    temporaryDirectories.push(directory)
    const { db } = createDbClient(`sqlite:${path.join(directory, 'test.db')}`)
    await runMigrations(
      db,
      sqliteMigrations.filter((migration) => migration.id !== MIGRATION_ID),
    )

    const compactPage = JSON.stringify({
      body: {
        nodes: {
          heading: {
            moduleId: 'base.heading',
            catalogueInstance: { entryId: 'base.heading', entryVersion: '1.0.0' },
            props: {
              componentId: 'base.vc.hero',
              entryId: 'base.application-data',
            },
          },
        },
      },
    })
    const spacedVersion = compactPage.replace('"entryId":"base.', '"entryId": "base.')
    const unrelatedPost = JSON.stringify({ entryId: 'base.heading' })
    const draftSchema = JSON.stringify({
      fields: [{ id: 'email', catalogueEntryId: 'base.email-input' }],
    })

    await db`
      insert into data_rows (id, table_id, cells_json, slug)
      values (${'page-1'}, ${'pages'}, ${compactPage}, ${'home'})
    `
    await db`
      insert into data_rows (id, table_id, cells_json, slug)
      values (${'post-1'}, ${'posts'}, ${unrelatedPost}, ${'post'})
    `
    await db`
      insert into data_row_versions (id, row_id, version_number, cells_json, slug)
      values (${'version-1'}, ${'page-1'}, ${1}, ${spacedVersion}, ${'home'})
    `
    await db`
      insert into form_drafts (
        id, page_id, form_id, target_table_id, recovery_token_hash,
        values_json, wizard_state_json, schema_json, schema_hash,
        schema_version, expires_at
      ) values (
        ${'draft-1'}, ${'page-1'}, ${'form-1'}, ${'pages'}, ${'hash-1'},
        ${{}}, ${{}}, ${draftSchema}, ${'schema-hash-1'}, ${1},
        ${'2099-01-01T00:00:00.000Z'}
      )
    `

    await runMigrations(
      db,
      sqliteMigrations.filter((migration) => migration.id === MIGRATION_ID),
    )

    const { rows: pageRows } = await db<{ cells_text: string }>`
      select cells_json as cells_text from data_rows where id = ${'page-1'}
    `
    const { rows: postRows } = await db<{ cells_text: string }>`
      select cells_json as cells_text from data_rows where id = ${'post-1'}
    `
    const { rows: versionRows } = await db<{ cells_text: string }>`
      select cells_json as cells_text from data_row_versions where id = ${'version-1'}
    `
    const { rows: draftRows } = await db<{ schema_text: string }>`
      select schema_json as schema_text from form_drafts where id = ${'draft-1'}
    `

    expect(pageRows[0]?.cells_text).toContain(`"entryId":"${PREFIX}heading"`)
    expect(pageRows[0]?.cells_text).toContain('"moduleId":"base.heading"')
    expect(pageRows[0]?.cells_text).toContain('"componentId":"base.vc.hero"')
    expect(pageRows[0]?.cells_text).toContain('"entryId":"base.application-data"')
    expect(versionRows[0]?.cells_text).toContain(`"entryId": "${PREFIX}heading"`)
    expect(postRows[0]?.cells_text).toBe(unrelatedPost)
    expect(draftRows[0]?.schema_text).toContain(
      `"catalogueEntryId":"${PREFIX}email-input"`,
    )
  })

  it('keeps the PostgreSQL and SQLite migration contracts aligned', () => {
    const sqlite = sqliteMigrations.find((migration) => migration.id === MIGRATION_ID)
    const postgres = pgMigrations.find((migration) => migration.id === MIGRATION_ID)
    expect(sqlite?.sql).toContain(PREFIX)
    expect(postgres?.sql).toContain(PREFIX)
    expect(sqlite?.sql).toContain("table_id in ('pages', 'components', 'layouts')")
    expect(postgres?.sql).toContain("table_id in ('pages', 'components', 'layouts')")
  })
})
