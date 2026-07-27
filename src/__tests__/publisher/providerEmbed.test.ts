import { describe, expect, it } from 'bun:test'
import { escapeProps } from '@core/publisher'
import { ProviderEmbedModule } from '@modules/base/providerEmbed'

function render(props: Record<string, unknown>) {
  const safeProps = escapeProps(
    { ...ProviderEmbedModule.defaults, ...props },
    ProviderEmbedModule.schema,
  )
  return ProviderEmbedModule.render(safeProps, [])
}

describe('provider embed publishing', () => {
  it('publishes an inert consent host without requesting YouTube', () => {
    const output = render({
      adapterId: 'media.youtube',
      kind: 'media',
      sourceUrl: 'https://youtu.be/dQw4w9WgXcQ',
      title: 'Product & roadmap',
    })

    expect(output.html).not.toContain('<iframe')
    expect(output.html).toContain('data-instatic-provider-embed')
    expect(output.html).toContain('data-instatic-provider-consent="marketing"')
    expect(output.html).toContain(
      'data-instatic-provider-src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"',
    )
    expect(output.html).toContain(
      'data-instatic-provider-title="Product &amp; roadmap"',
    )
    expect(output.html).not.toContain('&amp;amp;')
    expect(output.js).toContain('instatic:consent-changed')
    expect(output.cspSources).toEqual([
      {
        directive: 'frame-src',
        sources: ['https://www.youtube-nocookie.com'],
      },
    ])
  })

  it('preserves an OpenStreetMap query while enforcing its approved endpoint', () => {
    const output = render({
      adapterId: 'maps.openstreetmap',
      kind: 'map',
      sourceUrl:
        'https://www.openstreetmap.org/export/embed.html?bbox=1%2C2%2C3%2C4&layer=mapnik',
      title: 'Office map',
    })

    expect(output.html).toContain(
      'bbox=1%2C2%2C3%2C4&amp;layer=mapnik',
    )
    expect(output.cspSources?.[0]?.sources).toEqual([
      'https://www.openstreetmap.org',
    ])
  })

  it('falls back without script or CSP for an unapproved URL', () => {
    const output = render({
      adapterId: 'maps.openstreetmap',
      kind: 'map',
      sourceUrl: 'https://evil.example/embed',
      fallbackText: 'Use the written address.',
    })

    expect(output.html).toContain('data-instatic-provider-state="invalid"')
    expect(output.html).toContain('Use the written address.')
    expect(output.html).not.toContain('evil.example')
    expect(output.js).toBeUndefined()
    expect(output.cspSources).toBeUndefined()
  })

  it('keeps hCaptcha unavailable until protected server verification exists', () => {
    const output = render({
      adapterId: 'captcha.hcaptcha',
      kind: 'captcha',
      sourceUrl: 'public-site-key',
    })

    expect(output.html).toContain('data-instatic-provider-state="unavailable"')
    expect(output.html).not.toContain('<iframe')
    expect(output.js).toBeUndefined()
    expect(output.cspSources).toBeUndefined()
  })
})
