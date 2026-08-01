import * as Sentry from '@sentry/browser'
import { Value } from '@sinclair/typebox/value'
import {
  MonitoringRuntimeConfigSchema,
  redactMonitoringBreadcrumb,
  redactMonitoringEvent,
} from '@core/monitoring'

export function createAdminMonitoringCapture(
  rawConfig: unknown,
): ((error: unknown, source: string) => void) | null {
  if (!Value.Check(MonitoringRuntimeConfigSchema, rawConfig)) {
    console.warn('[admin-monitoring] Ignoring invalid monitoring configuration')
    return null
  }

  Sentry.init({
    dsn: rawConfig.dsn,
    environment: rawConfig.environment,
    ...(rawConfig.release ? { release: rawConfig.release } : {}),
    sendDefaultPii: false,
    enableLogs: false,
    integrations: (defaults) => defaults.filter(
      (integration) => integration.name !== 'BrowserSession' && integration.name !== 'Replay',
    ),
    sampleRate: 1,
    tracesSampleRate: 0,
    tracePropagationTargets: [],
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    maxBreadcrumbs: 20,
    maxValueLength: 160,
    normalizeDepth: 3,
    normalizeMaxBreadth: 40,
    beforeSend: redactMonitoringEvent,
    beforeSendTransaction: redactMonitoringEvent,
    beforeBreadcrumb: redactMonitoringBreadcrumb,
  })

  return (error: unknown, source: string): void => {
    Sentry.withScope((scope) => {
      scope.setTag('source', source)
      Sentry.captureException(error)
    })
  }
}
