import type { InsertLocation } from '@site/store/insertLocation'
import { useEditorStore } from '@site/store/store'
import { pushToast } from '@ui/components/Toast'
import type { ModuleInserterItem } from '@site/module-picker/moduleInserterModel'
import { useInsertModule } from './useInsertModule'
import { useInsertComponentLibraryEntry } from './useInsertComponentLibraryEntry'

/**
 * Shared handler for the module inserter dialog's `onInsertItem` callback.
 *
 * Inserts the picked module, saved layout or governed component into the active
 * canvas document and surfaces a success toast. Both inserter entry points use
 * it — the main toolbar "+ Add" button (`ModulePickerDropdown`) and the canvas
 * selection toolbar's "Insert module" action — so the two flows stay identical.
 *
 * Target resolution: when the dialog passes an explicit drop `target` it is
 * used verbatim; otherwise the shared insert hooks resolve the location from
 * the current selection via `resolveInsertLocation` (container targets nest the
 * new node as a last child, leaf targets get a sibling-after insertion).
 */
export function useInsertInserterItem() {
  const insertModule = useInsertModule()
  const insertCatalogueEntry = useInsertComponentLibraryEntry()

  const insertLayoutAction = useEditorStore((s) => s.insertLayout)

  return (
    item: ModuleInserterItem,
    target: InsertLocation | undefined,
    mode: 'click' | 'drop',
  ): boolean => {
    const inserted =
      item.kind === 'module'
        ? Boolean(insertModule(item.module, target))
        : item.kind === 'savedLayout'
          ? Boolean(insertLayoutAction(item.id, target))
          : item.kind === 'component'
            ? Boolean(insertCatalogueEntry(
                item.entry,
                {
                  ...(item.presetId ? { presetId: item.presetId } : {}),
                  ...(item.variantId ? { variantId: item.variantId } : {}),
                  showSuccessToast: false,
                },
                target,
              ))
            : false

    if (!inserted) return false

    pushToast({
      kind: 'success',
      title: mode === 'drop' ? `Placed ${item.name}` : `Inserted ${item.name}`,
      body: mode === 'drop' ? 'Dropped on canvas.' : 'Inserted at the current selection.',
      location: 'module-inserter',
    })
    return true
  }
}
