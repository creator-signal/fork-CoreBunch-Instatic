/**
 * Publisher — `base.loop` iteration renderer.
 *
 * Specialised renderer for loop nodes. The loop iterates its resolved data
 * and round-robins over the loop's children — child i renders item i,
 * pushing each item onto the template entry stack so dynamic bindings
 * inside the body resolve against the loop entry.
 *
 * Takes `renderNode` as a parameter rather than importing it directly so
 * the file graph stays acyclic — the dispatcher in `renderNode.ts` is the
 * only thing that knows both ends of the recursion.
 */

import type { PageNode } from '@core/page-tree'
import { normalizeCollectionPaginationMode } from '@core/collections'
import {
  ENTRY_FIELD_FILTER_KEY,
  ENTRY_FIELD_SOURCE_ID,
  resolveEntryFieldItems,
  type EntryFieldMedia,
  type LoopItem,
} from '@core/loops'
import type { TemplateRenderDataContext } from '@core/templates/dynamicBindings'
import { resolveHtmlTag } from '@modules/base/utils/htmlTag'
import { injectNodeClassIds, injectNodeId, injectNodeInlineStyles } from './classInjection'
import { escapeHtml, safeUrl } from './utils'
import type {
  RenderConfig,
  RenderAccumulators,
  RenderNodeFn,
  ResolvedLoopRenderData,
} from './renderConfig'

/**
 * Render a `base.loop` node by iterating its resolved data and round-robining
 * over the loop's children.
 *
 * For a loop with N children and M items, iteration `i` (0-indexed) renders
 * the loop's child at index `i mod N` with the loop's `entryStack` extended
 * by the iteration's item. Two children → alternating layouts; three →
 * cycle of three; etc. Each iteration renders against a FRESH child
 * `RenderConfig` whose `templateContext.entryStack` is a new array
 * `[...baseStack, item]` — there is no in-place push/pop on a shared array, so
 * a VC ref (or nested loop) rendered inside the body sees an immutable
 * per-iteration snapshot rather than a live, mutating list. The loop's
 * siblings keep seeing the outer template entry because the outer config is
 * never touched.
 *
 * Loops without resolved data (server pre-fetch failed, source unregistered,
 * or no data context like in editor canvas tests) render an HTML comment so
 * the page doesn't silently lose layout. Empty and failed result sets render
 * explicit polite status content so the collection state is perceivable.
 *
 * Pagination:
 *   - none: all rendered items emitted, no extra markup;
 *   - numbered, previous-next and cursor: accessible server-rendered nav;
 *   - load-more (including legacy infinite): runtime-enhanced append behavior.
 *
 * The loop's own `classIds` are injected onto a wrapping `<div>` so author-
 * applied classes (e.g. grid layout) actually take effect.
 */
export function renderLoop(
  node: PageNode,
  config: RenderConfig,
  acc: RenderAccumulators,
  renderNode: RenderNodeFn,
): string {
  const loopId = node.id
  const data = resolveLoopData(node, config)
  // No pre-fetched data — most likely an editor preview or a test that did
  // not seed loopData. Emit a marker comment rather than an empty string so
  // diagnostics in the rendered output are visible.
  if (!data) {
    return `<!-- instatic: loop "${escapeHtml(loopId)}" has no resolved data -->`
  }

  const variants = node.children ?? []
  const itemRenderer =
    node.props.itemRenderer === 'search-result' ? 'search-result' : 'children'
  if (variants.length === 0 && itemRenderer === 'children') {
    return '<!-- instatic: loop has no child template -->'
  }
  // The base template context (page/site/route frames + the outer entry stack)
  // that loop-body bindings resolve against. Each iteration derives a CHILD
  // config from this WITHOUT mutating it — see below.
  const baseTemplateContext: TemplateRenderDataContext = config.templateContext ?? { entryStack: [] }
  const baseStack = baseTemplateContext.entryStack

  let body = ''
  if (data.error) {
    body = collectionStatus(data.error)
  } else if (data.operationalState && data.items.length === 0) {
    body = collectionStatus(
      data.operationalMessage ?? 'This collection is temporarily unavailable.',
    )
  } else if (data.items.length === 0) {
    body = collectionStatus('No items found.')
  } else if (itemRenderer === 'search-result') {
    body = data.items.map(renderSearchResult).join('')
    if (data.operationalState) {
      body += collectionStatus(
        data.operationalMessage ?? 'Search results may be incomplete.',
      )
    } else {
      body += '<span role="status" aria-live="polite" aria-atomic="true" data-instatic-collection-status></span>'
    }
  } else {
    data.items.forEach((item: LoopItem, i: number) => {
      const variantId = variants[i % variants.length]
      // Per-iteration snapshot: a NEW entryStack array with this item appended,
      // wrapped in a NEW templateContext and a NEW child config. Nothing the
      // outer config owns is mutated, so iterations are independent and a VC ref
      // (or nested loop) in the body sees a stable, item-specific stack.
      const iterationTemplateContext: TemplateRenderDataContext = {
        ...baseTemplateContext,
        entryStack: [...baseStack, item],
      }
      const iterationConfig: RenderConfig = {
        ...config,
        templateContext: iterationTemplateContext,
      }
      body += renderNode(variantId, iterationConfig, acc)
    })
    body += '<span role="status" aria-live="polite" aria-atomic="true" data-instatic-collection-status></span>'
  }

  // Pagination signals — load-more attaches a sentinel and
  // registers the loop's id so publishPage() can decide whether to emit
  // the runtime script.
  const props = node.props
  const paginationMode =
    data.paginationMode ?? normalizeCollectionPaginationMode(props.pagination)
  const isLoadMore = paginationMode === 'load-more'
  let attrs = ` data-instatic-loop="${escapeHtml(loopId)}"`
  attrs += ` data-instatic-loop-page="${data.pageNumber}"`
  attrs += ` data-instatic-collection-state="${
    data.error
      ? 'error'
      : data.operationalState
        ? data.operationalState
        : data.items.length === 0
          ? 'empty'
          : 'populated'
  }"`
  if (isLoadMore) {
    attrs += ` data-instatic-loop-mode="load-more"`
    attrs += ` data-instatic-loop-has-more="${data.hasMore ? 'true' : 'false'}"`
    attrs += ` data-instatic-loop-page-size="${typeof props.pageSize === 'number' ? Math.floor(props.pageSize) : 10}"`
    acc.infiniteLoopIds.add(loopId)
  }

  // Wrapper element — author-selectable via the shared htmlTag helper
  // (defaults to 'div'). `resolveHtmlTag` always returns a safe lowercase
  // tag name, so it's already escape-safe for interpolation.
  const tag = resolveHtmlTag(props.tag, props.customTag)
  const html = `<${tag}${attrs}>${body}</${tag}>`

  // Inject the loop's own classIds + inline styles onto the wrapper element.
  const withClasses = injectNodeClassIds(html, node.classIds, config.site)
  const withStyles = injectNodeInlineStyles(withClasses, node.inlineStyles, config.mediaAssets)
  const wrapper = config.annotateNodeIds
    ? injectNodeId(withStyles, node.id)
    : withStyles
  return wrapper + renderCollectionPagination(data, paginationMode)
}

function renderSearchResult(item: LoopItem): string {
  const title = String(item.fields.title ?? 'Untitled page')
  const permalink = String(item.fields.permalink ?? '#')
  const excerpt = String(item.fields.excerpt ?? '')
  return (
    '<article data-instatic-search-result>' +
    `<h2><a href="${safeUrl(permalink)}">${escapeHtml(title)}</a></h2>` +
    (excerpt ? `<p>${escapeHtml(excerpt)}</p>` : '') +
    '</article>'
  )
}

function collectionStatus(message: string): string {
  return (
    '<span role="status" aria-live="polite" aria-atomic="true" ' +
    `data-instatic-collection-status>${escapeHtml(message)}</span>`
  )
}

function renderCollectionPagination(
  data: ResolvedLoopRenderData,
  mode: ReturnType<typeof normalizeCollectionPaginationMode>,
): string {
  if (
    data.error ||
    data.items.length === 0 ||
    mode === 'none' ||
    mode === 'load-more'
  ) {
    return ''
  }

  const links: string[] = []
  if (data.previousHref) {
    links.push(
      `<a rel="prev" href="${escapeHtml(data.previousHref)}">Previous</a>`,
    )
  }
  if (mode === 'numbered') {
    for (const page of data.numberedHrefs ?? []) {
      links.push(
        page.pageNumber === data.pageNumber
          ? `<a href="${escapeHtml(page.href)}" aria-current="page">${page.pageNumber}</a>`
          : `<a href="${escapeHtml(page.href)}">${page.pageNumber}</a>`,
      )
    }
  }
  if (data.nextHref) {
    links.push(`<a rel="next" href="${escapeHtml(data.nextHref)}">Next</a>`)
  }
  if (links.length === 0) return ''
  return (
    '<nav aria-label="Collection pagination" ' +
    `data-instatic-collection-pagination="${mode}">${links.join('')}</nav>`
  )
}

function resolveLoopData(node: PageNode, config: RenderConfig) {
  if (node.props.sourceId !== ENTRY_FIELD_SOURCE_ID) {
    return config.loopData?.get(node.id)
  }

  const filters = node.props.filters
  const fieldId =
    filters && typeof filters === 'object' && !Array.isArray(filters)
      ? (filters as Record<string, unknown>)[ENTRY_FIELD_FILTER_KEY]
      : undefined
  if (typeof fieldId !== 'string' || !fieldId) {
    return { items: [], totalItems: 0, pageNumber: 1, hasMore: false }
  }

  const stack = config.templateContext?.entryStack ?? []
  const entry = stack[stack.length - 1]
  const value = entry?.fields[fieldId]
  const resolved = resolveEntryFieldItems(value, {
    offset: typeof node.props.offset === 'number' ? node.props.offset : 0,
    limit: typeof node.props.limit === 'number' ? node.props.limit : 10,
    direction: node.props.direction === 'desc' ? 'desc' : 'asc',
    mediaByReference: config.mediaAssets as ReadonlyMap<string, EntryFieldMedia> | undefined,
  })
  return {
    ...resolved,
    pageNumber: 1,
    hasMore: false,
  }
}
