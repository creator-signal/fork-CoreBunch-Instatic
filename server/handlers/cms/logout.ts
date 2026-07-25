import type { DbClient } from '../../db/client'
import { revokeSessionByHash } from '../../auth/sessions'
import { getSessionHash, requireAuthenticatedUser } from '../../auth/authz'
import { createAuditEvent } from '../../repositories/audit'
import { jsonResponse, setCookieHeader } from '../../http'
import { requestAuditContext } from './shared'
import { clearSessionCookie } from './session'
import { oidcLogoutUrl } from './oidc'

export async function handleLogout(req: Request, db: DbClient): Promise<Response> {
  const user = await requireAuthenticatedUser(req, db)
  const idHash = await getSessionHash(req)
  if (idHash) await revokeSessionByHash(db, idHash)
  if (!(user instanceof Response)) {
    await createAuditEvent(db, {
      actorUserId: user.id,
      action: 'logout',
      targetType: 'user',
      targetId: user.id,
      metadata: {},
      ...requestAuditContext(req),
    })
  }

  let logoutUrl: string | null = null
  try {
    logoutUrl = await oidcLogoutUrl()
  } catch (err) {
    // Local logout must still succeed if the identity provider is unavailable.
    console.error('[auth:oidc] Could not resolve the Zitadel logout URL:', err)
  }
  return setCookieHeader(
    jsonResponse(logoutUrl ? { ok: true, logoutUrl } : { ok: true }),
    clearSessionCookie(req),
  )
}
