import { describe, expect, it } from 'bun:test'
import '@modules/base'
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

  it('turns the contact placeholder into the configurable Mautic module', () => {
    const contact = pack.pages.find((page) => page.slug === 'contact')
    const formNode = Object.values(contact?.nodes ?? {}).find(
      (node) => node.moduleId === 'creator-signal.site.mautic-form',
    )

    expect(formNode?.props).toMatchObject({
      mauticBaseUrl: 'https://marketing.creatorsignal.me',
      formApiName: 'creatorsignalcontactenquiry',
      formCode: 'creator_signal_contact',
    })
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
      'creator-signal.site/component/hero/param/artwork',
    )
  })
})
