import { describe, expect, it } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { hardenUploadResponse, serveStaticFile } from '../../../server/static'

describe('static asset content types', () => {
  it('serves web app manifests with the manifest JSON content type', async () => {
    const root = await mkdtemp(join(tmpdir(), 'instatic-static-'))
    try {
      await writeFile(join(root, 'site.webmanifest'), '{"name":"Example"}', 'utf-8')

      const response = await serveStaticFile(root, '/site.webmanifest')

      expect(response?.status).toBe(200)
      expect(response?.headers.get('content-type')).toBe(
        'application/manifest+json; charset=utf-8',
      )
      const hardened = hardenUploadResponse(response!)
      expect(hardened.headers.get('content-disposition')).toBeNull()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
