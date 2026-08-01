import { describe, expect, it } from 'bun:test'
import {
  providerAdapterRegistry,
  registerBuiltInProviderAdapters,
} from '@core/provider-adapters'

describe('built-in provider adapters', () => {
  it('publishes explicit health without exposing CAPTCHA as usable', () => {
    registerBuiltInProviderAdapters()

    expect(providerAdapterRegistry.dependencyHealth()).toMatchObject({
      'media.youtube': 'available',
      'maps.openstreetmap': 'available',
      'captcha.hcaptcha': 'unavailable',
    })
    expect(providerAdapterRegistry.status('captcha.hcaptcha')).toEqual({
      health: 'unavailable',
      message:
        'hCaptcha requires a configured site key, protected secret and server-side verification.',
    })
  })

  it('resolves YouTube URLs only to the privacy-enhanced approved origin', () => {
    const ready = providerAdapterRegistry.resolve('media.youtube', {
      kind: 'media',
      config: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      title: 'Product walkthrough',
    })

    expect(ready).toMatchObject({
      status: 'ready',
      plan: {
        type: 'iframe',
        src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
        title: 'Product walkthrough',
      },
    })
    expect(providerAdapterRegistry.resolve('media.youtube', {
      kind: 'media',
      config: { url: 'https://evil.example/watch?v=dQw4w9WgXcQ' },
      title: 'Rejected video',
    })).toMatchObject({ status: 'invalid' })
    expect(providerAdapterRegistry.resolve('media.youtube', {
      kind: 'media',
      config: { url: 'http://youtu.be/dQw4w9WgXcQ' },
      title: 'Rejected video',
    })).toMatchObject({ status: 'invalid' })
  })

  it('accepts only the OpenStreetMap export embed endpoint', () => {
    expect(providerAdapterRegistry.resolve('maps.openstreetmap', {
      kind: 'map',
      config: {
        url: 'https://www.openstreetmap.org/export/embed.html?bbox=1%2C2%2C3%2C4&layer=mapnik',
      },
      title: 'Office location',
    })).toMatchObject({
      status: 'ready',
      plan: {
        type: 'iframe',
      },
    })
    expect(providerAdapterRegistry.resolve('maps.openstreetmap', {
      kind: 'map',
      config: { url: 'https://www.openstreetmap.org/user/example' },
      title: 'Rejected map',
    })).toMatchObject({ status: 'invalid' })
  })

  it('keeps every editor preview inert', () => {
    expect(providerAdapterRegistry.editorPreview('media.youtube', 'media'))
      .toMatchObject({
        health: 'available',
        inert: true,
        message: 'Provider content is disabled in the editor canvas.',
      })
    expect(providerAdapterRegistry.editorPreview('captcha.hcaptcha', 'captcha'))
      .toMatchObject({
        health: 'unavailable',
        inert: true,
        message: expect.stringContaining('server-side verification'),
      })
  })
})
