/**
 * Canvas template composition — resolve which templates WRAP the document
 * currently being edited, so the design canvas can render it exactly as it
 * publishes: inside its matching template chain.
 *
 * This is the editor-side mirror of the publisher's `resolveTemplateChain` +
 * `composeTemplateChain`. The difference: the publisher composes a brand-new
 * tree (rekeying every node) to emit static HTML, whereas the canvas keeps the
 * active document's nodes untouched and editable, rendering only the wrapping
 * templates read-only around it (see `CanvasComposedTree`).
 *
 * Breadth levels (outer → inner): `everywhere` (0) → `postTypes` / `notFound`
 * (1) → a non-template page (2, the innermost terminal). A document is wrapped
 * by every matching template strictly broader than its own level:
 *   - editing a page          → wrapped by the `everywhere` layout;
 *   - editing a postTypes tpl  → wrapped by the `everywhere` layout;
 *   - editing a notFound tpl   → wrapped by the `everywhere` layout (matching
 *     how the public router composes the 404 render);
 *   - editing the everywhere tpl → nothing wraps it (it is the broadest).
 */

import type { Page, SiteDocument } from '@core/page-tree'
import { resolvePageWrapperTemplates } from '@core/templates'

/**
 * The templates that wrap `activeDoc` at publish time, ordered outermost-first.
 * Empty when nothing wraps it (the active doc is an `everywhere` layout, or no
 * matching wrapper template has an outlet to host it).
 */
export function resolveEditorWrapperTemplates(site: SiteDocument, activeDoc: Page): Page[] {
  return resolvePageWrapperTemplates(site, activeDoc)
}
