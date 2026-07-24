import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  __resetMasterKeyCacheForTesting,
  getMasterKeyFingerprint,
} from '../../../server/secrets/masterKey'

describe('mounted master-key file', () => {
  const original = {
    nodeEnv: process.env.NODE_ENV,
    direct: process.env.INSTATIC_SECRET_KEY,
    file: process.env.INSTATIC_SECRET_KEY_FILE,
  }
  let temporaryDirectory = ''

  beforeEach(() => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), 'instatic-master-key-'))
    delete process.env.INSTATIC_SECRET_KEY
    process.env.NODE_ENV = 'production'
    __resetMasterKeyCacheForTesting()
  })

  afterEach(() => {
    if (original.nodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = original.nodeEnv
    if (original.direct === undefined) delete process.env.INSTATIC_SECRET_KEY
    else process.env.INSTATIC_SECRET_KEY = original.direct
    if (original.file === undefined) delete process.env.INSTATIC_SECRET_KEY_FILE
    else process.env.INSTATIC_SECRET_KEY_FILE = original.file
    __resetMasterKeyCacheForTesting()
    rmSync(temporaryDirectory, { recursive: true, force: true })
  })

  it('loads a production key from INSTATIC_SECRET_KEY_FILE', async () => {
    const keyBytes = new Uint8Array(32).fill(7)
    const keyPath = join(temporaryDirectory, 'secret-key')
    writeFileSync(keyPath, Buffer.from(keyBytes).toString('base64'))
    process.env.INSTATIC_SECRET_KEY_FILE = keyPath

    const digest = await crypto.subtle.digest('SHA-256', keyBytes)
    const expectedFingerprint = Buffer.from(digest).toString('hex').slice(0, 16)

    await expect(getMasterKeyFingerprint()).resolves.toBe(expectedFingerprint)
  })
})
