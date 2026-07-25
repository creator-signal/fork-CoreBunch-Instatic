import { describe, expect, it } from 'bun:test'
import { oidcAdminLoginPath } from '../../admin/preauth/useAdminBoot'

describe('oidcAdminLoginPath', () => {
  it('preserves an admin route and query as the post-login destination', () => {
    expect(oidcAdminLoginPath('/admin/pages', '?site=default')).toBe(
      '/admin/api/cms/auth/oidc/login?returnTo=%2Fadmin%2Fpages%3Fsite%3Ddefault',
    )
  })

  it('rejects destinations outside the admin application', () => {
    expect(oidcAdminLoginPath('//example.com', '')).toBe(
      '/admin/api/cms/auth/oidc/login?returnTo=%2Fadmin',
    )
  })
})
