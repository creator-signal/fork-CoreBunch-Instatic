import { registry } from '@core/module-engine'
import type {
  ComponentLibraryEntry,
  ComponentLibraryImplementation,
} from '@core/component-library'
import type { CatalogueInstanceMetadata } from '@core/page-tree'
import { pushToast } from '@ui/components/Toast'
import { resolveInsertLocation } from '@site/store/insertLocation'
import { selectActiveCanvasPage, useEditorStore } from '@site/store/store'
import { useInsertModule } from './useInsertModule'

export interface InsertComponentLibraryEntryOptions {
  presetId?: string
}

/**
 * Insert a catalogue entry through its canonical page-tree implementation.
 *
 * The backing node remains ordinary editor content; the catalogue identity is
 * stamped atomically so Components view can project it without maintaining a
 * parallel document model.
 */
export function useInsertComponentLibraryEntry() {
  const canvasPage = useEditorStore(selectActiveCanvasPage)
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId)
  const insertComponentRef = useEditorStore((state) => state.insertComponentRef)
  const selectNode = useEditorStore((state) => state.selectNode)
  const insertModule = useInsertModule()

  return (
    entry: ComponentLibraryEntry,
    options: InsertComponentLibraryEntryOptions = {},
  ): string | null => {
    if (!canvasPage) return null

    const implementation = backingImplementation(entry.implementation)
    const presetId = options.presetId ??
      (implementation.type === 'primitive' ? implementation.presetId : undefined)
    const metadata = createInstanceMetadata(entry, presetId)

    let nodeId: string | null
    if (implementation.type === 'primitive') {
      const mod = registry.get(implementation.moduleId)
      if (!mod) {
        pushUnsupportedEntryToast(entry, `Module "${implementation.moduleId}" is not registered.`)
        return null
      }

      const presetValues = presetId
        ? entry.presets.find((preset) => preset.id === presetId)?.values
        : undefined
      nodeId = insertModule(mod, undefined, {
        defaults: { ...mod.defaults, ...presetValues },
        catalogueInstance: metadata,
      })
    } else if (implementation.type === 'visual-component') {
      const location = resolveInsertLocation(
        canvasPage,
        selectedNodeId ?? canvasPage.rootNodeId,
      )
      if (!location) return null
      nodeId = insertComponentRef(
        location.parentId,
        implementation.componentId,
        location.index,
        { catalogueInstance: metadata },
      )
      if (nodeId) selectNode(nodeId)
    } else {
      pushUnsupportedEntryToast(
        entry,
        implementation.type === 'pattern'
          ? 'Pattern materialization is not available yet.'
          : 'Template-role placement is not available in this canvas.',
      )
      return null
    }

    if (!nodeId) return null
    pushToast({
      kind: 'success',
      title: `Inserted ${entry.name}`,
      body: 'Inserted at the current selection.',
      location: 'component-library',
    })
    return nodeId
  }
}

function backingImplementation(
  implementation: ComponentLibraryImplementation,
): Exclude<ComponentLibraryImplementation, { type: 'capability-backed' }> {
  return implementation.type === 'capability-backed'
    ? implementation.backing
    : implementation
}

function createInstanceMetadata(
  entry: ComponentLibraryEntry,
  presetId: string | undefined,
): CatalogueInstanceMetadata {
  const capabilityId = entry.requirements.capabilities[0]
  const providerAdapterId = entry.requirements.providerAdapters[0]
  return {
    entryId: entry.id,
    entryVersion: entry.version,
    ...(presetId ? { presetId } : {}),
    ...(entry.implementation.type === 'capability-backed'
      ? {
          ...(capabilityId ? { capabilityId } : {}),
          ...(providerAdapterId ? { providerAdapterId } : {}),
        }
      : {}),
  }
}

function pushUnsupportedEntryToast(entry: ComponentLibraryEntry, body: string): void {
  pushToast({
    kind: 'error',
    title: `Could not insert ${entry.name}`,
    body,
    location: 'component-library',
  })
}
