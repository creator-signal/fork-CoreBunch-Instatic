import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import * as Y from 'yjs'
import '@modules/base'
import {
  ComponentLibraryRegistry,
  analysePublicAuthoringPolicy,
  componentLibraryRegistry,
} from '@core/component-library'
import { reindexNodeParents, type SiteDocument, type SiteShell } from '@core/page-tree'
import {
  seedPageDoc,
  seedSiteDoc,
  shellMap,
  SITE_DOC_ID,
  treeMap,
} from '@core/collab'
import { makeSite } from '../publisher/helpers'
import {
  creatorSignalComponentLibraryEntries,
} from '../../../integrations/creator-signal/component-library'
import {
  creatorSignalPublicAuthoringPolicy,
} from '../../../integrations/creator-signal/public-authoring-contract'
import { pack } from '../../../integrations/creator-signal/pack/site'
import {
  applyPluginPackToSite,
  parsePluginPack,
} from '../../../server/plugins/pack'
import { validatePageWriteDiff } from '../../../server/writePolicy/pageDiff'
import { validateSiteWriteDiff } from '../../../server/writePolicy/siteDiff'
import { validateGuardedUpdate } from '../../../server/collab/updateGuard'

const ALL_SITE_WRITE_CAPABILITIES = [
  'site.components.edit',
  'site.structure.edit',
  'site.content.edit',
  'site.style.edit',
] as const

const localRegistry = new ComponentLibraryRegistry()
for (const entry of creatorSignalComponentLibraryEntries) localRegistry.register(entry)

function governedSite(): SiteDocument {
  return makeSite({
    pages: structuredClone(pack.pages),
    visualComponents: structuredClone(pack.visualComponents),
    layouts: [],
    styleRules: Object.fromEntries(
      pack.classes.map((rule) => [rule.id, structuredClone(rule)]),
    ),
    settings: {
      shortcuts: {},
      publicAuthoring: structuredClone(creatorSignalPublicAuthoringPolicy),
    },
  })
}

function shellOf(site: SiteDocument): SiteShell {
  const { pages: _pages, visualComponents: _components, layouts: _layouts, ...shell } = site
  return shell
}

function diagnosticCodes(site: SiteDocument): string[] {
  return analysePublicAuthoringPolicy(site, localRegistry).map((item) => item.code)
}

function updateFrom(doc: Y.Doc, mutate: (fork: Y.Doc) => void): Uint8Array {
  const fork = new Y.Doc()
  Y.applyUpdate(fork, Y.encodeStateAsUpdate(doc))
  const stateVector = Y.encodeStateVector(doc)
  fork.transact(() => mutate(fork))
  return Y.encodeStateAsUpdate(fork, stateVector)
}

beforeAll(() => {
  for (const entry of creatorSignalComponentLibraryEntries) {
    componentLibraryRegistry.registerOrReplace(entry)
  }
})

afterAll(() => {
  componentLibraryRegistry.unregisterSource({
    type: 'plugin',
    pluginId: 'creator-signal.site',
  })
})

describe('Creator Signal public authoring guardrails', () => {
  it('installs one site-owned policy and accepts every governed pack page', () => {
    const parsed = parsePluginPack('creator-signal.site', pack)
    const installed = applyPluginPackToSite(
      'creator-signal.site',
      makeSite({ pages: [] }),
      parsed,
    ).site

    expect(installed.settings.publicAuthoring).toEqual(
      creatorSignalPublicAuthoringPolicy,
    )
    expect(analysePublicAuthoringPolicy(governedSite(), localRegistry)).toEqual([])
  })

  it('rejects a pack that tries to install another plugin owner policy', () => {
    expect(() => parsePluginPack('creator-signal.site', {
      ...pack,
      publicAuthoring: {
        ...creatorSignalPublicAuthoringPolicy,
        ownerPluginId: 'other.plugin',
      },
    })).toThrow(
      /cannot install public-authoring policy owned by "other\.plugin"/,
    )
  })

  it('rejects arbitrary colour, font, spacing and breakpoint styling even for a full writer', () => {
    const previous = governedSite()
    const next = structuredClone(previous)
    const hero = Object.values(next.pages.find((page) => page.slug === 'index')!.nodes)
      .find((node) => node.catalogueInstance?.entryId === 'creator-signal.site.hero')!
    hero.inlineStyles = {
      color: '#ff00ff',
      fontFamily: 'Comic Sans MS',
      padding: '99px',
    }
    hero.breakpointOverrides.mobile = { color: 'red' }

    const diagnostics = analysePublicAuthoringPolicy(next, localRegistry)
    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'appearance.component-owned',
        path: expect.stringContaining(`nodes.${hero.id}`),
        remediation: expect.stringContaining('approved component variant'),
      }),
    ]))
    expect(() => validatePageWriteDiff({
      previousPages: previous.pages,
      changedPages: [next.pages.find((page) => page.slug === 'index')!],
      deletedPageIds: new Set(),
      capabilities: ALL_SITE_WRITE_CAPABILITIES,
      publicAuthoringPolicy: creatorSignalPublicAuthoringPolicy,
    })).toThrow(/Classes, inline styles and breakpoint overrides are not authorable/)

    const previousShell = shellOf(previous)
    const nextShell = structuredClone(previousShell)
    nextShell.styleRules['creator-signal.site/site/arbitrary-colour'] = {
      id: 'creator-signal.site/site/arbitrary-colour',
      name: 'arbitrary-colour',
      kind: 'class',
      selector: '.arbitrary-colour',
      order: 999,
      styles: { color: '#ff00ff' },
      contextStyles: {},
      createdAt: 0,
      updatedAt: 0,
    }
    expect(() => validateSiteWriteDiff(
      previousShell,
      nextShell,
      ALL_SITE_WRITE_CAPABILITIES,
    )).toThrow(/governed styles are reconciled by the owning plugin pack/)
  })

  it('applies the policy to collaborative page and shell updates', () => {
    const site = governedSite()
    const page = site.pages.find((candidate) => candidate.slug === 'index')!
    const hero = Object.values(page.nodes).find(
      (node) => node.catalogueInstance?.entryId === 'creator-signal.site.hero',
    )!
    const pageDoc = new Y.Doc()
    seedPageDoc(pageDoc, page)
    const appearanceUpdate = updateFrom(pageDoc, (fork) => {
      const nodes = treeMap(fork).get('nodes') as Y.Map<unknown>
      const heroMap = nodes.get(hero.id) as Y.Map<unknown>
      heroMap.set('inlineStyles', { color: '#ff00ff' })
    })
    expect(validateGuardedUpdate(
      `page:${page.id}`,
      pageDoc,
      appearanceUpdate,
      [...ALL_SITE_WRITE_CAPABILITIES],
      creatorSignalPublicAuthoringPolicy,
    )).toMatchObject({
      ok: false,
      reason: expect.stringContaining('appearance.component-owned'),
    })

    const siteDoc = new Y.Doc()
    seedSiteDoc(siteDoc, site)
    const policyRemoval = updateFrom(siteDoc, (fork) => {
      const settings = shellMap(fork).get('settings') as Y.Map<unknown>
      settings.delete('publicAuthoring')
    })
    expect(validateGuardedUpdate(
      SITE_DOC_ID,
      siteDoc,
      policyRemoval,
      [...ALL_SITE_WRITE_CAPABILITIES],
      creatorSignalPublicAuthoringPolicy,
    )).toMatchObject({
      ok: false,
      reason: expect.stringContaining('public-authoring policy changes require'),
    })
  })

  it('rejects unsupported variants, raw buttons and nodes outside the page pattern', () => {
    const site = governedSite()
    const page = site.pages.find((candidate) => candidate.slug === 'index')!
    const hero = Object.values(page.nodes).find(
      (node) => node.catalogueInstance?.entryId === 'creator-signal.site.hero',
    )!
    hero.catalogueInstance!.variantId = 'campaign-experiment'
    page.nodes['raw-button'] = {
      id: 'raw-button',
      moduleId: 'base.button',
      props: { label: 'Unapproved', href: '#' },
      breakpointOverrides: {},
      children: [],
      parentId: page.rootNodeId,
      classIds: [],
    }
    page.nodes[page.rootNodeId]!.children.push('raw-button')
    reindexNodeParents(page.nodes)

    expect(diagnosticCodes(site)).toEqual(expect.arrayContaining([
      'entry.variant-not-allowed',
      'composition.structural-module-not-allowed',
    ]))
  })

  it('rejects a damaged policy-owned pattern root and child sequence', () => {
    const site = governedSite()
    const page = site.pages.find((candidate) => candidate.slug === 'index')!
    const pattern = Object.values(page.nodes).find(
      (node) => node.catalogueInstance?.entryId ===
        'creator-signal.site.pattern.product-page',
    )!
    pattern.children.reverse()
    pattern.catalogueInstance!.pattern!.authorableNodeIds.reverse()
    reindexNodeParents(page.nodes)

    expect(analysePublicAuthoringPolicy(site, localRegistry)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'composition.pattern-invalid',
          path: expect.stringContaining(`nodes.${pattern.id}`),
          remediation: expect.stringContaining('fresh Component Library instance'),
        }),
      ]),
    )
  })

  it('keeps header, footer and consent chrome on the protected shared template', () => {
    const previous = governedSite()
    const site = structuredClone(previous)
    const template = site.pages.find(
      (page) => page.id === 'creator-signal.site/page/site-template',
    )!
    const header = Object.values(template.nodes).find(
      (node) => node.catalogueInstance?.entryId === 'creator-signal.site.header',
    )!
    header.props.brandName = 'Authored replacement'
    expect(() => validatePageWriteDiff({
      previousPages: previous.pages,
      changedPages: [template],
      deletedPageIds: new Set(),
      capabilities: ALL_SITE_WRITE_CAPABILITIES,
      publicAuthoringPolicy: creatorSignalPublicAuthoringPolicy,
    })).toThrow(/template-controlled public chrome is reconciled by the owning plugin pack/)

    delete template.nodes[header.id]
    for (const node of Object.values(template.nodes)) {
      node.children = node.children.filter((childId) => childId !== header.id)
    }

    const diagnostics = analysePublicAuthoringPolicy(site, localRegistry)
    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'template.chrome-count',
        message: expect.stringContaining('creator-signal.site.header'),
        remediation: expect.stringContaining('Restore the shared template'),
      }),
    ]))
  })

  it('allow-lists fixed image roles and treatments and rejects authored substitutes', () => {
    const site = governedSite()
    site.settings.publicAuthoring!.assets.fields[0]!.role = 'unapproved-background'
    const hero = Object.values(site.pages.find((page) => page.slug === 'index')!.nodes)
      .find((node) => node.catalogueInstance?.entryId === 'creator-signal.site.hero')!
    const overrides = hero.props.propOverrides as Record<string, unknown>
    overrides.artworkTreatment = 'stretch'

    expect(diagnosticCodes(site)).toEqual(expect.arrayContaining([
      'policy.asset-role-not-allowed',
      'field.not-allowed',
    ]))
  })

  it('rejects extra page-title and unsupported rich-text heading levels', () => {
    const site = governedSite()
    const landingPage = site.pages.find((page) => page.slug === 'index')!
    const hero = Object.values(landingPage.nodes).find(
      (node) => node.catalogueInstance?.entryId === 'creator-signal.site.hero',
    )!
    const duplicateHero = structuredClone(hero)
    duplicateHero.id = 'duplicate-page-title'
    duplicateHero.parentId = landingPage.rootNodeId
    landingPage.nodes[duplicateHero.id] = duplicateHero
    landingPage.nodes[landingPage.rootNodeId]!.children.push(duplicateHero.id)
    reindexNodeParents(landingPage.nodes)

    const prose = site.pages.flatMap((page) => Object.values(page.nodes)).find(
      (node) =>
        node.catalogueInstance?.entryId === 'creator-signal.site.public-document',
    )!
    prose.props.body = `${String(prose.props.body)}<h1>Second title</h1><h4>Skipped level</h4>`

    const diagnostics = analysePublicAuthoringPolicy(site, localRegistry)
    expect(diagnostics.filter(
      (item) => item.code === 'content.heading-level-not-allowed',
    )).toHaveLength(2)
    expect(diagnostics.map((item) => item.code)).toEqual(expect.arrayContaining([
      'content.page-title-count',
      'content.primary-action-count',
    ]))
  })

  it('rejects rich-text classes, presentational elements and raw button roles', () => {
    const site = governedSite()
    const prose = site.pages.flatMap((page) => Object.values(page.nodes)).find(
      (node) =>
        node.catalogueInstance?.entryId === 'creator-signal.site.public-document',
    )!
    prose.props.body = [
      '<p class="campaign" style="font-family: Comic Sans MS">Styled</p>',
      '<font color="#ff00ff">Pink</font>',
      '<button>Buy now</button>',
    ].join('')

    expect(diagnosticCodes(site)).toEqual(expect.arrayContaining([
      'appearance.rich-text-style-not-allowed',
      'appearance.rich-text-element-not-allowed',
      'content.raw-button-not-allowed',
    ]))
  })

  it('leaves ordinary Instatic sites freeform when no policy is installed', () => {
    const site = governedSite()
    delete site.settings.publicAuthoring
    const page = site.pages.find((candidate) => candidate.slug === 'index')!
    const hero = Object.values(page.nodes).find(
      (node) => node.catalogueInstance?.entryId === 'creator-signal.site.hero',
    )!
    hero.inlineStyles = {
      color: '#ff00ff',
      fontFamily: 'Comic Sans MS',
      padding: '99px',
    }

    expect(analysePublicAuthoringPolicy(site, localRegistry)).toEqual([])
  })
})
