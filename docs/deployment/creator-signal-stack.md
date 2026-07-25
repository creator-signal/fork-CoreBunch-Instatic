# Creator Signal Stack

This page defines how the Creator Signal Instatic production image, site plugin, PostgreSQL database, and MinIO media bucket fit together.

The application is the authoring CMS and public-site runtime. Becoming healthy
does not activate DNS; production routing remains a separately approved
operation after authoring, publishing, integration and recovery acceptance.

## TL;DR

Run one Instatic instance per public site. Give each instance a separate PostgreSQL database/login, MinIO bucket/identity, master key, public/admin domain boundary, backup dataset, and Platform Provisioner application binding. Install the Creator Signal plugin and publish the imported pages.

## Runtime configuration

The Creator Signal image is `ghcr.io/creator-signal/fork-corebunch-instatic`. Releases also attach `creator-signal.plugin.zip`, and the image carries the same artifact at `/app/starter-plugins/creator-signal.plugin.zip`.

The same release publishes
`ghcr.io/creator-signal/instatic-media-edge`. That small Caddy image exposes
only `/media/*` and proxies reads to the `instatic-creator-signal-media` MinIO
bucket. The deployment mounts the Creator Signal private CA certificate at
`/run/creator-signal/ca/root_ca.crt`.

Production uses mounted files for sensitive values:

| Setting | Purpose |
| --- | --- |
| `DATABASE_URL_FILE` | Site-specific PostgreSQL connection URL |
| `INSTATIC_SECRET_KEY_FILE` | Site-specific 32-byte base64 master key |
| `INSTATIC_AUTH_MODE` | Set to `zitadel` to disable native human login |
| `INSTATIC_OIDC_ISSUER` | HTTPS Zitadel issuer |
| `INSTATIC_OIDC_CLIENT_ID_FILE` | Dedicated site client ID |
| `INSTATIC_OIDC_CLIENT_SECRET_FILE` | Dedicated site client secret |
| `INSTATIC_OIDC_PROJECT_ID_FILE` | Zitadel project ID used for role claims |
| `INSTATIC_OIDC_REDIRECT_URI` | Exact site callback under `/admin/api/cms/auth/oidc/callback` |
| `INSTATIC_OIDC_REQUIRED_ROLE` | Required author role, normally `platform:operator` |
| `INSTATIC_OIDC_OWNER_ROLE` | First-owner role, normally `platform:owner` |
| `INSTATIC_DEPLOYMENT_TOKEN_FILE` | Machine-only five-minute deployment verification session |
| `MINIO_ACCESS_KEY_FILE` | Bucket-scoped MinIO access key |
| `MINIO_SECRET_KEY_FILE` | Bucket-scoped MinIO secret key |
| `MINIO_ENDPOINT` | Private S3 endpoint used by the host adapter |
| `MINIO_BUCKET` | Site-specific media bucket |
| `MINIO_PUBLIC_BASE_URL` | Same-origin public media edge, normally `/media` |
| `MINIO_REGION` | S3 signing region, normally `us-east-1` |
| `MINIO_PREFIX` | Optional stable prefix inside the site bucket |

When all required MinIO values are present, startup verifies the bucket and
fails closed if it cannot be reached. The host then registers and elects
**MinIO object storage** for originals, variants, avatars, and fonts on every
boot. Local disk remains available only when MinIO is deliberately unconfigured,
such as a basic upstream development install. Plugin packs and generated
publishing artefacts remain in `UPLOADS_DIR`, so that path is still durable.

The public media edge maps `/media/<key>` to `/<site-bucket>/<key>` on the private MinIO API. The bucket permits anonymous object download only through that reviewed edge path; write and delete remain limited to the bucket-scoped identity. MinIO versioning and SSE-S3 are required.

## Site plugin

Build the plugin with:

```sh
bun run instatic-plugin lint integrations/creator-signal
bun run instatic-plugin build integrations/creator-signal
```

Install the zip from **Admin → Plugins** and approve its module, site-pack,
frontend-asset, and public-config-route permissions. For a managed empty
installation, set `INSTATIC_BOOTSTRAP_SITE_NAME`,
`INSTATIC_BOOTSTRAP_OWNER_EMAIL`,
`INSTATIC_BOOTSTRAP_OWNER_PASSWORD_FILE`,
`INSTATIC_BOOTSTRAP_PLUGIN_PACKAGE`, and optionally
`INSTATIC_BOOTSTRAP_PLUGIN_SETTINGS_FILE`. Startup then creates the first
owner, replaces the blank homepage, installs the trusted embedded package, and
publishes all 18 routes. The bootstrap password is dormant when Zitadel mode
is enabled; first login links the verified Zitadel identity to that owner.
Existing installations are never reset.

Plausible, OpenPanel, and GlitchTip are disabled by default. Enable each plugin setting only after its collector and consent gate are accepted. Confirm the live Mautic form ID and API name on the Contact module before publishing.

## Platform Provisioner boundary

The deployment follows the current `creator-signal/platform-provisioner` contract:

- application-owned Compose declares the immutable image, health gate, Traefik routes, and one-shot `platform-provision` dependency;
- `app.platform.yaml` contains only symbolic integration references;
- Coolify Domains fields remain empty because Compose owns Traefik labels;
- PostgreSQL database/role creation is an operator prerequisite, not a manifest integration;
- MinIO, Mautic, and backup are verification-only integrations and must exist before reconciliation;
- DNS activation remains a separate protected operation after live acceptance.

## Production activation gates

Do not activate the apex or `www` routes until all of these pass:

1. Authors reproduce and publish every launch page and shared layout.
2. Mautic success/failure callbacks and consented analytics emit the approved typed events.
3. MinIO upload, render, delete, cross-bucket denial, versioning, encryption, backup, and isolated restore pass.
4. PostgreSQL backup and isolated restore pass.
5. Public metadata, canonical routes, sitemap/redirect behaviour, legal copy, and browser acceptance match.
6. A verified Zitadel operator signs in through `/admin`; the owner/operator role mapping, denied wrong-role path, logout, and stale-session re-login all pass without exposing native login.
7. Cutover and rollback are rehearsed, and DNS activation receives separate approval.

## Related

- `integrations/creator-signal/README.md`
- `docs/deployment/multi-site.md`
- `server/media/minioStorageAdapter.ts`
- `server/config.ts`
- `src/__tests__/server/serverConfig.test.ts`
