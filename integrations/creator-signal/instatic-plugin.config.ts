import { definePlugin, permissions } from '@core/plugin-sdk'
import mauticForm from './modules/mautic-form'
import { pack } from './pack/site'

export default definePlugin({
  id: 'creator-signal.site',
  name: 'Creator Signal public site',
  version: '0.1.2',
  description: 'Creator Signal starter pages, author layouts, Mautic forms, consent and analytics integrations.',
  author: { name: 'Creator Signal', url: 'https://creatorsignal.me' },
  license: 'MIT',
  repository: 'https://github.com/creator-signal/fork-CoreBunch-Instatic',
  icon: 'icon.svg',
  permissions: [
    permissions.modulesRegister,
    permissions.visualComponentsRegister,
    permissions.frontendAssets,
    permissions.cmsRoutes,
    permissions.cmsRoutesPublic,
  ],
  networkAllowedHosts: [
    'marketing.creatorsignal.me',
    'analytics-api.creatorsignal.me',
    'replay-api.creatorsignal.me',
    'errors-api.creatorsignal.me',
  ],
  modules: [mauticForm],
  pack,
  settings: [
    { id: 'plausibleEnabled', type: 'toggle', label: 'Enable Plausible pageviews', default: false },
    { id: 'plausibleDomain', type: 'text', label: 'Plausible domain', default: 'creatorsignal.me' },
    { id: 'plausibleEventUrl', type: 'url', label: 'Plausible event URL', default: 'https://analytics-api.creatorsignal.me/api/event' },
    { id: 'openPanelEnabled', type: 'toggle', label: 'Enable consented OpenPanel events', default: false },
    { id: 'openPanelClientId', type: 'text', label: 'OpenPanel client ID', default: '' },
    { id: 'openPanelApiUrl', type: 'url', label: 'OpenPanel API URL', default: 'https://replay-api.creatorsignal.me/api' },
    { id: 'glitchTipEnabled', type: 'toggle', label: 'Enable GlitchTip browser monitoring', default: false },
    { id: 'glitchTipDsn', type: 'url', label: 'GlitchTip browser DSN', default: '' },
  ],
  frontend: {
    assets: [
      { kind: 'script', src: 'frontend/analytics.js', placement: 'body-end', strategy: 'defer' },
    ],
  },
})
