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
    ])
  })

  it('publishes one complete shared stylesheet with a bounded page container', () => {
    expect(new Set(pack.classes.map((rule) => rule.id)).size).toBe(pack.classes.length)

    const pageContainer = pack.classes.find((rule) =>
      rule.kind === 'class' && rule.name === 'section')
    expect(pageContainer?.styles).toMatchObject({
      width: 'calc(100% - 2rem)',
      maxWidth: '1160px',
      marginInline: 'auto',
    })
    for (const className of ['site-header', 'site-footer']) {
      expect(pack.classes.find((rule) =>
        rule.kind === 'class' && rule.name === className)?.styles,
      ).toMatchObject({
        width: 'calc(100% - 2rem)',
        maxWidth: '1160px',
        marginInline: 'auto',
      })
    }
    expect(pack.classes.find((rule) =>
      rule.kind === 'class' && rule.name === 'hero')?.styles,
    ).toMatchObject({
      paddingTop: '5rem',
      paddingRight: '0px',
      paddingBottom: '5rem',
      paddingLeft: '0px',
    })
    expect(pack.classes.find((rule) =>
      rule.kind === 'ambient' && rule.name === 'h1')?.styles,
    ).toMatchObject({ fontSize: '4rem' })

    const features = pack.pages.find((page) => page.slug === 'features')
    const hero = Object.values(features?.nodes ?? {}).find((node) =>
      node.classIds.some((id) => id.endsWith('/hero')))
    expect(hero?.classIds.some((id) => id.endsWith('/section'))).toBe(true)

    const boundedSections = Object.values(features?.nodes ?? {}).filter((node) =>
      node.classIds.some((id) => id.endsWith('/section')))
    expect(boundedSections.length).toBeGreaterThanOrEqual(2)
  })
})
