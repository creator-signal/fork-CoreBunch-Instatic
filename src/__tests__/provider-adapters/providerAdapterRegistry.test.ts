import { describe, expect, it } from 'bun:test'
import {
  ProviderAdapterDefinitionError,
  ProviderAdapterRegistry,
  type ProviderAdapterDefinition,
} from '@core/provider-adapters'

function adapter(
  overrides: Partial<ProviderAdapterDefinition> = {},
): ProviderAdapterDefinition {
  return {
    id: 'test.maps',
    version: '1.0.0',
    name: 'Test Maps',
    description: 'Approved test map embeds.',
    kinds: ['map'],
    consentCategory: 'preferences',
    allowedOrigins: ['https://maps.example.com'],
    configFields: [
      {
        key: 'url',
        label: 'Map URL',
        type: 'url',
        required: true,
        exposure: 'public',
      },
      {
        key: 'apiSecret',
        label: 'API secret',
        type: 'text',
        required: true,
        exposure: 'secret',
      },
    ],
    iframePolicy: {
      sandbox: ['allow-scripts'],
      referrerPolicy: 'no-referrer',
      permissions: ['geolocation'],
    },
    fallbackText: 'Map unavailable.',
    resolve: ({ config, title }) => ({
      type: 'iframe',
      src: String(config.url),
      title,
      aspectRatio: '16 / 9',
    }),
    ...overrides,
  }
}

describe('ProviderAdapterRegistry', () => {
  it('validates definitions and rejects unsafe origins or duplicate fields', () => {
    const registry = new ProviderAdapterRegistry()
    expect(() => registry.register(adapter({
      allowedOrigins: ['http://maps.example.com/path'],
    }))).toThrow(ProviderAdapterDefinitionError)
    expect(() => registry.register(adapter({
      configFields: [
        {
          key: 'url',
          label: 'URL',
          type: 'url',
          required: true,
          exposure: 'public',
        },
        {
          key: 'url',
          label: 'Duplicate URL',
          type: 'url',
          required: false,
          exposure: 'public',
        },
      ],
    }))).toThrow('Duplicate configuration key')
  })

  it('defaults installed but unconfigured adapters to unavailable', () => {
    const registry = new ProviderAdapterRegistry()
    registry.register(adapter())
    expect(registry.status('test.maps')).toEqual({
      health: 'unavailable',
      message: 'The provider adapter is not configured.',
    })
    expect(registry.dependencyHealth()).toEqual({
      'test.maps': 'unavailable',
    })
  })

  it('resolves only approved kinds, public config and iframe origins', () => {
    const registry = new ProviderAdapterRegistry()
    registry.register(adapter())
    registry.setStatus('test.maps', { health: 'available' })

    expect(registry.resolve('test.maps', {
      kind: 'media',
      config: { url: 'https://maps.example.com/embed/one' },
      title: 'Office location',
    })).toMatchObject({ status: 'invalid' })
    expect(registry.resolve('test.maps', {
      kind: 'map',
      config: {
        url: 'https://maps.example.com/embed/one',
        apiSecret: 'must-not-leak',
      },
      title: 'Office location',
    })).toMatchObject({
      status: 'invalid',
      message: expect.stringContaining('Secret provider configuration'),
    })
    expect(registry.resolve('test.maps', {
      kind: 'map',
      config: { url: 'https://evil.example/embed/one' },
      title: 'Office location',
    })).toMatchObject({
      status: 'invalid',
      message: 'The provider returned a URL outside its approved origin allow-list.',
    })
    expect(registry.resolve('test.maps', {
      kind: 'map',
      config: { url: 'https://maps.example.com/embed/one' },
      title: 'Office location',
    })).toMatchObject({
      status: 'ready',
      plan: {
        type: 'iframe',
        src: 'https://maps.example.com/embed/one',
      },
    })
  })

  it('propagates degraded health without exposing settings to editor previews', () => {
    const registry = new ProviderAdapterRegistry()
    registry.register(adapter())
    registry.setStatus('test.maps', {
      health: 'degraded',
      message: 'Provider latency is elevated.',
    })

    expect(registry.resolve('test.maps', {
      kind: 'map',
      config: { url: 'https://maps.example.com/embed/one' },
      title: 'Office location',
    })).toMatchObject({
      status: 'degraded',
      message: 'Provider latency is elevated.',
    })
    expect(registry.editorPreview('test.maps', 'map')).toEqual({
      adapterId: 'test.maps',
      providerName: 'Test Maps',
      kind: 'map',
      consentCategory: 'preferences',
      health: 'degraded',
      inert: true,
      message: 'Provider latency is elevated.',
    })
  })
})
