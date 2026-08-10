/**
 * Architecture Gate — release image security
 *
 * Keeps both public images on immutable base inputs and prevents the release
 * workflow from moving version or rolling tags before exact candidate digests
 * pass the mandatory vulnerability gate. The second scan is deliberately a
 * separate job so a registry-published digest is re-resolved and verified.
 */

import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

const REPO_ROOT = join(import.meta.dir, '../../../')
const read = (path: string) => readFileSync(join(REPO_ROOT, path), 'utf8')

describe('release image security contract', () => {
  const workflow = read('.github/workflows/release.yml')
  const runtimeDockerfile = read('Dockerfile')
  const mediaDockerfile = read('deploy/creator-signal-media-edge/Dockerfile')
  const mediaGoMod = read('deploy/creator-signal-media-edge/go.mod')

  it('pins every release image and scanner input by digest', () => {
    expect(runtimeDockerfile).toMatch(/oven\/bun:[^\s@]+@sha256:[0-9a-f]{64}/)
    expect(mediaDockerfile).toMatch(/golang:[^\s@]+@sha256:[0-9a-f]{64}/)
    expect(mediaDockerfile).toMatch(/alpine:[^\s@]+@sha256:[0-9a-f]{64}/)
    expect(workflow).toMatch(/TRIVY_IMAGE: aquasec\/trivy:[^\s@]+@sha256:[0-9a-f]{64}/)
    expect(workflow.match(/^\s*uses:\s+[^\s]+@(?![0-9a-f]{40}(?:\s|$))[^\s]+/gm) ?? []).toEqual([])
  })

  it('refreshes runtime packages and selects the reviewed media dependencies', () => {
    expect(runtimeDockerfile).toContain('apk upgrade --no-cache')
    expect(mediaDockerfile).toContain('apk upgrade --no-cache')
    expect(mediaGoMod).toContain('github.com/caddyserver/caddy/v2 v2.11.4')
    expect(mediaGoMod).toContain('golang.org/x/text v0.39.0')
    expect(mediaGoMod).toContain('google.golang.org/grpc v1.82.1')
  })

  it('scans candidate and published digests before release completion', () => {
    expect(workflow).toContain('name: Scan both candidate digests')
    expect(workflow).toContain('--severity HIGH,CRITICAL')
    expect(workflow).toContain('--exit-code 1')
    expect(workflow).toContain('promote-images:')
    expect(workflow).toContain('published-scan:')
    expect(workflow).toContain('promote-aliases:')
    expect(workflow).toMatch(/published-scan:[\s\S]*needs:[\s\S]*- promote-images/)
    expect(workflow).toMatch(/promote-aliases:[\s\S]*needs:[\s\S]*- published-scan/)
    expect(workflow).toMatch(/bundle:[\s\S]*needs:[\s\S]*- promote-aliases/)
  })

  it('publishes commit candidates before applying release aliases', () => {
    expect(workflow).toContain('fork-corebunch-instatic:sha-${{ github.sha }}')
    expect(workflow).toContain('instatic-media-edge:sha-${{ github.sha }}')
    expect(workflow).toContain('docker buildx imagetools create')
    expect(workflow).toContain('--tag "${repository}:${VERSION}"')
    expect(workflow).toContain('--tag "${repository}:${minor}"')
  })
})
