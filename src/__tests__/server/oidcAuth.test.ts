import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import {
  configuredAdminAuthMode,
  newOidcAuthorizationMaterial,
  oidcAuthorizationUrl,
  oidcIssuer,
  oidcSessionTtlSeconds,
  safeAdminReturnTo,
  signOidcState,
  verifyOidcState,
} from '../../../server/auth/oidc'

const ORIGINAL_ENV = { ...process.env }

function configureOidc(): void {
  process.env.NODE_ENV = 'test'
  process.env.INSTATIC_AUTH_MODE = 'zitadel'
  process.env.INSTATIC_OIDC_ISSUER = 'http://auth.localhost:48080'
  process.env.INSTATIC_OIDC_CLIENT_ID = 'instatic-client'
  process.env.INSTATIC_OIDC_CLIENT_SECRET = 'instatic-client-secret'
  process.env.INSTATIC_OIDC_PROJECT_ID = 'project-id'
  process.env.INSTATIC_OIDC_REDIRECT_URI = 'http://localhost:4330/admin/api/cms/auth/oidc/callback'
  process.env.INSTATIC_OIDC_SESSION_TTL_SECONDS = '3600'
}

describe('Zitadel OIDC admin authentication', () => {
  beforeEach(() => {
    configureOidc()
  })

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in ORIGINAL_ENV)) delete process.env[key]
    }
    Object.assign(process.env, ORIGINAL_ENV)
  })

  it('fails closed to native mode unless Zitadel is explicitly selected', () => {
    expect(configuredAdminAuthMode()).toBe('zitadel')
    delete process.env.INSTATIC_AUTH_MODE
    expect(configuredAdminAuthMode()).toBe('native')
  })

  it('signs, expires, and constant-time validates the login state cookie', () => {
    const token = signOidcState({
      state: 'expected-state',
      verifier: 'verifier',
      nonce: 'nonce',
      returnTo: '/admin/site?panel=pages',
    })
    const state = verifyOidcState(token, 'expected-state')
    expect(state?.returnTo).toBe('/admin/site?panel=pages')
    expect(verifyOidcState(`${token}x`, 'expected-state')).toBeNull()
    expect(verifyOidcState(token, 'different-state')).toBeNull()
    expect(verifyOidcState(token, 'expected-state', Date.now() + 11 * 60_000)).toBeNull()
  })

  it('allows only same-site admin return paths', () => {
    expect(safeAdminReturnTo('/admin/content?tab=pages')).toBe('/admin/content?tab=pages')
    expect(safeAdminReturnTo('/contact')).toBe('/admin')
    expect(safeAdminReturnTo('//example.com/admin')).toBe('/admin')
    expect(safeAdminReturnTo('/admin\\example.com')).toBe('/admin')
  })

  it('builds an authorization-code + PKCE request with project role scopes', async () => {
    const material = newOidcAuthorizationMaterial()
    const fetcher = async () => new Response(JSON.stringify({
      issuer: 'http://auth.localhost:48080',
      authorization_endpoint: 'http://auth.localhost:48080/oauth/v2/authorize',
      token_endpoint: 'http://auth.localhost:48080/oauth/v2/token',
      userinfo_endpoint: 'http://auth.localhost:48080/oidc/v1/userinfo',
      jwks_uri: 'http://auth.localhost:48080/oauth/v2/keys',
      end_session_endpoint: 'http://auth.localhost:48080/oidc/v1/end_session',
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })

    const url = await oidcAuthorizationUrl(material, fetcher)
    expect(url.origin).toBe('http://auth.localhost:48080')
    expect(url.pathname).toBe('/oauth/v2/authorize')
    expect(url.searchParams.get('client_id')).toBe('instatic-client')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:4330/admin/api/cms/auth/oidc/callback',
    )
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toBe(material.challenge)
    expect(url.searchParams.get('state')).toBe(material.state)
    expect(url.searchParams.get('nonce')).toBe(material.nonce)
    expect(url.searchParams.get('scope')).toContain(
      'urn:zitadel:iam:org:project:id:project-id:aud',
    )
    expect(url.searchParams.get('scope')).toContain('urn:zitadel:iam:org:project:roles')
  })

  it('permits HTTP only for local production-image acceptance', () => {
    process.env.NODE_ENV = 'production'
    expect(oidcIssuer()).toBe('http://auth.localhost:48080')
    process.env.INSTATIC_OIDC_ISSUER = 'http://identity.example.test'
    expect(() => oidcIssuer()).toThrow(
      'INSTATIC_OIDC_ISSUER may use HTTP only on a local hostname',
    )
  })

  it('bounds the OIDC-backed Instatic session lifetime', () => {
    expect(oidcSessionTtlSeconds()).toBe(3600)
    process.env.INSTATIC_OIDC_SESSION_TTL_SECONDS = '86400'
    expect(() => oidcSessionTtlSeconds()).toThrow(
      'INSTATIC_OIDC_SESSION_TTL_SECONDS must be between 300 and 43200',
    )
  })
})
