# Repository Branches

This reference defines Creator Signal integration, release promotion, and the
upstream source mirror.

Creator Signal work integrates on protected `origin/creator-signal/develop`
and promotes to protected `origin/creator-signal/main` for release. CoreBunch
publishes only `main`, so automation mirrors `fork-origin/main` exactly at
`origin/develop` without treating that mirror as a Creator Signal work branch.

---

## TL;DR

- `origin/creator-signal/develop` is Creator Signal's protected default integration branch.
- `origin/creator-signal/main` is Creator Signal's protected release branch.
- `fork-origin/main` is CoreBunch's canonical source branch.
- `origin/develop` is the automation-owned, fast-forward-only mirror of `fork-origin/main`.
- `origin/main` is retained transition history and is not a delivery target or upstream mirror.
- Ordinary and upstream-refresh pull requests target `creator-signal/develop`.
- Release promotions target `creator-signal/main` from `creator-signal/develop`.

## Branch map

| Ref | Owner | Purpose | Writes |
|-----|-------|---------|--------|
| `fork-origin/main` | CoreBunch | Canonical upstream source | None from Creator Signal |
| `origin/develop` | Mirror automation | Fast-forward mirror of `fork-origin/main` | `.github/workflows/sync-upstream-develop.yml` only |
| `origin/creator-signal/develop` | Creator Signal | Protected default integration | Pull-request merges only |
| `origin/creator-signal/main` | Creator Signal | Protected release source | Promotion pull-request merges only |
| `origin/main` | Creator Signal | Retained transition history | No ordinary delivery |
| `<type>/<short-kebab-description>` | Contributor | One Issue-scoped change | Contributor pushes, then PR |

`AGENTS.md` defines the contributor rules. `.github/workflows/ci.yml` runs CI
for pull requests and pushes on both Creator Signal branches and monitors the
two unprefixed branches. `.github/workflows/release.yml` rejects release tags
whose commit is not an ancestor of `origin/creator-signal/main`.

## Start ordinary work

Fetch the protected integration branch and create one Issue-scoped branch:

```sh
git fetch origin creator-signal/develop --prune
git switch -c fix/short-description origin/creator-signal/develop
```

Push the branch to `origin`, then open its pull request against the explicit
Creator Signal integration base:

```sh
git push -u origin fix/short-description
gh pr create --base creator-signal/develop --head fix/short-description
```

## Promote a release

After the intended release candidate passes on `creator-signal/develop`, open
a dedicated promotion pull request. Do not add unrelated changes to the
promotion branch or tag a commit that exists only on the integration branch.

```sh
gh pr create \
  --base creator-signal/main \
  --head creator-signal/develop \
  --title "chore(release): promote accepted develop candidate"
```

Merge the promotion only after the required checks pass. Tag the exact merged
`creator-signal/main` commit by following
[`release-workflow.md`](../deployment/release-workflow.md).

## Compare with upstream

Configure the upstream remote when a clone does not already have it:

```sh
git remote add fork-origin https://github.com/CoreBunch/Instatic.git
git remote set-url --push fork-origin DISABLED
```

Fetch the canonical source, its fork mirror, and Creator Signal integration:

```sh
git fetch fork-origin main --prune
git fetch origin develop creator-signal/develop --prune
git log --left-right --graph --oneline \
  fork-origin/main...origin/creator-signal/develop
```

The left side is upstream-only history. The right side is Creator Signal-only
history. `fork-origin/main` and `origin/develop` must resolve to the same commit
after mirror automation succeeds.

## Maintain the upstream mirror

`.github/workflows/sync-upstream-develop.yml` runs every six hours and can be
started manually from `creator-signal/develop`:

```sh
gh workflow run sync-upstream-develop.yml --ref creator-signal/develop
```

The workflow updates only `origin/develop`. It verifies that CoreBunch `main`
is a descendant of the current mirror and performs a fast-forward push. If
CoreBunch rewrites history, the workflow fails closed so a maintainer can
review the new history. It never force-pushes and never merges upstream into a
Creator Signal branch.

## Refresh Creator Signal from upstream

Create an Issue for each refresh. Start a dedicated branch from the current
Creator Signal integration branch, merge the fetched mirror, resolve conflicts
deliberately, and validate the complete result:

```sh
git fetch origin develop creator-signal/develop --prune
git switch -c chore/sync-upstream-2026-08-10 origin/creator-signal/develop
git merge --no-ff origin/develop
bun install --frozen-lockfile
bun run build
bun test
bun run lint
git push -u origin chore/sync-upstream-2026-08-10
gh pr create \
  --base creator-signal/develop \
  --head chore/sync-upstream-2026-08-10
```

Review upstream-only commits and every conflict in the pull request. Merge only
after CI passes. The merge commit records exactly which upstream history the
Creator Signal integration branch contains.

## Forbidden patterns

- Do not push directly to `creator-signal/develop` or `creator-signal/main`.
- Do not force-reset a Creator Signal branch to an upstream ref.
- Do not push to the configured `fork-origin` remote.
- Do not put Creator Signal commits on the automation-owned `origin/develop` mirror.
- Do not use `origin/main` as shorthand for upstream.
- Do not merge upstream directly into a long-lived Creator Signal branch.
- Do not tag a release from a commit outside `origin/creator-signal/main`.

## Related

- `AGENTS.md` — mandatory contributor and pull-request rules
- `.github/workflows/ci.yml` — protected branch and mirror CI filters
- `.github/workflows/sync-upstream-develop.yml` — upstream mirror automation
- `.github/workflows/release.yml` — release ancestry and artifact gates
- `src/__tests__/architecture/creator-signal-branch-contract.test.ts` — branch-contract gate
- [release-workflow.md](../deployment/release-workflow.md) — immutable release process
