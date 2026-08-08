import { beforeEach, describe, expect, it } from 'bun:test'
import { useEditorStore } from '@site/store/store'
import {
  componentLibraryPatternRegistry,
  componentLibraryRegistry,
} from '@core/component-library'
import { creatorSignalCatalogueEntryId } from '@core/page-tree'
import '@modules/base/index'

const publicId = creatorSignalCatalogueEntryId

beforeEach(() => {
  // clearSite resets the collaboration documents and their undo managers.
  useEditorStore.getState().clearSite()
  useEditorStore.setState({
    site: null,
    activePageId: null,
    activeDocument: null,
    selectedNodeId: null,
    selectedNodeIds: [],
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
    expect(useEditorStore.getState().convertFreeformPrimitiveToComponent(
      nodeId,
      publicId('base.email-input'),
      'email',
    )).toBe(true)
    const converted = useEditorStore.getState().site!.pages[0]!.nodes[nodeId]!
    expect(converted.catalogueInstance).toEqual({
      entryId: publicId('base.email-input'),
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
    expect(useEditorStore.getState().canUndo).toBe(true)

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
    const canUndoBefore = useEditorStore.getState().canUndo

    expect(useEditorStore.getState().convertFreeformPrimitiveToComponent(
      nodeId,
      publicId('base.email-input'),
      'email',
    )).toBe(false)
    expect(useEditorStore.getState().canUndo).toBe(canUndoBefore)
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
          entryId: publicId('base.email-input'),
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

    const canUndoBefore = useEditorStore.getState().canUndo
    expect(useEditorStore.getState().updateComponentLibraryField(
      nodeId,
      'htmlAttributes',
      { onclick: 'unsafe()' },
    )).toBe(false)
    expect(useEditorStore.getState().canUndo).toBe(canUndoBefore)
    expect(useEditorStore.getState().site?.pages[0]?.nodes[nodeId]?.props.htmlAttributes)
      .toBeUndefined()
  })

  it('updates declared pattern-root fields without applying an option', () => {
    const store = useEditorStore.getState()
    const site = store.createSite('Pattern Governance Test')
    const page = site.pages[0]!
    const entry = componentLibraryRegistry.get(publicId('base.list'))
    if (!entry || entry.implementation.type !== 'pattern') {
      throw new Error('base.list pattern is not registered')
    }
    const fragment = componentLibraryPatternRegistry.materialize(
      entry.implementation.patternId,
      {
        entryId: entry.id,
        entryVersion: entry.version,
      },
    )
    if (!fragment) throw new Error('base.list pattern could not materialize')
    const rootId = fragment.rootIds[0]!
    expect(useEditorStore.getState().insertImportedNodes(
      page.rootNodeId,
      fragment,
    )).toEqual([rootId])

    expect(useEditorStore.getState().updateComponentLibraryField(
      rootId,
      'query',
      'accessibility',
    )).toBe(true)
    expect(useEditorStore.getState().site?.pages[0]?.nodes[rootId]?.props.query)
      .toBe('accessibility')
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
          entryId: publicId('base.email-input'),
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

  it('applies approved pattern variants to the governed root', () => {
    const store = useEditorStore.getState()
    const site = store.createSite('Pattern Variant Test')
    const page = site.pages[0]!
    const entry = componentLibraryRegistry.get(publicId('base.form-tabs'))
    if (!entry || entry.implementation.type !== 'pattern') {
      throw new Error('base.form-tabs pattern is not registered')
    }
    const fragment = componentLibraryPatternRegistry.materialize(
      entry.implementation.patternId,
      {
        entryId: entry.id,
        entryVersion: entry.version,
      },
    )
    if (!fragment) throw new Error('base.form-tabs pattern could not materialize')
    const rootId = fragment.rootIds[0]!
    store.insertImportedNodes(page.rootNodeId, fragment)

    expect(useEditorStore.getState().applyComponentLibraryOption(
      rootId,
      'variant',
      'vertical',
    )).toBe(true)
    const root = useEditorStore.getState().site?.pages[0]?.nodes[rootId]
    expect(root?.props.orientation).toBe('vertical')
    expect(root?.catalogueInstance?.variantId).toBe('vertical')
  })
})
