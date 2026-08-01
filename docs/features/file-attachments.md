# File Attachments

File Attachments let published CMS-native forms collect private files without storing binaries in form rows or exposing them through the public media path.

The attachment boundary validates each file, writes it to quarantine, requires a clean malware scan, and exchanges the file for a scoped opaque reference. A form submission claims that reference in the same transaction that creates its `data_rows` record.

---

## TL;DR

- The `attachment` data field stores one private attachment ID or an array of IDs; it never stores file bytes.
- `base.file-attachment` is a capability-backed Component Library entry over a `base.input` file control.
- `server/attachments/validation.ts` checks size, extension, declared MIME type, content signature, and the authored `accept` restriction.
- `server/attachments/service.ts` keeps uploads quarantined until `AttachmentScanner.scan()` returns `clean`.
- Opaque references are bound to site, page, form, field, expiry, and a hashed random token.
- Downloads require an authenticated data/content capability and use `Content-Disposition: attachment`, `no-store`, `nosniff`, and a sandbox content policy.
- Scanner outages are fail-closed: the browser shows a retry action and the bytes remain quarantined until expiry.
- `server/attachments/cleanup.ts` deletes unclaimed temporary files and claimed files whose retention period has elapsed.

## Architecture

| Responsibility | Source |
|---|---|
| Shared schemas and opaque-reference parser | `src/core/attachments/` |
| Data-field contract | `src/core/data/schemas.ts` |
| Private local storage adapter | `server/attachments/localStorage.ts` |
| Scanner adapters | `server/attachments/scanner.ts` |
| File validation | `server/attachments/validation.ts` |
| Lifecycle and cleanup | `server/attachments/service.ts`, `cleanup.ts` |
| Persistence and scoped claims | `server/attachments/repository.ts`, `forms.ts` |
| Public upload, retry, and submit routes | `server/forms/handler.ts` |
| Authenticated download and deletion | `server/handlers/cms/attachments.ts` |
| Browser progress and retry runtime | `src/modules/base/forms/formRuntimeJs.ts` |
| Operator configuration | `server/config.ts` |

The `form_attachments` table is created by migration `023_form_attachments` in both `server/db/migrations-pg.ts` and `server/db/migrations-sqlite.ts`. It stores metadata, lifecycle state, a storage-adapter-relative path, the hashed reference token, the claimed row ID, and expiry timestamps.

## Upload and Claim Lifecycle

```text
selected file
    │ validate extension, MIME, signature, size, authored policy
    ▼
private quarantine ── scan unavailable/error ──► retry before temporary expiry
    │
    ├── rejected ──► delete bytes + retain rejected metadata until cleanup
    │
    └── clean ──► move to active private path + return opaque reference
                                                   │
                                                   ▼
form submit ── atomically create data row + claim reference
                                                   │
                                                   ▼
authenticated download until deletion/retention expiry
```

`POST /_instatic/form/attachment/upload` accepts multipart form data containing `pageId`, `formId`, `pageToken`, `fieldId`, and `file`. The handler reloads the published form snapshot and accepts the upload only when that snapshot contains the named file control.

`POST /_instatic/form/attachment/scan` retries a quarantined scan. Its retry token is the same random secret used by the eventual opaque reference, and the database stores only its SHA-256 hash.

The public form runtime replaces selected `File` objects with `att:v1:<id>:<token>` references before `POST /_instatic/form/submit`. `server/attachments/forms.ts` converts valid references to attachment IDs. The claim succeeds only when every record is clean, active, unexpired, unclaimed, and matches the published site/page/form/field scope. A failed claim rolls back the new data row.

## Validation Policy

The built-in signature rules support:

| MIME type | Extensions |
|---|---|
| `application/pdf` | `.pdf` |
| `image/png` | `.png` |
| `image/jpeg` | `.jpg`, `.jpeg` |
| `image/gif` | `.gif` |
| `image/webp` | `.webp` |
| `text/plain` | `.txt` |
| `text/csv` | `.csv` |

`ATTACHMENT_ALLOWED_MIME_TYPES` can narrow this set but cannot add a type without a signature rule in `server/attachments/validation.ts`. The effective size limit is the smaller of `ATTACHMENT_MAX_FILE_BYTES` and the file control's `maxFileBytes`. The effective count limit is the smaller structural limit imposed by a single/multiple control and its `maxFiles` value, capped by `ATTACHMENT_MAX_FILES`.

## Scanner Contract

`ATTACHMENT_SCANNER_URL` selects the provider-neutral HTTP adapter in `server/attachments/scanner.ts`. The adapter sends:

```http
POST <ATTACHMENT_SCANNER_URL>
Content-Type: application/octet-stream
Accept: application/json
X-Instatic-Filename: <URL-encoded filename>
X-Instatic-Mime-Type: <validated MIME type>
X-Instatic-Sha256: <hex SHA-256>
Authorization: Bearer <ATTACHMENT_SCANNER_TOKEN>

<raw file bytes>
```

The scanner returns one of:

```json
{"status":"clean"}
```

```json
{"status":"rejected","reason":"provider-safe rejection detail"}
```

Transport failures, timeouts, non-2xx responses, and invalid response bodies never activate the file. The runtime reports a degraded/unavailable dependency, and the visitor can retry the existing quarantined upload.

## Operator Configuration

| Variable | Default | Purpose |
|---|---:|---|
| `ATTACHMENTS_ENABLED` | `false` | Enables the upload routes and catalogue capability |
| `ATTACHMENTS_DIR` | sibling `attachments` directory beside `UPLOADS_DIR` | Private byte storage; do not serve this path |
| `ATTACHMENT_SCANNER_URL` | unset | HTTP scanner endpoint |
| `ATTACHMENT_SCANNER_TOKEN` / `_FILE` | unset | Optional scanner bearer credential |
| `ATTACHMENT_ALLOWED_MIME_TYPES` | all built-in signature types | Comma-separated allow-list |
| `ATTACHMENT_MAX_FILE_BYTES` | `10485760` | Per-file operator ceiling |
| `ATTACHMENT_MAX_FILES` | `5` | Per-field operator ceiling |
| `ATTACHMENT_TEMPORARY_TTL_SECONDS` | `86400` | Unclaimed quarantine/active lifetime |
| `ATTACHMENT_RETENTION_DAYS` | `90` | Claimed-file lifetime |

The capability is unavailable while disabled or while storage/scanner health is unavailable. A newly configured HTTP scanner starts degraded until it completes a scan. The Component Library surfaces this health through `GET /admin/api/cms/attachments/health`.

The local adapter stores bytes below `<ATTACHMENTS_DIR>/<attachmentId>/`. Quarantine and active paths are private and relative to the configured adapter root. Instatic is single-install, so attachment rows and paths do not carry tenant-style site identifiers. Back up `ATTACHMENTS_DIR` together with the database; restoring only one side leaves references or bytes incomplete.

## Forbidden Patterns

- Do not put attachment bytes, data URLs, public media URLs, or absolute storage paths in `cells_json`.
- Do not serve `ATTACHMENTS_DIR` as a static directory or place it under `UPLOADS_DIR`.
- Do not activate a file when scanning is unavailable, degraded, rejected, or malformed.
- Do not trust a client-declared site, table, form, field, MIME type, or filename.
- Do not accept an opaque reference without checking its token, scope, lifecycle state, and expiry in the claim transaction.
- Do not add a MIME type to configuration without a matching content-signature rule.
- Do not log scanner credentials or opaque reference tokens.

## Related

- `docs/features/cms-native-forms.md` — authored controls and public submission flow.
- `docs/features/component-library.md` — capability-backed catalogue availability.
- `docs/features/content-storage.md` — `data_tables` and `data_rows`.
- `docs/deployment/README.md` — persistence and runtime configuration.
- Source-of-truth files: `src/core/attachments/`, `server/attachments/`
- Focused tests: `src/__tests__/server/attachments.test.ts`, `src/__tests__/publisher/formAttachmentRuntime.test.ts`
- Dialect gate: `src/__tests__/server/cmsMigrations.test.ts`
