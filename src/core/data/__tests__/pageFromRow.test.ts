import { describe, expect, it } from 'bun:test'
import { pageFromRow, pageToCells } from '../pageFromRow'
import type { DataRow } from '@core/data/schemas'

const baseRow = (cells: Record<string, unknown>): DataRow => ({
  id: 'p1', tableId: 'pages', slug: 'posts-template', cells: cells as never,
  authorUserId: null, createdByUserId: null, updatedByUserId: null,
} as unknown as DataRow)

describe('pageFromRow template target', () => {
  it('reads a postTypes target round-trip', () => {
    const page = pageFromRow(baseRow({
      title: 'T', slug: 'posts-template',
      templateEnabled: true,
      templateTarget: { kind: 'postTypes', tableSlugs: ['posts'] },
      templatePriority: 10,
    }))
    expect(page.template).toEqual({
      enabled: true, target: { kind: 'postTypes', tableSlugs: ['posts'] }, priority: 10,
    })
    const cells = pageToCells(page)
    expect(cells.templateTarget).toEqual({ kind: 'postTypes', tableSlugs: ['posts'] })
    expect(cells.templateContext).toBeUndefined()
    expect(cells.templateConditions).toBeUndefined()
  })

  it('drops a malformed target', () => {
    const page = pageFromRow(baseRow({ templateEnabled: true, templateTarget: { kind: 'nonsense' } }))
    expect(page.template).toBeUndefined()
  })
})

describe('pageFromRow SEO metadata', () => {
  it('round-trips the complete page SEO contract', () => {
    const seo = {
      title: 'A useful title',
      description: 'A useful description.',
      canonicalUrl: 'https://example.test/useful',
      language: 'en-AU',
      robots: { index: true, follow: true, archive: true },
      openGraph: { title: 'Social title', type: 'article' as const },
      twitter: { card: 'summary' as const, title: 'Social title' },
    }
    const cells = pageToCells({
      ...pageFromRow(baseRow({ title: 'T', slug: 'useful' })),
      seo,
    })

    expect(JSON.parse(String(cells.seo))).toEqual(seo)
    expect(cells.seoTitle).toBe('A useful title')
    expect(cells.seoDescription).toBe('A useful description.')
    expect(pageFromRow(baseRow(cells)).seo).toEqual(seo)
  })

  it('reads legacy title and description cells when full metadata is absent', () => {
    expect(pageFromRow(baseRow({
      title: 'T',
      slug: 'legacy',
      seoTitle: 'Legacy title',
      seoDescription: 'Legacy description.',
    })).seo).toEqual({
      title: 'Legacy title',
      description: 'Legacy description.',
    })
  })
})
