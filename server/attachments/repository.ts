import { createHash } from 'node:crypto'
import type { DbClient } from '../db/client'
import type { AttachmentRecord } from './types'

interface AttachmentRow {
  id: string
  page_id: string
  form_id: string
  field_id: string
  original_name: string
  extension: string
  mime_type: string
  size_bytes: number | string
  sha256: string
  status: AttachmentRecord['status']
  scan_status: AttachmentRecord['scanStatus']
  scan_message: string | null
  storage_adapter_id: string
  storage_path: string | null
  reference_token_hash: string
  data_row_id: string | null
  created_at: Date | string
  scanned_at: Date | string | null
  expires_at: Date | string
  claimed_at: Date | string | null
  retention_until: Date | string | null
  deleted_at: Date | string | null
}

const ATTACHMENT_COLUMNS = `
  id, page_id, form_id, field_id, original_name, extension,
  mime_type, size_bytes, sha256, status, scan_status, scan_message,
  storage_adapter_id, storage_path, reference_token_hash, data_row_id,
  created_at, scanned_at, expires_at, claimed_at, retention_until, deleted_at
`

function iso(value: Date | string | null): string | null {
  if (value === null) return null
  return value instanceof Date ? value.toISOString() : String(value)
}

function mapAttachment(row: AttachmentRow): AttachmentRecord {
  return {
    id: row.id,
    pageId: row.page_id,
    formId: row.form_id,
    fieldId: row.field_id,
    originalName: row.original_name,
    extension: row.extension,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    sha256: row.sha256,
    status: row.status,
    scanStatus: row.scan_status,
    scanMessage: row.scan_message,
    storageAdapterId: row.storage_adapter_id,
    storagePath: row.storage_path,
    referenceTokenHash: row.reference_token_hash,
    dataRowId: row.data_row_id,
    createdAt: iso(row.created_at)!,
    scannedAt: iso(row.scanned_at),
    expiresAt: iso(row.expires_at)!,
    claimedAt: iso(row.claimed_at),
    retentionUntil: iso(row.retention_until),
    deletedAt: iso(row.deleted_at),
  }
}

export function hashAttachmentToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createAttachmentRecord(
  db: DbClient,
  input: {
    id: string
    pageId: string
    formId: string
    fieldId: string
    originalName: string
    extension: string
    mimeType: string
    sizeBytes: number
    sha256: string
    storageAdapterId: string
    storagePath: string
    referenceTokenHash: string
    expiresAt: string
  },
): Promise<AttachmentRecord> {
  await db<{ id: string }>`
    insert into form_attachments (
      id, page_id, form_id, field_id, original_name, extension,
      mime_type, size_bytes, sha256, status, scan_status, storage_adapter_id,
      storage_path, reference_token_hash, expires_at
    )
    values (
      ${input.id}, ${input.pageId}, ${input.formId}, ${input.fieldId},
      ${input.originalName}, ${input.extension},
      ${input.mimeType}, ${input.sizeBytes}, ${input.sha256},
      ${'quarantined'}, ${'pending'}, ${input.storageAdapterId},
      ${input.storagePath}, ${input.referenceTokenHash}, ${input.expiresAt}
    )
    returning id
  `
  const created = await getAttachmentRecord(db, input.id)
  if (!created) throw new Error('Attachment record could not be re-read')
  return created
}

export async function getAttachmentRecord(
  db: DbClient,
  id: string,
): Promise<AttachmentRecord | null> {
  const { rows } = await db.unsafe<AttachmentRow>(
    `select ${ATTACHMENT_COLUMNS} from form_attachments where id = ${db.dialect === 'postgres' ? '$1' : '?'}`,
    [id],
  )
  return rows[0] ? mapAttachment(rows[0]) : null
}

export async function setAttachmentScanState(
  db: DbClient,
  id: string,
  input: {
    status: AttachmentRecord['status']
    scanStatus: AttachmentRecord['scanStatus']
    scanMessage?: string | null
    storagePath?: string | null
  },
): Promise<AttachmentRecord | null> {
  await db`
    update form_attachments
    set status = ${input.status},
        scan_status = ${input.scanStatus},
        scan_message = ${input.scanMessage ?? null},
        storage_path = ${input.storagePath ?? null},
        scanned_at = current_timestamp
    where id = ${id}
      and status = ${'quarantined'}
  `
  return getAttachmentRecord(db, id)
}

export async function claimAttachment(
  db: DbClient,
  input: {
    id: string
    tokenHash: string
    pageId: string
    formId: string
    fieldId: string
    dataRowId: string
    retentionUntil: string
    nowIso: string
  },
): Promise<boolean> {
  const { rows } = await db<{ id: string }>`
    update form_attachments
    set status = ${'claimed'},
        data_row_id = ${input.dataRowId},
        claimed_at = ${input.nowIso},
        retention_until = ${input.retentionUntil}
    where id = ${input.id}
      and reference_token_hash = ${input.tokenHash}
      and page_id = ${input.pageId}
      and form_id = ${input.formId}
      and field_id = ${input.fieldId}
      and status = ${'active'}
      and scan_status = ${'clean'}
      and expires_at > ${input.nowIso}
    returning id
  `
  return rows.length === 1
}

export async function getDownloadableAttachment(
  db: DbClient,
  id: string,
  nowIso: string,
): Promise<AttachmentRecord | null> {
  const attachment = await getAttachmentRecord(db, id)
  if (
    !attachment
    || attachment.status !== 'claimed'
    || attachment.scanStatus !== 'clean'
    || attachment.deletedAt
    || !attachment.dataRowId
    || !attachment.retentionUntil
    || attachment.retentionUntil <= nowIso
  ) {
    return null
  }
  const { rows } = await db<{ id: string }>`
    select id
    from data_rows
    where id = ${attachment.dataRowId}
      and deleted_at is null
  `
  return rows.length === 1 ? attachment : null
}

export async function listAttachmentsDueForDeletion(
  db: DbClient,
  nowIso: string,
  limit = 100,
): Promise<AttachmentRecord[]> {
  const temporaryExpiryPlaceholder = db.dialect === 'postgres' ? '$1' : '?'
  const retentionExpiryPlaceholder = db.dialect === 'postgres' ? '$1' : '?'
  const limitPlaceholder = db.dialect === 'postgres' ? '$2' : '?'
  const { rows } = await db.unsafe<AttachmentRow>(
    `select ${ATTACHMENT_COLUMNS}
       from form_attachments
      where deleted_at is null
        and status != 'deleted'
        and (
          (status in ('quarantined', 'active', 'rejected') and expires_at <= ${temporaryExpiryPlaceholder})
          or (status = 'claimed' and retention_until is not null and retention_until <= ${retentionExpiryPlaceholder})
        )
      order by created_at asc
      limit ${limitPlaceholder}`,
    db.dialect === 'postgres' ? [nowIso, limit] : [nowIso, nowIso, limit],
  )
  return rows.map(mapAttachment)
}

export async function markAttachmentDeleted(
  db: DbClient,
  id: string,
  nowIso: string,
): Promise<void> {
  await db`
    update form_attachments
    set status = ${'deleted'},
        storage_path = ${null},
        deleted_at = ${nowIso}
    where id = ${id}
      and status != ${'deleted'}
  `
}
