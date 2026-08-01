# Deployment

This index maps supported deployment targets to the files, variables, and persistence rules they need.

Instatic is one Bun server packaged by the root `Dockerfile`. The server reads runtime configuration from `server/config.ts`: `PORT`, `DATABASE_URL`/`DATABASE_URL_FILE`, `UPLOADS_DIR`, `STATIC_DIR`, `PUBLIC_ORIGIN`, `TRUSTED_PROXY_CIDRS`, optional `MINIO_*` values, browser-only `INSTATIC_PUBLIC_CONNECT_ORIGINS`, optional Admin/server GlitchTip settings, and the fail-closed `ATTACHMENT_*` and `FORM_DRAFT_*` policies. Reversible server secrets, including AI provider credentials, plugin secret settings, and MFA TOTP seeds, are encrypted with `INSTATIC_SECRET_KEY` or `INSTATIC_SECRET_KEY_FILE` when configured. Database migrations run automatically on boot in `server/index.ts`.

---

## TL;DR

| Target | Use when | Database | Persistent storage | Docs |
|---|---|---|---|---|
| Railway SQLite template | Fastest managed install for a single site | SQLite file | One Railway app volume mounted at `/app/storage` | [railway.md](railway.md) |
| Railway Postgres template | Managed install for teams or horizontal scale later | Railway Postgres | App volume for uploads, Postgres service volume for DB | [railway.md](railway.md) |
| Render SQLite template | Managed Docker install outside Railway | SQLite file | One Render disk mounted at `/app/storage` | [render.md](render.md) |
| Render Postgres template | Managed Postgres install outside Railway | Render Postgres | Render disk for uploads, Render Postgres storage for DB | [render.md](render.md) |
| VPS Docker Compose | Self-hosted server, full control | SQLite or bundled Postgres | Docker named volumes | [vps.md](vps.md) |
| Generic Docker host | Any platform that runs the Dockerfile/image | SQLite or external Postgres | A mounted directory/volume for DB/uploads | [docker-image.md](docker-image.md) |
| VPS HTTPS | Public domain on a VPS | Unchanged | Caddy cert volume plus app volumes | [tls-caddy.md](tls-caddy.md) |
| Creator Signal stack | Strapi replacement comparison | Dedicated Postgres | Per-site MinIO bucket plus uploads for plugin/runtime artefacts | [creator-signal-stack.md](creator-signal-stack.md) |

Back up both the database and uploaded media. See [backup-restore.md](backup-restore.md).

## Runtime Contract

Every deployment target configures the same process:

```txt
PORT          HTTP port the Bun server listens on
DATABASE_URL  sqlite:/path/to/cms.db, file:/path/to/cms.db, postgres://..., or postgresql://...
DATABASE_URL_FILE  mounted file containing DATABASE_URL; direct value wins when both exist
UPLOADS_DIR   directory for media, plugin packs, fonts, and published disk artefacts
STATIC_DIR    built admin SPA directory; /app/dist in the Docker image
INSTATIC_SECRET_KEY  base64 32-byte key for encrypted server secrets
INSTATIC_SECRET_KEY_FILE  mounted file containing the same key; direct value wins
PUBLIC_ORIGIN        comma-separated public origin(s) the CSRF check trusts; auto-detected from RENDER_EXTERNAL_URL / RAILWAY_PUBLIC_DOMAIN on those platforms
TRUSTED_PROXY_CIDRS  optional; trusts proxy socket peers for forwarded client-IP attribution only (audit logs, rate-limit keys) — NOT used for CSRF
MINIO_*  optional host-level S3-compatible media adapter; see creator-signal-stack.md
INSTATIC_PUBLIC_CONNECT_ORIGINS  optional comma-separated browser-only CSP origins; HTTPS required except for a loopback HTTP site
INSTATIC_ADMIN_GLITCHTIP_DSN[_FILE]  optional Admin browser project DSN
INSTATIC_SERVER_GLITCHTIP_DSN[_FILE] optional Bun server project DSN; must differ from the Admin DSN
INSTATIC_ENVIRONMENT / INSTATIC_RELEASE  safe monitoring labels
ATTACHMENTS_ENABLED  enables private form attachments; false by default
ATTACHMENTS_DIR      private persistent storage, never a public static path
ATTACHMENT_SCANNER_URL  required scanner endpoint when attachments are enabled
ATTACHMENT_SCANNER_TOKEN / _FILE  optional scanner bearer credential
ATTACHMENT_* limits  MIME allow-list, file/count ceilings, temporary TTL, and retention
FORM_DRAFTS_ENABLED  enables persistent Save Draft; false by default
FORM_DRAFT_TTL_DAYS  maximum persistent draft lifetime; defaults to 30
FORM_DRAFT_MAX_BYTES  values + wizard state ceiling; defaults to 262144
```

Generate `INSTATIC_SECRET_KEY` with `bun run scripts/generate-secret-key.ts` before adding Anthropic, OpenAI, or OpenRouter credentials or enabling TOTP MFA in production. Without it, the admin can load but saving reversible secrets fails because there is no stable encryption key.

The Docker image sets:

```txt
PORT=3001
STATIC_DIR=/app/dist
UPLOADS_DIR=/app/uploads
```

Managed platforms often override `PORT`. That is fine; the server uses `process.env.PORT`. When a managed platform terminates HTTPS before forwarding HTTP to the container, the CSRF origin check derives the site's public origin from `PUBLIC_ORIGIN` — auto-detected from `RENDER_EXTERNAL_URL` / `RAILWAY_PUBLIC_DOMAIN` on Render and Railway, so one-click deploys need no manual value. Set `PUBLIC_ORIGIN` explicitly (a comma-separated list) when adding a custom domain. `TRUSTED_PROXY_CIDRS` is independent of CSRF and only attributes the real client IP for audit logs and rate-limit keys.

`INSTATIC_PUBLIC_CONNECT_ORIGINS` extends only the CSP emitted for published
pages. It deliberately does not change a plugin's `networkAllowedHosts`, so it
cannot be used to bypass the server-side network sandbox. Non-loopback origins
must use HTTPS. Plain HTTP collectors are accepted only when both the collector
and configured public site use loopback hosts.

Admin and server GlitchTip monitoring are fail-open and disabled when their
separate DSNs are absent. Replay, tracing, logs, session tracking and default
PII are disabled. The allowlist redactor removes user identity, headers,
cookies, request bodies, arbitrary messages, local variables and unknown tags
before transmission.

Creator Signal tag releases build hidden Admin source maps in a separate
protected `production` job, upload them to the Admin browser project, then
delete them. The upload token and `.map` files never enter the runtime image.
Configure repository environment values `SENTRY_URL`, `SENTRY_ORG`,
`SENTRY_INSTATIC_ADMIN_BROWSER_PROJECT` and secret `SENTRY_AUTH_TOKEN`.
The release name is the exact Instatic Git commit SHA embedded in the image as
`INSTATIC_BUILD_RELEASE`; operators may override it with `INSTATIC_RELEASE`.

## Image Availability

Release bundles plus the published GHCR image are the default portable install path:

```sh
INSTATIC_IMAGE=ghcr.io/corebunch/instatic:latest docker compose -f compose.prod.yml -f compose.sqlite.yml up -d
```

Pin a semver tag for predictable upgrades:

```sh
INSTATIC_IMAGE=ghcr.io/corebunch/instatic:0.0.12 docker compose -f compose.prod.yml -f compose.sqlite.yml up -d
```

Source builds remain supported for contributors and release-candidate testing:

```sh
docker compose -f compose.prod.yml -f compose.sqlite.yml -f compose.build.yml up -d --build
```

The maintainer release target is `ghcr.io/corebunch/instatic`, documented in [release-workflow.md](release-workflow.md).

## Database Choice

The database engine is selected only by `DATABASE_URL`:

| URL shape | Engine |
|---|---|
| `sqlite:/path/to/cms.db` | SQLite |
| `file:/path/to/cms.db` | SQLite |
| `/path/to/cms.db` | SQLite |
| `postgres://...` | Postgres |
| `postgresql://...` | Postgres |

SQLite is the default for single-site installs. Postgres is for multiple simultaneous admin writers, more than one app container, or operators who already want managed Postgres.

## Persistence Rules

`UPLOADS_DIR` is required for durable media regardless of the database engine. It stores:

- uploaded media originals and variants
- uploaded fonts
- plugin packages and module packs
- published static artefacts under `published/current`

`ATTACHMENTS_DIR` is separate private storage for form attachments. The
default is a sibling of `UPLOADS_DIR`; ensure both directories are inside a
persistent mount or use separate mounts. Never expose `ATTACHMENTS_DIR` through
the static server. The bundled Compose stack mounts `/app/attachments` in its
own named volume.

SQLite installs also need the SQLite database file on persistent storage. On platforms with only one app volume, put both the SQLite file and uploads under the same mounted root.

## Docs Inventory

| File | Role |
|---|---|
| [railway.md](railway.md) | Railway templates for SQLite and Postgres |
| [render.md](render.md) | Render Blueprint templates for SQLite and Postgres |
| [vps.md](vps.md) | Docker Compose on a VPS, both SQLite and Postgres |
| [docker-image.md](docker-image.md) | Generic Docker image contract and `docker run` examples |
| [tls-caddy.md](tls-caddy.md) | Caddy TLS overlay for VPS Compose installs |
| [backup-restore.md](backup-restore.md) | Database and uploads backup/restore |
| [release-workflow.md](release-workflow.md) | Maintainer image publishing workflow |
| [creator-signal-stack.md](creator-signal-stack.md) | Creator Signal comparison, MinIO, integrations, and replacement gates |
| [multi-site.md](multi-site.md) | One-instance-per-site isolation model |

## Related

- `server/config.ts` — runtime env parsing
- `server/db/index.ts` — database URL detection
- `server/index.ts` — migrations, media storage, and server boot
- `Dockerfile` — production image contract
- `compose.prod.yml`, `compose.sqlite.yml`, `compose.tls.yml`, `compose.build.yml` — VPS Compose files
- `docs/deployment/render/sqlite/render.yaml`, `docs/deployment/render/postgres/render.yaml` — Render Blueprint templates
- `docs/features/file-attachments.md` — scanner protocol, policy variables, and retention
- `docs/features/form-drafts.md` — persistent recovery, conflicts, expiry, deletion, and privacy
