import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { componentLibraryRegistry } from '@core/component-library'
import { useInsertComponentLibraryEntry } from '@site/hooks/useInsertComponentLibraryEntry'
import { useEditorStore } from '@site/store/store'
import '@modules/base/index'

beforeEach(() => {
  useEditorStore.setState({
    site: null,
    activePageId: null,
    activeDocument: null,
    selectedNodeId: null,
    selectedNodeIds: [],
    hoveredNodeId: null,
    packageJson: {},
    _historyPast: [],
    _historyFuture: [],
    canUndo: false,
    canRedo: false,
    hasUnsavedChanges: false,
  })
})

afterEach(() => cleanup())

describe('useInsertComponentLibraryEntry', () => {
  it('inserts preset defaults and catalogue identity in one undoable mutation', () => {
    const store = useEditorStore.getState()
    store.createSite('Component Library Test')
    const entry = componentLibraryRegistry.getOrThrow('base.email-input')
    const { result } = renderHook(() => useInsertComponentLibraryEntry())
    let nodeId: string | null = null

    act(() => {
      nodeId = result.current(entry)
    })

    expect(nodeId).toBeTruthy()
    const inserted = useEditorStore.getState().site?.pages[0]?.nodes[nodeId!]
    expect(inserted?.moduleId).toBe('base.input')
    expect(inserted?.props.inputType).toBe('email')
    expect(inserted?.catalogueInstance).toEqual({
      entryId: 'base.email-input',
      entryVersion: '1.0.0',
      presetId: 'email',
    })
    expect(useEditorStore.getState()._historyPast).toHaveLength(1)

    act(() => useEditorStore.getState().undo())
    expect(useEditorStore.getState().site?.pages[0]?.nodes[nodeId!]).toBeUndefined()
  })
})
