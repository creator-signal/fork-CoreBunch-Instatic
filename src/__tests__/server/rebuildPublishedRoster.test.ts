import { afterEach, describe, expect, it } from 'bun:test'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { Page } from '@core/page-tree'
import type { PagePublicationMetadata, PublishedPageSnapshot } from '../../../server/repositories/publish'
import { reconcilePublishedPageRoster, rebuildPublishedSiteArtifacts } from '../../../server/publish/rebuildPublishedSite'
import { getPublishVersion } from '../../../server/publish/publishState'
import { getActiveSlot, prepareInactiveSlot, readArtefact, readStaticAsset, swapSlot, writeArtefact } from '../../../server/publish/staticArtefact'
import { createFakeDb } from './dbTestFake'
import { makePage, makeSite } from '../publisher/helpers'

function page(id: string): Page {
  return { ...makePage({ root: { moduleId: 'base.body', children: ['text'] }, text: { moduleId: 'base.text', props: { text: id, tag: 'p' } } }), id, slug: id }
}

function row(id: string, status: PagePublicationMetadata['status'] = 'published'): PagePublicationMetadata {
  return { id, status, deleted_at: null, active_version_id: `version-${id}` }
}

function snapshot(own: Page, pages: Page[]): PublishedPageSnapshot {
  return { cmsSnapshotVersion: 1, pageRowId: own.id, site: makeSite({ pages }) }
}

describe('technical rebuild publication roster', () => {
  it('omits only proven inactive references, uses each active version and preserves templates and immutable input', () => {
    const first = page('first')
    const oldSecond = page('second')
    const second = { ...oldSecond, title: 'Active version' }
    const template: Page = { ...page('template'), template: { enabled: true, priority: 0, target: { kind: 'everywhere' } } }
    const snapshots = [snapshot(first, [first, oldSecond, template, page('draft'), page('deleted')]), snapshot(second, [first, second, template])]
    const before = structuredClone(snapshots)
    const reconciled = reconcilePublishedPageRoster(snapshots, [row('first'), row('second'), row('draft', 'unpublished'), { ...row('deleted'), deleted_at: '2026-01-01' }])
    expect(reconciled[0].site.pages.map((p) => p.id)).toEqual(['template', 'first', 'second'])
    expect(reconciled[0].site.pages.find((p) => p.id === 'second')?.title).toBe('Active version')
    expect(snapshots).toEqual(before)
  })

  it('rejects missing retained rows rather than assuming deletion', () => {
    const active = page('active')
    expect(() => reconcilePublishedPageRoster([snapshot(active, [active, page('unknown')])], [row('active')])).toThrow('missingRows=1')
  })

  it('uses current published template membership without duplicate page identities', () => {
    const first = page('first')
    const previousTemplate: Page = { ...page('second'), template: { enabled: true, priority: 0, target: { kind: 'everywhere' } } }
    const second = page('second')
    const activeTemplate: Page = { ...page('third'), template: { enabled: true, priority: 0, target: { kind: 'everywhere' } } }
    const snapshots = [snapshot(first, [first, previousTemplate, page('third')]), snapshot(second, [first, second]), snapshot(activeTemplate, [activeTemplate])]
    const reconciled = reconcilePublishedPageRoster(snapshots, [row('first'), row('second'), row('third')])
    for (const result of reconciled) {
      expect(result.site.pages.map((p) => p.id)).toEqual(['first', 'second', 'third'])
      expect(result.site.pages.find((p) => p.id === 'second')?.template).toBeUndefined()
      expect(result.site.pages.find((p) => p.id === 'third')?.template).toEqual(activeTemplate.template)
    }
  })

  it('rejects null or unresolved active published versions even with zero snapshots', () => {
    expect(() => reconcilePublishedPageRoster([], [{ ...row('active'), active_version_id: null }])).toThrow('missingActiveVersions=1')
    expect(() => reconcilePublishedPageRoster([], [row('active')])).toThrow('missingSnapshots=1')
  })

  it('rejects an active snapshot whose own page is absent', () => {
    const active = page('active')
    expect(() => reconcilePublishedPageRoster([snapshot(active, [])], [row('active')])).toThrow('missingSnapshots=1')
  })

  it('accepts no published rows as a no-op without fabricating content', () => {
    expect(reconcilePublishedPageRoster([], [row('draft', 'draft')])).toEqual([])
  })
})

const scratchRoot = join(import.meta.dir, '../../../.tmp/271-roster-tests')
afterEach(async () => { await rm(scratchRoot, { recursive: true, force: true }) })

describe('retained publication rebuild integration', () => {
  it('bakes exact active pages and runtime bytes, removes withdrawn routes only in the new slot', async () => {
    await mkdir(scratchRoot, { recursive: true })
    const uploads = await mkdtemp(join(scratchRoot, 'uploads-'))
    const active = page('active')
    const retained = snapshot(active, [active, page('withdrawn'), page('deleted')])
    const metadata = [row('active'), row('withdrawn', 'unpublished'), { ...row('deleted'), deleted_at: '2026-01-01' }]
    const runtimePath = '/_instatic/assets/v1/entries/retained.js'
    const runtimeBytes = new TextEncoder().encode('window.retained = true;')
    const db = createFakeDb(async (sql) => {
      const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase()
      if (normalized.startsWith('select id, status, deleted_at, active_version_id')) return { rows: metadata, rowCount: metadata.length }
      if (normalized.includes('site_snapshots.site_json')) return { rows: [{ row_id: active.id, site_json: retained.site, runtime_assets_json: null, importmap_body: null, importmap_sha256: null }], rowCount: 1 }
      if (normalized.includes('published_runtime_assets') && normalized.includes('content_bytes')) return { rows: [{ public_path: runtimePath, content_type: 'text/javascript', content_bytes: runtimeBytes }], rowCount: 1 }
      if (/^(insert|update|delete)/.test(normalized) || normalized.includes('cells_json')) throw new Error('Draft content or mutation forbidden')
      return { rows: [], rowCount: 0 }
    })
    const old = await prepareInactiveSlot(uploads)
    await writeArtefact(old.slotDir, '/withdrawn', 'old generation')
    await swapSlot(uploads, old.slot)
    const before = structuredClone(retained)
    const version = getPublishVersion()
    expect(await rebuildPublishedSiteArtifacts(db, uploads)).toEqual({ rebuiltPages: 1 })
    expect(await getActiveSlot(uploads)).not.toBe(old.slot)
    expect(await readArtefact(uploads, '/active')).toContain('active')
    expect(await readArtefact(uploads, '/withdrawn')).toBeNull()
    expect(await readStaticAsset(uploads, runtimePath)).toEqual(runtimeBytes)
    expect(getPublishVersion()).toBe(version + 1)
    expect(retained).toEqual(before)
  })

  it('preserves live slot and cache version when an active version is unavailable', async () => {
    await mkdir(scratchRoot, { recursive: true })
    const uploads = await mkdtemp(join(scratchRoot, 'uploads-'))
    const old = await prepareInactiveSlot(uploads)
    await writeArtefact(old.slotDir, '/active', 'previous published output')
    await swapSlot(uploads, old.slot)
    const db = createFakeDb(async (sql) => sql.includes('active_version_id') && !sql.includes('join')
      ? { rows: [row('active')], rowCount: 1 }
      : { rows: [], rowCount: 0 })
    const version = getPublishVersion()
    await expect(rebuildPublishedSiteArtifacts(db, uploads)).rejects.toThrow('missingSnapshots=1')
    expect(await getActiveSlot(uploads)).toBe(old.slot)
    expect(await readArtefact(uploads, '/active')).toBe('previous published output')
    expect(getPublishVersion()).toBe(version)
  })

  it('preserves live output when a failed artefact write trips the complete-generation gate', async () => {
    await mkdir(scratchRoot, { recursive: true })
    const uploads = await mkdtemp(join(scratchRoot, 'uploads-'))
    const old = await prepareInactiveSlot(uploads)
    await writeArtefact(old.slotDir, '/active', 'previous published output')
    await swapSlot(uploads, old.slot)
    const active = page('active')
    active.slug = '../invalid'
    const retained = snapshot(active, [active])
    const db = createFakeDb(async (sql) => {
      if (sql.includes('select id, status, deleted_at, active_version_id')) return { rows: [row('active')], rowCount: 1 }
      if (sql.includes('site_snapshots.site_json')) return { rows: [{ row_id: active.id, site_json: retained.site, runtime_assets_json: null, importmap_body: null, importmap_sha256: null }], rowCount: 1 }
      return { rows: [], rowCount: 0 }
    })
    const version = getPublishVersion()
    await expect(rebuildPublishedSiteArtifacts(db, uploads)).rejects.toThrow('Refusing incomplete published artefact rebuild')
    expect(await getActiveSlot(uploads)).toBe(old.slot)
    expect(await readArtefact(uploads, '/active')).toBe('previous published output')
    expect(getPublishVersion()).toBe(version)
  })
})
