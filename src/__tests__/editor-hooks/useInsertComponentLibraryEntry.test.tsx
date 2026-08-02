import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { componentLibraryRegistry } from '@core/component-library'
import { registry } from '@core/module-engine'
import { useInsertComponentLibraryEntry } from '@site/hooks/useInsertComponentLibraryEntry'
import { useEditorStore } from '@site/store/store'
import '@modules/base/index'

beforeEach(() => {
  // clearSite resets the collaboration documents and their undo managers.
  useEditorStore.getState().clearSite()
  useEditorStore.setState({
    site: null,
    activePageId: null,
    activeDocument: null,
    selectedNodeId: null,
    selectedNodeIds: [],
    hoveredNodeId: null,
    packageJson: {},
    canUndo: false,
    canRedo: false,
  })
})

afterEach(() => cleanup())

describe('useInsertComponentLibraryEntry', () => {
  it('inserts preset defaults and catalogue identity in one undoable mutation', () => {
    const store = useEditorStore.getState()
    store.createSite('Component Library Test')
    const page = useEditorStore.getState().site!.pages[0]!
    const formId = store.insertNode(
      'base.form',
      registry.get('base.form')!.defaults,
      page.rootNodeId,
      undefined,
      {
        catalogueInstance: {
          entryId: 'base.form-container',
          entryVersion: '1.0.0',
        },
      },
    )
    store.selectNode(formId)
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
    expect(useEditorStore.getState().canUndo).toBe(true)

    act(() => useEditorStore.getState().undo())
    expect(useEditorStore.getState().site?.pages[0]?.nodes[nodeId!]).toBeUndefined()
  })

  it('rejects an entry outside its approved parent with no partial insertion', () => {
    const store = useEditorStore.getState()
    store.createSite('Component Library Constraints')
    const initialNodeCount = Object.keys(
      useEditorStore.getState().site!.pages[0]!.nodes,
    ).length
    const entry = componentLibraryRegistry.getOrThrow('base.email-input')
    const { result } = renderHook(() => useInsertComponentLibraryEntry())
    let nodeId: string | null = null

    act(() => {
      nodeId = result.current(entry)
    })

    expect(nodeId).toBeNull()
    expect(Object.keys(useEditorStore.getState().site!.pages[0]!.nodes)).toHaveLength(
      initialNodeCount,
    )
  })

  it('inserts a built-in Visual Component and its governed slots atomically', () => {
    const store = useEditorStore.getState()
    store.createSite('Built-in Visual Component')
    const entry = componentLibraryRegistry.getOrThrow('base.hero')
    const { result } = renderHook(() => useInsertComponentLibraryEntry())
    let nodeId: string | null = null

    act(() => {
      nodeId = result.current(entry)
    })

    const state = useEditorStore.getState()
    const inserted = state.site?.pages[0]?.nodes[nodeId!]
    expect(inserted?.moduleId).toBe('base.visual-component-ref')
    expect(inserted?.props.componentId).toBe('base.vc.hero')
    expect(inserted?.catalogueInstance).toEqual({
      entryId: 'base.hero',
      entryVersion: '1.0.0',
    })
    expect(inserted?.children).toHaveLength(1)
    const slot = state.site?.pages[0]?.nodes[inserted!.children[0]!]
    expect(slot?.moduleId).toBe('base.slot-instance')
    expect(slot?.props.slotName).toBe('actions')
    expect(state.canUndo).toBe(true)

    act(() => useEditorStore.getState().undo())
    expect(
      useEditorStore.getState().site?.pages[0]?.nodes[nodeId!],
    ).toBeUndefined()
  })

  it('materializes a governed pattern subtree in one undoable mutation', () => {
    const store = useEditorStore.getState()
    store.createSite('Built-in Pattern')
    const entry = componentLibraryRegistry.getOrThrow('base.card-grid')
    const { result } = renderHook(() => useInsertComponentLibraryEntry())
    let nodeId: string | null = null

    act(() => {
      nodeId = result.current(entry)
    })

    const state = useEditorStore.getState()
    const root = state.site?.pages[0]?.nodes[nodeId!]
    expect(root?.moduleId).toBe('base.component-frame')
    expect(root?.catalogueInstance?.entryId).toBe('base.card-grid')
    expect(root?.children).toHaveLength(1)
    const itemsId = root!.children[0]!
    expect(root?.catalogueInstance?.pattern?.authorableNodeIds)
      .toEqual([itemsId])
    const items = state.site?.pages[0]?.nodes[itemsId]
    expect(items?.children).toHaveLength(3)
    expect(
      items?.children.map((childId) =>
        state.site?.pages[0]?.nodes[childId]?.props.componentId),
    ).toEqual(['base.vc.card', 'base.vc.card', 'base.vc.card'])
    expect(state.canUndo).toBe(true)

    act(() => useEditorStore.getState().undo())
    expect(
      useEditorStore.getState().site?.pages[0]?.nodes[nodeId!],
    ).toBeUndefined()
  })

  it('materializes a selected pattern variant atomically on its governed root', () => {
    const store = useEditorStore.getState()
    store.createSite('Form Tabs Variant')
    const page = useEditorStore.getState().site!.pages[0]!
    const formId = store.insertNode(
      'base.form',
      registry.get('base.form')!.defaults,
      page.rootNodeId,
      undefined,
      {
        catalogueInstance: {
          entryId: 'base.form-container',
          entryVersion: '1.0.0',
        },
      },
    )
    store.selectNode(formId)
    const entry = componentLibraryRegistry.getOrThrow('base.form-tabs')
    const { result } = renderHook(() => useInsertComponentLibraryEntry())
    let nodeId: string | null = null

    act(() => {
      nodeId = result.current(entry, { variantId: 'vertical' })
    })

    const root = useEditorStore.getState().site?.pages[0]?.nodes[nodeId!]
    expect(root?.moduleId).toBe('base.tabs')
    expect(root?.props.orientation).toBe('vertical')
    expect(root?.catalogueInstance?.variantId).toBe('vertical')
    expect(useEditorStore.getState().canUndo).toBe(true)

    act(() => useEditorStore.getState().undo())
    expect(useEditorStore.getState().site?.pages[0]?.nodes[nodeId!]).toBeUndefined()
  })
})
