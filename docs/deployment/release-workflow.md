# Release Workflow

This maintainer guide covers publishing the Creator Signal Instatic runtime,
media-edge image, and release bundle.

The source of truth is `.github/workflows/release.yml`. A release tag selects a
commit already contained by protected `creator-signal/main`; publishing the
tag does not deploy either image to a running environment.

---

## TL;DR

The workflow publishes the same accepted digest under these runtime tags:

```txt
ghcr.io/creator-signal/fork-corebunch-instatic:<semver>
ghcr.io/creator-signal/fork-corebunch-instatic:<major>.<minor>
ghcr.io/creator-signal/fork-corebunch-instatic:latest
```

It publishes matching tags for the media edge:

```txt
ghcr.io/creator-signal/instatic-media-edge:<semver>
ghcr.io/creator-signal/instatic-media-edge:<major>.<minor>
ghcr.io/creator-signal/instatic-media-edge:latest
```

Release flow:

1. Update `package.json` and `CHANGELOG.md` to the new version.
2. Merge the release change through a pull request to protected `creator-signal/develop`.
3. Promote the accepted candidate through a pull request from `creator-signal/develop` to protected `creator-signal/main`.
4. Tag that exact `creator-signal/main` commit, for example `v0.0.24`.
5. Run the Bun build, test, and lint gates.
6. Build each image once and push only its `sha-<commit>` candidate tag.
7. Scan both exact candidate digests for HIGH and CRITICAL OS/library findings.
8. Apply the immutable semver tag to those accepted digests.
9. Resolve and scan both published digests again in a separate job.
10. Update the minor and `latest` aliases only after that independent scan passes.
11. Create the GitHub Release and upload the release bundle and site plugin.

## Tag a release

Create a tag only after the version change is promoted from
`creator-signal/develop` and exact `creator-signal/main` CI passes:

```sh
git tag v0.0.24
git push origin v0.0.24
```

The workflow rejects a tag whose semantic version differs from
`package.json`, or whose commit is not contained by
`origin/creator-signal/main`. Existing
semver image tags are immutable: a retry may reuse a tag only when it already
resolves to the exact candidate digest.

## Image security gate

`Dockerfile` pins separate Bun build and Alpine runtime images by digest and
refreshes their installed OS packages. The runtime image contains production
dependencies only.

`deploy/creator-signal-media-edge/Dockerfile` builds the Caddy release selected
by `deploy/creator-signal-media-edge/go.mod` with pinned Go dependencies, then
copies the static binary into a pinned Alpine runtime. The media image does not
install curl or build tooling.

The release workflow runs the digest-pinned Trivy image with:

```txt
--scanners vuln
--severity HIGH,CRITICAL
--exit-code 1
```

The first gate scans the commit-addressed candidate digests before semver or
rolling tags exist. The independent gate then verifies that the semver tags
resolve to those same digests and scans the `repository@sha256` references on
a separate runner. Only then can the workflow move the minor and `latest`
aliases. Both scan jobs retain full JSON reports for 90 days. The release
bundle job cannot run until the independent scan and alias promotion succeed.

Private Admin source-map publication remains conditional on its protected
monitoring configuration. A missing optional source-map setting produces a
workflow notice; it does not weaken or skip either image scan.

## Local candidate verification

Run repository verification with the pinned Bun version:

```sh
bun install --frozen-lockfile
bun run build
bun test
bun run lint
```

Build both images from the same checkout:

```sh
docker build -t creator-signal-instatic:candidate .
docker build \
  -f deploy/creator-signal-media-edge/Dockerfile \
  -t creator-signal-instatic-media-edge:candidate \
  .
```

Scan the locally built images with the exact scanner reference declared by
`TRIVY_IMAGE` in `.github/workflows/release.yml`. A valid candidate produces no
HIGH or CRITICAL rows for either image.

## Operator update command

Digest-pinned deployments update their image selection separately from this
publication workflow. After that reviewed configuration change, Compose pulls
and recreates the application without removing database or upload volumes:

```sh
docker compose -f compose.prod.yml pull app
docker compose -f compose.prod.yml up -d
```

SQLite installs include `compose.sqlite.yml` in both commands. Production
promotion, provider changes, routing, and deployment remain separately
authorised operations.

## Related

- `Dockerfile` — runtime build and base-image contract
- `deploy/creator-signal-media-edge/Dockerfile` — media-edge build contract
- `deploy/creator-signal-media-edge/go.mod` — Caddy and Go dependency selection
- `.github/workflows/release.yml` — release job ordering and permissions
- `src/__tests__/architecture/release-image-security.test.ts` — regression gate
- [repository-branches.md](../reference/repository-branches.md) — branch and upstream-sync contract
- [creator-signal-stack.md](creator-signal-stack.md) — deployment boundary
- [docker-image.md](docker-image.md) — generic runtime image contract
