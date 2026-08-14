import type { SiteDocument } from '@core/page-tree'
import type { SiteCssBundle } from '@core/publisher'
import { registry } from '@core/module-engine'
import { isTemplatePage, resolveNotFoundTemplate } from '@core/templates'
import type { DbClient } from '../db/client'
import type { PublishedPageSnapshot } from '../repositories/publish'
import { renderPublishedNotFound, renderPublishedSnapshot } from './publicRenderer'
import { prefetchMediaAssets } from './mediaPrefetch'
import { applyPublishedHtmlPipeline } from './publishedHtmlPipeline'
import {
  NOT_FOUND_ARTEFACT_URL_PATH,
  prepareInactiveSlot,
  swapSlot,
  writeArtefact,
  writeStaticAsset,
} from './staticArtefact'
import { buildPublishedSiteCssBundle } from './siteCssBundle'
import { bakePublishedDataRowArtefacts } from './bakeDataRows'

export interface PublishedRuntimeAssetFile {
  publicPath: string
  bytes: Uint8Array
}

interface BakePublishedSiteArtifactsInput {
  db: DbClient
  uploadsDir: string
  publishedSite: SiteDocument
  snapshots: readonly PublishedPageSnapshot[]
  runtimeAssetFiles: readonly PublishedRuntimeAssetFile[]
  publishVersion: number
  requireComplete?: boolean
}

/**
 * Bake one complete, atomically swappable public-site generation.
 *
 * The caller supplies immutable published snapshots, so this primitive can be
 * used both by an authored-content publish and by a technical rebuild after a
 * plugin/runtime upgrade. It never reads or writes draft content and it never
 * creates a database version.
 */
export async function bakePublishedSiteArtifacts(
  input: BakePublishedSiteArtifactsInput,
): Promise<number> {
  const {
    db,
    uploadsDir,
    publishedSite,
    snapshots,
    runtimeAssetFiles,
    publishVersion,
    requireComplete = false,
  } = input
  const { slot, slotDir } = await prepareInactiveSlot(uploadsDir)

  const assetsByPath = new Map<string, Uint8Array>()
  const encoder = new TextEncoder()
  const collectCssFiles = (cssBundle: SiteCssBundle): void => {
    for (const file of [cssBundle.reset, cssBundle.framework, cssBundle.style, cssBundle.userStyles]) {
      if (file.content.length === 0) continue
      const publicPath = `/_instatic/css/${file.filename}`
      if (!assetsByPath.has(publicPath)) assetsByPath.set(publicPath, encoder.encode(file.content))
    }
  }

  for (const snapshot of snapshots) {
    const page = snapshot.site.pages.find((candidate) => candidate.id === snapshot.pageRowId)
    if (!page || isTemplatePage(page)) continue
    const mediaAssets = await prefetchMediaAssets(page, snapshot.site, registry, db)
    collectCssFiles(
      buildPublishedSiteCssBundle(snapshot.site, registry, page, publishVersion, { mediaAssets }),
    )
  }
  for (const asset of runtimeAssetFiles) {
    if (!assetsByPath.has(asset.publicPath)) assetsByPath.set(asset.publicPath, asset.bytes)
  }

  const notFoundPage = resolveNotFoundTemplate(publishedSite)
  const notFoundSnapshot = notFoundPage
    ? snapshots.find((snapshot) => snapshot.pageRowId === notFoundPage.id)
    : undefined
  if (notFoundSnapshot) {
    try {
      const rendered = await renderPublishedNotFound(notFoundSnapshot, {
        db,
        url: new URL(`http://localhost${NOT_FOUND_ARTEFACT_URL_PATH}`),
        publishVersion,
      })
      if (rendered) {
        const html = await applyPublishedHtmlPipeline(rendered, db)
        await writeArtefact(slotDir, NOT_FOUND_ARTEFACT_URL_PATH, html)
        collectCssFiles(rendered.cssBundle)
      }
    } catch (err) {
      console.error('[publish:site] failed to bake the 404 artefact (falls through to live renderer):', err)
    }
  }

  let bakedPages = 0
  let expectedPages = 0
  for (const snapshot of snapshots) {
    const page = snapshot.site.pages.find((candidate) => candidate.id === snapshot.pageRowId)
    if (!page || isTemplatePage(page)) continue
    expectedPages++
    const urlPath = page.slug === 'index' ? '/' : `/${page.slug}`
    try {
      const rendered = await renderPublishedSnapshot(snapshot, {
        db,
        url: new URL(`http://localhost${urlPath}`),
        publishVersion,
      })
      const html = await applyPublishedHtmlPipeline(rendered, db)
      await writeArtefact(slotDir, urlPath, html)
      collectCssFiles(rendered.cssBundle)
      bakedPages++
    } catch (err) {
      console.error('[publish:site] failed to bake artefact for', urlPath, '(falls through to live renderer):', err)
    }
  }

  if (requireComplete && bakedPages !== expectedPages) {
    throw new Error(
      `Refusing incomplete published artefact rebuild: baked ${bakedPages}/${expectedPages} pages`,
    )
  }

  const rowBake = await bakePublishedDataRowArtefacts(db, slotDir, publishVersion)
  for (const cssBundle of rowBake.cssBundles) collectCssFiles(cssBundle)

  for (const [publicPath, bytes] of assetsByPath) {
    await writeStaticAsset(slotDir, publicPath, bytes)
  }
  await swapSlot(uploadsDir, slot)
  return bakedPages
}
