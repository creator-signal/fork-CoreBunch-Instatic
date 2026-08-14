import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium, type BrowserContext, type Page } from 'playwright'
import sharp from 'sharp'
import { creatorSignalPublicRouteSlugs } from '../integrations/creator-signal/pack/routes'

interface Viewport {
  name: 'desktop' | 'tablet' | 'mobile'
  width: number
  height: number
}

interface PageContract {
  title: string
  description: string | null
  canonical: string | null
  robots: string | null
  openGraphTitle: string | null
  openGraphDescription: string | null
  twitterCard: string | null
  language: string
  visibleText: string
  headings: string[]
  landmarks: Record<string, number>
  classes: string[]
  schemaTypes: string[]
  bodyHeight: number
}

interface VisualComparison {
  width: number
  height: number
  differentPixels: number
  differentPixelRatio: number
  meanChannelDelta: number
}

const viewports: readonly Viewport[] = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 900, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]

function argument(name: string, fallback: string): string {
  const index = Bun.argv.indexOf(name)
  return index >= 0 && Bun.argv[index + 1] ? Bun.argv[index + 1] : fallback
}

function baseUrl(value: string): string {
  return value.replace(/\/+$/, '')
}

function routePath(slug: string): string {
  return slug === 'index' ? '/' : `/${slug}`
}

function fileStem(route: string): string {
  return route === '/' ? 'index' : route.slice(1).replace(/[^a-z0-9]+/gi, '-')
}

async function collectContract(page: Page): Promise<PageContract> {
  return page.evaluate(() => {
    const normalize = (value: unknown): string => String(value ?? '').replace(/\s+/g, ' ').trim()
    const meta = (selector: string): string | null =>
      document.querySelector(selector)?.getAttribute('content') ?? null
    return {
      title: document.title,
      description: meta('meta[name="description"]'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
      robots: meta('meta[name="robots"]'),
      openGraphTitle: meta('meta[property="og:title"]'),
      openGraphDescription: meta('meta[property="og:description"]'),
      twitterCard: meta('meta[name="twitter:card"]'),
      language: document.documentElement.lang,
      visibleText: normalize(document.body.innerText),
      headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((node) =>
        `${node.tagName}:${normalize(node.textContent)}`
      ),
      landmarks: {
        header: document.querySelectorAll('header').length,
        main: document.querySelectorAll('main').length,
        footer: document.querySelectorAll('footer').length,
        nav: document.querySelectorAll('nav').length,
        form: document.querySelectorAll('form').length,
      },
      classes: [...new Set(
        [...document.querySelectorAll('[class]')]
          .flatMap((node) => String(node.className).split(/\s+/))
          .filter(Boolean),
      )].sort(),
      schemaTypes: [...new Set(
        [...document.querySelectorAll('[itemtype]')]
          .map((node) => node.getAttribute('itemtype'))
          .filter((value): value is string => Boolean(value)),
      )].sort(),
      bodyHeight: Math.round(document.body.getBoundingClientRect().height * 100) / 100,
    }
  })
}

async function openRoute(
  context: BrowserContext,
  base: string,
  route: string,
): Promise<{ page: Page; contract: PageContract; screenshot: Buffer }> {
  const page = await context.newPage()
  const response = await page.goto(`${base}${route}`, { waitUntil: 'load' })
  if (!response?.ok()) {
    throw new Error(`${base}${route} returned ${response?.status() ?? 'no response'}`)
  }
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  const [contract, screenshot] = await Promise.all([
    collectContract(page),
    page.screenshot({ fullPage: true, animations: 'disabled' }),
  ])
  return { page, contract, screenshot }
}

async function comparePngs(baseline: Buffer, candidate: Buffer): Promise<VisualComparison> {
  const baselineImage = await sharp(baseline).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const candidateImage = await sharp(candidate).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  if (
    baselineImage.info.width !== candidateImage.info.width ||
    baselineImage.info.height !== candidateImage.info.height
  ) {
    return {
      width: candidateImage.info.width,
      height: candidateImage.info.height,
      differentPixels: candidateImage.info.width * candidateImage.info.height,
      differentPixelRatio: 1,
      meanChannelDelta: 255,
    }
  }

  let differentPixels = 0
  let channelDelta = 0
  const channels = baselineImage.info.channels
  for (let offset = 0; offset < baselineImage.data.length; offset += channels) {
    let pixelDelta = 0
    for (let channel = 0; channel < channels; channel++) {
      const delta = Math.abs(baselineImage.data[offset + channel] - candidateImage.data[offset + channel])
      pixelDelta = Math.max(pixelDelta, delta)
      channelDelta += delta
    }
    if (pixelDelta > 8) differentPixels++
  }
  const pixels = baselineImage.info.width * baselineImage.info.height
  return {
    width: baselineImage.info.width,
    height: baselineImage.info.height,
    differentPixels,
    differentPixelRatio: differentPixels / pixels,
    meanChannelDelta: channelDelta / baselineImage.data.length,
  }
}

function seoFailures(contract: PageContract): string[] {
  const failures: string[] = []
  if (!contract.title) failures.push('missing title')
  if (!contract.description) failures.push('missing description')
  if (!contract.canonical?.startsWith('https://creatorsignal.me')) failures.push('missing production canonical')
  if (!contract.robots?.includes('index') || !contract.robots.includes('follow')) failures.push('missing index/follow robots')
  if (!contract.openGraphTitle || !contract.openGraphDescription) failures.push('missing Open Graph metadata')
  if (!contract.twitterCard) failures.push('missing Twitter card metadata')
  if (contract.language !== 'en-AU') failures.push('language is not en-AU')
  if (!contract.schemaTypes.includes('https://schema.org/SiteNavigationElement')) {
    failures.push('missing navigation schema')
  }
  return failures
}

const baselineBase = baseUrl(argument('--baseline-base', 'https://creatorsignal.me'))
const candidateBase = baseUrl(argument('--candidate-base', 'http://localhost:4330'))
const outputDir = resolve(argument('--output-dir', '.tmp/creator-signal-parity'))
const maxDifferentPixelRatio = Number(argument('--max-different-pixel-ratio', '0.002'))
const maxMeanChannelDelta = Number(argument('--max-mean-channel-delta', '0.1'))
const interactionsOnly = Bun.argv.includes('--interactions-only')
await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const results: Array<Record<string, unknown>> = []
const interactionResults: Array<Record<string, unknown>> = []
let failed = false

try {
  for (const viewport of interactionsOnly ? [] : viewports) {
    // Disabling JavaScript makes the HTML/CSS comparison deterministic and
    // keeps third-party forms/analytics out of the visual baseline. Their live
    // behavior is covered independently by the integration acceptance suite.
    const baselineContext = await browser.newContext({ viewport, javaScriptEnabled: false })
    const candidateContext = await browser.newContext({ viewport, javaScriptEnabled: false })
    try {
      for (const slug of creatorSignalPublicRouteSlugs) {
        const route = routePath(slug)
        const [baseline, candidate] = await Promise.all([
          openRoute(baselineContext, baselineBase, route),
          openRoute(candidateContext, candidateBase, route),
        ])
        try {
          const visual = await comparePngs(baseline.screenshot, candidate.screenshot)
          const semanticFailures: string[] = []
          if (baseline.contract.visibleText !== candidate.contract.visibleText) semanticFailures.push('visible text differs')
          if (JSON.stringify(baseline.contract.headings) !== JSON.stringify(candidate.contract.headings)) semanticFailures.push('heading hierarchy differs')
          if (JSON.stringify(baseline.contract.landmarks) !== JSON.stringify(candidate.contract.landmarks)) semanticFailures.push('landmarks differ')
          if (JSON.stringify(baseline.contract.classes) !== JSON.stringify(candidate.contract.classes)) semanticFailures.push('class contract differs')
          if (Math.abs(baseline.contract.bodyHeight - candidate.contract.bodyHeight) > 1) semanticFailures.push('page height differs')
          const candidateSeoFailures = seoFailures(candidate.contract)
          const visualPass =
            visual.differentPixelRatio <= maxDifferentPixelRatio &&
            visual.meanChannelDelta <= maxMeanChannelDelta
          const pass = visualPass && semanticFailures.length === 0 && candidateSeoFailures.length === 0
          if (!pass) {
            failed = true
            const stem = `${viewport.name}-${fileStem(route)}`
            await Promise.all([
              Bun.write(resolve(outputDir, `${stem}-baseline.png`), baseline.screenshot),
              Bun.write(resolve(outputDir, `${stem}-candidate.png`), candidate.screenshot),
            ])
          }
          results.push({
            route,
            viewport: viewport.name,
            pass,
            visualPass,
            visual,
            semanticFailures,
            candidateSeoFailures,
            baseline: baseline.contract,
            candidate: candidate.contract,
          })
          console.log(`${pass ? 'PASS' : 'FAIL'} ${viewport.name.padEnd(7)} ${route}`)
        } finally {
          await Promise.all([baseline.page.close(), candidate.page.close()])
        }
      }
    } finally {
      await Promise.all([baselineContext.close(), candidateContext.close()])
    }
  }

  const baselineInteractionContext = await browser.newContext({ viewport: viewports[0] })
  const candidateInteractionContext = await browser.newContext({ viewport: viewports[0] })
  try {
    for (const [label, base, context] of [
      ['baseline', baselineBase, baselineInteractionContext],
      ['candidate', candidateBase, candidateInteractionContext],
    ] as const) {
      await context.clearCookies()
      const page = await context.newPage()
      try {
        await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' })
        const banner = page.locator('[data-consent-banner]')
        await banner.waitFor({ state: 'visible' })
        await page.getByRole('button', { name: 'Essential only' }).click()
        await banner.waitFor({ state: 'hidden' })
        const cookie = (await context.cookies()).find((entry) => entry.name === 'cs_optional_analytics')
        const pass = cookie?.value === 'denied'
        if (!pass) failed = true
        interactionResults.push({
          kind: 'consent-essential-only',
          target: label,
          pass,
          cookie: cookie?.value ?? null,
        })
        console.log(`${pass ? 'PASS' : 'FAIL'} interaction ${label} consent-essential-only`)
      } finally {
        await page.close()
      }
    }

    const formSlugs = [
      'contact',
      'feedback',
      'wishlist',
      'ask-a-question',
      'feature-request',
      'report-an-error',
    ] as const
    for (const slug of formSlugs) {
      const route = `/${slug}`
      const inspectForm = async (context: BrowserContext, base: string) => {
        const page = await context.newPage()
        const diagnostics: string[] = []
        page.on('pageerror', (error) => diagnostics.push(`pageerror: ${error.message}`))
        page.on('requestfailed', (request) => {
          if (request.url().includes('marketing.creatorsignal.me')) {
            diagnostics.push(`requestfailed: ${request.url()} (${request.failure()?.errorText ?? 'unknown'})`)
          }
        })
        try {
          await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' })
          try {
            await page.locator('[data-form-mount] form').waitFor({ state: 'attached', timeout: 10_000 })
          } catch {
            diagnostics.push('generated form did not attach within 10 seconds')
          }
          return await page.evaluate(() => ({
            loaded: Boolean(document.querySelector('[data-form-mount] form')),
            alias: document.querySelector('[data-cs-mautic-form]')?.getAttribute('data-form-alias') ?? null,
            labels: [...document.querySelectorAll('[data-form-mount] label')]
              .map((node) => node.textContent?.replace(/\s+/g, ' ').trim())
              .filter((value): value is string => Boolean(value)),
            inputTypes: [...document.querySelectorAll('[data-form-mount] input, [data-form-mount] textarea, [data-form-mount] select')]
              .map((node) => node.tagName === 'INPUT' ? node.getAttribute('type') ?? 'text' : node.tagName.toLowerCase()),
            submitLabel: document.querySelector('[data-form-mount] button[type="submit"]')?.textContent?.trim() ?? null,
            status: document.querySelector('[data-form-status]')?.textContent?.trim() ?? null,
          })).then((state) => ({ ...state, diagnostics }))
        } finally {
          await page.close()
        }
      }
      try {
        const [baselineForm, candidateForm] = await Promise.all([
          inspectForm(baselineInteractionContext, baselineBase),
          inspectForm(candidateInteractionContext, candidateBase),
        ])
        const comparableBaseline = { ...baselineForm, loaded: true, diagnostics: [] }
        const comparableCandidate = { ...candidateForm, loaded: true, diagnostics: [] }
        const pass =
          candidateForm.loaded &&
          baselineForm.alias === candidateForm.alias &&
          Boolean(candidateForm.submitLabel) &&
          candidateForm.labels.length > 0 &&
          (!baselineForm.loaded || JSON.stringify(comparableBaseline) === JSON.stringify(comparableCandidate))
        if (!pass) failed = true
        interactionResults.push({
          kind: 'generated-form',
          route,
          pass,
          comparisonMode: baselineForm.loaded ? 'generated-form-parity' : 'candidate-live-with-baseline-alias',
          baseline: baselineForm,
          candidate: candidateForm,
        })
        console.log(`${pass ? 'PASS' : 'FAIL'} interaction form ${route}`)
      } catch (error) {
        failed = true
        interactionResults.push({
          kind: 'generated-form',
          route,
          pass: false,
          error: error instanceof Error ? error.message : String(error),
        })
        console.log(`FAIL interaction form ${route}`)
      }
    }
  } finally {
    await Promise.all([
      baselineInteractionContext.close(),
      candidateInteractionContext.close(),
    ])
  }
} finally {
  await browser.close()
}

const report = {
  generatedAt: new Date().toISOString(),
  baselineBase,
  candidateBase,
  maxDifferentPixelRatio,
  maxMeanChannelDelta,
  routes: creatorSignalPublicRouteSlugs.length,
  viewports: viewports.length,
  comparisons: results.length,
  passed: results.filter((result) => result.pass).length,
  failed: results.filter((result) => !result.pass).length,
  results,
  interactions: {
    comparisons: interactionResults.length,
    passed: interactionResults.filter((result) => result.pass).length,
    failed: interactionResults.filter((result) => !result.pass).length,
    results: interactionResults,
  },
}
await Bun.write(resolve(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(`\n${report.passed}/${report.comparisons} comparisons passed; report: ${resolve(outputDir, 'report.json')}`)
console.log(`${report.interactions.passed}/${report.interactions.comparisons} interaction comparisons passed`)
if (failed) process.exitCode = 1
