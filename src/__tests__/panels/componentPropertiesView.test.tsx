import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { componentLibraryRegistry } from '@core/component-library'
import { registry } from '@core/module-engine'
import { creatorSignalCatalogueEntryId } from '@core/page-tree'
import { ComponentPropertiesView } from '@site/panels/PropertiesPanel/ComponentPropertiesView'
import { EditorPermissionsContext } from '@site/editorPermissionsContext'
import { useEditorStore } from '@site/store/store'
import '@modules/base/index'

const publicId = creatorSignalCatalogueEntryId

beforeEach(() => {
  const site = useEditorStore.getState().createSite('Properties Test')
  const page = site.pages[0]!
  const nodeId = useEditorStore.getState().insertNode(
    'base.input',
    { inputType: 'email', placeholder: 'name@example.com' },
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
  useEditorStore.getState().selectNode(nodeId)
})

afterEach(cleanup)

describe('ComponentPropertiesView', () => {
  it('renders approved fields and guidance without raw implementation controls', () => {
    const state = useEditorStore.getState()
    const node = state.site!.pages[0]!.nodes[state.selectedNodeId!]!
    const entry = componentLibraryRegistry.getOrThrow(publicId('base.email-input'))
    const definition = registry.get('base.input')!

    render(
      <ComponentPropertiesView
        node={node}
        definition={definition}
        entry={entry}
        latestEntry={entry}
      />,
    )

    expect(screen.getByTestId('component-properties-view')).toBeTruthy()
    expect(screen.getByTestId('property-control-placeholder')).toBeTruthy()
    expect(screen.getByTestId('property-control-fieldId')).toBeTruthy()
    expect(screen.queryByTestId('property-control-inputType')).toBeNull()
    expect(screen.queryByText('Attributes')).toBeNull()
    expect(screen.getByText('Accessibility')).toBeTruthy()
    expect(screen.getByLabelText('Accessibility diagnostics')).toBeTruthy()
    expect(screen.getByText('a11y.form-control-label', { exact: false }))
      .toBeTruthy()
    expect(screen.getAllByText('form · automated')).toHaveLength(2)
  })

  it('enables approved fields for a component-only author', () => {
    const state = useEditorStore.getState()
    const node = state.site!.pages[0]!.nodes[state.selectedNodeId!]!
    const entry = componentLibraryRegistry.getOrThrow(publicId('base.email-input'))
    const definition = registry.get('base.input')!

    render(
      <EditorPermissionsContext.Provider
        value={{
          canEditComponents: true,
          canEditStructure: false,
          canEditContent: false,
          canEditStyle: false,
        }}
      >
        <ComponentPropertiesView
          node={node}
          definition={definition}
          entry={entry}
          latestEntry={entry}
        />
      </EditorPermissionsContext.Provider>,
    )

    const placeholder = screen.getByTestId('property-control-placeholder')
    expect(placeholder.querySelector('input')?.disabled).toBe(false)
    expect(screen.queryByText('Inspect implementation in HTML view')).toBeNull()
  })

  it('edits the governed Plain Text content and semantic element', () => {
    const store = useEditorStore.getState()
    const page = store.site!.pages[0]!
    const definition = registry.get('base.text')!
    const nodeId = store.insertNode(
      'base.text',
      { ...definition.defaults, text: 'Initial copy', tag: 'p' },
      page.rootNodeId,
      undefined,
      {
        catalogueInstance: {
          entryId: publicId('base.plain-text'),
          entryVersion: '1.0.0',
          presetId: 'paragraph',
        },
      },
    )
    store.selectNode(nodeId)
    const node = useEditorStore.getState().site!.pages[0]!.nodes[nodeId]!
    const entry = componentLibraryRegistry.getOrThrow(publicId('base.plain-text'))

    render(
      <ComponentPropertiesView
        node={node}
        definition={definition}
        entry={entry}
        latestEntry={entry}
      />,
    )

    const text = screen
      .getByTestId('property-control-text')
      .querySelector('textarea')
    const semanticElement = screen
      .getByTestId('property-control-tag')
      .querySelector('select')
    if (!text || !semanticElement) {
      throw new Error('Plain Text governed controls are missing')
    }
    fireEvent.change(text, { target: { value: 'Updated component copy' } })
    fireEvent.change(semanticElement, { target: { value: 'small' } })

    const updated = useEditorStore.getState().site!.pages[0]!.nodes[nodeId]!
    expect(updated.props.text).toBe('Updated component copy')
    expect(updated.props.tag).toBe('small')
    expect(screen.queryByTestId('property-control-htmlAttributes')).toBeNull()
    expect(screen.getByText(/literal authored text/i)).toBeTruthy()
  })

  it('previews and confirms a lossless primitive conversion for structural authors', () => {
    const definition = registry.get('base.input')!
    const page = useEditorStore.getState().site!.pages[0]!
    const nodeId = useEditorStore.getState().insertNode(
      'base.input',
      {
        ...definition.defaults,
        inputType: 'email',
        placeholder: 'preview@example.com',
      },
      page.rootNodeId,
    )
    useEditorStore.getState().selectNode(nodeId)
    const node = useEditorStore.getState().site!.pages[0]!.nodes[nodeId]!

    render(
      <EditorPermissionsContext.Provider
        value={{
          canEditComponents: true,
          canEditStructure: true,
          canEditContent: true,
          canEditStyle: true,
        }}
      >
        <ComponentPropertiesView
          node={node}
          definition={definition}
          entry={undefined}
          latestEntry={undefined}
        />
      </EditorPermissionsContext.Provider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Preview conversion' }))
    const dialog = screen.getByRole('dialog', {
      name: 'Convert to governed component',
    })
    expect(within(dialog).getByText(/does not change the backing module/i)).toBeTruthy()
    expect(within(dialog).getByText('preview@example.com')).toBeTruthy()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Convert component' }))
    expect(
      useEditorStore.getState().site!.pages[0]!.nodes[node.id]?.catalogueInstance,
    ).toEqual({
      entryId: publicId('base.email-input'),
      entryVersion: '1.0.0',
      presetId: 'email',
    })
  })

  it('edits built-in Visual Component parameters and approved variants', () => {
    const store = useEditorStore.getState()
    const page = store.site!.pages[0]!
    const nodeId = store.insertComponentRef(
      page.rootNodeId,
      'base.vc.hero',
      undefined,
      {
        catalogueInstance: {
          entryId: publicId('base.hero'),
          entryVersion: '2.0.0',
        },
      },
    )
    if (!nodeId) throw new Error('Hero insertion failed')
    store.selectNode(nodeId)
    const node = useEditorStore.getState().site!.pages[0]!.nodes[nodeId]!
    const entry = componentLibraryRegistry.getOrThrow(publicId('base.hero'))
    const definition = registry.get('base.visual-component-ref')!

    render(
      <ComponentPropertiesView
        node={node}
        definition={definition}
        entry={entry}
        latestEntry={entry}
      />,
    )

    const heading = screen
      .getByTestId('property-control-heading')
      .querySelector('input')
    if (!heading) throw new Error('Heading control missing')
    fireEvent.change(heading, { target: { value: 'A governed introduction' } })
    const variant = screen.getByText('Variant').closest('label')
      ?.querySelector('select')
    if (!variant) throw new Error('Variant control missing')
    fireEvent.change(variant, {
      target: { value: 'image-left' },
    })

    expect(
      useEditorStore.getState().site!.pages[0]!.nodes[nodeId]!.props
        .propOverrides,
    ).toEqual({
      heading: 'A governed introduction',
      variant: 'image-left',
    })
    expect(
      useEditorStore.getState().site!.pages[0]!.nodes[nodeId]!
        .catalogueInstance?.variantId,
    ).toBe('image-left')
  })

  it('authors Navigation as ordered link data without exposing a slot', () => {
    const store = useEditorStore.getState()
    const page = store.site!.pages[0]!
    const nodeId = store.insertComponentRef(
      page.rootNodeId,
      'base.vc.navigation',
      undefined,
      {
        catalogueInstance: {
          entryId: publicId('base.navigation'),
          entryVersion: '2.0.0',
        },
      },
    )
    if (!nodeId) throw new Error('Navigation insertion failed')
    const node = useEditorStore.getState().site!.pages[0]!.nodes[nodeId]!
    const entry = componentLibraryRegistry.getOrThrow(publicId('base.navigation'))

    const definition = registry.get('base.visual-component-ref')!
    const view = render(
      <ComponentPropertiesView
        node={node}
        definition={definition}
        entry={entry}
        latestEntry={entry}
      />,
    )
    const rerenderCurrent = () => view.rerender(
      <ComponentPropertiesView
        node={useEditorStore.getState().site!.pages[0]!.nodes[nodeId]!}
        definition={definition}
        entry={entry}
        latestEntry={entry}
      />,
    )

    expect(screen.queryByText('Slots')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Add navigation link' }))
    rerenderCurrent()
    fireEvent.change(screen.getByLabelText('Link text'), {
      target: { value: 'About us' },
    })
    rerenderCurrent()
    fireEvent.change(screen.getByLabelText('Destination'), {
      target: { value: '/about' },
    })
    rerenderCurrent()
    fireEvent.click(screen.getByRole('switch', { name: 'Current page' }))

    expect(
      useEditorStore.getState().site!.pages[0]!.nodes[nodeId]!.props.propOverrides,
    ).toMatchObject({
      items: [{
        label: 'About us',
        href: '/about',
        target: '_self',
        current: true,
      }],
    })
  })
})
