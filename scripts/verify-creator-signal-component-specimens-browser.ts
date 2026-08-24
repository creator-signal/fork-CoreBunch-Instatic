import { strict as assert } from 'node:assert'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join, resolve } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import {
  chromium,
  type Browser,
  type Page,
} from '@playwright/test'
import {
  buildCreatorSignalComponentSpecimens,
  type CreatorSignalComponentSpecimenEntry,
} from './lib/creator-signal-component-specimens'
import { moduleJsContentHash } from '../server/publish/moduleJsBundle'
import { creatorSignalPluginVersion } from '../integrations/creator-signal/design-system/contract'

type CheckResult = {
  entryId: string
  scenario: string
  pass: boolean
  detail?: unknown
  error?: string
}

const repositoryRoot = process.cwd()
const pluginDist = resolve(repositoryRoot, 'integrations/creator-signal/dist')
const outputDirectory = resolve(repositoryRoot, '.tmp/creator-signal-component-specimens')
const screenshotDirectory = resolve(outputDirectory, 'actual')
const pluginAssetPrefix = `/uploads/plugins/creator-signal.site/${creatorSignalPluginVersion}`
const requestedPort = Number.parseInt(
  process.env.CREATOR_SIGNAL_SPECIMEN_PORT ?? '0',
  10,
)
const requestedHost =
  process.env.CREATOR_SIGNAL_SPECIMEN_HOST?.trim() || '127.0.0.1'

for (const asset of [
  'frontend/theme-bootstrap.js',
  'frontend/theme-control.js',
  'frontend/analytics.js',
]) {
  if (!(await fileExists(resolve(pluginDist, asset)))) {
    throw new Error(
      `Creator Signal plugin dist is missing ${asset}; build the plugin before specimen browser acceptance.`,
    )
  }
}

const rendered = await buildCreatorSignalComponentSpecimens()
const specimenById = new Map(
  rendered.bundle.entries.map((entry) => [entry.id, entry]),
)
const htmlById = new Map(
  rendered.bundle.entries.map((entry) => [
    entry.id,
    rendered.htmlByReference.get(entry.htmlReference)!,
  ]),
)
const moduleJsByPath = rendered.moduleJsByPath

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${requestedHost}`)
    if (url.pathname.startsWith('/__specimen/')) {
      let entryId: string
      try {
        entryId = decodeURIComponent(url.pathname.slice('/__specimen/'.length))
      } catch {
        response.writeHead(404).end('Not found')
        return
      }
      const html = htmlById.get(entryId)
      if (!html) {
        response.writeHead(404).end('Not found')
        return
      }
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      response.end(html)
      return
    }
    if (url.pathname.startsWith(`${pluginAssetPrefix}/`)) {
      const relativePath = url.pathname.slice(pluginAssetPrefix.length + 1)
      if (relativePath.split('/').includes('..')) {
        response.writeHead(404).end('Not found')
        return
      }
      const path = join(pluginDist, relativePath)
      if (!(await fileExists(path))) {
        response.writeHead(404).end('Not found')
        return
      }
      const type = contentType(relativePath)
      response.writeHead(200, type ? { 'content-type': type } : undefined)
      response.end(await readFile(path))
      return
    }
    if (url.pathname.startsWith('/_instatic/module-js/')) {
      const body = moduleJsByPath.get(url.pathname)
      if (!body || url.searchParams.get('v') !== moduleJsContentHash(body)) {
        response.writeHead(404).end('Not found')
        return
      }
      response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' })
      response.end(body)
      return
    }
    if (url.pathname === '/admin/api/cms/plugins/creator-signal.site/runtime/config') {
      response.writeHead(503, { 'content-type': 'application/json; charset=utf-8' })
      response.end(JSON.stringify({ error: 'specimen_config_unavailable' }))
      return
    }
    response.writeHead(404).end('Not found')
  } catch (error) {
    console.error('[creator-signal-specimens] Local server request failed:', error)
    response.writeHead(500).end('Internal error')
  }
})

await new Promise<void>((resolveListen, rejectListen) => {
  server.once('error', rejectListen)
  server.listen(
    Number.isSafeInteger(requestedPort) && requestedPort > 0 ? requestedPort : 0,
    requestedHost,
    () => resolveListen(),
  )
})
const serverAddress = server.address()
if (!serverAddress || typeof serverAddress === 'string') {
  throw new Error('Creator Signal specimen server did not expose a TCP address.')
}
const baseUrl = `http://127.0.0.1:${serverAddress.port}`
const checks: CheckResult[] = []
const browser = await launchBrowser()
await mkdir(screenshotDirectory, { recursive: true })

try {
  await runViewportMatrix(browser)
  await runThemeMatrix(browser)
  await runAccessibilityMatrix(browser)
  await runReducedMotionMatrix(browser)
  await runForcedColorsMatrix(browser)
  await runImageUnavailableMatrix(browser)
  await runInteractionMatrix(browser)
} finally {
  await browser.close()
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close((error) => error ? rejectClose(error) : resolveClose())
  })
}

const report = {
  schema: 'creator-signal.component-library-specimen-browser/v1',
  generatedAt: new Date().toISOString(),
  source: 'published Creator Signal Component Library specimens',
  pluginVersion: creatorSignalPluginVersion,
  entryCount: rendered.bundle.summary.entryCount,
  summary: {
    checks: checks.length,
    passed: checks.filter((check) => check.pass).length,
    failed: checks.filter((check) => !check.pass).length,
  },
  checks,
}
await mkdir(outputDirectory, { recursive: true })
await writeFile(
  resolve(outputDirectory, 'report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8',
)

if (report.summary.failed > 0) {
  throw new Error(
    `Creator Signal component specimen browser acceptance failed: ${report.summary.failed} check(s). ` +
    `See ${resolve(outputDirectory, 'report.json')}.`,
  )
}

console.log(
  `Creator Signal component specimen browser acceptance passed: ` +
  `${report.summary.passed} checks across ${report.entryCount} entries. ` +
  `Evidence: ${outputDirectory}`,
)

async function runViewportMatrix(browserInstance: Browser): Promise<void> {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 900, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ] as const) {
    const context = await browserInstance.newContext({ viewport })
    await context.addInitScript(() => {
      localStorage.setItem('creator-signal.theme.v1', 'light')
      document.cookie = 'cs_optional_analytics=denied; path=/; SameSite=Lax'
    })
    const page = await context.newPage()
    const external = await blockExternalRequests(page)
    try {
      for (const entry of rendered.bundle.entries) {
        await runEntryCheck(entry, `viewport:${viewport.name}`, async () => {
          const response = await page.goto(specimenUrl(entry.id), { waitUntil: 'load' })
          assert.equal(response?.status(), 200)
          const layout = await visibleLayout(page, entry.id)
          assert.equal(layout.visible, true)
          assert.equal(layout.overflow, false)
          assert(layout.width > 0 && layout.height > 0)
          assertNoProviderDelivery(external, entry)
          external.length = 0
          if (viewport.name === 'desktop') {
            await page.screenshot({
              path: resolve(screenshotDirectory, `${safeName(entry.id)}.png`),
              fullPage: true,
              animations: 'disabled',
            })
          }
          return layout
        })
      }
    } finally {
      await context.close()
    }
  }
}

async function runThemeMatrix(browserInstance: Browser): Promise<void> {
  for (const theme of ['system', 'dark'] as const) {
    const context = await browserInstance.newContext({
      colorScheme: 'dark',
      viewport: { width: 1280, height: 900 },
    })
    if (theme === 'dark') {
      await context.addInitScript(() => {
        localStorage.setItem('creator-signal.theme.v1', 'dark')
      })
    }
    const page = await context.newPage()
    await blockExternalRequests(page)
    try {
      for (const entry of rendered.bundle.entries) {
        await runEntryCheck(entry, `theme:${theme}`, async () => {
          await page.goto(specimenUrl(entry.id), { waitUntil: 'load' })
          const state = await page.locator('html').evaluate((node) => ({
            theme: node.getAttribute('data-cs-theme'),
            preference: node.getAttribute('data-cs-theme-preference'),
          }))
          assert.equal(state.theme, 'dark')
          assert.equal(state.preference, theme)
          return state
        })
      }
    } finally {
      await context.close()
    }
  }
}

async function runAccessibilityMatrix(browserInstance: Browser): Promise<void> {
  const context = await browserInstance.newContext({
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()
  await blockExternalRequests(page)
  try {
    for (const entry of rendered.bundle.entries) {
      await runEntryCheck(entry, 'axe:wcag-aa', async () => {
        await page.goto(specimenUrl(entry.id), { waitUntil: 'load' })
        await waitForSpecimen(page, entry.id)
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
        assert.deepEqual(
          results.violations.map((violation) => ({
            id: violation.id,
            nodes: violation.nodes.map((node) => ({
              target: node.target,
              failureSummary: node.failureSummary,
            })),
            help: violation.help,
          })),
          [],
        )
        return { violations: 0 }
      })
    }
  } finally {
    await context.close()
  }
}

async function runReducedMotionMatrix(browserInstance: Browser): Promise<void> {
  const context = await browserInstance.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()
  await blockExternalRequests(page)
  try {
    for (const entry of rendered.bundle.entries) {
      await runEntryCheck(entry, 'reduced-motion', async () => {
        await page.goto(specimenUrl(entry.id), { waitUntil: 'load' })
        assert.equal(
          await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
          true,
        )
      })
    }
  } finally {
    await context.close()
  }
}

async function runForcedColorsMatrix(browserInstance: Browser): Promise<void> {
  const context = await browserInstance.newContext({
    forcedColors: 'active',
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()
  await blockExternalRequests(page)
  try {
    for (const entry of rendered.bundle.entries) {
      await runEntryCheck(entry, 'forced-colors', async () => {
        await page.goto(specimenUrl(entry.id), { waitUntil: 'load' })
        const layout = await visibleLayout(page, entry.id)
        assert.equal(layout.visible, true)
        assert.equal(
          await page.evaluate(() => matchMedia('(forced-colors: active)').matches),
          true,
        )
      })
    }
  } finally {
    await context.close()
  }
}

async function runImageUnavailableMatrix(browserInstance: Browser): Promise<void> {
  const context = await browserInstance.newContext({
    viewport: { width: 390, height: 844 },
  })
  const page = await context.newPage()
  await page.route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.origin !== baseUrl || request.resourceType() === 'image') {
      return route.abort('blockedbyclient')
    }
    return route.continue()
  })
  try {
    for (const entry of rendered.bundle.entries) {
      await runEntryCheck(entry, 'image-unavailable', async () => {
        await page.goto(specimenUrl(entry.id), { waitUntil: 'load' })
        const layout = await visibleLayout(page, entry.id)
        assert.equal(layout.visible, true)
        assert.equal(layout.overflow, false)
      })
    }
  } finally {
    await context.close()
  }
}

async function runInteractionMatrix(browserInstance: Browser): Promise<void> {
  const interactiveEntries = rendered.bundle.entries.filter(
    (entry) => entry.browserContract.interactions.length > 0,
  )
  const context = await browserInstance.newContext({
    viewport: { width: 900, height: 900 },
  })
  const page = await context.newPage()
  await blockExternalRequests(page)
  try {
    for (const entry of interactiveEntries) {
      await runEntryCheck(entry, 'interaction', async () => {
        await page.goto(specimenUrl(entry.id), { waitUntil: 'load' })
        await waitForSpecimen(page, entry.id)
        if (entry.id === 'creator-signal.site.faq') {
          const disclosure = page.locator('details summary').first()
          await disclosure.focus()
          await page.keyboard.press('Enter')
          assert.equal(
            await disclosure.evaluate((node) =>
              (node.parentElement as HTMLDetailsElement).open
            ),
            true,
          )
        } else if (entry.id === 'creator-signal.site.consent-banner') {
          const button = page.getByRole('button').first()
          await button.focus()
          assert.equal(await button.isVisible(), true)
        } else if (entry.id === 'creator-signal.site.mautic-form') {
          await page.getByText('The form is temporarily unavailable.', {
            exact: true,
          }).waitFor({ state: 'visible' })
          assert.equal(await page.locator('[data-form-mount] form').count(), 0)
        } else {
          const focusable = page.locator(
            'a[href], button, summary, input, select, textarea, iframe',
          ).first()
          await focusable.waitFor({ state: 'attached', timeout: 5_000 })
          await focusable.focus()
          assert.equal(await focusable.isVisible(), true)
        }
        return { rules: entry.browserContract.interactions }
      })
    }
  } finally {
    await context.close()
  }
}

async function runEntryCheck(
  entry: CreatorSignalComponentSpecimenEntry,
  scenario: string,
  task: () => Promise<unknown>,
): Promise<void> {
  try {
    const detail = await task()
    checks.push({
      entryId: entry.id,
      scenario,
      pass: true,
      ...(detail === undefined ? {} : { detail }),
    })
    console.log(`PASS ${entry.id} ${scenario}`)
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error)
    checks.push({ entryId: entry.id, scenario, pass: false, error: message })
    console.error(`FAIL ${entry.id} ${scenario}: ${message}`)
  }
}

async function blockExternalRequests(page: Page) {
  const external: Array<{ method: string; url: string }> = []
  await page.route('**/*', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.origin !== baseUrl) {
      external.push({ method: request.method(), url: request.url() })
      return route.abort('blockedbyclient')
    }
    return route.continue()
  })
  return external
}

function assertNoProviderDelivery(
  requests: readonly { method: string; url: string }[],
  entry: CreatorSignalComponentSpecimenEntry,
): void {
  const deliveries = requests.filter((request) =>
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method)
  )
  assert.deepEqual(
    deliveries,
    [],
    `${entry.id} attempted an external provider delivery`,
  )
}

async function visibleLayout(page: Page, entryId: string) {
  await waitForSpecimen(page, entryId)
  return page.locator('body').evaluate((node) => {
    const style = getComputedStyle(node)
    const rect = node.getBoundingClientRect()
    return {
      visible:
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0',
      width: rect.width,
      height: rect.height,
      overflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    }
  })
}

async function waitForSpecimen(page: Page, entryId: string): Promise<void> {
  await page.locator(
    `body[data-instatic-component-specimen="${entryId}"]`,
  ).waitFor({ state: 'attached' })
  await page.evaluate(async () => {
    await document.fonts.ready
  })
}

function specimenUrl(entryId: string): string {
  assert(specimenById.has(entryId))
  return `${baseUrl}/__specimen/${encodeURIComponent(entryId)}`
}

function contentType(path: string): string | undefined {
  if (path.endsWith('.js')) return 'text/javascript; charset=utf-8'
  if (path.endsWith('.css')) return 'text/css; charset=utf-8'
  if (path.endsWith('.svg')) return 'image/svg+xml'
  if (path.endsWith('.json') || path.endsWith('.webmanifest')) {
    return 'application/json; charset=utf-8'
  }
  if (path.endsWith('.woff2')) return 'font/woff2'
  if (path.endsWith('.png')) return 'image/png'
  if (path.endsWith('.ico')) return 'image/x-icon'
  return undefined
}

function safeName(entryId: string): string {
  return entryId.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function launchBrowser(): Promise<Browser> {
  const executablePath =
    process.env.CREATOR_SIGNAL_BROWSER_EXECUTABLE_PATH?.trim()
  const cdpUrl = process.env.CREATOR_SIGNAL_BROWSER_CDP_URL?.trim()
  return cdpUrl
    ? chromium.connectOverCDP(cdpUrl)
    : chromium.launch({
        headless: true,
        timeout: 30_000,
        ...(executablePath ? { executablePath } : {}),
      })
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}
