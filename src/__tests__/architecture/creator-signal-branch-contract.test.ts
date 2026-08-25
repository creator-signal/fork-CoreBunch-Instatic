/**
 * Architecture Gate — Creator Signal branch contract
 *
 * Keeps ordinary CI, release ancestry, and upstream mirroring aligned with
 * the protected Creator Signal integration and release branches.
 */

import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'

const REPO_ROOT = join(import.meta.dir, '../../../')
const read = (path: string) => readFileSync(join(REPO_ROOT, path), 'utf8')

describe('Creator Signal repository branch contract', () => {
  const ci = parse(read('.github/workflows/ci.yml')) as {
    on: {
      pull_request: { branches: string[] }
      push: { branches: string[] }
    }
  }
  const release = read('.github/workflows/release.yml')
  const upstreamSync = read('.github/workflows/sync-upstream-develop.yml')
  const upstreamSyncDocument = parse(upstreamSync) as {
    on: {
      schedule: Array<{ cron: string }>
      workflow_dispatch: null
    }
    permissions: { contents: string }
  }
  const agentRules = read('AGENTS.md')
  const branchDocs = read('docs/reference/repository-branches.md')

  it('runs CI for both Creator Signal branches and monitors unprefixed refs', () => {
    const expectedBranches = [
      'creator-signal/develop',
      'creator-signal/main',
      'develop',
      'main',
    ]
    expect(ci.on.pull_request.branches).toEqual(expectedBranches)
    expect(ci.on.push.branches).toEqual(expectedBranches)
  })

  it('accepts release tags only from Creator Signal main', () => {
    expect(release).toContain('git fetch --no-tags origin creator-signal/main')
    expect(release).toContain('origin/creator-signal/main')
    expect(release).not.toContain('git merge-base --is-ancestor "$GITHUB_SHA" origin/main')
  })

  it('fast-forwards the develop mirror from CoreBunch main without force-pushing', () => {
    expect(upstreamSyncDocument.on.schedule).toEqual([{ cron: '17 */6 * * *' }])
    expect(upstreamSyncDocument.on.workflow_dispatch).toBeNull()
    expect(upstreamSyncDocument.permissions.contents).toBe('write')
    expect(upstreamSync).toContain('https://github.com/CoreBunch/Instatic.git')
    expect(upstreamSync).toContain('git fetch --no-tags upstream-source main')
    expect(upstreamSync).toContain('git merge-base --is-ancestor "$mirror_sha" "$upstream_sha"')
    expect(upstreamSync).toContain('git push origin "$upstream_sha:refs/heads/develop"')
    expect(upstreamSync).not.toContain('git push --force')
  })

  it('names Creator Signal and upstream refs without treating unprefixed refs as work branches', () => {
    for (const source of [agentRules, branchDocs]) {
      expect(source).toContain('origin/creator-signal/develop')
      expect(source).toContain('origin/creator-signal/main')
      expect(source).toContain('fork-origin/main')
      expect(source).toContain('origin/develop')
      expect(source).toContain('origin/main')
    }
    expect(branchDocs).toContain('git remote set-url --push fork-origin DISABLED')
    expect(branchDocs).toContain('--base creator-signal/develop')
    expect(branchDocs).toContain('--base creator-signal/main')
    expect(branchDocs).toContain('--head creator-signal/develop')
  })
})
