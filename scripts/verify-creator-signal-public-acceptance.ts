import { strict as assert } from 'node:assert'
import { mkdir, readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { chromium, type BrowserContext, type Page } from '@playwright/test'
import sharp from 'sharp'
import '@modules/base'
import type { AnyModuleDefinition, IModuleRegistry } from '@core/module-engine'
import { registry } from '@core/module-engine'
import { DEFAULT_SITE_SETTINGS, type Page as SitePage, type SiteDocument } from '@core/page-tree'
import { pluginModuleToHostModule } from '@core/plugins/moduleAdapter'
import { publishPage } from '@core/publisher'
import { composeTemplateChain } from '@core/templates'
import {
  injectFrontendAssets,
  renderFrontendAsset,
  type FrontendInjections,
} from '../server/publish/frontendInjections'
import {
  buildSiteModuleJsMap,
  injectModuleScripts,
  moduleJsContentHash,
  resolvePublishedModuleJsAssets,
} from '../server/publish/moduleJsBundle'
import { installPackCompileEnvironment } from '../src/core/plugin-sdk/cli/packCompileEnvironment'
import { creatorSignalPluginVersion } from '../integrations/creator-signal/design-system/contract'
import { creatorSignalPublicRouteSlugs } from '../integrations/creator-signal/pack/routes'

installPackCompileEnvironment()

const [{ default: creatorSignalPlugin }, sitePack] = await Promise.all([
  import('../integrations/creator-signal/instatic-plugin.config'),
  import('../integrations/creator-signal/pack/site'),
])
const { pack } = sitePack

type CheckResult = {
  name: string
  pass: boolean
  detail?: unknown
  error?: string
}

type VisualResult = {
  name: string
  pass: boolean
  baseline: string
  actual: string
  width?: number
  height?: number
  differentPixels?: number
  differentPixelRatio?: number
  meanChannelDelta?: number
  updated?: boolean
  error?: string
}

type VisualScenario = {
  name: string
  route: string
  viewport: { width: number; height: number }
  colorScheme: 'light' | 'dark'
  theme?: 'light' | 'dark'
  includeConsent?: boolean
  fullPage?: boolean
}

const repositoryRoot = resolve(import.meta.dir, '..')
const pluginDist = resolve(repositoryRoot, 'integrations/creator-signal/dist')
const baselineDirectory = resolve(
  repositoryRoot,
  'integrations/creator-signal/acceptance/baselines',
)
const outputDirectory = resolve(repositoryRoot, '.tmp/creator-signal-public-acceptance')
const actualDirectory = resolve(outputDirectory, 'actual')
const pluginAssetPrefix = `/uploads/plugins/creator-signal.site/${creatorSignalPluginVersion}`
const requestedPort = Number.parseInt(process.env.CREATOR_SIGNAL_PUBLIC_ACCEPTANCE_PORT ?? '0', 10)
const requestedHost = process.env.CREATOR_SIGNAL_PUBLIC_ACCEPTANCE_HOST?.trim() || '127.0.0.1'
const updateBaselines = Bun.argv.includes('--update-baselines')
const baselineUpdateAllowed = process.env.CREATOR_SIGNAL_ALLOW_BASELINE_UPDATE === '1'
const serveOnly = Bun.argv.includes('--serve-only')

if (updateBaselines !== baselineUpdateAllowed) {
  throw new Error(
    'Baseline updates require both --update-baselines and CREATOR_SIGNAL_ALLOW_BASELINE_UPDATE=1.',
  )
}

for (const asset of ['frontend/theme-bootstrap.js', 'frontend/theme-control.js', 'frontend/analytics.js']) {
  if (!(await Bun.file(resolve(pluginDist, asset)).exists())) {
    throw new Error(`Creator Signal plugin dist is missing ${asset}; build the plugin before acceptance.`)
  }
}

function makeRegistry(modules: Record<string, AnyModuleDefinition>): IModuleRegistry {
  return {
    register: () => {},
    registerOrReplace: () => {},
    unregister: () => {},
    get: (id) => modules[id],
    getOrThrow: (id) => {
      const module = modules[id]
      if (!module) throw new Error(`Module not found: ${id}`)
      return module
    },
    has: (id) => id in modules,
    list: () => Object.values(modules),
    listByCategory: () => ({}),
    subscribe: () => () => {},
    generation: () => 0,
    isDynamic: (id) => modules[id]?.dynamic === true,
    getStaticPlaceholder: (id) => modules[id]?.staticPlaceholder ?? null,
  } as IModuleRegistry
}

const modules = Object.fromEntries(registry.list().map((module) => [module.id, module]))
for (const definition of creatorSignalPlugin.modules) {
  modules[definition.id] = pluginModuleToHostModule(
    'creator-signal.site',
    definition,
    () => () => null,
    creatorSignalPlugin.manifest.permissions,
    creatorSignalPlugin.manifest.networkAllowedHosts,
  )
}
const moduleRegistry = makeRegistry(modules)

const site: SiteDocument = {
  id: 'creator-signal-public-acceptance',
  name: 'Creator Signal public acceptance',
  pages: pack.pages,
  files: [],
  visualComponents: pack.visualComponents,
  packageJson: { dependencies: {}, devDependencies: {} },
  runtime: { dependencyLock: { version: 1, packages: {}, updatedAt: 0 }, scripts: {} },
  breakpoints: [
    { id: 'mobile', label: 'Mobile', width: 390, icon: 'smartphone' },
    { id: 'tablet', label: 'Tablet', width: 900, icon: 'tablet' },
    { id: 'desktop', label: 'Desktop', width: 1440, icon: 'monitor' },
  ],
  settings: structuredClone(DEFAULT_SITE_SETTINGS),
  styleRules: Object.fromEntries(pack.classes.map((rule) => [rule.id, rule])),
  createdAt: 0,
  updatedAt: 0,
}
const moduleJsMap = buildSiteModuleJsMap(site, moduleRegistry)

function frontendPlan(): FrontendInjections {
  const plan: FrontendInjections = {
    tags: { head: [], 'head-end': [], 'body-start': [], 'body-end': [] },
    hasInlineScript: false,
    hasInlineStyle: false,
    hasExternalScript: false,
    networkAllowedHosts: [...creatorSignalPlugin.manifest.networkAllowedHosts],
    publicConnectOrigins: [],
    mediaCspOrigins: [],
  }
  const plugin = {
    manifest: {
      id: creatorSignalPlugin.manifest.id,
      assetBasePath: pluginAssetPrefix,
    },
  }
  for (const asset of creatorSignalPlugin.manifest.frontend?.assets ?? []) {
    const resolved = renderFrontendAsset(asset, plugin)
    if (!resolved) continue
    plan.tags[resolved.placement].push(resolved.html)
    if (asset.kind === 'script') plan.hasExternalScript = true
    if (asset.kind === 'script-inline') plan.hasInlineScript = true
    if (asset.kind === 'style-inline') plan.hasInlineStyle = true
  }
  return plan
}

const publicPages = pack.pages.filter((page) => !page.template)
const sharedTemplate = pack.pages.find((page) => page.template?.target.kind === 'everywhere')
const notFoundTemplate = pack.pages.find((page) => page.template?.target.kind === 'notFound')
assert(sharedTemplate, 'Creator Signal shared template is missing')
assert(notFoundTemplate, 'Creator Signal not-found template is missing')

function renderPublishedPage(page: SitePage): string {
  const composed = composeTemplateChain([sharedTemplate], { kind: 'page', page })
  const published = publishPage(composed, site, moduleRegistry)
  const withFrontendAssets = injectFrontendAssets(published.html, frontendPlan())
  return injectModuleScripts(
    withFrontendAssets,
    resolvePublishedModuleJsAssets(published.jsModuleIds, moduleJsMap),
  )
}

function routeForSlug(slug: string): string {
  return slug === 'index' ? '/' : `/${slug}`
}

const publishedRoutes = new Map(
  publicPages.map((page) => [routeForSlug(page.slug), renderPublishedPage(page)]),
)
const notFoundHtml = renderPublishedPage(notFoundTemplate)

const stateCopy: Record<string, { label: string; heading: string; body: string }> = {
  empty: {
    label: 'No content yet',
    heading: 'There is nothing here yet',
    body: 'Return soon or continue to the Creator Signal home page.',
  },
  error: {
    label: 'Something went wrong',
    heading: 'We could not load this content',
    body: 'Try again, or return to the Creator Signal home page.',
  },
  offline: {
    label: 'Connection unavailable',
    heading: 'This page is unavailable offline',
    body: 'Reconnect to the internet, then try again.',
  },
}

const acceptanceRoutes = new Map<string, string>()
for (const [stateName, copy] of Object.entries(stateCopy)) {
  const page = structuredClone(notFoundTemplate)
  page.id = `creator-signal-public-acceptance-${stateName}`
  page.slug = `__acceptance/state/${stateName}`
  page.title = `${copy.label} acceptance`
  page.template = undefined
  const stateNode = Object.values(page.nodes).find(
    (node) => node.moduleId === 'creator-signal.site.recovery-state',
  )
  assert(stateNode, `Recovery state node is missing for ${stateName}`)
  stateNode.props = {
    ...stateNode.props,
    state: stateName,
    heading: copy.heading,
    body: copy.body,
    actionLabel: 'Return home',
    actionUrl: '/',
  }
  acceptanceRoutes.set(`/${page.slug}`, renderPublishedPage(page))
}

const patternPage = structuredClone(publicPages.find((page) => page.slug === 'features'))
assert(patternPage, 'Creator Signal features page is missing')
patternPage.id = 'creator-signal-public-acceptance-patterns'
patternPage.slug = '__acceptance/patterns'
patternPage.title = 'Interaction patterns acceptance'
const featureNode = Object.values(patternPage.nodes).find(
  (node) => node.moduleId === 'creator-signal.site.feature-grid',
)
const faqDefinition = creatorSignalPlugin.modules.find(
  (module) => module.id === 'creator-signal.site.faq',
)
assert(featureNode, 'Features page has no feature-grid node for acceptance')
assert(faqDefinition, 'Creator Signal FAQ module is missing')
featureNode.moduleId = faqDefinition.id
featureNode.props = structuredClone(faqDefinition.defaults)
acceptanceRoutes.set('/__acceptance/patterns', renderPublishedPage(patternPage))

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

const server = Bun.serve({
  hostname: requestedHost,
  port: Number.isSafeInteger(requestedPort) && requestedPort > 0 ? requestedPort : 0,
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname === '/admin/api/cms/plugins/creator-signal.site/runtime/config') {
      return Response.json({ error: 'acceptance_config_unavailable' }, { status: 503 })
    }
    if (url.pathname.startsWith(`${pluginAssetPrefix}/`)) {
      const relativePath = url.pathname.slice(pluginAssetPrefix.length + 1)
      if (relativePath.split('/').includes('..')) return new Response('Not found', { status: 404 })
      const file = Bun.file(join(pluginDist, relativePath))
      if (!(await file.exists())) return new Response('Not found', { status: 404 })
      const type = contentType(relativePath)
      return new Response(file, type ? { headers: { 'content-type': type } } : undefined)
    }
    if (url.pathname.startsWith('/_instatic/module-js/') && url.pathname.endsWith('.js')) {
      const encodedId = url.pathname.slice('/_instatic/module-js/'.length, -'.js'.length)
      let moduleId: string
      try {
        moduleId = decodeURIComponent(encodedId)
      } catch {
        return new Response('Not found', { status: 404 })
      }
      const body = moduleJsMap.get(moduleId)
      if (!body || url.searchParams.get('v') !== moduleJsContentHash(body)) {
        return new Response('Not found', { status: 404 })
      }
      return new Response(body, {
        headers: { 'content-type': 'text/javascript; charset=utf-8' },
      })
    }
    const html = publishedRoutes.get(url.pathname) ?? acceptanceRoutes.get(url.pathname)
    if (html) {
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
    }
    return new Response(notFoundHtml, {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  },
})

const baseUrl = `http://127.0.0.1:${server.port}`
const checks: CheckResult[] = []
const visuals: VisualResult[] = []

async function runCheck(name: string, task: () => Promise<unknown>): Promise<void> {
  try {
    const detail = await task()
    checks.push({ name, pass: true, ...(detail === undefined ? {} : { detail }) })
    console.log(`PASS ${name}`)
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error)
    checks.push({ name, pass: false, error: message })
    console.error(`FAIL ${name}: ${message}`)
  }
}

const formRegistry = `window.CreatorSignalMauticForms=${JSON.stringify({
  schema: 'creator-signal.mautic-forms/v1',
  forms: Object.fromEntries([
    'creator_signal_contact',
    'creator_signal_feedback',
    'creator_signal_wishlist',
    'creator_signal_question',
    'creator_signal_feature_request',
    'creator_signal_error_report',
  ].map((alias, index) => [alias, {
    id: index + 1,
    apiName: `${alias}_form`,
    code: alias,
    consentTimestampField: 'consent_timestamp',
  }])),
})};`

const generatedForm = String.raw`(() => {
  const target = document.currentScript && document.currentScript.parentElement;
  if (!target) return;
  const formId = new URL(document.currentScript.src).searchParams.get('id');
  const preference = formId === '3'
    ? '<fieldset class="mauticform-row"><legend>Which updates would you like?</legend><label><input type="radio" name="contact_preference" value="launch" required> Launch notification</label><label><input type="radio" name="contact_preference" value="testing"> Early testing</label><label><input type="radio" name="contact_preference" value="both"> Both</label></fieldset>'
    : '';
  target.innerHTML = '<form novalidate><div class="mauticform-row"><label for="acceptance-email">Email address</label><input id="acceptance-email" name="email" type="email" required aria-describedby="acceptance-email-error"><span id="acceptance-email-error" class="mauticform-errormsg" hidden>Enter a valid email address.</span></div>' + preference + '<div class="mauticform-row"><label for="acceptance-message">Message</label><textarea id="acceptance-message" name="message" required></textarea></div><input name="mauticform[consent_timestamp]" type="hidden"><button type="submit">Send message</button></form>';
  const form = target.querySelector('form');
  const email = target.querySelector('#acceptance-email');
  const message = target.querySelector('#acceptance-message');
  const error = target.querySelector('#acceptance-email-error');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const invalid = !email.validity.valid || !message.validity.valid;
    if (invalid) email.setAttribute('aria-invalid', 'true');
    else email.removeAttribute('aria-invalid');
    error.hidden = !invalid;
    if (invalid) { email.focus(); return; }
    const callback = Object.values(window.MauticFormCallback || {})[0];
    if (callback) setTimeout(() => callback.onResponse({ success: new URL(location.href).searchParams.get('formResult') !== 'failure' }), 50);
  });
})();`

async function routeMarketing(page: Page, registryAvailable = true): Promise<void> {
  await page.route('https://marketing.creatorsignal.me/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/media/creator-signal/forms-v1.js')) {
      if (!registryAvailable) return route.abort('failed')
      return route.fulfill({
        status: 200,
        contentType: 'text/javascript; charset=utf-8',
        body: formRegistry,
      })
    }
    if (url.pathname.endsWith('/media/js/mautic-form.js')) {
      return route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: '' })
    }
    if (url.pathname.endsWith('/form/generate.js')) {
      return route.fulfill({
        status: 200,
        contentType: 'text/javascript; charset=utf-8',
        body: generatedForm,
      })
    }
    return route.abort('blockedbyclient')
  })
}

async function waitForPage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  const heading = page.locator('main h1')
  await heading.waitFor({ state: 'attached' })
  const visibility = await heading.evaluate((node) => {
    const style = getComputedStyle(node)
    const rect = node.getBoundingClientRect()
    return {
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      width: rect.width,
      height: rect.height,
    }
  })
  assert(
    visibility.display !== 'none' &&
      visibility.visibility !== 'hidden' &&
      visibility.opacity !== '0' &&
      visibility.width > 0 &&
      visibility.height > 0,
    `Main heading is not visible: ${JSON.stringify(visibility)}`,
  )
}

async function addDeniedConsent(context: BrowserContext): Promise<void> {
  await context.addCookies([{
    name: 'cs_optional_analytics',
    value: 'denied',
    url: baseUrl,
    sameSite: 'Lax',
  }])
}

if (serveOnly) {
  console.log(`Creator Signal public acceptance preview: ${baseUrl}`)
  await new Promise<never>(() => {})
}

const browserExecutablePath = process.env.CREATOR_SIGNAL_BROWSER_EXECUTABLE_PATH?.trim()
const browser = await chromium.launch({
  headless: true,
  timeout: 30_000,
  ...(browserExecutablePath ? { executablePath: browserExecutablePath } : {}),
})

try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 900, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    await runCheck(`all public routes render without ${viewport.name} document overflow`, async () => {
      const context = await browser.newContext({ viewport })
      await addDeniedConsent(context)
      const page = await context.newPage()
      await routeMarketing(page)
      try {
        for (const slug of creatorSignalPublicRouteSlugs) {
          const route = routeForSlug(slug)
          const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'load' })
          assert.equal(response?.status(), 200, `${route} did not return 200`)
          await waitForPage(page)
          const contract = await page.evaluate(() => ({
            header: document.querySelectorAll('header.site-header').length,
            main: document.querySelectorAll('main').length,
            footer: document.querySelectorAll('footer.site-footer').length,
            h1: document.querySelectorAll('main h1').length,
            overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          }))
          assert.deepEqual(contract, { header: 1, main: 1, footer: 1, h1: 1, overflow: false }, route)
        }
        return { routes: creatorSignalPublicRouteSlugs.length, viewport }
      } finally {
        await context.close()
      }
    })
  }

  await runCheck('representative routes pass automated WCAG 2.2 AA analysis', async () => {
    const routes = [
      '/',
      '/early-access',
      '/products',
      '/products/sales-pulse',
      '/pricing',
      '/contact',
      '/legal/privacy',
      '/trust/security',
      '/404',
      '/__acceptance/patterns',
      '/__acceptance/state/empty',
      '/__acceptance/state/error',
      '/__acceptance/state/offline',
    ]
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()
    await routeMarketing(page)
    const failures: string[] = []
    try {
      for (const route of routes) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: 'load' })
        await waitForPage(page)
        if (route === '/contact') {
          await page.locator('[data-form-mount] form').waitFor({ state: 'attached' })
        }
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
        failures.push(...results.violations.map((violation) =>
          `${route}: ${violation.id} (${violation.nodes.length} node(s)) ${violation.help}`,
        ))
      }
      assert.deepEqual(failures, [])
      return { routes: routes.length, violations: 0 }
    } finally {
      await context.close()
    }
  })

  await runCheck('keyboard users can skip chrome, reach mobile navigation and operate FAQ disclosure', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    await addDeniedConsent(context)
    const page = await context.newPage()
    try {
      await page.goto(`${baseUrl}/__acceptance/patterns`, { waitUntil: 'load' })
      await waitForPage(page)
      await page.keyboard.press('Tab')
      assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'Skip to main content')
      assert.equal(await page.locator('.skip-link').evaluate((node) =>
        getComputedStyle(node).position === 'fixed' && node.getBoundingClientRect().height > 0,
      ), true)
      await page.keyboard.press('Enter')
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'main-content')
      const navTargets = await page.locator('header nav a:visible').evaluateAll((nodes) => nodes.map((node) => {
        const rect = node.getBoundingClientRect()
        return { label: node.textContent?.trim(), width: rect.width, height: rect.height }
      }))
      assert.equal(navTargets.length, 1)
      assert.equal(navTargets[0]?.label, 'Sign in')
      assert.equal(navTargets.every((target) => target.width > 0 && target.height >= 40), true)
      const summary = page.locator('.faq-list summary').first()
      await summary.focus()
      await page.keyboard.press('Enter')
      assert.equal(await summary.evaluate((node) => (node.parentElement as HTMLDetailsElement).open), true)
      await page.keyboard.press('Space')
      assert.equal(await summary.evaluate((node) => (node.parentElement as HTMLDetailsElement).open), false)
      return { mobileNavigationTargets: navTargets }
    } finally {
      await context.close()
    }
  })

  await runCheck('theme system default and a persisted API preference resolve before first render', async () => {
    const context = await browser.newContext({
      colorScheme: 'dark',
      viewport: { width: 1280, height: 900 },
    })
    await addDeniedConsent(context)
    const page = await context.newPage()
    try {
      await page.goto(baseUrl, { waitUntil: 'load' })
      assert.equal(await page.locator('html').getAttribute('data-cs-theme-preference'), 'system')
      assert.equal(await page.locator('html').getAttribute('data-cs-theme'), 'dark')
      await page.evaluate(() => localStorage.setItem('creator-signal.theme.v1', 'light'))
      await page.reload({ waitUntil: 'load' })
      assert.equal(await page.locator('html').getAttribute('data-cs-theme-preference'), 'light')
      assert.equal(await page.locator('html').getAttribute('data-cs-theme'), 'light')
      assert.equal(await page.evaluate(() => localStorage.getItem('creator-signal.theme.v1')), 'light')
      await page.evaluate(() => localStorage.removeItem('creator-signal.theme.v1'))
      await page.reload({ waitUntil: 'load' })
      assert.equal(await page.evaluate(() => localStorage.getItem('creator-signal.theme.v1')), null)
      assert.equal(await page.locator('html').getAttribute('data-cs-theme-preference'), 'system')
      assert.equal(await page.locator('html').getAttribute('data-cs-theme'), 'dark')
    } finally {
      await context.close()
    }
  })

  await runCheck('both privacy choices remain operable when runtime analytics config is unavailable', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()
    try {
      await page.goto(baseUrl, { waitUntil: 'load' })
      const banner = page.locator('[data-consent-banner]')
      await banner.waitFor({ state: 'visible' })
      await page.getByRole('button', { name: 'Essential only' }).click()
      await banner.waitFor({ state: 'hidden' })
      assert.equal((await context.cookies()).find((cookie) =>
        cookie.name === 'cs_optional_analytics')?.value, 'denied')
      assert.equal(await page.getByRole('link', { name: 'Privacy', exact: true }).isVisible(), true)
      await context.clearCookies()
      await page.reload({ waitUntil: 'load' })
      await banner.waitFor({ state: 'visible' })
      await page.getByRole('button', { name: 'Allow optional analytics' }).click()
      await banner.waitFor({ state: 'hidden' })
      assert.equal((await context.cookies()).find((cookie) =>
        cookie.name === 'cs_optional_analytics')?.value, 'granted')
    } finally {
      await context.close()
    }
  })

  await runCheck('governed form exposes validation, success and failure feedback', async () => {
    const context = await browser.newContext({ viewport: { width: 900, height: 900 } })
    await addDeniedConsent(context)
    const page = await context.newPage()
    await routeMarketing(page)
    try {
      await page.goto(`${baseUrl}/contact?formResult=success`, { waitUntil: 'load' })
      const form = page.locator('[data-form-mount] form')
      await form.waitFor({ state: 'attached' })
      await page.getByRole('button', { name: 'Send message' }).click()
      const email = page.getByLabel('Email address')
      assert.equal(await email.getAttribute('aria-invalid'), 'true')
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'acceptance-email')
      assert.equal(await page.locator('[data-cs-mautic-form]').getAttribute('aria-busy'), null)
      await email.fill('creator@example.com')
      await page.getByLabel('Message').fill('Please send a useful signal.')
      await page.getByRole('button', { name: 'Send message' }).click()
      assert.equal(await page.locator('[data-cs-mautic-form]').getAttribute('aria-busy'), 'true')
      assert.equal(await page.getByRole('button', { name: 'Send message' }).isDisabled(), true)
      await page.getByText('Sending...', { exact: true }).waitFor()
      await form.waitFor({ state: 'hidden' })
      await page.getByText('Thanks — your message has been received.', { exact: true }).waitFor()

      await page.goto(`${baseUrl}/contact?formResult=failure`, { waitUntil: 'load' })
      await page.locator('[data-form-mount] form').waitFor({ state: 'attached' })
      await page.getByLabel('Email address').fill('creator@example.com')
      await page.getByLabel('Message').fill('Please retry this signal.')
      await page.getByRole('button', { name: 'Send message' }).click()
      await page.getByText('The form could not be sent. Please try again.', { exact: true }).waitFor()
      assert.equal(await page.locator('[data-form-mount]').isVisible(), true)
      assert.equal(await page.locator('[data-cs-mautic-form]').getAttribute('aria-busy'), null)
      assert.equal(await page.getByRole('button', { name: 'Send message' }).isEnabled(), true)

      await page.goto(`${baseUrl}/early-access`, { waitUntil: 'load' })
      await page.locator('[data-form-mount] form').waitFor({ state: 'attached' })
      assert.equal(await page.locator('[data-cs-mautic-form]').count(), 1)
      assert.equal(await page.locator('[data-cs-mautic-form]').getAttribute('data-form-alias'), 'creator_signal_wishlist')
      assert.equal(await page.locator('[data-cs-mautic-form]').getAttribute('data-campaign-code'), 'early_access')
      assert.equal(await page.getByRole('radio').count(), 3)
      await page.getByText('Which updates would you like?', { exact: true }).waitFor()
    } finally {
      await context.close()
    }
  })

  await runCheck('governed form exposes a non-destructive unavailable state', async () => {
    const context = await browser.newContext({ viewport: { width: 900, height: 900 } })
    await addDeniedConsent(context)
    const page = await context.newPage()
    await routeMarketing(page, false)
    try {
      await page.goto(`${baseUrl}/contact`, { waitUntil: 'load' })
      await page.getByText('The form is temporarily unavailable.', { exact: true }).waitFor()
      assert.equal(await page.locator('[data-form-mount] form').count(), 0)
    } finally {
      await context.close()
    }
  })

  await runCheck('200 percent reflow and comparison overflow stay inside their components', async () => {
    const context = await browser.newContext({ viewport: { width: 640, height: 900 } })
    await addDeniedConsent(context)
    const page = await context.newPage()
    try {
      for (const route of ['/legal/privacy', '/pricing']) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: 'load' })
        await waitForPage(page)
        assert.equal(await page.evaluate(() =>
          document.documentElement.scrollWidth > document.documentElement.clientWidth,
        ), false, route)
      }
      const region = page.locator('.comparison-table-scroll')
      assert.equal(await region.getAttribute('role'), 'region')
      const regionLabel = await region.getAttribute('aria-label')
      assert(regionLabel)
      assert.equal(regionLabel, await region.locator('caption').textContent())
      assert.equal(await region.getAttribute('tabindex'), '0')
      assert.equal(await region.evaluate((node) => node.scrollWidth >= node.clientWidth), true)
    } finally {
      await context.close()
    }
  })

  await runCheck('reduced motion removes transitions and hover movement', async () => {
    const context = await browser.newContext({
      reducedMotion: 'reduce',
      viewport: { width: 1280, height: 900 },
    })
    await addDeniedConsent(context)
    const page = await context.newPage()
    try {
      await page.goto(baseUrl, { waitUntil: 'load' })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true)
      const button = page.locator('.button').first()
      await button.hover()
      const motion = await button.evaluate((node) => {
        const style = getComputedStyle(node)
        return { transitionDuration: style.transitionDuration, transform: style.transform }
      })
      assert.match(motion.transitionDuration, /^(0s)(, 0s)*$/)
      assert.equal(motion.transform, 'none')
      return motion
    } finally {
      await context.close()
    }
  })

  await runCheck('forced colors preserves labelled actions, boundaries and focus', async () => {
    const context = await browser.newContext({
      forcedColors: 'active',
      viewport: { width: 1280, height: 900 },
    })
    await addDeniedConsent(context)
    const page = await context.newPage()
    try {
      await page.goto(`${baseUrl}/pricing`, { waitUntil: 'load' })
      const action = page.locator('.button').first()
      await action.focus()
      const contract = await action.evaluate((node) => {
        const style = getComputedStyle(node)
        const rect = node.getBoundingClientRect()
        return {
          label: node.textContent?.trim(),
          width: rect.width,
          height: rect.height,
          borderStyle: style.borderStyle,
          outlineStyle: style.outlineStyle,
        }
      })
      assert(contract.label)
      assert(contract.width > 0 && contract.height >= 44)
      assert.notEqual(contract.borderStyle, 'none')
      assert.notEqual(contract.outlineStyle, 'none')
      return contract
    } finally {
      await context.close()
    }
  })

  await runCheck('broken media and long unbroken content do not hide actions or overflow the page', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    await addDeniedConsent(context)
    const page = await context.newPage()
    await page.route('**/*', async (route) => {
      if (route.request().resourceType() === 'image') return route.abort('failed')
      return route.continue()
    })
    try {
      await page.goto(baseUrl, { waitUntil: 'load' })
      await waitForPage(page)
      const before = await page.locator('.hero-art').evaluate((node) => node.getBoundingClientRect().height)
      assert(before >= 250)
      await page.locator('h1').evaluate((node) => {
        node.textContent = `CreatorSignal${'UnbrokenSignal'.repeat(40)}`
      })
      await page.locator('main p').first().evaluate((node) => {
        node.textContent = 'LongContent'.repeat(80)
      })
      assert.equal(await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ), false)
      assert.equal(await page.getByRole('link', { name: 'Explore Sales Pulse' }).first().isVisible(), true)
    } finally {
      await context.close()
    }
  })

  await runCheck('unknown routes publish governed noindex 404 recovery', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    await addDeniedConsent(context)
    const page = await context.newPage()
    try {
      const response = await page.goto(`${baseUrl}/this-route-does-not-exist`, { waitUntil: 'load' })
      assert.equal(response?.status(), 404)
      assert.equal(await page.locator('[data-recovery-state]').getAttribute('data-recovery-state'), 'not-found')
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, follow, noarchive')
      assert.equal(await page.getByRole('link', { name: 'Return home' }).getAttribute('href'), '/')
    } finally {
      await context.close()
    }
  })

  const visualScenarios: readonly VisualScenario[] = [
    { name: 'home-desktop-system-light', route: '/', viewport: { width: 1440, height: 900 }, colorScheme: 'light', includeConsent: true },
    { name: 'early-access-mobile-light', route: '/early-access', viewport: { width: 390, height: 844 }, colorScheme: 'light', theme: 'light' },
    { name: 'products-tablet-dark', route: '/products', viewport: { width: 900, height: 900 }, colorScheme: 'dark', theme: 'dark' },
    { name: 'sales-pulse-mobile-light', route: '/products/sales-pulse', viewport: { width: 390, height: 844 }, colorScheme: 'light', theme: 'light' },
    { name: 'pricing-desktop-dark', route: '/pricing', viewport: { width: 1440, height: 900 }, colorScheme: 'dark', theme: 'dark' },
    { name: 'contact-mobile-light', route: '/contact', viewport: { width: 390, height: 844 }, colorScheme: 'light', theme: 'light' },
    { name: 'privacy-reflow-light', route: '/legal/privacy', viewport: { width: 640, height: 900 }, colorScheme: 'light', theme: 'light', fullPage: false },
    { name: 'not-found-mobile-dark', route: '/404', viewport: { width: 390, height: 844 }, colorScheme: 'dark', theme: 'dark' },
    { name: 'empty-state-desktop-light', route: '/__acceptance/state/empty', viewport: { width: 1280, height: 900 }, colorScheme: 'light', theme: 'light' },
    { name: 'error-state-desktop-light', route: '/__acceptance/state/error', viewport: { width: 1280, height: 900 }, colorScheme: 'light', theme: 'light' },
    { name: 'offline-state-desktop-light', route: '/__acceptance/state/offline', viewport: { width: 1280, height: 900 }, colorScheme: 'light', theme: 'light' },
    { name: 'patterns-tablet-light', route: '/__acceptance/patterns', viewport: { width: 900, height: 900 }, colorScheme: 'light', theme: 'light' },
  ]

  await mkdir(actualDirectory, { recursive: true })
  await mkdir(baselineDirectory, { recursive: true })
  const expectedBaselineFiles = visualScenarios.map((scenario) => `${scenario.name}.png`).sort()
  const existingBaselineFiles = (await readdir(baselineDirectory))
    .filter((file) => file.endsWith('.png'))
    .sort()
  if (existingBaselineFiles.length > 0) {
    if (updateBaselines) {
      assert.deepEqual(
        existingBaselineFiles.filter((file) => !expectedBaselineFiles.includes(file)),
        [],
        'The committed baseline roster contains a scenario that is no longer governed.',
      )
    } else {
      assert.deepEqual(
        existingBaselineFiles,
        expectedBaselineFiles,
        'The committed baseline roster differs from the governed scenario roster.',
      )
    }
  }

  for (const scenario of visualScenarios) {
    const context = await browser.newContext({
      colorScheme: scenario.colorScheme,
      viewport: scenario.viewport,
    })
    if (!scenario.includeConsent) await addDeniedConsent(context)
    if (scenario.theme) {
      await context.addInitScript((theme) => {
        localStorage.setItem('creator-signal.theme.v1', theme)
      }, scenario.theme)
    }
    const page = await context.newPage()
    await routeMarketing(page)
    const baselinePath = resolve(baselineDirectory, `${scenario.name}.png`)
    const actualPath = resolve(actualDirectory, `${scenario.name}.png`)
    const relativeBaseline = `integrations/creator-signal/acceptance/baselines/${scenario.name}.png`
    const relativeActual = `.tmp/creator-signal-public-acceptance/actual/${scenario.name}.png`
    try {
      await page.goto(`${baseUrl}${scenario.route}`, { waitUntil: 'load' })
      await waitForPage(page)
      if (scenario.route === '/contact') {
        await page.locator('[data-form-mount] form').waitFor({ state: 'attached' })
      }
      const screenshot = await page.screenshot({
        fullPage: scenario.fullPage ?? true,
        animations: 'disabled',
      })
      await Bun.write(actualPath, screenshot)
      if (updateBaselines) {
        await Bun.write(baselinePath, screenshot)
        const metadata = await sharp(screenshot).metadata()
        visuals.push({
          name: scenario.name,
          pass: true,
          baseline: relativeBaseline,
          actual: relativeActual,
          width: metadata.width,
          height: metadata.height,
          updated: true,
        })
        console.log(`UPDATED visual ${scenario.name}`)
        continue
      }
      if (!(await Bun.file(baselinePath).exists())) {
        throw new Error(`Missing committed visual baseline: ${relativeBaseline}`)
      }
      const [baseline, actual] = await Promise.all([
        sharp(await readFile(baselinePath)).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
        sharp(screenshot).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
      ])
      assert.equal(actual.info.width, baseline.info.width, 'screenshot width changed')
      assert.equal(actual.info.height, baseline.info.height, 'screenshot height changed')
      let differentPixels = 0
      let channelDelta = 0
      for (let offset = 0; offset < actual.data.length; offset += actual.info.channels) {
        let pixelDelta = 0
        for (let channel = 0; channel < actual.info.channels; channel++) {
          const delta = Math.abs(actual.data[offset + channel] - baseline.data[offset + channel])
          pixelDelta = Math.max(pixelDelta, delta)
          channelDelta += delta
        }
        if (pixelDelta > 12) differentPixels++
      }
      const pixels = actual.info.width * actual.info.height
      const differentPixelRatio = differentPixels / pixels
      const meanChannelDelta = channelDelta / actual.data.length
      const pass = differentPixelRatio <= 0.003 && meanChannelDelta <= 0.3
      visuals.push({
        name: scenario.name,
        pass,
        baseline: relativeBaseline,
        actual: relativeActual,
        width: actual.info.width,
        height: actual.info.height,
        differentPixels,
        differentPixelRatio,
        meanChannelDelta,
        ...(pass ? {} : { error: 'Visual difference exceeds the governed tolerance.' }),
      })
      console.log(`${pass ? 'PASS' : 'FAIL'} visual ${scenario.name}`)
    } catch (error) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error)
      visuals.push({
        name: scenario.name,
        pass: false,
        baseline: relativeBaseline,
        actual: relativeActual,
        error: message,
      })
      console.error(`FAIL visual ${scenario.name}: ${message}`)
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
  server.stop(true)
}

const report = {
  schema: 'creator-signal-public-acceptance/v1',
  generatedAt: new Date().toISOString(),
  pluginVersion: creatorSignalPluginVersion,
  source: 'locally published Creator Signal Instatic pack',
  baselineMode: updateBaselines ? 'update' : 'compare',
  summary: {
    checks: checks.length,
    checksPassed: checks.filter((check) => check.pass).length,
    checksFailed: checks.filter((check) => !check.pass).length,
    visuals: visuals.length,
    visualsPassed: visuals.filter((visual) => visual.pass).length,
    visualsFailed: visuals.filter((visual) => !visual.pass).length,
  },
  checks,
  visuals,
}

await mkdir(outputDirectory, { recursive: true })
await Bun.write(resolve(outputDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)

if (report.summary.checksFailed > 0 || report.summary.visualsFailed > 0) {
  throw new Error(
    `Creator Signal public acceptance failed: ${report.summary.checksFailed} check(s), ` +
    `${report.summary.visualsFailed} visual(s). See ${resolve(outputDirectory, 'report.json')}`,
  )
}

console.log(
  `Creator Signal public acceptance passed: ${report.summary.checksPassed} checks and ` +
  `${report.summary.visualsPassed} visuals. Evidence: ${outputDirectory}`,
)
