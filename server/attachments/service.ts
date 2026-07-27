import { basename } from 'node:path'
import { nanoid } from 'nanoid'
import { formatAttachmentReference, type AttachmentUploadResult } from '@core/attachments'
import type { DbClient } from '../db/client'
import {
  createAttachmentRecord,
  getAttachmentRecord,
  hashAttachmentToken,
  listAttachmentsDueForDeletion,
  markAttachmentDeleted,
  setAttachmentScanState,
} from './repository'
import { getAttachmentRuntime } from './runtime'
import type { AttachmentRecord, AttachmentRuntime } from './types'
import { validateAttachmentFile } from './validation'

export type AttachmentOperationResult =
  | { ok: true; attachment: AttachmentUploadResult }
  | {
      ok: false
      status: number
      code: string
      message: string
      retry?: { uploadId: string; retryToken: string }
    }

function safeOriginalName(value: string): string {
  // eslint-disable-next-line no-control-regex -- strip ASCII control bytes from an untrusted upload name.
  const name = basename(value.replace(/\\/g, '/')).replace(/[\u0000-\u001f\u007f]/g, '')
  return (name || 'attachment').slice(0, 255)
}

function expiresAt(now: Date, ttlSeconds: number): string {
  return new Date(now.getTime() + ttlSeconds * 1000).toISOString()
}

export async function uploadAndScanAttachment(
  db: DbClient,
  input: {
    file: File
    siteId: string
    pageId: string
    formId: string
    fieldId: string
    authoredMaxBytes?: number
    authoredAccept?: string
    now?: Date
  },
): Promise<AttachmentOperationResult> {
  const runtime = getAttachmentRuntime()
  if (!runtime?.policy.enabled) {
    return {
      ok: false,
      status: 503,
      code: 'attachments_unavailable',
      message: 'Private file attachments are not available.',
    }
  }
  const storageHealth = await runtime.storage.health()
  if (storageHealth.health === 'unavailable') {
    return {
      ok: false,
      status: 503,
      code: 'storage_unavailable',
      message: storageHealth.message ?? 'Private attachment storage is unavailable.',
    }
  }

  const validated = await validateAttachmentFile(
    input.file,
    runtime.policy,
    input.authoredMaxBytes,
    input.authoredAccept,
  )
  if (!validated.ok) {
    return {
      ok: false,
      status: 400,
      code: validated.code,
      message: validated.message,
    }
  }

  const id = nanoid()
  const token = nanoid(32)
  const storagePath = await runtime.storage.putQuarantined({
    siteId: input.siteId,
    attachmentId: id,
    extension: validated.extension,
    bytes: validated.bytes,
  })
  const now = input.now ?? new Date()

  try {
    const record = await createAttachmentRecord(db, {
      id,
      siteId: input.siteId,
      pageId: input.pageId,
      formId: input.formId,
      fieldId: input.fieldId,
      originalName: safeOriginalName(input.file.name),
      extension: validated.extension,
      mimeType: validated.mimeType,
      sizeBytes: validated.bytes.byteLength,
      sha256: validated.sha256,
      storageAdapterId: runtime.storage.id,
      storagePath,
      referenceTokenHash: hashAttachmentToken(token),
      expiresAt: expiresAt(now, runtime.policy.temporaryTtlSeconds),
    })
    return scanQuarantinedAttachment(db, runtime, record, token, validated.bytes)
  } catch (err) {
    await runtime.storage.delete(storagePath).catch(() => {})
    throw err
  }
}

export async function retryAttachmentScan(
  db: DbClient,
  input: {
    uploadId: string
    retryToken: string
    siteId: string
    pageId: string
    formId: string
    fieldId: string
    now?: Date
  },
): Promise<AttachmentOperationResult> {
  const runtime = getAttachmentRuntime()
  if (!runtime?.policy.enabled) {
    return {
      ok: false,
      status: 503,
      code: 'attachments_unavailable',
      message: 'Private file attachments are not available.',
    }
  }
  const record = await getAttachmentRecord(db, input.uploadId)
  const nowIso = (input.now ?? new Date()).toISOString()
  if (
    !record
    || record.referenceTokenHash !== hashAttachmentToken(input.retryToken)
    || record.siteId !== input.siteId
    || record.pageId !== input.pageId
    || record.formId !== input.formId
    || record.fieldId !== input.fieldId
    || record.status !== 'quarantined'
    || !record.storagePath
    || record.expiresAt <= nowIso
  ) {
    return {
      ok: false,
      status: 404,
      code: 'attachment_not_found',
      message: 'The quarantined attachment is unavailable or expired.',
    }
  }
  const bytes = await runtime.storage.read(record.storagePath)
  return scanQuarantinedAttachment(
    db,
    runtime,
    record,
    input.retryToken,
    bytes,
  )
}

async function scanQuarantinedAttachment(
  db: DbClient,
  runtime: AttachmentRuntime,
  record: AttachmentRecord,
  token: string,
  bytes: Uint8Array,
): Promise<AttachmentOperationResult> {
  const scan = await runtime.scanner.scan({
    bytes,
    filename: record.originalName,
    mimeType: record.mimeType,
    sha256: record.sha256,
  })

  if (scan.status === 'clean') {
    if (!record.storagePath) throw new Error('Quarantined attachment has no storage path')
    try {
      const activePath = await runtime.storage.activate(record.storagePath)
      await setAttachmentScanState(db, record.id, {
        status: 'active',
        scanStatus: 'clean',
        storagePath: activePath,
      })
      return {
        ok: true,
        attachment: {
          id: record.id,
          name: record.originalName,
          mimeType: record.mimeType,
          sizeBytes: record.sizeBytes,
          reference: formatAttachmentReference(record.id, token),
        },
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await setAttachmentScanState(db, record.id, {
        status: 'quarantined',
        scanStatus: 'error',
        scanMessage: message,
        storagePath: record.storagePath,
      })
      return {
        ok: false,
        status: 503,
        code: 'activation_failed',
        message: 'The file was scanned but private storage could not activate it.',
        retry: { uploadId: record.id, retryToken: token },
      }
    }
  }

  if (scan.status === 'rejected') {
    if (record.storagePath) {
      await runtime.storage.delete(record.storagePath).catch(() => {})
    }
    await setAttachmentScanState(db, record.id, {
      status: 'rejected',
      scanStatus: 'rejected',
      scanMessage: scan.reason,
      storagePath: null,
    })
    return {
      ok: false,
      status: 422,
      code: 'malware_rejected',
      message: 'The malware scanner rejected this file.',
    }
  }

  await setAttachmentScanState(db, record.id, {
    status: 'quarantined',
    scanStatus: scan.status,
    scanMessage: scan.reason,
    storagePath: record.storagePath,
  })
  return {
    ok: false,
    status: 503,
    code: scan.status === 'unavailable' ? 'scanner_unavailable' : 'scanner_error',
    message: 'The file remains quarantined because scanning is unavailable.',
    retry: { uploadId: record.id, retryToken: token },
  }
}

export async function sweepExpiredAttachments(
  db: DbClient,
  now = new Date(),
  limit = 100,
): Promise<{ deleted: number; failed: number }> {
  const runtime = getAttachmentRuntime()
  if (!runtime) return { deleted: 0, failed: 0 }
  const due = await listAttachmentsDueForDeletion(db, now.toISOString(), limit)
  let deleted = 0
  let failed = 0
  for (const attachment of due) {
    try {
      if (attachment.storagePath) {
        if (attachment.storageAdapterId !== runtime.storage.id) {
          throw new Error(
            `Attachment storage adapter "${attachment.storageAdapterId}" is unavailable.`,
          )
        }
        await runtime.storage.delete(attachment.storagePath)
      }
      await markAttachmentDeleted(db, attachment.id, now.toISOString())
      deleted += 1
    } catch (err) {
      failed += 1
      console.error(`[attachments] Cleanup failed for "${attachment.id}":`, err)
    }
  }
  return { deleted, failed }
}
