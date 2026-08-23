import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import '@modules/base'
import type { AiToolOutput } from '@core/ai'
import {
  componentLibraryPatternRegistry,
  componentLibraryRegistry,
  type ComponentLibraryEntry,
  type ComponentLibraryField,
} from '@core/component-library'
import { registry } from '@core/module-engine'
import { pluginModuleToHostModule } from '@core/plugins/moduleAdapter'
import { mcpToolsForCapabilities } from '../../../server/ai/mcp/registry'
import { siteTools } from '../../../server/ai/tools/site'
import { executeAgentTool } from '@site/agent'
import { useEditorStore } from '@site/store/store'
import {
  CREATOR_SIGNAL_AUTHORING_TASKS,
  creatorSignalAuthoringTaskMatrix,
  validateCreatorSignalAuthoringTaskMatrix,
} from '../../../integrations/creator-signal/authoring-tasks'
import {
  creatorSignalComponentLibraryEntries,
  creatorSignalPatternEntries,
} from '../../../integrations/creator-signal/component-library'
import creatorSignalPlugin from '../../../integrations/creator-signal/instatic-plugin.config'
import { pack } from '../../../integrations/creator-signal/pack/site'

const FULL_AUTHORING_CAPABILITIES: Parameters<typeof mcpToolsForCapabilities>[0] = [
  'ai.chat',
  'ai.tools.write',
  'site.read',
  'site.structure.edit',
  'site.components.edit',
  'pages.publish',
]

const BROWSER_AUTHORING_TOOLS = [
  'site_list_component_library',
  'site_insert_component',
  'site_update_component_field',
  'site_open_document',
  'site_render_snapshot',
  'site_delete_node',
]

beforeAll(() => {
  ensureCreatorSignalRegistry()
})

function ensureCreatorSignalRegistry(): void {
  for (const definition of creatorSignalPlugin.modules) {
    registry.registerOrReplace(pluginModuleToHostModule(
      'creator-signal.site',
      definition,
      () => () => null,
      creatorSignalPlugin.manifest.permissions,
      creatorSignalPlugin.manifest.networkAllowedHosts,
    ))
  }
  for (const entry of creatorSignalComponentLibraryEntries) {
    componentLibraryRegistry.registerOrReplace(entry)
  }
}

afterAll(() => {
  for (const definition of creatorSignalPlugin.modules) registry.unregister(definition.id)
  componentLibraryRegistry.unregisterSource({
    type: 'plugin',
    pluginId: 'creator-signal.site',
  })
})

describe('Creator Signal catalogue authoring tasks', () => {
  it('derives one complete supported-task row for all 34 governed entries', () => {
    expect(creatorSignalComponentLibraryEntries).toHaveLength(34)
    expect(creatorSignalAuthoringTaskMatrix).toHaveLength(34)
    expect(creatorSignalAuthoringTaskMatrix.map((row) => row.entryId)).toEqual(
      creatorSignalComponentLibraryEntries.map((entry) => entry.id),
    )
    expect(validateCreatorSignalAuthoringTaskMatrix()).toEqual([])

    const browserToolNames = siteTools.map((tool) => tool.name)
    const mcpToolNames = mcpToolsForCapabilities(FULL_AUTHORING_CAPABILITIES).map((tool) => tool.name)
    expect(browserToolNames).toEqual(expect.arrayContaining(BROWSER_AUTHORING_TOOLS))
    expect(mcpToolNames).toEqual(expect.arrayContaining([
      ...BROWSER_AUTHORING_TOOLS,
      'site_publish',
    ]))

    for (const row of creatorSignalAuthoringTaskMatrix) {
      expect(Object.keys(row.tasks)).toEqual(CREATOR_SIGNAL_AUTHORING_TASKS)
      for (const task of CREATOR_SIGNAL_AUTHORING_TASKS) {
        expect(row.tasks[task].editor).toBeTruthy()
        expect(row.tasks[task].mcp).toBeTruthy()
      }
    }
  })

  it('discovers, inserts, opens for preview, configures, revises, and removes every applicable entry through the MCP editor bridge', async () => {
    const listed = await listCreatorSignalEntries()
    expect(listed.map((entry) => entry.id).sort()).toEqual(
      creatorSignalComponentLibraryEntries.map((entry) => entry.id).sort(),
    )

    for (const entry of creatorSignalComponentLibraryEntries) {
      ensureCreatorSignalRegistry()
      const rootId = await freshCreatorSignalDocument(
        entry.constraints.allowedDocumentKinds?.includes('template') &&
          !entry.constraints.allowedDocumentKinds.includes('page')
          ? 'template'
          : 'page',
      )
      ensureCreatorSignalRegistry()
      const inserted = toolData<{ nodeId: string; entryId: string; entryVersion: string }>(
        await executeAgentTool('site_insert_component', {
          entryId: entry.id,
          parentId: rootId,
        }),
      )
      expect(inserted.entryId, entry.id).toBe(entry.id)
      expect(inserted.entryVersion, entry.id).toBe(entry.version)

      const activeDocument = useEditorStore.getState().site?.pages.find(
        (page) => page.id === useEditorStore.getState().activePageId,
      )
      if (!activeDocument) throw new Error('Creator Signal authoring task has no active document')
      expectToolOk(await executeAgentTool('site_open_document', {
        document: { type: activeDocument.template ? 'template' : 'page', id: activeDocument.id },
      }))

      if (entry.fields.length > 0) {
        const field = entry.fields[0]!
        ensureCreatorSignalRegistry()
        const updated = toolData<{ nodeId: string; fieldKey: string }>(
          await executeAgentTool('site_update_component_field', {
            nodeId: inserted.nodeId,
            fieldKey: field.key,
            value: validFieldValue(field),
          }),
        )
        expect(updated.nodeId, entry.id).toBe(inserted.nodeId)
        expect(updated.fieldKey, entry.id).toBe(field.key)
        ensureCreatorSignalRegistry()
        const revised = toolData<{ nodeId: string; fieldKey: string }>(
          await executeAgentTool('site_update_component_field', {
            nodeId: inserted.nodeId,
            fieldKey: field.key,
            value: validFieldValue(field),
          }),
        )
        expect(revised.nodeId, entry.id).toBe(inserted.nodeId)
        expect(revised.fieldKey, entry.id).toBe(field.key)
      } else {
        const pattern = creatorSignalPatternEntries.find((candidate) => candidate.id === entry.id)
        expect(pattern, entry.id).toBeDefined()
        if (entry.implementation.type !== 'pattern') throw new Error(`${entry.id} has no pattern implementation`)
        const fragment = componentLibraryPatternRegistry.materialize(entry.implementation.patternId, {
          entryId: entry.id,
          entryVersion: entry.version,
        })
        expect(fragment?.rootIds).toHaveLength(1)
        const root = fragment?.nodes[fragment.rootIds[0]!]
        expect(root?.catalogueInstance?.pattern?.authorableNodeIds.length, entry.id)
          .toBeGreaterThan(0)
      }

      expectToolOk(await executeAgentTool('site_delete_node', { nodeId: inserted.nodeId }))
    }
  }, 120_000)
})

async function listCreatorSignalEntries(): Promise<Array<{
  id: string
  source: { type: string; pluginId?: string }
}>> {
  ensureCreatorSignalRegistry()
  await freshCreatorSignalDocument('page')
  return toolData<{ entries: Array<{
    id: string
    source: { type: string; pluginId?: string }
  }> }>(
    await executeAgentTool('site_list_component_library', {
      sourceType: 'plugin',
      limit: 100,
    }),
  ).entries.filter((entry) => entry.source.pluginId === 'creator-signal.site')
}

async function freshCreatorSignalDocument(kind: 'page' | 'template'): Promise<string> {
  useEditorStore.setState({
    site: null,
    _historyPast: [],
    _historyFuture: [],
    canUndo: false,
    canRedo: false,
    selectedNodeId: null,
    selectedNodeIds: [],
    activeDocument: null,
  })
  const store = useEditorStore.getState()
  const site = store.createSite('Creator Signal authoring task test')
  useEditorStore.setState({
    site: { ...site, visualComponents: structuredClone(pack.visualComponents) },
  })
  if (kind === 'template') {
    expectToolOk(await executeAgentTool('site_set_page_template', {
      pageId: useEditorStore.getState().activePageId!,
      target: { kind: 'everywhere' },
    }))
  }
  const activePageId = useEditorStore.getState().activePageId
  const activePage = useEditorStore.getState().site?.pages.find((page) => page.id === activePageId)
  if (!activePage) throw new Error('Creator Signal authoring test has no active page')
  return activePage.rootNodeId
}

function validFieldValue(field: ComponentLibraryField): unknown {
  if (field.type === 'number') return 1
  if (field.type === 'boolean') return true
  if (field.type === 'select') return field.options?.[0]?.value ?? ''
  if (field.type === 'rich-text') return '<p>Updated governed content.</p>'
  if (field.type === 'repeater') {
    return Array.from({ length: field.minItems }, () => Object.fromEntries(
      field.itemFields.map((itemField) => [itemField.key, validFieldValue(itemField)]),
    ))
  }
  return 'Updated governed content'
}

function expectToolOk(result: AiToolOutput): asserts result is AiToolOutput & { ok: true } {
  expect(result.ok).toBe(true)
  expect(result.error).toBeUndefined()
}

function toolData<T extends Record<string, unknown>>(result: AiToolOutput): T {
  expectToolOk(result)
  expect(result.data && typeof result.data === 'object').toBe(true)
  return result.data as T
}
