import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { createHash } from 'node:crypto'
import { strToU8, unzipSync } from 'fflate'
import { createManifest, packageFiles, planPublication, repository, validateSelection, verifyArchive } from './public-site-release'

const source = 'a'.repeat(40)
const projection = 'b'.repeat(40)
const selection = { sourceRevision: source, projectionRevision: projection }
const fixtures = () => ({
  'plugin.json': strToU8(JSON.stringify({ id: 'creator-signal.site', version: '0.8.3', apiVersion: 1 })),
  'frontend/site.js': strToU8('console.log("public site")'),
  'assets/brand.svg': strToU8('<svg/>'),
})
const push = () => ({
  eventName: 'push', repositoryName: repository, ref: 'refs/heads/env/public-site', revision: projection,
  parents: ['c'.repeat(40), source],
  pulls: [{ merged_at: '2026-10-17T00:00:00Z', merge_commit_sha: projection,
    base: { ref: 'env/public-site', repo: { full_name: repository } },
    head: { sha: source, repo: { full_name: repository } } }],
})

describe('public-site release custody', () => {
  test('admits only the exact merged PR into the dedicated release branch', () => {
    expect(validateSelection(push())).toEqual(selection)
    for (const patch of [
      { eventName: 'pull_request' }, { eventName: 'workflow_dispatch' },
      { ref: 'refs/heads/creator-signal/main' }, { repositoryName: 'another/repository' },
      { parents: [source] }, { parents: [source, source, source] }, { pulls: [] },
      { revision: source },
    ]) expect(() => validateSelection({ ...push(), ...patch })).toThrow()
    const foreign = push()
    foreign.pulls[0]!.head.repo.full_name = 'another/repository'
    expect(() => validateSelection(foreign)).toThrow()
    const duplicate = push()
    duplicate.pulls.push(duplicate.pulls[0]!)
    expect(() => validateSelection(duplicate)).toThrow()
  })

  test('packages deterministic bytes regardless of insertion order and binds every file', () => {
    const files = fixtures()
    const archive = packageFiles(files)
    expect(packageFiles(Object.fromEntries(Object.entries(files).reverse()))).toEqual(archive)
    const manifest = createManifest(files, archive, selection, 'd'.repeat(40), strToU8('locked dependencies'))
    expect(verifyArchive(archive, manifest)).toEqual(manifest)
    expect(manifest.archive.sha256).toEqual(createHash('sha256').update(archive).digest('hex'))
    expect(manifest.plugin.version).toBe('0.8.3')
    expect(manifest.sourceRevision).toBe(source)
    expect(manifest.projectionRevision).toBe(projection)
    expect(Object.keys(unzipSync(archive)).sort()).toEqual(manifest.files.map(file => file.path))
    expect(manifest.compatibility.deploymentRequired).toBe(true)
  })

  test('rejects tampered archives, missing/extra files, wrong identity/version and unknown manifest fields', () => {
    const files = fixtures(), archive = packageFiles(files)
    const manifest = createManifest(files, archive, selection, 'd'.repeat(40), strToU8('lock'))
    const changed = archive.slice(); changed[changed.length - 1] = 1
    expect(() => verifyArchive(changed, manifest)).toThrow()
    expect(() => verifyArchive(archive, { ...manifest, untrusted: true })).toThrow()
    expect(() => verifyArchive(archive, { ...manifest, plugin: { ...manifest.plugin, version: '0.8.4' } })).toThrow()
    expect(() => verifyArchive(archive, { ...manifest, files: manifest.files.slice(1) })).toThrow()
    for (const identity of [
      { id: 'another.plugin', version: '0.8.3', apiVersion: 1 },
      { id: 'creator-signal.site', version: '../unsafe', apiVersion: 1 },
      { id: 'creator-signal.site', version: '0.8.3', apiVersion: 2 },
    ]) {
      const changedFiles = { ...files, 'plugin.json': strToU8(JSON.stringify(identity)) }
      expect(() => createManifest(changedFiles, packageFiles(changedFiles), selection, 'd'.repeat(40), strToU8('lock'))).toThrow()
    }
    for (const name of ['../escape', '/absolute', 'nested/../escape', 'nested//file']) {
      expect(() => packageFiles({ [name]: strToU8('no') })).toThrow()
    }
  })

  test('resumes only identical draft assets and makes a completed publication a read-only no-op', () => {
    const assets = { 'creator-signal.plugin.zip': strToU8('archive'), 'public-site-release.json': strToU8('manifest'), SHA256SUMS: strToU8('sums') }
    const publishedAssets = Object.entries(assets).map(([name, bytes]) => ({ name, digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}` }))
    const complete = { target_commitish: source, draft: false, assets: publishedAssets }
    expect(planPublication(complete, source, assets)).toEqual({ draft: false, missing: [] })
    expect(planPublication({ ...complete, draft: true, assets: publishedAssets.slice(0, 1) }, source, assets)).toEqual({ draft: true, missing: ['public-site-release.json', 'SHA256SUMS'] })
    for (const patch of [
      { target_commitish: projection }, { assets: publishedAssets.slice(0, 1) },
      { assets: [...publishedAssets, { name: 'unrelated-image.tar', digest: 'sha256:untrusted' }] },
      { assets: [...publishedAssets, publishedAssets[0]!] },
      { assets: publishedAssets.map(asset => ({ ...asset, digest: 'sha256:changed' })) },
    ]) expect(() => planPublication({ ...complete, ...patch }, source, assets)).toThrow()
    expect(() => planPublication({ ...complete, draft: true, assets: publishedAssets.map(asset => ({ ...asset, digest: null })) }, source, assets)).toThrow()
  })
})

describe('public-site workflow isolation', () => {
  const document = parse(readFileSync('.github/workflows/public-site-release.yml', 'utf8'))
  const serialized = JSON.stringify(document)

  test('push authority is env/public-site only and PRs never publish', () => {
    expect(document.on.push.branches).toEqual(['env/public-site'])
    expect(document.on.pull_request.branches).toContain('env/public-site')
    expect(document.on.workflow_dispatch).toBeUndefined()
    expect(document.on.schedule).toBeUndefined()
    expect(document.permissions).toEqual({ contents: 'read' })
    expect(document.jobs.publish.if).toBe("github.event_name == 'push' && github.ref == 'refs/heads/env/public-site'")
    expect(document.jobs.publish.needs).toBe('qualify')
    expect(document.jobs.publish.permissions).toEqual({ contents: 'write' })
  })

  test('builds and checks the public plugin without unrelated producers or live actions', () => {
    expect(serialized).toContain('instatic-plugin build integrations/creator-signal')
    expect(serialized).toContain('verify:creator-signal-public-acceptance')
    expect(serialized).not.toMatch(/docker\/(?:build|login)|build-push-action|release:bundle|bun run build|source-maps|coolify|ssh |kubectl|site_publish|workflow_dispatch/)
    expect(Object.keys(document.jobs)).toEqual(['qualify', 'publish'])
    const runtimeRelease = parse(readFileSync('.github/workflows/release.yml', 'utf8'))
    expect(runtimeRelease.on.push.tags).toEqual(['v*.*.*'])
    expect('public-site-v0.8.3'.startsWith('v')).toBe(false)
    const ci = parse(readFileSync('.github/workflows/ci.yml', 'utf8'))
    expect(ci.on.push.branches).not.toContain('env/public-site')
    expect(ci.on.pull_request.branches).not.toContain('env/public-site')
  })

  test('pins workflow dependencies, disables persisted checkout credentials and never overwrites releases', () => {
    for (const job of Object.values(document.jobs) as Array<{ steps: Array<{ uses?: string; with?: Record<string, unknown> }> }>) {
      for (const step of job.steps) {
        if (step.uses) expect(step.uses).toMatch(/@[a-f0-9]{40}$/)
        if (step.uses?.startsWith('actions/checkout')) expect(step.with?.['persist-credentials']).toBe(false)
      }
    }
    const publisher = readFileSync('scripts/public-site-release.ts', 'utf8')
    expect(publisher).not.toContain('--clobber')
    expect(publisher).toContain('immutable release asset differs')
    expect(publisher).toContain('pullback')
    expect(publisher).toContain('--latest=false')
  })
})
