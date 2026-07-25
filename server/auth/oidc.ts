import {
  createHash,
  createHmac,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
  verify as verifySignature,
} from 'node:crypto'
import { readFileSync } from 'node:fs'
import { Type, safeParseValue, type Static } from '@core/utils/typeboxHelpers'

const OIDC_STATE_TTL_SECONDS = 10 * 60
const DISCOVERY_CACHE_MS = 5 * 60_000
const REQUEST_TIMEOUT_MS = 5_000

const OidcDiscoverySchema = Type.Object({
  issuer: Type.String(),
  authorization_endpoint: Type.String(),
  token_endpoint: Type.String(),
  userinfo_endpoint: Type.String(),
  jwks_uri: Type.String(),
  end_session_endpoint: Type.Optional(Type.String()),
}, { additionalProperties: true })

const TokenResponseSchema = Type.Object({
  access_token: Type.String(),
  id_token: Type.String(),
  token_type: Type.String(),
  expires_in: Type.Number(),
}, { additionalProperties: true })

const IdTokenHeaderSchema = Type.Object({
  alg: Type.String(),
  kid: Type.String(),
}, { additionalProperties: true })

const IdTokenClaimsSchema = Type.Object({
  iss: Type.String(),
  sub: Type.String(),
  aud: Type.Union([Type.String(), Type.Array(Type.String())]),
  exp: Type.Number(),
  iat: Type.Number(),
  nonce: Type.String(),
  email: Type.Optional(Type.String()),
  email_verified: Type.Optional(Type.Boolean()),
  name: Type.Optional(Type.String()),
}, { additionalProperties: true })

const UserInfoSchema = Type.Object({
  sub: Type.String(),
  email: Type.Optional(Type.String()),
  email_verified: Type.Optional(Type.Boolean()),
  name: Type.Optional(Type.String()),
}, { additionalProperties: true })

const JwkSchema = Type.Object({
  kid: Type.Optional(Type.String()),
  alg: Type.Optional(Type.String()),
  use: Type.Optional(Type.String()),
  kty: Type.String(),
  n: Type.Optional(Type.String()),
  e: Type.Optional(Type.String()),
}, { additionalProperties: true })

const JwkSetSchema = Type.Object({
  keys: Type.Array(JwkSchema),
}, { additionalProperties: true })

const OidcStateSchema = Type.Object({
  state: Type.String(),
  verifier: Type.String(),
  nonce: Type.String(),
  returnTo: Type.String(),
  expiresAt: Type.Number(),
})

type OidcDiscovery = Static<typeof OidcDiscoverySchema>
type IdTokenClaims = Static<typeof IdTokenClaimsSchema>
type OidcState = Static<typeof OidcStateSchema>
type JwkSet = Static<typeof JwkSetSchema>

export interface OidcIdentity {
  issuer: string
  subject: string
  email: string
  displayName: string
  roles: string[]
}

export class OidcRoleRequiredError extends Error {
  constructor() {
    super('The required Zitadel role is missing')
    this.name = 'OidcRoleRequiredError'
  }
}

const discoveryCache = new Map<string, { expiresAt: number; value: OidcDiscovery }>()
const jwksCache = new Map<string, { expiresAt: number; value: JwkSet }>()

export function configuredAdminAuthMode(
  env: Record<string, string | undefined> = process.env,
): 'native' | 'zitadel' {
  return env.INSTATIC_AUTH_MODE?.trim() === 'zitadel' ? 'zitadel' : 'native'
}

function requiredValue(name: string, env: Record<string, string | undefined> = process.env): string {
  const value = env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

function requiredSecret(
  valueName: string,
  fileName: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const direct = env[valueName]?.trim()
  if (direct) return direct
  const path = env[fileName]?.trim()
  if (!path) throw new Error(`${valueName} or ${fileName} is required`)
  const value = readFileSync(path, 'utf8').trim()
  if (!value) throw new Error(`${fileName} points to an empty file`)
  return value
}

function requiredUrl(
  value: string,
  name: string,
): URL {
  const url = new URL(value)
  if (url.protocol === 'http:') {
    const allowed = ['localhost', '127.0.0.1', 'auth.localhost']
    if (!allowed.includes(url.hostname)) {
      throw new Error(`${name} may use HTTP only on a local hostname`)
    }
  } else if (url.protocol !== 'https:') {
    throw new Error(`${name} must use HTTP or HTTPS`)
  }
  return url
}

export function oidcIssuer(env: Record<string, string | undefined> = process.env): string {
  return requiredUrl(
    requiredValue('INSTATIC_OIDC_ISSUER', env),
    'INSTATIC_OIDC_ISSUER',
  ).toString().replace(/\/$/, '')
}

export function oidcClientId(env: Record<string, string | undefined> = process.env): string {
  return requiredSecret(
    'INSTATIC_OIDC_CLIENT_ID',
    'INSTATIC_OIDC_CLIENT_ID_FILE',
    env,
  )
}

function oidcClientSecret(env: Record<string, string | undefined> = process.env): string {
  return requiredSecret(
    'INSTATIC_OIDC_CLIENT_SECRET',
    'INSTATIC_OIDC_CLIENT_SECRET_FILE',
    env,
  )
}

export function oidcProjectId(env: Record<string, string | undefined> = process.env): string {
  return requiredSecret(
    'INSTATIC_OIDC_PROJECT_ID',
    'INSTATIC_OIDC_PROJECT_ID_FILE',
    env,
  )
}

export function oidcRequiredRole(
  env: Record<string, string | undefined> = process.env,
): string {
  return env.INSTATIC_OIDC_REQUIRED_ROLE?.trim() || 'platform:operator'
}

export function oidcOwnerRole(
  env: Record<string, string | undefined> = process.env,
): string {
  return env.INSTATIC_OIDC_OWNER_ROLE?.trim() || 'platform:owner'
}

export function oidcRedirectUri(
  env: Record<string, string | undefined> = process.env,
): string {
  return requiredUrl(
    requiredValue('INSTATIC_OIDC_REDIRECT_URI', env),
    'INSTATIC_OIDC_REDIRECT_URI',
  ).toString()
}

export function oidcSessionTtlSeconds(
  env: Record<string, string | undefined> = process.env,
): number {
  const value = Number(env.INSTATIC_OIDC_SESSION_TTL_SECONDS ?? 3_600)
  if (!Number.isInteger(value) || value < 300 || value > 43_200) {
    throw new Error('INSTATIC_OIDC_SESSION_TTL_SECONDS must be between 300 and 43200')
  }
  return value
}

export function safeAdminReturnTo(value: string | null | undefined): string {
  if (!value?.startsWith('/admin') || value.startsWith('//') || value.includes('\\')) {
    return '/admin'
  }
  return value
}

function parseJson<T extends ReturnType<typeof Type.Object>>(
  raw: string,
  schema: T,
  message: string,
): Static<T> {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new Error(message)
  }
  const parsed = safeParseValue(schema, value)
  if (!parsed.ok) throw new Error(message)
  return parsed.value
}

async function parseResponse<T extends ReturnType<typeof Type.Object>>(
  response: Response,
  schema: T,
  purpose: string,
): Promise<Static<T>> {
  if (!response.ok) throw new Error(`${purpose} failed with HTTP ${response.status}`)
  return parseJson(await response.text(), schema, `${purpose} returned malformed JSON`)
}

export async function discoverOidc(
  fetcher: typeof fetch = fetch,
): Promise<OidcDiscovery> {
  const expectedIssuer = oidcIssuer()
  const cached = discoveryCache.get(expectedIssuer)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const value = await parseResponse(
    await fetcher(`${expectedIssuer}/.well-known/openid-configuration`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }),
    OidcDiscoverySchema,
    'Zitadel discovery',
  )
  if (value.issuer !== expectedIssuer) {
    throw new Error('Zitadel discovery issuer does not match configuration')
  }
  const issuerOrigin = new URL(expectedIssuer).origin
  for (const endpoint of [
    value.authorization_endpoint,
    value.token_endpoint,
    value.userinfo_endpoint,
    value.jwks_uri,
  ]) {
    if (new URL(endpoint).origin !== issuerOrigin) {
      throw new Error('Zitadel discovery returned an endpoint on an unexpected origin')
    }
  }
  if (value.end_session_endpoint && new URL(value.end_session_endpoint).origin !== issuerOrigin) {
    throw new Error('Zitadel discovery returned a logout endpoint on an unexpected origin')
  }
  discoveryCache.set(expectedIssuer, {
    expiresAt: Date.now() + DISCOVERY_CACHE_MS,
    value,
  })
  return value
}

export function newOidcAuthorizationMaterial(): {
  state: string
  verifier: string
  nonce: string
  challenge: string
} {
  const verifier = randomBytes(48).toString('base64url')
  return {
    state: randomBytes(32).toString('base64url'),
    verifier,
    nonce: randomBytes(32).toString('base64url'),
    challenge: createHash('sha256').update(verifier, 'ascii').digest('base64url'),
  }
}

export async function oidcAuthorizationUrl(
  input: { state: string; nonce: string; challenge: string },
  fetcher: typeof fetch = fetch,
): Promise<URL> {
  const configuration = await discoverOidc(fetcher)
  const url = new URL(configuration.authorization_endpoint)
  const projectId = oidcProjectId()
  url.search = new URLSearchParams({
    client_id: oidcClientId(),
    redirect_uri: oidcRedirectUri(),
    response_type: 'code',
    scope: [
      'openid',
      'profile',
      'email',
      `urn:zitadel:iam:org:project:id:${projectId}:aud`,
      'urn:zitadel:iam:org:project:roles',
    ].join(' '),
    code_challenge: input.challenge,
    code_challenge_method: 'S256',
    state: input.state,
    nonce: input.nonce,
  }).toString()
  return url
}

function stateSignature(payload: string): Buffer {
  return createHmac('sha256', oidcClientSecret()).update(payload).digest()
}

export function signOidcState(input: Omit<OidcState, 'expiresAt'>): string {
  const payload = Buffer.from(JSON.stringify({
    ...input,
    returnTo: safeAdminReturnTo(input.returnTo),
    expiresAt: Date.now() + OIDC_STATE_TTL_SECONDS * 1_000,
  })).toString('base64url')
  return `${payload}.${stateSignature(payload).toString('base64url')}`
}

export function verifyOidcState(token: string, state: string, now = Date.now()): OidcState | null {
  const [payload, signature, extra] = token.split('.')
  if (!payload || !signature || extra !== undefined) return null
  const actual = Buffer.from(signature, 'base64url')
  const expected = stateSignature(payload)
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
  let parsed: OidcState
  try {
    parsed = parseJson(
      Buffer.from(payload, 'base64url').toString('utf8'),
      OidcStateSchema,
      'Invalid OIDC state',
    )
  } catch {
    return null
  }
  const stateBytes = Buffer.from(state)
  const storedBytes = Buffer.from(parsed.state)
  if (
    parsed.expiresAt <= now
    || stateBytes.length !== storedBytes.length
    || !timingSafeEqual(stateBytes, storedBytes)
  ) {
    return null
  }
  return parsed
}

function decodeJwtPart<T extends ReturnType<typeof Type.Object>>(
  part: string,
  schema: T,
): Static<T> {
  return parseJson(
    Buffer.from(part, 'base64url').toString('utf8'),
    schema,
    'Zitadel returned a malformed ID token',
  )
}

async function loadJwks(
  url: string,
  fetcher: typeof fetch,
  forceRefresh = false,
): Promise<JwkSet> {
  const cached = jwksCache.get(url)
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.value
  const value = await parseResponse(
    await fetcher(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }),
    JwkSetSchema,
    'Zitadel signing-key retrieval',
  )
  jwksCache.set(url, { expiresAt: Date.now() + DISCOVERY_CACHE_MS, value })
  return value
}

export async function verifyOidcIdToken(
  token: string,
  expectedNonce: string,
  configuration: OidcDiscovery,
  fetcher: typeof fetch = fetch,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<IdTokenClaims> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Zitadel returned a malformed ID token')
  const header = decodeJwtPart(parts[0], IdTokenHeaderSchema)
  const claims = decodeJwtPart(parts[1], IdTokenClaimsSchema)
  if (header.alg !== 'RS256') throw new Error('Zitadel ID token uses an unsupported signature')

  let keys = await loadJwks(configuration.jwks_uri, fetcher)
  let key = keys.keys.find((candidate) => (
    candidate.kid === header.kid && (!candidate.use || candidate.use === 'sig')
  ))
  if (!key) {
    keys = await loadJwks(configuration.jwks_uri, fetcher, true)
    key = keys.keys.find((candidate) => (
      candidate.kid === header.kid && (!candidate.use || candidate.use === 'sig')
    ))
  }
  if (!key) throw new Error('Zitadel ID token signing key was not found')

  const valid = verifySignature(
    'RSA-SHA256',
    Buffer.from(`${parts[0]}.${parts[1]}`, 'ascii'),
    createPublicKey({ key, format: 'jwk' }),
    Buffer.from(parts[2], 'base64url'),
  )
  if (!valid) throw new Error('Zitadel ID token signature is invalid')
  if (claims.iss !== oidcIssuer() || claims.iss !== configuration.issuer) {
    throw new Error('Zitadel ID token issuer is invalid')
  }
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  if (!audiences.includes(oidcClientId())) {
    throw new Error('Zitadel ID token audience is invalid')
  }
  if (claims.nonce !== expectedNonce) throw new Error('Zitadel ID token nonce is invalid')
  if (claims.exp <= nowSeconds - 30) throw new Error('Zitadel ID token has expired')
  if (claims.iat > nowSeconds + 60) throw new Error('Zitadel ID token issue time is invalid')
  return claims
}

function rolesFromClaims(claims: Record<string, unknown>): string[] {
  const roleClaim = claims[`urn:zitadel:iam:org:project:${oidcProjectId()}:roles`]
  if (!roleClaim || typeof roleClaim !== 'object' || Array.isArray(roleClaim)) return []
  return Object.keys(roleClaim).sort()
}

export async function exchangeOidcAuthorizationCode(
  code: string,
  verifier: string,
  expectedNonce: string,
  fetcher: typeof fetch = fetch,
): Promise<OidcIdentity> {
  const configuration = await discoverOidc(fetcher)
  const credentials = Buffer.from(`${oidcClientId()}:${oidcClientSecret()}`).toString('base64')
  const token = await parseResponse(
    await fetcher(configuration.token_endpoint, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Basic ${credentials}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: oidcRedirectUri(),
        code_verifier: verifier,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }),
    TokenResponseSchema,
    'Zitadel token exchange',
  )
  if (token.token_type.toLowerCase() !== 'bearer') {
    throw new Error('Zitadel returned an unsupported token type')
  }

  const claims = await verifyOidcIdToken(
    token.id_token,
    expectedNonce,
    configuration,
    fetcher,
  )
  const userinfo = await parseResponse(
    await fetcher(configuration.userinfo_endpoint, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${token.access_token}`,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }),
    UserInfoSchema,
    'Zitadel userinfo retrieval',
  )
  if (userinfo.sub !== claims.sub) {
    throw new Error('Zitadel userinfo subject does not match the ID token')
  }

  const claimRecord: Record<string, unknown> = claims
  const userinfoRecord: Record<string, unknown> = userinfo
  const roles = [...new Set([
    ...rolesFromClaims(claimRecord),
    ...rolesFromClaims(userinfoRecord),
  ])].sort()
  if (!roles.includes(oidcRequiredRole())) throw new OidcRoleRequiredError()

  const email = userinfo.email ?? claims.email
  const emailVerified = userinfo.email_verified ?? claims.email_verified ?? false
  if (!email || !emailVerified) throw new Error('Zitadel email must be verified')
  return {
    issuer: claims.iss,
    subject: claims.sub,
    email: email.trim().toLowerCase(),
    displayName: (userinfo.name ?? claims.name ?? email).trim(),
    roles,
  }
}

export async function oidcEndSessionUrl(fetcher: typeof fetch = fetch): Promise<URL> {
  const configuration = await discoverOidc(fetcher)
  const url = new URL(
    configuration.end_session_endpoint ?? `${oidcIssuer()}/oidc/v1/end_session`,
  )
  url.searchParams.set('client_id', oidcClientId())
  url.searchParams.set('post_logout_redirect_uri', new URL('/admin', oidcRedirectUri()).toString())
  return url
}
