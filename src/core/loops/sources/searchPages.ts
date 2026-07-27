import type {
  LoopEntitySource,
  LoopFetchResult,
  LoopItem,
  SourceFetchContext,
} from '@core/loops/types'
import {
  buildSearchDocuments,
  resolveSiteSearchSettings,
  searchIndexService,
} from '@core/search'

function queryForRequest(ctx: SourceFetchContext): string {
  const settings = resolveSiteSearchSettings(ctx.site)
  if (!settings) return ''
  return ctx.request?.query[settings.queryParam] ?? ctx.query ?? ''
}

function resultToLoopItem(result: {
  id: string
  pageId: string
  title: string
  permalink: string
  excerpt: string
  score: number
}): LoopItem {
  return {
    id: result.id,
    fields: {
      id: result.id,
      pageId: result.pageId,
      title: result.title,
      permalink: result.permalink,
      excerpt: result.excerpt,
      score: result.score,
    },
  }
}

export const SearchPagesSource: LoopEntitySource = {
  id: 'search.pages',
  label: 'Published page search',
  description:
    'Searches the current published page index using the configured page query parameter.',
  requestDependent: true,

  filterSchema: {
    pathPrefix: {
      type: 'text',
      label: 'Path prefix',
      description: 'Optional public path prefix such as /guides.',
      placeholder: '/guides',
    },
  },

  orderByOptions: [
    { id: 'relevance', label: 'Relevance' },
    { id: 'title', label: 'Title' },
  ],

  fields: [
    { id: 'title', label: 'Title' },
    { id: 'excerpt', label: 'Excerpt' },
    { id: 'permalink', label: 'Permalink', format: 'url' },
    { id: 'score', label: 'Relevance score' },
  ],

  async fetch(ctx): Promise<LoopFetchResult> {
    const settings = resolveSiteSearchSettings(ctx.site)
    if (!settings) {
      return {
        items: [],
        totalItems: 0,
        operationalState: 'unavailable',
        operationalMessage: 'Search is not available.',
      }
    }
    const query = queryForRequest(ctx).trim()
    if (query.length < settings.minQueryLength) {
      return { items: [], totalItems: 0 }
    }

    const pathPrefix =
      typeof ctx.filters.pathPrefix === 'string' &&
      ctx.filters.pathPrefix.startsWith('/')
        ? ctx.filters.pathPrefix
        : undefined
    const response = searchIndexService.query(ctx.site, {
      query,
      ...(pathPrefix ? { pathPrefix } : {}),
      orderBy: ctx.orderBy === 'title' ? 'title' : 'relevance',
      direction: ctx.direction,
      limit: Math.min(ctx.limit, settings.maxResults),
      offset: ctx.offset,
    })
    return {
      items: response.results.map(resultToLoopItem),
      totalItems: response.totalResults,
      ...(response.health !== 'available'
        ? {
            operationalState: response.health,
            operationalMessage:
              response.message ?? 'Search results may be incomplete.',
          }
        : {}),
    }
  },

  preview(ctx): LoopItem[] {
    return buildSearchDocuments(ctx.site).slice(0, ctx.limit).map((document) => ({
      id: document.id,
      fields: {
        id: document.id,
        pageId: document.pageId,
        title: document.title,
        permalink: document.permalink,
        excerpt: document.body.slice(0, 180),
        score: 0,
      },
    }))
  },
}
