import type { ComponentLibraryEntry } from '@core/component-library'
import { pushToast } from '@ui/components/Toast'
import { resolveInsertLocation } from '@site/store/insertLocation'
import type { InsertLocation } from '@site/store/insertLocation'
import { selectActiveCanvasPage, useEditorStore } from '@site/store/store'
import { insertComponentLibraryEntry } from '@site/component-library/componentLibraryAuthoring'

export interface InsertComponentLibraryEntryOptions {
  presetId?: string
  variantId?: string
  showSuccessToast?: boolean
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

  return (
    entry: ComponentLibraryEntry,
    options: InsertComponentLibraryEntryOptions = {},
    explicitTarget?: InsertLocation,
  ): string | null => {
    if (!canvasPage) return null

    const location = explicitTarget ?? resolveInsertLocation(
      canvasPage,
      selectedNodeId ?? canvasPage.rootNodeId,
    )
    if (!location) return null
    const result = insertComponentLibraryEntry(
      useEditorStore.getState(),
      canvasPage,
      entry,
      location,
      options,
    )
    if (!result.ok) {
      pushUnsupportedEntryToast(entry, result.error)
      return null
    }
    if (options.showSuccessToast !== false) {
      pushToast({
        kind: 'success',
        title: `Inserted ${entry.name}`,
        body: 'Inserted at the current selection.',
        location: 'component-library',
      })
    }
    return result.nodeId
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
