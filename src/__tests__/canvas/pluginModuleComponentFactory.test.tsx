import { afterEach, describe, expect, it } from 'bun:test'
import React from 'react'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import type { ModuleComponentProps } from '@core/module-engine'
import type { PluginModuleDefinition } from '@core/plugin-sdk'
import { CanvasDocumentContext } from '@site/canvas/CanvasContexts'
import { editorPluginModuleComponentFactory } from '@site/canvas/pluginModuleComponentFactory'

afterEach(cleanup)

const definition: PluginModuleDefinition = {
  id: 'acme.preview.card',
  name: 'Card',
  category: 'Acme',
  version: '1.0.0',
  defaults: { label: 'Preview' },
  schema: {},
  render: (props) => ({
    html: `<article class="acme-card">${String(props.label)}</article>`,
    css: '.acme-card { color: rebeccapurple; }',
  }),
}

const componentProps: ModuleComponentProps = {
  nodeId: 'card-1',
  props: definition.defaults,
  isSelected: false,
  mcClassName: 'canvas-node',
}

describe('editorPluginModuleComponentFactory', () => {
  it('forwards the canvas identity and hover contract to a leaf plugin module', () => {
    const Component = editorPluginModuleComponentFactory(definition)
    let hoverCount = 0
    let leaveCount = 0

    const view = render(
      <Component
        {...componentProps}
        nodeWrapperProps={{
          'data-node-id': 'card-1',
          'data-module-id': definition.id,
          'data-hovered': 'true',
          tabIndex: 0,
          style: { marginTop: '8px' },
          onMouseEnter: () => { hoverCount += 1 },
          onMouseLeave: () => { leaveCount += 1 },
        }}
      />,
    )

    const wrapper = view.container.querySelector<HTMLElement>('[data-plugin-canvas-module="true"]')
    expect(wrapper?.getAttribute('data-node-id')).toBe('card-1')
    expect(wrapper?.getAttribute('data-module-id')).toBe(definition.id)
    expect(wrapper?.getAttribute('data-hovered')).toBe('true')
    expect(wrapper?.tabIndex).toBe(0)
    expect(wrapper?.style.marginTop).toBe('8px')

    fireEvent.mouseEnter(wrapper as HTMLElement)
    fireEvent.mouseLeave(wrapper as HTMLElement)
    expect(hoverCount).toBe(1)
    expect(leaveCount).toBe(1)
  })

  it('keeps one sequential keyboard stop for leaf plugin preview HTML', () => {
    const Component = editorPluginModuleComponentFactory({
      ...definition,
      render: () => ({
        html: '<article><a href="/details">Details</a><input aria-label="Email"></article>',
      }),
    })

    const view = render(
      <Component
        {...componentProps}
        nodeWrapperProps={{
          'data-node-id': 'card-1',
          'data-module-id': definition.id,
          tabIndex: 0,
        }}
      />,
    )

    const wrapper = view.container.querySelector<HTMLElement>('[data-plugin-canvas-module="true"]')
    expect(wrapper?.tabIndex).toBe(0)
    expect(wrapper?.querySelector<HTMLAnchorElement>('a')?.tabIndex).toBe(-1)
    expect(wrapper?.querySelector<HTMLInputElement>('input')?.tabIndex).toBe(-1)
  })

  it('forwards the canvas selection and click contract to a plugin module with children', () => {
    const Component = editorPluginModuleComponentFactory({
      ...definition,
      id: 'acme.preview.stack',
      canHaveChildren: true,
    })
    let clickCount = 0

    const view = render(
      <Component
        {...componentProps}
        isSelected
        nodeWrapperProps={{
          'data-node-id': 'stack-1',
          'data-module-id': 'acme.preview.stack',
          'data-canvas-selected': 'true',
          tabIndex: 0,
          onClick: () => { clickCount += 1 },
        }}
      >
        <span data-testid="plugin-child">Child</span>
      </Component>,
    )

    const wrapper = view.container.querySelector<HTMLElement>('[data-plugin-canvas-module="true"]')
    expect(wrapper?.getAttribute('data-node-id')).toBe('stack-1')
    expect(wrapper?.getAttribute('data-module-id')).toBe('acme.preview.stack')
    expect(wrapper?.getAttribute('data-canvas-selected')).toBe('true')
    expect(view.getByTestId('plugin-child')).toBeTruthy()

    fireEvent.click(wrapper as HTMLElement)
    expect(clickCount).toBe(1)
  })

  it('suppresses only preview-owned tab stops when a plugin module has child nodes', () => {
    const Component = editorPluginModuleComponentFactory({
      ...definition,
      id: 'acme.preview.stack',
      canHaveChildren: true,
      render: () => ({ html: '<a href="/preview-action">Preview action</a>' }),
    })

    const view = render(
      <Component
        {...componentProps}
        nodeWrapperProps={{
          'data-node-id': 'stack-1',
          'data-module-id': 'acme.preview.stack',
          tabIndex: 0,
        }}
      >
        <button data-node-id="child-1" tabIndex={0}>Child node</button>
      </Component>,
    )

    expect(view.container.querySelector<HTMLAnchorElement>('[data-plugin-preview-html="true"] a')?.tabIndex).toBe(-1)
    expect(view.getByRole('button', { name: 'Child node' }).tabIndex).toBe(0)
  })

  it('installs the render stylesheet in the canvas iframe document, not the admin document', async () => {
    const canvasDocument = document.implementation.createHTMLDocument('Canvas')
    const Component = editorPluginModuleComponentFactory(definition)

    const view = render(
      <CanvasDocumentContext.Provider value={canvasDocument}>
        <Component {...componentProps} />
      </CanvasDocumentContext.Provider>,
    )

    expect(view.container.querySelector('[data-plugin-canvas-module="true"]')
      ?.getAttribute('data-plugin-module')).toBe(definition.id)

    await waitFor(() => {
      const style = canvasDocument.head.querySelector(
        'style[data-plugin-module="acme.preview.card"]',
      )
      expect(style?.textContent).toContain('@layer user-authored')
      expect(style?.textContent).toContain('.acme-card { color: rebeccapurple; }')
    })
    expect(document.head.querySelector('style[data-plugin-module="acme.preview.card"]')).toBeNull()

    view.unmount()
    expect(canvasDocument.head.querySelector('style[data-plugin-module="acme.preview.card"]')).toBeNull()
  })

  it('deduplicates identical module CSS until the final canvas instance unmounts', async () => {
    const canvasDocument = document.implementation.createHTMLDocument('Canvas')
    const Component = editorPluginModuleComponentFactory(definition)

    const view = render(
      <CanvasDocumentContext.Provider value={canvasDocument}>
        <Component {...componentProps} />
        <Component {...componentProps} nodeId="card-2" />
      </CanvasDocumentContext.Provider>,
    )

    await waitFor(() => {
      expect(canvasDocument.head.querySelectorAll(
        'style[data-plugin-module="acme.preview.card"]',
      )).toHaveLength(1)
    })

    view.rerender(
      <CanvasDocumentContext.Provider value={canvasDocument}>
        <Component {...componentProps} />
      </CanvasDocumentContext.Provider>,
    )
    expect(canvasDocument.head.querySelectorAll(
      'style[data-plugin-module="acme.preview.card"]',
    )).toHaveLength(1)

    view.unmount()
    expect(canvasDocument.head.querySelector('style[data-plugin-module="acme.preview.card"]')).toBeNull()
  })
})
