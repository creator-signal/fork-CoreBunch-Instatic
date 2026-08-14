import { describe, expect, it } from 'bun:test'
import { createSqliteClient } from '../../../server/db/sqlite'
import { pgMigrations } from '../../../server/db/migrations-pg'
import { sqliteMigrations } from '../../../server/db/migrations-sqlite'
import { runMigrations } from '../../../server/db/runMigrations'

const MIGRATION_ID = '029_page_seo_metadata'
describe('page SEO metadata database migration', () => {
  it('adds the complete SEO cell to an existing pages system table once', async () => {
    const db = createSqliteClient(':memory:')
    await runMigrations(db, sqliteMigrations.filter((migration) => migration.id !== MIGRATION_ID))

    await runMigrations(db, sqliteMigrations.filter((migration) => migration.id === MIGRATION_ID))
    const { rows } = await db<{ fields_json: Array<{ id: string; type: string }> }>`
      select fields_json from data_tables where id = 'pages'
    `

    expect(rows[0].fields_json.filter((field) => field.id === 'seo')).toEqual([
      { type: 'longText', id: 'seo', label: 'SEO metadata', builtIn: true },
    ])
  })

  it('keeps PostgreSQL and SQLite migration IDs aligned', () => {
    expect(sqliteMigrations.some((migration) => migration.id === MIGRATION_ID)).toBe(true)
    expect(pgMigrations.some((migration) => migration.id === MIGRATION_ID)).toBe(true)
  })
})
