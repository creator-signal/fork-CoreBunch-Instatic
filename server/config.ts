import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { PluginSettingsValues } from '@core/plugin-sdk'
import type { AttachmentPolicy } from '@core/attachments'
import { SUPPORTED_ATTACHMENT_MIME_TYPES } from './attachments/validation'

export interface StarterSiteConfig {
  siteName: string
  ownerEmail: string
  ownerPassword: string
  pluginPackagePath: string
  pluginSettings: PluginSettingsValues
}

export interface MonitoringTargetConfig {
  dsn: string
  environment: string
  release?: string
}

interface ServerConfig {
  port: number
  databaseUrl: string
  uploadsDir: string
  staticDir: string
  trustedProxyCidrs: string[]
  publicOrigins: string[]
  publicConnectOrigins: string[]
  monitoring: {
    adminBrowser: MonitoringTargetConfig | null
    server: MonitoringTargetConfig | null
  }
  attachments: {
    directory: string
    scannerUrl: string | null
    scannerToken: string | null
    policy: AttachmentPolicy
  }
  formDrafts: {
    enabled: boolean
    ttlDays: number
    maxBytes: number
  }
  minio: {
    endpoint: string
    publicBaseUrl: string
    bucket: string
    region: string
    prefix: string
    accessKey: string
    secretKey: string
  } | null
  starterSite: StarterSiteConfig | null
}

function readSecretValue(
  env: Record<string, string | undefined>,
  valueName: string,
  fileName: string,
): string | undefined {
  const direct = env[valueName]?.trim()
  if (direct) return direct
  const path = env[fileName]?.trim()
  if (!path) return undefined
  const value = readFileSync(path, 'utf8').trim()
  if (!value) throw new Error(`${fileName} points to an empty file`)
  return value
}

function readCsvList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function readPositiveInteger(
  value: string | undefined,
  fallback: number,
  name: string,
  bounds: { minimum?: number; maximum?: number } = {},
): number {
  if (!value?.trim()) return fallback
  const parsed = Number(value)
  const minimum = bounds.minimum ?? 1
  if (
    !Number.isInteger(parsed)
    || parsed < minimum
    || (bounds.maximum !== undefined && parsed > bounds.maximum)
  ) {
    const range = bounds.maximum === undefined
      ? `at least ${minimum}`
      : `between ${minimum} and ${bounds.maximum}`
    throw new Error(`${name} must be an integer ${range}`)
  }
  return parsed
}

function readBoolean(value: string | undefined, fallback = false): boolean {
  if (!value?.trim()) return fallback
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  throw new Error('Boolean configuration must be true/false, yes/no, on/off, or 1/0')
}

function readJsonObjectFile(path: string | undefined, name: string): PluginSettingsValues {
  const trimmedPath = path?.trim()
  if (!trimmedPath) return {}
  const parsed: unknown = JSON.parse(readFileSync(trimmedPath, 'utf8'))
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${name} must contain a JSON object`)
  }
  const settings: PluginSettingsValues = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (
      typeof value !== 'string'
      && typeof value !== 'number'
      && typeof value !== 'boolean'
    ) {
      throw new Error(`${name} setting "${key}" must be a string, number, or boolean`)
    }
    settings[key] = value
  }
  return settings
}

function readMonitoringLabel(
  env: Record<string, string | undefined>,
  name: string,
  fallback?: string,
): string | undefined {
  const value = env[name]?.trim() || fallback
  if (!value) return undefined
  if (value.length > 160 || !/^[a-zA-Z0-9._:/-]+$/.test(value)) {
    throw new Error(`${name} must be a safe release/environment label`)
  }
  return value
}

function readMonitoringDsn(
  env: Record<string, string | undefined>,
  valueName: string,
  fileName: string,
): string | undefined {
  const value = readSecretValue(env, valueName, fileName)
  if (!value) return undefined
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`${valueName} or ${fileName} must contain an absolute GlitchTip DSN`)
  }
  if (
    (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')
    || !parsed.hostname
    || !parsed.username
    || parsed.password
    || parsed.pathname === '/'
    || parsed.search
    || parsed.hash
  ) {
    throw new Error(`${valueName} or ${fileName} must contain a public Sentry-compatible HTTP(S) DSN`)
  }
  return value
}

/**
 * Normalize a raw origin string to a canonical `scheme://host[:port]` form.
 *
 * Parsing goes through the `URL` constructor (no regex, no `as`): the scheme
 * and host are lowercased, an explicit non-default port is preserved, and any
 * path / query / fragment / trailing slash is stripped. Returns `null` for
 * anything the `URL` constructor rejects or that has no usable host.
 *
 * Exported so `server/auth/security.ts` normalizes inbound Origin headers the
 * exact same way it normalized the configured origins — the CSRF comparison is
 * a string equality of two normalized values, so the two paths must agree.
 */
export function normalizeOrigin(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    if (!url.hostname) return null
    const scheme = url.protocol.replace(':', '').toLowerCase()
    const host = url.hostname.toLowerCase()
    const port = url.port ? `:${url.port}` : ''
    return `${scheme}://${host}${port}`
  } catch {
    return null
  }
}

function normalizeOrigins(raw: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const entry of raw) {
    const normalized = normalizeOrigin(entry)
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized)
      out.push(normalized)
    }
  }
  return out
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase()
  return (
    normalized === 'localhost'
    || normalized.endsWith('.localhost')
    || normalized === '127.0.0.1'
    || normalized === '[::1]'
  )
}

function parseConnectOrigin(raw: string, name: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`${name} entry "${raw}" must be an absolute HTTP(S) origin`)
  }
  if (
    (url.protocol !== 'https:' && url.protocol !== 'http:')
    || !url.hostname
    || url.username
    || url.password
    || (url.pathname !== '' && url.pathname !== '/')
    || url.search
    || url.hash
  ) {
    throw new Error(`${name} entry "${raw}" must be an absolute HTTP(S) origin without credentials, path, query, or fragment`)
  }
  return url
}

/**
 * Resolve operator-approved browser-only CSP connection origins.
 *
 * HTTP is accepted only for loopback collectors when the site itself has an
 * HTTP loopback public origin. This supports the integrated local stack
 * without weakening production transport or the plugin sandbox SSRF boundary.
 */
export function resolvePublicConnectOrigins(
  env: Record<string, string | undefined>,
  publicOrigins: readonly string[] = resolvePublicOrigins(env),
): string[] {
  const entries = readCsvList(env.INSTATIC_PUBLIC_CONNECT_ORIGINS)
  if (entries.length === 0) return []

  const permitsLocalHttp = publicOrigins.some((origin) => {
    const parsed = parseConnectOrigin(origin, 'PUBLIC_ORIGIN')
    return parsed.protocol === 'http:' && isLocalHostname(parsed.hostname)
  })
  const normalized = new Set<string>()
  for (const entry of entries) {
    const parsed = parseConnectOrigin(entry, 'INSTATIC_PUBLIC_CONNECT_ORIGINS')
    if (parsed.protocol === 'http:') {
      if (!isLocalHostname(parsed.hostname)) {
        throw new Error('INSTATIC_PUBLIC_CONNECT_ORIGINS requires HTTPS for non-local origins')
      }
      if (!permitsLocalHttp) {
        throw new Error('HTTP localhost collector origins require an HTTP localhost PUBLIC_ORIGIN')
      }
    }
    normalized.add(parsed.origin)
  }
  return [...normalized]
}

/**
 * The set of public origins the CSRF check derives `expectedOrigin` from.
 *
 * Precedence:
 *   1. `PUBLIC_ORIGIN` — comma-separated list (platform domain + custom domain
 *      can coexist). Invalid entries are dropped.
 *   2. Platform auto-detection — `RENDER_EXTERNAL_URL` (full URL) and/or
 *      `https://${RAILWAY_PUBLIC_DOMAIN}` (host only). Both are included when
 *      both env vars are present, keeping one-click deploys config-free.
 *   3. `[]` — no public origin configured; the CSRF check falls back to the
 *      inbound `Host` header.
 */
export function resolvePublicOrigins(env: Record<string, string | undefined>): string[] {
  const explicit = readCsvList(env.PUBLIC_ORIGIN)
  if (explicit.length > 0) {
    return normalizeOrigins(explicit)
  }

  const derived: string[] = []
  if (env.RENDER_EXTERNAL_URL) derived.push(env.RENDER_EXTERNAL_URL)
  if (env.RAILWAY_PUBLIC_DOMAIN) derived.push(`https://${env.RAILWAY_PUBLIC_DOMAIN}`)
  return normalizeOrigins(derived)
}

export function readServerConfig(
  env: Record<string, string | undefined> = process.env,
): ServerConfig {
  const publicOrigins = resolvePublicOrigins(env)
  const monitoringEnvironment = readMonitoringLabel(
    env,
    'INSTATIC_ENVIRONMENT',
    'development',
  )!
  const monitoringRelease = readMonitoringLabel(
    env,
    'INSTATIC_RELEASE',
    env.INSTATIC_BUILD_RELEASE?.trim(),
  )
  const adminBrowserDsn = readMonitoringDsn(
    env,
    'INSTATIC_ADMIN_GLITCHTIP_DSN',
    'INSTATIC_ADMIN_GLITCHTIP_DSN_FILE',
  )
  const serverDsn = readMonitoringDsn(
    env,
    'INSTATIC_SERVER_GLITCHTIP_DSN',
    'INSTATIC_SERVER_GLITCHTIP_DSN_FILE',
  )
  if (adminBrowserDsn && serverDsn && adminBrowserDsn === serverDsn) {
    throw new Error('Instatic Admin browser and server monitoring require separate GlitchTip DSNs')
  }
  const minioEndpoint = env.MINIO_ENDPOINT?.trim()
  const minioBucket = env.MINIO_BUCKET?.trim()
  const minioAccessKey = readSecretValue(env, 'MINIO_ACCESS_KEY', 'MINIO_ACCESS_KEY_FILE')
  const minioSecretKey = readSecretValue(env, 'MINIO_SECRET_KEY', 'MINIO_SECRET_KEY_FILE')
  const minioValues = [minioEndpoint, minioBucket, minioAccessKey, minioSecretKey]
  const uploadsDir = env.UPLOADS_DIR ?? './uploads'
  const configuredAttachmentMimes = readCsvList(env.ATTACHMENT_ALLOWED_MIME_TYPES)
  const allowedAttachmentMimeTypes = configuredAttachmentMimes.length > 0
    ? configuredAttachmentMimes
    : [...SUPPORTED_ATTACHMENT_MIME_TYPES]
  const unsupportedAttachmentMimes = allowedAttachmentMimeTypes.filter(
    (mime) => !SUPPORTED_ATTACHMENT_MIME_TYPES.includes(mime),
  )
  if (unsupportedAttachmentMimes.length > 0) {
    throw new Error(
      `ATTACHMENT_ALLOWED_MIME_TYPES contains unsupported values: ${unsupportedAttachmentMimes.join(', ')}`,
    )
  }
  const hasAnyMinioValue = minioValues.some(Boolean)
  if (hasAnyMinioValue && minioValues.some((value) => !value)) {
    throw new Error(
      'MinIO configuration requires MINIO_ENDPOINT, MINIO_BUCKET, and access/secret key values or files',
    )
  }
  const starterSiteName = env.INSTATIC_BOOTSTRAP_SITE_NAME?.trim()
  const starterOwnerEmail = env.INSTATIC_BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase()
  const starterOwnerPassword = readSecretValue(
    env,
    'INSTATIC_BOOTSTRAP_OWNER_PASSWORD',
    'INSTATIC_BOOTSTRAP_OWNER_PASSWORD_FILE',
  )
  const starterPluginPackage = env.INSTATIC_BOOTSTRAP_PLUGIN_PACKAGE?.trim()
  const starterValues = [
    starterSiteName,
    starterOwnerEmail,
    starterOwnerPassword,
    starterPluginPackage,
    env.INSTATIC_BOOTSTRAP_PLUGIN_SETTINGS_FILE?.trim(),
  ]
  const hasAnyStarterValue = starterValues.some(Boolean)
  if (
    hasAnyStarterValue
    && [starterSiteName, starterOwnerEmail, starterOwnerPassword, starterPluginPackage].some(
      (value) => !value,
    )
  ) {
    throw new Error(
      'Starter-site bootstrap requires site name, owner email, owner password, and plugin package',
    )
  }
  return {
    port: Number(env.PORT ?? 3001),
    databaseUrl: readSecretValue(env, 'DATABASE_URL', 'DATABASE_URL_FILE') ?? 'sqlite:./.tmp/dev.db',
    uploadsDir,
    staticDir: env.STATIC_DIR ?? './dist',
    trustedProxyCidrs: readCsvList(env.TRUSTED_PROXY_CIDRS),
    publicOrigins,
    publicConnectOrigins: resolvePublicConnectOrigins(env, publicOrigins),
    monitoring: {
      adminBrowser: adminBrowserDsn
        ? {
            dsn: adminBrowserDsn,
            environment: monitoringEnvironment,
            ...(monitoringRelease ? { release: monitoringRelease } : {}),
          }
        : null,
      server: serverDsn
        ? {
            dsn: serverDsn,
            environment: monitoringEnvironment,
            ...(monitoringRelease ? { release: monitoringRelease } : {}),
          }
        : null,
    },
    attachments: {
      // Keep private bytes outside UPLOADS_DIR, which is served verbatim at
      // `/uploads/*`. The sibling default works for the normal `/data/uploads`
      // volume layout and remains overrideable for split storage.
      directory: env.ATTACHMENTS_DIR?.trim()
        || resolve(dirname(resolve(uploadsDir)), 'attachments'),
      scannerUrl: env.ATTACHMENT_SCANNER_URL?.trim() || null,
      scannerToken: readSecretValue(
        env,
        'ATTACHMENT_SCANNER_TOKEN',
        'ATTACHMENT_SCANNER_TOKEN_FILE',
      ) ?? null,
      policy: {
        enabled: readBoolean(env.ATTACHMENTS_ENABLED),
        allowedMimeTypes: allowedAttachmentMimeTypes,
        maxFileBytes: readPositiveInteger(
          env.ATTACHMENT_MAX_FILE_BYTES,
          10 * 1024 * 1024,
          'ATTACHMENT_MAX_FILE_BYTES',
        ),
        maxFiles: readPositiveInteger(
          env.ATTACHMENT_MAX_FILES,
          5,
          'ATTACHMENT_MAX_FILES',
          { maximum: 20 },
        ),
        temporaryTtlSeconds: readPositiveInteger(
          env.ATTACHMENT_TEMPORARY_TTL_SECONDS,
          24 * 60 * 60,
          'ATTACHMENT_TEMPORARY_TTL_SECONDS',
          { minimum: 60 },
        ),
        retentionDays: readPositiveInteger(
          env.ATTACHMENT_RETENTION_DAYS,
          90,
          'ATTACHMENT_RETENTION_DAYS',
        ),
      },
    },
    formDrafts: {
      enabled: readBoolean(env.FORM_DRAFTS_ENABLED),
      ttlDays: readPositiveInteger(
        env.FORM_DRAFT_TTL_DAYS,
        30,
        'FORM_DRAFT_TTL_DAYS',
        { maximum: 365 },
      ),
      maxBytes: readPositiveInteger(
        env.FORM_DRAFT_MAX_BYTES,
        256 * 1024,
        'FORM_DRAFT_MAX_BYTES',
        { maximum: 1024 * 1024 },
      ),
    },
    minio: hasAnyMinioValue
      ? {
          endpoint: minioEndpoint!,
          publicBaseUrl: env.MINIO_PUBLIC_BASE_URL?.trim() || '/media',
          bucket: minioBucket!,
          region: env.MINIO_REGION?.trim() || 'us-east-1',
          prefix: env.MINIO_PREFIX?.trim() || '',
          accessKey: minioAccessKey!,
          secretKey: minioSecretKey!,
        }
      : null,
    starterSite: hasAnyStarterValue
      ? {
          siteName: starterSiteName!,
          ownerEmail: starterOwnerEmail!,
          ownerPassword: starterOwnerPassword!,
          pluginPackagePath: starterPluginPackage!,
          pluginSettings: readJsonObjectFile(
            env.INSTATIC_BOOTSTRAP_PLUGIN_SETTINGS_FILE,
            'INSTATIC_BOOTSTRAP_PLUGIN_SETTINGS_FILE',
          ),
        }
      : null,
  }
}
