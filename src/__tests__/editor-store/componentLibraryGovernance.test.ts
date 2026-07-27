import { beforeEach, describe, expect, it } from 'bun:test'
import { useEditorStore } from '@site/store/store'
import '@modules/base/index'

beforeEach(() => {
  useEditorStore.setState({
    site: null,
    activePageId: null,
    activeDocument: null,
    selectedNodeId: null,
    selectedNodeIds: [],
    _historyPast: [],
    _historyFuture: [],
    canUndo: false,
    canRedo: false,
  })
})

describe('Component Library governed mutations', () => {
  it('converts an eligible freeform primitive atomically and undo restores it', () => {
    const store = useEditorStore.getState()
    const site = store.createSite('Conversion Test')
    const page = site.pages[0]!
    const nodeId = useEditorStore.getState().insertNode(
      'base.input',
      {
        inputType: 'email',
        placeholder: 'you@example.com',
      },
      page.rootNodeId,
    )
    const before = structuredClone(
      useEditorStore.getState().site!.pages[0]!.nodes[nodeId]!,
    )
    useEditorStore.setState({
      _historyPast: [],
      _historyFuture: [],
      canUndo: false,
      canRedo: false,
    })

    expect(useEditorStore.getState().convertFreeformPrimitiveToComponent(
      nodeId,
      'base.email-input',
      'email',
    )).toBe(true)
    const converted = useEditorStore.getState().site!.pages[0]!.nodes[nodeId]!
    expect(converted.catalogueInstance).toEqual({
      entryId: 'base.email-input',
      entryVersion: '1.0.0',
      presetId: 'email',
    })
    expect({
      ...converted,
      catalogueInstance: undefined,
    }).toEqual({
      ...before,
      catalogueInstance: undefined,
    })
    expect(useEditorStore.getState()._historyPast).toHaveLength(1)

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().site!.pages[0]!.nodes[nodeId]).toEqual(before)
  })

  it('rejects a conversion when hidden implementation props do not match', () => {
    const store = useEditorStore.getState()
    const site = store.createSite('Invalid Conversion Test')
    const page = site.pages[0]!
    const nodeId = useEditorStore.getState().insertNode(
      'base.input',
      { inputType: 'invented' },
      page.rootNodeId,
    )
    const historyLength = useEditorStore.getState()._historyPast.length

    expect(useEditorStore.getState().convertFreeformPrimitiveToComponent(
      nodeId,
      'base.email-input',
      'email',
    )).toBe(false)
    expect(useEditorStore.getState()._historyPast).toHaveLength(historyLength)
    expect(useEditorStore.getState().site!.pages[0]!.nodes[nodeId]?.catalogueInstance)
      .toBeUndefined()
  })

  it('updates only declared fields through the retained definition', () => {
    const store = useEditorStore.getState()
    const site = store.createSite('Governance Test')
    const page = site.pages[0]!
    const nodeId = useEditorStore.getState().insertNode(
      'base.input',
      { placeholder: '', inputType: 'text' },
      page.rootNodeId,
      undefined,
      {
        catalogueInstance: {
          entryId: 'base.email-input',
          entryVersion: '1.0.0',
          presetId: 'email',
        },
      },
    )

    expect(useEditorStore.getState().updateComponentLibraryField(
      nodeId,
      'placeholder',
      'name@example.com',
    )).toBe(true)
    expect(useEditorStore.getState().site?.pages[0]?.nodes[nodeId]?.props.placeholder)
      .toBe('name@example.com')

    const historyLength = useEditorStore.getState()._historyPast.length
    expect(useEditorStore.getState().updateComponentLibraryField(
      nodeId,
      'htmlAttributes',
      { onclick: 'unsafe()' },
    )).toBe(false)
    expect(useEditorStore.getState()._historyPast).toHaveLength(historyLength)
    expect(useEditorStore.getState().site?.pages[0]?.nodes[nodeId]?.props.htmlAttributes)
      .toBeUndefined()
  })

  it('resolves approved option values inside the mutation boundary', () => {
    const store = useEditorStore.getState()
    const site = store.createSite('Preset Test')
    const page = site.pages[0]!
    const nodeId = useEditorStore.getState().insertNode(
      'base.input',
      { inputType: 'text' },
      page.rootNodeId,
      undefined,
      {
        catalogueInstance: {
          entryId: 'base.email-input',
          entryVersion: '1.0.0',
        },
      },
    )

    expect(useEditorStore.getState().applyComponentLibraryOption(
      nodeId,
      'preset',
      'email',
    )).toBe(true)
    const node = useEditorStore.getState().site?.pages[0]?.nodes[nodeId]
    expect(node?.props.inputType).toBe('email')
    expect(node?.catalogueInstance?.presetId).toBe('email')

    expect(useEditorStore.getState().applyComponentLibraryOption(
      nodeId,
      'preset',
      'invented',
    )).toBe(false)
    expect(node?.catalogueInstance?.presetId).toBe('email')
  })
})
