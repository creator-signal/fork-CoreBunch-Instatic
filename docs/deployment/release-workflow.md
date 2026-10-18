# Release Workflow

This maintainer guide covers publishing the Creator Signal Instatic runtime,
media-edge image, and release bundle.

The source of truth is `.github/workflows/release.yml`. A release tag selects a
commit already contained by protected `creator-signal/main`; publishing the
tag does not deploy either image to a running environment.

---

## Independent public-site artifact release

The user-authorised `env/public-site` lane releases the Creator Signal site
plugin independently of the Instatic application. Its sole workflow is
`.github/workflows/public-site-release.yml`; its admission, deterministic package
and publication helper is `scripts/public-site-release.ts` (Issue #286,
following the release-coupling review in #283).

1. Implement site changes through a PR into `creator-signal/develop`. Advance
   `creatorSignalPluginVersion` in
   `integrations/creator-signal/design-system/contract.ts` for changed package
   contents. The Instatic `package.json` version need not change.
2. For the first release only, initialise `env/public-site` at the accepted
   `v0.0.59` commit through authorised repository administration. That historical
   source has no public-site release workflow, so creating the branch publishes
   nothing. This pipeline implementation does not create the branch or release.
3. Open a PR from the exact integrated site Source into `env/public-site`.
   The workflow validates the package and published pages on PRs without write
   permissions. Merge using a two-parent **merge commit**, preserving the exact
   selected Source as its second parent. Do not squash, rebase or directly push
   release changes. The resulting `env/public-site` push is release authority.
4. Admission independently reads GitHub's merged-PR record, checks the exact
   projection/head/repository identity, requires Source ancestry in
   `creator-signal/develop`, and requires the projection tree to equal Source.
5. The read-only qualification job uses locked Bun tooling, the existing plugin
   builder, generated design-system checks and the real published-page browser
   verifier. Browser checks cover all 26 public routes, desktop/tablet/mobile,
   both themes, contrast, fonts, navigation, no-JavaScript behavior, accessibility
   and the committed visual baselines. It does not build the application,
   runtime/media images, private source maps or the generic install bundle.
6. A separate contents-write job downloads that same run's qualified artifact,
   verifies its complete file inventory and checksum, and publishes three assets
   under `public-site-v<plugin-version>`: `creator-signal.plugin.zip`,
   `public-site-release.json` and `SHA256SUMS`. It creates a draft release first,
   verifies downloaded asset bytes before making it public, and never changes
   the Instatic release's `latest` selection. The distinct tag namespace does
   not trigger `.github/workflows/release.yml`.

The manifest records the exact Source and projection revisions, plugin API and
version, the design-system revision, locked dependency hash and every packaged
file. ZIP order, timestamps and permissions are normalised, as is the SDK's
timestamped server-facade source-location comment; executable bytes are preserved.
A rerun can finish
an interrupted draft only with identical inputs; a completed version is checked
without writes. Different Source, tag or artifact bytes require a new plugin
version. Assets are never overwritten, and unknown assets fail verification.
This is authenticated GitHub artifact provenance, not a separate signature claim.

Draft retries resolve the authenticated release inventory by exact tag and then
read the release by ID: GitHub's by-tag endpoint does not return draft releases.
The first 0.8.3 projection (#289) reached an empty draft before this correction;
that tag and draft are retained as failed-attempt evidence. The corrected lane
uses plugin 0.8.4 and does not replace or relabel the failed version's assets.

The compatibility reference is Instatic `v0.0.59` / plugin API 1. Qualification
uses the selected repository publisher; it does not claim installed acceptance
for arbitrary older CMS versions. Before a separately authorised deployment,
verify the selected running CMS supports the package and its registered
capabilities. Installing the ZIP or changing versioned plugin records is a
deployment operation; importing or publishing authored content is another
explicit operation. Neither happens in this lane. Preserve the existing
preview/backup/draft-hash safeguards for retained content and use the previous
verified package plus the separately owned content backup for rollback.

The full runtime release path below remains independent. It may still include
its matching site-plugin ZIP for complete installations, but public-site releases
never invoke or alter its images, aliases, runtime version or release bundle.

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

1. Update `package.json` and `CHANGELOG.md` to the new version. Regenerate
   version-bound metadata in dependency order with
   `bun run component-library:design-impact` followed by
   `bun run component-library:non-form-specimens`; the specimen manifest embeds
   the design-impact checksum. Verify both generated checks before promotion.
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
