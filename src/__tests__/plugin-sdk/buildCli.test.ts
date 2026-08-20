import { describe, expect, it } from 'bun:test'
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildPlugin, readPluginDefinition } from '../../core/plugin-sdk/cli/build'

const PROJECT_ROOT = join(import.meta.dir, '../../..')

describe('instatic-plugin build', () => {
  it('copies the plugin assets directory into the built package', async () => {
    const parentDir = join(PROJECT_ROOT, '.tmp-build')
    await mkdir(parentDir, { recursive: true })
    const pluginDir = await mkdtemp(join(parentDir, 'plugin-'))

    try {
      await writeFile(
        join(pluginDir, 'instatic-plugin.config.ts'),
        `import { definePlugin } from '@core/plugin-sdk'
export default definePlugin({
  id: 'acme.static-assets',
  name: 'Static assets',
  version: '1.0.0',
  permissions: [],
})
`,
        'utf-8',
      )
      const sourceBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
      await mkdir(join(pluginDir, 'assets', 'icons'), { recursive: true })
      await writeFile(join(pluginDir, 'assets', 'icons', 'favicon.png'), sourceBytes)

      await buildPlugin(pluginDir, { zip: false })

      expect(
        await readFile(join(pluginDir, 'dist', 'assets', 'icons', 'favicon.png')),
      ).toEqual(sourceBytes)
    } finally {
      await rm(pluginDir, { recursive: true, force: true })
    }
  })

  it('emits governed Component Library entries as a declarative package', async () => {
    const parentDir = join(PROJECT_ROOT, '.tmp-build')
    await mkdir(parentDir, { recursive: true })
    const pluginDir = await mkdtemp(join(parentDir, 'plugin-catalogue-'))

    try {
      await writeFile(
        join(pluginDir, 'instatic-plugin.config.ts'),
        `import { definePlugin } from '@core/plugin-sdk'
export default definePlugin({
  id: 'acme.catalogue',
  name: 'Catalogue',
  version: '1.0.0',
  permissions: ['componentLibrary.register'],
  componentLibrary: [{
    id: 'acme.catalogue.callout',
    version: '1.0.0',
    name: 'Callout',
    description: 'A governed callout.',
    category: 'Acme',
    tags: ['callout'],
    icon: 'message',
    source: { type: 'plugin', pluginId: 'acme.catalogue' },
    status: 'stable',
    implementation: { type: 'primitive', moduleId: 'base.text' },
    fields: [],
    variants: [],
    presets: [],
    slots: [],
    constraints: {},
    requirements: { capabilities: [], providerAdapters: [], plugins: ['acme.catalogue'] },
    documentation: {},
  }],
})
`,
        'utf-8',
      )

      await buildPlugin(pluginDir, { zip: false })

      const manifest = JSON.parse(
        await readFile(join(pluginDir, 'dist', 'plugin.json'), 'utf-8'),
      ) as { componentLibrary?: { path?: string } }
      const entries = JSON.parse(
        await readFile(
          join(pluginDir, 'dist', 'component-library', 'entries.json'),
          'utf-8',
        ),
      ) as Array<{ id?: string }>
      expect(manifest.componentLibrary?.path).toBe(
        'component-library/entries.json',
      )
      expect(entries.map((entry) => entry.id)).toEqual([
        'acme.catalogue.callout',
      ])
    } finally {
      await rm(pluginDir, { recursive: true, force: true })
    }
  })

  it('packages every configured Creator Signal module into the runtime facade', async () => {
    const parentDir = join(PROJECT_ROOT, '.tmp-build')
    await mkdir(parentDir, { recursive: true })
    const pluginDir = await mkdtemp(join(parentDir, 'creator-signal-plugin-'))

    try {
      await cp(
        join(PROJECT_ROOT, 'integrations', 'creator-signal'),
        pluginDir,
        { recursive: true },
      )
      const definition = await readPluginDefinition(pluginDir)
      await buildPlugin(pluginDir, { zip: false })

      const modulePack = await import(
        `${pathToFileURL(join(pluginDir, 'dist', 'modules', 'index.js')).href}?test=${Date.now()}`
      ) as { default: Array<{ id: string }> }
      expect(modulePack.default.map((module) => module.id).sort()).toEqual(
        definition.modules.map((module) => module.id).sort(),
      )
    } finally {
      await rm(pluginDir, { recursive: true, force: true })
    }
  })
})
