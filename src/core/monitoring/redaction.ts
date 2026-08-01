type UnknownRecord = Record<string, unknown>

const allowedTags = new Set(['method', 'route', 'source', 'status'])
const safeRouteSegments = new Set([
  '_instatic',
  'account',
  'admin',
  'ai',
  'api',
  'auth',
  'callback',
  'cms',
  'content',
  'data',
  'health',
  'login',
  'logout',
  'media',
  'mcp',
  'me',
  'oauth',
  'oidc',
  'plugins',
  'publish',
  'runtime',
  'setup',
  'site',
  'status',
  'uploads',
  'users',
])

function record(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as UnknownRecord
    : null
}

function safeCode(value: unknown, maxLength = 120): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) return undefined
  return /^[a-zA-Z0-9._:/ -]+$/.test(value) ? value : undefined
}

export function safeMonitoringRoute(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2_048) return undefined
  if (!value.startsWith('/') && !/^https?:\/\//i.test(value)) return undefined
  try {
    const parsed = new URL(value, 'https://monitoring.invalid')
    const path = parsed.pathname
      .split('/')
      .map((segment, index) => {
        if (index === 0 || segment === '') return segment
        const normalized = segment.toLowerCase()
        return safeRouteSegments.has(normalized) ? normalized : ':id'
      })
      .join('/')
    return path.length <= 256 ? path : undefined
  } catch {
    return undefined
  }
}

function safeStackFilename(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > 4_096) return undefined
  try {
    const parsed = new URL(value, 'https://monitoring.invalid')
    return parsed.pathname.length <= 1_024 ? parsed.pathname : undefined
  } catch {
    return undefined
  }
}

function safeStacktrace(value: unknown): UnknownRecord | undefined {
  const stacktrace = record(value)
  if (!stacktrace || !Array.isArray(stacktrace.frames)) return undefined
  return {
    frames: stacktrace.frames.flatMap((candidate) => {
      const frame = record(candidate)
      if (!frame) return []
      const output: UnknownRecord = {}
      const filename = safeStackFilename(frame.filename ?? frame.abs_path)
      const functionName = safeCode(frame.function, 160)
      const moduleName = safeCode(frame.module, 160)
      if (filename) output.filename = filename
      if (functionName) output.function = functionName
      if (moduleName) output.module = moduleName
      if (typeof frame.lineno === 'number') output.lineno = frame.lineno
      if (typeof frame.colno === 'number') output.colno = frame.colno
      if (typeof frame.in_app === 'boolean') output.in_app = frame.in_app
      return [output]
    }),
  }
}

function safeException(value: unknown): UnknownRecord | undefined {
  const exception = record(value)
  if (!exception || !Array.isArray(exception.values)) return undefined
  return {
    values: exception.values.flatMap((candidate) => {
      const item = record(candidate)
      if (!item) return []
      const output: UnknownRecord = { value: 'Instatic operation failed' }
      const type = safeCode(item.type, 120)
      const stacktrace = safeStacktrace(item.stacktrace)
      if (type) output.type = type
      if (stacktrace) output.stacktrace = stacktrace
      const mechanism = record(item.mechanism)
      if (mechanism) {
        const mechanismType = safeCode(mechanism.type, 80)
        output.mechanism = {
          ...(mechanismType ? { type: mechanismType } : {}),
          ...(typeof mechanism.handled === 'boolean' ? { handled: mechanism.handled } : {}),
        }
      }
      return [output]
    }),
  }
}

function safeRequest(value: unknown): UnknownRecord | undefined {
  const request = record(value)
  if (!request) return undefined
  const method = safeCode(request.method, 12)
  const url = safeMonitoringRoute(request.url)
  return method || url
    ? { ...(method ? { method } : {}), ...(url ? { url } : {}) }
    : undefined
}

function safeTags(value: unknown): UnknownRecord | undefined {
  const tags = record(value)
  if (!tags) return undefined
  const output: UnknownRecord = {}
  for (const [key, candidate] of Object.entries(tags)) {
    if (!allowedTags.has(key)) continue
    const safe = key === 'route'
      ? safeMonitoringRoute(candidate)
      : safeCode(candidate, 80)
    if (safe) output[key] = safe
  }
  return Object.keys(output).length > 0 ? output : undefined
}

function safeContexts(value: unknown): UnknownRecord | undefined {
  const contexts = record(value)
  if (!contexts) return undefined
  const output: UnknownRecord = {}
  for (const key of ['browser', 'os', 'runtime'] as const) {
    const context = record(contexts[key])
    if (!context) continue
    const name = safeCode(context.name, 80)
    const version = safeCode(context.version, 80)
    if (name || version) {
      output[key] = {
        ...(name ? { name } : {}),
        ...(version ? { version } : {}),
      }
    }
  }
  const trace = record(contexts.trace)
  if (trace) {
    const safeTrace: UnknownRecord = {}
    for (const key of ['trace_id', 'span_id', 'parent_span_id', 'op', 'status'] as const) {
      const safe = safeCode(trace[key], 80)
      if (safe) safeTrace[key] = safe
    }
    if (Object.keys(safeTrace).length > 0) output.trace = safeTrace
  }
  return Object.keys(output).length > 0 ? output : undefined
}

function safeBreadcrumbs(value: unknown): UnknownRecord[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.flatMap((candidate) => {
    const breadcrumb = record(candidate)
    if (!breadcrumb) return []
    const output: UnknownRecord = {}
    for (const key of ['category', 'level', 'type'] as const) {
      const safe = safeCode(breadcrumb[key], 80)
      if (safe) output[key] = safe
    }
    if (typeof breadcrumb.timestamp === 'number') output.timestamp = breadcrumb.timestamp
    return [output]
  })
}

/**
 * Strip request bodies, headers, cookies, user identity, arbitrary messages,
 * local variables and unknown tags before an event leaves Instatic.
 */
export function redactMonitoringEvent<T extends object>(event: T): T {
  const input = event as UnknownRecord
  const output: UnknownRecord = {}
  for (const key of ['event_id', 'timestamp', 'platform', 'level', 'release', 'environment'] as const) {
    if (typeof input[key] === 'string' || typeof input[key] === 'number') output[key] = input[key]
  }
  const exception = safeException(input.exception)
  const request = safeRequest(input.request)
  const tags = safeTags(input.tags)
  const contexts = safeContexts(input.contexts)
  const breadcrumbs = safeBreadcrumbs(input.breadcrumbs)
  const transaction = safeMonitoringRoute(input.transaction)
  if (exception) output.exception = exception
  if (request) output.request = request
  if (tags) output.tags = tags
  if (contexts) output.contexts = contexts
  if (breadcrumbs) output.breadcrumbs = breadcrumbs
  if (transaction) output.transaction = transaction
  return output as T
}

export function redactMonitoringBreadcrumb<T extends object>(breadcrumb: T): T | null {
  return (safeBreadcrumbs([breadcrumb])?.[0] as T | undefined) ?? null
}
