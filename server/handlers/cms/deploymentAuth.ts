import { createHash, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { DbClient } from '../../db/client'
import { createSession } from '../../auth/sessions'
import { createSessionToken, hashSessionToken } from '../../auth/tokens'
import { clientIp } from '../../auth/security'
import { findUserByEmail } from '../../repositories/users'
import { createAuditEvent } from '../../repositories/audit'
import { jsonResponse, setCookieHeader } from '../../http'
import { requestAuditContext } from './shared'
import { sessionCookie } from './session'

const DEPLOYMENT_SESSION_TTL_MS = 5 * 60_000

function deploymentToken(): string {
  const direct = process.env.INSTATIC_DEPLOYMENT_TOKEN?.trim()
  if (direct) return direct
  const path = process.env.INSTATIC_DEPLOYMENT_TOKEN_FILE?.trim()
  if (!path) throw new Error(
    'INSTATIC_DEPLOYMENT_TOKEN or INSTATIC_DEPLOYMENT_TOKEN_FILE is required',
  )
  const value = readFileSync(path, 'utf8').trim()
  if (!value) throw new Error('INSTATIC_DEPLOYMENT_TOKEN_FILE points to an empty file')
  return value
}

function suppliedBearerToken(req: Request): string | null {
  const authorization = req.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  const value = authorization.slice('Bearer '.length).trim()
  return value.length > 0 && value.length <= 1_024 ? value : null
}

function secureTokenEqual(actual: string, expected: string): boolean {
  const actualHash = createHash('sha256').update(actual).digest()
  const expectedHash = createHash('sha256').update(expected).digest()
  return timingSafeEqual(actualHash, expectedHash)
}

export async function handleDeploymentSession(
  req: Request,
  db: DbClient,
): Promise<Response> {
  let expected: string
  try {
    expected = deploymentToken()
  } catch (err) {
    console.error('[auth:deployment] Deployment token is unavailable:', err)
    return jsonResponse({ error: 'Deployment authentication is unavailable' }, { status: 503 })
  }
  const supplied = suppliedBearerToken(req)
  if (!supplied || !secureTokenEqual(supplied, expected)) {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401 })
  }

  const ownerEmail = process.env.INSTATIC_BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase()
  if (!ownerEmail) {
    return jsonResponse({ error: 'Deployment owner is not configured' }, { status: 503 })
  }
  const owner = await findUserByEmail(db, ownerEmail)
  if (!owner || owner.status !== 'active') {
    return jsonResponse({ error: 'Deployment owner is unavailable' }, { status: 503 })
  }

  const token = createSessionToken()
  const expiresAt = new Date(Date.now() + DEPLOYMENT_SESSION_TTL_MS)
  await createSession(db, {
    idHash: await hashSessionToken(token),
    userId: owner.id,
    expiresAt,
    ipAddress: clientIp(req),
    userAgent: req.headers.get('user-agent'),
    // The deployment token is an explicit high-trust machine credential. Give
    // its short-lived session step-up authority so release gates can exercise
    // guarded publish and storage operations without a human password.
    stepUpExpiresAt: expiresAt,
  })
  await createAuditEvent(db, {
    actorUserId: owner.id,
    action: 'login.success',
    targetType: 'user',
    targetId: owner.id,
    metadata: { source: 'deployment-gate', expiresAt: expiresAt.toISOString() },
    ...requestAuditContext(req),
  })
  return setCookieHeader(
    jsonResponse({ ok: true, expiresAt: expiresAt.toISOString() }),
    sessionCookie(req, token, expiresAt),
  )
}
