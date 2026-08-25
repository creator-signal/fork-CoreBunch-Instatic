import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import '@modules/base'
import {
  analysePublicAuthoringPolicy,
  componentLibraryPatternRegistry,
  componentLibraryRegistry,
} from '@core/component-library'
import { pageToCells } from '@core/data/pageFromRow'
import { visualComponentToCells } from '@core/data/componentFromRow'
import { registry } from '@core/module-engine'
import type { Page, SiteDocument, SiteShell } from '@core/page-tree'
import { publishPage } from '@core/publisher'
import { pluginModuleToHostModule } from '@core/plugins/moduleAdapter'
import { composeTemplateChain } from '@core/templates'
import { vcSlugFromName } from '@core/visualComponents'
import { createTestDb } from '../helpers/createTestDb'
import { makeRegistry, makeSite } from '../publisher/helpers'
import creatorSignalPlugin from '../../../integrations/creator-signal/instatic-plugin.config'
import {
  creatorSignalComponentLibraryEntries,
  creatorSignalPatternEntries,
} from '../../../integrations/creator-signal/component-library'
import { creatorSignalContentWorkflowAcceptance } from '../../../integrations/creator-signal/content-workflows'
import {
  creatorSignalBrandAssets,
} from '../../../integrations/creator-signal/design-system/contract'
import { heroParamIds } from '../../../integrations/creator-signal/pack/hero-component'
import { creatorSignalRenderProfile } from '../../../integrations/creator-signal/pack/design-system'
import { pack } from '../../../integrations/creator-signal/pack/site'
import { canonicalPageCellsSha256 } from '../../../integrations/creator-signal/migrations/content-hash'
import { creatorSignalPublicAuthoringPolicy } from '../../../integrations/creator-signal/public-authoring-contract'
import { createUser } from '../../../server/repositories/users'
import {
  createDataRow,
  saveDataRowDraft,
  updateDataRowStatus,
} from '../../../server/repositories/data'
import {
  getDraftSiteDocument,
  getPublishedPageBySlug,
} from '../../../server/repositories/publish'
import { saveDraftSite } from '../../../server/repositories/site'
import { applyPluginPackToSite, parsePluginPack } from '../../../server/plugins/pack'
import { publishDraftSite } from '../../../server/publish/publishSite'
import { renderPublishedSnapshot } from '../../../server/publish/publicRenderer'
import { validatePageWriteDiff } from '../../../server/writePolicy/pageDiff'

const OWNER_ID = 'creator-signal-workflow-owner'
const ALL_SITE_WRITE_CAPABILITIES = [
  'site.components.edit',
  'site.structure.edit',
  'site.content.edit',
  'site.style.edit',
] as const

function shellOf(site: SiteDocument): SiteShell {
  const { pages: _pages, visualComponents: _components, layouts: _layouts, ...shell } = site
  return shell
}

function installCreatorSignalSite(): SiteDocument {
  return applyPluginPackToSite(
    'creator-signal.site',
    makeSite({ id: 'default', pages: [] }),
    parsePluginPack('creator-signal.site', pack),
  ).site
}

function pageBySlug(site: SiteDocument, slug: string): Page {
  const page = site.pages.find((candidate) => candidate.slug === slug)
  if (!page) throw new Error(`Creator Signal workflow page not found: ${slug}`)
  return page
}

function creatorSignalPageModules() {
  return makeRegistry(
    Object.fromEntries(registry.list().map((module) => [module.id, module])),
  )
}

async function seedWorkflowDraft(
  db: Awaited<ReturnType<typeof createTestDb>>['db'],
  site: SiteDocument,
): Promise<void> {
  await saveDraftSite(db, shellOf(site), OWNER_ID)
  for (const page of site.pages) {
    await createDataRow(db, {
      id: page.id,
      tableId: 'pages',
      cells: pageToCells(page),
      slug: page.slug,
    }, OWNER_ID)
  }
  for (const component of site.visualComponents) {
    await createDataRow(db, {
      id: component.id,
      tableId: 'components',
      cells: visualComponentToCells(component),
      slug: vcSlugFromName(component.name),
    }, OWNER_ID)
  }
}

beforeAll(() => {
  for (const definition of creatorSignalPlugin.modules) {
    registry.registerOrReplace(pluginModuleToHostModule(
      'creator-signal.site',
      definition,
      () => () => null,
      creatorSignalPlugin.manifest.permissions,
      creatorSignalPlugin.manifest.networkAllowedHosts,
    ))
  }
  for (const entry of creatorSignalComponentLibraryEntries) {
    componentLibraryRegistry.registerOrReplace(entry)
  }
})

afterAll(() => {
  for (const definition of creatorSignalPlugin.modules) registry.unregister(definition.id)
  componentLibraryRegistry.unregisterSource({
    type: 'plugin',
    pluginId: 'creator-signal.site',
  })
})

describe('Creator Signal content authoring workflows', () => {
  it('upgrades retained authored pages without creating, replacing or publishing page content', () => {
    const retained = installCreatorSignalSite()
    const product = pageBySlug(retained, 'products')
    const hero = Object.values(product.nodes).find(
      (node) => node.catalogueInstance?.entryId === 'creator-signal.site.hero',
    )
    if (!hero) throw new Error('Creator Signal product Hero was not installed')
    const overrides = hero.props.propOverrides
    if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
      throw new Error('Creator Signal product Hero has no authorable overrides')
    }
    const authorOverrides = overrides as Record<string, unknown>
    authorOverrides[heroParamIds.heading] =
      'A retained author heading must survive the technical upgrade.'
    const beforeHash = canonicalPageCellsSha256(pageToCells(product))

    const upgraded = applyPluginPackToSite(
      'creator-signal.site',
      retained,
      parsePluginPack('creator-signal.site', pack),
    )
    const upgradedProduct = pageBySlug(upgraded.site, 'products')

    expect(upgraded.pageImport.installedIds).toEqual([])
    expect(upgraded.pageImport.skippedIds).toEqual(pack.pages.map((page) => page.id))
    expect(upgraded.replaced.pages).toEqual([])
    expect(canonicalPageCellsSha256(pageToCells(upgradedProduct))).toBe(beforeHash)
  })

  it('keeps every requested workflow in one executable source-owned contract', () => {
    expect(creatorSignalContentWorkflowAcceptance).toMatchObject({
      issue: 48,
      relatedIssues: [145],
      boundary: 'source-only',
      command: 'bun run verify:creator-signal-content-workflows',
    })
    expect(creatorSignalContentWorkflowAcceptance.workflows.map(({ id }) => id)).toEqual([
      'create-edit-revise',
      'preview-publish-unpublish',
      'media',
      'patterns',
      'legal-pages',
      'product-pages',
      'themes',
      'catalogue-tasks',
      'guardrails',
    ])
    for (const workflow of creatorSignalContentWorkflowAcceptance.workflows) {
      expect(workflow.acceptance.length).toBeGreaterThan(0)
      expect(workflow.automatedEvidence.length).toBeGreaterThan(0)
    }
  })

  it('materializes reusable page recipes as direct authorable components', () => {
    for (const entry of creatorSignalPatternEntries) {
      const fragment = componentLibraryPatternRegistry.materialize(entry.id, {
        entryId: entry.id,
        entryVersion: entry.version,
        variantId: 'default',
      })
      expect(fragment?.rootIds.length, entry.id).toBeGreaterThan(0)
      expect(Object.values(fragment?.nodes ?? {}).some(
        (node) => node.catalogueInstance?.entryId === entry.id,
      ), entry.id).toBe(false)
      for (const rootId of fragment?.rootIds ?? []) {
        const root = fragment?.nodes[rootId]
        expect(root?.catalogueInstance?.entryId, `${entry.id}/${rootId}`).toStartWith(
          'creator-signal.site.',
        )
        expect(root?.catalogueInstance?.entryId, `${entry.id}/${rootId}`).not.toContain(
          '.pattern.',
        )
      }
    }
  })

  it('edits shared chrome once while page content stays independent', () => {
    const site = installCreatorSignalSite()
    const template = pageBySlug(site, 'creator-signal-site-template')
    const header = Object.values(template.nodes).find(
      (node) => node.catalogueInstance?.entryId === 'creator-signal.site.header',
    )
    if (!header) throw new Error('Creator Signal shared header was not installed')
    header.props.brandName = 'Creator Signal authors'

    const products = pageBySlug(site, 'products')
    const privacy = pageBySlug(site, 'legal/privacy')
    for (const page of [products, privacy]) {
      expect(Object.values(page.nodes).some(
        (node) => node.catalogueInstance?.entryId === 'creator-signal.site.header',
      )).toBe(false)
      const html = publishPage(
        composeTemplateChain([template], { kind: 'page', page }),
        site,
        creatorSignalPageModules(),
      ).html
      expect(html).toContain('Creator Signal authors')
    }
  })

  it('creates, edits, previews, publishes, revises, and unpublishes legal and product content', async () => {
    const testDb = await createTestDb()
    try {
      await createUser(testDb.db, {
        id: OWNER_ID,
        email: 'workflow-owner@creator-signal.test',
        displayName: 'Workflow Owner',
        passwordHash: 'not-used-in-source-acceptance',
        roleId: 'owner',
        allowOwnerRole: true,
      })

      const installed = installCreatorSignalSite()
      const workflowSite: SiteDocument = {
        ...installed,
        // Visual Components are a technical-pack record reconciled by the
        // install handler, while applyPluginPackToSite owns site content.
        // Seed that same reconciled record for this repository-level workflow.
        visualComponents: structuredClone(pack.visualComponents),
        pages: [
          pageBySlug(installed, 'creator-signal-site-template'),
          pageBySlug(installed, 'products'),
          pageBySlug(installed, 'early-access'),
          pageBySlug(installed, 'legal/privacy'),
        ],
      }
      expect(analysePublicAuthoringPolicy(
        workflowSite,
        componentLibraryRegistry,
      )).toEqual([])
      await seedWorkflowDraft(testDb.db, workflowSite)

      await publishDraftSite(testDb.db, OWNER_ID)
      const firstPublic = await getPublishedPageBySlug(testDb.db, 'products')
      expect(firstPublic).not.toBeNull()

      const draft = await getDraftSiteDocument(testDb.db)
      if (!draft) throw new Error('Creator Signal workflow draft was not persisted')
      const previousProduct = pageBySlug(draft, 'products')
      const editedProduct = structuredClone(previousProduct)
      const hero = Object.values(editedProduct.nodes).find(
        (node) => node.catalogueInstance?.entryId === 'creator-signal.site.hero',
      )
      if (!hero) throw new Error('Creator Signal product Hero was not installed')
      const overrides = hero.props.propOverrides as Record<string, unknown>
      overrides[heroParamIds.heading] = 'Products shaped by clearer creator signals.'

      expect(overrides[heroParamIds.artwork]).toBe('')
      const earlyAccess = pageBySlug(draft, 'early-access')
      const campaignHero = Object.values(earlyAccess.nodes).find(
        (node) => node.catalogueInstance?.entryId === 'creator-signal.site.campaign-hero',
      )
      if (!campaignHero) throw new Error('Creator Signal campaign Hero was not installed')
      expect(campaignHero.props.artwork).toBe(creatorSignalBrandAssets.salesPulseSocial)
      expect(String(campaignHero.props.artworkAlt)).toBeTruthy()
      expect(() => validatePageWriteDiff({
        previousPages: draft.pages,
        changedPages: [editedProduct],
        deletedPageIds: new Set(),
        capabilities: ALL_SITE_WRITE_CAPABILITIES,
        publicAuthoringPolicy: creatorSignalPublicAuthoringPolicy,
      })).not.toThrow()
      await saveDataRowDraft(testDb.db, editedProduct.id, {
        cells: pageToCells(editedProduct),
        slug: editedProduct.slug,
      }, OWNER_ID)

      const template = pageBySlug(draft, 'creator-signal-site-template')
      const preview = publishPage(
        composeTemplateChain([template], { kind: 'page', page: editedProduct }),
        { ...draft, pages: draft.pages.map((page) =>
          page.id === editedProduct.id ? editedProduct : page) },
        creatorSignalPageModules(),
      ).html
      expect(preview).toContain('Products shaped by clearer creator signals.')
      expect(creatorSignalRenderProfile.theme.preferences).toEqual(['system', 'light', 'dark'])
      expect(preview).toContain('[data-cs-theme="light"]')
      expect(preview).toContain('[data-cs-theme="dark"]')

      const stillPublic = await getPublishedPageBySlug(testDb.db, 'products')
      const firstPublicProduct = pageBySlug(stillPublic!.site, 'products')
      const firstPublicHero = Object.values(firstPublicProduct.nodes).find(
        (node) => node.catalogueInstance?.entryId === 'creator-signal.site.hero',
      )!
      expect((firstPublicHero.props.propOverrides as Record<string, unknown>)[heroParamIds.heading])
        .not.toBe('Products shaped by clearer creator signals.')

      await publishDraftSite(testDb.db, OWNER_ID)
      const revisedPublic = await getPublishedPageBySlug(testDb.db, 'products')
      const renderedProduct = await renderPublishedSnapshot(revisedPublic!, {
        db: testDb.db,
        url: new URL('https://creatorsignal.me/products'),
      })
      expect(renderedProduct.html).toContain('Products shaped by clearer creator signals.')

      const earlyAccessSnapshot = await getPublishedPageBySlug(testDb.db, 'early-access')
      const renderedEarlyAccess = await renderPublishedSnapshot(earlyAccessSnapshot!, {
        db: testDb.db,
        url: new URL('https://creatorsignal.me/early-access'),
      })
      expect(renderedEarlyAccess.html).toContain(creatorSignalBrandAssets.salesPulseSocial)
      expect(renderedEarlyAccess.html).toContain('A preview of the Sales Pulse visual sales dashboard.')

      const legalSnapshot = await getPublishedPageBySlug(testDb.db, 'legal/privacy')
      const renderedLegal = await renderPublishedSnapshot(legalSnapshot!, {
        db: testDb.db,
        url: new URL('https://creatorsignal.me/legal/privacy'),
      })
      expect(renderedLegal.html).toContain('INSIGHT VISION PTY LTD')
      expect(renderedLegal.html).toContain('Version 2026-08-02')

      const versions = await testDb.db<{ version_number: number }>`
        select version_number
        from data_row_versions
        where row_id = ${editedProduct.id}
        order by version_number asc
      `
      expect(versions.rows.map((row) => Number(row.version_number))).toEqual([1, 2])

      await updateDataRowStatus(testDb.db, editedProduct.id, 'unpublished', OWNER_ID)
      expect(await getPublishedPageBySlug(testDb.db, 'products')).toBeNull()
      const retainedVersions = await testDb.db<{ count: number }>`
        select count(*) as count from data_row_versions where row_id = ${editedProduct.id}
      `
      expect(Number(retainedVersions.rows[0]?.count ?? 0)).toBe(2)
    } finally {
      await testDb.cleanup().catch((error: unknown) => {
        if (!(error instanceof Error && 'code' in error && error.code === 'EBUSY')) throw error
      })
    }
  }, 120_000)
})
