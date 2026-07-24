export function activate(api) {
  api.cms.routes.public.get('/config', () => ({
    plausible: {
      enabled: api.cms.settings.get('plausibleEnabled') === true,
      domain: String(api.cms.settings.get('plausibleDomain') || 'creatorsignal.me'),
      eventUrl: String(api.cms.settings.get('plausibleEventUrl') || 'https://analytics-api.creatorsignal.me/api/event'),
    },
    openPanel: {
      enabled: api.cms.settings.get('openPanelEnabled') === true,
      clientId: String(api.cms.settings.get('openPanelClientId') || ''),
      apiUrl: String(api.cms.settings.get('openPanelApiUrl') || 'https://replay-api.creatorsignal.me/api'),
    },
    glitchTip: {
      enabled: api.cms.settings.get('glitchTipEnabled') === true,
      dsn: String(api.cms.settings.get('glitchTipDsn') || ''),
    },
  }))
}
