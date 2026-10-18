import { beforeEach, afterEach, describe, expect, it } from 'bun:test'
import { canUpgradeComponentContentFields, componentLibraryRegistry, parseComponentLibraryEntry } from '@core/component-library'
import { registry } from '@core/module-engine'
import { activatePluginComponentLibraryPack, deactivatePluginComponentLibraryPack } from '@core/plugins/componentLibraryPackLoader'
import { pluginModuleToHostModule } from '@core/plugins/moduleAdapter'
import { useEditorStore } from '@site/store/store'
import plugin from '../../../integrations/creator-signal/instatic-plugin.config'
import retained from '../../../integrations/creator-signal/retained-component-definitions.json'
import { validatePageWriteDiff } from '../../../server/writePolicy/pageDiff'
import '@modules/base/index'

beforeEach(() => {
  useEditorStore.getState().clearSite()
  for (const module of plugin.modules) registry.registerOrReplace(pluginModuleToHostModule(plugin.manifest.id, module, () => () => null, plugin.manifest.permissions, plugin.manifest.networkAllowedHosts))
  activatePluginComponentLibraryPack({ ...plugin.manifest, grantedPermissions: plugin.manifest.permissions }, plugin.componentLibrary)
})
afterEach(() => {
  useEditorStore.getState().clearSite()
  deactivatePluginComponentLibraryPack(plugin.manifest.id)
  for (const module of plugin.modules) registry.unregister(module.id)
})

describe('retained Creator Signal authoring definitions', () => {
  it('ships immutable source identities and resolves every retained version after a cold load', () => {
    expect(retained.versions).toHaveLength(10)
    for (const snapshot of retained.versions) {
      expect(snapshot.sourceRevision).toMatch(/^[a-f0-9]{40}$/)
      expect(snapshot.sourceSha256).toMatch(/^[a-f0-9]{64}$/)
      const definition = parseComponentLibraryEntry(snapshot.definition)
      expect(componentLibraryRegistry.getVersion(definition.id, definition.version)).toEqual(definition)
    }
    const old = componentLibraryRegistry.getVersion('creator-signal.site.signal-comparison', '1.0.0')!
    expect(old.fields.some(field => field.key === 'beforeArtwork')).toBe(false)
    expect(canUpgradeComponentContentFields(old, componentLibraryRegistry.get(old.id))).toBe(true)
  })

  it('updates only reviewed instance metadata, preserves empty content and descendants, and supports undo/redo', () => {
    const site = useEditorStore.getState().createSite('Retained content')
    const page = site.pages[0]!
    const entryId = 'creator-signal.site.signal-comparison'
    const id = useEditorStore.getState().insertNode(entryId, { heading: 'Authored heading', beforeBody: '', artwork: '', artworkAlt: '' }, page.rootNodeId, undefined,
      { catalogueInstance: { entryId, entryVersion: '1.0.0' } })
    useEditorStore.getState().insertNode('base.text', { text: 'Retained child' }, id)
    const before = structuredClone(useEditorStore.getState().site!.pages[0]!.nodes)
    expect(useEditorStore.getState().upgradeComponentContentFields(id, '1.1.0')).toBe(true)
    const after = structuredClone(before)
    after[id]!.catalogueInstance!.entryVersion = '1.1.0'
    expect(useEditorStore.getState().site!.pages[0]!.nodes).toEqual(after)
    const nextPage = structuredClone(useEditorStore.getState().site!.pages[0]!)
    const previousPage = { ...nextPage, nodes: before }
    const diff = { previousPages: [previousPage], changedPages: [nextPage], deletedPageIds: new Set<string>() }
    expect(() => validatePageWriteDiff({ ...diff, capabilities: ['site.components.edit'] })).toThrow(/catalogue identity changed/)
    expect(() => validatePageWriteDiff({ ...diff, capabilities: ['site.structure.edit'] })).not.toThrow()
    expect(useEditorStore.getState().updateComponentLibraryField(id, 'beforeArtwork', '/media/example.png')).toBe(true)
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().site!.pages[0]!.nodes).toEqual(after)
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().site!.pages[0]!.nodes).toEqual(before)
    useEditorStore.getState().redo()
    expect(useEditorStore.getState().site!.pages[0]!.nodes).toEqual(after)
  })

  it('rejects pins, stale target versions, changed field semantics, rendering, slots and required additions', () => {
    const site = useEditorStore.getState().createSite('Denied update')
    const page = site.pages[0]!
    const entryId = 'creator-signal.site.signal-comparison'
    const source = componentLibraryRegistry.getVersion(entryId, '1.0.0')!
    const target = componentLibraryRegistry.get(entryId)!
    for (const changed of [
      { ...target, fields: [...target.fields, { key: 'newRequired', label: 'Required', type: 'text' as const, required: true }] },
      { ...target, implementation: { type: 'primitive' as const, moduleId: 'base.text' } },
      { ...target, slots: [{ id: 'new-slot', name: 'New slot', minItems: 0 }] },
      { ...target, fields: target.fields.filter(field => field.key !== 'heading') },
      { ...target, fields: target.fields.map(field => field.key === 'heading' ? { ...field, type: 'url' as const } : field) },
    ]) expect(canUpgradeComponentContentFields(source, changed)).toBe(false)
    const id = useEditorStore.getState().insertNode(entryId, { heading: '' }, page.rootNodeId, undefined,
      { catalogueInstance: { entryId, entryVersion: '1.0.0', pinnedVersion: '1.0.0' } })
    const unpinned = useEditorStore.getState().insertNode(entryId, { heading: '' }, page.rootNodeId, undefined,
      { catalogueInstance: { entryId, entryVersion: '1.0.0' } })
    const wrongModule = useEditorStore.getState().insertNode('base.text', { text: 'Retained' }, page.rootNodeId, undefined,
      { catalogueInstance: { entryId, entryVersion: '1.0.0' } })
    const before = structuredClone(useEditorStore.getState().site)
    expect(useEditorStore.getState().upgradeComponentContentFields(unpinned, '9.0.0')).toBe(false)
    expect(useEditorStore.getState().upgradeComponentContentFields(wrongModule, '1.1.0')).toBe(false)
    expect(useEditorStore.getState().upgradeComponentContentFields(id, '1.1.0')).toBe(false)
    expect(useEditorStore.getState().upgradeComponentContentFields(id, '9.0.0')).toBe(false)
    expect(useEditorStore.getState().site).toEqual(before)
  })
})
