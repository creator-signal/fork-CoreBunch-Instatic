import { Type, Value, type Static } from '@core/utils/typeboxHelpers'
import { LoopItemSchema, type LoopItem } from '@core/loops/types'

export const CollectionSortSchema = Type.Object({
  field: Type.String({ minLength: 1 }),
  direction: Type.Union([Type.Literal('asc'), Type.Literal('desc')]),
})

export const CollectionSourceSchema = Type.Union([
  Type.Object({
    mode: Type.Literal('manual'),
    items: Type.Array(LoopItemSchema),
  }),
  Type.Object({
    mode: Type.Literal('dynamic'),
    sourceId: Type.String({ minLength: 1 }),
    filters: Type.Record(Type.String(), Type.Unknown(), { default: {} }),
    query: Type.String({ default: '' }),
    sort: Type.Array(CollectionSortSchema, { default: [] }),
  }),
])

export const CollectionPaginationModeSchema = Type.Union([
  Type.Literal('none'),
  Type.Literal('numbered'),
  Type.Literal('previous-next'),
  Type.Literal('load-more'),
  Type.Literal('cursor'),
])

export const CollectionPaginationSchema = Type.Object({
  mode: CollectionPaginationModeSchema,
  pageSize: Type.Number({ minimum: 1, maximum: 200, default: 10 }),
})

export const CollectionContractSchema = Type.Object({
  source: CollectionSourceSchema,
  pagination: CollectionPaginationSchema,
})

export type CollectionSort = Static<typeof CollectionSortSchema>
export type CollectionSource = Static<typeof CollectionSourceSchema>
export type CollectionPaginationMode =
  Static<typeof CollectionPaginationModeSchema>
export type CollectionPagination = Static<typeof CollectionPaginationSchema>
export type CollectionContract = Static<typeof CollectionContractSchema>

export interface CollectionPageRequest {
  mode: CollectionPaginationMode
  pageSize: number
  pageNumber: number
  cursor?: string
}

export interface CollectionPageResult<TItem = LoopItem> {
  items: TItem[]
  totalItems: number
  nextCursor?: string
  previousCursor?: string
}

export interface CollectionPageInfo {
  pageNumber: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
  nextCursor?: string
  previousCursor?: string
}

export type CollectionLoadState<TItem = LoopItem> =
  | { status: 'loading'; items: TItem[]; announcement: string }
  | { status: 'empty'; items: []; announcement: string }
  | {
      status: 'error'
      items: TItem[]
      message: string
      announcement: string
    }
  | {
      status: 'populated'
      items: TItem[]
      pageInfo: CollectionPageInfo
      announcement: string
    }

const DEFAULT_PAGINATION: CollectionPagination = Value.Create(
  CollectionPaginationSchema,
)

export function normalizeCollectionPaginationMode(
  value: unknown,
): CollectionPaginationMode {
  switch (value) {
    case 'numbered':
    case 'previous-next':
    case 'load-more':
    case 'cursor':
      return value
    // Compatibility with the original base.loop property. It remains
    // readable while new writes use the shared contract's `load-more` name.
    case 'infinite':
      return 'load-more'
    default:
      return 'none'
  }
}

export function normalizeCollectionPagination(
  value: unknown,
): CollectionPagination {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_PAGINATION
  }
  const candidate = value as Record<string, unknown>
  return {
    mode: normalizeCollectionPaginationMode(candidate.mode),
    pageSize: clampInteger(candidate.pageSize, 1, 200, 10),
  }
}

export function normalizeCollectionSource(value: unknown): CollectionSource {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { mode: 'manual', items: [] }
  }
  const candidate = value as Record<string, unknown>
  if (candidate.mode === 'dynamic' && typeof candidate.sourceId === 'string') {
    const filters =
      candidate.filters &&
      typeof candidate.filters === 'object' &&
      !Array.isArray(candidate.filters)
        ? candidate.filters as Record<string, unknown>
        : {}
    const sort = Array.isArray(candidate.sort)
      ? candidate.sort.flatMap((item): CollectionSort[] => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return []
          const record = item as Record<string, unknown>
          if (
            typeof record.field !== 'string' ||
            !record.field ||
            (record.direction !== 'asc' && record.direction !== 'desc')
          ) {
            return []
          }
          return [{ field: record.field, direction: record.direction }]
        })
      : []
    return {
      mode: 'dynamic',
      sourceId: candidate.sourceId,
      filters,
      query: typeof candidate.query === 'string' ? candidate.query : '',
      sort,
    }
  }

  return {
    mode: 'manual',
    items: Array.isArray(candidate.items)
      ? candidate.items.flatMap(normalizeLoopItem)
      : [],
  }
}

export function readCollectionPageRequest(
  searchParams: URLSearchParams,
  instanceId: string,
  pagination: CollectionPagination,
  queryNamespace = 'collection',
): CollectionPageRequest {
  const keys = collectionPaginationQueryKeys(instanceId, queryNamespace)
  const pageNumber = readPositiveInteger(searchParams.get(keys.page), 1)
  const cursor = searchParams.get(keys.cursor)
  return {
    mode: pagination.mode,
    pageSize: pagination.pageSize,
    pageNumber:
      pagination.mode === 'numbered' ||
      pagination.mode === 'previous-next' ||
      pagination.mode === 'load-more'
        ? pageNumber
        : 1,
    ...(pagination.mode === 'cursor' && cursor ? { cursor } : {}),
  }
}

export function resolveCollectionPageInfo<TItem>(
  request: CollectionPageRequest,
  result: CollectionPageResult<TItem>,
): CollectionPageInfo {
  const totalItems = clampInteger(result.totalItems, 0, Number.MAX_SAFE_INTEGER, 0)
  const totalPages = Math.max(1, Math.ceil(totalItems / request.pageSize))
  const pageNumber = Math.min(Math.max(1, request.pageNumber), totalPages)
  return {
    pageNumber,
    pageSize: request.pageSize,
    totalItems,
    totalPages,
    hasPrevious:
      request.mode === 'cursor'
        ? Boolean(result.previousCursor)
        : pageNumber > 1,
    hasNext:
      request.mode === 'cursor'
        ? Boolean(result.nextCursor)
        : pageNumber < totalPages,
    ...(result.nextCursor ? { nextCursor: result.nextCursor } : {}),
    ...(result.previousCursor
      ? { previousCursor: result.previousCursor }
      : {}),
  }
}

export function deriveCollectionLoadState<TItem>(
  input: {
    loading?: boolean
    error?: string
    result?: CollectionPageResult<TItem>
  },
  request: CollectionPageRequest,
): CollectionLoadState<TItem> {
  const items = input.result?.items ?? []
  if (input.loading) {
    return {
      status: 'loading',
      items,
      announcement: items.length > 0
        ? `Updating ${items.length} items.`
        : 'Loading items.',
    }
  }
  if (input.error) {
    return {
      status: 'error',
      items,
      message: input.error,
      announcement: `Items could not be loaded. ${input.error}`,
    }
  }
  if (!input.result || items.length === 0) {
    return {
      status: 'empty',
      items: [],
      announcement: 'No items found.',
    }
  }

  const pageInfo = resolveCollectionPageInfo(request, input.result)
  return {
    status: 'populated',
    items,
    pageInfo,
    announcement:
      `Showing ${items.length} item${items.length === 1 ? '' : 's'} ` +
      `on page ${pageInfo.pageNumber} of ${pageInfo.totalPages}.`,
  }
}

export function collectionPaginationQueryKeys(
  instanceId: string,
  namespace = 'collection',
): { page: string; cursor: string } {
  return {
    page: `${namespace}_${instanceId}_page`,
    cursor: `${namespace}_${instanceId}_cursor`,
  }
}

export function collectionPaginationHref(
  currentUrl: URL,
  instanceId: string,
  target: { pageNumber?: number; cursor?: string },
  namespace = 'collection',
): string {
  const next = new URL(currentUrl.toString())
  const keys = collectionPaginationQueryKeys(instanceId, namespace)
  next.searchParams.delete(keys.page)
  next.searchParams.delete(keys.cursor)
  if (target.cursor) {
    next.searchParams.set(keys.cursor, target.cursor)
  } else if (target.pageNumber && target.pageNumber > 1) {
    next.searchParams.set(keys.page, String(Math.floor(target.pageNumber)))
  }
  return `${next.pathname}${next.search}${next.hash}`
}

function normalizeLoopItem(value: unknown): LoopItem[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.id !== 'string' ||
    !candidate.fields ||
    typeof candidate.fields !== 'object' ||
    Array.isArray(candidate.fields)
  ) {
    return []
  }
  return [{
    id: candidate.id,
    fields: candidate.fields as Record<string, unknown>,
  }]
}

function readPositiveInteger(value: string | null, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function clampInteger(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.floor(value)))
}
