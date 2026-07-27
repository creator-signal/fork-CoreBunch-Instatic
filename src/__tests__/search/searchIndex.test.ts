import { describe, expect, it } from 'bun:test'
import {
  DEFAULT_SITE_SEARCH_SETTINGS,
  parseSiteSettings,
  type Page,
  type SiteDocument,
} from '@core/page-tree'
import {
  SearchIndexService,
  buildSearchDocuments,
  searchCapabilityHealth,
} from '@core/search'
import { SearchPagesSource } from '@core/loops'
import { makePage, makeSite } from '../publisher/helpers'

function searchSite(pages: Page[]): SiteDocument {
  return makeSite({
    pages,
    settings: {
      shortcuts: {},
      search: {
        ...DEFAULT_SITE_SEARCH_SETTINGS,
        enabled: true,
      },
    },
  })
}

function contentPage(input: {
  id: string
  title: string
  slug: string
  text: string
  hiddenText?: string
  template?: boolean
}): Page {
  const page = makePage({
    root: {
      moduleId: 'base.body',
      children: input.hiddenText ? ['visible', 'hidden'] : ['visible'],
    },
    visible: {
      moduleId: 'base.text',
      props: { text: input.text },
    },
    ...(input.hiddenText
      ? {
          hidden: {
            moduleId: 'base.text',
            props: { text: input.hiddenText },
            hidden: true,
          },
        }
      : {}),
  })
  return {
    ...page,
    id: input.id,
    title: input.title,
    slug: input.slug,
    ...(input.template
      ? {
          template: {
            enabled: true,
            target: { kind: 'postTypes', tableSlugs: ['posts'] },
            priority: 0,
          },
        }
      : {}),
  }
}

function query(service: SearchIndexService, site: SiteDocument, value: string) {
  return service.query(site, {
    query: value,
    orderBy: 'relevance',
    direction: 'desc',
    limit: 20,
    offset: 0,
  })
}

describe('published page search index', () => {
  it('parses valid configuration and drops invalid persisted values', () => {
    expect(parseSiteSettings({
      shortcuts: {},
      search: {
        ...DEFAULT_SITE_SEARCH_SETTINGS,
        enabled: true,
      },
    }).search?.enabled).toBe(true)
    expect(parseSiteSettings({
      shortcuts: {},
      search: {
        ...DEFAULT_SITE_SEARCH_SETTINGS,
        queryParam: 'bad query parameter',
      },
    }).search).toBeUndefined()
  })

  it('indexes only non-template pages and excludes hidden subtrees', () => {
    const site = searchSite([
      contentPage({
        id: 'guide',
        title: 'Creator guide',
        slug: 'guide',
        text: 'Build a visible signal.',
        hiddenText: 'private-draft-token',
      }),
      contentPage({
        id: 'template',
        title: 'Post template',
        slug: 'post-template',
        text: 'template-only-token',
        template: true,
      }),
    ])

    const documents = buildSearchDocuments(site)
    expect(documents).toHaveLength(1)
    expect(documents[0]).toMatchObject({
      pageId: 'guide',
      title: 'Creator guide',
      permalink: '/guide',
    })
    expect(documents[0]?.body).toContain('visible signal')
    expect(documents[0]?.body).not.toContain('private-draft-token')
    expect(documents[0]?.body).not.toContain('template-only-token')
  })

  it('ranks title matches ahead of body-only matches and paginates deterministically', () => {
    const service = new SearchIndexService()
    const site = searchSite([
      contentPage({
        id: 'title-match',
        title: 'Creator signal',
        slug: 'creator-signal',
        text: 'A concise introduction.',
      }),
      contentPage({
        id: 'body-match',
        title: 'Other page',
        slug: 'other',
        text: 'A creator signal appears once in this body.',
      }),
    ])

    const response = query(service, site, 'creator signal')
    expect(response.health).toBe('available')
    expect(response.totalResults).toBe(2)
    expect(response.results.map((result) => result.pageId)).toEqual([
      'title-match',
      'body-match',
    ])

    const second = service.query(site, {
      query: 'creator signal',
      orderBy: 'relevance',
      direction: 'desc',
      limit: 1,
      offset: 1,
    })
    expect(second.results.map((result) => result.pageId)).toEqual(['body-match'])
  })

  it('tracks explicit stale state and refreshes it on ensure', () => {
    const service = new SearchIndexService()
    const site = searchSite([
      contentPage({
        id: 'one',
        title: 'Searchable',
        slug: 'searchable',
        text: 'Fresh published content.',
      }),
    ])

    const first = service.reindex(site, 100)
    expect(first.generation).toBe(1)
    expect(service.markStale(site.id).health).toBe('stale')

    const refreshed = service.ensure(site, 200)
    expect(refreshed.health).toBe('available')
    expect(refreshed.generation).toBe(2)
    expect(refreshed.indexedAt).toBe(200)
  })

  it('is unavailable until enabled and degrades safely with no eligible pages', () => {
    const disabled = makeSite({ pages: [] })
    expect(searchCapabilityHealth(disabled)).toBe('unavailable')

    const enabled = searchSite([])
    expect(searchCapabilityHealth(enabled)).toBe('degraded')
    const response = query(new SearchIndexService(), enabled, 'anything')
    expect(response).toMatchObject({
      health: 'degraded',
      results: [],
      totalResults: 0,
    })
    expect(response.message).not.toContain(enabled.id)
  })

  it('uses the configured request query and shared limit/offset contract', async () => {
    const site = searchSite([
      contentPage({
        id: 'alpha',
        title: 'Alpha guide',
        slug: 'guides/alpha',
        text: 'Search topic.',
      }),
      contentPage({
        id: 'beta',
        title: 'Beta guide',
        slug: 'guides/beta',
        text: 'Search topic.',
      }),
    ])
    const result = await SearchPagesSource.fetch({
      db: (() => Promise.resolve({ rows: [], rowCount: 0 })) as never,
      site,
      filters: { pathPrefix: '/guides' },
      query: 'ignored fallback',
      orderBy: 'title',
      direction: 'asc',
      limit: 1,
      offset: 1,
      request: {
        query: { q: 'search topic' },
        path: '/search',
        slug: 'search',
        cookies: {},
      },
    })

    expect(result.totalItems).toBe(2)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.fields.title).toBe('Beta guide')
  })
})
