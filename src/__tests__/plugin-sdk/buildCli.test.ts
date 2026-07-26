import { describe, expect, it } from 'bun:test'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { buildPlugin } from '../../core/plugin-sdk/cli/build'

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
})
