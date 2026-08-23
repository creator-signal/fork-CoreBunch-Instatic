import type { DataRow, DataTable } from '@core/data/schemas'
import type { SiteBundleArchiveManifest } from '@core/data/bundleArchive'
import { pageToCells } from '@core/data/pageFromRow'
import { legacyCreatorSignalPageHashes0111 } from '../legacy-0.1.11-hashes'
import {
  retainedCreatorSignalPageHashes0200To0206,
  retainedCreatorSignalTemplates0200To0206,
} from '../retained-0.2.x-hashes'
import {
  retainedCreatorSignalNotFoundTemplates035,
  retainedCreatorSignalPageHashes035,
  retainedCreatorSignalTemplates035,
} from '../retained-0.3.5-hashes'
import {
  retainedCreatorSignalNotFoundTemplates040,
  retainedCreatorSignalPageHashes040,
  retainedCreatorSignalTemplates040,
} from '../retained-0.4.0-hashes'
import {
  retainedCreatorSignalNotFoundTemplates050,
  retainedCreatorSignalPageHashes050,
  retainedCreatorSignalTemplates050,
} from '../retained-0.5.0-hashes'
import {
  retainedCreatorSignalNotFoundTemplates060,
  retainedCreatorSignalPageHashes060,
  retainedCreatorSignalTemplates060,
} from '../retained-0.6.0-hashes'
import { pack } from '../../pack/site'
import {
  canonicalPageCellsSha256,
  canonicalSha256,
} from '../content-hash'

export { canonicalPageCellsSha256, canonicalSha256 } from '../content-hash'

export const CREATOR_SIGNAL_CONTENT_MIGRATION = 'creator-signal.site/content/0.2.0'

export type PageMigrationState =
  | 'legacy-eligible'
  | 'already-current'
  | 'authored-content'
  | 'missing'
  | 'page-add'
  | 'template-add'
  | 'template-current'
  | 'template-repair'
  | 'template-conflict'
  | 'additional-page'

export interface PageMigrationPreview {
  id: string
  slug: string
  state: PageMigrationState
  currentHash?: string
  legacyHash?: string
  retainedVersion?: string
  targetHash?: string
}

export interface CreatorSignalMigrationReport {
  schema: 'creator-signal.site/content-migration-report/v1'
  migration: typeof CREATOR_SIGNAL_CONTENT_MIGRATION
  ready: boolean
  pages: PageMigrationPreview[]
  blockers: string[]
  summary: {
    legacyEligible: number
    alreadyCurrent: number
    authoredContent: number
    missing: number
    newPages: number
    additionalPages: number
    template: 'add' | 'current' | 'repair' | 'conflict'
    notFoundTemplate: 'add' | 'current' | 'repair' | 'conflict'
    rowsInMigration: number
  }
  apply: {
    strategy: 'merge-overwrite'
    publishesAutomatically: false
    instruction: string
  }
  rollback: {
    archiveStrategy: 'replace'
    instruction: string
  }
}

export interface PreparedCreatorSignalMigration {
  report: CreatorSignalMigrationReport
  manifest: SiteBundleArchiveManifest | null
}

function pageTableWithSeo(table: DataTable): DataTable {
  if (table.fields.some((field) => field.id === 'seo')) return table
  return {
    ...table,
    fields: [
      ...table.fields,
      { type: 'longText', id: 'seo', label: 'SEO metadata', builtIn: true },
    ],
  }
}

function newPageRow(page: (typeof pack.pages)[number], now: string): DataRow {
  return {
    id: page.id,
    tableId: 'pages',
    cells: pageToCells(page),
    slug: page.slug,
    status: 'draft',
    seq: 0,
    authorUserId: null,
    createdByUserId: null,
    updatedByUserId: null,
    publishedByUserId: null,
    author: null,
    createdBy: null,
    updatedBy: null,
    publishedBy: null,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    scheduledPublishAt: null,
    deletedAt: null,
  }
}

const retainedPageHashSets = [
  { version: '0.1.11', hashes: legacyCreatorSignalPageHashes0111 },
  { version: '0.2.0-0.2.6', hashes: retainedCreatorSignalPageHashes0200To0206 },
  { version: '0.3.5', hashes: retainedCreatorSignalPageHashes035 },
  { version: '0.4.0', hashes: retainedCreatorSignalPageHashes040 },
  { version: '0.5.0', hashes: retainedCreatorSignalPageHashes050 },
  { version: '0.6.0', hashes: retainedCreatorSignalPageHashes060 },
] as const

export function retainedCreatorSignalPageVersion(
  pageId: string,
  hash: string,
): string | null {
  return retainedPageHashSets.find((candidate) => candidate.hashes[pageId] === hash)?.version ?? null
}

export function prepareCreatorSignalContentMigration(
  source: SiteBundleArchiveManifest,
  now = new Date().toISOString(),
): PreparedCreatorSignalMigration {
  const pageTable = source.tables.find((table) => table.id === 'pages')
  if (!pageTable) {
    const report = blockedReport('The export does not contain the pages table.')
    return { report, manifest: null }
  }

  const sourceRows = source.rows.filter((row) => row.tableId === 'pages')
  const rowById = new Map(sourceRows.map((row) => [row.id, row]))
  const currentPages = pack.pages.filter((page) => !page.template)
  const knownIds = new Set(currentPages.map((page) => page.id))
  const template = pack.pages.find((page) => page.template?.target.kind === 'everywhere')
  const notFoundTemplate = pack.pages.find((page) => page.template?.target.kind === 'notFound')
  if (!template) throw new Error('[creator-signal migration] Current pack has no site template.')
  if (!notFoundTemplate) throw new Error('[creator-signal migration] Current pack has no not-found template.')
  // 0.0.29 emitted this exact template with an underscore-prefixed slug that
  // the page persistence contract rejects. Recognise only that exact faulty
  // template so an attempted 0.0.29 migration can be repaired without treating
  // authored template content as disposable.
  const invalid029TemplateSlug = '_templates/creator-signal-site'
  const invalidCurrentTemplateHash = canonicalPageCellsSha256(pageToCells({
    ...template,
    slug: invalid029TemplateSlug,
  }))
  knownIds.add(template.id)
  knownIds.add(notFoundTemplate.id)

  const previews: PageMigrationPreview[] = []
  const migrationRows: DataRow[] = []
  const blockers: string[] = []

  for (const target of currentPages) {
    const row = rowById.get(target.id)
    const legacyHash = legacyCreatorSignalPageHashes0111[target.id]
    // A page absent from the original retained starter is additive. Later
    // retained versions may contain it, but that must not turn an older,
    // otherwise exact starter export into a destructive "missing" blocker.
    const isNewPage = !legacyCreatorSignalPageHashes0111[target.id]
    const targetHash = canonicalPageCellsSha256(pageToCells(target))
    if (!row) {
      if (isNewPage) {
        previews.push({ id: target.id, slug: target.slug, state: 'page-add', targetHash })
        migrationRows.push(newPageRow(target, now))
        continue
      }
      previews.push({ id: target.id, slug: target.slug, state: 'missing', legacyHash, targetHash })
      blockers.push(`Required page "${target.slug}" is missing.`)
      continue
    }

    const currentHash = canonicalPageCellsSha256(row.cells)
    const currentRawHash = canonicalSha256(row.cells)
    const retainedVersion = retainedCreatorSignalPageVersion(target.id, currentHash)
      ?? retainedCreatorSignalPageVersion(target.id, currentRawHash)
    if (currentHash === targetHash) {
      previews.push({ id: target.id, slug: target.slug, state: 'already-current', currentHash, legacyHash, targetHash })
    } else if (retainedVersion) {
      previews.push({
        id: target.id,
        slug: target.slug,
        state: 'legacy-eligible',
        currentHash,
        legacyHash,
        retainedVersion,
        targetHash,
      })
      migrationRows.push({
        ...row,
        cells: pageToCells(target),
        slug: target.slug,
        updatedAt: now,
        updatedByUserId: null,
        updatedBy: null,
      })
    } else {
      previews.push({ id: target.id, slug: target.slug, state: 'authored-content', currentHash, legacyHash, targetHash })
      blockers.push(`Page "${target.slug}" differs from every recognised retained starter and the current target; it requires manual mapping.`)
    }
  }

  for (const row of sourceRows) {
    if (knownIds.has(row.id)) continue
    previews.push({
      id: row.id,
      slug: row.slug,
      state: 'additional-page',
      currentHash: canonicalPageCellsSha256(row.cells),
    })
    blockers.push(`Additional page "${row.slug}" would inherit the new everywhere template; review it manually.`)
  }

  const templateRow = rowById.get(template.id)
  let templateState: CreatorSignalMigrationReport['summary']['template']
  if (!templateRow) {
    templateState = 'add'
    previews.push({
      id: template.id,
      slug: template.slug,
      state: 'template-add',
      targetHash: canonicalPageCellsSha256(pageToCells(template)),
    })
    migrationRows.push(newPageRow(template, now))
  } else {
    const currentHash = canonicalPageCellsSha256(templateRow.cells)
    const currentRawHash = canonicalSha256(templateRow.cells)
    const targetHash = canonicalPageCellsSha256(pageToCells(template))
    if (currentHash === targetHash) {
      templateState = 'current'
      previews.push({ id: template.id, slug: template.slug, state: 'template-current', currentHash, targetHash })
    } else if (
      (currentHash === invalidCurrentTemplateHash && templateRow.slug === invalid029TemplateSlug)
      || retainedCreatorSignalTemplates0200To0206.some((candidate) =>
        (candidate.hash === currentHash || candidate.hash === currentRawHash) && candidate.slug === templateRow.slug)
      || retainedCreatorSignalTemplates035.some((candidate) =>
        candidate.hash === currentHash && candidate.slug === templateRow.slug)
      || retainedCreatorSignalTemplates040.some((candidate) =>
        candidate.hash === currentHash && candidate.slug === templateRow.slug)
      || retainedCreatorSignalTemplates050.some((candidate) =>
        candidate.hash === currentHash && candidate.slug === templateRow.slug)
      || retainedCreatorSignalTemplates060.some((candidate) =>
        candidate.hash === currentHash && candidate.slug === templateRow.slug)
    ) {
      templateState = 'repair'
      previews.push({ id: template.id, slug: template.slug, state: 'template-repair', currentHash, targetHash })
      migrationRows.push({
        ...templateRow,
        cells: pageToCells(template),
        slug: template.slug,
        updatedAt: now,
        updatedByUserId: null,
        updatedBy: null,
      })
    } else {
      templateState = 'conflict'
      previews.push({ id: template.id, slug: template.slug, state: 'template-conflict', currentHash, targetHash })
      blockers.push('The Creator Signal site-template ID already contains different authored content.')
    }
  }

  const notFoundTemplateRow = rowById.get(notFoundTemplate.id)
  let notFoundTemplateState: CreatorSignalMigrationReport['summary']['notFoundTemplate']
  if (!notFoundTemplateRow) {
    notFoundTemplateState = 'add'
    previews.push({
      id: notFoundTemplate.id,
      slug: notFoundTemplate.slug,
      state: 'template-add',
      targetHash: canonicalPageCellsSha256(pageToCells(notFoundTemplate)),
    })
    migrationRows.push(newPageRow(notFoundTemplate, now))
  } else {
    const currentHash = canonicalPageCellsSha256(notFoundTemplateRow.cells)
    const targetHash = canonicalPageCellsSha256(pageToCells(notFoundTemplate))
    if (currentHash === targetHash) {
      notFoundTemplateState = 'current'
      previews.push({
        id: notFoundTemplate.id,
        slug: notFoundTemplate.slug,
        state: 'template-current',
        currentHash,
        targetHash,
      })
    } else if (
      retainedCreatorSignalNotFoundTemplates035.some((candidate) =>
        candidate.hash === currentHash && candidate.slug === notFoundTemplateRow.slug)
      || retainedCreatorSignalNotFoundTemplates040.some((candidate) =>
        candidate.hash === currentHash && candidate.slug === notFoundTemplateRow.slug)
      || retainedCreatorSignalNotFoundTemplates050.some((candidate) =>
        candidate.hash === currentHash && candidate.slug === notFoundTemplateRow.slug)
      || retainedCreatorSignalNotFoundTemplates060.some((candidate) =>
        candidate.hash === currentHash && candidate.slug === notFoundTemplateRow.slug)
    ) {
      notFoundTemplateState = 'repair'
      previews.push({
        id: notFoundTemplate.id,
        slug: notFoundTemplate.slug,
        state: 'template-repair',
        currentHash,
        targetHash,
      })
      migrationRows.push({
        ...notFoundTemplateRow,
        cells: pageToCells(notFoundTemplate),
        slug: notFoundTemplate.slug,
        updatedAt: now,
        updatedByUserId: null,
        updatedBy: null,
      })
    } else {
      notFoundTemplateState = 'conflict'
      previews.push({
        id: notFoundTemplate.id,
        slug: notFoundTemplate.slug,
        state: 'template-conflict',
        currentHash,
        targetHash,
      })
      blockers.push('The Creator Signal not-found template ID already contains different authored content.')
    }
  }

  const ready = blockers.length === 0
  const report: CreatorSignalMigrationReport = {
    schema: 'creator-signal.site/content-migration-report/v1',
    migration: CREATOR_SIGNAL_CONTENT_MIGRATION,
    ready,
    pages: previews,
    blockers,
    summary: {
      legacyEligible: previews.filter((page) => page.state === 'legacy-eligible').length,
      alreadyCurrent: previews.filter((page) => page.state === 'already-current').length,
      authoredContent: previews.filter((page) => page.state === 'authored-content').length,
      missing: previews.filter((page) => page.state === 'missing').length,
      newPages: previews.filter((page) => page.state === 'page-add').length,
      additionalPages: previews.filter((page) => page.state === 'additional-page').length,
      template: templateState,
      notFoundTemplate: notFoundTemplateState,
      rowsInMigration: ready ? migrationRows.length : 0,
    },
    apply: {
      strategy: 'merge-overwrite',
      publishesAutomatically: false,
      instruction: 'Review the report, import the migration archive with merge-overwrite, then preview and publish deliberately.',
    },
    rollback: {
      archiveStrategy: 'replace',
      instruction: 'Use the untouched backup archive with replace only after reviewing its built-in import preview and step-up gate.',
    },
  }

  if (!ready) return { report, manifest: null }
  return {
    report,
    manifest: {
      schemaVersion: 1,
      exportedAt: now,
      ...(source.sourceSiteName ? { sourceSiteName: source.sourceSiteName } : {}),
      tables: [pageTableWithSeo(pageTable)],
      rows: migrationRows,
    },
  }
}

function blockedReport(blocker: string): CreatorSignalMigrationReport {
  return {
    schema: 'creator-signal.site/content-migration-report/v1',
    migration: CREATOR_SIGNAL_CONTENT_MIGRATION,
    ready: false,
    pages: [],
    blockers: [blocker],
    summary: {
      legacyEligible: 0,
      alreadyCurrent: 0,
      authoredContent: 0,
      missing: 0,
      newPages: 0,
      additionalPages: 0,
      template: 'conflict',
      notFoundTemplate: 'conflict',
      rowsInMigration: 0,
    },
    apply: {
      strategy: 'merge-overwrite',
      publishesAutomatically: false,
      instruction: 'No migration archive can be created until the blocker is resolved.',
    },
    rollback: {
      archiveStrategy: 'replace',
      instruction: 'No live content was changed.',
    },
  }
}
