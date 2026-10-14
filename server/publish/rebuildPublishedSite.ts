import { isTemplatePage } from '@core/templates'
import { searchIndexService } from '@core/search'
import type { DbClient } from '../db/client'
import {
  listPagePublicationMetadata,
  listPublishedPageSnapshots,
  type PagePublicationMetadata,
  type PublishedPageSnapshot,
} from '../repositories/publish'
import { listActivePublishedRuntimeAssets } from '../repositories/runtimeAsset'
import { bakePublishedSiteArtifacts } from './bakeSiteArtifacts'
import { bumpPublishVersion, getPublishVersion, withPublishLock } from './publishState'

export interface RebuildPublishedSiteResult {
  rebuiltPages: number
}

/** Reconcile historical site references with positively proven current membership. */
export function reconcilePublishedPageRoster(
  snapshots: readonly PublishedPageSnapshot[],
  metadata: readonly PagePublicationMetadata[],
): PublishedPageSnapshot[] {
  const rowsById = new Map(metadata.map((row) => [row.id, row]))
  const snapshotsById = new Map(snapshots.map((snapshot) => [snapshot.pageRowId, snapshot]))
  const missingRows = new Set<string>()
  const missingActiveVersions = new Set<string>()
  const missingSnapshots = new Set<string>()
  const excludedPages = new Set<string>()
  const activeRows = metadata.filter((row) => row.status === 'published' && row.deleted_at === null)
  for (const row of activeRows) {
    if (!row.active_version_id) missingActiveVersions.add(row.id)
    if (!snapshotsById.has(row.id)) missingSnapshots.add(row.id)
  }
  for (const snapshot of snapshots) {
    const ownRow = rowsById.get(snapshot.pageRowId)
    if (!ownRow || ownRow.status !== 'published' || ownRow.deleted_at !== null) {
      throw new Error('Cannot rebuild published artefacts: publication roster changed during read')
    }
    if (!snapshot.site.pages.some((page) => page.id === snapshot.pageRowId)) {
      missingSnapshots.add(snapshot.pageRowId)
    }
    for (const page of snapshot.site.pages) {
      if (isTemplatePage(page)) continue
      const row = rowsById.get(page.id)
      if (!row) {
        missingRows.add(page.id)
      } else if (row.deleted_at !== null || ['draft', 'unpublished', 'scheduled'].includes(row.status)) {
        excludedPages.add(page.id)
      } else if (row.status !== 'published' || !snapshotsById.has(page.id)) {
        missingSnapshots.add(page.id)
      }
    }
  }
  if (missingRows.size || missingActiveVersions.size || missingSnapshots.size) {
    throw new Error(
      `Cannot rebuild published artefacts: missingRows=${missingRows.size}, missingActiveVersions=${missingActiveVersions.size}, missingSnapshots=${missingSnapshots.size}, excludedPages=${excludedPages.size}`,
    )
  }
  const siteIds = new Set(snapshots.map((snapshot) => snapshot.site.id))
  if (siteIds.size > 1) throw new Error('Cannot rebuild published artefacts: inconsistent published site identities')

  // Take each active page from its own immutable version, retaining each site's
  // published shell/templates. Never substitute the current draft for a page.
  const activePages = snapshots.flatMap((snapshot) =>
    snapshot.site.pages.filter((page) => page.id === snapshot.pageRowId && !isTemplatePage(page)),
  )
  if (excludedPages.size > 0) {
    console.warn(`[publish:rebuild] excludedPages=${excludedPages.size}, activePublishedPages=${activePages.length}`)
  }
  return snapshots.map((snapshot) => ({
    ...snapshot,
    site: {
      ...snapshot.site,
      pages: [...snapshot.site.pages.filter(isTemplatePage), ...activePages],
    },
  }))
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
    const metadata = await listPagePublicationMetadata(db)
    const snapshots = reconcilePublishedPageRoster(await listPublishedPageSnapshots(db), metadata)
    if (snapshots.length === 0) return { rebuiltPages: 0 }

    const publishedSite = snapshots[0].site

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
