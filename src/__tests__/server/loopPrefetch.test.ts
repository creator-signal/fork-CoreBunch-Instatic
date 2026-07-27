/**
 * Tests for the server-side loop pre-fetch helper.
 * Uses the dbTestFake harness so tests don't require a real DB.
 */

import { describe, expect, it } from 'bun:test'
import {
  collectLoopNodes,
  prefetchLoopData,
  publishedDataRowToLoopItem,
  readLoopProps,
} from '../../../server/publish/loopPrefetch'
import type { DbResult } from '../../../server/db'
import { createFakeDb } from './dbTestFake'
import { makePage, makeSite } from '../publisher/helpers'
import { loopSourceRegistry } from '@core/loops/registry'
import type { SourceFetchContext } from '@core/loops/types'

// Make sure the built-in sources are registered.
import '@core/loops/sources'

describe('loopPrefetch', () => {
  it('maps published data row authorship into public loop fields', () => {
    const item = publishedDataRowToLoopItem({
      id: 'version_1',
      rowId: 'row_1',
      tableId: 'posts',
      tableSlug: 'posts',
      tableKind: 'postType',
      tableRouteBase: '/posts',
      versionNumber: 1,
      cells: {
        title: 'Published post',
        slug: 'published-post',
        body: 'Body',
        seoTitle: '',
        seoDescription: '',
      },
      slug: 'published-post',
      featuredMediaId: null,
      featuredMediaPath: null,
      authorUserId: 'author_1',
      authorName: 'Author Name',
      authorRoleSlug: 'editor',
      authorRoleName: 'Editor',
      publishedByUserId: 'publisher_1',
      publishedByName: 'Publisher Name',
      publishedByRoleSlug: 'admin',
      publishedByRoleName: 'Admin',
      publishedAt: '2026-05-01T10:02:00.000Z',
      createdAt: '2026-05-01T10:02:00.000Z',
    })

    expect(item.fields).toMatchObject({
      author: {
        displayName: 'Author Name',
        roleSlug: 'editor',
        roleName: 'Editor',
      },
      authorName: 'Author Name',
      authorRoleName: 'Editor',
      authorRoleSlug: 'editor',
      publishedBy: {
        displayName: 'Publisher Name',
        roleSlug: 'admin',
        roleName: 'Admin',
      },
      publishedByName: 'Publisher Name',
      publishedByRoleName: 'Admin',
      publishedByRoleSlug: 'admin',
    })
    expect('authorUserId' in item.fields).toBe(false)
    expect('authorId' in item.fields).toBe(false)
    expect('publishedByUserId' in item.fields).toBe(false)
    expect('publishedById' in item.fields).toBe(false)
  })

  it('readLoopProps coerces missing/invalid props into safe defaults', () => {
    const props = readLoopProps({
      id: 'l',
      moduleId: 'base.loop',
      props: {},
      children: [],
      breakpointOverrides: {},
      classIds: [],
    })
    expect(props.sourceId).toBe('')
    expect(props.limit).toBe(10)
    expect(props.offset).toBe(0)
    expect(props.direction).toBe('desc')
    expect(props.pagination).toBe('none')
    expect(props.pageSize).toBe(10)
  })

  it('collectLoopNodes returns every base.loop reachable from the root', () => {
    const page = makePage({
      root: { moduleId: 'base.body', children: ['loop1', 'box'] },
      box: { moduleId: 'base.container', children: ['loop2'] },
      loop1: { moduleId: 'base.loop', children: [] },
      loop2: { moduleId: 'base.loop', children: [] },
    })
    const nodes = collectLoopNodes(page, makeSite())
    expect(nodes.map((n) => n.id).sort()).toEqual(['loop1', 'loop2'])
  })

  it('collectLoopNodes descends into VC definition trees (ISS-022)', () => {
    const vcNode = (id: string, moduleId: string, children: string[] = [], props = {}) =>
      ({ id, moduleId, props, children, breakpointOverrides: {}, classIds: [] })
    const site = makeSite({
      visualComponents: [
        {
          id: 'vc1',
          name: 'VC1',
          params: [],
          tree: {
            rootNodeId: 'v1',
            nodes: {
              v1: vcNode('v1', 'base.container', ['v1loop']),
              v1loop: vcNode('v1loop', 'base.loop'),
            },
          },
        },
      ] as never,
    })
    const page = makePage({
      root: { moduleId: 'base.body', children: ['ref'] },
      ref: { moduleId: 'base.visual-component-ref', props: { componentId: 'vc1' }, children: [] },
    })
    expect(collectLoopNodes(page, site).map((n) => n.id)).toContain('v1loop')
  })

  it('returns empty map when the page has no loops', async () => {
    const page = makePage({
      root: { moduleId: 'base.body', children: ['text'] },
      text: { moduleId: 'base.text', props: {} },
    })
    const db = createFakeDb(async () => ({ rows: [], rowCount: 0 }))
    const result = await prefetchLoopData(page, makeSite(), db)
    expect(result.size).toBe(0)
  })

  it('returns empty data for loops referencing an unregistered source', async () => {
    const page = makePage({
      root: { moduleId: 'base.body', children: ['loop'] },
      loop: { moduleId: 'base.loop', props: { sourceId: 'unknown.source' } },
    })
    const db = createFakeDb(async () => ({ rows: [], rowCount: 0 }))
    const result = await prefetchLoopData(page, makeSite(), db)
    expect(result.size).toBe(1)
    expect(result.get('loop')?.items).toEqual([])
  })

  it('data.rows source returns empty when table has no rows', async () => {
    const page = makePage({
      root: { moduleId: 'base.body', children: ['loop'] },
      loop: {
        moduleId: 'base.loop',
        props: {
          sourceId: 'data.rows',
          filters: { tableId: 'posts' },
          orderBy: 'publishedAt',
          direction: 'desc',
          limit: 5,
          offset: 0,
        },
      },
    })
    const db = createFakeDb(async (sql): Promise<DbResult> => {
      if (sql.includes('count(*)')) return { rows: [{ total: 0 }], rowCount: 1 }
      return { rows: [], rowCount: 0 }
    })
    const result = await prefetchLoopData(page, makeSite(), db)
    expect(result.get('loop')?.items).toEqual([])
    expect(result.get('loop')?.totalItems).toBe(0)
  })

  it('site.pages source loops actual site pages', async () => {
    const page = makePage({
      root: { moduleId: 'base.body', children: ['loop'] },
      loop: {
        moduleId: 'base.loop',
        props: {
          sourceId: 'site.pages',
          filters: {},
          orderBy: 'definition',
          direction: 'asc',
          limit: 10,
          offset: 0,
        },
      },
    })
    const site = makeSite({
      pages: [
        { id: 'p1', slug: 'about', title: 'About', nodes: { r: { id: 'r', moduleId: 'base.body', props: {}, children: [], breakpointOverrides: {}, classIds: [] } }, rootNodeId: 'r' },
        { id: 'p2', slug: 'contact', title: 'Contact', nodes: { r: { id: 'r', moduleId: 'base.body', props: {}, children: [], breakpointOverrides: {}, classIds: [] } }, rootNodeId: 'r' },
      ],
    })
    const db = createFakeDb(async () => ({ rows: [], rowCount: 0 }))
    const result = await prefetchLoopData(page, site, db)
    const data = result.get('loop')
    expect(data?.totalItems).toBe(2)
    expect(data?.items.map((it) => it.fields.title)).toEqual(['About', 'Contact'])
  })

  it('paginates persisted manual items without a registered source', async () => {
    const page = makePage({
      slug: 'team',
      root: { moduleId: 'base.body', children: ['loop'] },
      loop: {
        moduleId: 'base.loop',
        props: {
          sourceMode: 'manual',
          sourceId: '',
          manualItems: [
            { id: 'one', fields: { title: 'One' } },
            { id: 'two', fields: { title: 'Two' } },
            { id: 'three', fields: { title: 'Three' } },
          ],
          pagination: 'numbered',
          pageSize: 1,
        },
      },
    })
    const db = createFakeDb(async () => ({ rows: [], rowCount: 0 }))
    const result = await prefetchLoopData(
      page,
      makeSite({ pages: [page] }),
      db,
      new URL('https://example.com/team?loop_loop_page=2'),
    )

    expect(result.get('loop')).toMatchObject({
      items: [{ id: 'two', fields: { title: 'Two' } }],
      totalItems: 3,
      pageNumber: 2,
      paginationMode: 'numbered',
      previousHref: '/team',
      nextHref: '/team?loop_loop_page=3',
    })
  })

  it('normalizes unsupported manual cursors to previous and next pagination', () => {
    const props = readLoopProps({
      id: 'manual',
      moduleId: 'base.loop',
      props: {
        sourceMode: 'manual',
        pagination: 'cursor',
        manualItems: [{ id: 'one', fields: { title: 'One' } }],
      },
      children: [],
      breakpointOverrides: {},
      classIds: [],
    })
    expect(props.pagination).toBe('previous-next')
    expect(props.manualItems).toEqual([
      { id: 'one', fields: { title: 'One' } },
    ])
  })

  it('adapts numbered collection pagination and query into loop fetch context', async () => {
    const sourceId = 'test.numbered-collection'
    let received: SourceFetchContext | undefined
    loopSourceRegistry.register({
      id: sourceId,
      label: 'Numbered collection',
      filterSchema: {},
      orderByOptions: [],
      fields: [],
      fetch: async (ctx) => {
        received = ctx
        return {
          items: [{ id: '11', fields: { title: 'Eleven' } }],
          totalItems: 25,
        }
      },
      preview: () => [],
    })
    try {
      const page = makePage({
        id: 'articles',
        slug: 'articles',
        root: { moduleId: 'base.body', children: ['loop'] },
        loop: {
          moduleId: 'base.loop',
          props: {
            sourceId,
            query: 'design systems',
            pagination: 'numbered',
            pageSize: 10,
          },
        },
      })
      const db = createFakeDb(async () => ({ rows: [], rowCount: 0 }))
      const result = await prefetchLoopData(
        page,
        makeSite({ pages: [page] }),
        db,
        new URL('https://example.com/articles?loop_loop_page=2&view=compact'),
      )

      expect(received).toMatchObject({
        query: 'design systems',
        limit: 10,
        offset: 10,
      })
      expect(result.get('loop')).toMatchObject({
        pageNumber: 2,
        paginationMode: 'numbered',
        previousHref: '/articles?view=compact',
        nextHref: '/articles?view=compact&loop_loop_page=3',
        numberedHrefs: [
          { pageNumber: 1, href: '/articles?view=compact' },
          {
            pageNumber: 2,
            href: '/articles?view=compact&loop_loop_page=2',
          },
          {
            pageNumber: 3,
            href: '/articles?view=compact&loop_loop_page=3',
          },
        ],
      })
    } finally {
      loopSourceRegistry.unregister(sourceId)
    }
  })

  it('forwards opaque cursor state and builds previous/next URLs', async () => {
    const sourceId = 'test.cursor-collection'
    let receivedCursor: string | undefined
    loopSourceRegistry.register({
      id: sourceId,
      label: 'Cursor collection',
      filterSchema: {},
      orderByOptions: [],
      fields: [],
      fetch: async (ctx) => {
        receivedCursor = ctx.cursor
        return {
          items: [{ id: 'item', fields: {} }],
          totalItems: 100,
          previousCursor: 'before:item',
          nextCursor: 'after:item',
        }
      },
      preview: () => [],
    })
    try {
      const page = makePage({
        slug: 'search',
        root: { moduleId: 'base.body', children: ['results'] },
        results: {
          moduleId: 'base.loop',
          props: {
            sourceId,
            pagination: 'cursor',
            pageSize: 20,
          },
        },
      })
      const db = createFakeDb(async () => ({ rows: [], rowCount: 0 }))
      const result = await prefetchLoopData(
        page,
        makeSite({ pages: [page] }),
        db,
        new URL(
          'https://example.com/search?q=cards&loop_results_cursor=current%3Aitem',
        ),
      )

      expect(receivedCursor).toBe('current:item')
      expect(result.get('results')).toMatchObject({
        paginationMode: 'cursor',
        previousHref:
          '/search?q=cards&loop_results_cursor=before%3Aitem',
        nextHref: '/search?q=cards&loop_results_cursor=after%3Aitem',
      })
    } finally {
      loopSourceRegistry.unregister(sourceId)
    }
  })
})
