import { isTemplatePage } from '@core/templates'
import { searchIndexService } from '@core/search'
import type { DbClient } from '../db/client'
import { listPublishedPageSnapshots } from '../repositories/publish'
import { listActivePublishedRuntimeAssets } from '../repositories/runtimeAsset'
import { bakePublishedSiteArtifacts } from './bakeSiteArtifacts'
import { bumpPublishVersion, getPublishVersion, withPublishLock } from './publishState'

export interface RebuildPublishedSiteResult {
  rebuiltPages: number
}

/**
 * Rebuild derived public HTML/CSS/runtime artefacts from the exact active
 * published snapshot after renderer or plugin implementation code changes.
 *
 * This deliberately does not read the draft, create versions, change row
 * status, or publish an author's pending edits. Only the inactive static slot
 * is written; it becomes live in one atomic swap after the complete generation
 * succeeds.
 */
export async function rebuildPublishedSiteArtifacts(
  db: DbClient,
  uploadsDir: string,
): Promise<RebuildPublishedSiteResult> {
  return withPublishLock(async () => {
    const snapshots = await listPublishedPageSnapshots(db)
    if (snapshots.length === 0) return { rebuiltPages: 0 }

    const publishedSite = snapshots[0].site
    const activePageIds = new Set(snapshots.map((snapshot) => snapshot.pageRowId))
    const missingSnapshots = publishedSite.pages
      .filter((page) => !isTemplatePage(page))
      .filter((page) => !activePageIds.has(page.id))
    if (missingSnapshots.length > 0) {
      throw new Error(
        `Cannot rebuild published artefacts: ${missingSnapshots.length} published-site page snapshot(s) are unavailable`,
      )
    }

    const runtimeAssetFiles = await listActivePublishedRuntimeAssets(db)
    const nextPublishVersion = getPublishVersion() + 1
    const rebuiltPages = await bakePublishedSiteArtifacts({
      db,
      uploadsDir,
      publishedSite,
      snapshots,
      runtimeAssetFiles,
      publishVersion: nextPublishVersion,
      requireComplete: true,
    })

    // Keep this synchronous with the completed slot swap for the same reason
    // as a normal publish: baked hole versions and the live cache version must
    // change as one observable transition.
    bumpPublishVersion()
    try {
      searchIndexService.reindex(publishedSite)
    } catch (err) {
      searchIndexService.markStale(publishedSite.id)
      console.error('[publish:rebuild] search index refresh failed:', err)
    }

    return { rebuiltPages }
  })
}
