import { describe, expect, it } from 'bun:test'
import {
  collectionPaginationHref,
  deriveCollectionLoadState,
  normalizeCollectionPagination,
  normalizeCollectionPaginationMode,
  normalizeCollectionSource,
  readCollectionPageRequest,
  resolveCollectionPageInfo,
} from '@core/collections'

describe('shared collection contract', () => {
  it('normalizes manual and dynamic sources without consumer-specific shapes', () => {
    expect(normalizeCollectionSource({
      mode: 'manual',
      items: [
        { id: 'one', fields: { title: 'One' } },
        { nope: true },
      ],
    })).toEqual({
      mode: 'manual',
      items: [{ id: 'one', fields: { title: 'One' } }],
    })

    expect(normalizeCollectionSource({
      mode: 'dynamic',
      sourceId: 'search.index',
      filters: { type: 'article' },
      query: 'accessibility',
      sort: [
        { field: 'relevance', direction: 'desc' },
        { field: '', direction: 'asc' },
      ],
    })).toEqual({
      mode: 'dynamic',
      sourceId: 'search.index',
      filters: { type: 'article' },
      query: 'accessibility',
      sort: [{ field: 'relevance', direction: 'desc' }],
    })
  })

  it('supports every pagination mode and migrates the legacy infinite value', () => {
    expect([
      'none',
      'numbered',
      'previous-next',
      'load-more',
      'cursor',
    ].map(normalizeCollectionPaginationMode)).toEqual([
      'none',
      'numbered',
      'previous-next',
      'load-more',
      'cursor',
    ])
    expect(normalizeCollectionPaginationMode('infinite')).toBe('load-more')
    expect(normalizeCollectionPagination({ mode: 'cursor', pageSize: 999 }))
      .toEqual({ mode: 'cursor', pageSize: 200 })
  })

  it('reads independently namespaced page and cursor state from canonical URLs', () => {
    const numbered = readCollectionPageRequest(
      new URLSearchParams('collection_cards_page=3&collection_other_page=8'),
      'cards',
      { mode: 'numbered', pageSize: 12 },
    )
    expect(numbered).toEqual({
      mode: 'numbered',
      pageSize: 12,
      pageNumber: 3,
    })

    const cursor = readCollectionPageRequest(
      new URLSearchParams('collection_results_cursor=next%3A42'),
      'results',
      { mode: 'cursor', pageSize: 20 },
    )
    expect(cursor).toEqual({
      mode: 'cursor',
      pageSize: 20,
      pageNumber: 1,
      cursor: 'next:42',
    })
  })

  it('writes routable history URLs without losing unrelated query or hash state', () => {
    const current = new URL('https://example.com/search?q=cards#results')
    expect(collectionPaginationHref(
      current,
      'results',
      { pageNumber: 2 },
    )).toBe('/search?q=cards&collection_results_page=2#results')
    expect(collectionPaginationHref(
      new URL('https://example.com/search?q=cards&collection_results_page=2'),
      'results',
      { pageNumber: 1 },
    )).toBe('/search?q=cards')
  })

  it('derives loading, empty, error and populated states with announcements', () => {
    const request = {
      mode: 'numbered' as const,
      pageSize: 2,
      pageNumber: 2,
    }
    expect(deriveCollectionLoadState({ loading: true }, request))
      .toEqual({
        status: 'loading',
        items: [],
        announcement: 'Loading items.',
      })
    expect(deriveCollectionLoadState({ result: { items: [], totalItems: 0 } }, request))
      .toEqual({
        status: 'empty',
        items: [],
        announcement: 'No items found.',
      })
    expect(deriveCollectionLoadState({ error: 'Try again.' }, request))
      .toEqual({
        status: 'error',
        items: [],
        message: 'Try again.',
        announcement: 'Items could not be loaded. Try again.',
      })

    const result = {
      items: [{ id: 'three' }, { id: 'four' }],
      totalItems: 5,
    }
    const pageInfo = resolveCollectionPageInfo(request, result)
    expect(pageInfo).toEqual({
      pageNumber: 2,
      pageSize: 2,
      totalItems: 5,
      totalPages: 3,
      hasPrevious: true,
      hasNext: true,
    })
    expect(deriveCollectionLoadState({ result }, request)).toEqual({
      status: 'populated',
      items: result.items,
      pageInfo,
      announcement: 'Showing 2 items on page 2 of 3.',
    })
  })

  it('uses cursor tokens instead of inferred offsets for cursor page state', () => {
    const pageInfo = resolveCollectionPageInfo(
      {
        mode: 'cursor',
        pageSize: 10,
        pageNumber: 1,
        cursor: 'after:20',
      },
      {
        items: [{ id: '21' }],
        totalItems: 100,
        previousCursor: 'before:21',
        nextCursor: 'after:30',
      },
    )
    expect(pageInfo).toMatchObject({
      hasPrevious: true,
      hasNext: true,
      previousCursor: 'before:21',
      nextCursor: 'after:30',
    })
  })
})
