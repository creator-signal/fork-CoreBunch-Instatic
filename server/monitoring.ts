import * as Sentry from '@sentry/bun'
import {
  redactMonitoringBreadcrumb,
  redactMonitoringEvent,
  safeMonitoringRoute,
} from '@core/monitoring'
import type { MonitoringTargetConfig } from './config'

interface CaptureContext {
  source: string
  method?: string
  route?: string
  status?: number
}

let enabled = false

export function initializeServerMonitoring(
  config: MonitoringTargetConfig | null,
): void {
  if (!config) return
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    ...(config.release ? { release: config.release } : {}),
    sendDefaultPii: false,
    enableLogs: false,
    integrations: (defaults) => defaults.filter(
      (integration) => (
        integration.name !== 'LocalVariables'
        && integration.name !== 'ProcessSession'
      ),
    ),
    sampleRate: 1,
    tracesSampleRate: 0,
    tracePropagationTargets: [],
    maxBreadcrumbs: 20,
    maxValueLength: 160,
    normalizeDepth: 3,
    normalizeMaxBreadth: 40,
    beforeSend: redactMonitoringEvent,
    beforeSendTransaction: redactMonitoringEvent,
    beforeBreadcrumb: redactMonitoringBreadcrumb,
  })
  enabled = true
}

export function captureServerException(
  error: unknown,
  context: CaptureContext,
): void {
  if (!enabled) return
  Sentry.withScope((scope) => {
    scope.setTag('source', context.source)
    if (context.method) scope.setTag('method', context.method)
    const route = safeMonitoringRoute(context.route)
    if (route) scope.setTag('route', route)
    if (context.status !== undefined) scope.setTag('status', String(context.status))
    Sentry.captureException(error)
  })
}
