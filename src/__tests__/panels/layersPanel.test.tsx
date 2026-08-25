import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import React from 'react'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { ExplorerPanel } from '@site/panels/ExplorerPanel'
import { EditorPermissionsContext } from '@site/editorPermissionsContext'
import { useEditorStore } from '@site/store/store'
import { creatorSignalCatalogueEntryId } from '@core/page-tree'
import { makeNode, makePage, makeSite, makeVC } from '../fixtures'
import '@modules/base/index'

const publicId = creatorSignalCatalogueEntryId

afterEach(() => {
  cleanup()
  useEditorStore.setState({ layersViewMode: 'html' })
})

function loadSite(): void {
  const page = makePage({
    id: 'home',
    title: 'Home',
    rootNodeId: 'root',
    nodes: {
      root: makeNode({
        id: 'root',
        moduleId: 'base.body',
        children: ['hero-ref', 'pattern'],
      }),
      'hero-ref': makeNode({
        id: 'hero-ref',
        moduleId: 'base.visual-component-ref',
        props: { componentId: 'hero-vc' },
        children: ['actions-slot'],
      }),
      'actions-slot': makeNode({
        id: 'actions-slot',
        moduleId: 'base.slot-instance',
        props: { slotName: 'actions' },
        children: [],
      }),
      pattern: makeNode({
        id: 'pattern',
        moduleId: 'base.container',
        children: ['implementation'],
        catalogueInstance: {
          entryId: publicId('base.container'),
          entryVersion: '1.0.0',
          pattern: { authorableNodeIds: [] },
        },
      }),
      implementation: makeNode({
        id: 'implementation',
        moduleId: 'base.text',
      }),
    },
  })
  useEditorStore.setState({
    site: makeSite({
      pages: [page],
      visualComponents: [makeVC({ id: 'hero-vc', name: 'Hero' })],
    }),
    activePageId: page.id,
  } as Parameters<typeof useEditorStore.setState>[0])
}

function addWrapperTemplate(): void {
  const currentSite = useEditorStore.getState().site!
  const template = makePage({
    id: 'global-layout',
    title: 'Global layout',
    template: {
      enabled: true,
      target: { kind: 'everywhere' },
      priority: 0,
    },
    rootNodeId: 'layout-root',
    nodes: {
      'layout-root': makeNode({
        id: 'layout-root',
        moduleId: 'base.body',
        children: ['layout-header', 'layout-outlet', 'layout-footer'],
      }),
      'layout-header': makeNode({
        id: 'layout-header',
        moduleId: 'base.container',
        catalogueInstance: {
          entryId: publicId('base.container'),
          entryVersion: '1.0.0',
        },
      }),
      'layout-outlet': makeNode({
        id: 'layout-outlet',
        moduleId: 'base.outlet',
      }),
      'layout-footer': makeNode({
        id: 'layout-footer',
        moduleId: 'base.container',
        catalogueInstance: {
          entryId: publicId('base.container'),
          entryVersion: '1.0.0',
        },
      }),
    },
  })
  useEditorStore.setState({
    site: {
      ...currentSite,
      pages: [...currentSite.pages, template],
    },
  } as Parameters<typeof useEditorStore.setState>[0])
}

beforeEach(() => {
  localStorage.clear()
  useEditorStore.setState({
    site: null,
    activePageId: null,
    activeDocument: null,
    selectedNodeId: null,
    selectedNodeIds: [],
    hoveredNodeId: null,
    explorerPanelOpen: true,
    explorerPanelTab: 'layers',
    layersViewMode: 'html',
    propertiesPanel: { collapsed: false, x: 0, y: 0, width: 360 },
    focusedPanel: 'canvas',
  } as Parameters<typeof useEditorStore.setState>[0])
  loadSite()
})

describe('Explorer Layers projections', () => {
  it('switches between HTML and Components views over the same page tree', async () => {
    render(<DndContext><ExplorerPanel /></DndContext>)

    expect(screen.getByRole('button', { name: 'HTML' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Components' }))

    await waitFor(() => {
      expect(useEditorStore.getState().layersViewMode).toBe('components')
    })
    const componentTree = screen.getByTestId('component-layers-tree')
    expect(within(componentTree).getByRole('treeitem', { name: 'Container' })).toBeDefined()
    expect(within(componentTree).queryByText('Hero')).toBeNull()
    expect(within(componentTree).queryByText('Slot: actions')).toBeNull()
  })

  it('removes a selected governed component from the Components tree shortcut', async () => {
    render(<DndContext><ExplorerPanel /></DndContext>)
    fireEvent.click(screen.getByRole('button', { name: 'Components' }))

    const componentTree = screen.getByTestId('component-layers-tree')
    const component = within(componentTree).getByRole('treeitem', {
      name: 'Container',
    })
    fireEvent.click(component)
    fireEvent.keyDown(component, { key: 'Backspace', ctrlKey: true })

    await waitFor(() => {
      expect(useEditorStore.getState().site?.pages[0]?.nodes.pattern).toBeUndefined()
    })
    expect(within(componentTree).queryByRole('treeitem', {
      name: 'Container',
    })).toBeNull()
  })

  it('shows an empty Components view for an imported-only page', async () => {
    const page = makePage({
      id: 'imported',
      title: 'Imported',
      rootNodeId: 'root',
      nodes: {
        root: makeNode({
          id: 'root',
          moduleId: 'base.body',
          children: ['container', 'visual-ref'],
        }),
        container: makeNode({
          id: 'container',
          moduleId: 'base.container',
          children: ['copy'],
        }),
        copy: makeNode({ id: 'copy', moduleId: 'base.text' }),
        'visual-ref': makeNode({
          id: 'visual-ref',
          moduleId: 'base.visual-component-ref',
          props: { componentId: 'hero-vc' },
          children: ['raw-slot'],
        }),
        'raw-slot': makeNode({
          id: 'raw-slot',
          moduleId: 'base.slot-instance',
          props: { slotName: 'actions' },
        }),
      },
    })
    useEditorStore.setState({
      site: makeSite({
        pages: [page],
        visualComponents: [makeVC({ id: 'hero-vc', name: 'Hero' })],
      }),
      activePageId: page.id,
    } as Parameters<typeof useEditorStore.setState>[0])
    render(<DndContext><ExplorerPanel /></DndContext>)

    fireEvent.click(screen.getByRole('button', { name: 'Components' }))

    expect(await screen.findByText('No catalogue components on this page')).toBeDefined()
    const componentTree = screen.getByTestId('component-layers-tree')
    expect(within(componentTree).queryByText(/Component Block:/)).toBeNull()
    expect(within(componentTree).queryByText('Hero')).toBeNull()
    expect(within(componentTree).queryByText('Slot: actions')).toBeNull()
    expect(screen.getByRole('button', { name: 'Open Component Library' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Add from Component Library' })).toBeDefined()
  })

  it('maps hidden pattern selection to the boundary and restores the exact HTML node', async () => {
    render(<DndContext><ExplorerPanel /></DndContext>)
    act(() => {
      useEditorStore.getState().selectNode('implementation')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Components' }))
    await waitFor(() => {
      expect(useEditorStore.getState().selectedNodeId).toBe('pattern')
    })

    fireEvent.click(screen.getByRole('button', { name: 'HTML' }))
    await waitFor(() => {
      expect(useEditorStore.getState().selectedNodeId).toBe('implementation')
    })
  })

  it('maps a canvas selection made in Components view to its nearest visible boundary', async () => {
    render(<DndContext><ExplorerPanel /></DndContext>)
    fireEvent.click(screen.getByRole('button', { name: 'Components' }))

    act(() => {
      useEditorStore.getState().selectNode('implementation')
    })
    await waitFor(() => {
      expect(useEditorStore.getState().selectedNodeId).toBe('pattern')
    })

    fireEvent.click(screen.getByRole('button', { name: 'HTML' }))
    await waitFor(() => {
      expect(useEditorStore.getState().selectedNodeId).toBe('implementation')
    })
  })

  it('keeps a component-only author out of the HTML projection', async () => {
    addWrapperTemplate()
    render(
      <EditorPermissionsContext.Provider
        value={{
          canEditComponents: true,
          canEditStructure: false,
          canEditContent: false,
          canEditStyle: false,
        }}
      >
        <DndContext><ExplorerPanel editable={false} /></DndContext>
      </EditorPermissionsContext.Provider>,
    )

    await waitFor(() => {
      expect(useEditorStore.getState().layersViewMode).toBe('components')
    })
    expect(screen.queryByRole('button', { name: 'HTML' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Open Component Library' })).toBeDefined()
    expect(screen.getByTestId('component-layers-tree')).toBeDefined()
    expect(screen.getByText('Global layout template')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Open Global layout template' })).toBeNull()
  })

  it('opens a composed row in its owning template for structural authors', async () => {
    addWrapperTemplate()
    render(<DndContext><ExplorerPanel /></DndContext>)
    fireEvent.click(screen.getByRole('button', { name: 'Components' }))

    const openTemplate = await screen.findByRole('button', {
      name: 'Open Global layout template',
    })
    fireEvent.click(openTemplate)

    await waitFor(() => {
      expect(useEditorStore.getState().activePageId).toBe('global-layout')
    })
  })
})
