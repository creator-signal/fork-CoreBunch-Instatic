import { afterEach, describe, expect, it } from 'bun:test'
import {
  componentLibraryRegistry,
  type ComponentLibraryEntry,
} from '@core/component-library'
import {
  activatePluginComponentLibraryPack,
  deactivatePluginComponentLibraryPack,
  listPluginComponentLibraryEntryIds,
} from '@core/plugins/componentLibraryPackLoader'
import type { PluginManifest } from '@core/plugin-sdk'
import '@modules/base/index'

const pluginId = 'acme.catalogue'
const manifest: PluginManifest = {
  id: pluginId,
  name: 'Acme catalogue',
  version: '1.0.0',
  apiVersion: 1,
  permissions: ['componentLibrary.register'],
  grantedPermissions: ['componentLibrary.register'],
  componentLibrary: { path: 'component-library/entries.json' },
  resources: [],
  adminPages: [],
}

function entry(
  overrides: Partial<ComponentLibraryEntry> = {},
): ComponentLibraryEntry {
  return {
    id: `${pluginId}.callout`,
    version: '1.0.0',
    name: 'Callout',
    description: 'A plugin-owned governed callout.',
    category: 'Acme',
    tags: ['callout'],
    icon: 'message',
    source: {
      type: 'plugin',
      pluginId,
      name: 'Acme catalogue',
    },
    status: 'stable',
    implementation: {
      type: 'primitive',
      moduleId: 'base.text',
    },
    fields: [{
      key: 'text',
      label: 'Text',
      type: 'text',
      required: true,
    }],
    variants: [],
    presets: [],
    slots: [],
    constraints: {},
    requirements: {
      capabilities: [],
      providerAdapters: [],
      plugins: [pluginId],
    },
    documentation: {
      usage: 'Use for short notices.',
    },
    ...overrides,
  }
}

afterEach(() => {
  deactivatePluginComponentLibraryPack(pluginId)
})

describe('plugin Component Library package lifecycle', () => {
  it('registers validated plugin-owned entries and removes them on deactivate', () => {
    const registered = activatePluginComponentLibraryPack(manifest, [entry()])

    expect(registered.map((candidate) => candidate.id)).toEqual([
      `${pluginId}.callout`,
    ])
    expect(listPluginComponentLibraryEntryIds(pluginId)).toEqual([
      `${pluginId}.callout`,
    ])
    expect(componentLibraryRegistry.get(`${pluginId}.callout`)?.source).toEqual({
      type: 'plugin',
      pluginId,
      name: 'Acme catalogue',
    })

    deactivatePluginComponentLibraryPack(pluginId)
    expect(componentLibraryRegistry.get(`${pluginId}.callout`)).toBeUndefined()
  })

  it('rejects forged ownership and missing primitive implementations atomically', () => {
    expect(() => activatePluginComponentLibraryPack(manifest, [
      entry(),
      entry({
        id: 'other.plugin.callout',
        source: {
          type: 'plugin',
          pluginId: 'other.plugin',
        },
      }),
    ])).toThrow(/outside its namespace/)
    expect(componentLibraryRegistry.get(`${pluginId}.callout`)).toBeUndefined()

    expect(() => activatePluginComponentLibraryPack(manifest, [
      entry({
        implementation: {
          type: 'primitive',
          moduleId: `${pluginId}.missing`,
        },
      }),
    ])).toThrow(/unregistered module/)
    expect(componentLibraryRegistry.get(`${pluginId}.callout`)).toBeUndefined()
  })

  it('requires the granted catalogue permission, not only the declaration', () => {
    expect(() => activatePluginComponentLibraryPack({
      ...manifest,
      grantedPermissions: [],
    }, [entry()])).toThrow(/componentLibrary\.register/)
  })
})
