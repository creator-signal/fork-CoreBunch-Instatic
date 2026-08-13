/**
 * Plugin pack installation.
 *
 * A plugin "pack" is the optional bundle of Visual Components, page
 * templates, class definitions, and saved layouts a plugin ships alongside
 * its server / module code. When a plugin manifest declares `pack` and the user has
 * granted `visualComponents.register`, importing the pack is what they
 * expected — both for fresh installs and upgrades. The route here is the
 * explicit re-sync trigger from the admin UI; the install flow imports
 * `installPluginPackToSite` directly to auto-install at install time.
 *
 *   POST /admin/api/cms/plugins/:id/pack/install
 */
import type { DbClient } from '../../../db/client'
import type { AuthUser } from '../../../repositories/users'
import { createAuditEvent } from '../../../repositories/audit'
import { getInstalledPlugin } from '../../../repositories/plugins'
import type { InstalledPlugin } from '@core/plugin-sdk'
import {
  applyPluginPackToSite,
  loadPluginPackFile,
  parsePluginPack,
  PluginPackError,
} from '../../../plugins/pack'
import { getDraftSite, saveDraftSite } from '../../../repositories/site'
import {
  listDataRows,
  createDataRow,
  saveDataRowDraft,
} from '../../../repositories/data'
import { pageFromRow, pageToCells } from '../../../../src/core/data/pageFromRow'
import { visualComponentToCells } from '../../../../src/core/data/componentFromRow'
import { savedLayoutFromRow, savedLayoutToCells } from '../../../../src/core/data/layoutFromRow'
import { vcSlugFromName } from '@core/visualComponents'
import { layoutSlugFromName } from '@core/layouts'
import { badRequest, jsonResponse, methodNotAllowed } from '../../../http'
import { type CmsHandlerOptions, requestAuditContext } from '../shared'
import { pluginNotFound } from './shared'
import {
  notifyRowWrite,
  notifyShellWrite,
  serializeCollabAwareWrite,
} from '../../../repositories/rowWriteEvents'

export interface PluginPackSummary {
  installed: {
    visualComponents: { id: string; name: string }[]
    pages: { id: string; title: string }[]
    classes: { id: string; name: string }[]
    layouts: { id: string; name: string }[]
  }
  replaced: { visualComponents: string[]; pages: string[]; classes: string[]; layouts: string[] }
  removed: { classes: string[] }
  skipped: { pages: string[] }
}

/**
 * Load the plugin's pack from disk, merge into the active site, and emit an
 * audit event. Returns `null` when the plugin doesn't declare a pack, has
 * no assets on disk, or there is no draft site yet. Used by both the
 * auto-install path (zip upload + upgrade) and the explicit
 * `POST /pack/install` route.
 */
async function installPluginPackToSite(
  db: DbClient,
  plugin: InstalledPlugin,
  uploadsDir: string,
  actorUserId: string,
  req: Request,
): Promise<PluginPackSummary | null> {
  if (!plugin.manifest.pack) return null
  if (!plugin.manifest.assetBasePath) return null
  const raw = await loadPluginPackFile(uploadsDir, plugin.manifest.assetBasePath, plugin.manifest.pack.path)
  const pack = parsePluginPack(plugin.id, raw)

  return serializeCollabAwareWrite(async () => {
    const shell = await getDraftSite(db)
    if (!shell) return null

    // Read and write under one collaboration-aware lane. The database
    // transaction below makes the shell, technical records, optional starter
    // pages and audit event one atomic change: a conflict or write failure
    // leaves the existing draft untouched and the next bootstrap can retry.
    const [pageRows, vcRows, layoutRows] = await Promise.all([
      listDataRows(db, 'pages'),
      listDataRows(db, 'components'),
      listDataRows(db, 'layouts'),
    ])
    const { visualComponentFromRow } = await import('../../../../src/core/data/componentFromRow')
    const existingVCs = vcRows.flatMap((r) => {
      const vc = visualComponentFromRow(r)
      return vc ? [vc] : []
    })
    const existingLayouts = layoutRows.flatMap((r) => {
      const layout = savedLayoutFromRow(r)
      return layout ? [layout] : []
    })
    const tempSiteDoc = {
      ...shell,
      pages: pageRows.map(pageFromRow),
      visualComponents: existingVCs,
      layouts: existingLayouts,
    }

    const {
      site: nextSiteDoc,
      replaced,
      removed,
      pageImport,
    } = applyPluginPackToSite(plugin.id, tempSiteDoc, pack)

    const { pages: packPages, visualComponents: _vcs, layouts: _layouts, ...nextShell } = nextSiteDoc
    const installedPageIds = new Set(pageImport.installedIds)
    const existingVCsById = new Set(vcRows.map((row) => row.id))
    const existingLayoutsById = new Set(layoutRows.map((row) => row.id))
    const createdVCIds = pack.visualComponents.filter((vc) => !existingVCsById.has(vc.id)).map((vc) => vc.id)
    const updatedVCIds = pack.visualComponents.filter((vc) => existingVCsById.has(vc.id)).map((vc) => vc.id)
    const createdLayoutIds = pack.layouts.filter((layout) => !existingLayoutsById.has(layout.id)).map((layout) => layout.id)
    const updatedLayoutIds = pack.layouts.filter((layout) => existingLayoutsById.has(layout.id)).map((layout) => layout.id)

    await db.transaction(async (tx) => {
      await saveDraftSite(tx, nextShell, actorUserId, { collabInternal: true })

      // Starter pages are create-only and only when the site was empty. A
      // pack upgrade/re-sync never calls saveDataRowDraft for page rows.
      for (const page of packPages.filter((candidate) => installedPageIds.has(candidate.id))) {
        await createDataRow(
          tx,
          { id: page.id, tableId: 'pages', cells: pageToCells(page), slug: page.slug },
          actorUserId,
          null,
          { collabInternal: true },
        )
      }

      for (const vc of pack.visualComponents) {
        const cells = visualComponentToCells(vc)
        const slug = vcSlugFromName(vc.name)
        if (existingVCsById.has(vc.id)) {
          const updated = await saveDataRowDraft(
            tx,
            vc.id,
            { cells, slug },
            actorUserId,
            null,
            { collabInternal: true },
          )
          if (!updated) throw new Error(`Plugin pack Visual Component "${vc.id}" disappeared during install`)
        } else {
          await createDataRow(
            tx,
            { id: vc.id, tableId: 'components', cells, slug },
            actorUserId,
            null,
            { collabInternal: true },
          )
        }
      }

      for (const layout of pack.layouts) {
        const cells = savedLayoutToCells(layout)
        const slug = layoutSlugFromName(layout.name)
        if (existingLayoutsById.has(layout.id)) {
          const updated = await saveDataRowDraft(
            tx,
            layout.id,
            { cells, slug },
            actorUserId,
            null,
            { collabInternal: true },
          )
          if (!updated) throw new Error(`Plugin pack layout "${layout.id}" disappeared during install`)
        } else {
          await createDataRow(
            tx,
            { id: layout.id, tableId: 'layouts', cells, slug },
            actorUserId,
            null,
            { collabInternal: true },
          )
        }
      }

      await createAuditEvent(tx, {
        actorUserId,
        action: 'plugin.pack.install',
        targetType: 'plugin',
        targetId: plugin.id,
        metadata: {
          pluginId: plugin.id,
          installedVisualComponents: pack.visualComponents.length,
          installedPages: pageImport.installedIds,
          skippedPages: pageImport.skippedIds,
          installedClasses: pack.classes.length,
          installedLayouts: pack.layouts.length,
          replacedVisualComponents: replaced.visualComponents,
          replacedPages: replaced.pages,
          replacedClasses: replaced.classes,
          replacedLayouts: replaced.layouts,
          removedClasses: removed.classes,
        },
        ...requestAuditContext(req),
      })
    })

    notifyShellWrite()
    if (pageImport.installedIds.length > 0) {
      notifyRowWrite({ tableId: 'pages', rowIds: pageImport.installedIds, kind: 'create' })
    }
    if (createdVCIds.length > 0) {
      notifyRowWrite({ tableId: 'components', rowIds: createdVCIds, kind: 'create' })
    }
    if (updatedVCIds.length > 0) {
      notifyRowWrite({ tableId: 'components', rowIds: updatedVCIds, kind: 'update' })
    }
    if (createdLayoutIds.length > 0) {
      notifyRowWrite({ tableId: 'layouts', rowIds: createdLayoutIds, kind: 'create' })
    }
    if (updatedLayoutIds.length > 0) {
      notifyRowWrite({ tableId: 'layouts', rowIds: updatedLayoutIds, kind: 'update' })
    }

    return {
      installed: {
        visualComponents: pack.visualComponents.map((vc) => ({ id: vc.id, name: vc.name })),
        pages: pack.pages
          .filter((page) => installedPageIds.has(page.id))
          .map((page) => ({ id: page.id, title: page.title })),
        classes: pack.classes.map((c) => ({ id: c.id, name: c.name })),
        layouts: pack.layouts.map((l) => ({ id: l.id, name: l.name })),
      },
      replaced,
      removed,
      skipped: { pages: pageImport.skippedIds },
    }
  })
}

/**
 * Best-effort wrapper around `installPluginPackToSite` for the install /
 * upgrade flows. Swallows errors so a pack failure doesn't abort the
 * surrounding install — the caller already has a working plugin row, the
 * pack just isn't synced.
 */
export async function maybeAutoInstallPluginPack(
  db: DbClient,
  plugin: InstalledPlugin,
  options: CmsHandlerOptions,
  user: AuthUser,
  req: Request,
): Promise<PluginPackSummary | null> {
  if (!options.uploadsDir) return null
  if (!plugin.manifest.pack) return null
  if (!plugin.grantedPermissions.includes('visualComponents.register')) return null

  try {
    return await installPluginPackToSite(db, plugin, options.uploadsDir, user.id, req)
  } catch (err) {
    console.error(`[plugins:${plugin.id}] auto pack install failed`, err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Route handler — POST /admin/api/cms/plugins/:id/pack/install
// ---------------------------------------------------------------------------

export async function handlePluginPackInstall(
  req: Request,
  db: DbClient,
  options: CmsHandlerOptions,
  user: AuthUser,
  pluginId: string,
): Promise<Response> {
  if (req.method !== 'POST') return methodNotAllowed()
  if (!options.uploadsDir) {
    return jsonResponse({ error: 'Uploads directory is not configured' }, { status: 500 })
  }

  const result = await getInstalledPlugin(db, pluginId)
  if (!result) return pluginNotFound()
  if (result.kind === 'broken') {
    return badRequest(`Plugin "${pluginId}" has a corrupt manifest — remove and reinstall it`)
  }
  const plugin = result.plugin
  // A disabled plugin pushing pack content (Visual Components, pages,
  // classes) into the user's draft site contradicts the user's intent in
  // disabling the plugin. Reject the action explicitly so the API matches
  // the UI gate (see PluginsPage `Re-sync pack` button).
  if (!plugin.enabled) {
    return badRequest(`Plugin "${pluginId}" is disabled — enable it before re-syncing its pack`)
  }
  if (!plugin.grantedPermissions.includes('visualComponents.register')) {
    return badRequest(`Plugin "${pluginId}" requires the visualComponents.register permission to install a pack`)
  }
  if (!plugin.manifest.pack) {
    return badRequest(`Plugin "${pluginId}" does not declare a pack`)
  }
  if (!plugin.manifest.assetBasePath) {
    return badRequest(`Plugin "${pluginId}" has no on-disk package`)
  }

  try {
    const summary = await installPluginPackToSite(db, plugin, options.uploadsDir, user.id, req)
    if (!summary) {
      return badRequest('No draft site to install pack into; finish initial setup first.')
    }
    return jsonResponse(summary)
  } catch (err) {
    if (err instanceof PluginPackError) return badRequest(err.message)
    throw err
  }
}
