import {
  DEFAULT_SITE_SEARCH_SETTINGS,
  pagePublicPath,
  selectVisualComponentById,
  type BaseNode,
  type Page,
  type SiteDocument,
  type SiteSearchSettings,
} from '@core/page-tree'
import type {
  SearchDocument,
  SearchIndexHealth,
  SearchIndexStatus,
  SearchQuery,
  SearchResponse,
  SearchResult,
} from './schemas'

interface IndexedDocument {
  document: SearchDocument
  normalizedTitle: string
  normalizedBody: string
  titleTokens: Map<string, number>
  bodyTokens: Map<string, number>
}

interface SiteSearchIndex {
  siteId: string
  health: SearchIndexHealth
  generation: number
  documents: IndexedDocument[]
  indexedAt: number
  fingerprint: string
  message?: string
}

const INDEXED_PROP_KEYS = new Set([
  'text',
  'title',
  'label',
  'summary',
  'items',
  'html',
  'fallbackText',
])

const snapshotFingerprints = new WeakMap<SiteDocument, string>()

export function resolveSiteSearchSettings(
  site: Pick<SiteDocument, 'settings'>,
): SiteSearchSettings | null {
  const settings = site.settings.search
  if (!settings?.enabled) return null
  if (
    settings.minQueryLength > settings.maxQueryLength ||
    !/^[A-Za-z][A-Za-z0-9_-]*$/.test(settings.queryParam)
  ) {
    return null
  }
  return settings
}

/**
 * Catalogue dependency health is intentionally derived only from persisted,
 * non-secret site configuration and eligible draft structure. Runtime index
 * generation lives server-side and cannot leak operational state into the
 * browser bundle.
 */
export function searchCapabilityHealth(
  site: SiteDocument | null | undefined,
): 'available' | 'degraded' | 'unavailable' {
  if (!site || !resolveSiteSearchSettings(site)) return 'unavailable'
  return buildSearchDocuments(site).length > 0 ? 'available' : 'degraded'
}

export class SearchIndexService {
  private readonly indexes = new Map<string, SiteSearchIndex>()

  reindex(site: SiteDocument, now: number = Date.now()): SearchIndexStatus {
    const settings = resolveSiteSearchSettings(site)
    if (!settings) {
      this.indexes.delete(site.id)
      return unavailableStatus(site.id)
    }

    const documents = buildSearchDocuments(site)
    const fingerprint = searchSnapshotFingerprint(site, documents)
    const current = this.indexes.get(site.id)
    const health: SearchIndexHealth =
      documents.length > 0 ? 'available' : 'degraded'
    const index: SiteSearchIndex = {
      siteId: site.id,
      health,
      generation: (current?.generation ?? 0) + 1,
      documents: documents.map(indexDocument),
      indexedAt: now,
      fingerprint,
      ...(health === 'degraded'
        ? { message: 'No eligible published pages are available to search.' }
        : {}),
    }
    this.indexes.set(site.id, index)
    return presentStatus(index)
  }

  ensure(site: SiteDocument, now: number = Date.now()): SearchIndexStatus {
    const settings = resolveSiteSearchSettings(site)
    if (!settings) {
      this.indexes.delete(site.id)
      return unavailableStatus(site.id)
    }
    const current = this.indexes.get(site.id)
    const fingerprint = searchSnapshotFingerprint(site)
    if (
      !current ||
      current.health === 'stale' ||
      current.fingerprint !== fingerprint
    ) {
      return this.reindex(site, now)
    }
    return presentStatus(current)
  }

  markStale(siteId: string): SearchIndexStatus {
    const current = this.indexes.get(siteId)
    if (!current) return unavailableStatus(siteId)
    current.health = 'stale'
    current.message = 'The search index is stale and will refresh on the next request.'
    return presentStatus(current)
  }

  remove(siteId: string): void {
    this.indexes.delete(siteId)
  }

  status(siteId: string): SearchIndexStatus {
    const current = this.indexes.get(siteId)
    return current ? presentStatus(current) : unavailableStatus(siteId)
  }

  query(site: SiteDocument, input: SearchQuery): SearchResponse {
    const settings = resolveSiteSearchSettings(site)
    if (!settings) {
      return {
        results: [],
        totalResults: 0,
        health: 'unavailable',
        message: 'Search is not available.',
      }
    }

    const status = this.ensure(site)
    const index = this.indexes.get(site.id)
    if (!index || status.health === 'unavailable') {
      return {
        results: [],
        totalResults: 0,
        health: 'unavailable',
        message: 'Search is not available.',
      }
    }

    const normalizedQuery = normalizeSearchText(
      input.query.slice(0, settings.maxQueryLength),
    )
    if (normalizedQuery.length < settings.minQueryLength) {
      return {
        results: [],
        totalResults: 0,
        health: index.health,
        ...(index.message ? { message: index.message } : {}),
      }
    }
    const terms = uniqueTokens(normalizedQuery)
    if (terms.length === 0) {
      return { results: [], totalResults: 0, health: index.health }
    }

    const matches = index.documents.flatMap((candidate): SearchResult[] => {
      if (
        input.pathPrefix &&
        !candidate.document.permalink.startsWith(input.pathPrefix)
      ) {
        return []
      }
      if (!terms.every((term) =>
        candidate.titleTokens.has(term) || candidate.bodyTokens.has(term),
      )) {
        return []
      }
      const score = rankDocument(candidate, normalizedQuery, terms)
      return [{
        id: candidate.document.id,
        pageId: candidate.document.pageId,
        title: candidate.document.title,
        permalink: candidate.document.permalink,
        excerpt: buildExcerpt(candidate.document.body, terms),
        score,
      }]
    })

    matches.sort((a, b) => compareResults(a, b, input))
    const boundedMatches = matches.slice(0, settings.maxResults)
    const resultLimit = Math.min(input.limit, settings.maxResults)
    return {
      results: boundedMatches.slice(input.offset, input.offset + resultLimit),
      totalResults: boundedMatches.length,
      health: index.health,
      ...(index.message ? { message: index.message } : {}),
    }
  }
}

export const searchIndexService = new SearchIndexService()

export function buildSearchDocuments(site: SiteDocument): SearchDocument[] {
  return site.pages.flatMap((page): SearchDocument[] => {
    if (page.template?.enabled) return []
    const root = page.nodes[page.rootNodeId]
    if (!root || root.hidden) return []
    const body = collectPageSearchText(page, site)
    return [{
      id: `page:${page.id}`,
      pageId: page.id,
      title: cleanText(page.title),
      permalink: pagePublicPath(page.slug),
      body,
    }]
  })
}

function collectPageSearchText(page: Page, site: SiteDocument): string {
  const values: string[] = []
  const visit = (
    nodes: Record<string, BaseNode>,
    nodeId: string,
    seenComponents: ReadonlySet<string>,
  ): void => {
    const node = nodes[nodeId]
    if (!node || node.hidden) return
    for (const [key, value] of Object.entries(node.props)) {
      if (INDEXED_PROP_KEYS.has(key)) collectVisibleValue(value, values)
    }
    if (node.moduleId === 'base.visual-component-ref') {
      const componentId =
        typeof node.props.componentId === 'string'
          ? node.props.componentId.trim()
          : ''
      if (componentId && !seenComponents.has(componentId)) {
        const component = selectVisualComponentById(site, componentId)
        if (component) {
          visit(
            component.tree.nodes,
            component.tree.rootNodeId,
            new Set(seenComponents).add(componentId),
          )
        }
      }
    }
    for (const childId of node.children) visit(nodes, childId, seenComponents)
  }
  visit(page.nodes, page.rootNodeId, new Set())
  return cleanText(values.join(' '))
}

function collectVisibleValue(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    out.push(value)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectVisibleValue(item, out)
    return
  }
  if (!value || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  for (const key of ['text', 'title', 'label', 'value']) {
    if (typeof record[key] === 'string') out.push(record[key])
  }
}

function cleanText(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:x27|39);/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeSearchText(value: string): string {
  return cleanText(value)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function tokens(value: string): string[] {
  return normalizeSearchText(value).split(' ').filter(Boolean)
}

function uniqueTokens(value: string): string[] {
  return [...new Set(value.split(' ').filter(Boolean))]
}

function frequencies(values: string[]): Map<string, number> {
  const result = new Map<string, number>()
  for (const value of values) result.set(value, (result.get(value) ?? 0) + 1)
  return result
}

function indexDocument(document: SearchDocument): IndexedDocument {
  const normalizedTitle = normalizeSearchText(document.title)
  const normalizedBody = normalizeSearchText(document.body)
  return {
    document,
    normalizedTitle,
    normalizedBody,
    titleTokens: frequencies(tokens(document.title)),
    bodyTokens: frequencies(tokens(document.body)),
  }
}

function rankDocument(
  candidate: IndexedDocument,
  phrase: string,
  terms: readonly string[],
): number {
  let score = 0
  if (candidate.normalizedTitle === phrase) score += 100
  else if (candidate.normalizedTitle.includes(phrase)) score += 40
  if (candidate.normalizedBody.includes(phrase)) score += 12
  for (const term of terms) {
    score += (candidate.titleTokens.get(term) ?? 0) * 10
    score += Math.min(candidate.bodyTokens.get(term) ?? 0, 5) * 2
  }
  return score
}

function compareResults(a: SearchResult, b: SearchResult, input: SearchQuery): number {
  if (input.orderBy === 'title') {
    const compared = a.title.localeCompare(b.title)
    if (compared !== 0) return input.direction === 'asc' ? compared : -compared
  } else if (a.score !== b.score) {
    return input.direction === 'asc' ? a.score - b.score : b.score - a.score
  }
  const title = a.title.localeCompare(b.title)
  return title !== 0 ? title : a.id.localeCompare(b.id)
}

function buildExcerpt(body: string, terms: readonly string[]): string {
  if (!body) return ''
  const normalized = normalizeSearchText(body)
  const firstMatch = terms.reduce((best, term) => {
    const index = normalized.indexOf(term)
    return index >= 0 && (best < 0 || index < best) ? index : best
  }, -1)
  const start = Math.max(0, firstMatch - 60)
  const excerpt = body.slice(start, start + 180).trim()
  return `${start > 0 ? '…' : ''}${excerpt}${start + 180 < body.length ? '…' : ''}`
}

function searchSnapshotFingerprint(
  site: SiteDocument,
  suppliedDocuments?: SearchDocument[],
): string {
  const cached = snapshotFingerprints.get(site)
  if (cached && !suppliedDocuments) return cached
  const documents = suppliedDocuments ?? buildSearchDocuments(site)
  const source = JSON.stringify({
    config: site.settings.search ?? DEFAULT_SITE_SEARCH_SETTINGS,
    documents,
  })
  let hash = 0x811c9dc5
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  const fingerprint = (hash >>> 0).toString(16).padStart(8, '0')
  snapshotFingerprints.set(site, fingerprint)
  return fingerprint
}

function presentStatus(index: SiteSearchIndex): SearchIndexStatus {
  return {
    siteId: index.siteId,
    health: index.health,
    generation: index.generation,
    documentCount: index.documents.length,
    indexedAt: index.indexedAt,
    fingerprint: index.fingerprint,
    ...(index.message ? { message: index.message } : {}),
  }
}

function unavailableStatus(siteId: string): SearchIndexStatus {
  return {
    siteId,
    health: 'unavailable',
    generation: 0,
    documentCount: 0,
    indexedAt: null,
    fingerprint: null,
    message: 'Search is not configured.',
  }
}
