import { describe, expect, it } from 'bun:test'
import { collectSiteModuleAssets } from '../../../server/publish/siteModuleAssets'
import {
  buildSiteModuleJsMap,
  injectModuleScripts,
  moduleJsContentHash,
  resolvePublishedModuleJsAssets,
} from '../../../server/publish/moduleJsBundle'
import { makeModule, makePage, makeRegistry, makeSite } from '../publisher/helpers'

const registry = makeRegistry({
  'base.body': makeModule('base.body', {
    canHaveChildren: true,
    render: (_p, children) => ({ html: `<main>${children.join('')}</main>` }),
  }),
  'test.jsy': makeModule('test.jsy', {
    render: () => ({ html: '<div></div>', js: 'JS_BODY' }),
  }),
  'test.plain': makeModule('test.plain'),
})

function makeTwoPageSite() {
  const pageA = makePage({
    root: { moduleId: 'base.body', children: ['a'] },
    a: { moduleId: 'test.jsy' },
  })
  const pageB = makePage({
    root: { moduleId: 'base.body', children: ['b'] },
    b: { moduleId: 'test.jsy' },
  })
  pageB.id = 'page-2'
  pageB.slug = 'two'
  return makeSite({ pages: [pageA, pageB] })
}

const HTML_DOC = `<!doctype html>
<html>
<head>
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'none'; worker-src 'none'; style-src 'self'; img-src 'self' data:; connect-src 'self';">
</head>
<body>
<main></main>
</body>
</html>`

describe('site module-JS map', () => {
  it('walks every page and dedupes js per moduleId', () => {
    const site = makeTwoPageSite()
    const acc = collectSiteModuleAssets(site, registry)
    expect([...acc.jsMap.entries()]).toEqual([['test.jsy', 'JS_BODY']])
    const map = buildSiteModuleJsMap(site, registry)
    expect([...map.keys()]).toEqual(['test.jsy'])
  })

  it('excludes modules that emit no js', () => {
    const page = makePage({
      root: { moduleId: 'base.body', children: ['p'] },
      p: { moduleId: 'test.plain' },
    })
    const map = buildSiteModuleJsMap(makeSite({ pages: [page] }), registry)
    expect(map.size).toBe(0)
  })
})

describe('injectModuleScripts', () => {
  it('appends sorted, content-addressed, deferred script tags before </body> and relaxes CSP', () => {
    const aHash = moduleJsContentHash('A_BODY')
    const zHash = moduleJsContentHash('Z_BODY')
    const html = injectModuleScripts(HTML_DOC, [
      { id: 'z.widget', contentHash: zHash },
      { id: 'a.widget', contentHash: aHash },
    ])
    const aIdx = html.indexOf('data-instatic-module-js="a.widget"')
    const zIdx = html.indexOf('data-instatic-module-js="z.widget"')
    expect(aIdx).toBeGreaterThan(-1)
    expect(zIdx).toBeGreaterThan(aIdx)
    expect(html).toContain(`<script src="/_instatic/module-js/a.widget.js?v=${aHash}" defer data-instatic-module-js="a.widget"></script>`)
    expect(zIdx).toBeLessThan(html.indexOf('</body>'))
    expect(html).toContain("script-src 'self';")
    expect(html).not.toContain("script-src 'none';")
  })

  it('does nothing (and keeps CSP locked) for an empty id list', () => {
    const html = injectModuleScripts(HTML_DOC, [])
    expect(html).toBe(HTML_DOC)
    expect(html).toContain("script-src 'none';")
  })

  it('is idempotent', () => {
    const assets = [{ id: 'a.widget', contentHash: moduleJsContentHash('A_BODY') }]
    const once = injectModuleScripts(HTML_DOC, assets)
    const twice = injectModuleScripts(once, assets)
    expect(twice).toBe(once)
  })

  it('changes the public URL whenever a module body changes', () => {
    const first = resolvePublishedModuleJsAssets(
      ['test.jsy'],
      new Map([['test.jsy', 'FIRST_BODY']]),
    )
    const second = resolvePublishedModuleJsAssets(
      ['test.jsy'],
      new Map([['test.jsy', 'SECOND_BODY']]),
    )
    expect(first[0]?.contentHash).not.toBe(second[0]?.contentHash)
    expect(injectModuleScripts(HTML_DOC, first)).not.toBe(injectModuleScripts(HTML_DOC, second))
  })
})
