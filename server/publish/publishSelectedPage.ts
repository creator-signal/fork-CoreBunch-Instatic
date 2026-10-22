import { nanoid } from 'nanoid'
import type { DataRow } from '@core/data/schemas'
import { pageFromRow } from '@core/data/pageFromRow'
import { assertComponentLibraryAccessibilityPublishable, assertPublicAuthoringPolicyPublishable, componentLibraryRegistry } from '@core/component-library'
import { normalizeSiteRuntimeConfig } from '@core/site-runtime'
import { isTemplatePage } from '@core/templates'
import { searchIndexService } from '@core/search'
import type { DbClient } from '../db/client'
import { getDataRow, nextDataRowVersionNumber } from '../repositories/data'
import { getLatestPublishedSiteSnapshot, listPagePublicationMetadata, listPublishedPageSnapshots, persistSitePublish, type PublishedPageSnapshot } from '../repositories/publish'
import { reconcilePublishedPageRoster } from './rebuildPublishedSite'
import { buildSiteRuntimeScripts } from './runtime/bundleScripts'
import { ensureRuntimeDependencyCache } from './runtime/dependencyCache'
import { RuntimeScriptBuildError } from './runtime/buildError'
import { renderPublishedSnapshot } from './publicRenderer'
import { applyPublishedHtmlPipeline } from './publishedHtmlPipeline'
import { bumpPublishVersion, getPublishVersion } from './publishState'
import { removeArtefactInPlace, updateArtefactInPlace, updateStaticAssetInPlace } from './staticArtefact'

/** Called only under the existing publish lock, after the collab flush. */
export async function publishSelectedPageLocked(db: DbClient, selected: DataRow, publisherUserId: string | null, uploadsDir?: string) {
  const retained = await getLatestPublishedSiteSnapshot(db)
  if (!retained) throw new Error('Publish the initial site before publishing an individual page')
  const page = pageFromRow(selected)
  if (isTemplatePage(page)) throw new Error('Publish template changes through the full site publisher')
  const versionId = nanoid()
  const versionNumber = await nextDataRowVersionNumber(db, selected.id)
  const candidate: PublishedPageSnapshot = {
    ...retained,
    pageRowId: selected.id,
    site: { ...retained.site, pages: [...retained.site.pages.filter(p => p.id !== selected.id), page] },
  }
  // Read every other page from its own active immutable version. The selected
  // draft is the sole explicit replacement, including repair of a historical
  // generic row version without site_snapshot_id. Other unresolved rows deny.
  const activeSnapshots = await listPublishedPageSnapshots(db)
  const previousPage = activeSnapshots.find(s => s.pageRowId === selected.id)?.site.pages.find(p => p.id === selected.id)
    ?? retained.site.pages.find(p => p.id === selected.id)
  const snapshots = activeSnapshots.filter(s => s.pageRowId !== selected.id)
  const metadata = (await listPagePublicationMetadata(db)).map(row => row.id === selected.id
    ? { ...row, status: 'published' as const, active_version_id: versionId } : row)
  const reconciled = reconcilePublishedPageRoster([...snapshots, candidate], metadata)
  const site = reconciled.find(s => s.pageRowId === selected.id)!.site
  assertPublicAuthoringPolicyPublishable(site, componentLibraryRegistry)
  assertComponentLibraryAccessibilityPublishable(site, componentLibraryRegistry, {
    blockingRuleIds: site.settings.accessibility?.blockingRuleIds ?? [],
  })
  const runtime = normalizeSiteRuntimeConfig(site.runtime)
  const dependencyCache = Object.keys(runtime.dependencyLock.packages).length
    ? await ensureRuntimeDependencyCache(runtime.dependencyLock) : undefined
  const build = await buildSiteRuntimeScripts({ site, page, target: 'publish', assetBasePath: `/_instatic/assets/${versionId}/`, dependencyCache })
  const errors = build.diagnostics.filter(d => d.severity === 'error')
  if (errors.length) throw new RuntimeScriptBuildError(page, errors)
  const snapshot: PublishedPageSnapshot = { ...candidate, site, runtimeAssets: build.runtimeAssets }
  const urlPath = page.slug === 'index' ? '/' : `/${page.slug}`
  const publishVersion = getPublishVersion() + 1
  const rendered = await renderPublishedSnapshot(snapshot, { db, url: new URL(`http://localhost${urlPath}`), publishVersion })
  const html = await applyPublishedHtmlPipeline(rendered, db)
  await persistSitePublish(db, {
    siteSnapshotId: nanoid(), site,
    serializedImportmap: retained.runtimePackageImportmap ?? null,
    pages: [{ pageId: page.id, title: page.title, slug: page.slug, versionId, versionNumber,
      runtimeAssets: build.runtimeAssets ?? null, runtimeFiles: build.files }],
    publishedByUserId: publisherUserId,
  })
  try {
    if (uploadsDir) {
      for (const asset of build.files) await updateStaticAssetInPlace(uploadsDir, asset.publicPath, asset.bytes)
      const encoder = new TextEncoder()
      for (const css of [rendered.cssBundle.reset, rendered.cssBundle.framework, rendered.cssBundle.style, rendered.cssBundle.userStyles]) {
        if (css.content) await updateStaticAssetInPlace(uploadsDir, `/_instatic/css/${css.filename}`, encoder.encode(css.content))
      }
      await updateArtefactInPlace(uploadsDir, urlPath, html)
      if (previousPage && previousPage.slug !== page.slug) await removeArtefactInPlace(uploadsDir, previousPage.slug === 'index' ? '/' : `/${previousPage.slug}`)
    }
  } catch (error) {
    // Never leave old HTML hiding the newly committed snapshot. The normal
    // live renderer can serve the committed page after a disk write failure.
    if (uploadsDir) await removeArtefactInPlace(uploadsDir, urlPath)
    throw error
  } finally {
    bumpPublishVersion()
    searchIndexService.markStale(site.id)
  }
  const row = await getDataRow(db, selected.id)
  if (!row) throw new Error('page could not be re-read after publish')
  const publishedAt = row.publishedAt ?? new Date().toISOString()
  return { row, version: { id: versionId, rowId: row.id, versionNumber, cells: row.cells,
    slug: row.slug, publishedByUserId: publisherUserId, publishedAt, createdAt: publishedAt } }
}
