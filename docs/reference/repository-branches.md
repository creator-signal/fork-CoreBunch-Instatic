# Repository Branches

This reference defines Creator Signal delivery branches and the upstream sync workflow.

The protected integration branch is `origin/creator-signal/main`. The upstream
project is compared and fetched through `fork-origin/main`; upstream commits
enter Creator Signal history only through a dedicated sync branch and pull
request.

---

## TL;DR

- `origin/creator-signal/main` is Creator Signal's default integration and release source.
- `fork-origin/main` is the read-only upstream comparison and fetch source.
- `origin/main` is retained as a transition branch and is not an upstream mirror or delivery target.
- Ordinary and upstream-sync pull requests target `creator-signal/main`.
- Never reset or force-push a long-lived branch to make histories look equal.

## Branch map

| Ref | Owner | Purpose | Writes |
|-----|-------|---------|--------|
| `fork-origin/main` | CoreBunch | Upstream comparison and fetch source | None from Creator Signal |
| `origin/creator-signal/main` | Creator Signal | Protected default integration and release source | Pull-request merges only |
| `origin/main` | Creator Signal | Retained transition history | No ordinary delivery |
| `<type>/<short-kebab-description>` | Contributor | One Issue-scoped change | Contributor pushes, then PR |

`AGENTS.md` defines the contributor rules. `.github/workflows/ci.yml` runs CI
for pull requests and pushes on `creator-signal/main`.
`.github/workflows/release.yml` rejects release tags whose commit is not an
ancestor of `origin/creator-signal/main`.

## Start ordinary work

Fetch the protected integration branch and create one Issue-scoped branch:

```sh
git fetch origin creator-signal/main --prune
git switch -c fix/short-description origin/creator-signal/main
```

Push the branch to `origin`, then open its pull request against the explicit
Creator Signal base:

```sh
git push -u origin fix/short-description
gh pr create --base creator-signal/main --head fix/short-description
```

## Compare with upstream

Configure the upstream remote when a clone does not already have it:

```sh
git remote add fork-origin https://github.com/CoreBunch/Instatic.git
git remote set-url --push fork-origin DISABLED
```

Fetch both sources without changing either long-lived branch:

```sh
git fetch fork-origin main --prune
git fetch origin creator-signal/main --prune
git log --left-right --graph --oneline \
  fork-origin/main...origin/creator-signal/main
```

The left side is upstream-only history. The right side is Creator
Signal-only history.

## Refresh from upstream

Create an Issue for each refresh. Start a dedicated branch from Creator
Signal's current integration branch, merge the fetched upstream ref, resolve
conflicts deliberately, and validate the complete result:

```sh
git fetch fork-origin main --prune
git fetch origin creator-signal/main --prune
git switch -c chore/sync-upstream-2026-08-10 origin/creator-signal/main
git merge --no-ff fork-origin/main
bun install --frozen-lockfile
bun run build
bun test
bun run lint
git push -u origin chore/sync-upstream-2026-08-10
gh pr create \
  --base creator-signal/main \
  --head chore/sync-upstream-2026-08-10
```

Review upstream-only commits and every conflict in the pull request. Merge only
after CI passes. The merge commit records exactly which upstream history the
Creator Signal branch contains.

## Forbidden patterns

- Do not force-reset `creator-signal/main` to `fork-origin/main`.
- Do not push to the configured `fork-origin` remote.
- Do not use `origin/main` as shorthand for upstream.
- Do not merge upstream directly into a long-lived branch.
- Do not tag a release from a commit outside `origin/creator-signal/main`.

## Related

- `AGENTS.md` — mandatory contributor and pull-request rules
- `.github/workflows/ci.yml` — protected integration CI branch filters
- `.github/workflows/release.yml` — release ancestry and artifact gates
- `src/__tests__/architecture/creator-signal-branch-contract.test.ts` — branch-contract gate
- [release-workflow.md](../deployment/release-workflow.md) — immutable release process
