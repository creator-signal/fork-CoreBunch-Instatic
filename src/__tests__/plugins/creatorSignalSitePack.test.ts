import { describe, expect, it } from 'bun:test'
import '@modules/base'
import creatorSignalPlugin from '../../../integrations/creator-signal/instatic-plugin.config'
import { creatorSignalHeroEntry } from '../../../integrations/creator-signal/component-library'
import mauticForm from '../../../integrations/creator-signal/modules/mautic-form'
import { pack } from '../../../integrations/creator-signal/pack/site'

describe('Creator Signal site pack', () => {
  it('contains the complete public launch route set', () => {
    expect(pack.pages.map((page) => page.slug)).toEqual([
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
  })

  it('injects the Creator Signal favicon and PWA manifest into published pages', () => {
    expect(creatorSignalPlugin.manifest.version).toBe('0.1.11')
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

  it('ships operator-approved initial legal pages without draft activation copy', () => {
    const legalPages = pack.pages.filter((page) =>
      page.slug.startsWith('legal/') ||
      page.slug.startsWith('trust/') ||
      page.slug === 'support' ||
      page.slug === 'help/account-data' ||
      page.slug === 'status')
    const pageText = (page: (typeof pack.pages)[number]) => Object.values(page.nodes)
      .map((node) => typeof node.props.text === 'string' ? node.props.text : '')
      .join(' ')

    expect(legalPages).toHaveLength(12)
    for (const page of legalPages) {
      const text = pageText(page)
      expect(text).toContain('Version 2026-08-02. Effective 2 August 2026.')
      expect(text).toContain('INSIGHT VISION PTY LTD (ACN 601 335 460), Australia')
      expect(text).not.toMatch(/draft|must receive final jurisdiction-specific legal approval/i)
    }
  })

  it('turns every public intake placeholder into an alias-resolved Mautic module', () => {
    const forms = [
      ['contact', 'creator_signal_contact'],
      ['feedback', 'creator_signal_feedback'],
      ['wishlist', 'creator_signal_wishlist'],
      ['ask-a-question', 'creator_signal_question'],
      ['feature-request', 'creator_signal_feature_request'],
      ['report-an-error', 'creator_signal_error_report'],
    ]

    for (const [slug, alias] of forms) {
      const page = pack.pages.find((candidate) => candidate.slug === slug)
      const formNode = Object.values(page?.nodes ?? {}).find(
        (node) => node.moduleId === 'creator-signal.site.mautic-form',
      )
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
    expect(output.cspSources).toEqual([
      { directive: 'script-src', sources: ['https://marketing.creatorsignal.me'] },
      { directive: 'connect-src', sources: ['https://marketing.creatorsignal.me'] },
      { directive: 'form-action', sources: ['https://marketing.creatorsignal.me'] },
    ])
  })

  it('offers the shared author layouts used across the launch pages', () => {
    expect(pack.layouts.map((layout) => layout.name)).toEqual([
      'Creator Signal hero',
      'Creator Signal feature grid',
      'Creator Signal call to action',
      'Creator Signal rich text',
      'Creator Signal testimonial',
      'Creator Signal FAQ',
    ])
  })

  it('publishes the shared editorial design system once', () => {
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
    expect(classStyles('hero-section')).toMatchObject({
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, .9fr)',
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
    expect(pack.classes.find((rule) =>
      rule.kind === 'ambient' && rule.name === 'h1')?.styles,
    ).toMatchObject({
      fontSize: '7rem',
    })
    expect(pack.classes.find((rule) =>
      rule.kind === 'ambient' && rule.name === ':root')?.styles,
    ).toMatchObject({
      '--cs-paper': '#fbf7f2',
      '--cs-sage': '#5e6f57',
    })

    const features = pack.pages.find((page) => page.slug === 'features')
    const hero = Object.values(features?.nodes ?? {}).find((node) =>
      node.classIds.some((id) => id.endsWith('/hero-section')))
    expect(hero).toBeDefined()

    const boundedSections = Object.values(features?.nodes ?? {}).filter((node) =>
      node.classIds.some((id) =>
        id.endsWith('/hero-section') || id.endsWith('/content-section')))
    expect(boundedSections.length).toBeGreaterThanOrEqual(2)
  })

  it('ships a parameterised Hero Visual Component with MinIO-backed artwork support', () => {
    const hero = pack.visualComponents.find((component) =>
      component.id === 'creator-signal.site/component/hero')
    expect(hero?.name).toBe('Creator Signal Hero')
    expect(hero?.params.map(({ name, type, required }) => ({ name, type, required }))).toEqual([
      { name: 'Eyebrow', type: 'string', required: true },
      { name: 'Heading', type: 'string', required: true },
      { name: 'Introduction', type: 'string', required: true },
      { name: 'Action label', type: 'string', required: true },
      { name: 'Action URL', type: 'url', required: true },
      { name: 'Artwork', type: 'image', required: false },
    ])

    const nodes = Object.values(hero?.tree.nodes ?? {})
    const boundParamIds = nodes.flatMap((node) =>
      Object.values(node.propBindings ?? {}).map((binding) => binding.paramId))
    expect(new Set(boundParamIds)).toEqual(new Set(hero?.params.map((param) => param.id)))
    for (const classId of hero?.classIds ?? []) {
      expect(pack.classes.some((rule) => rule.id === classId)).toBe(true)
    }

    const image = nodes.find((node) => node.moduleId === 'base.image')
    expect(image?.props).toMatchObject({
      src: '',
      loading: 'eager',
      fetchPriority: 'high',
    })
    expect(image?.propBindings?.src?.paramId).toBe(
      'creator-signal.site.hero.artwork',
    )
  })

  it('registers the Hero as an explicitly owned governed catalogue component', () => {
    expect(creatorSignalPlugin.manifest.permissions).toContain('componentLibrary.register')
    expect(creatorSignalPlugin.componentLibrary).toEqual([creatorSignalHeroEntry])
    expect(creatorSignalHeroEntry).toMatchObject({
      id: 'creator-signal.site.hero',
      source: {
        type: 'plugin',
        pluginId: 'creator-signal.site',
        name: 'Creator Signal',
      },
      implementation: {
        type: 'visual-component',
        componentId: 'creator-signal.site/component/hero',
      },
      requirements: {
        plugins: ['creator-signal.site'],
      },
    })

    const hero = pack.visualComponents.find((component) =>
      component.id === 'creator-signal.site/component/hero')
    expect(creatorSignalHeroEntry.fields.map((field) => field.key))
      .toEqual(hero?.params.map((param) => param.id))
    expect(creatorSignalHeroEntry.fields.map((field) => field.label)).toEqual([
      'Eyebrow',
      'Heading',
      'Introduction',
      'Action label',
      'Action URL',
      'Artwork',
    ])
  })
})
