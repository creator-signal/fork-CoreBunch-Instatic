# Creator Signal Stack

This page defines how the Creator Signal Instatic comparison image, site plugin, PostgreSQL database, and MinIO media bucket fit together.

The comparison runs beside Strapi and the Next.js public site until authoring, publishing, integration, recovery, and cutover gates pass. It does not alter the production route by merely becoming healthy.

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

Install the zip from **Admin → Plugins** and approve its module, site-pack, frontend-asset, and public-config-route permissions. Archive or rename the blank setup homepage, change the imported `creator-signal-home` slug to `index`, and publish the eight imported pages.

Plausible, OpenPanel, and GlitchTip are disabled by default. Enable each plugin setting only after its collector and consent gate are accepted. Confirm the live Mautic form ID and API name on the Contact module before publishing.

## Platform Provisioner boundary

The deployment follows the current `creator-signal/platform-provisioner` contract:

- application-owned Compose declares the immutable image, health gate, Traefik routes, and one-shot `platform-provision` dependency;
- `app.platform.yaml` contains only symbolic integration references;
- Coolify Domains fields remain empty because Compose owns Traefik labels;
- PostgreSQL database/role creation is an operator prerequisite, not a manifest integration;
- MinIO, Mautic, and backup are verification-only integrations and must exist before reconciliation;
- DNS activation remains a separate protected operation after live acceptance.

## Replacement gates

Do not remove Strapi or the Next.js public site until all of these pass:

1. Authors reproduce and publish every launch page and shared layout.
2. Mautic success/failure callbacks and consented analytics emit the approved typed events.
3. MinIO upload, render, delete, cross-bucket denial, versioning, encryption, backup, and isolated restore pass.
4. PostgreSQL backup and isolated restore pass.
5. Public metadata, canonical routes, sitemap/redirect behaviour, legal copy, and browser acceptance match.
6. An approved replacement exists for ZITADEL-backed author SSO and any role-protected public route.
7. Cutover and rollback are rehearsed, and DNS activation receives separate approval.

## Related

- `integrations/creator-signal/README.md`
- `docs/deployment/multi-site.md`
- `server/media/minioStorageAdapter.ts`
- `server/config.ts`
- `src/__tests__/server/serverConfig.test.ts`
