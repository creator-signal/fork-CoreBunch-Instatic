import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { componentLibraryRegistry } from '@core/component-library'
import { registry } from '@core/module-engine'
import { ComponentPropertiesView } from '@site/panels/PropertiesPanel/ComponentPropertiesView'
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
})
