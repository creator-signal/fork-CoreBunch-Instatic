import { describe, expect, it } from 'bun:test'
import '@modules/base'
import { creatorSignalComponentEntries } from '../../../integrations/creator-signal/component-library'
import { siteHeader, siteFooter, consentBanner, signalComparison, pricingPlans, comparisonSection, recoveryState } from '../../../integrations/creator-signal/modules/site-components'
import mauticForm from '../../../integrations/creator-signal/modules/mautic-form'
import crmIframeForm from '../../../integrations/creator-signal/modules/crm-iframe-form'
import { pack } from '../../../integrations/creator-signal/pack/site'
import { applyPluginPackToSite, parsePluginPack } from '../../../server/plugins/pack'
import { makeSite } from '../publisher/helpers'
import { makeRegistry, makePage } from '../publisher/helpers'
import { publishPage } from '@core/publisher'
import { pluginModuleToHostModule } from '@core/plugins/moduleAdapter'

const auditedCopy = [
  [siteHeader, ['skipLinkLabel', 'homeLabel', 'menuLabel', 'navigationLabel']],
  [siteFooter, ['navigationLabel']],
  [consentBanner, ['regionLabel']],
  [signalComparison, ['beforeHeading', 'afterHeading', 'beforeArtworkAlt']],
  [pricingPlans, ['featuredLabel']],
  [comparisonSection, ['criteriaLabel']],
  [recoveryState, ['emptyLabel', 'errorLabel', 'offlineLabel', 'notFoundLabel']],
  [mauticForm, ['notConfiguredMessage', 'loadingMessage', 'sendingMessage', 'failureMessage', 'unavailableMessage', 'successMessage']],
  [crmIframeForm, ['readyMessage', 'loadingMessage', 'unavailableMessage', 'iframeTitle', 'fallbackLabel']],
] as const

describe('public copy authoring audit', () => {
  it('publishes retained nodes with missing new fields using escaped content defaults', () => {
    for (const definition of [siteHeader, signalComparison, recoveryState, mauticForm]) {
      const props = { ...definition.defaults }
      for (const [candidate, keys] of auditedCopy) {
        if (candidate.id === definition.id) for (const key of keys) delete props[key]
      }
      const module = pluginModuleToHostModule('creator-signal.site', definition, () => () => null, ['frontend.assets'])
      const page = makePage({ root: { moduleId: definition.id, props } })
      const site = makeSite({ pages: [page] })
      const result = publishPage(page, site, makeRegistry({ [definition.id]: module }))
      if (definition.id === siteHeader.id) expect(result.html).toContain('>Menu</summary>')
      if (definition.id === signalComparison.id) expect(result.html).toContain('<h3>Limited reporting</h3>')
      if (definition.id === recoveryState.id) expect(result.html).toContain('>No content yet</p>')
      if (definition.id === mauticForm.id) expect(result.html).toContain('data-failure-message="The form could not be sent. Please try again."')
    }
  })
  for (const [definition, keys] of auditedCopy) {
    it(`exposes ${definition.id} copy in the module and content library`, () => {
      const entry = creatorSignalComponentEntries.find((candidate) => candidate.id === definition.id)
      for (const key of keys) {
        expect(definition.schema).toHaveProperty(key)
        expect(definition.defaults).toHaveProperty(key)
        expect(entry?.fields.some((field) => field.key === key)).toBe(true)
      }
    })
  }

  it('renders changed public labels instead of fixed English copy', () => {
    expect(siteHeader.render({ ...siteHeader.defaults, menuLabel: 'Browse', homeLabel: 'Start', skipLinkLabel: 'Jump to page', navigationLabel: 'Explore' }, []).html).toContain('>Browse</summary>')
    expect(siteFooter.render({ ...siteFooter.defaults, navigationLabel: 'Further reading' }, []).html).toContain('aria-label="Further reading"')
    expect(consentBanner.render({ ...consentBanner.defaults, regionLabel: 'Measurement choices' }, []).html).toContain('aria-label="Measurement choices"')
    const comparison = signalComparison.render({ ...signalComparison.defaults, beforeHeading: 'Earlier view', afterHeading: 'Your view', beforeArtwork: '/uploads/before.png', beforeArtworkAlt: 'Earlier sales', artwork: '' }, []).html
    expect(comparison).toContain('<h3>Earlier view</h3>')
    expect(comparison).toContain('<h3>Your view</h3>')
    expect(comparison).toContain('alt="Earlier sales"')
    expect(comparison).not.toContain('sales-pulse-social')
    expect(pricingPlans.render({ ...pricingPlans.defaults, featuredLabel: 'Recommended' }, []).html).toContain('>Recommended</p>')
    expect(comparisonSection.render({ ...comparisonSection.defaults, criteriaLabel: 'Capability' }, []).html).toContain('>Capability</th>')
    for (const [state, key] of [['empty', 'emptyLabel'], ['error', 'errorLabel'], ['offline', 'offlineLabel'], ['not-found', 'notFoundLabel']] as const) {
      expect(recoveryState.render({ ...recoveryState.defaults, state, [key]: 'Authored state' }, []).html).toContain('>Authored state</p>')
    }
  })

  it('passes authored form states to the runtime without fixed message fallbacks', () => {
    const result = mauticForm.render({ ...mauticForm.defaults, loadingMessage: 'Please wait', sendingMessage: 'Submitting', failureMessage: 'Contact support' }, [])
    expect(result.html).toContain('data-loading-message="Please wait"')
    expect(result.html).toContain('data-sending-message="Submitting"')
    expect(result.html).toContain('data-failure-message="Contact support"')
    expect(result.js).not.toContain("textContent = 'Sending...'")
    const embedded = crmIframeForm.render({ ...crmIframeForm.defaults, readyMessage: 'Ready for your response' }, [])
    expect(embedded.html).toContain('data-cs-crm-form-ready="Ready for your response"')
    expect(embedded.js).toContain('host.dataset.csCrmFormReady')
  })

  it('retains customized page copy, media, routes and IDs across technical pack refresh', () => {
    const parsed = parsePluginPack('creator-signal.site', pack)
    const installed = applyPluginPackToSite('creator-signal.site', makeSite({ pages: [] }), parsed).site
    const home = installed.pages.find((page) => page.slug === 'index')!
    const comparison = Object.values(home.nodes).find((node) => node.moduleId === signalComparison.id)!
    comparison.props = { ...comparison.props, heading: 'Our authored heading', beforeHeading: 'Custom before', artwork: '/uploads/retained.png' }
    const retainedPages = structuredClone(installed.pages)
    const refreshed = applyPluginPackToSite('creator-signal.site', installed, parsed)
    expect(refreshed.site.pages).toEqual(retainedPages)
    expect(refreshed.pageImport.skippedIds.length).toBe(pack.pages.length)
  })
})
