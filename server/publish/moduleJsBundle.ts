/**
 * Published module-JS channel — server-side builder + injector.
 *
 * `render()` may return `js` next to `html`/`css` (see `RenderOutput`). The
 * publisher dedupes it per moduleId into `RenderAccumulators.jsMap`; this file
 * owns the site-wide map and the page-level `<script>` injection:
 *
 * - `buildSiteModuleJsMap` rebuilds the map from scratch (preview, tests).
 * - `buildPublishedSiteModuleJsMap` memoises it by publishVersion + site
 *   object — the same pattern (and the same invalidation via
 *   `bumpPublishVersion()` / `registerVersionedCacheReset`) as
 *   `buildPublishedSiteCssBundle` in `siteCssBundle.ts`.
 * - `resolvePublishedModuleJsAssets` binds each page moduleId to the SHA-256
 *   identity of the exact body that will be served.
 * - `injectModuleScripts` is the post-render pipeline step: appends one
 *   `<script src="/_instatic/module-js/<id>.js?v=<sha256>" defer>` tag per
 *   asset (sorted for determinism) before `</body>` and relaxes the page CSP
 *   `script-src` to `'self'` iff at least one tag was injected.
 *
 * The matching asset route lives in `server/handlers/cms/moduleJs.ts`.
 */
import type { SiteDocument } from '@core/page-tree'
import type { IModuleRegistry } from '@core/module-engine'
import { addCspSources, escapeHtml, rewriteCspMeta } from '@core/publisher'
import { createHash } from 'node:crypto'
import { collectSiteModuleAssets } from './siteModuleAssets'
import { getPublishVersion, registerVersionedCacheReset } from './publishState'

/** Build the moduleId → JS map fresh. Use for draft/preview/arbitrary sites. */
export function buildSiteModuleJsMap(
  site: SiteDocument,
  registry: IModuleRegistry,
): ReadonlyMap<string, string> {
  return collectSiteModuleAssets(site, registry).jsMap
}

// Memo keyed by publish version + site object, mirroring the page-invariant
// CSS bundle memo. A bump invalidates it; the shared test-reset hook clears it.
let moduleJsCache: {
  version: number
  site: SiteDocument
  map: ReadonlyMap<string, string>
} | null = null
registerVersionedCacheReset(() => {
  moduleJsCache = null
})

/**
 * Published-render variant: memoised per publishVersion + site object so the
 * O(all-pages) walk runs once per published snapshot, not once per render.
 * Safe ONLY for the published-snapshot render path (same caveat as
 * `buildPublishedSiteCssBundle`).
 */
export function buildPublishedSiteModuleJsMap(
  site: SiteDocument,
  registry: IModuleRegistry,
): ReadonlyMap<string, string> {
  const version = getPublishVersion()
  if (moduleJsCache && moduleJsCache.version === version && moduleJsCache.site === site) {
    return moduleJsCache.map
  }
  const map = buildSiteModuleJsMap(site, registry)
  moduleJsCache = { version, site, map }
  return map
}

export interface PublishedModuleJsAsset {
  id: string
  contentHash: string
}

/** Stable content identity used by both HTML injection and the asset route. */
export function moduleJsContentHash(body: string): string {
  return createHash('sha256').update(body).digest('hex')
}

/**
 * Intersect page candidates with the published map and bind each surviving
 * module to the exact body hash its URL must request.
 */
export function resolvePublishedModuleJsAssets(
  jsModuleIds: readonly string[],
  moduleJsMap: ReadonlyMap<string, string>,
): PublishedModuleJsAsset[] {
  return [...new Set(jsModuleIds)]
    .sort()
    .flatMap((id) => {
      const body = moduleJsMap.get(id)
      return body === undefined ? [] : [{ id, contentHash: moduleJsContentHash(body) }]
    })
}

/**
 * Append the page's module-JS `<script>` tags before `</body>` and relax the
 * CSP `script-src` to `'self'` iff at least one tag was injected.
 *
 * Assets are resolved against the site module-JS map by the renderer, so every
 * emitted URL identifies the exact body it expects. Sorted + de-duplicated here
 * for deterministic output; idempotent under repeated pipeline passes.
 */
export function injectModuleScripts(
  html: string,
  assets: readonly PublishedModuleJsAsset[],
): string {
  if (assets.length === 0 || html.includes('data-instatic-module-js=')) return html
  const uniqueAssets = [...new Map(assets.map((asset) => [asset.id, asset])).values()]
    .sort((left, right) => left.id.localeCompare(right.id))
  const tags = uniqueAssets
    .map(
      ({ id, contentHash }) =>
        `<script src="/_instatic/module-js/${encodeURIComponent(id)}.js?v=${contentHash}" defer data-instatic-module-js="${escapeHtml(id)}"></script>`,
    )
    .join('\n')
  const withScripts = html.includes('</body>')
    ? html.replace('</body>', `${tags}\n</body>`)
    : `${html}\n${tags}`
  // External same-origin scripts only need `script-src 'self'` — merged as
  // data so ordering stays deterministic next to plugin/media relaxations.
  return rewriteCspMeta(withScripts, (csp) => addCspSources(csp, 'script-src', ["'self'"]))
}
