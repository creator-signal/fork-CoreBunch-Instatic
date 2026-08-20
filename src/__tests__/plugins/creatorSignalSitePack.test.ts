import { describe, expect, it } from 'bun:test'
import '@modules/base'
import { componentLibraryPatternRegistry } from '@core/component-library'
import { registry } from '@core/module-engine'
import { publishPage } from '@core/publisher'
import { validateSite } from '@core/persistence/validate'
import { composeTemplateChain } from '@core/templates'
import { pluginModuleToHostModule } from '@core/plugins/moduleAdapter'
import { makeRegistry, makeSite } from '../publisher/helpers'
import creatorSignalPlugin from '../../../integrations/creator-signal/instatic-plugin.config'
import {
  creatorSignalComponentEntries,
  creatorSignalComponentLibraryEntries,
  creatorSignalHeroEntry,
  creatorSignalPatternDefinitions,
  creatorSignalPatternEntries,
  creatorSignalRecoveryStateEntry,
} from '../../../integrations/creator-signal/component-library'
import mauticForm, { creatorSignalSiteCss } from '../../../integrations/creator-signal/modules/mautic-form'
import {
  campaignHero,
  callToAction,
  comparisonSection,
  consentBanner,
  faq,
  featureGrid,
  founderStory,
  pricingPlans,
  processSteps,
  publicDocument,
  recoveryState,
  richTextSection,
  signalComparison,
  signalStrip,
  siteFooter,
  siteHeader,
  testimonial,
} from '../../../integrations/creator-signal/modules/site-components'
import {
  creatorSignalPageAuthoringReference,
  creatorSignalNotFoundAuthoringReference,
  pack,
} from '../../../integrations/creator-signal/pack/site'
import { creatorSignalRenderProfile } from '../../../integrations/creator-signal/pack/design-system'
import { creatorSignalPublicRouteSlugs } from '../../../integrations/creator-signal/pack/routes'

const publicPages = pack.pages.filter((page) => !page.template)
const templatePage = pack.pages.find((page) => page.template?.target.kind === 'everywhere')
const notFoundTemplate = pack.pages.find((page) => page.template?.target.kind === 'notFound')

describe('Creator Signal site pack', () => {
  it('contains the complete public launch route set plus shared and not-found templates', () => {
    expect(publicPages.map((page) => page.slug)).toEqual(creatorSignalPublicRouteSlugs)
    expect(templatePage).toMatchObject({
      slug: 'creator-signal-site-template',
      template: {
        enabled: true,
        target: { kind: 'everywhere' },
        priority: 0,
      },
    })
    expect(notFoundTemplate).toMatchObject({
      slug: 'creator-signal-not-found',
      template: {
        enabled: true,
        target: { kind: 'notFound' },
        priority: 0,
      },
      seo: {
        canonicalUrl: 'https://creatorsignal.me/404',
        robots: { index: false, follow: true, archive: false },
      },
    })
    expect(creatorSignalNotFoundAuthoringReference).toEqual({
      route: '/404',
      title: 'Page not found',
      description: 'The requested Creator Signal page could not be found.',
      patternId: 'creator-signal.site.pattern.not-found-state',
      componentEntryIds: ['creator-signal.site.recovery-state'],
    })
  })

  it('passes the authoring persistence boundary as a complete governed site', () => {
    expect(() => validateSite(makeSite({
      pages: pack.pages,
      visualComponents: pack.visualComponents,
      styleRules: Object.fromEntries(pack.classes.map((rule) => [rule.id, rule])),
    }))).not.toThrow()
  })

  it('injects the governed identity and first-render theme runtime into published pages', () => {
    expect(creatorSignalPlugin.manifest.frontend?.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'script',
          src: 'frontend/theme-bootstrap.js',
          placement: 'head',
          strategy: 'sync',
        }),
        expect.objectContaining({
          kind: 'link',
          attrs: expect.objectContaining({
            rel: 'icon',
            href: 'assets/design-system/brand/favicon.ico',
          }),
        }),
        expect.objectContaining({
          kind: 'link',
          attrs: expect.objectContaining({
            rel: 'manifest',
            href: 'assets/design-system/site.webmanifest',
          }),
        }),
        expect.objectContaining({
          kind: 'script',
          src: 'frontend/theme-control.js',
          placement: 'body-end',
          strategy: 'module',
        }),
      ]),
    )
    const themeScripts = creatorSignalPlugin.manifest.frontend?.assets
      .filter((asset) => asset.kind === 'script')
      .map((asset) => asset.src)
    expect(themeScripts).toEqual(expect.arrayContaining([
      creatorSignalRenderProfile.theme.bootstrapAsset,
      creatorSignalRenderProfile.theme.controlAsset,
    ]))
  })

  it('owns one render profile for pack compilation, canvas modules and public output', () => {
    expect(creatorSignalRenderProfile.id).toBe('creator-signal.public/v1')
    expect(creatorSignalSiteCss.startsWith(`${creatorSignalRenderProfile.stylesheet}\n`)).toBe(true)
    expect(creatorSignalRenderProfile.stylesheet).toContain(
      `/* ${creatorSignalRenderProfile.stylesheetMarker} */`,
    )

    for (const query of Object.values(creatorSignalRenderProfile.responsiveQueries)) {
      expect(creatorSignalRenderProfile.stylesheet).toContain(`@media ${query}`)
    }
    for (const preference of creatorSignalRenderProfile.theme.preferences) {
      expect(siteHeader.render(siteHeader.defaults, []).html).toContain(`value="${preference}"`)
    }
    expect(creatorSignalRenderProfile.stylesheet).toContain(
      `[${creatorSignalRenderProfile.theme.themeAttribute}="dark"]`,
    )
    expect(creatorSignalRenderProfile.stylesheet).toContain('.hero-art img')
    expect(creatorSignalRenderProfile.stylesheet).toContain('object-fit: cover')
    expect(creatorSignalRenderProfile.stylesheet).toContain('.button-secondary')
    expect(creatorSignalRenderProfile.stylesheet).toContain('[data-recovery-state="error"]')
  })

  it('advances the technical-pack version for the template authoring contract', () => {
    const hero = pack.visualComponents.find(
      (component) => component.id === 'creator-signal.site/component/hero',
    )
    const parameterIds = hero?.params.map((parameter) => parameter.id) ?? []

    expect(creatorSignalPlugin.manifest.version).toBe('0.3.4')
    expect(parameterIds).toContain('creator-signal.site.hero.heading')
    expect(parameterIds.some((id) => id.startsWith(`${hero?.id}/param/`))).toBe(false)
  })

  it('keeps shared header, footer and consent content in the template only', () => {
    const moduleIds = Object.values(templatePage?.nodes ?? {}).map((node) => node.moduleId)
    expect(moduleIds.filter((id) => id === 'base.outlet')).toHaveLength(1)
    expect(moduleIds).toEqual(expect.arrayContaining([
      'creator-signal.site.header',
      'creator-signal.site.footer',
      'creator-signal.site.consent-banner',
    ]))

    for (const page of publicPages) {
      const pageModuleIds = Object.values(page.nodes).map((node) => node.moduleId)
      expect(pageModuleIds).not.toContain('base.outlet')
      expect(pageModuleIds).not.toContain('creator-signal.site.header')
      expect(pageModuleIds).not.toContain('creator-signal.site.footer')
      expect(pageModuleIds).not.toContain('creator-signal.site.consent-banner')
    }

    for (const entryId of [
      'creator-signal.site.header',
      'creator-signal.site.footer',
      'creator-signal.site.consent-banner',
    ]) {
      const entry = creatorSignalComponentLibraryEntries.find(
        (candidate) => candidate.id === entryId,
      )
      expect(entry?.constraints.allowedDocumentKinds).toEqual(['template'])
      expect(entry?.constraints.maxInstancesPerDocument).toBe(1)
      expect(entry?.documentation.usage).toContain('Read-only')
      expect(entry?.documentation.usage).toContain('technical pack')
      expect(entry?.fields.every((field) => Boolean(field.description))).toBe(true)
    }

    for (const entry of creatorSignalComponentLibraryEntries.filter(
      (candidate) => !candidate.constraints.allowedDocumentKinds?.includes('template'),
    )) {
      expect(entry.constraints.allowedDocumentKinds).toEqual(['page'])
    }

    expect(creatorSignalRecoveryStateEntry.constraints.allowedDocumentKinds)
      .toEqual(['page', 'template'])
    expect(creatorSignalPatternEntries.find(
      (entry) => entry.id === 'creator-signal.site.pattern.not-found-state',
    )?.constraints.allowedDocumentKinds).toEqual(['template'])
  })

  it('uses governed leaf components with typed repeaters instead of authored child slots', () => {
    for (const entry of creatorSignalComponentEntries) {
      expect(entry.composition).toBe('leaf')
      expect(entry.slots).toEqual([])
    }

    for (const page of publicPages) {
      const body = page.nodes[page.rootNodeId]
      expect(body.children).toHaveLength(1)
      const pattern = page.nodes[body.children[0]!]
      expect(pattern.catalogueInstance?.entryId).toStartWith('creator-signal.site.pattern.')
      expect(pattern.catalogueInstance?.pattern?.authorableNodeIds).toEqual(pattern.children)
      for (const nodeId of pattern.children) {
        const component = page.nodes[nodeId]
        expect(component.catalogueInstance?.entryId).toStartWith('creator-signal.site.')
        expect(component.children).toEqual([])
      }
    }

    const featuresPage = publicPages.find((page) => page.slug === 'features')
    const featureNode = Object.values(featuresPage?.nodes ?? {}).find(
      (node) => node.moduleId === 'creator-signal.site.feature-grid',
    )
    expect(featureNode?.props.items).toBeArrayOfSize(6)
    expect(featureNode?.props.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        marker: '01',
        heading: 'Sales imports',
      }),
    ]))
  })

  it('materializes every governed public pattern through the editor registry', () => {
    expect(creatorSignalPatternDefinitions.map((definition) => definition.id))
      .toEqual(creatorSignalPatternEntries.map((entry) => entry.id))

    for (const entry of creatorSignalPatternEntries) {
      const fragment = componentLibraryPatternRegistry.materialize(entry.id, {
        entryId: entry.id,
        entryVersion: entry.version,
        variantId: 'default',
      })
      const root = fragment?.nodes[fragment.rootIds[0]!]
      expect(root?.catalogueInstance?.entryId).toBe(entry.id)
      expect(root?.catalogueInstance?.pattern?.authorableNodeIds).toHaveLength(
        root?.children.length ?? 0,
      )
      expect(new Set(entry.constraints.allowedChildEntryIds)).toEqual(new Set(
        root?.children.map((nodeId) => fragment?.nodes[nodeId]?.catalogueInstance?.entryId),
      ))
    }
  })

  it('seeds every public route from its registered governed page pattern', () => {
    for (const reference of creatorSignalPageAuthoringReference) {
      const slug = reference.route === '/' ? 'index' : reference.route.slice(1)
      const page = publicPages.find((candidate) => candidate.slug === slug)!
      const body = page.nodes[page.rootNodeId]
      const pattern = page.nodes[body.children[0]!]
      expect(pattern.catalogueInstance?.entryId).toBe(reference.patternId)
      expect(pattern.children.map(
        (nodeId) => page.nodes[nodeId]?.catalogueInstance?.entryId,
      )).toEqual(reference.componentEntryIds)
    }
  })

  it('builds the Home v2 flow from the governed campaign modules in design order', () => {
    const home = creatorSignalPageAuthoringReference.find((page) => page.route === '/')

    expect(home).toEqual(expect.objectContaining({
      patternId: 'creator-signal.site.pattern.home-v2-page',
      componentEntryIds: [
        'creator-signal.site.campaign-hero',
        'creator-signal.site.signal-strip',
        'creator-signal.site.signal-comparison',
        'creator-signal.site.feature-grid',
        'creator-signal.site.process-steps',
        'creator-signal.site.feature-grid',
        'creator-signal.site.feature-grid',
        'creator-signal.site.pricing-plans',
        'creator-signal.site.founder-story',
        'creator-signal.site.faq',
        'creator-signal.site.call-to-action',
      ],
    }))
  })

  it('keeps identity, sign-up, onboarding and dashboard ownership outside Instatic', () => {
    expect(creatorSignalPublicRouteSlugs).not.toContain('sign-up')
    expect(creatorSignalPublicRouteSlugs).not.toContain('login')
    expect(creatorSignalPublicRouteSlugs).not.toContain('onboarding')
    expect(creatorSignalPublicRouteSlugs).not.toContain('sales-pulse')

    const items = siteHeader.defaults.items as Array<{ label: string, url: string }>
    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'Log in',
        url: 'https://salespulse.creatorsignal.me/api/auth/login?returnTo=/sales-pulse',
      }),
      expect.objectContaining({
        label: 'Get started free',
        url: 'https://salespulse.creatorsignal.me/sign-up',
      }),
    ]))
  })

  it('replaces the legacy pricing feature grid with the governed comparison pattern', () => {
    const pricing = creatorSignalPageAuthoringReference.find((page) => page.route === '/pricing')
    expect(pricing?.patternId).toBe('creator-signal.site.pattern.pricing-page')
    expect(pricing?.componentEntryIds).toEqual([
      'creator-signal.site.hero',
      'creator-signal.site.comparison-section',
      'creator-signal.site.call-to-action',
    ])
  })

  it('promotes privacy and terms from legacy prose layouts to the legal/trust pattern', () => {
    for (const route of ['/legal/privacy', '/legal/terms']) {
      const reference = creatorSignalPageAuthoringReference.find((page) => page.route === route)
      expect(reference?.patternId).toBe('creator-signal.site.pattern.legal-trust-page')
      expect(reference?.componentEntryIds).toEqual(['creator-signal.site.public-document'])
    }
  })

  it('stores coherent legal prose in one rich-text field per section', () => {
    const legalPages = publicPages.filter((page) =>
      page.slug.startsWith('legal/') ||
      page.slug.startsWith('trust/') ||
      page.slug === 'support' ||
      page.slug === 'help/account-data' ||
      page.slug === 'status')

    expect(legalPages).toHaveLength(12)
    for (const page of legalPages) {
      const proseNodes = Object.values(page.nodes).filter((node) =>
        node.moduleId === 'creator-signal.site.rich-text-section' ||
        node.moduleId === 'creator-signal.site.public-document')
      expect(proseNodes).toHaveLength(1)
      expect(proseNodes[0].props.body).toContain('<p>Version 2026-08-02. Effective 2 August 2026.</p>')
      expect(proseNodes[0].props.body).toContain('INSIGHT VISION PTY LTD (ACN 601 335 460), Australia')
      expect(proseNodes[0].props.body).not.toMatch(/draft|must receive final jurisdiction-specific legal approval/i)
    }
  })

  it('turns every public intake page into a governed alias-resolved Mautic component', () => {
    const forms = [
      ['contact', 'creator_signal_contact'],
      ['feedback', 'creator_signal_feedback'],
      ['wishlist', 'creator_signal_wishlist'],
      ['early-access', 'creator_signal_wishlist'],
      ['ask-a-question', 'creator_signal_question'],
      ['feature-request', 'creator_signal_feature_request'],
      ['report-an-error', 'creator_signal_error_report'],
    ]

    for (const [slug, alias] of forms) {
      const page = publicPages.find((candidate) => candidate.slug === slug)
      const formNode = Object.values(page?.nodes ?? {}).find(
        (node) => node.moduleId === 'creator-signal.site.mautic-form',
      )
      expect(formNode?.catalogueInstance?.entryId).toBe('creator-signal.site.mautic-form')
      expect(formNode?.props).toMatchObject({
        mauticBaseUrl: 'https://marketing.creatorsignal.me',
        formAlias: alias,
        registryPath: '/media/creator-signal/forms-v1.js',
        formCode: alias,
      })
      expect(formNode?.props).not.toHaveProperty('formId')
      expect(formNode?.props).not.toHaveProperty('formApiName')
    }
  })

  it('loads only governed Mautic registry entries and rejects missing generated markup', () => {
    const output = mauticForm.render(mauticForm.defaults, [])

    expect(output.html).toContain('data-form-alias="creator_signal_contact"')
    expect(output.html).toMatch(/^\s*<section class="content-section" id="managed-form">/)
    expect(output.html).toContain('data-registry-path="/media/creator-signal/forms-v1.js"')
    expect(output.html).not.toContain('data-form-id=')
    expect(output.html).not.toContain('data-form-api-name=')
    expect(output.js).toContain("registry.schema !== 'creator-signal.mautic-forms/v1'")
    expect(output.js).toContain("new Error('form_markup_missing')")
    expect(output.js).toContain("dispatch(root, 'failure', 'registry_invalid')")
    expect(output.js).toContain("status.textContent = 'Sending...'")
    expect(output.js).toContain('if (!form.checkValidity()) return')
    expect(output.js).toContain("setAttribute('aria-busy', 'true')")
    expect(output.js).toContain("control.dataset.csBusyDisabled = 'true'")
    expect(output.css).toContain('.mauticform-errormsg[hidden] { display: none; }')
  })

  it('uses one noindex wishlist form for the complete early-access choice flow', () => {
    const reference = creatorSignalPageAuthoringReference.find(
      (page) => page.route === '/early-access',
    )
    const page = publicPages.find((candidate) => candidate.slug === 'early-access')!
    const formNodes = Object.values(page.nodes).filter(
      (node) => node.moduleId === 'creator-signal.site.mautic-form',
    )

    expect(reference).toEqual(expect.objectContaining({
      patternId: 'creator-signal.site.pattern.early-access-page',
      componentEntryIds: [
        'creator-signal.site.campaign-hero',
        'creator-signal.site.signal-strip',
        'creator-signal.site.feature-grid',
        'creator-signal.site.mautic-form',
        'creator-signal.site.feature-grid',
        'creator-signal.site.feature-grid',
        'creator-signal.site.testimonial',
      ],
    }))
    expect(formNodes).toHaveLength(1)
    expect(formNodes[0]?.props).toMatchObject({
      sectionId: 'early-access-form',
      formAlias: 'creator_signal_wishlist',
      formCode: 'creator_signal_wishlist',
      campaignCode: 'early_access',
    })
    expect(formNodes[0]?.props.introduction).toContain('launch notification, early testing or both')
    expect(page.seo?.robots).toEqual({ index: false, follow: true, archive: false })
  })

  it('publishes page-level SEO and semantic structured-data markup', () => {
    for (const page of publicPages) {
      expect(typeof page.seo?.description).toBe('string')
      expect(page.seo?.canonicalUrl).toStartWith('https://creatorsignal.me')
      expect(page.seo?.language).toBe('en-AU')
      expect(page.seo?.robots).toEqual(page.slug === 'early-access'
        ? { index: false, follow: true, archive: false }
        : { index: true, follow: true, archive: true })
      expect(typeof page.seo?.openGraph?.title).toBe('string')
      expect(typeof page.seo?.openGraph?.description).toBe('string')
      expect(page.seo?.twitter?.card).toBe('summary')
      expect(typeof page.seo?.twitter?.title).toBe('string')
    }

    expect(siteHeader.render(siteHeader.defaults, []).html).toContain('https://schema.org/SiteNavigationElement')
    expect(siteFooter.render(siteFooter.defaults, []).html).toContain('https://schema.org/SiteNavigationElement')
    expect(faq.render(faq.defaults, []).html).toContain('https://schema.org/FAQPage')
    expect(publicDocument.render(publicDocument.defaults, []).html).toContain('https://schema.org/Article')
  })

  it('publishes the shared template and governed home components as one semantic document', () => {
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
    const home = publicPages.find((page) => page.slug === 'index')!
    const composed = composeTemplateChain([templatePage!], { kind: 'page', page: home })
    const site = makeSite({
      pages: pack.pages,
      visualComponents: pack.visualComponents,
      styleRules: Object.fromEntries(pack.classes.map((rule) => [rule.id, rule])),
    })
    const output = publishPage(composed, site, makeRegistry(modules)).html

    expect(output.match(/<header class="site-header">/g)).toHaveLength(1)
    expect(output.match(/<footer class="site-footer">/g)).toHaveLength(1)
    expect(output.match(/data-consent-banner/g)).toHaveLength(1)
    expect(output.match(/<h1/g)).toHaveLength(1)
    expect(output).toContain('<main id="main-content" tabindex="-1">')
    expect(output).toContain('<meta name="description"')
    expect(output).toContain('<html lang="en-AU">')
    expect(output).toContain('<link rel="canonical" href="https://creatorsignal.me/">')
    expect(output).toContain('property="og:title"')
    expect(output).toContain('name="twitter:card" content="summary"')
    expect(output).toContain('class="feature-grid feature-grid-3"')
    expect(output).toContain('data-analytics-choice="granted"')
    expect(output.match(/creator-signal-site-design-contract/g)).toHaveLength(1)
    expect(output).toContain('data-cs-theme-control')
    expect(output).toContain('creator-signal-mark-light.svg')
    expect(output).toContain('sales-pulse-social.png')
    expect(output).toContain('Let&#x27;s see what&#x27;s working')
    expect(output).not.toContain('&amp;#x27;')
    expect(output).not.toContain('&amp;amp;')
    expect(output).toContain('href="https://salespulse.creatorsignal.me/sign-up"')
    expect(output).toContain('href="https://salespulse.creatorsignal.me/api/auth/login?returnTo=/sales-pulse"')
    expect(output).not.toContain('class="signal-visual"')
  })

  it('publishes the governed not-found template through the shared site chrome', () => {
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
    const composed = composeTemplateChain([templatePage!], { kind: 'page', page: notFoundTemplate! })
    const site = makeSite({
      pages: pack.pages,
      visualComponents: pack.visualComponents,
      styleRules: Object.fromEntries(pack.classes.map((rule) => [rule.id, rule])),
    })
    const output = publishPage(composed, site, makeRegistry(modules)).html

    expect(output).toContain('<main id="main-content" tabindex="-1">')
    expect(output).toContain('data-recovery-state="not-found"')
    expect(output).toContain('<h1 id="not-found-state">We cannot find that page</h1>')
    expect(output).toContain('<meta name="robots" content="noindex, follow, noarchive">')
    expect(output.match(/<header class="site-header">/g)).toHaveLength(1)
    expect(output.match(/<footer class="site-footer">/g)).toHaveLength(1)
  })

  it('makes every governed module independently previewable with the shared design contract', () => {
    for (const definition of [
      siteHeader,
      siteFooter,
      consentBanner,
      campaignHero,
      signalStrip,
      signalComparison,
      featureGrid,
      processSteps,
      pricingPlans,
      founderStory,
      callToAction,
      richTextSection,
      testimonial,
      faq,
      comparisonSection,
      recoveryState,
      publicDocument,
      mauticForm,
    ]) {
      const published = definition.render(definition.defaults, [])
      const previewed = (definition.preview ?? definition.render)(definition.defaults, [])
      expect(published.css).toBe(creatorSignalSiteCss)
      expect(previewed.html).toBe(published.html)
      expect(previewed.css).toBe(published.css)
    }
  })

  it('renders semantic comparison and recovery patterns without colour-only meaning', () => {
    const comparison = comparisonSection.render(comparisonSection.defaults, []).html
    expect(comparison).toContain('<caption>Creator Signal option comparison</caption>')
    expect(comparison).toContain('<th scope="col">Criteria</th>')
    expect(comparison).toContain('<th scope="row">Primary use</th>')

    for (const [state, label] of [
      ['empty', 'No content yet'],
      ['error', 'Something went wrong'],
      ['offline', 'Connection unavailable'],
      ['not-found', 'Page not found'],
    ] as const) {
      const output = recoveryState.render(
        { ...recoveryState.defaults, state },
        [],
      ).html
      expect(output).toContain(`data-recovery-state="${state}"`)
      expect(output).toContain(label)
      expect(output).toContain('class="button button-primary"')
    }
  })

  it('keeps the later call-to-action treatment secondary to the page action', () => {
    const output = callToAction.render(callToAction.defaults, []).html
    expect(output).toContain('class="button button-secondary"')
    expect(output).not.toContain('class="button button-primary"')
  })

  it('preserves the consent runtime hooks and sanitised rich-text boundary', () => {
    const consent = consentBanner.render(consentBanner.defaults, []).html
    expect(consent).toContain('data-consent-banner')
    expect(consent).toContain('data-analytics-choice="denied"')
    expect(consent).toContain('data-analytics-choice="granted"')
    expect(richTextSection.schema.body.type).toBe('richtext')
  })

  it('publishes the shared editorial design system once', () => {
    expect(pack.layouts).toEqual([])
    expect(new Set(pack.classes.map((rule) => rule.id)).size).toBe(pack.classes.length)
    expect(pack.conditions.map((condition) => condition.id)).toEqual([
      'media:(prefers-reduced-motion: reduce)',
      'media:(forced-colors: active)',
      'media:print',
      'media:(max-width: 64rem)',
      'media:(max-width: 48rem)',
      'media:(max-width: 36rem)',
    ])

    const classStyles = (name: string) => pack.classes.find((rule) =>
      rule.kind === 'class' && rule.name === name)?.styles
    expect(classStyles('site-header')).toMatchObject({
      width: 'min(calc(100% - (var(--cs-spacing-5) * 2)), var(--cs-size-content-max))',
      marginLeft: 'auto',
      marginRight: 'auto',
    })
    expect(classStyles('feature-grid')).toMatchObject({
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    })
    expect(classStyles('feature-card')).toMatchObject({
      minHeight: '16rem',
      padding: 'var(--cs-spacing-8)',
      borderRadius: 'var(--cs-radius-lg)',
    })
    expect(featureGrid.render(featureGrid.defaults, []).html).toContain('class="feature-grid feature-grid-3"')
  })

  it('ships a parameterised Hero Visual Component with media artwork support', () => {
    const heroComponent = pack.visualComponents.find((component) =>
      component.id === 'creator-signal.site/component/hero')
    expect(heroComponent?.name).toBe('Creator Signal Hero')
    expect(heroComponent?.params.map(({ name, type, required }) => ({ name, type, required }))).toEqual([
      { name: 'Eyebrow', type: 'string', required: true },
      { name: 'Heading', type: 'string', required: true },
      { name: 'Introduction', type: 'string', required: true },
      { name: 'Action label', type: 'string', required: true },
      { name: 'Action URL', type: 'url', required: true },
      { name: 'Artwork', type: 'image', required: false },
    ])
  })

  it('registers every site block as a Creator Signal governed component', () => {
    expect(creatorSignalPlugin.manifest.permissions).toContain('componentLibrary.register')
    expect(creatorSignalPlugin.componentLibrary).toEqual(creatorSignalComponentLibraryEntries)
    expect(creatorSignalComponentLibraryEntries).toContain(creatorSignalHeroEntry)
    expect(creatorSignalComponentEntries.map((entry) => entry.id)).toEqual([
      'creator-signal.site.hero',
      'creator-signal.site.header',
      'creator-signal.site.footer',
      'creator-signal.site.consent-banner',
      'creator-signal.site.campaign-hero',
      'creator-signal.site.signal-strip',
      'creator-signal.site.signal-comparison',
      'creator-signal.site.feature-grid',
      'creator-signal.site.process-steps',
      'creator-signal.site.pricing-plans',
      'creator-signal.site.founder-story',
      'creator-signal.site.call-to-action',
      'creator-signal.site.rich-text-section',
      'creator-signal.site.testimonial',
      'creator-signal.site.faq',
      'creator-signal.site.comparison-section',
      'creator-signal.site.recovery-state',
      'creator-signal.site.public-document',
      'creator-signal.site.mautic-form',
    ])
    expect(creatorSignalPatternEntries.map((entry) => entry.id)).toEqual([
      'creator-signal.site.pattern.home-v2-page',
      'creator-signal.site.pattern.early-access-page',
      'creator-signal.site.pattern.content-page',
      'creator-signal.site.pattern.product-page',
      'creator-signal.site.pattern.pricing-page',
      'creator-signal.site.pattern.features-page',
      'creator-signal.site.pattern.contact-page',
      'creator-signal.site.pattern.legal-trust-page',
      'creator-signal.site.pattern.article-content-page',
      'creator-signal.site.pattern.comparison-section',
      'creator-signal.site.pattern.empty-state',
      'creator-signal.site.pattern.error-state',
      'creator-signal.site.pattern.offline-state',
      'creator-signal.site.pattern.not-found-state',
    ])
  })
})
