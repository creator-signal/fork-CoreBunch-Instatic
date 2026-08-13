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
import { listDataRows } from '../repositories/data'
import { handleSetupRoutes } from '../handlers/cms/setup'
import { handlePackageInstall } from '../handlers/cms/plugins/install'
import { handlePluginPackInstall } from '../handlers/cms/plugins/pack'
import { readPluginPackage } from '../plugins/package'
import { publishDraftSite } from '../publish/publishSite'
import type { PluginPackSummary } from '../handlers/cms/plugins/pack'

interface StarterSiteResult {
  createdOwner: boolean
  installedPlugin: boolean
  publishedPages: number
}

async function requireSuccessfulJson<T>(response: Response, operation: string): Promise<T> {
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`${operation} failed (${response.status}): ${body.slice(0, 500)}`)
  }
  return response.json() as Promise<T>
}

/**
 * Reconcile a trusted, image-bundled starter site into an empty installation.
 *
 * This path is deliberately opt-in through a complete bootstrap configuration.
 * It uses the same setup and package-install handlers as the browser, so owner
 * creation, permission validation, lifecycle hooks, pack import, and auditing
 * keep one implementation. Existing sites are never reset: matching plugin
 * versions and authored pages are left alone. Starter pages are seeded only
 * by a successful pack import into an empty page roster.
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
      { seedDefaultPage: false },
    )
    if (!response) throw new Error('Starter-site setup route was not handled')
    await requireSuccessfulJson(response, 'Starter-site owner creation')
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
  let installedStarterPages = 0

  if (!existing || existing.version !== pluginPackage.manifest.version) {
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
    const payload = await requireSuccessfulJson<{ pack?: PluginPackSummary | null }>(
      response,
      'Starter-site plugin installation',
    )
    installedStarterPages = payload.pack?.installed.pages.length ?? 0
    installedPlugin = true
  } else if ((await listDataRows(db, 'pages')).length === 0) {
    // A process/database failure can happen after the package became active
    // but before its first atomic pack import completed. Same-version boots
    // must retry the empty-site seed instead of leaving the installation with
    // no pages forever. The pack handler remains create-only for pages.
    const response = await handlePluginPackInstall(
      new Request(
        `http://localhost/admin/api/cms/plugins/${encodeURIComponent(existing.id)}/pack/install`,
        { method: 'POST' },
      ),
      db,
      { uploadsDir },
      owner,
      existing.id,
    )
    const summary = await requireSuccessfulJson<PluginPackSummary>(
      response,
      'Starter-site pack retry',
    )
    installedStarterPages = summary.installed.pages.length
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

  if (installedStarterPages === 0) {
    if (createdOwner) {
      throw new Error('Starter-site pack did not import pages into the new empty site')
    }
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
