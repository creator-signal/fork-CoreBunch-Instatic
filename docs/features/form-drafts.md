# Recoverable Form Drafts

CMS-native forms support two intentionally separate recovery modes:

- `session` stores draftable values in `sessionStorage`. It makes no network
  request, works without operator configuration, and expires with the browser
  session.
- `persistent` stores a versioned record in the server database. It is
  available only when `FORM_DRAFTS_ENABLED=true`; the Component Library keeps
  Save Draft unavailable otherwise.

Forms remain ordinary semantic HTML when JavaScript is absent. Wizard steps
are authored as `base.form-step` sections and are all visible before the
runtime progressively enhances them. Next and Previous actions preserve source
order and move focus into the revealed step.

## Persistence contract

Migration `024_form_drafts` exists in both PostgreSQL and SQLite. Each record
is scoped to site, page, form, and target table; stores a server-derived form
schema and hash; and advances an integer `revision` on every successful save.

Authenticated drafts belong to the CMS user and the latest live draft can be
resumed on another device. Anonymous drafts use a 256-bit random recovery
token. Only its SHA-256 hash is stored. The bearer is returned once, retained
by the browser, and placed in the URL fragment for a copyable recovery link;
fragments are not sent in HTTP request lines. Draft IDs alone are not
authorisation and invalid identity is answered as not found.

Updates and deletion require the caller's last revision. A stale request
returns `409 draft_conflict` with the current revision and never overwrites or
deletes the newer record. The browser tells the visitor to reload instead of
merging silently.

## Schema and privacy boundaries

The server derives the stored schema from the latest published form snapshot,
including stable field IDs and Component Library entry versions when present.
On recovery:

- an identical schema restores values directly;
- a changed schema migrates only compatible controls with the same field ID;
- removed or incompatible controls are skipped with actionable warnings;
- a draft written by a newer unsupported schema version is rejected instead
  of guessed at.

Passwords, file controls, hidden inputs, honeypots, unknown fields, and
controls marked `exclude` or `session-only` never enter persistent storage.
`session-only` values may enter browser-session recovery. File attachments
keep their independent quarantine/claim lifecycle and are never draft values.
Authors can set each control's Draft storage property to Include, Session only,
or Never save.

The public endpoints are:

- `POST /_instatic/form/draft/load`
- `POST /_instatic/form/draft/save`
- `POST /_instatic/form/draft/delete`

They require the same-origin and published-page-token boundary as submission,
have separate IP/form rate limits, use no-store responses, and cap request and
stored payload size. Pending-MFA sessions are never downgraded to anonymous.

## Operator policy

| Variable | Default | Purpose |
| --- | ---: | --- |
| `FORM_DRAFTS_ENABLED` | `false` | Advertise and accept persistent recovery |
| `FORM_DRAFT_TTL_DAYS` | `30` | Maximum expiry, bounded to 365 days |
| `FORM_DRAFT_MAX_BYTES` | `262144` | Maximum encoded values plus wizard state, bounded to 1 MiB |

The authored expiry can shorten but not extend the operator maximum. Expired
records are hard-deleted every 15 minutes. Cleanup remains active after the
feature is disabled so rollback does not strand personal data. Explicit
Delete Draft also hard-deletes immediately.

Source of truth:

- shared contracts: `src/core/forms/drafts.ts`
- published schema derivation: `src/core/forms/snapshot.ts`
- persistence and migration: `server/forms/drafts/`
- browser behavior: `src/modules/base/forms/formDraftRuntimeJs.ts`
- focused tests: `src/__tests__/server/formDrafts.test.ts` and
  `src/__tests__/publisher/formDraftRuntime.test.ts`
