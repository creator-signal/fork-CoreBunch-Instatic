import type { DataTable } from '@core/data/schemas'
import type { FormControlBinding, FormValidationError } from '@core/forms/schemas'
import { parseAttachmentReference } from '@core/attachments'
import type { DbClient } from '../db/client'
import { claimAttachment, hashAttachmentToken } from './repository'

interface PreparedClaim {
  id: string
  tokenHash: string
  pageId: string
  formId: string
  fieldId: string
}

type PrepareResult =
  | {
      ok: true
      values: Record<string, unknown>
      claims: PreparedClaim[]
    }
  | { ok: false; errors: FormValidationError[] }

export function prepareAttachmentClaims(input: {
  table: DataTable
  controls: FormControlBinding[]
  values: Record<string, unknown>
  pageId: string
  formId: string
  policyMaxFiles: number
}): PrepareResult {
  const values = { ...input.values }
  const claims: PreparedClaim[] = []
  const errors: FormValidationError[] = []
  const seen = new Set<string>()
  const fieldById = new Map(input.table.fields.map((field) => [field.id, field]))

  for (const control of input.controls) {
    if (control.inputType !== 'file') continue
    const name = control.name ?? control.fieldId
    const raw = values[name]
    if (raw === undefined || raw === null || raw === '') continue
    const references = Array.isArray(raw) ? raw : [raw]
    const maxFiles = Math.min(
      input.policyMaxFiles,
      control.maxFiles && control.maxFiles > 0
        ? Math.floor(control.maxFiles)
        : input.policyMaxFiles,
    )
    if (references.length > maxFiles || (!control.multiple && references.length > 1)) {
      errors.push({
        fieldId: control.fieldId,
        code: 'too_many_attachments',
        message: `Choose no more than ${control.multiple ? maxFiles : 1} attachment${maxFiles === 1 ? '' : 's'}.`,
      })
      continue
    }
    const target = fieldById.get(control.fieldId)
    if (!target || target.type !== 'attachment') {
      errors.push({
        fieldId: control.fieldId,
        code: 'invalid_attachment_target',
        message: 'This upload must be bound to an Attachment data field.',
      })
      continue
    }
    if (!target.allowMultiple && references.length > 1) {
      errors.push({
        fieldId: control.fieldId,
        code: 'too_many_attachments',
        message: 'The target field accepts one attachment.',
      })
      continue
    }

    const ids: string[] = []
    for (const rawReference of references) {
      const parsed = parseAttachmentReference(rawReference)
      if (!parsed || seen.has(parsed.id)) {
        errors.push({
          fieldId: control.fieldId,
          code: 'invalid_attachment_reference',
          message: 'Choose a valid scanned attachment.',
        })
        continue
      }
      seen.add(parsed.id)
      ids.push(parsed.id)
      claims.push({
        id: parsed.id,
        tokenHash: hashAttachmentToken(parsed.token),
        pageId: input.pageId,
        formId: input.formId,
        fieldId: control.fieldId,
      })
    }
    values[name] = target.allowMultiple ? ids : ids[0]
  }

  return errors.length > 0
    ? { ok: false, errors }
    : { ok: true, values, claims }
}

export async function claimPreparedAttachments(
  db: DbClient,
  claims: PreparedClaim[],
  input: {
    dataRowId: string
    retentionDays: number
    now?: Date
  },
): Promise<boolean> {
  const now = input.now ?? new Date()
  const nowIso = now.toISOString()
  const retentionUntil = new Date(
    now.getTime() + input.retentionDays * 24 * 60 * 60 * 1000,
  ).toISOString()
  for (const claim of claims) {
    const claimed = await claimAttachment(db, {
      ...claim,
      dataRowId: input.dataRowId,
      retentionUntil,
      nowIso,
    })
    if (!claimed) return false
  }
  return true
}
