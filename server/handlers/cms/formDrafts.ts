import type { DbClient } from '../../db/client'
import { requireCapability } from '../../auth/authz'
import { jsonResponse, methodNotAllowed } from '../../http'
import { formDraftCapabilityStatus } from '../../forms/drafts/runtime'

const HEALTH_PATH = '/admin/api/cms/form-drafts/health'

export async function handleFormDraftAdminRoutes(
  req: Request,
  db: DbClient,
): Promise<Response | null> {
  const url = new URL(req.url)
  if (!url.pathname.startsWith('/admin/api/cms/form-drafts')) return null
  if (url.pathname !== HEALTH_PATH) {
    return jsonResponse({ error: 'Not found' }, { status: 404 })
  }
  if (req.method !== 'GET') return methodNotAllowed()
  const user = await requireCapability(req, db, 'site.read')
  if (user instanceof Response) return user
  return jsonResponse(formDraftCapabilityStatus(), {
    headers: { 'cache-control': 'no-store' },
  })
}
