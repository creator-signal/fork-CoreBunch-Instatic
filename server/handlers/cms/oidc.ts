import { nanoid } from 'nanoid'
import type { DbClient } from '../../db/client'
import {
  configuredAdminAuthMode,
  exchangeOidcAuthorizationCode,
  newOidcAuthorizationMaterial,
  oidcAuthorizationUrl,
  oidcEndSessionUrl,
  oidcOwnerRole,
  oidcSessionTtlSeconds,
  safeAdminReturnTo,
  signOidcState,
  verifyOidcState,
  OidcRoleRequiredError,
  type OidcIdentity,
} from '../../auth/oidc'
import { createSession } from '../../auth/sessions'
import { createSessionToken, hashPassword, hashSessionToken } from '../../auth/tokens'
import { clientIp } from '../../auth/security'
import {
  countActiveOwners,
  createUser,
  findUserByEmail,
  findUserByOidcIdentity,
  linkUserOidcIdentity,
  markUserLoggedIn,
  type AuthUser,
} from '../../repositories/users'
import { createAuditEvent } from '../../repositories/audit'
import { recordLoginAttempt } from '../../repositories/loginAttempts'
import { setCookieHeader } from '../../http'
import { requestAuditContext } from './shared'
import {
  clearOidcStateCookie,
  oidcStateCookie,
  oidcStateCookieValue,
  sessionCookie,
} from './session'

const OIDC_STATE_TTL_SECONDS = 10 * 60

function redirect(location: string, headers: HeadersInit = {}): Response {
  return new Response(null, {
    status: 302,
    headers: {
      location,
      'cache-control': 'no-store',
      ...headers,
    },
  })
}

function authenticationFailure(req: Request, status: number, message: string): Response {
  const response = new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Authentication failed</title></head><body><main><h1>Authentication failed</h1><p>${message}</p><p><a href="/admin">Try again</a></p></main></body></html>`,
    {
      status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    },
  )
  return setCookieHeader(response, clearOidcStateCookie(req))
}

async function provisionOidcUser(
  db: DbClient,
  identity: OidcIdentity,
  req: Request,
): Promise<AuthUser> {
  const linked = await findUserByOidcIdentity(db, identity.issuer, identity.subject)
  if (linked) {
    if (linked.status !== 'active') throw new Error('Zitadel user is suspended in Instatic')
    return linked
  }

  const emailUser = await findUserByEmail(db, identity.email)
  if (emailUser) {
    if (emailUser.status !== 'active') {
      throw new Error('Zitadel user is suspended in Instatic')
    }
    if (
      emailUser.oidcIssuer !== null
      && (
        emailUser.oidcIssuer !== identity.issuer
        || emailUser.oidcSubject !== identity.subject
      )
    ) {
      throw new Error('Email is already linked to another identity')
    }
    const linkedUser = await linkUserOidcIdentity(
      db,
      emailUser.id,
      identity.issuer,
      identity.subject,
    )
    if (!linkedUser) throw new Error('Could not link the Zitadel identity')
    return linkedUser
  }

  const canOwn = identity.roles.includes(oidcOwnerRole())
    && await countActiveOwners(db) === 0
  const roleId = canOwn ? 'owner' : 'admin'
  const created = await createUser(db, {
    id: nanoid(),
    email: identity.email,
    displayName: identity.displayName,
    passwordHash: await hashPassword(createSessionToken()),
    roleId,
    allowOwnerRole: canOwn,
  })
  const linkedUser = await linkUserOidcIdentity(
    db,
    created.id,
    identity.issuer,
    identity.subject,
  )
  if (!linkedUser) throw new Error('Could not link the new Zitadel identity')
  await createAuditEvent(db, {
    actorUserId: linkedUser.id,
    action: 'user.create',
    targetType: 'user',
    targetId: linkedUser.id,
    metadata: { roleId, source: 'zitadel' },
    ...requestAuditContext(req),
  })
  return linkedUser
}

export async function handleOidcLogin(req: Request, _db: DbClient): Promise<Response> {
  if (configuredAdminAuthMode() !== 'zitadel') {
    return new Response('Not found', { status: 404 })
  }
  try {
    const material = newOidcAuthorizationMaterial()
    const returnTo = safeAdminReturnTo(new URL(req.url).searchParams.get('returnTo'))
    const stateCookie = signOidcState({
      state: material.state,
      verifier: material.verifier,
      nonce: material.nonce,
      returnTo,
    })
    const response = redirect((await oidcAuthorizationUrl(material)).toString())
    return setCookieHeader(
      response,
      oidcStateCookie(req, stateCookie, OIDC_STATE_TTL_SECONDS),
    )
  } catch (err) {
    console.error('[auth:oidc] Failed to initialize Zitadel login:', err)
    return authenticationFailure(req, 503, 'Zitadel login is not configured or unavailable.')
  }
}

export async function handleOidcCallback(req: Request, db: DbClient): Promise<Response> {
  if (configuredAdminAuthMode() !== 'zitadel') {
    return new Response('Not found', { status: 404 })
  }
  const url = new URL(req.url)
  if (url.searchParams.has('error')) {
    return authenticationFailure(req, 401, 'Zitadel rejected the sign-in request.')
  }
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const stateCookie = oidcStateCookieValue(req)
  if (!code || !state || !stateCookie) {
    return authenticationFailure(req, 400, 'The Zitadel callback was incomplete.')
  }
  const stored = verifyOidcState(stateCookie, state)
  if (!stored) {
    return authenticationFailure(req, 400, 'The Zitadel sign-in state was invalid or expired.')
  }

  let identity: OidcIdentity
  try {
    identity = await exchangeOidcAuthorizationCode(
      code,
      stored.verifier,
      stored.nonce,
    )
  } catch (err) {
    const forbidden = err instanceof OidcRoleRequiredError
    console.error('[auth:oidc] Zitadel callback failed:', err)
    return authenticationFailure(
      req,
      forbidden ? 403 : 502,
      forbidden
        ? 'Your Zitadel account does not have permission to use this editor.'
        : 'Zitadel could not complete the sign-in.',
    )
  }

  try {
    const user = await db.transaction(async (tx) => provisionOidcUser(tx, identity, req))
    const token = createSessionToken()
    const idHash = await hashSessionToken(token)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + oidcSessionTtlSeconds() * 1_000)
    await createSession(db, {
      idHash,
      userId: user.id,
      expiresAt,
      ipAddress: clientIp(req),
      userAgent: req.headers.get('user-agent'),
      mfaPassedAt: now,
      // Zitadel owns re-authentication in this mode. Keep the step-up window
      // aligned with the deliberately short OIDC-backed Instatic session so
      // sensitive CMS operations never fall back to a dormant local password.
      stepUpExpiresAt: expiresAt,
    })
    await markUserLoggedIn(db, user.id)
    await recordLoginAttempt(db, {
      emailNorm: identity.email,
      ipAddress: clientIp(req),
      userAgent: req.headers.get('user-agent'),
      userId: user.id,
      result: 'success',
    })
    await createAuditEvent(db, {
      actorUserId: user.id,
      action: 'login.success',
      targetType: 'user',
      targetId: user.id,
      metadata: {
        source: 'zitadel',
        issuer: identity.issuer,
        subject: identity.subject,
      },
      ...requestAuditContext(req),
    })
    let response = redirect(safeAdminReturnTo(stored.returnTo))
    response = setCookieHeader(response, sessionCookie(req, token, expiresAt))
    response = setCookieHeader(response, clearOidcStateCookie(req))
    return response
  } catch (err) {
    console.error('[auth:oidc] Failed to create the Instatic session:', err)
    return authenticationFailure(req, 500, 'Instatic could not create your editor session.')
  }
}

export async function oidcLogoutUrl(): Promise<string | null> {
  if (configuredAdminAuthMode() !== 'zitadel') return null
  return (await oidcEndSessionUrl()).toString()
}
