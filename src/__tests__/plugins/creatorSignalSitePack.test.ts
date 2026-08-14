import { describe, expect, it } from 'bun:test'
import '@modules/base'
import { registry } from '@core/module-engine'
import { publishPage } from '@core/publisher'
import { validateSite } from '@core/persistence/validate'
import { composeTemplateChain } from '@core/templates'
import { pluginModuleToHostModule } from '@core/plugins/moduleAdapter'
import { makeRegistry, makeSite } from '../publisher/helpers'
import creatorSignalPlugin from '../../../integrations/creator-signal/instatic-plugin.config'
import {
  creatorSignalComponentLibraryEntries,
  creatorSignalHeroEntry,
} from '../../../integrations/creator-signal/component-library'
import mauticForm from '../../../integrations/creator-signal/modules/mautic-form'
import {
  consentBanner,
  faq,
  featureGrid,
  publicDocument,
  richTextSection,
  siteFooter,
  siteHeader,
} from '../../../integrations/creator-signal/modules/site-components'
import { pack } from '../../../integrations/creator-signal/pack/site'

const publicPages = pack.pages.filter((page) => !page.template)
const templatePage = pack.pages.find((page) => page.template)

describe('Creator Signal site pack', () => {
  it('contains the complete public launch route set plus one shared template', () => {
    expect(publicPages.map((page) => page.slug)).toEqual([
      'index',
      'products',
      'products/sales-pulse',
      'features',
      'pricing',
      'contact',
      'feedback',
      'wishlist',
      'ask-a-question',
      'feature-request',
      'report-an-error',
      'legal/privacy',
      'legal/terms',
      'legal/billing',
      'legal/acceptable-use',
      'legal/browser-extension',
      'legal/cookies',
      'legal/dpa',
      'trust/security',
      'trust/subprocessors',
      'support',
      'help/account-data',
      'status',
    ])
    expect(templatePage).toMatchObject({
      slug: 'creator-signal-site-template',
      template: {
        enabled: true,
        target: { kind: 'everywhere' },
        priority: 0,
      },
    })
  })

  it('passes the authoring persistence boundary as a complete governed site', () => {
    expect(() => validateSite(makeSite({
      pages: pack.pages,
      visualComponents: pack.visualComponents,
      styleRules: Object.fromEntries(pack.classes.map((rule) => [rule.id, rule])),
    }))).not.toThrow()
  })

  it('injects the Creator Signal favicon and PWA manifest into published pages', () => {
    expect(creatorSignalPlugin.manifest.version).toBe('0.2.0')
    expect(creatorSignalPlugin.manifest.frontend?.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'link',
          attrs: expect.objectContaining({
            rel: 'icon',
            sizes: '192x192',
            href: 'assets/icons/creator-signal-192.png',
          }),
        }),
        expect.objectContaining({
          kind: 'link',
          attrs: expect.objectContaining({
            rel: 'manifest',
            href: 'assets/icons/site.webmanifest',
          }),
        }),
        expect.objectContaining({
          kind: 'meta',
          attrs: expect.objectContaining({
            name: 'theme-color',
            content: '#3A4A2E',
          }),
        }),
      ]),
    )
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
  })

  it('uses governed leaf components with typed repeaters instead of authored child slots', () => {
    for (const entry of creatorSignalComponentLibraryEntries) {
      expect(entry.composition).toBe('leaf')
      expect(entry.slots).toEqual([])
    }

    for (const page of publicPages) {
      const body = page.nodes[page.rootNodeId]
      for (const nodeId of body.children) {
        const node = page.nodes[nodeId]
        expect(node.catalogueInstance?.entryId).toStartWith('creator-signal.site.')
        expect(node.children).toEqual([])
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
    expect(output.html).toContain('data-registry-path="/media/creator-signal/forms-v1.js"')
    expect(output.html).not.toContain('data-form-id=')
    expect(output.html).not.toContain('data-form-api-name=')
    expect(output.js).toContain("registry.schema !== 'creator-signal.mautic-forms/v1'")
    expect(output.js).toContain("new Error('form_markup_missing')")
    expect(output.js).toContain("dispatch(root, 'failure', 'registry_invalid')")
  })

  it('publishes page-level SEO and semantic structured-data markup', () => {
    for (const page of publicPages) {
      expect(typeof page.seo?.description).toBe('string')
      expect(page.seo?.canonicalUrl).toStartWith('https://creatorsignal.me')
      expect(page.seo?.language).toBe('en-AU')
      expect(page.seo?.robots).toEqual({ index: true, follow: true, archive: true })
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
    expect(output).toContain('<main id="main-content">')
    expect(output).toContain('<meta name="description"')
    expect(output).toContain('<html lang="en-AU">')
    expect(output).toContain('<link rel="canonical" href="https://creatorsignal.me/">')
    expect(output).toContain('property="og:title"')
    expect(output).toContain('name="twitter:card" content="summary"')
    expect(output).toContain('class="feature-grid"')
    expect(output).toContain('data-analytics-choice="granted"')
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
      'media:(max-width: 900px)',
      'media:(max-width: 720px)',
      'media:(max-width: 560px)',
      'media:(prefers-reduced-motion: reduce)',
    ])

    const classStyles = (name: string) => pack.classes.find((rule) =>
      rule.kind === 'class' && rule.name === name)?.styles
    expect(classStyles('site-header')).toMatchObject({
      width: 'calc(100% - 40px)',
      maxWidth: '1240px',
      marginLeft: 'auto',
      marginRight: 'auto',
    })
    expect(classStyles('feature-grid')).toMatchObject({
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
    })
    expect(classStyles('feature-card')).toMatchObject({
      minHeight: '260px',
      paddingTop: '32px',
      borderTopLeftRadius: '24px',
      borderTopRightRadius: '24px',
    })
    expect(featureGrid.render(featureGrid.defaults, []).html).toContain('class="feature-grid"')
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
    expect(creatorSignalComponentLibraryEntries.map((entry) => entry.id)).toEqual([
      'creator-signal.site.hero',
      'creator-signal.site.header',
      'creator-signal.site.footer',
      'creator-signal.site.consent-banner',
      'creator-signal.site.feature-grid',
      'creator-signal.site.call-to-action',
      'creator-signal.site.rich-text-section',
      'creator-signal.site.testimonial',
      'creator-signal.site.faq',
      'creator-signal.site.public-document',
      'creator-signal.site.mautic-form',
    ])
  })
})
