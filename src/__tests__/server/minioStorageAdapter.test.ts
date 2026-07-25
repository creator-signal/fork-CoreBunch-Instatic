import { describe, expect, it } from 'bun:test'
import { buildMinioStorageAdapter } from '../../../server/media/minioStorageAdapter'

const adapter = buildMinioStorageAdapter({
  endpoint: 'https://objects.internal.example',
  publicBaseUrl: 'https://cms.example.com/media',
  bucket: 'creator-signal-media',
  region: 'us-east-1',
  prefix: 'marketing',
  accessKey: 'bucket-scoped-access-key',
  secretKey: 'bucket-scoped-secret-key',
})

describe('MinIO media storage adapter', () => {
  it('declares the complete media-edge origin for published CSPs', () => {
    expect(adapter.cspOrigins).toEqual([
      { directive: 'img-src', origin: 'https://cms.example.com' },
      { directive: 'media-src', origin: 'https://cms.example.com' },
    ])
  })

  it('returns a signed bucket-scoped upload plan without exposing the secret', async () => {
    const plan = await adapter.beginWrite({
      mimeType: 'image/png',
      suggestedStoragePath: 'launch hero.png',
      contentHash: 'a'.repeat(64),
      sizeBytes: 1234,
      role: 'original',
    })

    expect(plan.storagePath).toBe(
      `marketing/original/aa/${'a'.repeat(64)}-launch-hero.png`,
    )
    expect(plan.steps).toHaveLength(1)
    expect(plan.steps[0]?.url).toBe(
      `https://objects.internal.example/creator-signal-media/${plan.storagePath}`,
    )
    expect(plan.steps[0]?.headers.authorization).toContain(
      'Credential=bucket-scoped-access-key/',
    )
    expect(JSON.stringify(plan)).not.toContain('bucket-scoped-secret-key')
  })

  it('returns the media-edge URL after finalization', async () => {
    const result = await adapter.finalizeWrite({
      storagePath: 'marketing/original/aa/asset.png',
      uploadReceipts: [],
    })

    expect(result.publicUrl).toBe(
      'https://cms.example.com/media/marketing/original/aa/asset.png',
    )
    expect(result.metadata).toEqual({
      provider: 'minio',
      bucket: 'creator-signal-media',
      prefix: 'marketing',
    })
  })

  it('verifies the bucket with a signed HEAD request', async () => {
    const originalFetch = globalThis.fetch
    let captured: { url: string; init?: RequestInit } | null = null
    globalThis.fetch = (async (input, init) => {
      captured = { url: String(input), init }
      return new Response(null, { status: 200 })
    }) as typeof fetch

    try {
      await expect(adapter.verify?.()).resolves.toEqual({ ok: true })
      expect(captured?.url).toBe(
        'https://objects.internal.example/creator-signal-media',
      )
      expect(captured?.init?.method).toBe('HEAD')
      expect(new Headers(captured?.init?.headers).get('authorization')).toContain(
        'Credential=bucket-scoped-access-key/',
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
