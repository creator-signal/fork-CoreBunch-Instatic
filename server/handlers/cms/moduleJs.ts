/**
 * `/_instatic/module-js/<moduleId>.js` — per-module published-JS assets.
 *
 * Modules may return `js` from `render()` (see `RenderOutput`); the publisher
 * dedupes it per moduleId and pages reference it via
 * `<script src="/_instatic/module-js/<id>.js?v=<sha256>" defer>` tags injected
 * by `injectModuleScripts`. This endpoint serves the body from the site-wide
 * module-JS map, memoised per publish version through the same versioned
 * single-flight the hole endpoint uses. It only serves a body when `?v=`
 * matches that exact body's SHA-256 identity, so one cache key can never
 * represent two different scripts across restarts or deployments.
 *
 * The `<moduleId>` path segment is UNTRUSTED input: it is validated against
 * the namespaced-module-id grammar before any lookup, so traversal sequences
 * and junk ids are rejected with a plain 404 (public route — no error
 * envelope).
 */
import type { DbClient } from '../../db/client'
import { registry } from '@core/module-engine'
import { getLatestPublishedSiteSnapshot } from '../../repositories/publish'
import {
  buildPublishedSiteModuleJsMap,
  moduleJsContentHash,
} from '../../publish/moduleJsBundle'
import { createVersionedSingleFlight, getPublishVersion } from '../../publish/publishState'

const MODULE_JS_PATH_PREFIX = '/_instatic/module-js/'

/**
 * Namespaced module id grammar: `<namespace>.<name>[.<name>…]`, lowercase
 * alphanumerics and dashes per segment — matches the registry's id format
 * (`base.form`, `acme.hero-banner`) and the plugin namespace lock
 * (`SAFE_MODULE_NAME` in `moduleAdapter.ts`).
 */
const MODULE_JS_ID_PATTERN = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/
const SHA256_PATTERN = /^[a-f0-9]{64}$/

export function isModuleJsAssetPath(pathname: string): boolean {
  return pathname.startsWith(MODULE_JS_PATH_PREFIX)
}

interface ModuleJsHandlerContext {
  db: DbClient
}

// Version-keyed memo of the published module-JS map. Loading the snapshot +
// walking every page per request would be the same per-request cost the hole
// endpoint was flagged for — the single-flight runs the load once per publish
// version and the shared test-reset hook clears it.
const moduleJsMapCache = createVersionedSingleFlight<ReadonlyMap<string, string>>()

function loadModuleJsMapForVersion(
  db: DbClient,
  version: number,
): Promise<ReadonlyMap<string, string> | null> {
  return moduleJsMapCache.get(version, async () => {
    const snapshot = await getLatestPublishedSiteSnapshot(db)
    if (!snapshot) return null
    return buildPublishedSiteModuleJsMap(snapshot.site, registry)
  })
}

function plainResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}

/** GET `/_instatic/module-js/<moduleId>.js?v=<sha256>` → exact JS body. */
export async function handleModuleJsAssetRequest(
  req: Request,
  url: URL,
  ctx: ModuleJsHandlerContext,
): Promise<Response> {
  if (req.method !== 'GET') return plainResponse('Method not allowed', 405)

  const fileName = decodeURIComponent(url.pathname.slice(MODULE_JS_PATH_PREFIX.length))
  const moduleId = fileName.endsWith('.js') ? fileName.slice(0, -'.js'.length) : ''
  if (!moduleId || !MODULE_JS_ID_PATTERN.test(moduleId)) {
    return plainResponse('Not found', 404)
  }

  const jsMap = await loadModuleJsMapForVersion(ctx.db, getPublishVersion())
  const body = jsMap?.get(moduleId)
  if (body === undefined) return plainResponse('Not found', 404)
  const requestedHash = url.searchParams.get('v')
  if (!requestedHash || !SHA256_PATTERN.test(requestedHash)) {
    return plainResponse('Not found', 404)
  }
  if (requestedHash !== moduleJsContentHash(body)) {
    return plainResponse('Not found', 404)
  }

  return new Response(body, {
    headers: {
      'content-type': 'text/javascript; charset=utf-8',
      // Safe indefinitely because the URL is accepted only for this exact body.
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
}
