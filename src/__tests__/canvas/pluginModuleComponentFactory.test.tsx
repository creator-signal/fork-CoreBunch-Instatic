import { afterEach, describe, expect, it } from 'bun:test'
import React from 'react'
import { cleanup, render, waitFor } from '@testing-library/react'
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

const componentProps = {
  nodeId: 'card-1',
  props: definition.defaults,
  mcClassName: 'canvas-node',
} as ModuleComponentProps

describe('editorPluginModuleComponentFactory module CSS', () => {
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
