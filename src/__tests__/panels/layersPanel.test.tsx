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
import { useEditorStore } from '@site/store/store'
import { makeNode, makePage, makeSite, makeVC } from '../fixtures'
import '@modules/base/index'

afterEach(cleanup)

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
          entryId: 'site.hero',
          entryVersion: '1',
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
    expect(within(componentTree).getByText('Hero')).toBeDefined()
    expect(within(componentTree).getByText('Slot: actions')).toBeDefined()
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
})
