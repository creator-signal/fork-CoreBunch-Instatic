import { afterEach, describe, expect, it } from 'bun:test'
import {
  componentLibraryRegistry,
  type ComponentLibraryEntry,
} from '@core/component-library'
import {
  activatePluginComponentLibraryPack,
  deactivatePluginComponentLibraryPack,
  findPluginComponentLibraryLifecycleBlockers,
  listPluginComponentLibraryEntryIds,
} from '@core/plugins/componentLibraryPackLoader'
import type { PluginManifest } from '@core/plugin-sdk'
import { makeNode, makePage, makeSite, makeVC } from '../fixtures'
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

  it('finds persisted page and Visual Component instances even without a live registration', () => {
    const pageInstance = makeNode({
      id: 'page-callout',
      catalogueInstance: {
        entryId: `${pluginId}.callout`,
        entryVersion: '1.0.0',
      },
    })
    const componentInstance = makeNode({
      id: 'component-callout',
      catalogueInstance: {
        entryId: `${pluginId}.callout`,
        entryVersion: '1.0.0',
      },
    })
    const site = makeSite({
      pages: [makePage({
        id: 'home',
        title: 'Home',
        rootNodeId: 'page-root',
        nodes: {
          'page-root': makeNode({
            id: 'page-root',
            moduleId: 'base.body',
            children: [pageInstance.id],
          }),
          [pageInstance.id]: pageInstance,
        },
      })],
      visualComponents: [makeVC({
        id: 'hero',
        name: 'Hero',
        tree: {
          rootNodeId: 'component-root',
          nodes: {
            'component-root': makeNode({
              id: 'component-root',
              children: [componentInstance.id],
            }),
            [componentInstance.id]: componentInstance,
          },
        },
      })],
    })

    expect(findPluginComponentLibraryLifecycleBlockers(site, pluginId))
      .toEqual([{
        entryId: `${pluginId}.callout`,
        usages: [
          expect.objectContaining({
            documentKind: 'page',
            documentId: 'home',
            documentName: 'Home',
            nodeId: 'page-callout',
          }),
          expect.objectContaining({
            documentKind: 'visual-component',
            documentId: 'hero',
            documentName: 'Hero',
            nodeId: 'component-callout',
          }),
        ],
        replacementAvailable: false,
      }])
  })

  it('reports a safe external replacement as remediation without clearing the blocker', () => {
    activatePluginComponentLibraryPack(manifest, [
      entry({ replacementEntryId: 'base.plain-text' }),
    ])
    const site = makeSite({
      pages: [makePage({
        nodes: {
          root: makeNode({
            id: 'root',
            moduleId: 'base.body',
            children: ['callout'],
          }),
          callout: makeNode({
            id: 'callout',
            catalogueInstance: {
              entryId: `${pluginId}.callout`,
              entryVersion: '1.0.0',
            },
          }),
        },
      })],
    })

    expect(findPluginComponentLibraryLifecycleBlockers(site, pluginId))
      .toEqual([expect.objectContaining({
        entryId: `${pluginId}.callout`,
        entryName: 'Callout',
        replacementEntryId: 'base.plain-text',
        replacementAvailable: true,
        usages: [expect.objectContaining({ nodeId: 'callout' })],
      })])
  })
})
