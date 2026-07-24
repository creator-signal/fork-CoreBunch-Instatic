# Multi-Site Deployment

This page defines the supported isolation model for operating more than one site with Instatic.

Instatic is a single-site runtime: one process owns the singleton site record, one published snapshot namespace, one media election set, and one author directory. Multi-site operation therefore composes isolated instances instead of adding tenant branches inside the CMS.

## TL;DR

Deploy one Instatic instance per site from the same immutable image and optional site-pack plugin. Never share a database, bucket identity, master key, public origin, writable volume, or backup dataset between instances.

## Instance contract

| Boundary | Per-site requirement |
| --- | --- |
| Runtime | Independent Compose/Coolify resource and process |
| Database | Dedicated database and login role; `CONNECT` revoked from `PUBLIC` |
| Secrets | Independent Instatic master key and provider settings |
| Media | Dedicated MinIO bucket and bucket-scoped identity |
| Routes | Dedicated public origin and reviewed admin-path policy |
| Publishing | Independent snapshot/cache namespace |
| Backups | Separate PostgreSQL and MinIO datasets with isolated restore evidence |
| Operations | Separate health, deployment receipt, rollback, and DNS activation |

The recommended bucket model is one private write boundary per site, for example `instatic-creator-signal-media` and `instatic-second-site-media`. A prefix alone is not the production isolation boundary unless MinIO policy explicitly restricts the identity to that prefix and negative tests prove it.

## Shared artefacts

Instances may share:

- the immutable Instatic image digest;
- the same reviewed plugin version;
- CI workflows and deployment templates;
- the physical PostgreSQL or MinIO server when capacity and availability policy permit it.

Sharing a server does not permit sharing a database, login role, bucket identity, master key, or backup dataset.

## Provisioning sequence

For each additional site:

1. approve a stable site/application ID and hostname;
2. provision the dedicated PostgreSQL database/login and OpenBao paths;
3. provision the dedicated MinIO bucket/identity, versioning, SSE-S3, policy, and backup;
4. create the independent Coolify resource with repository-owned Traefik labels and an empty Domains field;
5. add a separate symbolic Platform Provisioner manifest/binding;
6. deploy, install the relevant site pack, confirm the automatic MinIO election,
   and run live acceptance;
7. activate DNS only after the site-specific rollback and restore gates pass.

## Related

- `docs/deployment/creator-signal-stack.md`
- `docs/features/site-transfer.md`
- `server/repositories/site.ts`
- `src/core/plugins/mediaStorageRegistry.ts`
