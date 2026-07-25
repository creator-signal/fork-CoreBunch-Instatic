import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { DbClient } from '../../../server/db'
import { handleCmsRequest } from '../../../server/handlers/cms'
import { createTestDb } from '../helpers/createTestDb'

const EMAIL = 'deployment-owner@example.com'
const originalToken = process.env.INSTATIC_DEPLOYMENT_TOKEN
const originalOwnerEmail = process.env.INSTATIC_BOOTSTRAP_OWNER_EMAIL

async function setup(db: DbClient): Promise<void> {
  const response = await handleCmsRequest(
    new Request('http://localhost/admin/api/cms/setup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        siteName: 'Deployment auth test',
        email: EMAIL,
        password: 'deployment-owner-password',
      }),
    }),
    db,
  )
  expect(response.status).toBe(201)
}

describe('deployment verification authentication', () => {
  let testDb: { db: DbClient; cleanup: () => Promise<void> }

  beforeEach(async () => {
    process.env.INSTATIC_DEPLOYMENT_TOKEN = 'deployment-token-with-sufficient-entropy'
    process.env.INSTATIC_BOOTSTRAP_OWNER_EMAIL = EMAIL
    testDb = await createTestDb()
    await setup(testDb.db)
  })

  afterEach(async () => {
    await testDb.cleanup()
    if (originalToken === undefined) delete process.env.INSTATIC_DEPLOYMENT_TOKEN
    else process.env.INSTATIC_DEPLOYMENT_TOKEN = originalToken
    if (originalOwnerEmail === undefined) delete process.env.INSTATIC_BOOTSTRAP_OWNER_EMAIL
    else process.env.INSTATIC_BOOTSTRAP_OWNER_EMAIL = originalOwnerEmail
  })

  it('rejects an invalid bearer without creating a CMS session', async () => {
    const response = await handleCmsRequest(
      new Request('http://localhost/admin/api/cms/auth/deployment-session', {
        method: 'POST',
        headers: {
          authorization: 'Bearer wrong-token',
          origin: 'http://localhost',
        },
      }),
      testDb.db,
    )
    expect(response.status).toBe(401)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('mints a five-minute owner session for the deployment gate', async () => {
    const response = await handleCmsRequest(
      new Request('http://localhost/admin/api/cms/auth/deployment-session', {
        method: 'POST',
        headers: {
          authorization: 'Bearer deployment-token-with-sufficient-entropy',
          origin: 'http://localhost',
        },
      }),
      testDb.db,
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain('instatic_admin_session=')
    expect(response.headers.get('set-cookie')).toContain('Path=/admin')
    const { rows } = await testDb.db<{
      expires_at: Date | string
      step_up_expires_at: Date | string | null
    }>`
      select expires_at, step_up_expires_at
      from sessions
      where revoked_at is null
      order by created_at desc
      limit 1
    `
    expect(rows[0]?.step_up_expires_at).not.toBeNull()
    expect(new Date(rows[0]!.step_up_expires_at!).getTime())
      .toBe(new Date(rows[0]!.expires_at).getTime())
  })
})
