import { describe, expect, it } from 'bun:test'
import { Value } from '@sinclair/typebox/value'
import { RegisterStorageAdapterArgSchema } from '../../../server/plugins/protocol/schemas/media'

const registration = {
  adapterId: 'acme.media',
  label: 'Acme media',
  roles: ['original'] as const,
  servingMode: 'public-url' as const,
  hasGetReadUrl: true,
  hasReadStream: false,
}

describe('media storage protocol schema', () => {
  it('accepts complete HTTPS and local HTTP CSP origins', () => {
    for (const origin of ['https://cdn.example.com', 'http://localhost:48141']) {
      expect(Value.Check(RegisterStorageAdapterArgSchema, {
        ...registration,
        cspOrigins: [{ directive: 'img-src', origin }],
      })).toBe(true)
    }
  })

  it('rejects incomplete or over-broad CSP sources', () => {
    for (const origin of [
      'cdn.example.com',
      'ftp://cdn.example.com',
      'https://*.example.com',
      'https://user@cdn.example.com',
      'https://cdn.example.com/media',
      'https://cdn.example.com?bucket=media',
    ]) {
      expect(Value.Check(RegisterStorageAdapterArgSchema, {
        ...registration,
        cspOrigins: [{ directive: 'img-src', origin }],
      })).toBe(false)
    }
  })
})
