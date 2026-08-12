/**
 * Frontend-injection CSP relaxation — gates the four tiers the publisher
 * applies to a page's `script-src` and `worker-src` directives when one or
 * more plugins contribute `frontend.assets[]` tags:
 *
 *   1. No frontend assets at all              → CSP unchanged (script-src 'none')
 *   2. Only external `<script src=…>`         → script-src 'self'      + worker-src relaxed
 *   3. Only inline `<script>…</script>`       → script-src 'self' 'unsafe-inline' + worker-src relaxed
 *   4. Mix of external and inline             → script-src 'self' 'unsafe-inline' + worker-src relaxed
 *
 * The bug this test fleet locks in: case 2 (external-only) previously failed
 * to relax `script-src`, leaving it at `'none'` so the browser blocked the
 * tag the publisher had just injected. Every analytics / observability /
 * tracker plugin with a single external script hit this.
 */
import { describe, it, expect } from 'bun:test'
import {
  injectFrontendAssets,
  renderFrontendAsset,
  type FrontendInjections,
} from '../../../server/publish/frontendInjections'

const PAGE_WITH_CSP_META = `<!doctype html>
<html>
<head>
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'none'; worker-src 'none'; style-src 'self'; img-src 'self' data:; connect-src 'self';">
</head>
<body></body>
</html>`

function emptyPlan(): FrontendInjections {
  return {
    tags: { head: [], 'head-end': [], 'body-start': [], 'body-end': [] },
    hasInlineScript: false,
    hasExternalScript: false,
    hasInlineStyle: false,
    networkAllowedHosts: [],
    publicConnectOrigins: [],
    mediaCspOrigins: [],
  }
}

describe('frontend injection — CSP relaxation', () => {
  it('resolves package-relative link hrefs without stripping favicon attributes', () => {
    const resolved = renderFrontendAsset(
      {
        kind: 'link',
        attrs: {
          rel: 'icon',
          type: 'image/png',
          sizes: '192x192',
          href: 'assets/icons/favicon.png',
        },
      },
      {
        manifest: {
          id: 'acme.brand',
          assetBasePath: '/uploads/plugins/acme.brand/1.0.0',
        },
      },
    )

    expect(resolved).toEqual({
      html: '<link rel="icon" type="image/png" sizes="192x192" href="/uploads/plugins/acme.brand/1.0.0/assets/icons/favicon.png" data-plugin-id="acme.brand">',
      placement: 'head-end',
    })
  })

  it('rejects a traversing package-relative link href', () => {
    const resolved = renderFrontendAsset(
      {
        kind: 'link',
        attrs: {
          rel: 'icon',
          href: '../favicon.png',
        },
      },
      {
        manifest: {
          id: 'acme.brand',
          assetBasePath: '/uploads/plugins/acme.brand/1.0.0',
        },
      },
    )

    expect(resolved).toBeNull()
  })

  it('keeps script-src `none` when no plugin contributes a tag', () => {
    const out = injectFrontendAssets(PAGE_WITH_CSP_META, emptyPlan())
    expect(out).toContain("script-src 'none'")
    expect(out).toContain("worker-src 'none'")
  })

  it('relaxes script-src to `self` for external-only scripts (regression: tracker plugins)', () => {
    const plan = emptyPlan()
    plan.hasExternalScript = true
    plan.tags['body-end'] = [`<script src="/uploads/plugins/acme.analytics/1.0.0/frontend/tracker.js" defer></script>`]
    const out = injectFrontendAssets(PAGE_WITH_CSP_META, plan)
    expect(out).toContain("script-src 'self';")
    // NOT 'unsafe-inline' — the plan is external-only
    expect(out).not.toContain("script-src 'self' 'unsafe-inline'")
    // worker-src relaxed too, in case the plugin script spawns a worker
    expect(out).toContain("worker-src 'self' blob:;")
  })

  it('preserves module-declared provider origins when plugin scripts are injected', () => {
    const page = PAGE_WITH_CSP_META.replace(
      "script-src 'none'",
      "script-src https://marketing.creatorsignal.me",
    )
    const plan = emptyPlan()
    plan.hasExternalScript = true
    plan.tags['body-end'] = [`<script src="/uploads/plugins/acme.analytics/1.0.0/frontend/tracker.js" defer></script>`]

    const out = injectFrontendAssets(page, plan)

    expect(out).toContain("script-src 'self' https://marketing.creatorsignal.me;")
  })

  it('relaxes script-src to `self` + `unsafe-inline` for inline scripts', () => {
    const plan = emptyPlan()
    plan.hasInlineScript = true
    plan.tags['body-end'] = [`<script>console.log('hi')</script>`]
    const out = injectFrontendAssets(PAGE_WITH_CSP_META, plan)
    expect(out).toContain("script-src 'self' 'unsafe-inline';")
    expect(out).toContain("worker-src 'self' blob:;")
  })

  it('relaxes script-src to `self` + `unsafe-inline` for mixed external + inline plans', () => {
    const plan = emptyPlan()
    plan.hasExternalScript = true
    plan.hasInlineScript = true
    plan.tags.head = [`<script>window.X=1</script>`]
    plan.tags['body-end'] = [`<script src="/uploads/plugins/x/1.0.0/frontend/t.js"></script>`]
    const out = injectFrontendAssets(PAGE_WITH_CSP_META, plan)
    expect(out).toContain("script-src 'self' 'unsafe-inline';")
    expect(out).toContain("worker-src 'self' blob:;")
  })

  it('preserves an HTTP media origin with its explicit port', () => {
    const plan = emptyPlan()
    plan.mediaCspOrigins = [
      { directive: 'img-src', origin: 'http://localhost:48141' },
      { directive: 'media-src', origin: 'http://localhost:48141' },
    ]
    const out = injectFrontendAssets(PAGE_WITH_CSP_META, plan)
    expect(out).toContain("img-src 'self' data: http://localhost:48141;")
    expect(out).toContain("media-src 'self' http://localhost:48141;")
    expect(out).not.toContain('https://http://')
  })

  it('adds operator-approved browser origins without changing plugin network hosts', () => {
    const plan = emptyPlan()
    plan.hasExternalScript = true
    plan.tags['body-end'] = ['<script src="/uploads/plugins/acme.analytics/tracker.js"></script>']
    plan.publicConnectOrigins = [
      'http://localhost:48201',
      'http://localhost:48211',
      'http://localhost:48220',
    ]

    const out = injectFrontendAssets(PAGE_WITH_CSP_META, plan)

    expect(out).toContain(
      "connect-src 'self' http://localhost:48201 http://localhost:48211 http://localhost:48220;",
    )
    expect(plan.networkAllowedHosts).toEqual([])
  })
})
