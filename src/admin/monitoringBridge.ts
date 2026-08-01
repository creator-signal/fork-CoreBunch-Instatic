interface PendingCapture {
  error: unknown
  source: string
}

declare global {
  interface Window {
    __instaticMonitoring?: unknown
  }
}

type Capture = (error: unknown, source: string) => void

let capture: Capture | null = null
let pending: PendingCapture[] = []
let loading = false

export function initializeAdminMonitoring(): void {
  if (loading || capture) return
  const rawConfig = window.__instaticMonitoring
  if (rawConfig === undefined) {
    pending = []
    return
  }
  loading = true
  void import('./monitoringClient')
    .then(({ createAdminMonitoringCapture }) => {
      capture = createAdminMonitoringCapture(rawConfig)
      if (!capture) {
        pending = []
        return
      }
      for (const item of pending) capture(item.error, item.source)
      pending = []
    })
    .catch((error: unknown) => {
      pending = []
      console.warn('[admin-monitoring] Monitoring initialization failed:', error)
    })
}

export function captureAdminException(error: unknown, source: string): void {
  if (capture) {
    capture(error, source)
    return
  }
  if (pending.length < 10) pending.push({ error, source })
}
