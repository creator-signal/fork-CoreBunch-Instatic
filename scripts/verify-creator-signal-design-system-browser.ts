import { strict as assert } from 'node:assert'
import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { creatorSignalBrandAssets, creatorSignalPluginVersion } from '../integrations/creator-signal/design-system/contract'
import { creatorSignalSiteCss } from '../integrations/creator-signal/modules/mautic-form'
import {
  callToAction,
  comparisonSection,
  featureGrid,
  recoveryState,
  siteFooter,
  siteHeader,
} from '../integrations/creator-signal/modules/site-components'

const repositoryRoot = resolve(import.meta.dir, '..')
const pluginDist = resolve(repositoryRoot, 'integrations/creator-signal/dist')
const outputDirectory = resolve(repositoryRoot, '.tmp/creator-signal-design-system-browser')
const pluginAssetPrefix = `/uploads/plugins/creator-signal.site/${creatorSignalPluginVersion}`
const requestedPort = Number.parseInt(process.env.CREATOR_SIGNAL_BROWSER_PORT ?? '0', 10)

const header = siteHeader.render(siteHeader.defaults, []).html
const features = featureGrid.render(featureGrid.defaults, []).html
const comparison = comparisonSection.render(comparisonSection.defaults, []).html
const cta = callToAction.render(callToAction.defaults, []).html
const recovery = recoveryState.render({
  ...recoveryState.defaults,
  state: 'offline',
  heading: 'This page is unavailable offline',
  body: 'Reconnect to the internet, then return to the Creator Signal home page.',
  actionLabel: 'Return home',
  actionUrl: '/',
}, []).html
const footer = siteFooter.render(siteFooter.defaults, []).html

const documentFixture = (main: string, title: string) => `<!doctype html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <script src="${pluginAssetPrefix}/frontend/theme-bootstrap.js"></script>
  <style>${creatorSignalSiteCss}</style>
</head>
<body>
  ${header}
  ${main}
  ${footer}
  <script type="module" src="${pluginAssetPrefix}/frontend/theme-control.js"></script>
</body>
</html>`

const catalogueFixture = documentFixture(`
  <main id="main-content">
    <section class="hero-section">
      <div class="hero-copy">
        <p class="eyebrow">Creator Signal</p>
        <h1>Turn creative business data into a clearer next move.</h1>
        <p class="hero-body">A local browser fixture using the same plain HTML, assets and CSS shipped by the plugin.</p>
        <div class="actions"><a class="button button-primary" href="#features">Explore the system</a></div>
      </div>
      <div class="hero-art"><img src="${creatorSignalBrandAssets.creatorSignalSocial}" alt="" width="1200" height="630"></div>
    </section>
    ${features}
    ${comparison}
    ${cta}
  </main>`, 'Creator Signal Design System acceptance')

const recoveryFixture = documentFixture(`
  <main id="main-content">
    ${recovery}
  </main>`, 'Creator Signal recovery-pattern acceptance')

function contentType(path: string): string | undefined {
  if (path.endsWith('.js')) return 'text/javascript; charset=utf-8'
  if (path.endsWith('.css')) return 'text/css; charset=utf-8'
  if (path.endsWith('.svg')) return 'image/svg+xml'
  if (path.endsWith('.json') || path.endsWith('.webmanifest')) return 'application/json; charset=utf-8'
  if (path.endsWith('.woff2')) return 'font/woff2'
  if (path.endsWith('.png')) return 'image/png'
  if (path.endsWith('.ico')) return 'image/x-icon'
  return undefined
}

const server = Bun.serve({
  port: Number.isSafeInteger(requestedPort) && requestedPort > 0 ? requestedPort : 0,
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname === '/' || url.pathname === '/recovery') {
      return new Response(url.pathname === '/recovery' ? recoveryFixture : catalogueFixture, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      })
    }
    if (url.pathname.startsWith(`${pluginAssetPrefix}/`)) {
      const relativePath = url.pathname.slice(pluginAssetPrefix.length + 1)
      if (relativePath.split('/').includes('..')) return new Response('Not found', { status: 404 })
      const file = Bun.file(join(pluginDist, relativePath))
      if (!(await file.exists())) return new Response('Not found', { status: 404 })
      const type = contentType(relativePath)
      return new Response(file, type ? { headers: { 'content-type': type } } : undefined)
    }
    return new Response('Not found', { status: 404 })
  },
})

await mkdir(outputDirectory, { recursive: true })

if (Bun.argv.includes('--serve')) {
  console.log(`Creator Signal browser fixture: http://127.0.0.1:${server.port}/`)
  await new Promise(() => {})
} else {
  const browserExecutablePath = process.env.CREATOR_SIGNAL_BROWSER_EXECUTABLE_PATH?.trim()
  const browser = await chromium.launch({
    headless: true,
    timeout: 30_000,
    ...(browserExecutablePath ? { executablePath: browserExecutablePath } : {}),
  })
  try {
    const context = await browser.newContext({
      colorScheme: 'dark',
      viewport: { width: 1440, height: 1000 },
    })
    const page = await context.newPage()
    await page.goto(`http://127.0.0.1:${server.port}/`, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)

    assert.equal(await page.locator('html').getAttribute('data-cs-theme-preference'), 'system')
    assert.equal(await page.locator('html').getAttribute('data-cs-theme'), 'dark')
    assert.equal(await page.getByLabel('Appearance').inputValue(), 'system')

    const fonts = await page.evaluate(() => ({
      body: getComputedStyle(document.body).fontFamily,
      heading: getComputedStyle(document.querySelector('h1')!).fontFamily,
      eyebrow: getComputedStyle(document.querySelector('.eyebrow')!).fontFamily,
    }))
    assert.match(fonts.body, /Mulish Variable/)
    assert.match(fonts.heading, /Fredoka Variable/)
    assert.match(fonts.eyebrow, /Caveat Variable/)

    const comparisonTable = page.getByRole('table', { name: 'Creator Signal option comparison' })
    await assert.doesNotReject(comparisonTable.waitFor())
    assert.equal(await comparisonTable.getByRole('columnheader').allTextContents(), [
      'Criteria',
      'First option',
      'Second option',
      'Third option',
    ])
    assert.equal(await comparisonTable.getByRole('rowheader').allTextContents(), ['Primary use', 'Availability'])

    await page.screenshot({ path: join(outputDirectory, 'desktop-system-dark.png'), fullPage: true })
    await page.getByLabel('Appearance').selectOption('light')
    assert.equal(await page.locator('html').getAttribute('data-cs-theme'), 'light')
    assert.equal(await page.evaluate(() => localStorage.getItem('creator-signal.theme.v1')), 'light')
    await page.reload({ waitUntil: 'networkidle' })
    assert.equal(await page.locator('html').getAttribute('data-cs-theme'), 'light')
    await page.screenshot({ path: join(outputDirectory, 'desktop-light.png'), fullPage: true })

    await page.getByLabel('Appearance').selectOption('system')
    assert.equal(await page.evaluate(() => localStorage.getItem('creator-signal.theme.v1')), null)
    assert.equal(await page.locator('html').getAttribute('data-cs-theme'), 'dark')

    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: join(outputDirectory, 'mobile-system-dark.png'), fullPage: true })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false)

    await page.goto(`http://127.0.0.1:${server.port}/recovery`, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    assert.equal(await page.locator('[data-recovery-state]').getAttribute('data-recovery-state'), 'offline')
    await assert.doesNotReject(page.getByText('Connection unavailable', { exact: true }).waitFor())
    await assert.doesNotReject(page.getByRole('heading', { level: 1, name: 'This page is unavailable offline' }).waitFor())
    assert.equal(await page.getByRole('link', { name: 'Return home' }).getAttribute('href'), '/')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false)
    await page.screenshot({ path: join(outputDirectory, 'mobile-offline-state.png'), fullPage: true })
    await context.close()
  } finally {
    await browser.close()
    server.stop(true)
  }

  console.log(`Creator Signal browser acceptance passed. Evidence: ${outputDirectory}`)
}
