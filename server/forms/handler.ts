import type { DbClient } from '../db/client'
import type { Static, TSchema } from '@sinclair/typebox'
import { nanoid } from 'nanoid'
import { Type } from '@core/utils/typeboxHelpers'
import { toArrayBuffer } from '../binary'
import { clientIp, originAllowed } from '../auth/security'
import {
  RequestBodyTooLargeError,
  badRequest,
  jsonResponse,
  methodNotAllowed,
  payloadTooLarge,
  readBodyBytesWithLimit,
  readValidatedBody,
} from '../http'
import { createDataRow, getDataTable } from '../repositories/data'
import { getLatestPublishedSiteSnapshot } from '../repositories/publish'
import {
  PublicFormChallengeBodySchema,
  PublicFormSubmitBodySchema,
  derivePageFormSnapshots,
  isFormSubmissionTargetTable,
  validateFormSubmission,
  type PublishedFormSnapshot,
} from '@core/forms'
import {
  issuePublicFormChallenge,
  verifyPublicFormPageToken,
  verifyAndConsumePublicFormChallenge,
} from './challenge'
import {
  publicFormChallengePerFormRateLimit,
  publicFormChallengePerIpRateLimit,
  publicAttachmentPerFormRateLimit,
  publicAttachmentPerIpRateLimit,
  publicFormPerFormRateLimit,
  publicFormPerIpRateLimit,
} from './rateLimit'
import {
  claimPreparedAttachments,
  prepareAttachmentClaims,
} from '../attachments/forms'
import { getAttachmentRuntime } from '../attachments/runtime'
import {
  retryAttachmentScan,
  uploadAndScanAttachment,
} from '../attachments/service'

type PublicFormRoute = 'challenge' | 'submit' | 'attachment-upload' | 'attachment-scan'

const PUBLIC_FORM_CHALLENGE_MAX_BODY_BYTES = 8 * 1024
const PUBLIC_FORM_SUBMIT_MAX_BODY_BYTES = 1024 * 1024
const PUBLIC_ATTACHMENT_MULTIPART_OVERHEAD_BYTES = 64 * 1024

const PublicAttachmentRetryBodySchema = Type.Object({
  pageId: Type.String({ minLength: 1 }),
  formId: Type.String({ minLength: 1 }),
  pageToken: Type.String({ minLength: 1 }),
  fieldId: Type.String({ minLength: 1 }),
  uploadId: Type.String({ minLength: 1 }),
  retryToken: Type.String({ minLength: 1 }),
})

export async function handlePublicFormRequest(
  req: Request,
  db: DbClient,
  url: URL,
): Promise<Response | null> {
  const route = publicFormRoute(url.pathname)
  if (!route) return null
  if (req.method !== 'POST') return methodNotAllowed()
  if (!publicFormOriginAllowed(req)) {
    return jsonResponse({ error: 'Form submissions must come from this site.' }, { status: 403 })
  }
  if (route === 'challenge') return handleChallenge(req, db)
  if (route === 'attachment-upload') return handleAttachmentUpload(req, db)
  if (route === 'attachment-scan') return handleAttachmentScan(req, db)
  return handleSubmit(req, db)
}

async function handleChallenge(req: Request, db: DbClient): Promise<Response> {
  const parsed = await readPublicFormBody(
    req,
    PublicFormChallengeBodySchema,
    PUBLIC_FORM_CHALLENGE_MAX_BODY_BYTES,
    'Invalid form challenge payload',
  )
  if (parsed instanceof Response) return parsed
  const body = parsed

  const ipKey = clientIp(req) ?? 'unknown'
  const ipDecision = publicFormChallengePerIpRateLimit.consume(ipKey)
  if (!ipDecision.ok) return rateLimited(ipDecision.retryAfterMs)
  const formDecision = publicFormChallengePerFormRateLimit.consume(`${ipKey}|${body.formId}`)
  if (!formDecision.ok) return rateLimited(formDecision.retryAfterMs)

  const context = await findPublishedFormContext(db, body.pageId, body.formId)
  if (!context) return jsonResponse({ error: 'Form not found' }, { status: 404 })
  if (!verifyPublicFormPageToken(body)) {
    return jsonResponse({ error: 'Invalid form page token' }, { status: 403 })
  }
  const challenge = issuePublicFormChallenge({
    pageId: context.form.pageId,
    formId: context.form.formId,
  })
  return jsonResponse({
    token: challenge.token,
    challenge: challenge.challenge,
    expiresAt: new Date(challenge.expiresAt).toISOString(),
  })
}

async function handleSubmit(req: Request, db: DbClient): Promise<Response> {
  const parsed = await readPublicFormBody(
    req,
    PublicFormSubmitBodySchema,
    PUBLIC_FORM_SUBMIT_MAX_BODY_BYTES,
    'Invalid form submission payload',
  )
  if (parsed instanceof Response) return parsed
  const body = parsed

  const ipKey = clientIp(req) ?? 'unknown'
  const ipDecision = publicFormPerIpRateLimit.consume(ipKey)
  if (!ipDecision.ok) return rateLimited(ipDecision.retryAfterMs)
  const formDecision = publicFormPerFormRateLimit.consume(`${ipKey}|${body.formId}`)
  if (!formDecision.ok) return rateLimited(formDecision.retryAfterMs)

  const challenge = verifyAndConsumePublicFormChallenge({
    pageId: body.pageId,
    formId: body.formId,
    challenge: body.challenge,
    token: body.token,
  })
  if (!challenge) return badRequest('Invalid or expired form challenge')

  const context = await findPublishedFormContext(db, body.pageId, body.formId)
  if (!context) return jsonResponse({ error: 'Form not found' }, { status: 404 })
  const snapshot = context.form

  const elapsedMs = Date.now() - challenge.issuedAt
  if (snapshot.minSubmitSeconds > 0 && elapsedMs < snapshot.minSubmitSeconds * 1000) {
    return badRequest('Form submitted too quickly')
  }

  const values = { ...body.values }
  const honeypotValue = values[snapshot.honeypotName]
  delete values[snapshot.honeypotName]
  if (honeypotValue !== undefined && String(honeypotValue).trim() !== '') {
    return badRequest('Invalid form submission')
  }

  const table = await getDataTable(db, snapshot.targetTableId)
  if (!table || !isFormSubmissionTargetTable(table)) {
    return jsonResponse({ error: 'Form target not found' }, { status: 404 })
  }

  const runtime = getAttachmentRuntime()
  const prepared = prepareAttachmentClaims({
    table,
    controls: snapshot.controls,
    values,
    siteId: context.siteId,
    pageId: snapshot.pageId,
    formId: snapshot.formId,
    policyMaxFiles: runtime?.policy.maxFiles ?? 1,
  })
  if (!prepared.ok) {
    return jsonResponse({ error: 'Invalid form values', errors: prepared.errors }, { status: 400 })
  }
  if (prepared.claims.length > 0 && !runtime?.policy.enabled) {
    return jsonResponse(
      { error: 'Private file attachments are unavailable.' },
      { status: 503 },
    )
  }

  const validation = validateFormSubmission({
    table,
    controls: snapshot.controls,
    values: prepared.values,
  })
  if (!validation.ok) {
    return jsonResponse({ error: 'Invalid form values', errors: validation.errors }, { status: 400 })
  }

  const rowId = nanoid()
  let row
  try {
    row = await db.transaction(async (tx) => {
      const created = await createDataRow(tx, {
        id: rowId,
        tableId: table.id,
        cells: validation.cells,
        slug: '',
      })
      const claimed = await claimPreparedAttachments(tx, prepared.claims, {
        dataRowId: rowId,
        retentionDays: runtime?.policy.retentionDays ?? 1,
      })
      if (!claimed) throw new AttachmentClaimError()
      return created
    })
  } catch (err) {
    if (err instanceof AttachmentClaimError) {
      return jsonResponse(
        {
          error: 'One or more attachments are unavailable, expired or already submitted.',
          errors: [{
            fieldId: '*',
            code: 'attachment_claim_failed',
            message: 'Upload the affected file again and retry.',
          }],
        },
        { status: 409 },
      )
    }
    throw err
  }
  return jsonResponse({ ok: true, rowId: row.id })
}

class AttachmentClaimError extends Error {}

async function handleAttachmentUpload(req: Request, db: DbClient): Promise<Response> {
  const runtime = getAttachmentRuntime()
  if (!runtime?.policy.enabled) {
    return jsonResponse(
      { error: 'Private file attachments are unavailable.', code: 'attachments_unavailable' },
      { status: 503 },
    )
  }
  let formData: FormData
  try {
    const bytes = await readBodyBytesWithLimit(
      req,
      runtime.policy.maxFileBytes + PUBLIC_ATTACHMENT_MULTIPART_OVERHEAD_BYTES,
    )
    formData = await new Request(req.url, {
      method: 'POST',
      headers: req.headers,
      body: toArrayBuffer(bytes),
    }).formData()
  } catch (err) {
    if (err instanceof RequestBodyTooLargeError) {
      return payloadTooLarge('Attachment upload is too large.')
    }
    return badRequest('Invalid attachment upload')
  }
  const pageId = formString(formData, 'pageId')
  const formId = formString(formData, 'formId')
  const pageToken = formString(formData, 'pageToken')
  const fieldId = formString(formData, 'fieldId')
  const file = formData.get('file')
  if (!pageId || !formId || !pageToken || !fieldId || !(file instanceof File)) {
    return badRequest('Invalid attachment upload')
  }

  const ipKey = clientIp(req) ?? 'unknown'
  const ipDecision = publicAttachmentPerIpRateLimit.consume(ipKey)
  if (!ipDecision.ok) return rateLimited(ipDecision.retryAfterMs)
  const formDecision = publicAttachmentPerFormRateLimit.consume(`${ipKey}|${formId}`)
  if (!formDecision.ok) return rateLimited(formDecision.retryAfterMs)

  if (!verifyPublicFormPageToken({ pageId, formId, pageToken })) {
    return jsonResponse({ error: 'Invalid form page token' }, { status: 403 })
  }
  const context = await findPublishedFormContext(db, pageId, formId)
  const control = context?.form.controls.find(
    (candidate) => candidate.fieldId === fieldId && candidate.inputType === 'file',
  )
  if (!context || !control) {
    return jsonResponse({ error: 'File attachment field not found' }, { status: 404 })
  }

  const result = await uploadAndScanAttachment(db, {
    file,
    siteId: context.siteId,
    pageId,
    formId,
    fieldId,
    authoredMaxBytes: control.maxFileBytes,
    authoredAccept: control.accept,
  })
  if (!result.ok) {
    return jsonResponse(
      {
        error: result.message,
        code: result.code,
        ...(result.retry ? { retry: result.retry } : {}),
      },
      { status: result.status, headers: { 'cache-control': 'no-store' } },
    )
  }
  return jsonResponse(
    { ok: true, attachment: result.attachment },
    { status: 201, headers: { 'cache-control': 'no-store' } },
  )
}

async function handleAttachmentScan(req: Request, db: DbClient): Promise<Response> {
  const runtime = getAttachmentRuntime()
  const parsed = await readPublicFormBody(
    req,
    PublicAttachmentRetryBodySchema,
    PUBLIC_FORM_CHALLENGE_MAX_BODY_BYTES,
    'Invalid attachment scan retry',
  )
  if (parsed instanceof Response) return parsed
  if (!runtime?.policy.enabled) {
    return jsonResponse(
      { error: 'Private file attachments are unavailable.', code: 'attachments_unavailable' },
      { status: 503 },
    )
  }
  const ipKey = clientIp(req) ?? 'unknown'
  const ipDecision = publicAttachmentPerIpRateLimit.consume(ipKey)
  if (!ipDecision.ok) return rateLimited(ipDecision.retryAfterMs)
  const formDecision = publicAttachmentPerFormRateLimit.consume(`${ipKey}|${parsed.formId}`)
  if (!formDecision.ok) return rateLimited(formDecision.retryAfterMs)
  if (!verifyPublicFormPageToken(parsed)) {
    return jsonResponse({ error: 'Invalid form page token' }, { status: 403 })
  }
  const context = await findPublishedFormContext(db, parsed.pageId, parsed.formId)
  const control = context?.form.controls.find(
    (candidate) =>
      candidate.fieldId === parsed.fieldId && candidate.inputType === 'file',
  )
  if (!context || !control) {
    return jsonResponse({ error: 'File attachment field not found' }, { status: 404 })
  }
  const result = await retryAttachmentScan(db, {
    uploadId: parsed.uploadId,
    retryToken: parsed.retryToken,
    siteId: context.siteId,
    pageId: parsed.pageId,
    formId: parsed.formId,
    fieldId: parsed.fieldId,
  })
  if (!result.ok) {
    return jsonResponse(
      {
        error: result.message,
        code: result.code,
        ...(result.retry ? { retry: result.retry } : {}),
      },
      { status: result.status, headers: { 'cache-control': 'no-store' } },
    )
  }
  return jsonResponse(
    { ok: true, attachment: result.attachment },
    { headers: { 'cache-control': 'no-store' } },
  )
}

async function readPublicFormBody<T extends TSchema>(
  req: Request,
  schema: T,
  maxBytes: number,
  invalidMessage: string,
): Promise<Static<T> | Response> {
  try {
    const body = await readValidatedBody(req, schema, { maxBytes })
    return body ?? badRequest(invalidMessage)
  } catch (err) {
    if (err instanceof RequestBodyTooLargeError) {
      return payloadTooLarge('Form payload is too large.')
    }
    throw err
  }
}

async function findPublishedFormContext(
  db: DbClient,
  pageId: string,
  formId: string,
): Promise<{ siteId: string; form: PublishedFormSnapshot } | null> {
  const snapshot = await getLatestPublishedSiteSnapshot(db)
  const page = snapshot?.site.pages.find((candidate) => candidate.id === pageId)
  if (!snapshot || !page) return null
  const form = derivePageFormSnapshots(page).find(
    (candidate) => candidate.formId === formId,
  )
  return form ? { siteId: snapshot.site.id, form } : null
}

function publicFormRoute(pathname: string): PublicFormRoute | null {
  if (pathname === '/_instatic/form/challenge') return 'challenge'
  if (pathname === '/_instatic/form/submit') return 'submit'
  if (pathname === '/_instatic/form/attachment/upload') return 'attachment-upload'
  if (pathname === '/_instatic/form/attachment/scan') return 'attachment-scan'
  if (pathname.startsWith('/_instatic/form/')) return 'submit'
  return null
}

function formString(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

function publicFormOriginAllowed(req: Request): boolean {
  // Public form posts always come from a browser, so a missing Origin is
  // rejected here (stricter than the admin check, which tolerates curl/SSR).
  if (!req.headers.get('origin')) return false
  // Same CSRF origin check as the admin/AI handlers — honours the full
  // configured public-origin allowlist (platform + custom domain).
  if (!originAllowed(req)) return false
  const fetchSite = req.headers.get('sec-fetch-site')
  return !fetchSite || fetchSite === 'same-origin' || fetchSite === 'none'
}

function rateLimited(retryAfterMs: number): Response {
  return jsonResponse(
    { error: 'Too many form submissions. Try again later.' },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
    },
  )
}
