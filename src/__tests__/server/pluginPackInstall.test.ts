import { describe, expect, it } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { PluginManifest } from '@core/plugin-sdk'
import { createTestDb } from '../helpers/createTestDb'
import { makePage, makeSite } from '../fixtures'
import { saveDraftSite, getDraftSite } from '../../../server/repositories/site'
import { createUser, findUserById } from '../../../server/repositories/users'
import { installPlugin } from '../../../server/repositories/plugins'
import {
  createDataRow,
  listDataRows,
  softDeleteDataRow,
} from '../../../server/repositories/data'
import { pageFromRow, pageToCells } from '@core/data/pageFromRow'
import { handlePluginPackInstall } from '../../../server/handlers/cms/plugins/pack'

const PLUGIN_ID = 'creator-signal.test-pack'

function packClass(color: string) {
  return {
    id: `${PLUGIN_ID}/marker`,
    name: 'CreatorSignalMarker',
    kind: 'class' as const,
    selector: '.CreatorSignalMarker',
    order: 0,
    styles: { color },
    contextStyles: {},
    createdAt: 0,
    updatedAt: 0,
  }
}

async function seedPackHarness(pack: unknown) {
  const testDb = await createTestDb()
  const uploadsDir = await mkdtemp(join(tmpdir(), 'instatic-pack-safety-'))
  const site = makeSite({ id: 'default', pages: [], styleRules: {} })
  const { pages: _pages, visualComponents: _vcs, layouts: _layouts, ...shell } = site
  await saveDraftSite(testDb.db, shell)
  await createUser(testDb.db, {
    id: 'pack-owner',
    email: 'owner@pack.test',
    displayName: 'Pack Owner',
    passwordHash: 'not-used-in-test',
    roleId: 'owner',
    allowOwnerRole: true,
  })
  const owner = await findUserById(testDb.db, 'pack-owner')
  if (!owner) throw new Error('test owner was not created')

  const version = '1.0.0'
  const relativeAssetPath = join('plugins', PLUGIN_ID, version)
  const packDir = join(uploadsDir, relativeAssetPath, 'pack')
  await mkdir(packDir, { recursive: true })
  await writeFile(join(packDir, 'site.json'), JSON.stringify(pack), 'utf8')

  const manifest: PluginManifest = {
    id: PLUGIN_ID,
    name: 'Creator Signal Pack Safety Test',
    version,
    apiVersion: 1,
    permissions: ['visualComponents.register'],
    resources: [],
    adminPages: [],
    pack: { path: 'pack/site.json' },
    assetBasePath: `/uploads/${relativeAssetPath.replaceAll('\\', '/')}`,
  }
  await installPlugin(testDb.db, manifest, ['visualComponents.register'])

  return {
    db: testDb.db,
    owner,
    uploadsDir,
    cleanup: async () => {
      try {
        await testDb.cleanup()
      } catch (error) {
        // bun:sqlite does not expose close(); Windows can retain the file
        // handle until the test process exits. CI/Linux removes it normally.
        if (!(error instanceof Error && 'code' in error && error.code === 'EBUSY')) throw error
      }
      await rm(uploadsDir, { recursive: true, force: true })
    },
  }
}

function installRequest(): Request {
  return new Request(
    `http://localhost/admin/api/cms/plugins/${PLUGIN_ID}/pack/install`,
    { method: 'POST' },
  )
}

describe('plugin pack content safety', () => {
  it('rolls back the complete pack when an empty-site starter page cannot be created', async () => {
    const starterPage = makePage({ id: 'starter-home', slug: 'index', title: 'Pack Home' })
    const harness = await seedPackHarness({
      pages: [starterPage],
      classes: [packClass('red')],
    })

    try {
      // Keep a soft-deleted primary key hidden from the active roster. The
      // pack sees an empty site, then its create fails inside the transaction.
      await createDataRow(harness.db, {
        id: starterPage.id,
        tableId: 'pages',
        cells: pageToCells(starterPage),
        slug: starterPage.slug,
      }, harness.owner.id)
      await softDeleteDataRow(harness.db, starterPage.id, harness.owner.id)

      await expect(handlePluginPackInstall(
        installRequest(),
        harness.db,
        { uploadsDir: harness.uploadsDir },
        harness.owner,
        PLUGIN_ID,
      )).rejects.toThrow()

      const shell = await getDraftSite(harness.db)
      expect(shell?.styleRules[`${PLUGIN_ID}/marker`]).toBeUndefined()
      expect(await listDataRows(harness.db, 'pages')).toEqual([])
      const audits = await harness.db<{ count: number }>`
        select count(*) as count from audit_events where action = ${'plugin.pack.install'}
      `
      expect(Number(audits.rows[0]?.count ?? 0)).toBe(0)
    } finally {
      await harness.cleanup()
    }
  })

  it('reconciles technical records while preserving an authored page with the same id', async () => {
    const authoredPage = makePage({
      id: 'starter-home',
      slug: 'index',
      title: 'Author edited title',
    })
    const packPage = makePage({
      id: authoredPage.id,
      slug: authoredPage.slug,
      title: 'Pack replacement title',
    })
    const harness = await seedPackHarness({
      pages: [packPage],
      classes: [packClass('blue')],
    })

    try {
      await createDataRow(harness.db, {
        id: authoredPage.id,
        tableId: 'pages',
        cells: pageToCells(authoredPage),
        slug: authoredPage.slug,
      }, harness.owner.id)

      const response = await handlePluginPackInstall(
        installRequest(),
        harness.db,
        { uploadsDir: harness.uploadsDir },
        harness.owner,
        PLUGIN_ID,
      )
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({
        installed: { pages: [] },
        replaced: { pages: [] },
        skipped: { pages: [authoredPage.id] },
      })

      const pages = await listDataRows(harness.db, 'pages')
      expect(pages).toHaveLength(1)
      expect(pageFromRow(pages[0]!).title).toBe('Author edited title')
      const shell = await getDraftSite(harness.db)
      expect(shell?.styleRules[`${PLUGIN_ID}/marker`]?.styles.color).toBe('blue')
    } finally {
      await harness.cleanup()
    }
  })
})
