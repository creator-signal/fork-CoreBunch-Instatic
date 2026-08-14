import type { Page, SiteDocument } from '@core/page-tree'
import { resolveTemplateChain, type RouteResolutionContext } from './templateMatching'
import { treeHasOutlet } from './outlet'

/** Breadth rank: lower-ranked templates wrap higher-ranked documents. */
function levelRank(page: Page): number {
  const target = page.template?.target
  if (!target) return 2
  return target.kind === 'everywhere' ? 0 : 1
}

/**
 * Resolve the templates that wrap a routable page or narrower template.
 * Synthetic documents (such as Visual Component edit surfaces) are not part
 * of the site's page roster and therefore never inherit route chrome.
 */
export function resolvePageWrapperTemplates(site: SiteDocument, page: Page): Page[] {
  if (!site.pages.some((candidate) => candidate.id === page.id)) return []

  const pageRank = levelRank(page)
  if (pageRank <= 0) return []

  const target = page.template?.target
  let context: RouteResolutionContext
  if (target?.kind === 'postTypes') {
    const tableSlug = target.tableSlugs[0]
    if (!tableSlug) return []
    context = { kind: 'entry', tableSlug }
  } else {
    context = { kind: 'page' }
  }

  return resolveTemplateChain(site, context).filter(
    (candidate) =>
      candidate.id !== page.id &&
      levelRank(candidate) < pageRank &&
      treeHasOutlet(candidate),
  )
}
