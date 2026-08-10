/**
 * Architecture Gate — Creator Signal branch contract
 *
 * Keeps ordinary CI and release ancestry checks on the protected Creator
 * Signal integration branch while preserving the explicit upstream remote.
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
  const agentRules = read('AGENTS.md')
  const branchDocs = read('docs/reference/repository-branches.md')

  it('runs ordinary CI only for the Creator Signal integration branch', () => {
    expect(ci.on.pull_request.branches).toEqual(['creator-signal/main'])
    expect(ci.on.push.branches).toEqual(['creator-signal/main'])
  })

  it('accepts release tags only from Creator Signal main', () => {
    expect(release).toContain('git fetch --no-tags origin creator-signal/main')
    expect(release).toContain('origin/creator-signal/main')
    expect(release).not.toContain('git merge-base --is-ancestor "$GITHUB_SHA" origin/main')
  })

  it('names Creator Signal and upstream refs without treating origin/main as upstream', () => {
    for (const source of [agentRules, branchDocs]) {
      expect(source).toContain('origin/creator-signal/main')
      expect(source).toContain('fork-origin/main')
      expect(source).toContain('origin/main')
    }
    expect(branchDocs).toContain('git remote set-url --push fork-origin DISABLED')
    expect(branchDocs).toContain('--base creator-signal/main')
  })
})
