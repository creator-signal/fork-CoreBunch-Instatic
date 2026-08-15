import { OpenPanel } from '@openpanel/web'
import * as Sentry from '@sentry/browser'

type Config = {
  plausible: { enabled: boolean; domain: string; eventUrl: string }
  openPanel: { enabled: boolean; clientId: string; apiUrl: string }
  glitchTip: { enabled: boolean; dsn: string }
}

const configPath = '/admin/api/cms/plugins/creator-signal.site/runtime/config'
const preferenceEvent = 'creator-signal:optional-analytics-preference'
let openPanel: OpenPanel | null = null

function consent(): boolean {
  return document.cookie.split(';').some((part) => part.trim() === 'cs_optional_analytics=granted')
}

function safeCode(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80)
}

function bindPrivacyControls(): void {
  const banner = document.querySelector<HTMLElement>('[data-consent-banner]')
  let opener: HTMLElement | null = null

  document.querySelectorAll<HTMLButtonElement>('[data-privacy-choices]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!banner) return
      opener = button
      banner.removeAttribute('hidden')
      banner.querySelector<HTMLButtonElement>('[data-analytics-choice]')?.focus()
    })
  })

  document.querySelectorAll<HTMLButtonElement>('[data-analytics-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.analyticsChoice === 'granted' ? 'granted' : 'denied'
      const secure = location.protocol === 'https:' ? '; Secure' : ''
      document.cookie = `cs_optional_analytics=${value}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`
      banner?.setAttribute('hidden', '')
      dispatchEvent(new CustomEvent(preferenceEvent, { detail: { preference: value } }))
      if (value === 'denied' && openPanel) {
        void openPanel.clear()
        openPanel = null
      }
      opener?.focus()
      opener = null
    })
  })

  if (document.cookie.includes('cs_optional_analytics=')) banner?.setAttribute('hidden', '')
}

async function storeAttribution(): Promise<void> {
  const url = new URL(location.href)
  const value = url.searchParams.get('cs_attribution') ?? url.searchParams.get('mauticUserTrackingId')
  if (!value) return
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  const hash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
  sessionStorage.setItem('cs_attribution_hash', hash)
  url.searchParams.delete('cs_attribution')
  url.searchParams.delete('mauticUserTrackingId')
  history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

async function init(): Promise<void> {
  void storeAttribution()
  bindPrivacyControls()
  const response = await fetch(configPath, { credentials: 'same-origin' })
  if (!response.ok) return
  const config = await response.json() as Config

  if (config.glitchTip.enabled && config.glitchTip.dsn) {
    Sentry.init({ dsn: config.glitchTip.dsn, tracesSampleRate: 0 })
  }
  if (config.plausible.enabled) {
    void fetch(config.plausible.eventUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'pageview', url: location.href, domain: config.plausible.domain }),
      keepalive: true,
    }).catch((error) => Sentry.captureException(error, { tags: { integration: 'plausible' } }))
  }

  const startOptional = () => {
    if (!consent() || !config.openPanel.enabled || !config.openPanel.clientId || openPanel) return
    openPanel = new OpenPanel({
      clientId: config.openPanel.clientId,
      apiUrl: config.openPanel.apiUrl,
      trackScreenViews: false,
      trackOutgoingLinks: false,
      trackAttributes: false,
      trackHashChanges: false,
      sessionReplay: { enabled: false },
    })
    void openPanel.track('landing_page_viewed', {
      schema_version: 1,
      page_code: location.pathname === '/' ? 'creator_signal_home' : safeCode(location.pathname),
      canonical_path: location.pathname,
      locale: document.documentElement.lang || 'en-AU',
    })
  }
  startOptional()
  addEventListener(preferenceEvent, startOptional)

  document.addEventListener('creator-signal:form-result', (event) => {
    if (!consent() || !openPanel) return
    const detail = (event as CustomEvent<Record<string, unknown>>).detail
    const success = detail.result === 'success'
    void openPanel.track(success ? 'form_submitted' : 'form_submission_failed', {
      schema_version: 1,
      page_code: safeCode(String(detail.page_code ?? 'unknown')),
      form_code: safeCode(String(detail.form_code ?? 'unknown')),
      ...(detail.campaign_code ? { campaign_code: safeCode(String(detail.campaign_code)) } : {}),
      ...(success ? { result: 'success' } : {
        safe_error_code: safeCode(String(detail.safe_error_code ?? 'unknown')),
      }),
    })
  })

}

void init().catch((error) => Sentry.captureException(error, { tags: { integration: 'creator-signal-site' } }))
