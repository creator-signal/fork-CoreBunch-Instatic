import { basename } from 'node:path'
import { readFile } from 'node:fs/promises'
import type { DbClient } from '../db/client'
import type { StarterSiteConfig } from '../config'
import { getSetupStatus } from '../repositories/setup'
import { findUserByEmail } from '../repositories/users'
import {
  getInstalledPlugin,
  setPluginSettings,
} from '../repositories/plugins'
import { listDataRows, softDeleteDataRow } from '../repositories/data'
import { handleSetupRoutes } from '../handlers/cms/setup'
import { handlePackageInstall } from '../handlers/cms/plugins/install'
import { readPluginPackage } from '../plugins/package'
import { publishDraftSite } from '../publish/publishSite'

interface StarterSiteResult {
  createdOwner: boolean
  installedPlugin: boolean
  publishedPages: number
}

async function requireSuccessfulResponse(response: Response, operation: string): Promise<void> {
  if (response.ok) return
  const body = await response.text()
  throw new Error(`${operation} failed (${response.status}): ${body.slice(0, 500)}`)
}

/**
 * Reconcile a trusted, image-bundled starter site into an empty installation.
 *
 * This path is deliberately opt-in through a complete bootstrap configuration.
 * It uses the same setup and package-install handlers as the browser, so owner
 * creation, permission validation, lifecycle hooks, pack import, and auditing
 * keep one implementation. Existing sites are never reset: matching plugin
 * versions and authored pages are left alone.
 */
export async function bootstrapStarterSite(
  db: DbClient,
  config: StarterSiteConfig,
  uploadsDir: string,
): Promise<StarterSiteResult> {
  const initialStatus = await getSetupStatus(db)
  let createdOwner = false

  if (initialStatus.needsSetup) {
    const response = await handleSetupRoutes(
      new Request('http://localhost/admin/api/cms/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteName: config.siteName,
          email: config.ownerEmail,
          password: config.ownerPassword,
        }),
      }),
      db,
    )
    if (!response) throw new Error('Starter-site setup route was not handled')
    await requireSuccessfulResponse(response, 'Starter-site owner creation')
    createdOwner = true
  }

  const owner = await findUserByEmail(db, config.ownerEmail)
  if (!owner || owner.role.slug !== 'owner' || owner.status !== 'active') {
    throw new Error(`Starter-site owner ${config.ownerEmail} is unavailable`)
  }

  const packageBytes = await readFile(config.pluginPackagePath)
  const packageFile = new File(
    [packageBytes],
    basename(config.pluginPackagePath),
    { type: 'application/zip' },
  )
  const pluginPackage = await readPluginPackage(packageFile)
  const existingResult = await getInstalledPlugin(db, pluginPackage.manifest.id)
  const existing = existingResult?.kind === 'ok' ? existingResult.plugin : null
  let installedPlugin = false

  if (!existing || existing.version !== pluginPackage.manifest.version) {
    const pages = await listDataRows(db, 'pages')
    if (pages.length === 1 && pages[0]?.slug === 'index') {
      await softDeleteDataRow(db, pages[0].id, owner.id)
    }

    const form = new FormData()
    form.set('file', packageFile)
    form.set(
      'grantedPermissions',
      JSON.stringify(pluginPackage.manifest.permissions),
    )
    const response = await handlePackageInstall(
      new Request('http://localhost/admin/api/cms/plugins/package', {
        method: 'POST',
        body: form,
      }),
      db,
      { uploadsDir },
      owner,
    )
    await requireSuccessfulResponse(response, 'Starter-site plugin installation')
    installedPlugin = true
  }

  const installedResult = await getInstalledPlugin(db, pluginPackage.manifest.id)
  if (installedResult?.kind !== 'ok' || installedResult.plugin.lifecycleStatus !== 'active') {
    throw new Error(`Starter-site plugin ${pluginPackage.manifest.id} is not active`)
  }
  if (Object.keys(config.pluginSettings).length > 0) {
    await setPluginSettings(
      db,
      installedResult.plugin.id,
      installedResult.plugin.manifest.settings ?? [],
      config.pluginSettings,
    )
  }

  if (!createdOwner && !installedPlugin) {
    return { createdOwner, installedPlugin, publishedPages: 0 }
  }

  const pages = await listDataRows(db, 'pages')
  if (!pages.some((page) => page.slug === 'index')) {
    throw new Error('Starter-site pack did not provide an index page')
  }
  const published = await publishDraftSite(db, owner.id, uploadsDir)
  return {
    createdOwner,
    installedPlugin,
    publishedPages: published.publishedPages,
  }
}
