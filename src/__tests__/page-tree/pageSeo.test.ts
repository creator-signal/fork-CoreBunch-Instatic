import { describe, expect, it } from 'bun:test'
import { Value } from '@sinclair/typebox/value'
import {
  PageSchema,
  PageSeoSchema,
  duplicatePage,
  parsePage,
  parsePageSeo,
} from '@core/page-tree'
import { makeSite } from '../publisher/helpers'

const ROOT = {
  id: 'root',
  moduleId: 'base.body',
  props: {},
  children: [],
  breakpointOverrides: {},
  classIds: [],
  locked: false,
  hidden: false,
}

describe('page SEO persistence contract', () => {
  it('validates the complete governed metadata shape', () => {
    const seo = {
      title: 'Page title',
      description: 'Page description',
      canonicalUrl: '/canonical',
      language: 'en-AU',
      robots: { index: true, follow: true, archive: false },
      alternates: [{ language: 'fr', url: '/fr' }],
      openGraph: { type: 'article', imageUrl: '/media/card.jpg', imageAlt: 'Page card' },
      twitter: { card: 'summary_large_image', title: 'Social title', imageAlt: 'Twitter card' },
    }

    expect(Value.Check(PageSeoSchema, seo)).toBe(true)
    expect(Value.Check(PageSchema, {
      id: 'page-1',
      slug: 'index',
      title: 'Home',
      seo,
      rootNodeId: 'root',
      nodes: { root: ROOT },
    })).toBe(true)
  })

  it('drops invalid optional sub-fields without dropping the page', () => {
    const page = parsePage({
      id: 'page-1',
      slug: 'index',
      title: 'Home',
      seo: {
        title: 'Kept title',
        robots: { index: true, follow: 'wrong', archive: true },
        alternates: [
          { language: 'fr', url: '/fr' },
          { language: 42, url: '/invalid' },
        ],
        openGraph: { type: 'invalid', imageUrl: '/card.jpg' },
      },
      rootNodeId: 'root',
      nodes: { root: ROOT },
    }, 0)

    expect(page.seo).toEqual({
      title: 'Kept title',
      alternates: [{ language: 'fr', url: '/fr' }],
      openGraph: { imageUrl: '/card.jpg' },
    })
  })

  it('returns undefined when no valid page metadata remains', () => {
    expect(parsePageSeo(null)).toBeUndefined()
    expect(parsePageSeo({ robots: { index: 'wrong' }, alternates: [null] })).toBeUndefined()
  })

  it('deep-copies page metadata when a page is duplicated', () => {
    const source = parsePage({
      id: 'source',
      slug: 'source',
      title: 'Source',
      seo: {
        title: 'Source title',
        alternates: [{ language: 'fr', url: '/fr/source' }],
      },
      rootNodeId: 'root',
      nodes: { root: ROOT },
    }, 0)
    const site = makeSite({ pages: [source] })

    const copy = duplicatePage(site, source.id, 'Copy', 'copy')
    copy.seo!.alternates![0].url = '/fr/copy'

    expect(copy.seo?.title).toBe('Source title')
    expect(source.seo?.alternates?.[0].url).toBe('/fr/source')
  })
})
