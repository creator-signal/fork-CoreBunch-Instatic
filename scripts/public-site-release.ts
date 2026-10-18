import { strict as assert } from 'node:assert'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { Type, type Static } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { unzipSync, zipSync, type Zippable } from 'fflate'

export const repository = 'creator-signal/fork-CoreBunch-Instatic'
export const releaseBranch = 'env/public-site'
const Sha = Type.String({ pattern: '^[a-f0-9]{40}$', minLength: 40, maxLength: 40 })
const Hash = Type.String({ pattern: '^[a-f0-9]{64}$', minLength: 64, maxLength: 64 })
const Version = Type.String({ pattern: '^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$' })
const FileEntry = Type.Object({ path: Type.String(), sha256: Hash, size: Type.Integer({ minimum: 0 }) }, { additionalProperties: false })
const Manifest = Type.Object({
  schema: Type.Literal('creator-signal.public-site-release/v1'),
  repository: Type.Literal(repository),
  sourceRevision: Sha,
  projectionRevision: Sha,
  plugin: Type.Object({ id: Type.Literal('creator-signal.site'), version: Version, apiVersion: Type.Literal(1) }, { additionalProperties: false }),
  compatibility: Type.Object({ referenceRuntimeRelease: Type.Literal('v0.0.59'), deploymentRequired: Type.Literal(true) }, { additionalProperties: false }),
  designSystemRevision: Sha,
  lockfileSha256: Hash,
  archive: Type.Object({ name: Type.Literal('creator-signal.plugin.zip'), sha256: Hash, size: Type.Integer({ minimum: 1 }) }, { additionalProperties: false }),
  files: Type.Array(FileEntry, { minItems: 1, maxItems: 10000 }),
}, { additionalProperties: false })
type ReleaseManifest = Static<typeof Manifest>
const Plugin = Type.Object({ id: Type.Literal('creator-signal.site'), version: Version, apiVersion: Type.Literal(1) }, { additionalProperties: true })
const hash = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex')
// Container checkout ownership differs from its runner. Trust only this explicit
// workspace for each command, without changing global Git configuration.
const git = (...args: string[]) => execFileSync('git', ['-c', `safe.directory=${process.cwd()}`, ...args], { encoding: 'utf8' }).trim()

export function validateSelection(input: {
  eventName: string; repositoryName: string; ref: string; revision: string;
  parents: string[]; pulls: unknown;
}): { sourceRevision: string; projectionRevision: string } {
  assert.equal(input.eventName, 'push', 'publication requires a push')
  assert.equal(input.repositoryName, repository)
  assert.equal(input.ref, `refs/heads/${releaseBranch}`)
  assert(Value.Check(Sha, input.revision))
  assert.equal(input.parents.length, 2, 'release requires a two-parent PR merge')
  for (const parent of input.parents) assert(Value.Check(Sha, parent))
  const Pull = Type.Object({
    merged_at: Type.String({ minLength: 1 }), merge_commit_sha: Sha,
    base: Type.Object({ ref: Type.Literal(releaseBranch), repo: Type.Object({ full_name: Type.Literal(repository) }) }),
    head: Type.Object({ sha: Sha, repo: Type.Object({ full_name: Type.Literal(repository) }) }),
  })
  assert(Array.isArray(input.pulls))
  const matches = input.pulls.filter((pull): pull is Static<typeof Pull> => Value.Check(Pull, pull))
    .filter(pull => pull.merge_commit_sha === input.revision && pull.head.sha === input.parents[1])
  assert.equal(matches.length, 1, 'exact merged public-site PR identity is required')
  return { sourceRevision: input.parents[1]!, projectionRevision: input.revision }
}

export function packageFiles(files: Record<string, Uint8Array>): Uint8Array {
  const archive: Zippable = {}
  for (const name of Object.keys(files).sort()) {
    assert(/^[A-Za-z0-9_./-]+$/.test(name) && !name.startsWith('/') && !name.split('/').some(part => part === '..' || part === ''), 'unsafe package path')
    archive[name] = [files[name]!, { mtime: new Date(1980, 0, 1), os: 3, attrs: 0o100644 << 16 }]
  }
  return zipSync(archive, { level: 9 })
}

export function canonicalFiles(input: Record<string, Uint8Array>): Record<string, Uint8Array> {
  const files = { ...input }
  const server = files['server/index.js']
  if (server) {
    // Bun emits the SDK's temporary facade filename as a source-location
    // comment. Normalise only that marker, preserving all executable bytes.
    const source = new TextDecoder('utf-8', { fatal: true }).decode(server)
    files['server/index.js'] = new TextEncoder().encode(source.replace(
      /^([ \t]*\/\/ integrations\/creator-signal\/server\/)__sandbox-facade-\d+(\.ts\r?)(?=\n\s*var __default =)/gm,
      '$1__sandbox-facade$2',
    ))
  }
  return files
}

async function readTree(directory: string, prefix = ''): Promise<Record<string, Uint8Array>> {
  const files: Record<string, Uint8Array> = {}
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name)
    const stat = await lstat(path)
    assert(!stat.isSymbolicLink(), 'package must not contain symbolic links')
    if (stat.isDirectory()) Object.assign(files, await readTree(path, `${prefix}${entry.name}/`))
    else { assert(stat.isFile()); files[`${prefix}${entry.name}`] = await readFile(path) }
  }
  return files
}

export function createManifest(files: Record<string, Uint8Array>, archive: Uint8Array, selection: { sourceRevision: string; projectionRevision: string }, designSystemRevision: string, lockfile: Uint8Array): ReleaseManifest {
  const plugin: unknown = JSON.parse(new TextDecoder().decode(files['plugin.json']))
  assert(Value.Check(Plugin, plugin), 'public-site plugin identity/version/API mismatch')
  const manifest = {
    schema: 'creator-signal.public-site-release/v1', repository, ...selection,
    plugin: { id: plugin.id, version: plugin.version, apiVersion: plugin.apiVersion },
    compatibility: { referenceRuntimeRelease: 'v0.0.59', deploymentRequired: true },
    designSystemRevision, lockfileSha256: hash(lockfile),
    archive: { name: 'creator-signal.plugin.zip', sha256: hash(archive), size: archive.length },
    files: Object.keys(files).sort().map(path => ({ path, sha256: hash(files[path]!), size: files[path]!.length })),
  }
  assert(Value.Check(Manifest, manifest))
  return manifest
}

export function verifyArchive(bytes: Uint8Array, input: unknown): ReleaseManifest {
  assert(Value.Check(Manifest, input), 'invalid public-site release manifest')
  assert.equal(hash(bytes), input.archive.sha256, 'archive checksum mismatch')
  assert.equal(bytes.length, input.archive.size)
  const files = unzipSync(bytes)
  assert.deepEqual(Object.keys(files).sort(), input.files.map(file => file.path), 'package roster mismatch')
  for (const file of input.files) {
    assert.equal(hash(files[file.path]!), file.sha256, `file checksum mismatch: ${file.path}`)
    assert.equal(files[file.path]!.length, file.size)
  }
  assert.deepEqual(packageFiles(files), bytes, 'noncanonical package')
  const plugin: unknown = JSON.parse(new TextDecoder().decode(files['plugin.json']))
  assert(Value.Check(Plugin, plugin))
  assert.equal(plugin.id, input.plugin.id)
  assert.equal(plugin.version, input.plugin.version)
  assert.equal(plugin.apiVersion, input.plugin.apiVersion)
  return input
}

const Release = Type.Object({ target_commitish: Type.String(), draft: Type.Boolean(), assets: Type.Array(Type.Object({ name: Type.String(), digest: Type.Union([Type.String(), Type.Null()]) })) })

export function planPublication(input: unknown, sourceRevision: string, assets: Record<string, Uint8Array>): { draft: boolean; missing: string[] } {
  assert(Value.Check(Release, input), 'invalid release metadata')
  assert.equal(input.target_commitish, sourceRevision, 'plugin version already belongs to another source')
  const names = Object.keys(assets)
  assert.equal(new Set(input.assets.map(asset => asset.name)).size, input.assets.length, 'duplicate release asset')
  assert(input.assets.every(asset => names.includes(asset.name)), 'unexpected release asset')
  const missing = []
  for (const name of names) {
    const existing: Static<typeof Release>['assets'][number] | undefined = input.assets.find(asset => asset.name === name)
    if (existing) assert.equal(existing.digest, `sha256:${hash(assets[name]!)}`, 'immutable release asset differs')
    else {
      assert(input.draft, 'published release is missing an immutable asset')
      missing.push(name)
    }
  }
  return { draft: input.draft, missing }
}

async function api(path: string, allowMissing = false): Promise<unknown> {
  const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
    headers: { authorization: `Bearer ${process.env.GH_TOKEN}`, accept: 'application/vnd.github+json' },
    redirect: 'error', signal: AbortSignal.timeout(30000),
  })
  if (allowMissing && response.status === 404) return null
  assert(response.ok, `GitHub metadata read failed: ${response.status}`)
  return response.json()
}

export function releaseIdForTag(input: unknown, tag: string): number | null {
  const Entries = Type.Array(Type.Object({ id: Type.Integer({ minimum: 1 }), tag_name: Type.String() }))
  assert(Value.Check(Entries, input), 'invalid release inventory')
  const matches = input.filter(release => release.tag_name === tag)
  assert(matches.length <= 1, 'duplicate release tag')
  return matches[0]?.id ?? null
}

async function releaseForTag(tag: string): Promise<unknown> {
  const published = await api(`releases/tags/${tag}`, true)
  if (published !== null) return published
  // GitHub's by-tag endpoint omits drafts. Resolve the authenticated release
  // inventory and then address the exact immutable release ID instead.
  for (let page = 1; page <= 20; page++) {
    const entries = await api(`releases?per_page=100&page=${page}`)
    const id = releaseIdForTag(entries, tag)
    if (id !== null) return api(`releases/${id}`)
    assert(Array.isArray(entries))
    if (entries.length < 100) return null
  }
  throw new Error('Release inventory exceeds the bounded lookup')
}

async function selection(): Promise<{ sourceRevision: string; projectionRevision: string }> {
  const revision = git('rev-parse', 'HEAD')
  if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
    if (process.env.GITHUB_BASE_REF === releaseBranch) git('merge-base', '--is-ancestor', revision, 'origin/creator-signal/develop')
    return { sourceRevision: revision, projectionRevision: revision }
  }
  const parents = git('rev-list', '--parents', '-n', '1', 'HEAD').split(' ').slice(1)
  const selected = validateSelection({ eventName: process.env.GITHUB_EVENT_NAME ?? '', repositoryName: process.env.GITHUB_REPOSITORY ?? '',
    ref: process.env.GITHUB_REF ?? '', revision, parents, pulls: await api(`commits/${revision}/pulls?per_page=100`) })
  git('merge-base', '--is-ancestor', selected.sourceRevision, 'origin/creator-signal/develop')
  assert.equal(git('rev-parse', `${selected.sourceRevision}^{tree}`), git('rev-parse', 'HEAD^{tree}'), 'projection must select the exact source tree')
  return selected
}

async function main() {
  const command = process.argv[2]
  const directory = resolve('.tmp/public-site-release')
  if (command === 'admit') {
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'selection.json'), JSON.stringify(await selection()))
    return
  }
  if (command === 'package') {
    const selected: unknown = JSON.parse(await readFile(join(directory, 'selection.json'), 'utf8'))
    const Selection = Type.Object({ sourceRevision: Sha, projectionRevision: Sha }, { additionalProperties: false })
    assert(Value.Check(Selection, selected))
    const files = canonicalFiles(await readTree('integrations/creator-signal/dist'))
    const archive = packageFiles(files)
    const lock: unknown = JSON.parse(await readFile('integrations/creator-signal/design-system/lock.json', 'utf8'))
    const Lock = Type.Object({ source: Type.Object({ revision: Sha }) })
    assert(Value.Check(Lock, lock))
    const manifest = createManifest(files, archive, selected, lock.source.revision, await readFile('bun.lock'))
    verifyArchive(archive, manifest)
    await writeFile(join(directory, manifest.archive.name), archive)
    await writeFile(join(directory, 'public-site-release.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    const manifestBytes = await readFile(join(directory, 'public-site-release.json'))
    await writeFile(join(directory, 'SHA256SUMS'), `${manifest.archive.sha256}  ${manifest.archive.name}\n${hash(manifestBytes)}  public-site-release.json\n`)
    return
  }
  if (command === 'publish') {
    const manifestBytes = await readFile(join(directory, 'public-site-release.json'))
    const manifest = verifyArchive(await readFile(join(directory, 'creator-signal.plugin.zip')), JSON.parse(manifestBytes.toString()) as unknown)
    assert.equal(manifest.projectionRevision, process.env.GITHUB_SHA)
    const selected = await selection()
    assert.equal(manifest.sourceRevision, selected.sourceRevision)
    const expectedChecksums = `${manifest.archive.sha256}  ${manifest.archive.name}\n${hash(manifestBytes)}  public-site-release.json\n`
    assert.equal(await readFile(join(directory, 'SHA256SUMS'), 'utf8'), expectedChecksums)
    const tag = `public-site-v${manifest.plugin.version}`
    const gh = (...args: string[]) => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    // Reads distinguish a missing release from permission/outage failures. Never overwrite assets.
    const Tag = Type.Object({ object: Type.Object({ type: Type.Literal('commit'), sha: Sha }) })
    const existingTag = await api(`git/ref/tags/${tag}`, true)
    if (existingTag !== null) {
      assert(Value.Check(Tag, existingTag), 'release tag must directly identify a commit')
      assert.equal(existingTag.object.sha, manifest.sourceRevision, 'plugin version tag belongs to another source')
    } else {
      gh('api', `repos/${repository}/git/refs`, '--method', 'POST', '-f', `ref=refs/tags/${tag}`, '-f', `sha=${manifest.sourceRevision}`)
    }
    if (await releaseForTag(tag) === null) {
      gh('release', 'create', tag, '--repo', repository, '--target', manifest.sourceRevision, '--verify-tag',
        '--draft', '--latest=false',
        '--title', `Creator Signal public site ${manifest.plugin.version}`, '--notes',
        `Public-site plugin only. Source ${manifest.sourceRevision}; projection ${manifest.projectionRevision}. No runtime images, deployment or live content publication.`)
    }
    const actualTag = await api(`git/ref/tags/${tag}`)
    assert(Value.Check(Tag, actualTag))
    assert.equal(actualTag.object.sha, manifest.sourceRevision)
    const release = await releaseForTag(tag)
    const expectedNames = ['SHA256SUMS', 'creator-signal.plugin.zip', 'public-site-release.json']
    const assets = Object.fromEntries(await Promise.all(expectedNames.map(async name => [name, await readFile(join(directory, name))] as const)))
    const plan = planPublication(release, manifest.sourceRevision, assets)
    for (const name of plan.missing) gh('release', 'upload', tag, join(directory, name), '--repo', repository)
    // Independent pullback verifies content, not only GitHub's recorded checksum.
    const verifiedDirectory = join(directory, 'pullback')
    await mkdir(verifiedDirectory, { recursive: true })
    gh('release', 'download', tag, '--repo', repository, '--dir', verifiedDirectory)
    for (const name of expectedNames) assert.deepEqual(await readFile(join(verifiedDirectory, name)), await readFile(join(directory, name)))
    if (plan.draft) gh('release', 'edit', tag, '--repo', repository, '--draft=false', '--latest=false')
    const published = await releaseForTag(tag)
    assert(Value.Check(Release, published))
    assert.equal(published.draft, false)
    assert.deepEqual(published.assets.map(asset => asset.name).sort(), [...expectedNames].sort())
    console.log(`Published ${tag}; deployment has not run.`)
    return
  }
  throw new Error('Expected admit, package or publish')
}

if (import.meta.main) await main()
