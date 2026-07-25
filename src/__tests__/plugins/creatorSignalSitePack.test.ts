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
      rule.kind === 'ambient' &&
      rule.name.includes('.site-header') &&
      rule.name.includes('.site-footer'))
    expect(pageContainer?.styles).toMatchObject({
      width: 'calc(100% - 2rem)',
      maxWidth: '1160px',
      marginInline: 'auto',
    })
  })
})
