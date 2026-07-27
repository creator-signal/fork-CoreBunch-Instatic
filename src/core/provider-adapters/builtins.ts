import { providerAdapterRegistry } from './registry'
import type { ProviderAdapterDefinition } from './schemas'

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

export const YoutubeProviderAdapter: ProviderAdapterDefinition = {
  id: 'media.youtube',
  version: '1.0.0',
  name: 'YouTube',
  description: 'Privacy-enhanced YouTube video embeds.',
  kinds: ['embed', 'media'],
  consentCategory: 'marketing',
  allowedOrigins: ['https://www.youtube-nocookie.com'],
  configFields: [
    {
      key: 'url',
      label: 'YouTube URL',
      type: 'url',
      required: true,
      exposure: 'public',
    },
  ],
  iframePolicy: {
    sandbox: [
      'allow-forms',
      'allow-presentation',
      'allow-same-origin',
      'allow-scripts',
    ],
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissions: [
      'autoplay',
      'encrypted-media',
      'fullscreen',
      'picture-in-picture',
    ],
  },
  fallbackText: 'YouTube video unavailable.',
  resolve: ({ config, title }) => {
    const videoId = youtubeId(String(config.url))
    if (!videoId) throw new Error('Invalid YouTube URL.')
    return {
      type: 'iframe',
      src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`,
      title,
      aspectRatio: '16 / 9',
    }
  },
}

export const OpenStreetMapProviderAdapter: ProviderAdapterDefinition = {
  id: 'maps.openstreetmap',
  version: '1.0.0',
  name: 'OpenStreetMap',
  description: 'OpenStreetMap export embeds.',
  kinds: ['embed', 'map'],
  consentCategory: 'preferences',
  allowedOrigins: ['https://www.openstreetmap.org'],
  configFields: [
    {
      key: 'url',
      label: 'OpenStreetMap embed URL',
      type: 'url',
      required: true,
      exposure: 'public',
    },
  ],
  iframePolicy: {
    sandbox: [
      'allow-popups',
      'allow-popups-to-escape-sandbox',
      'allow-scripts',
    ],
    referrerPolicy: 'no-referrer',
    permissions: [],
  },
  fallbackText: 'Map unavailable.',
  resolve: ({ config, title }) => {
    const url = new URL(String(config.url))
    if (
      url.origin !== 'https://www.openstreetmap.org' ||
      url.pathname !== '/export/embed.html'
    ) {
      throw new Error('Invalid OpenStreetMap embed URL.')
    }
    return {
      type: 'iframe',
      src: url.toString(),
      title,
      aspectRatio: '4 / 3',
    }
  },
}

export const HcaptchaProviderAdapter: ProviderAdapterDefinition = {
  id: 'captcha.hcaptcha',
  version: '1.0.0',
  name: 'hCaptcha',
  description: 'hCaptcha challenge supplied through the provider-neutral CAPTCHA contract.',
  kinds: ['captcha'],
  consentCategory: 'essential',
  allowedOrigins: [
    'https://hcaptcha.com',
    'https://js.hcaptcha.com',
    'https://newassets.hcaptcha.com',
  ],
  configFields: [
    {
      key: 'siteKey',
      label: 'Site key',
      type: 'text',
      required: true,
      exposure: 'public',
    },
    {
      key: 'secretKey',
      label: 'Secret key',
      type: 'text',
      required: true,
      exposure: 'secret',
    },
  ],
  fallbackText: 'CAPTCHA verification is unavailable.',
  resolve: ({ config, title }) => ({
    type: 'runtime',
    runtimeId: 'hcaptcha',
    publicConfig: { siteKey: String(config.siteKey) },
    title,
  }),
}

export function registerBuiltInProviderAdapters(): void {
  providerAdapterRegistry.registerOrReplace(YoutubeProviderAdapter)
  providerAdapterRegistry.registerOrReplace(OpenStreetMapProviderAdapter)
  providerAdapterRegistry.registerOrReplace(HcaptchaProviderAdapter)
  providerAdapterRegistry.setStatus('media.youtube', { health: 'available' })
  providerAdapterRegistry.setStatus('maps.openstreetmap', { health: 'available' })
  providerAdapterRegistry.setStatus('captcha.hcaptcha', {
    health: 'unavailable',
    message:
      'hCaptcha requires a configured site key, protected secret and server-side verification.',
  })
}

registerBuiltInProviderAdapters()

function youtubeId(input: string): string | null {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  if (host === 'youtu.be') {
    const candidate = url.pathname.slice(1).split('/')[0] ?? ''
    return YOUTUBE_ID.test(candidate) ? candidate : null
  }
  if (
    host !== 'youtube.com' &&
    host !== 'm.youtube.com' &&
    host !== 'youtube-nocookie.com'
  ) {
    return null
  }
  if (url.pathname === '/watch') {
    const candidate = url.searchParams.get('v') ?? ''
    return YOUTUBE_ID.test(candidate) ? candidate : null
  }
  const match = url.pathname.match(/^\/(?:embed|shorts)\/([^/?#]+)/)
  return match && YOUTUBE_ID.test(match[1] ?? '') ? match[1] ?? null : null
}
