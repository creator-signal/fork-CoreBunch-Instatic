import { Type, type Static } from '@core/utils/typeboxHelpers'

export const SearchDocumentSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    pageId: Type.String({ minLength: 1 }),
    title: Type.String(),
    permalink: Type.String({ pattern: '^/' }),
    body: Type.String(),
  },
  { additionalProperties: false },
)

export type SearchDocument = Static<typeof SearchDocumentSchema>

export const SearchIndexHealthSchema = Type.Union([
  Type.Literal('available'),
  Type.Literal('degraded'),
  Type.Literal('unavailable'),
  Type.Literal('stale'),
])

export type SearchIndexHealth = Static<typeof SearchIndexHealthSchema>

export const SearchIndexStatusSchema = Type.Object(
  {
    siteId: Type.String(),
    health: SearchIndexHealthSchema,
    generation: Type.Integer({ minimum: 0 }),
    documentCount: Type.Integer({ minimum: 0 }),
    indexedAt: Type.Union([Type.Number(), Type.Null()]),
    fingerprint: Type.Union([Type.String(), Type.Null()]),
    message: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
)

export type SearchIndexStatus = Static<typeof SearchIndexStatusSchema>

export const SearchQuerySchema = Type.Object(
  {
    query: Type.String(),
    pathPrefix: Type.Optional(Type.String({ pattern: '^/' })),
    orderBy: Type.Union([
      Type.Literal('relevance'),
      Type.Literal('title'),
    ]),
    direction: Type.Union([Type.Literal('asc'), Type.Literal('desc')]),
    limit: Type.Integer({ minimum: 1, maximum: 200 }),
    offset: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
)

export type SearchQuery = Static<typeof SearchQuerySchema>

export const SearchResultSchema = Type.Object(
  {
    id: Type.String(),
    pageId: Type.String(),
    title: Type.String(),
    permalink: Type.String({ pattern: '^/' }),
    excerpt: Type.String(),
    score: Type.Number(),
  },
  { additionalProperties: false },
)

export type SearchResult = Static<typeof SearchResultSchema>

export const SearchResponseSchema = Type.Object(
  {
    results: Type.Array(SearchResultSchema),
    totalResults: Type.Integer({ minimum: 0 }),
    health: SearchIndexHealthSchema,
    message: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
)

export type SearchResponse = Static<typeof SearchResponseSchema>
