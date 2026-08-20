/**
 * Editor-side factory that produces the React canvas-preview component for
 * a `PluginModuleDefinition`. Lives under `src/admin/pages/site/canvas/`
 * because the factory wires plugin modules into canvas rendering, and
 * `src/core/` is banned from importing runtime React.
 *
 * The component renders the plugin's `preview()` (falling back to `render()`)
 * HTML inside a wrapper div via `dangerouslySetInnerHTML`. Children (already
 * rendered React subtrees) are rendered as a sibling node, so plugins that
 * opt into `canHaveChildren` still see the host-rendered nested modules.
 *
 * Module CSS — the `.css` string a plugin returns from `render()` — is
 * injected into the nearest canvas iframe document as a single
 * `<style data-plugin-module="..." data-css-hash="...">` element per module
 * type + CSS content. The publisher does the equivalent via
 * `buildSiteCssBundle` for the published page. Targeting the canvas document
 * (not the surrounding admin document) is essential: every breakpoint and
 * live frame is an isolated document with its own cascade.
 *
 * This file deliberately exports only the factory function (a regular
 * function, not a React component) so React Fast Refresh stays happy. Each
 * call returns a fresh anonymous component class — those don't enter
 * Fast Refresh boundaries because they're not module-level exports.
 */
import type {
  ModuleComponentProps,
} from '@core/module-engine'
import type {
  PluginModuleDefinition,
} from '@core/plugin-sdk'
import type { PluginModuleComponentFactory } from '@core/plugins/moduleAdapter'
import { useContext, useEffect } from 'react'
import { CanvasDocumentContext } from './CanvasContexts'

/**
 * Track which (moduleId, css-content-hash) pairs we've already injected,
 * so re-rendering an instance doesn't keep appending `<style>` elements.
 * Keyed by the data-css-hash attribute the `<style>` element carries.
 */
interface InjectedModuleCss {
  element: HTMLStyleElement
  references: number
}

const injectedModuleCss = new WeakMap<Document, Map<string, InjectedModuleCss>>()

/**
 * Tiny non-crypto hash — DJB2. Used purely to key the injected `<style>`
 * elements so we can dedupe by CSS content. Collision risk for distinct
 * CSS strings is irrelevant for the dedup use case (worst case: we skip
 * an injection that was a different module's CSS with the same hash —
 * but each style tag also carries `data-plugin-module` for traceability).
 */
function hashCss(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

function acquireModuleCss(targetDocument: Document, moduleId: string, css: string): () => void {
  const trimmed = css.trim()
  if (!trimmed) return () => {}
  const hash = hashCss(trimmed)
  const key = `${moduleId}:${hash}`
  let entries = injectedModuleCss.get(targetDocument)
  if (!entries) {
    entries = new Map()
    injectedModuleCss.set(targetDocument, entries)
  }

  let entry = entries.get(key)
  if (!entry) {
    const element = targetDocument.createElement('style')
    element.setAttribute('data-plugin-module', moduleId)
    element.setAttribute('data-css-hash', hash)
    // Canvas author CSS is layered so the unlayered editor-chrome rules can
    // remain authoritative. Keep module CSS in that same layer: this preserves
    // the published author cascade while still preventing plugin styles from
    // leaking into or defeating editor chrome.
    element.textContent = `@layer user-authored {\n${trimmed}\n}`
    const userStyles = targetDocument.getElementById('mc-user-styles')
    targetDocument.head.insertBefore(element, userStyles)
    entry = { element, references: 0 }
    entries.set(key, entry)
  }
  entry.references += 1

  return () => {
    const current = entries?.get(key)
    if (!current) return
    current.references -= 1
    if (current.references > 0) return
    current.element.remove()
    entries?.delete(key)
  }
}

export const editorPluginModuleComponentFactory: PluginModuleComponentFactory = (definition: PluginModuleDefinition) => {
  const renderForEditor = definition.preview ?? definition.render
  const canHaveChildren = Boolean(definition.canHaveChildren)
  return function PluginCanvasModule(props: ModuleComponentProps) {
    const canvasDocument = useContext(CanvasDocumentContext)
    const childList: string[] = []
    // Defensive wrap — a throwing plugin preview()/render() is caught by the
    // per-node ErrorBoundary above us, but that boundary swaps the entire
    // module subtree for an alert section, which can shift layout and noise
    // up adjacent siblings. Catching here lets us keep the wrapper div in
    // place and emit an inline placeholder, so a single bad module remains
    // visually contained to its own slot.
    let html: string
    let css: string | undefined
    try {
      const out = renderForEditor(props.props, childList)
      html = out.html
      css = out.css
    } catch (err) {
      console.error(`[plugin-module:${definition.id}] preview/render() threw:`, err)
      html = `<!-- instatic: plugin module "${definition.id}" render failed -->`
    }
    useEffect(() => {
      if (!css) return
      const targetDocument = canvasDocument ?? (typeof document === 'undefined' ? null : document)
      if (!targetDocument) return
      return acquireModuleCss(targetDocument, definition.id, css)
    }, [canvasDocument, css])
    if (canHaveChildren) {
      // dangerouslySetInnerHTML and children are mutually exclusive in React.
      // Plugins with `canHaveChildren: true` need both: rendered HTML + a
      // slot for nested React subtrees. Render the static HTML in one
      // sibling div, mount children in another, outside the dangerous boundary.
      return (
        <div className={props.mcClassName} data-plugin-canvas-module="true">
          <div dangerouslySetInnerHTML={{ __html: html }} />
          <div data-plugin-children="true">{props.children}</div>
        </div>
      )
    }
    return (
      <div
        className={props.mcClassName}
        data-plugin-canvas-module="true"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }
}
