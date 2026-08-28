import { describe, expect, it } from 'bun:test'
import { applyIframeBodyReset } from '@site/canvas/iframeBodyReset'

describe('applyIframeBodyReset canvas focus isolation', () => {
  it('suppresses authored focus outlines without suppressing editor-owned node roots', () => {
    const frameDocument = document.implementation.createHTMLDocument('canvas')

    applyIframeBodyReset(frameDocument, 'desktop', 'canvas')

    const css =
      frameDocument.head.querySelector('style[data-instatic-canvas-chrome]')?.textContent ?? ''

    expect(css).toContain(
      '*:focus:not([data-node-id]), *:focus-visible:not([data-node-id])',
    )
    expect(css).not.toContain('*:focus, *:focus-visible')
  })

  it('does not inject canvas chrome into the published-equivalent live frame', () => {
    const frameDocument = document.implementation.createHTMLDocument('live')

    applyIframeBodyReset(frameDocument, 'desktop', 'live')

    expect(frameDocument.head.querySelector('style[data-instatic-canvas-chrome]')).toBeNull()
  })
})
