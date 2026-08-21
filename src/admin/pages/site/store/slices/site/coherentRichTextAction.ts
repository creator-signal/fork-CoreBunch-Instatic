import {
  analyseCoherentRichTextConversion,
  applyCoherentRichTextConversion,
  componentLibraryRegistry,
} from '@core/component-library'
import { registry } from '@core/module-engine'
import { createNode } from '@core/page-tree'
import type { NodeTree, PageNode } from '@core/page-tree'

const RICH_TEXT_SECTION_ID = 'creator-signal.site.rich-text-section'

/**
 * Replace an eligible sequence of freeform prose nodes with the governed Rich
 * Text Section in the current tree. Call this from `mutateActiveTree` so the
 * analysis and replacement form one undoable revision.
 */
export function consolidateCoherentRichText(
  tree: NodeTree<PageNode>,
  nodeId: string,
): boolean {
  const entry = componentLibraryRegistry.get(RICH_TEXT_SECTION_ID)
  const analysis = analyseCoherentRichTextConversion(tree, nodeId, entry)
  if (!analysis.eligible) return false

  const definition = registry.get(RICH_TEXT_SECTION_ID)
  if (!definition) return false

  const replacement = createNode(definition.id, {
    ...definition.defaults,
    ...analysis.candidate.props,
  })
  replacement.catalogueInstance = analysis.candidate.metadata
  return applyCoherentRichTextConversion(tree, analysis.candidate, replacement)
}
