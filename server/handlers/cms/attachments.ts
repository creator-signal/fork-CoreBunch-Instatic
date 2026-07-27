import type { DbClient } from '../../db/client'
import { requireAnyCapability, requireCapability } from '../../auth/authz'
import { binaryResponse } from '../../binary'
import { jsonResponse, methodNotAllowed } from '../../http'
import { getDraftSite } from '../../repositories/site'
import {
  getAttachmentRecord,
  getDownloadableAttachment,
  markAttachmentDeleted,
} from '../../attachments/repository'
import {
  attachmentCapabilityStatus,
  getAttachmentRuntime,
} from '../../attachments/runtime'

const PREFIX = '/admin/api/cms/attachments'

export async function handleAttachmentAdminRoutes(
  req: Request,
  db: DbClient,
): Promise<Response | null> {
  const url = new URL(req.url)
  if (!url.pathname.startsWith(PREFIX)) return null

  if (url.pathname === `${PREFIX}/health`) {
    if (req.method !== 'GET') return methodNotAllowed()
    const user = await requireCapability(req, db, 'site.read')
    if (user instanceof Response) return user
    return jsonResponse(await attachmentCapabilityStatus(), {
      headers: { 'cache-control': 'no-store' },
    })
  }

  const match = url.pathname.match(
    /^\/admin\/api\/cms\/attachments\/([A-Za-z0-9_-]+)(?:\/download)?$/,
  )
  if (!match) return jsonResponse({ error: 'Not found' }, { status: 404 })
  const id = match[1]
  const isDownload = url.pathname.endsWith('/download')

  if (isDownload) {
    if (req.method !== 'GET') return methodNotAllowed()
    const user = await requireAnyCapability(req, db, [
      'data.custom.tables.read',
      'data.custom.tables.manage',
      'content.manage',
    ])
    if (user instanceof Response) return user
    const site = await getDraftSite(db)
    const attachment = await getDownloadableAttachment(
      db,
      id,
      new Date().toISOString(),
    )
    if (!site || !attachment || attachment.siteId !== site.id || !attachment.storagePath) {
      return jsonResponse({ error: 'Attachment not found' }, { status: 404 })
    }
    const runtime = getAttachmentRuntime()
    if (!runtime || runtime.storage.id !== attachment.storageAdapterId) {
      return jsonResponse(
        { error: 'Attachment storage adapter is unavailable.' },
        { status: 503 },
      )
    }
    const bytes = await runtime.storage.read(attachment.storagePath)
    return binaryResponse(bytes, {
      headers: {
        'content-type': attachment.mimeType,
        'content-length': String(bytes.byteLength),
        'content-disposition': contentDisposition(attachment.originalName),
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff',
        'content-security-policy': 'sandbox',
      },
    })
  }

  if (req.method !== 'DELETE') return methodNotAllowed()
  const user = await requireCapability(req, db, 'data.custom.tables.manage')
  if (user instanceof Response) return user
  const [site, attachment] = await Promise.all([
    getDraftSite(db),
    getAttachmentRecord(db, id),
  ])
  if (!site || !attachment || attachment.siteId !== site.id || attachment.deletedAt) {
    return jsonResponse({ error: 'Attachment not found' }, { status: 404 })
  }
  const runtime = getAttachmentRuntime()
  if (
    attachment.storagePath
    && (!runtime || runtime.storage.id !== attachment.storageAdapterId)
  ) {
    return jsonResponse(
      { error: 'Attachment storage adapter is unavailable.' },
      { status: 503 },
    )
  }
  if (attachment.storagePath && runtime) {
    await runtime.storage.delete(attachment.storagePath)
  }
  await markAttachmentDeleted(db, attachment.id, new Date().toISOString())
  return new Response(null, { status: 204 })
}

function contentDisposition(filename: string): string {
  const ascii = filename
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\]/g, '_')
    .slice(0, 180)
  return `attachment; filename="${ascii || 'attachment'}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

