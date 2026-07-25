import { readFileSync } from 'node:fs'
import type { PluginSettingsValues } from '@core/plugin-sdk'

export interface StarterSiteConfig {
  siteName: string
  ownerEmail: string
  ownerPassword: string
  pluginPackagePath: string
  pluginSettings: PluginSettingsValues
}

interface ServerConfig {
  port: number
  databaseUrl: string
  uploadsDir: string
  staticDir: string
  trustedProxyCidrs: string[]
  publicOrigins: string[]
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
  const minioEndpoint = env.MINIO_ENDPOINT?.trim()
  const minioBucket = env.MINIO_BUCKET?.trim()
  const minioAccessKey = readSecretValue(env, 'MINIO_ACCESS_KEY', 'MINIO_ACCESS_KEY_FILE')
  const minioSecretKey = readSecretValue(env, 'MINIO_SECRET_KEY', 'MINIO_SECRET_KEY_FILE')
  const minioValues = [minioEndpoint, minioBucket, minioAccessKey, minioSecretKey]
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
    uploadsDir: env.UPLOADS_DIR ?? './uploads',
    staticDir: env.STATIC_DIR ?? './dist',
    trustedProxyCidrs: readCsvList(env.TRUSTED_PROXY_CIDRS),
    publicOrigins: resolvePublicOrigins(env),
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
