# Published page search

Published page search is an opt-in, capability-backed Component Library
feature. It indexes the exact published site snapshot, exposes results through
the `search.pages` loop source, and renders them through the shared collection
pipeline rather than a separate search renderer or paginator.

## Enable and author

1. Open **Settings → Publishing → Published page search**.
2. Enable the index and choose the public query parameter, minimum query
   length, and maximum result count.
3. Publish the site. A successful full-site publish refreshes the derived
   index after the new publish version becomes current.
4. Insert **Search Results** from the Component Library.
5. Pair it with a labelled custom GET Form Container. Its text/search input
   `name` must equal the configured query parameter (default `q`), its action
   must target the page containing Search Results, and its method must be
   `get`.

Search Results is unavailable in the catalogue while search is disabled or
invalidly configured. It is degraded, but insertable with an explanation, when
the site has no eligible page. No capability status includes credentials or
private configuration.

## Contracts

| Concern | Contract |
|---|---|
| Configuration | `SiteSettings.search`, validated by `SiteSearchSettingsSchema`; absent or disabled means unavailable. |
| Index | `SearchIndexService`, keyed by site ID and a stable fingerprint of eligible published documents. |
| Query | `SearchQuerySchema`; AND term matching, optional public-path prefix, relevance/title order, bounded limit and offset. |
| Results | `SearchResultSchema`; public page ID, title, permalink, excerpt and numeric relevance score. |
| Collection source | `search.pages`, a request-dependent `LoopEntitySource`. |
| Renderer | `base.loop` with `itemRenderer: 'search-result'`; it reuses shared empty/error/status and pagination markup. |
| Capability | `search.index`, resolved from non-secret site configuration and eligible content. |

The public request parameter takes precedence over an authored loop query.
Queries shorter than `minQueryLength` return the normal empty collection state.
Input is truncated to `maxQueryLength`. The result set is capped by
`maxResults`; page slices continue to use the shared loop `limit`, `offset`,
and numbered/previous-next URLs.

Ranking is deterministic:

- every normalized query term must occur in the title or indexed body;
- exact and phrase title matches receive the highest boost;
- title term frequency outranks body term frequency;
- ties sort by title and stable result ID.

## Publication and visibility

The index is derived only from the `SiteDocument` stored in a published
snapshot. It never reads the live editor draft.

Eligible content:

- normal, non-template pages with a visible root;
- page titles and an allow-list of visible authored content properties;
- visible content inside referenced Visual Components;
- page permalinks normalized through the standard public-path helper.

Excluded content:

- template definition pages;
- hidden roots and hidden subtrees;
- arbitrary module configuration, bindings, URLs, form identifiers, provider
  settings, and non-visible implementation metadata;
- draft state that has not completed the site publish transaction.

The allow-list currently indexes visible `text`, `title`, `label`, `summary`,
`items`, `html`, and `fallbackText` values. Markup is stripped before
tokenization and excerpts are escaped again by the publisher.

## Freshness and recovery

A full-site publish refreshes the index only after the database snapshot is
committed, static slots are swapped, and `bumpPublishVersion()` makes the new
snapshot current. Search is derived state: refresh failure is logged and marks
an existing index stale without rolling back the completed publication.

`ensure(site)` compares the request's exact published snapshot fingerprint with
the current index. A missing, stale, or mismatched index is rebuilt
synchronously from that snapshot. This also recovers safely after a process
restart because no draft or external state is required.

`status(siteId)` returns only:

- `available`, `degraded`, `unavailable`, or `stale`;
- generation, document count, indexed timestamp, and content fingerprint;
- a public-safe status message.

It does not expose indexed bodies, visitor queries, cookies, credentials, or
provider configuration.

The current implementation is intentionally process-local, matching
Instatic's single Bun server architecture. A future multi-process deployment
must supply a shared index adapter or route all search holes consistently;
copying this in-memory index across independent workers would not provide
coherent diagnostics.

## Public request security

Search is anonymous by design and has no admin or draft-read permission. The
only searchable input is the current published snapshot delivered by the
versioned snapshot cache.

- Search holes are limited to 60 requests per minute per trusted client IP.
- Client IP attribution uses the existing trusted-proxy boundary; an
  untrusted `X-Forwarded-For` header cannot choose the bucket.
- A rejected request returns HTTP 429, `Retry-After`, `Cache-Control:
  no-store`, and a public-safe accessible status fragment.
- Shared hole cache keys keep only the configured search query parameter and
  that loop's pagination keys. Unrelated query parameters cannot create
  unbounded cache entries.
- Search holes receive no cookies and results contain only public page fields.
- Source failures use the shared public-safe collection error rather than
  returning internal exceptions or index configuration.

## States

| State | Visitor behavior |
|---|---|
| Empty query / below minimum | Empty result collection; no index error. |
| No matches | Shared `No items found.` polite status. |
| Degraded | Public-safe degraded status; any retained results may still render. |
| Stale | Refreshed from the published snapshot before query; retained stale state is diagnostic only. |
| Unavailable | Shared accessible unavailable status; no results or configuration details. |
| Rate limited | HTTP 429 accessible status fragment with retry guidance. |

## Source of truth

- `src/core/search/` — TypeBox contracts, indexing, ranking, freshness and
  diagnostics.
- `src/core/loops/sources/searchPages.ts` — published request/query adapter.
- `src/core/publisher/renderLoop.ts` — shared result and pagination rendering.
- `server/publish/publishSite.ts` — successful-publish refresh.
- `server/handlers/cms/hole.ts` and `server/search/rateLimit.ts` — public query
  boundary, bounded cache key and rate limit.
- `src/admin/modals/Settings/sections/PublishingSection.tsx` — operator
  configuration.
- `src/modules/base/componentLibrary.ts` — capability-backed Search Results
  catalogue entry.

Focused tests live under `src/__tests__/search`,
`src/__tests__/publisher/loopRender.test.ts`,
`src/__tests__/server/searchRateLimit.test.ts`, and
`src/__tests__/architecture/search-publish-integration.test.ts`.
