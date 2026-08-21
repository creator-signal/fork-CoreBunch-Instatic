import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium, type BrowserContext, type Locator, type Page } from 'playwright'
import sharp from 'sharp'
import { creatorSignalPublicRouteSlugs } from '../integrations/creator-signal/pack/routes'
import { creatorSignalComponentLibraryEntries } from '../integrations/creator-signal/component-library'
import { installPackCompileEnvironment } from '../src/core/plugin-sdk/cli/packCompileEnvironment'

installPackCompileEnvironment()
const {
  creatorSignalPageAuthoringReference,
  creatorSignalSharedTemplateEntryIds,
} = await import('../integrations/creator-signal/pack/site')

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
  sections: PageSectionContract[]
  bodyHeight: number
}

interface PageSectionContract {
  tag: string
  className: string
  heading: string
  componentEntryId: string
}

interface VisualComparison {
  width: number
  height: number
  differentPixels: number
  differentPixelRatio: number
  meanChannelDelta: number
}

interface SectionComparisonResult {
  index: number
  pass: boolean
  componentEntryId: string
  heading: string
  visual?: VisualComparison
  screenshots?: { baseline: string; candidate: string }
  failure?: string
}

type ComparisonMode = 'production-parity' | 'candidate-only' | 'candidate-unavailable'

interface ParityResult {
  route: string
  viewport: Viewport['name']
  comparisonMode: ComparisonMode
  pass: boolean
  visualPass: boolean | null
  visual: VisualComparison | null
  semanticFailures: string[]
  candidateSeoFailures: string[]
  notes: string[]
  screenshots: { baseline?: string; candidate?: string }
  sections: SectionComparisonResult[]
  baseline: PageContract | null
  candidate: PageContract | null
}

interface RouteCapture {
  page: Page
  available: boolean
  status: number | null
  contract: PageContract | null
  screenshot: Buffer | null
  failure: string | null
}

const pageSectionSelector = [
  'header.site-header',
  'main > section',
  'main > article',
  'main > figure',
  'main > [data-creator-signal-pattern] > section',
  'main > [data-creator-signal-pattern] > article',
  'main > [data-creator-signal-pattern] > figure',
  'main > [data-creator-signal-pattern] > aside',
  'footer.site-footer',
  'aside[data-consent-banner]',
].join(', ')

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

function identifierStem(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'unknown'
}

async function collectContract(page: Page): Promise<PageContract> {
  return page.evaluate((sectionSelector) => {
    const normalize = (value: unknown): string => String(value ?? '').replace(/\s+/g, ' ').trim()
    const meta = (selector: string): string | null =>
      document.querySelector(selector)?.getAttribute('content') ?? null
    const ignored = [...document.querySelectorAll<HTMLElement>('[data-parity-ignore]')]
    const ignoredDisplay = ignored.map((node) => node.style.display)
    ignored.forEach((node) => { node.style.display = 'none' })
    const visibleText = normalize(document.body.innerText)
    ignored.forEach((node, index) => { node.style.display = ignoredDisplay[index] ?? '' })
    return {
      title: document.title,
      description: meta('meta[name="description"]'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
      robots: meta('meta[name="robots"]'),
      openGraphTitle: meta('meta[property="og:title"]'),
      openGraphDescription: meta('meta[property="og:description"]'),
      twitterCard: meta('meta[name="twitter:card"]'),
      language: document.documentElement.lang,
      visibleText,
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
      sections: [...document.querySelectorAll(sectionSelector)].map((node) => {
        const className = String(node.className)
        let componentEntryId = 'unknown'
        if (node.matches('header.site-header')) componentEntryId = 'creator-signal.site.header'
        else if (node.matches('footer.site-footer')) componentEntryId = 'creator-signal.site.footer'
        else if (node.matches('[data-consent-banner]')) componentEntryId = 'creator-signal.site.consent-banner'
        else if (node.matches('.hero-section')) componentEntryId = 'creator-signal.site.hero'
        else if (node.matches('.cta-section')) componentEntryId = 'creator-signal.site.call-to-action'
        else if (node.matches('.testimonial')) componentEntryId = 'creator-signal.site.testimonial'
        else if (node.matches('.public-document')) componentEntryId = 'creator-signal.site.public-document'
        else if (node.matches('.campaign-hero')) componentEntryId = 'creator-signal.site.campaign-hero'
        else if (node.matches('.signal-strip')) componentEntryId = 'creator-signal.site.signal-strip'
        else if (node.matches('.signal-comparison')) componentEntryId = 'creator-signal.site.signal-comparison'
        else if (node.matches('.process-section')) componentEntryId = 'creator-signal.site.process-steps'
        else if (node.matches('.pricing-plans')) componentEntryId = 'creator-signal.site.pricing-plans'
        else if (node.matches('.founder-story')) componentEntryId = 'creator-signal.site.founder-story'
        else if (node.matches('.comparison-section')) componentEntryId = 'creator-signal.site.comparison-section'
        else if (node.matches('.recovery-state')) componentEntryId = 'creator-signal.site.recovery-state'
        else if (node.matches('.cs-mautic') || node.querySelector('.cs-mautic')) componentEntryId = 'creator-signal.site.mautic-form'
        else if (node.querySelector('.feature-grid')) componentEntryId = 'creator-signal.site.feature-grid'
        else if (node.querySelector('.faq-list')) componentEntryId = 'creator-signal.site.faq'
        else if (node.querySelector('.prose-content')) componentEntryId = 'creator-signal.site.rich-text-section'
        return {
          tag: node.tagName.toLowerCase(),
          className,
          heading: normalize(node.querySelector('h1,h2,h3')?.textContent),
          componentEntryId,
        }
      }),
      bodyHeight: Math.round(document.body.getBoundingClientRect().height * 100) / 100,
    }
  }, pageSectionSelector)
}

async function openRoute(
  context: BrowserContext,
  base: string,
  route: string,
): Promise<RouteCapture> {
  const page = await context.newPage()
  try {
    const response = await page.goto(`${base}${route}`, { waitUntil: 'load' })
    const status = response?.status() ?? null
    if (!response?.ok()) {
      return {
        page,
        available: false,
        status,
        contract: null,
        screenshot: null,
        failure: `${base}${route} returned ${status ?? 'no response'}`,
      }
    }
    await page.evaluate(async () => {
      await document.fonts.ready
    })
    const [contract, screenshot] = await Promise.all([
      collectContract(page),
      page.screenshot({ fullPage: true, animations: 'disabled' }),
    ])
    return { page, available: true, status, contract, screenshot, failure: null }
  } catch (error) {
    return {
      page,
      available: false,
      status: null,
      contract: null,
      screenshot: null,
      failure: error instanceof Error ? error.message : String(error),
    }
  }
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

async function screenshotSection(
  page: Page,
  locator: Locator,
  componentEntryId: string,
): Promise<Buffer> {
  if (componentEntryId === 'creator-signal.site.consent-banner') {
    return locator.screenshot({ animations: 'disabled' })
  }

  const consent = page.locator('aside[data-consent-banner]')
  const previousVisibility = await consent.evaluateAll((nodes) => nodes.map((node) => {
    const element = node as HTMLElement
    const previous = element.style.visibility
    element.style.visibility = 'hidden'
    return previous
  }))
  try {
    return await locator.screenshot({ animations: 'disabled' })
  } finally {
    await consent.evaluateAll((nodes, previous) => nodes.forEach((node, index) => {
      const element = node as HTMLElement
      element.style.visibility = previous[index] ?? ''
    }), previousVisibility)
  }
}

export function seoFailures(contract: PageContract, route: string): string[] {
  const failures: string[] = []
  if (!contract.title) failures.push('missing title')
  if (!contract.description) failures.push('missing description')
  if (!contract.canonical?.startsWith('https://creatorsignal.me')) failures.push('missing production canonical')
  const expectedRobots = route === '/early-access'
    ? ['noindex', 'follow', 'noarchive']
    : ['index', 'follow']
  for (const directive of expectedRobots) {
    if (!contract.robots?.split(',').map((value) => value.trim()).includes(directive)) {
      failures.push(`missing ${directive} robots directive`)
    }
  }
  if (!contract.openGraphTitle || !contract.openGraphDescription) failures.push('missing Open Graph metadata')
  if (!contract.twitterCard) failures.push('missing Twitter card metadata')
  if (contract.language !== 'en-AU') failures.push('language is not en-AU')
  if (!contract.schemaTypes.includes('https://schema.org/SiteNavigationElement')) {
    failures.push('missing navigation schema')
  }
  return failures
}

function escapeReportHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function percent(value: number): string {
  return `${(value * 100).toFixed(4)}%`
}

function renderHtmlReport(input: {
  generatedAt: string
  baselineBase: string
  candidateBase: string
  results: readonly ParityResult[]
  interactionResults: readonly Record<string, unknown>[]
}): string {
  const componentNameById = new Map(
    creatorSignalComponentLibraryEntries.map((entry) => [entry.id, entry.name]),
  )
  const passed = input.results.filter((result) => result.pass).length
  const comparable = input.results.filter((result) => result.comparisonMode === 'production-parity').length
  const candidateOnly = input.results.filter((result) => result.comparisonMode === 'candidate-only').length
  const interactionsPassed = input.interactionResults.filter(
    (result) => result.pass === true,
  ).length
  const routeRows = creatorSignalPageAuthoringReference.map((page) => `
    <tr>
      <td><a href="#${identifierStem(page.route)}">${escapeReportHtml(page.route)}</a></td>
      <td>${escapeReportHtml(page.title)}</td>
      <td><code>${escapeReportHtml(componentNameById.get(page.patternId) ?? page.patternId)}</code></td>
      <td>${page.componentEntryIds.map((id) =>
        `<code>${escapeReportHtml(componentNameById.get(id) ?? id)}</code>`).join(' → ')}</td>
    </tr>`).join('')
  const componentRows = creatorSignalComponentLibraryEntries.map((entry) => {
    const repeaters = entry.fields.filter((field) => field.type === 'repeater')
    const placement = entry.constraints.allowedDocumentKinds?.map((kind) =>
      kind === 'template' ? 'shared template' : 'page').join(', ') ?? 'page or template'
    return `
      <tr>
        <td><code>${escapeReportHtml(entry.id)}</code><br><strong>${escapeReportHtml(entry.name)}</strong></td>
        <td>${escapeReportHtml(entry.composition ?? 'leaf')}</td>
        <td>${escapeReportHtml(placement)}</td>
        <td>${entry.fields.map((field) => escapeReportHtml(field.label)).join(', ') || 'None'}</td>
        <td>${repeaters.map((field) => escapeReportHtml(field.label)).join(', ') || 'None'}</td>
        <td>${entry.slots.length}</td>
      </tr>`
  }).join('')
  const pageComparisons = creatorSignalPageAuthoringReference.map((page, pageIndex) => {
    const comparisons = input.results.filter((result) => result.route === page.route)
    const viewportHtml = comparisons.map((comparison) => {
      const sections = comparison.sections.map((section) => `
        <article class="section-card">
          <header>
            <span class="status ${section.pass ? 'pass' : 'fail'}">${section.pass ? 'PASS' : 'FAIL'}</span>
            <strong>${escapeReportHtml(componentNameById.get(section.componentEntryId) ?? section.componentEntryId)}</strong>
            <span>${escapeReportHtml(section.heading)}</span>
          </header>
          ${section.screenshots ? `
            <div class="image-pair compact">
              <figure><figcaption>Production</figcaption><img loading="lazy" src="${escapeReportHtml(section.screenshots.baseline)}" alt="Production ${escapeReportHtml(section.componentEntryId)} section"></figure>
              <figure><figcaption>Candidate</figcaption><img loading="lazy" src="${escapeReportHtml(section.screenshots.candidate)}" alt="Candidate ${escapeReportHtml(section.componentEntryId)} section"></figure>
            </div>` : `<p>${escapeReportHtml(section.failure ?? 'Section screenshot unavailable.')}</p>`}
        </article>`).join('')
      const failures = [...comparison.semanticFailures, ...comparison.candidateSeoFailures]
      const visualSummary = comparison.visual
        ? `${percent(comparison.visual.differentPixelRatio)} different pixels · ${comparison.visual.meanChannelDelta.toFixed(4)} mean channel delta`
        : comparison.comparisonMode === 'candidate-only'
          ? 'Candidate-only route; no production screenshot exists.'
          : 'Candidate route unavailable; visual comparison not possible.'
      const screenshots = comparison.screenshots.baseline && comparison.screenshots.candidate
        ? `<div class="image-pair">
            <figure><figcaption>Production</figcaption><img loading="lazy" src="${escapeReportHtml(comparison.screenshots.baseline)}" alt="Production ${escapeReportHtml(page.title)} at ${escapeReportHtml(comparison.viewport)}"></figure>
            <figure><figcaption>Candidate</figcaption><img loading="lazy" src="${escapeReportHtml(comparison.screenshots.candidate)}" alt="Candidate ${escapeReportHtml(page.title)} at ${escapeReportHtml(comparison.viewport)}"></figure>
          </div>`
        : comparison.screenshots.candidate
          ? `<div class="image-pair single"><figure><figcaption>Candidate</figcaption><img loading="lazy" src="${escapeReportHtml(comparison.screenshots.candidate)}" alt="Candidate ${escapeReportHtml(page.title)} at ${escapeReportHtml(comparison.viewport)}"></figure></div>`
          : ''
      return `
        <section class="viewport-card">
          <header class="comparison-heading">
            <h3>${escapeReportHtml(comparison.viewport)}</h3>
            <span class="status ${comparison.pass ? 'pass' : 'fail'}">${comparison.pass ? 'PASS' : 'FAIL'}</span>
            <span>${escapeReportHtml(comparison.comparisonMode)}</span>
            <span>${escapeReportHtml(visualSummary)}</span>
          </header>
          ${failures.length > 0 ? `<ul class="failures">${failures.map((failure) => `<li>${escapeReportHtml(failure)}</li>`).join('')}</ul>` : ''}
          ${comparison.notes.length > 0 ? `<ul class="notes">${comparison.notes.map((note) => `<li>${escapeReportHtml(note)}</li>`).join('')}</ul>` : ''}
          ${screenshots}
          <details><summary>Component sections (${comparison.sections.length})</summary><div class="section-grid">${sections}</div></details>
        </section>`
    }).join('')
    return `
      <details class="page-card" id="${identifierStem(page.route)}" ${pageIndex === 0 ? 'open' : ''}>
        <summary><strong>${escapeReportHtml(page.route)}</strong> · ${escapeReportHtml(page.title)} · ${comparisons.filter((result) => result.pass).length}/${comparisons.length} viewports</summary>
        <p>${escapeReportHtml(page.description)}</p>
        <p class="sequence"><strong>Governed pattern:</strong> ${escapeReportHtml(componentNameById.get(page.patternId) ?? page.patternId)}</p>
        <p class="sequence"><strong>Page content:</strong> ${page.componentEntryIds.map((id) => escapeReportHtml(componentNameById.get(id) ?? id)).join(' → ')}</p>
        ${viewportHtml || '<p>No visual comparisons were requested.</p>'}
      </details>`
  }).join('')
  const sharedSequence = creatorSignalSharedTemplateEntryIds.map((id) =>
    escapeReportHtml(componentNameById.get(id) ?? id)).join(' → ')

  return `<!doctype html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Creator Signal authoring and production parity</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    body { max-width: 1600px; margin: 0 auto; padding: 32px; background: #111315; color: #f4f5f7; line-height: 1.5; }
    a { color: #82b5ff; } code { color: #b8d5ff; } table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; border: 1px solid #34383d; text-align: left; vertical-align: top; }
    th { background: #202328; } .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .metric, .page-card, .viewport-card, .section-card { border: 1px solid #34383d; border-radius: 12px; background: #191c20; }
    .metric { padding: 16px; } .metric strong { display: block; font-size: 1.65rem; }
    .page-card { margin: 18px 0; padding: 16px; scroll-margin-top: 16px; } .page-card > summary { cursor: pointer; font-size: 1.05rem; }
    .viewport-card { margin-top: 16px; padding: 14px; } .comparison-heading { display: flex; align-items: baseline; flex-wrap: wrap; gap: 10px; }
    .comparison-heading h3 { margin: 0; text-transform: capitalize; } .status { border-radius: 999px; padding: 2px 8px; font-size: .75rem; font-weight: 800; }
    .status.pass { background: #164e2b; color: #9ff0ba; } .status.fail { background: #5b2024; color: #ffc0c3; }
    .image-pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 12px 0; align-items: start; }
    figure { margin: 0; } figcaption { margin-bottom: 6px; color: #b8bec7; font-size: .8rem; font-weight: 700; text-transform: uppercase; }
    img { display: block; width: 100%; height: auto; border: 1px solid #34383d; border-radius: 8px; background: white; }
    .section-grid { display: grid; gap: 12px; margin-top: 12px; } .section-card { padding: 12px; } .section-card > header { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .image-pair.single { grid-template-columns: minmax(0, 1fr); max-width: 760px; }
    .compact img { max-height: 520px; object-fit: contain; object-position: top; } .failures { color: #ffc0c3; } .notes, .sequence { color: #c9ced6; }
    section > h2 { margin-top: 42px; } .table-wrap { overflow-x: auto; }
    @media (max-width: 760px) { body { padding: 16px; } .image-pair { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <p>Generated ${escapeReportHtml(input.generatedAt)}</p>
    <h1>Creator Signal authoring and production parity</h1>
    <p>Production <a href="${escapeReportHtml(input.baselineBase)}">${escapeReportHtml(input.baselineBase)}</a> compared with candidate <a href="${escapeReportHtml(input.candidateBase)}">${escapeReportHtml(input.candidateBase)}</a>. Images are captured at desktop, tablet and mobile widths.</p>
  </header>
  <div class="summary">
    <div class="metric"><strong>${passed}/${input.results.length}</strong>page/viewport comparisons</div>
    <div class="metric"><strong>${comparable}</strong>production-comparable captures</div>
    <div class="metric"><strong>${candidateOnly}</strong>candidate-only captures</div>
    <div class="metric"><strong>${interactionsPassed}/${input.interactionResults.length}</strong>interaction comparisons</div>
    <div class="metric"><strong>${creatorSignalPageAuthoringReference.length}</strong>public routes</div>
    <div class="metric"><strong>${creatorSignalComponentLibraryEntries.length}</strong>authorable catalogue entries</div>
  </div>
  <section>
    <h2>Shared template</h2>
    <p><strong>Creator Signal site template</strong> wraps every ordinary page. Its sequence is ${sharedSequence}, with one content outlet between the header and footer. Page authors add only the route content listed below.</p>
  </section>
  <section>
    <h2>Route and section reference</h2>
    <div class="table-wrap"><table><thead><tr><th>Route</th><th>Page</th><th>Governed pattern</th><th>Opinionated page components</th></tr></thead><tbody>${routeRows}</tbody></table></div>
  </section>
  <section>
    <h2>Authoring catalogue</h2>
    <div class="table-wrap"><table><thead><tr><th>Component</th><th>Shape</th><th>Placement</th><th>Fields</th><th>Repeaters</th><th>Slots</th></tr></thead><tbody>${componentRows}</tbody></table></div>
  </section>
  <section>
    <h2>Side-by-side pages and sections</h2>
    ${pageComparisons}
  </section>
</body>
</html>`
}

const baselineBase = baseUrl(argument('--baseline-base', 'https://creatorsignal.me'))
const candidateBase = baseUrl(argument('--candidate-base', 'http://localhost:4330'))
const outputDir = resolve(argument('--output-dir', '.tmp/creator-signal-parity'))
const maxDifferentPixelRatio = Number(argument('--max-different-pixel-ratio', '0.002'))
const maxMeanChannelDelta = Number(argument('--max-mean-channel-delta', '0.1'))
const maxSectionDifferentPixels = Number(argument('--max-section-different-pixels', '1024'))
const interactionsOnly = Bun.argv.includes('--interactions-only')
await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const results: ParityResult[] = []
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
          const screenshotDir = resolve(outputDir, 'screenshots', viewport.name)
          const sectionDir = resolve(outputDir, 'sections', viewport.name, fileStem(route))
          await Promise.all([
            mkdir(screenshotDir, { recursive: true }),
            mkdir(sectionDir, { recursive: true }),
          ])
          if (!candidate.available || !candidate.contract || !candidate.screenshot) {
            failed = true
            results.push({
              route,
              viewport: viewport.name,
              comparisonMode: 'candidate-unavailable',
              pass: false,
              visualPass: null,
              visual: null,
              semanticFailures: [candidate.failure ?? 'candidate route unavailable'],
              candidateSeoFailures: [],
              notes: baseline.failure ? [`Production capture: ${baseline.failure}`] : [],
              screenshots: {},
              sections: [],
              baseline: baseline.contract,
              candidate: null,
            })
            console.log(`FAIL ${viewport.name.padEnd(7)} ${route} (candidate unavailable)`)
            continue
          }

          const candidateSeoFailures = seoFailures(candidate.contract, route)
          if (!baseline.available || !baseline.contract || !baseline.screenshot) {
            const candidateScreenshot = `screenshots/${viewport.name}/${fileStem(route)}-candidate.png`
            await Bun.write(resolve(outputDir, candidateScreenshot), candidate.screenshot)
            const baselineMissingAsExpected = baseline.status === 404
            const pass = baselineMissingAsExpected && candidateSeoFailures.length === 0
            if (!pass) failed = true
            results.push({
              route,
              viewport: viewport.name,
              comparisonMode: 'candidate-only',
              pass,
              visualPass: null,
              visual: null,
              semanticFailures: baselineMissingAsExpected
                ? []
                : [baseline.failure ?? 'production baseline unavailable'],
              candidateSeoFailures,
              notes: [
                baselineMissingAsExpected
                  ? 'Production returns HTTP 404; candidate quality is reported without claiming visual parity.'
                  : `Production capture failed: ${baseline.failure ?? 'unknown error'}`,
              ],
              screenshots: { candidate: candidateScreenshot },
              sections: candidate.contract.sections.map((section, index) => ({
                index,
                pass: true,
                componentEntryId: section.componentEntryId,
                heading: section.heading,
                failure: 'Candidate-only section; no production section exists for comparison.',
              })),
              baseline: null,
              candidate: candidate.contract,
            })
            console.log(`${pass ? 'PASS' : 'FAIL'} ${viewport.name.padEnd(7)} ${route} (candidate only)`)
            continue
          }

          const fullPageScreenshots = {
            baseline: `screenshots/${viewport.name}/${fileStem(route)}-baseline.png`,
            candidate: `screenshots/${viewport.name}/${fileStem(route)}-candidate.png`,
          }
          await Promise.all([
            Bun.write(resolve(outputDir, fullPageScreenshots.baseline), baseline.screenshot),
            Bun.write(resolve(outputDir, fullPageScreenshots.candidate), candidate.screenshot),
          ])

          const visual = await comparePngs(baseline.screenshot, candidate.screenshot)
          const semanticFailures: string[] = []
          if (baseline.contract.visibleText !== candidate.contract.visibleText) semanticFailures.push('visible text differs')
          if (JSON.stringify(baseline.contract.headings) !== JSON.stringify(candidate.contract.headings)) semanticFailures.push('heading hierarchy differs')
          if (JSON.stringify(baseline.contract.landmarks) !== JSON.stringify(candidate.contract.landmarks)) semanticFailures.push('landmarks differ')
          const missingProductionClasses = baseline.contract.classes.filter(
            (className) => !candidate.contract.classes.includes(className),
          )
          if (missingProductionClasses.length > 0) {
            semanticFailures.push(`production classes missing: ${missingProductionClasses.join(', ')}`)
          }
          const sectionContract = (contract: PageContract) => contract.sections.map((section) => ({
            tag: section.tag,
            heading: section.heading,
            componentEntryId: section.componentEntryId,
          }))
          if (JSON.stringify(sectionContract(baseline.contract)) !== JSON.stringify(sectionContract(candidate.contract))) {
            semanticFailures.push('component section contract differs')
          }
          if (Math.abs(baseline.contract.bodyHeight - candidate.contract.bodyHeight) > 1) semanticFailures.push('page height differs')
          const sectionResults: SectionComparisonResult[] = []
          const baselineSections = baseline.page.locator(pageSectionSelector)
          const candidateSections = candidate.page.locator(pageSectionSelector)
          const [baselineSectionCount, candidateSectionCount] = await Promise.all([
            baselineSections.count(),
            candidateSections.count(),
          ])
          const sectionCount = Math.max(baselineSectionCount, candidateSectionCount)
          for (let index = 0; index < sectionCount; index++) {
            const sectionContract = candidate.contract.sections[index] ?? baseline.contract.sections[index]
            if (index >= baselineSectionCount || index >= candidateSectionCount) {
              sectionResults.push({
                index,
                pass: false,
                componentEntryId: sectionContract?.componentEntryId ?? 'unknown',
                heading: sectionContract?.heading ?? '',
                failure: 'section missing from one side',
              })
              continue
            }
            const [baselineSection, candidateSection] = await Promise.all([
              screenshotSection(
                baseline.page,
                baselineSections.nth(index),
                sectionContract?.componentEntryId ?? 'unknown',
              ),
              screenshotSection(
                candidate.page,
                candidateSections.nth(index),
                sectionContract?.componentEntryId ?? 'unknown',
              ),
            ])
            const sectionStem = `${String(index + 1).padStart(2, '0')}-${identifierStem(sectionContract?.componentEntryId ?? 'unknown')}`
            const screenshots = {
              baseline: `sections/${viewport.name}/${fileStem(route)}/${sectionStem}-baseline.png`,
              candidate: `sections/${viewport.name}/${fileStem(route)}/${sectionStem}-candidate.png`,
            }
            await Promise.all([
              Bun.write(resolve(outputDir, screenshots.baseline), baselineSection),
              Bun.write(resolve(outputDir, screenshots.candidate), candidateSection),
            ])
            const sectionVisual = await comparePngs(baselineSection, candidateSection)
            const sectionPass =
              ((sectionVisual.differentPixelRatio <= maxDifferentPixelRatio &&
                sectionVisual.meanChannelDelta <= maxMeanChannelDelta) ||
                sectionVisual.differentPixels <= maxSectionDifferentPixels) &&
              baseline.contract.sections[index]?.componentEntryId ===
                candidate.contract.sections[index]?.componentEntryId
            sectionResults.push({
              index,
              pass: sectionPass,
              componentEntryId: sectionContract?.componentEntryId ?? 'unknown',
              heading: sectionContract?.heading ?? '',
              visual: sectionVisual,
              screenshots,
            })
          }
          if (sectionResults.some((section) => section.pass === false)) {
            semanticFailures.push('one or more component sections differ')
          }
          const visualPass =
            visual.differentPixelRatio <= maxDifferentPixelRatio &&
            visual.meanChannelDelta <= maxMeanChannelDelta
          const pass = visualPass && semanticFailures.length === 0 && candidateSeoFailures.length === 0
          if (!pass) {
            failed = true
          }
          results.push({
            route,
            viewport: viewport.name,
            comparisonMode: 'production-parity',
            pass,
            visualPass,
            visual,
            semanticFailures,
            candidateSeoFailures,
            notes: [],
            screenshots: fullPageScreenshots,
            sections: sectionResults,
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
  maxSectionDifferentPixels,
  routes: creatorSignalPublicRouteSlugs.length,
  viewports: viewports.length,
  comparisons: results.length,
  comparableComparisons: results.filter((result) => result.comparisonMode === 'production-parity').length,
  candidateOnlyComparisons: results.filter((result) => result.comparisonMode === 'candidate-only').length,
  candidateUnavailableComparisons: results.filter((result) => result.comparisonMode === 'candidate-unavailable').length,
  passed: results.filter((result) => result.pass).length,
  failed: results.filter((result) => !result.pass).length,
  results,
  interactions: {
    comparisons: interactionResults.length,
    passed: interactionResults.filter((result) => result.pass).length,
    failed: interactionResults.filter((result) => !result.pass).length,
    results: interactionResults,
  },
  authoring: {
    sharedTemplateEntryIds: creatorSignalSharedTemplateEntryIds,
    pages: creatorSignalPageAuthoringReference,
    components: creatorSignalComponentLibraryEntries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      composition: entry.composition,
      fields: entry.fields,
      slots: entry.slots,
      constraints: entry.constraints,
      usage: entry.documentation.usage,
      accessibility: entry.documentation.accessibility,
    })),
  },
}
await Promise.all([
  Bun.write(resolve(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`),
  Bun.write(resolve(outputDir, 'index.html'), renderHtmlReport({
    generatedAt: report.generatedAt,
    baselineBase,
    candidateBase,
    results,
    interactionResults,
  })),
])
console.log(`\n${report.passed}/${report.comparisons} comparisons passed; visual report: ${resolve(outputDir, 'index.html')}`)
console.log(`Machine-readable report: ${resolve(outputDir, 'report.json')}`)
console.log(`${report.interactions.passed}/${report.interactions.comparisons} interaction comparisons passed`)
if (failed) process.exitCode = 1
