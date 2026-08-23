import { describe, expect, it } from 'bun:test'
import '@modules/base'
import type { SiteBundleArchiveManifest } from '@core/data/bundleArchive'
import type { DataRow, DataTable } from '@core/data/schemas'
import { pageToCells } from '@core/data/pageFromRow'
import { legacyCreatorSignalPageHashes0111 } from '../../../integrations/creator-signal/migrations/legacy-0.1.11-hashes'
import { legacyCreatorSignalPages0111 } from '../../../integrations/creator-signal/migrations/legacy-0.1.11'
import {
  retainedCreatorSignalPageHashes0200To0206,
  retainedCreatorSignalTemplates0200To0206,
} from '../../../integrations/creator-signal/migrations/retained-0.2.x-hashes'
import {
  retainedCreatorSignalNotFoundTemplates035,
  retainedCreatorSignalPageHashes035,
  retainedCreatorSignalTemplates035,
} from '../../../integrations/creator-signal/migrations/retained-0.3.5-hashes'
import {
  retainedCreatorSignalNotFoundTemplates040,
  retainedCreatorSignalPageHashes040,
  retainedCreatorSignalTemplates040,
} from '../../../integrations/creator-signal/migrations/retained-0.4.0-hashes'
import {
  retainedCreatorSignalNotFoundTemplates050,
  retainedCreatorSignalPageHashes050,
  retainedCreatorSignalTemplates050,
} from '../../../integrations/creator-signal/migrations/retained-0.5.0-hashes'
import {
  retainedCreatorSignalNotFoundTemplates060,
  retainedCreatorSignalPageHashes060,
  retainedCreatorSignalTemplates060,
} from '../../../integrations/creator-signal/migrations/retained-0.6.0-hashes'
import {
  canonicalPageCellsSha256,
  canonicalSha256,
  prepareCreatorSignalContentMigration,
  retainedCreatorSignalPageVersion,
} from '../../../integrations/creator-signal/migrations/0.2.0/migration'

const timestamp = '2026-08-14T00:00:00.000Z'

const pagesTable: DataTable = {
  id: 'pages',
  name: 'Pages',
  slug: 'pages',
  kind: 'page',
  singularLabel: 'Page',
  pluralLabel: 'Pages',
  routeBase: '',
  primaryFieldId: 'title',
  fields: [
    { type: 'text', id: 'title', label: 'Title', required: true, builtIn: true },
    { type: 'text', id: 'slug', label: 'Slug', required: true, builtIn: true },
    { type: 'pageTree', id: 'body', label: 'Body', required: true, builtIn: true },
  ],
  system: true,
  createdByUserId: null,
  updatedByUserId: null,
  createdAt: timestamp,
  updatedAt: timestamp,
}

function rowFor(page: (typeof legacyCreatorSignalPages0111)[number]): DataRow {
  return {
    id: page.id,
    tableId: 'pages',
    cells: pageToCells(page),
    slug: page.slug,
    status: 'published',
    seq: 10,
    authorUserId: null,
    createdByUserId: null,
    updatedByUserId: null,
    publishedByUserId: null,
    author: null,
    createdBy: null,
    updatedBy: null,
    publishedBy: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: timestamp,
    scheduledPublishAt: null,
    deletedAt: null,
  }
}

function legacyManifest(): SiteBundleArchiveManifest {
  return {
    schemaVersion: 1,
    exportedAt: timestamp,
    sourceSiteName: 'Creator Signal',
    tables: [pagesTable],
    rows: legacyCreatorSignalPages0111.map(rowFor),
  }
}

describe('Creator Signal 0.2.0 content migration', () => {
  it('pins the retained 0.1.11 fixture to hashes captured from the source commit', () => {
    expect(Object.fromEntries(legacyCreatorSignalPages0111.map((page) => [
      page.id,
      canonicalSha256(pageToCells(page)),
    ]))).toEqual(legacyCreatorSignalPageHashes0111)
  })

  it('prepares an explicit non-publishing migration only for the exact retained starter', () => {
    const result = prepareCreatorSignalContentMigration(legacyManifest(), timestamp)

    expect(result.report.ready).toBe(true)
    expect(result.report.summary).toEqual({
      legacyEligible: 23,
      alreadyCurrent: 0,
      authoredContent: 0,
      missing: 0,
      newPages: 3,
      additionalPages: 0,
      template: 'add',
      notFoundTemplate: 'add',
      rowsInMigration: 28,
    })
    expect(result.report.apply).toMatchObject({
      strategy: 'merge-overwrite',
      publishesAutomatically: false,
    })
    expect(result.manifest?.site).toBeUndefined()
    expect(result.manifest?.media).toBeUndefined()
    expect(result.manifest?.rows).toHaveLength(28)
    expect(result.manifest?.rows.some((row) =>
      row.id === 'creator-signal.site/page/early-access')).toBe(true)
    expect(result.manifest?.rows.some((row) =>
      row.id === 'creator-signal.site/page/waitlist')).toBe(true)
    expect(result.manifest?.rows.some((row) =>
      row.id === 'creator-signal.site/page/beta')).toBe(true)
    expect(result.manifest?.tables[0].fields.some((field) => field.id === 'seo')).toBe(true)

    const templateRow = result.manifest?.rows.find((row) =>
      row.id === 'creator-signal.site/page/site-template')
    expect(templateRow?.status).toBe('draft')
    expect(templateRow?.cells.templateEnabled).toBe(true)
    expect(templateRow?.slug).toBe('creator-signal-site-template')

    const notFoundTemplateRow = result.manifest?.rows.find((row) =>
      row.id === 'creator-signal.site/page/not-found')
    expect(notFoundTemplateRow?.status).toBe('draft')
    expect(notFoundTemplateRow?.cells.templateTarget).toEqual({ kind: 'notFound' })

    const home = result.manifest?.rows.find((row) =>
      row.id === 'creator-signal.site/page/home')
    const body = home?.cells.body as { nodes: Record<string, { children: string[]; catalogueInstance?: { entryId: string } }>; rootNodeId: string }
    expect(body.nodes[body.rootNodeId].children).toHaveLength(1)
    const patternNode = body.nodes[body.nodes[body.rootNodeId].children[0]!]
    expect(patternNode.catalogueInstance?.entryId).toBe(
      'creator-signal.site.pattern.home-v2-page',
    )
    for (const nodeId of patternNode.children) {
      expect(body.nodes[nodeId].catalogueInstance?.entryId).toStartWith('creator-signal.site.')
      expect(body.nodes[nodeId].children).toEqual([])
    }
  })

  it('repairs only the exact invalid 0.0.29 shared template', () => {
    const first = prepareCreatorSignalContentMigration(legacyManifest(), timestamp)
    const source = structuredClone(first.manifest!)
    const templateRow = source.rows.find((row) =>
      row.id === 'creator-signal.site/page/site-template')!
    templateRow.slug = '_templates/creator-signal-site'
    templateRow.cells = {
      ...templateRow.cells,
      slug: '_templates/creator-signal-site',
    }

    const result = prepareCreatorSignalContentMigration(source, timestamp)

    expect(result.report.ready).toBe(true)
    expect(result.report.summary).toMatchObject({
      alreadyCurrent: 26,
      newPages: 0,
      template: 'repair',
      notFoundTemplate: 'current',
      rowsInMigration: 1,
    })
    expect(result.manifest?.rows).toHaveLength(1)
    expect(result.manifest?.rows[0]).toMatchObject({
      id: 'creator-signal.site/page/site-template',
      slug: 'creator-signal-site-template',
      status: 'draft',
    })
  })

  it('blocks the whole template migration when any page contains authored changes', () => {
    const source = legacyManifest()
    const home = source.rows.find((row) => row.slug === 'index')!
    home.cells = { ...home.cells, title: 'Author changed this title' }

    const result = prepareCreatorSignalContentMigration(source, timestamp)

    expect(result.report.ready).toBe(false)
    expect(result.manifest).toBeNull()
    expect(result.report.summary.authoredContent).toBe(1)
    expect(result.report.pages.find((page) => page.slug === 'index')?.state).toBe('authored-content')
    expect(result.report.blockers).toEqual(expect.arrayContaining([
      expect.stringContaining('requires manual mapping'),
    ]))
  })

  it('recognises only the pinned retained page and template hashes', () => {
    expect(Object.keys(retainedCreatorSignalPageHashes0200To0206).sort()).toEqual(
      Object.keys(legacyCreatorSignalPageHashes0111).sort(),
    )
    for (const [pageId, hash] of Object.entries(retainedCreatorSignalPageHashes0200To0206)) {
      expect(retainedCreatorSignalPageVersion(pageId, hash)).toBe('0.2.0-0.2.6')
      const unknownHash = `${hash.slice(0, -1)}${hash.endsWith('0') ? '1' : '0'}`
      expect(retainedCreatorSignalPageVersion(pageId, unknownHash)).toBeNull()
    }
    expect(retainedCreatorSignalTemplates0200To0206).toEqual([
      {
        slug: '_templates/creator-signal-site',
        hash: '541dbe0de9df281d1785c75ade65d7473e721ef36ef9e58fcadaee0447232ea2',
      },
      {
        slug: 'creator-signal-site-template',
        hash: 'e541f13c931e8e2f784428eb786f600bc0f123e98c79f7538416fe6a110aaf89',
      },
    ])
    expect(Object.keys(retainedCreatorSignalPageHashes035)).toHaveLength(24)
    for (const [pageId, hash] of Object.entries(retainedCreatorSignalPageHashes035)) {
      expect(retainedCreatorSignalPageVersion(pageId, hash)).toBe('0.3.5')
      const unknownHash = `${hash.slice(0, -1)}${hash.endsWith('0') ? '1' : '0'}`
      expect(retainedCreatorSignalPageVersion(pageId, unknownHash)).toBeNull()
    }
    expect(retainedCreatorSignalTemplates035).toEqual([{
      slug: 'creator-signal-site-template',
      hash: '59c126a2d7791cd8ebc192d17bff3be66fc10ea6892b1d4f73dc2c31ad53207f',
    }])
    expect(retainedCreatorSignalNotFoundTemplates035).toEqual([{
      slug: 'creator-signal-not-found',
      hash: 'a33bf95e80ba899965b419913adc057ec7f0e929a1f262b2a35acd71f7fe54fb',
    }])
    expect(Object.keys(retainedCreatorSignalPageHashes040)).toHaveLength(24)
    for (const [pageId, hash] of Object.entries(retainedCreatorSignalPageHashes040)) {
      expect(['0.3.5', '0.4.0']).toContain(retainedCreatorSignalPageVersion(pageId, hash))
      const unknownHash = `${hash.slice(0, -1)}${hash.endsWith('0') ? '1' : '0'}`
      expect(retainedCreatorSignalPageVersion(pageId, unknownHash)).toBeNull()
    }
    expect(retainedCreatorSignalPageVersion(
      'creator-signal.site/page/home',
      retainedCreatorSignalPageHashes040['creator-signal.site/page/home']!,
    )).toBe('0.4.0')
    expect(retainedCreatorSignalTemplates040).toEqual([{
      slug: 'creator-signal-site-template',
      hash: '718c048ac69f6742898cd1c1d8f0adc19ad08de4b03db120c0e9f97e6097be8b',
    }])
    expect(retainedCreatorSignalNotFoundTemplates040).toEqual([{
      slug: 'creator-signal-not-found',
      hash: 'a33bf95e80ba899965b419913adc057ec7f0e929a1f262b2a35acd71f7fe54fb',
    }])
    expect(Object.keys(retainedCreatorSignalPageHashes050)).toHaveLength(26)
    expect(retainedCreatorSignalPageVersion(
      'creator-signal.site/page/home',
      retainedCreatorSignalPageHashes050['creator-signal.site/page/home']!,
    )).toBe('0.5.0')
    expect(retainedCreatorSignalPageVersion(
      'creator-signal.site/page/waitlist',
      retainedCreatorSignalPageHashes050['creator-signal.site/page/waitlist']!,
    )).toBe('0.5.0')
    expect(retainedCreatorSignalTemplates050).toEqual([{
      slug: 'creator-signal-site-template',
      hash: 'f5c3624648b6a2abee2318519ba98ada1edf8d6dab3bdc721a6e7a0ce50f1767',
    }])
    expect(retainedCreatorSignalNotFoundTemplates050).toEqual([{
      slug: 'creator-signal-not-found',
      hash: 'a33bf95e80ba899965b419913adc057ec7f0e929a1f262b2a35acd71f7fe54fb',
    }])
    expect(Object.keys(retainedCreatorSignalPageHashes060)).toHaveLength(26)
    expect(retainedCreatorSignalPageVersion(
      'creator-signal.site/page/feedback',
      retainedCreatorSignalPageHashes060['creator-signal.site/page/feedback']!,
    )).toBe('0.6.0')
    expect(retainedCreatorSignalPageVersion(
      'creator-signal.site/page/early-access',
      retainedCreatorSignalPageHashes060['creator-signal.site/page/early-access']!,
    )).toBe('0.6.0')
    expect(retainedCreatorSignalTemplates060).toEqual([{
      slug: 'creator-signal-site-template',
      hash: 'f5c3624648b6a2abee2318519ba98ada1edf8d6dab3bdc721a6e7a0ce50f1767',
    }])
    expect(retainedCreatorSignalNotFoundTemplates060).toEqual([{
      slug: 'creator-signal-not-found',
      hash: 'a33bf95e80ba899965b419913adc057ec7f0e929a1f262b2a35acd71f7fe54fb',
    }])
  })

  it('classifies identical page content independently of generated node IDs', () => {
    const cells = {
      title: 'Stable page',
      slug: 'stable-page',
      body: {
        rootNodeId: 'random-root-a',
        nodes: {
          'random-root-a': {
            id: 'random-root-a', moduleId: 'base.body', props: {}, breakpointOverrides: {},
            children: ['random-child-a'], parentId: null, classIds: [],
          },
          'random-child-a': {
            id: 'random-child-a', moduleId: 'base.text', props: { text: 'Same content' },
            breakpointOverrides: {}, children: [], parentId: 'random-root-a', classIds: [],
            catalogueInstance: {
              entryId: 'creator-signal.site.rich-text-section', entryVersion: '1.0.0',
              variantId: 'default',
            },
          },
        },
      },
    }
    const reidentified = {
      ...cells,
      body: {
        rootNodeId: 'other-root',
        nodes: {
          'other-root': { ...cells.body.nodes['random-root-a'], id: 'other-root', children: ['other-child'] },
          'other-child': {
            ...cells.body.nodes['random-child-a'],
            id: 'other-child',
            parentId: 'other-root',
            props: { ...cells.body.nodes['random-child-a'].props },
          },
        },
      },
    }

    expect(canonicalPageCellsSha256(cells)).toBe(canonicalPageCellsSha256(reidentified))
    reidentified.body.nodes['other-child']!.props.text = 'Authored change'
    expect(canonicalPageCellsSha256(cells)).not.toBe(canonicalPageCellsSha256(reidentified))
  })

  it('blocks when an additional page would unexpectedly inherit shared chrome', () => {
    const source = legacyManifest()
    source.rows.push({ ...source.rows[0], id: 'custom-page', slug: 'custom-page' })

    const result = prepareCreatorSignalContentMigration(source, timestamp)

    expect(result.report.ready).toBe(false)
    expect(result.report.summary.additionalPages).toBe(1)
    expect(result.report.blockers).toEqual(expect.arrayContaining([
      expect.stringContaining('would inherit the new everywhere template'),
    ]))
  })

  it('uses canonical hashes that ignore object key ordering', () => {
    expect(canonicalSha256({ b: 2, a: { d: 4, c: 3 } })).toBe(
      canonicalSha256({ a: { c: 3, d: 4 }, b: 2 }),
    )
  })
})
