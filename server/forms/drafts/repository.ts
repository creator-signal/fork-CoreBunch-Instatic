import { createHash } from 'node:crypto'
import { placeholder, type DbClient } from '../../db/client'

export interface FormDraftRecord {
  id: string
  siteId: string
  pageId: string
  formId: string
  targetTableId: string
  ownerUserId: string | null
  recoveryTokenHash: string | null
  values: Record<string, unknown>
  wizard: Record<string, unknown>
  schema: unknown
  schemaHash: string
  schemaVersion: number
  revision: number
  createdAt: string
  updatedAt: string
  expiresAt: string
  deletedAt: string | null
}

interface FormDraftRow {
  id: string
  site_id: string
  page_id: string
  form_id: string
  target_table_id: string
  owner_user_id: string | null
  recovery_token_hash: string | null
  values_json: unknown
  wizard_state_json: unknown
  schema_json: unknown
  schema_hash: string
  schema_version: number | string
  revision: number | string
  created_at: Date | string
  updated_at: Date | string
  expires_at: Date | string
  deleted_at: Date | string | null
}

const DRAFT_COLUMNS = `
  id, site_id, page_id, form_id, target_table_id, owner_user_id,
  recovery_token_hash, values_json, wizard_state_json, schema_json,
  schema_hash, schema_version, revision, created_at, updated_at,
  expires_at, deleted_at
`

export function hashFormDraftRecoveryToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createFormDraft(
  db: DbClient,
  input: {
    id: string
    siteId: string
    pageId: string
    formId: string
    targetTableId: string
    ownerUserId: string | null
    recoveryTokenHash: string | null
    values: Record<string, unknown>
    wizard: Record<string, unknown>
    schema: unknown
    schemaHash: string
    schemaVersion: number
    expiresAt: string
  },
): Promise<FormDraftRecord> {
  await db`
    insert into form_drafts (
      id, site_id, page_id, form_id, target_table_id, owner_user_id,
      recovery_token_hash, values_json, wizard_state_json, schema_json,
      schema_hash, schema_version, expires_at
    )
    values (
      ${input.id}, ${input.siteId}, ${input.pageId}, ${input.formId},
      ${input.targetTableId}, ${input.ownerUserId}, ${input.recoveryTokenHash},
      ${JSON.stringify(input.values)}, ${JSON.stringify(input.wizard)},
      ${JSON.stringify(input.schema)}, ${input.schemaHash},
      ${input.schemaVersion}, ${input.expiresAt}
    )
  `
  const created = await getFormDraft(db, input.id)
  if (!created) throw new Error('Form draft could not be re-read')
  return created
}

export async function getFormDraft(
  db: DbClient,
  id: string,
): Promise<FormDraftRecord | null> {
  const { rows } = await db.unsafe<FormDraftRow>(
    `select ${DRAFT_COLUMNS} from form_drafts where id = ${placeholder(db.dialect, 1)}`,
    [id],
  )
  return rows[0] ? mapDraft(rows[0]) : null
}

export async function getLatestOwnedFormDraft(
  db: DbClient,
  input: {
    ownerUserId: string
    siteId: string
    pageId: string
    formId: string
    nowIso: string
  },
): Promise<FormDraftRecord | null> {
  const p = (index: number) => placeholder(db.dialect, index)
  const { rows } = await db.unsafe<FormDraftRow>(
    `select ${DRAFT_COLUMNS}
       from form_drafts
      where owner_user_id = ${p(1)}
        and site_id = ${p(2)}
        and page_id = ${p(3)}
        and form_id = ${p(4)}
        and expires_at > ${p(5)}
        and deleted_at is null
      order by updated_at desc
      limit 1`,
    [
      input.ownerUserId,
      input.siteId,
      input.pageId,
      input.formId,
      input.nowIso,
    ],
  )
  return rows[0] ? mapDraft(rows[0]) : null
}

export async function updateFormDraft(
  db: DbClient,
  input: {
    id: string
    expectedRevision: number
    values: Record<string, unknown>
    wizard: Record<string, unknown>
    schema: unknown
    schemaHash: string
    schemaVersion: number
    expiresAt: string
    updatedAt: string
  },
): Promise<FormDraftRecord | null> {
  const { rows } = await db<{ id: string }>`
    update form_drafts
       set values_json = ${JSON.stringify(input.values)},
           wizard_state_json = ${JSON.stringify(input.wizard)},
           schema_json = ${JSON.stringify(input.schema)},
           schema_hash = ${input.schemaHash},
           schema_version = ${input.schemaVersion},
           revision = revision + 1,
           updated_at = ${input.updatedAt},
           expires_at = ${input.expiresAt}
     where id = ${input.id}
       and revision = ${input.expectedRevision}
       and deleted_at is null
    returning id
  `
  return rows.length === 1 ? getFormDraft(db, input.id) : null
}

export async function deleteFormDraft(
  db: DbClient,
  id: string,
  expectedRevision?: number,
): Promise<boolean> {
  const { rows } = expectedRevision === undefined
    ? await db<{ id: string }>`
        delete from form_drafts
         where id = ${id}
        returning id
      `
    : await db<{ id: string }>`
        delete from form_drafts
         where id = ${id}
           and revision = ${expectedRevision}
        returning id
      `
  return rows.length === 1
}

export async function deleteExpiredFormDrafts(
  db: DbClient,
  nowIso = new Date().toISOString(),
): Promise<number> {
  const { rows } = await db<{ id: string }>`
    delete from form_drafts
     where expires_at <= ${nowIso}
        or deleted_at is not null
    returning id
  `
  return rows.length
}

function mapDraft(row: FormDraftRow): FormDraftRecord {
  return {
    id: row.id,
    siteId: row.site_id,
    pageId: row.page_id,
    formId: row.form_id,
    targetTableId: row.target_table_id,
    ownerUserId: row.owner_user_id,
    recoveryTokenHash: row.recovery_token_hash,
    values: jsonObject(row.values_json),
    wizard: jsonObject(row.wizard_state_json),
    schema: jsonValue(row.schema_json),
    schemaHash: row.schema_hash,
    schemaVersion: Number(row.schema_version),
    revision: Number(row.revision),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    expiresAt: iso(row.expires_at),
    deletedAt: row.deleted_at === null ? null : iso(row.deleted_at),
  }
}

function jsonValue(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function jsonObject(value: unknown): Record<string, unknown> {
  const parsed = jsonValue(value)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : {}
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value)
}
