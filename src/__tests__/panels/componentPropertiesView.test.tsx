import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { componentLibraryRegistry } from '@core/component-library'
import { registry } from '@core/module-engine'
import { ComponentPropertiesView } from '@site/panels/PropertiesPanel/ComponentPropertiesView'
import { EditorPermissionsContext } from '@site/editorPermissionsContext'
import { useEditorStore } from '@site/store/store'
import '@modules/base/index'

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
        entryId: 'base.email-input',
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
    const entry = componentLibraryRegistry.getOrThrow('base.email-input')
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
  })

  it('enables approved fields for a component-only author', () => {
    const state = useEditorStore.getState()
    const node = state.site!.pages[0]!.nodes[state.selectedNodeId!]!
    const entry = componentLibraryRegistry.getOrThrow('base.email-input')
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
      entryId: 'base.email-input',
      entryVersion: '1.0.0',
      presetId: 'email',
    })
  })
})
