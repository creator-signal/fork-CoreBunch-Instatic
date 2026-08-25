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
import crmIframeForm from '../../../integrations/creator-signal/modules/crm-iframe-form'
import mauticForm, { creatorSignalSiteCss } from '../../../integrations/creator-signal/modules/mautic-form'
import creatorSignalPlugin from '../../../integrations/creator-signal/instatic-plugin.config'
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
  sectionIntro,
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
  it('declares the Mautic generated-embed CSP requirement', () => {
    const assets = creatorSignalPlugin.manifest.frontend?.assets ?? []
    expect(assets).toContainEqual(expect.objectContaining({
      kind: 'script-inline',
      content: expect.stringContaining('CreatorSignalMauticEmbed'),
    }))
  })

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
      componentTree: [{
        entryId: 'creator-signal.site.recovery-state',
        boundary: 'atomic-component',
      }],
      migration: 'none',
    })
  })

  it('uses reproducible bundled node IDs for every starter and template page', () => {
    for (const page of pack.pages) {
      const prefix = page.id.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
      expect(page.rootNodeId).toBe(`${prefix}--node-000`)
      for (const [nodeId, node] of Object.entries(page.nodes)) {
        expect(nodeId).toMatch(new RegExp(`^${prefix}--node-\\d{3}$`))
        expect(node.id).toBe(nodeId)
        expect(node.children.every((childId) => Boolean(page.nodes[childId]))).toBe(true)
        if (node.parentId) expect(page.nodes[node.parentId]).toBeDefined()
        for (const authorableNodeId of node.catalogueInstance?.pattern?.authorableNodeIds ?? []) {
          expect(page.nodes[authorableNodeId]).toBeDefined()
        }
      }
    }
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
    expect(creatorSignalRenderProfile.theme.preferences).toEqual(['system', 'light', 'dark'])
    expect(siteHeader.render(siteHeader.defaults, []).html).not.toContain(
      creatorSignalRenderProfile.theme.controlSelector.slice(1, -1),
    )
    expect(creatorSignalRenderProfile.stylesheet).toContain(
      `[${creatorSignalRenderProfile.theme.themeAttribute}="dark"]`,
    )
    expect(creatorSignalRenderProfile.stylesheet).toContain('.hero-art img')
    expect(creatorSignalRenderProfile.stylesheet).toContain('object-fit: cover')
    expect(creatorSignalRenderProfile.stylesheet).toContain('.button-secondary')
    expect(creatorSignalRenderProfile.stylesheet).toContain('.recovery-state')
  })

  it('advances the technical-pack version for the template authoring contract', () => {
    const hero = pack.visualComponents.find(
      (component) => component.id === 'creator-signal.site/component/hero',
    )
    const parameterIds = hero?.params.map((parameter) => parameter.id) ?? []

    expect(creatorSignalPlugin.manifest.version).toBe('0.8.1')
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
      expect(entry?.constraints.allowedDocumentKinds).toEqual(['page', 'template'])
      expect(entry?.constraints.maxInstancesPerDocument).toBeUndefined()
      expect(entry?.documentation.usage).toContain('Edit once')
      expect(entry?.documentation.usage).toContain('shared template')
      expect(entry?.fields.every((field) => Boolean(field.description))).toBe(true)
    }

    for (const entry of creatorSignalComponentLibraryEntries) {
      expect(entry.constraints.allowedDocumentKinds).toEqual(['page', 'template'])
    }

    expect(creatorSignalRecoveryStateEntry.constraints.allowedDocumentKinds)
      .toEqual(['page', 'template'])
    expect(creatorSignalPatternEntries.find(
      (entry) => entry.id === 'creator-signal.site.pattern.not-found-state',
    )?.constraints.allowedDocumentKinds).toEqual(['page', 'template'])
  })

  it('uses governed leaf components except for the explicit editable two-column container', () => {
    for (const entry of creatorSignalComponentEntries) {
      if (entry.id === 'creator-signal.site.two-column-layout') {
        expect(entry.composition).toBe('container')
        expect(entry.slots.map((slot) => slot.id)).toEqual(['left', 'right'])
      } else {
        expect(entry.composition).toBe('leaf')
        expect(entry.slots).toEqual([])
      }
    }

    for (const page of publicPages) {
      const body = page.nodes[page.rootNodeId]
      expect(body.children.length).toBeGreaterThan(0)
      expect(Object.values(page.nodes).some((node) => node.catalogueInstance?.pattern))
        .toBe(false)
      for (const nodeId of body.children) {
        const component = page.nodes[nodeId]
        expect(component.catalogueInstance?.entryId).toStartWith('creator-signal.site.')
        expect(component.catalogueInstance?.entryId).not.toStartWith('creator-signal.site.pattern.')
        if (component.catalogueInstance?.entryId !== 'creator-signal.site.two-column-layout') {
          expect(component.children).toEqual([])
        }
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

  it('composes Feedback from independently editable columns, copy and iframe components', () => {
    const feedback = publicPages.find((page) => page.slug === 'feedback')!
    const nodes = Object.values(feedback.nodes)
    const layout = nodes.find((node) =>
      node.catalogueInstance?.entryId === 'creator-signal.site.two-column-layout')!
    const leftSlot = layout.children.map((nodeId) => feedback.nodes[nodeId]).find(
      (node) => node.moduleId === 'base.slot-instance' && node.props.slotName === 'left',
    )!
    const rightSlot = layout.children.map((nodeId) => feedback.nodes[nodeId]).find(
      (node) => node.moduleId === 'base.slot-instance' && node.props.slotName === 'right',
    )!

    expect(feedback.nodes[feedback.rootNodeId].children.map(
      (nodeId) => feedback.nodes[nodeId]?.catalogueInstance?.entryId,
    )).toEqual([
      'creator-signal.site.hero',
      'creator-signal.site.two-column-layout',
    ])
    expect(layout.moduleId).toBe('base.visual-component-ref')
    expect(layout.props.componentId).toBe('creator-signal.site/component/two-column-layout')
    expect(feedback.nodes[leftSlot.children[0]!]).toMatchObject({
      moduleId: 'creator-signal.site.section-intro',
      catalogueInstance: { entryId: 'creator-signal.site.section-intro' },
      props: { heading: 'Share your feedback' },
    })
    expect(feedback.nodes[rightSlot.children[0]!]).toMatchObject({
      moduleId: 'creator-signal.site.crm-iframe-form',
      catalogueInstance: { entryId: 'creator-signal.site.crm-iframe-form' },
      props: { formUrl: 'https://marketing.creatorsignal.me/form/creator-signal-feedback' },
    })
  })

  it('materializes every governed public pattern through the editor registry', () => {
    expect(creatorSignalPatternDefinitions.map((definition) => definition.id))
      .toEqual(creatorSignalPatternEntries.map((entry) => entry.id))

    for (const entry of creatorSignalPatternEntries) {
      const definition = creatorSignalPatternDefinitions.find(
        (candidate) => candidate.id === entry.id,
      )!
      const fragment = componentLibraryPatternRegistry.materialize(entry.id, {
        entryId: entry.id,
        entryVersion: entry.version,
        variantId: 'default',
      })
      expect(fragment).toBeDefined()
      if (!fragment) throw new Error(`Pattern ${entry.id} did not materialize`)
      expect(definition.materialization).toBe('children')
      expect(fragment.rootIds).toHaveLength(definition.authorableNodeKeys.length)
      expect(Object.values(fragment.nodes).some((node) =>
        node.catalogueInstance?.entryId === entry.id || node.catalogueInstance?.pattern))
        .toBe(false)
      expect(fragment.rootIds.every((nodeId) =>
        Boolean(fragment.nodes[nodeId]?.catalogueInstance))).toBe(true)
      expect(entry.constraints.allowedChildEntryIds).toBeUndefined()
    }
  })

  it('expands every public route recipe into direct page components', () => {
    for (const reference of creatorSignalPageAuthoringReference) {
      const slug = reference.route === '/' ? 'index' : reference.route.slice(1)
      const page = publicPages.find((candidate) => candidate.slug === slug)!
      const body = page.nodes[page.rootNodeId]
      expect(body.children.map(
        (nodeId) => page.nodes[nodeId]?.catalogueInstance?.entryId,
      )).toEqual(reference.componentEntryIds)
      expect(Object.values(page.nodes).some((node) =>
        node.catalogueInstance?.entryId === reference.patternId)).toBe(false)
    }
  })

  it('builds the reference Home flow from governed authorable sections', () => {
    const home = creatorSignalPageAuthoringReference.find((page) => page.route === '/')
    const homePattern = creatorSignalPatternEntries.find(
      (entry) => entry.id === 'creator-signal.site.pattern.home-v2-page',
    )

    expect(homePattern?.version).toBe('2.0.0')
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

    const homePage = publicPages.find((page) => page.slug === 'index')!
    expect(homePage.nodes[homePage.rootNodeId].children.map(
      (nodeId) => homePage.nodes[nodeId]?.catalogueInstance?.entryId,
    )).toEqual(home!.componentEntryIds)
    for (const slug of ['legal/billing', 'trust/security', 'support', 'status']) {
      const page = publicPages.find((candidate) => candidate.slug === slug)!
      expect(page.nodes[page.rootNodeId].children.map(
        (nodeId) => page.nodes[nodeId]?.catalogueInstance?.entryId,
      )).toEqual(['creator-signal.site.public-document'])
    }
  })

  it('keeps identity, sign-up, onboarding and dashboard ownership outside Instatic', () => {
    expect(creatorSignalPublicRouteSlugs).not.toContain('sign-up')
    expect(creatorSignalPublicRouteSlugs).not.toContain('login')
    expect(creatorSignalPublicRouteSlugs).not.toContain('onboarding')
    expect(creatorSignalPublicRouteSlugs).not.toContain('sales-pulse')

    const items = siteHeader.defaults.items as Array<{ label: string, url: string }>
    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'Sign in',
        url: 'https://salespulse.creatorsignal.me',
      }),
      expect.objectContaining({
        label: 'Get started free',
        url: 'https://salespulse.creatorsignal.me/sign-up',
      }),
    ]))
  })

  it('uses only generated semantic design-system variables in active public composition', () => {
    expect(creatorSignalRenderProfile.stylesheet).toContain('var(--cs-brand-pink)')
    expect(creatorSignalRenderProfile.stylesheet).toContain('var(--cs-product-creator-signal-signature)')
    expect(creatorSignalRenderProfile.stylesheet).toContain('var(--cs-type-heading1-family)')
    expect(creatorSignalRenderProfile.stylesheet).not.toMatch(/--cs-(sage|clay|ink|paper|card|line|muted|blue)\b/)
    expect(creatorSignalRenderProfile.stylesheet).not.toContain('Georgia')
  })

  it('keeps pricing visually aligned through the governed feature-card pattern', () => {
    const pricing = creatorSignalPageAuthoringReference.find((page) => page.route === '/pricing')
    expect(pricing?.patternId).toBe('creator-signal.site.pattern.pricing-page')
    expect(pricing?.componentEntryIds).toEqual([
      'creator-signal.site.hero',
      'creator-signal.site.feature-grid',
      'creator-signal.site.call-to-action',
    ])
  })

  it('keeps privacy and terms as a hero plus one coherent rich-text component', () => {
    for (const route of ['/legal/privacy', '/legal/terms']) {
      const reference = creatorSignalPageAuthoringReference.find((page) => page.route === route)
      expect(reference?.patternId).toBe('creator-signal.site.pattern.article-content-page')
      expect(reference?.componentEntryIds).toEqual([
        'creator-signal.site.hero',
        'creator-signal.site.rich-text-section',
      ])
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
      ['wishlist', 'creator_signal_wishlist'],
      ['early-access', 'creator_signal_wishlist'],
      ['waitlist', 'creator_signal_waitlist'],
      ['beta', 'creator_signal_beta_application'],
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
      expect(formNode?.props).not.toHaveProperty('eyebrow')
      expect(formNode?.props).not.toHaveProperty('heading')
      expect(formNode?.props).not.toHaveProperty('introduction')
      expect(formNode?.props).not.toHaveProperty('formId')
      expect(formNode?.props).not.toHaveProperty('formApiName')
    }
  })

  it('loads only governed Mautic registry entries and rejects missing generated markup', () => {
    const output = mauticForm.render(mauticForm.defaults, [])

    expect(output.html).toContain('data-form-alias="creator_signal_contact"')
    expect(output.html).toMatch(/^\s*<section class="cs-mautic" id="managed-form" data-cs-mautic-form/)
    expect(output.html).not.toContain('cs-mautic-copy')
    expect(output.html).toContain('data-registry-path="/media/creator-signal/forms-v1.js"')
    expect(output.html).not.toContain('data-form-id=')
    expect(output.html).not.toContain('data-form-api-name=')
    expect(output.js).toContain("registry.schema !== 'creator-signal.mautic-forms/v1'")
    expect(output.js).toContain("new Error('form_markup_missing')")
    expect(output.js).toContain("dispatch(root, 'failure', 'registry_invalid')")
    expect(output.js).toContain('consentTimestampFields')
    expect(output.js).toContain('syncConsentTimestamps')
    expect(output.js).toContain('choiceField: null')
    expect(output.js).toContain("status.textContent = 'Sending...'")
    expect(output.js).toContain('const invalid = controls.filter((control) => !control.checkValidity())')
    expect(output.js).toContain("control.setAttribute('aria-invalid', 'true')")
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
        'creator-signal.site.two-column-layout',
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
    expect(formNodes[0]?.props).not.toHaveProperty('introduction')
    const introductionNode = Object.values(page.nodes).find(
      (node) => node.moduleId === 'creator-signal.site.section-intro',
    )
    expect(introductionNode?.props.introduction).toContain('launch notification, early testing or both')
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
    expect(output.match(/\.hero-section, \.campaign-hero\s*\{/g)).toHaveLength(2)
    expect(output).not.toContain('data-cs-theme-control')
    expect(output).toContain('class="site-brand-mark"')
    expect(output).toContain('sales-pulse-social.png')
    expect(output).not.toContain('&amp;#x27;')
    expect(output).not.toContain('&amp;amp;')
    expect(output).toContain('href="https://salespulse.creatorsignal.me"')
    expect(output).toContain('class="signal-comparison-grid"')
  })

  it('publishes Feedback as left-column copy followed by a standalone right-column iframe', () => {
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
    const feedback = publicPages.find((page) => page.slug === 'feedback')!
    const composed = composeTemplateChain([templatePage!], { kind: 'page', page: feedback })
    const site = makeSite({
      pages: pack.pages,
      visualComponents: pack.visualComponents,
      styleRules: Object.fromEntries(pack.classes.map((rule) => [rule.id, rule])),
    })
    const output = publishPage(composed, site, makeRegistry(modules)).html

    expect(output).toContain('class="two-column-layout"')
    expect(output).toContain('<h2 id="feedback-introduction">Share your feedback</h2>')
    expect(output).toContain('src="https://marketing.creatorsignal.me/form/creator-signal-feedback"')
    expect(output.indexOf('Share your feedback')).toBeLessThan(
      output.indexOf('data-cs-crm-iframe-form'),
    )
    expect(output.match(/Share your feedback/g)).toHaveLength(1)
    expect(output).not.toContain('data-form-alias="creator_signal_feedback"')
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
      sectionIntro,
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

  it('registers an independently previewable embedded CRM form', () => {
    const published = crmIframeForm.render(crmIframeForm.defaults, [])
    const previewed = (crmIframeForm.preview ?? crmIframeForm.render)(
      crmIframeForm.defaults,
      [],
    )

    expect(published.html).toContain('data-cs-crm-iframe-form')
    expect(published.css).toContain('creator-signal-site-design-contract')
    expect(previewed).toEqual(published)
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
    expect(pack.conditions).toEqual([])
    expect(pack.classes.every((rule) =>
      rule.kind === 'class' &&
      Object.keys(rule.styles).length === 0 &&
      Object.keys(rule.contextStyles).length === 0,
    )).toBe(true)
    expect(pack.classes.find((rule) => rule.name === 'hero-section')?.id).toBe(
      'creator-signal.site/site/hero-section',
    )
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
      'creator-signal.site.section-intro',
      'creator-signal.site.two-column-layout',
      'creator-signal.site.crm-iframe-form',
    ])
    expect(creatorSignalPatternEntries.map((entry) => entry.id)).toEqual([
      'creator-signal.site.pattern.home-v2-page',
      'creator-signal.site.pattern.early-access-page',
      'creator-signal.site.pattern.content-page',
      'creator-signal.site.pattern.product-page',
      'creator-signal.site.pattern.pricing-page',
      'creator-signal.site.pattern.features-page',
      'creator-signal.site.pattern.contact-page',
      'creator-signal.site.pattern.feedback-page',
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
