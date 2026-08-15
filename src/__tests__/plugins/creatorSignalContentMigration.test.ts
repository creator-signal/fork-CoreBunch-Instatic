import { describe, expect, it } from 'bun:test'
import '@modules/base'
import type { SiteBundleArchiveManifest } from '@core/data/bundleArchive'
import type { DataRow, DataTable } from '@core/data/schemas'
import { pageToCells } from '@core/data/pageFromRow'
import { legacyCreatorSignalPageHashes0111 } from '../../../integrations/creator-signal/migrations/legacy-0.1.11-hashes'
import { legacyCreatorSignalPages0111 } from '../../../integrations/creator-signal/migrations/legacy-0.1.11'
import {
  canonicalSha256,
  prepareCreatorSignalContentMigration,
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
      additionalPages: 0,
      template: 'add',
      rowsInMigration: 24,
    })
    expect(result.report.apply).toMatchObject({
      strategy: 'merge-overwrite',
      publishesAutomatically: false,
    })
    expect(result.manifest?.site).toBeUndefined()
    expect(result.manifest?.media).toBeUndefined()
    expect(result.manifest?.rows).toHaveLength(24)
    expect(result.manifest?.tables[0].fields.some((field) => field.id === 'seo')).toBe(true)

    const templateRow = result.manifest?.rows.find((row) =>
      row.id === 'creator-signal.site/page/site-template')
    expect(templateRow?.status).toBe('draft')
    expect(templateRow?.cells.templateEnabled).toBe(true)
    expect(templateRow?.slug).toBe('creator-signal-site-template')

    const home = result.manifest?.rows.find((row) =>
      row.id === 'creator-signal.site/page/home')
    const body = home?.cells.body as { nodes: Record<string, { children: string[]; catalogueInstance?: { entryId: string } }>; rootNodeId: string }
    expect(body.nodes[body.rootNodeId].children).toHaveLength(1)
    const patternNode = body.nodes[body.nodes[body.rootNodeId].children[0]!]
    expect(patternNode.catalogueInstance?.entryId).toBe(
      'creator-signal.site.pattern.product-page',
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
      alreadyCurrent: 23,
      template: 'repair',
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
