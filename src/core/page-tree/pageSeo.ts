/**
 * Page-level search and social metadata.
 *
 * Site settings own defaults and the public origin. A page stores only the
 * fields an author intentionally overrides. The publisher is responsible for
 * resolving relative paths against the public origin and for dropping unsafe
 * or incomplete URL values.
 */

import { Type, type Static } from '@core/utils/typeboxHelpers'

export const PageRobotsSchema = Type.Object(
  {
    index: Type.Boolean(),
    follow: Type.Boolean(),
    archive: Type.Boolean(),
  },
  { additionalProperties: false },
)

export const PageLanguageAlternateSchema = Type.Object(
  {
    language: Type.String(),
    url: Type.String(),
  },
  { additionalProperties: false },
)

export const PageOpenGraphSchema = Type.Object(
  {
    title: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    imageUrl: Type.Optional(Type.String()),
    imageAlt: Type.Optional(Type.String()),
    type: Type.Optional(Type.Union([
      Type.Literal('website'),
      Type.Literal('article'),
      Type.Literal('profile'),
    ])),
  },
  { additionalProperties: false },
)

export const PageTwitterSchema = Type.Object(
  {
    card: Type.Optional(Type.Union([
      Type.Literal('summary'),
      Type.Literal('summary_large_image'),
    ])),
    title: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    imageUrl: Type.Optional(Type.String()),
    imageAlt: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
)

export const PageSeoSchema = Type.Object(
  {
    title: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    canonicalUrl: Type.Optional(Type.String()),
    language: Type.Optional(Type.String()),
    robots: Type.Optional(PageRobotsSchema),
    alternates: Type.Optional(Type.Array(PageLanguageAlternateSchema)),
    openGraph: Type.Optional(PageOpenGraphSchema),
    twitter: Type.Optional(PageTwitterSchema),
  },
  { additionalProperties: false },
)

export type PageRobots = Static<typeof PageRobotsSchema>
export type PageLanguageAlternate = Static<typeof PageLanguageAlternateSchema>
export type PageOpenGraph = Static<typeof PageOpenGraphSchema>
export type PageTwitter = Static<typeof PageTwitterSchema>
export type PageSeo = Static<typeof PageSeoSchema>

const OPEN_GRAPH_TYPES = new Set<PageOpenGraph['type']>([
  'website',
  'article',
  'profile',
])

const TWITTER_CARDS = new Set<PageTwitter['card']>([
  'summary',
  'summary_large_image',
])

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseRobots(value: unknown): PageRobots | undefined {
  if (!isRecord(value)) return undefined
  if (
    typeof value.index !== 'boolean'
    || typeof value.follow !== 'boolean'
    || typeof value.archive !== 'boolean'
  ) {
    return undefined
  }
  return {
    index: value.index,
    follow: value.follow,
    archive: value.archive,
  }
}

function parseAlternates(value: unknown): PageLanguageAlternate[] | undefined {
  if (!Array.isArray(value)) return undefined
  const alternates = value.flatMap((item) => {
    if (!isRecord(item)) return []
    if (typeof item.language !== 'string' || typeof item.url !== 'string') return []
    return [{ language: item.language, url: item.url }]
  })
  return alternates.length > 0 ? alternates : undefined
}

function parseOpenGraph(value: unknown): PageOpenGraph | undefined {
  if (!isRecord(value)) return undefined
  const type = OPEN_GRAPH_TYPES.has(value.type as PageOpenGraph['type'])
    ? value.type as PageOpenGraph['type']
    : undefined
  const result: PageOpenGraph = {
    ...(optionalString(value.title) !== undefined ? { title: value.title as string } : {}),
    ...(optionalString(value.description) !== undefined ? { description: value.description as string } : {}),
    ...(optionalString(value.imageUrl) !== undefined ? { imageUrl: value.imageUrl as string } : {}),
    ...(optionalString(value.imageAlt) !== undefined ? { imageAlt: value.imageAlt as string } : {}),
    ...(type !== undefined ? { type } : {}),
  }
  return Object.keys(result).length > 0 ? result : undefined
}

function parseTwitter(value: unknown): PageTwitter | undefined {
  if (!isRecord(value)) return undefined
  const card = TWITTER_CARDS.has(value.card as PageTwitter['card'])
    ? value.card as PageTwitter['card']
    : undefined
  const result: PageTwitter = {
    ...(card !== undefined ? { card } : {}),
    ...(optionalString(value.title) !== undefined ? { title: value.title as string } : {}),
    ...(optionalString(value.description) !== undefined ? { description: value.description as string } : {}),
    ...(optionalString(value.imageUrl) !== undefined ? { imageUrl: value.imageUrl as string } : {}),
    ...(optionalString(value.imageAlt) !== undefined ? { imageAlt: value.imageAlt as string } : {}),
  }
  return Object.keys(result).length > 0 ? result : undefined
}

/**
 * Tolerantly parse optional page metadata. Invalid optional sub-fields are
 * dropped without making the backing page unreadable.
 */
export function parsePageSeo(value: unknown): PageSeo | undefined {
  if (!isRecord(value)) return undefined

  const robots = parseRobots(value.robots)
  const alternates = parseAlternates(value.alternates)
  const openGraph = parseOpenGraph(value.openGraph)
  const twitter = parseTwitter(value.twitter)
  const result: PageSeo = {
    ...(optionalString(value.title) !== undefined ? { title: value.title as string } : {}),
    ...(optionalString(value.description) !== undefined ? { description: value.description as string } : {}),
    ...(optionalString(value.canonicalUrl) !== undefined ? { canonicalUrl: value.canonicalUrl as string } : {}),
    ...(optionalString(value.language) !== undefined ? { language: value.language as string } : {}),
    ...(robots ? { robots } : {}),
    ...(alternates ? { alternates } : {}),
    ...(openGraph ? { openGraph } : {}),
    ...(twitter ? { twitter } : {}),
  }

  return Object.keys(result).length > 0 ? result : undefined
}
