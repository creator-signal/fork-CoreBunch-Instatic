import { strict as assert } from 'node:assert'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { chromium, type Page } from '@playwright/test'
import { safeParseJson } from '@core/utils/jsonValidate'
import { Type } from '@core/utils/typeboxHelpers'
import {
  validateNonFormSpecimenBundle,
  type NonFormSpecimenBundle,
} from './lib/component-library-non-form-specimens'

const repositoryRoot = resolve(import.meta.dir, '..')
const bundlePath = resolve(
  repositoryRoot,
  'docs/features/component-library-non-form-specimens.json',
)
const designSystemRoot = resolve(
  repositoryRoot,
  'integrations/creator-signal',
)
const outputDirectory = resolve(
  repositoryRoot,
  '.tmp/component-library-non-form-specimens',
)
const requestedPort = Number.parseInt(
  process.env.COMPONENT_LIBRARY_SPECIMEN_BROWSER_PORT ?? '0',
  10,
)
const NON_FORM_BUNDLE_PATH =
  'docs/features/component-library-non-form-specimens.json'

const raw = await readFile(bundlePath, 'utf8')
const parsed = safeParseJson(raw, Type.Unknown())
if (!parsed.ok) throw parsed.error
const bundle = validateNonFormSpecimenBundle(parsed.value)

const scenarioByRoute = new Map(
  bundle.entries.flatMap((entry) =>
    entry.scenarios.map((scenario) => [scenario.route, { entry, scenario }] as const),
  ),
)
const embeddedAssetByPath = new Map(
  bundle.syntheticAssets.map((asset) => [asset.path, asset]),
)
const moduleAssetById = new Map(
  bundle.moduleJsAssets.map((asset) => [asset.id, asset]),
)
const designSystemTargetSet = new Set(
  bundle.assetBoundary.files.map((file) => `/${file.target}`),
)

const server = Bun.serve({
  port: Number.isSafeInteger(requestedPort) && requestedPort > 0
    ? requestedPort
    : 0,
  async fetch(request) {
    const url = new URL(request.url)
    const specimen = scenarioByRoute.get(url.pathname)
    if (specimen) {
      return new Response(specimen.scenario.rendered.html, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
        },
      })
    }
    const embeddedAsset = embeddedAssetByPath.get(url.pathname)
    if (embeddedAsset) {
      return new Response(Buffer.from(embeddedAsset.bodyBase64, 'base64'), {
        headers: { 'content-type': embeddedAsset.contentType },
      })
    }
    if (designSystemTargetSet.has(url.pathname)) {
      const relativePath = url.pathname.slice(1)
      if (relativePath.split('/').includes('..')) {
        return new Response('Not found', { status: 404 })
      }
      const file = Bun.file(join(designSystemRoot, relativePath))
      if (!(await file.exists())) return new Response('Not found', { status: 404 })
      return new Response(file, {
        headers: { 'content-type': contentType(relativePath) },
      })
    }
    const moduleId = moduleIdFromPath(url.pathname)
    if (moduleId) {
      const asset = moduleAssetById.get(moduleId)
      if (!asset || url.searchParams.get('v') !== asset.contentHash) {
        return new Response('Not found', { status: 404 })
      }
      return new Response(asset.body, {
        headers: { 'content-type': 'text/javascript; charset=utf-8' },
      })
    }
    return new Response('Not found', { status: 404 })
  },
})

interface EntryReceipt {
  entryId: string
  scenarios: Array<{
    scenarioId: string
    kind: string
    axeViolationCount: number
    targetVisible: boolean
  }>
  defaultAcceptance: {
    themes: string[]
    viewportWidths: number[]
    forcedColors: boolean
    reducedMotion: boolean
    interactionChecks: string[]
  }
}

await mkdir(outputDirectory, { recursive: true })

if (Bun.argv.includes('--serve')) {
  console.log(`Non-form specimen bundle: http://127.0.0.1:${server.port}/`)
  await new Promise(() => {})
} else {
  const browserExecutablePath =
    process.env.COMPONENT_LIBRARY_SPECIMEN_BROWSER_EXECUTABLE_PATH?.trim()
  const browser = await chromium.launch({
    headless: true,
    timeout: 30_000,
    ...(browserExecutablePath ? { executablePath: browserExecutablePath } : {}),
  })
  const receipts: EntryReceipt[] = []
  try {
    const context = await browser.newContext({
      colorScheme: 'dark',
      reducedMotion: 'no-preference',
      viewport: { width: 1440, height: 1000 },
    })
    await context.route('**/*', async (route) => {
      const requestUrl = new URL(route.request().url())
      assert.equal(
        requestUrl.hostname,
        '127.0.0.1',
        `Specimen attempted an external request: ${requestUrl.href}`,
      )
      await route.continue()
    })
    const page = await context.newPage()

    for (const entry of bundle.entries) {
      console.log(`Verifying ${entry.id} (${entry.scenarios.length} scenarios)`)
      const receipt: EntryReceipt = {
        entryId: entry.id,
        scenarios: [],
        defaultAcceptance: {
          themes: [],
          viewportWidths: [],
          forcedColors: false,
          reducedMotion: false,
          interactionChecks: [],
        },
      }
      for (const scenario of entry.scenarios) {
        await page.setViewportSize({ width: 1440, height: 1000 })
        await page.emulateMedia({
          colorScheme: 'dark',
          forcedColors: 'none',
          reducedMotion: 'no-preference',
        })
        await page.goto(origin(server.port, scenario.route), {
          waitUntil: 'networkidle',
        })
        await page.evaluate(() => document.fonts.ready)
        const targetVisible = await assertScenarioIdentity(page, entry.id, scenario)
        await assertNoOverflow(page, 1440)
        const axe = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
        assert.deepEqual(
          axe.violations.map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            targets: violation.nodes.map((node) => node.target),
          })),
          [],
          `${entry.id}/${scenario.id} has axe violations`,
        )
        if (scenario.kind === 'image-unavailable') {
          const unavailableImagery = page.locator(
            'img[src*="missing-image.svg"], video[poster*="missing-image.svg"]',
          )
          assert.ok(
            await unavailableImagery.count() > 0,
            `${entry.id} did not exercise unavailable imagery`,
          )
          const brokenImages = await page.locator('img[src*="missing-image.svg"]')
            .evaluateAll((images) => images.filter((image) => image.naturalWidth === 0).length)
          if (await page.locator('img[src*="missing-image.svg"]').count() > 0) {
            assert.ok(brokenImages > 0, `${entry.id} unavailable image unexpectedly loaded`)
          }
        }
        if (scenario.kind === 'capability-unavailable') {
          const unavailable = page.locator(
            '[data-instatic-provider-state], [data-instatic-collection-state="unavailable"], [role="status"]',
          )
          assert.ok(
            await unavailable.count() > 0,
            `${entry.id} did not expose its unavailable state`,
          )
        }
        receipt.scenarios.push({
          scenarioId: scenario.id,
          kind: scenario.kind,
          axeViolationCount: axe.violations.length,
          targetVisible,
        })
      }

      const defaultScenario = entry.scenarios.find((scenario) => scenario.id === 'default')!
      await assertDefaultThemeAndResponsiveAcceptance(
        page,
        entry.id,
        defaultScenario,
        receipt,
        server.port,
      )
      await assertDeclaredInteractions(
        page,
        entry.id,
        defaultScenario,
        receipt.defaultAcceptance.interactionChecks,
      )
      receipts.push(receipt)
    }
    await context.close()
  } finally {
    await browser.close()
    server.stop(true)
  }

  const acceptance = {
    schemaVersion: 'instatic.component-library-non-form-browser-acceptance/v1',
    generatedAt: new Date().toISOString(),
    sourceBundle: NON_FORM_BUNDLE_PATH,
    bundleChecksum: bundle.checksum.value,
    entryCount: receipts.length,
    scenarioCount: receipts.reduce((total, receipt) => total + receipt.scenarios.length, 0),
    outcomes: receipts,
  }
  await writeFile(
    join(outputDirectory, 'acceptance.json'),
    `${JSON.stringify(acceptance, null, 2)}\n`,
    'utf8',
  )
  console.log(
    `Non-form Component Library browser acceptance passed for ` +
    `${acceptance.entryCount} entries and ${acceptance.scenarioCount} scenarios. ` +
    `Evidence: ${outputDirectory}`,
  )
}

async function assertScenarioIdentity(
  page: Page,
  entryId: string,
  scenario: NonFormSpecimenBundle['entries'][number]['scenarios'][number],
): Promise<boolean> {
  assert.equal(
    await page.locator('body').getAttribute('data-instatic-specimen-entry'),
    entryId,
  )
  assert.equal(
    await page.locator('body').getAttribute('data-instatic-specimen-scenario'),
    scenario.id,
  )
  assert.equal(
    await page.locator(scenario.expectedSelector).count(),
    1,
    `${entryId}/${scenario.id} target selector was not unique: ${scenario.expectedSelector}`,
  )
  const targetVisible = await page.locator(scenario.expectedSelector).isVisible()
  if (scenario.kind !== 'image-unavailable') {
    assert.ok(
      targetVisible,
      `${entryId}/${scenario.id} target was not visible: ${scenario.expectedSelector}`,
    )
  }
  assert.ok(await page.locator('link[data-instatic-design-system-asset]').count() >= 3)
  assert.equal(
    await page.locator('script[data-instatic-design-system-asset="theme-bootstrap"]').count(),
    1,
  )
  return targetVisible
}

async function assertDefaultThemeAndResponsiveAcceptance(
  page: Page,
  entryId: string,
  scenario: NonFormSpecimenBundle['entries'][number]['scenarios'][number],
  receipt: EntryReceipt,
  port: number,
): Promise<void> {
  const route = origin(port, scenario.route)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.emulateMedia({
    colorScheme: 'dark',
    forcedColors: 'none',
    reducedMotion: 'no-preference',
  })
  await page.evaluate(() => localStorage.removeItem('creator-signal.theme.v1'))
  await page.goto(route, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('html').getAttribute('data-cs-theme'), 'dark')
  assert.equal(
    await page.locator('html').getAttribute('data-cs-theme-preference'),
    'system',
  )
  receipt.defaultAcceptance.themes.push('system-dark')

  await page.evaluate(() => localStorage.setItem('creator-signal.theme.v1', 'light'))
  await page.reload({ waitUntil: 'networkidle' })
  assert.equal(await page.locator('html').getAttribute('data-cs-theme'), 'light')
  receipt.defaultAcceptance.themes.push('light')

  await page.evaluate(() => localStorage.setItem('creator-signal.theme.v1', 'dark'))
  await page.reload({ waitUntil: 'networkidle' })
  assert.equal(await page.locator('html').getAttribute('data-cs-theme'), 'dark')
  receipt.defaultAcceptance.themes.push('dark')

  for (const viewport of [768, 390]) {
    await page.setViewportSize({ width: viewport, height: viewport === 390 ? 844 : 1024 })
    await page.reload({ waitUntil: 'networkidle' })
    await assertScenarioIdentity(page, entryId, scenario)
    await assertNoOverflow(page, viewport)
    receipt.defaultAcceptance.viewportWidths.push(viewport)
  }

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
  await page.reload({ waitUntil: 'networkidle' })
  await assertScenarioIdentity(page, entryId, scenario)
  await assertNoOverflow(page, 1440)
  receipt.defaultAcceptance.forcedColors = true
  receipt.defaultAcceptance.reducedMotion = true

  await page.emulateMedia({
    colorScheme: 'dark',
    forcedColors: 'none',
    reducedMotion: 'no-preference',
  })
}

async function assertDeclaredInteractions(
  page: Page,
  entryId: string,
  scenario: NonFormSpecimenBundle['entries'][number]['scenarios'][number],
  checks: string[],
): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.reload({ waitUntil: 'networkidle' })
  const target = page.locator(scenario.expectedSelector)

  if (entryId.endsWith('.dialog') || entryId.endsWith('.drawer')) {
    const overlay = await target.getAttribute('data-instatic-overlay') !== null
      ? target
      : target.locator('[data-instatic-overlay]')
    const trigger = overlay.locator('[data-instatic-overlay-trigger]')
    await trigger.click()
    assert.equal(await overlay.getAttribute('open'), '')
    await page.keyboard.press('Escape')
    assert.equal(await overlay.getAttribute('open'), null)
    checks.push('overlay-open-escape-focus-return')
  }
  if (entryId.endsWith('.carousel')) {
    const carousel = await target.getAttribute('data-instatic-carousel') !== null
      ? target
      : target.locator('[data-instatic-carousel]')
    const next = carousel.locator('[data-instatic-carousel-action="next"]')
    await next.click()
    assert.equal(await carousel.getAttribute('data-instatic-carousel-current'), '1')
    checks.push('carousel-keyboard-control')
  }
  if (entryId.endsWith('.tabs')) {
    const tabs = target.locator('[role="tab"]')
    assert.ok(await tabs.count() > 0)
    await tabs.first().focus()
    await page.keyboard.press('ArrowRight')
    assert.ok(
      await tabs.nth(Math.min(1, (await tabs.count()) - 1))
        .evaluate((element) => element === document.activeElement),
    )
    checks.push('tabs-arrow-key-navigation')
  }
  if (entryId.endsWith('.accordion') || entryId.endsWith('.accordion-item')) {
    const summary = target.locator('summary').first()
    assert.ok(await summary.count() > 0)
    await summary.focus()
    await page.keyboard.press('Enter')
    assert.equal(await summary.locator('xpath=..').getAttribute('open'), '')
    checks.push('accordion-native-keyboard-toggle')
  }

  const declaredRules = new Set(scenario.declaredBehaviorRules)
  if (
    declaredRules.has('a11y.keyboard-contract') ||
    declaredRules.has('a11y.focus-contract') ||
    declaredRules.has('a11y.touch-target')
  ) {
    const focusableSelector =
      'a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
    const focusable = await target.evaluate(
      (element, selector) => element.matches(selector),
      focusableSelector,
    )
      ? target
      : target.locator(focusableSelector)
    assert.ok(await focusable.count() > 0, `${entryId} declares interaction behavior without a focusable control`)
    await focusable.first().focus()
    assert.ok(
      await focusable.first().evaluate((element) => element === document.activeElement),
    )
    checks.push('declared-focusable-control')
  }
}

async function assertNoOverflow(page: Page, expectedWidth: number): Promise<void> {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyWidth: Math.ceil(document.body.getBoundingClientRect().width),
  }))
  assert.equal(metrics.clientWidth, expectedWidth)
  assert.ok(
    metrics.scrollWidth <= metrics.clientWidth + 1,
    `Document overflowed by ${metrics.scrollWidth - metrics.clientWidth}px`,
  )
  assert.ok(metrics.bodyWidth <= metrics.clientWidth + 1)
}

function moduleIdFromPath(pathname: string): string | null {
  const prefix = '/_instatic/module-js/'
  if (!pathname.startsWith(prefix) || !pathname.endsWith('.js')) return null
  const encoded = pathname.slice(prefix.length, -3)
  try {
    return decodeURIComponent(encoded)
  } catch {
    return null
  }
}

function origin(port: number, path: string): string {
  return `http://127.0.0.1:${port}${path}`
}

function contentType(path: string): string {
  if (path.endsWith('.js')) return 'text/javascript; charset=utf-8'
  if (path.endsWith('.css')) return 'text/css; charset=utf-8'
  if (path.endsWith('.svg')) return 'image/svg+xml'
  if (path.endsWith('.json') || path.endsWith('.webmanifest')) {
    return 'application/json; charset=utf-8'
  }
  if (path.endsWith('.woff2')) return 'font/woff2'
  if (path.endsWith('.png')) return 'image/png'
  if (path.endsWith('.ico')) return 'image/x-icon'
  return 'application/octet-stream'
}
