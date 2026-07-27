import type { Static, TSchema } from '@sinclair/typebox'
import {
  PublicFormDraftDeleteBodySchema,
  PublicFormDraftLoadBodySchema,
  PublicFormDraftSaveBodySchema,
  derivePageFormSnapshots,
  type PublishedFormSnapshot,
} from '@core/forms'
import type { DbClient } from '../../db/client'
import { optionalAuthenticatedUser } from '../../auth/authz'
import { clientIp } from '../../auth/security'
import {
  RequestBodyTooLargeError,
  badRequest,
  jsonResponse,
  payloadTooLarge,
  readValidatedBody,
} from '../../http'
import { getLatestPublishedSiteSnapshot } from '../../repositories/publish'
import { verifyPublicFormPageToken } from '../challenge'
import {
  publicFormDraftPerFormRateLimit,
  publicFormDraftPerIpRateLimit,
} from '../rateLimit'
import {
  loadFormDraft,
  removeFormDraft,
  saveFormDraft,
} from './service'

export type PublicFormDraftRoute = 'draft-load' | 'draft-save' | 'draft-delete'

const PUBLIC_FORM_DRAFT_MAX_BODY_BYTES = 512 * 1024

export async function handlePublicFormDraftRequest(
  req: Request,
  db: DbClient,
  route: PublicFormDraftRoute,
): Promise<Response> {
  const schema = route === 'draft-save'
    ? PublicFormDraftSaveBodySchema
    : route === 'draft-delete'
      ? PublicFormDraftDeleteBodySchema
      : PublicFormDraftLoadBodySchema
  const parsed = await readDraftBody(
    req,
    schema,
    'Invalid form draft payload',
  )
  if (parsed instanceof Response) return parsed

  const ipKey = clientIp(req) ?? 'unknown'
  const ipDecision = publicFormDraftPerIpRateLimit.consume(ipKey)
  if (!ipDecision.ok) return rateLimited(ipDecision.retryAfterMs)
  const formDecision = publicFormDraftPerFormRateLimit.consume(
    `${ipKey}|${parsed.formId}`,
  )
  if (!formDecision.ok) return rateLimited(formDecision.retryAfterMs)
  if (!verifyPublicFormPageToken(parsed)) {
    return jsonResponse({ error: 'Invalid form page token' }, { status: 403 })
  }
  const context = await findPublishedFormContext(db, parsed.pageId, parsed.formId)
  if (!context) return jsonResponse({ error: 'Form not found' }, { status: 404 })
  const user = await optionalAuthenticatedUser(req, db)
  if (user instanceof Response) return user
  const identity = {
    user,
    ...(parsed.draftId ? { draftId: parsed.draftId } : {}),
    ...(parsed.recoveryToken ? { recoveryToken: parsed.recoveryToken } : {}),
  }
  let result
  if (route === 'draft-save') {
    if (!('values' in parsed) || !('wizard' in parsed)) {
      return badRequest('Invalid form draft payload')
    }
    result = await saveFormDraft(db, {
      identity,
      siteId: context.siteId,
      snapshot: context.form,
      ...('revision' in parsed && parsed.revision !== undefined
        ? { revision: parsed.revision }
        : {}),
      values: parsed.values,
      wizard: parsed.wizard,
    })
  } else if (route === 'draft-delete') {
    if (!('revision' in parsed) || typeof parsed.revision !== 'number') {
      return badRequest('Invalid form draft payload')
    }
    result = await removeFormDraft(db, {
      identity,
      siteId: context.siteId,
      snapshot: context.form,
      revision: parsed.revision,
    })
  } else {
    result = await loadFormDraft(db, {
      identity,
      siteId: context.siteId,
      snapshot: context.form,
    })
  }
  if (!result.ok) {
    return jsonResponse(
      {
        error: result.message,
        code: result.code,
        ...(result.revision !== undefined ? { revision: result.revision } : {}),
      },
      {
        status: result.status,
        headers: { 'cache-control': 'no-store' },
      },
    )
  }
  return jsonResponse(result, {
    headers: { 'cache-control': 'private, no-store' },
  })
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

async function readDraftBody<T extends TSchema>(
  req: Request,
  schema: T,
  invalidMessage: string,
): Promise<Static<T> | Response> {
  try {
    const body = await readValidatedBody(req, schema, {
      maxBytes: PUBLIC_FORM_DRAFT_MAX_BODY_BYTES,
    })
    return body ?? badRequest(invalidMessage)
  } catch (err) {
    if (err instanceof RequestBodyTooLargeError) {
      return payloadTooLarge('Form draft payload is too large.')
    }
    throw err
  }
}

function rateLimited(retryAfterMs: number): Response {
  return jsonResponse(
    { error: 'Too many form draft requests. Try again later.' },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
    },
  )
}
