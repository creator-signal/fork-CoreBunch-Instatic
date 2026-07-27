import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createTestDb, type TestDb } from '../helpers/createTestDb'
import { createDataRow, createDataTable } from '../../../server/repositories/data'
import { createLocalAttachmentStorage } from '../../../server/attachments/localStorage'
import {
  configureAttachmentRuntime,
  resetAttachmentRuntime,
} from '../../../server/attachments/runtime'
import {
  retryAttachmentScan,
  sweepExpiredAttachments,
  uploadAndScanAttachment,
} from '../../../server/attachments/service'
import {
  getAttachmentRecord,
  getDownloadableAttachment,
} from '../../../server/attachments/repository'
import {
  claimPreparedAttachments,
  prepareAttachmentClaims,
} from '../../../server/attachments/forms'
import type { AttachmentScanner } from '../../../server/attachments/types'
import { handleAttachmentAdminRoutes } from '../../../server/handlers/cms/attachments'
import { createCapabilityTestHarness } from '../helpers/capabilityHarness'
import { handlePublicFormRequest } from '../../../server/forms/handler'
import {
  issuePublicFormPageToken,
  resetPublicFormChallenges,
} from '../../../server/forms/challenge'
import {
  publicAttachmentPerFormRateLimit,
  publicAttachmentPerIpRateLimit,
  publicFormPerFormRateLimit,
  publicFormPerIpRateLimit,
} from '../../../server/forms/rateLimit'

const PDF_BYTES = new TextEncoder().encode('%PDF-1.7\nsafe test document\n%%EOF')

const cleanScanner: AttachmentScanner = {
  id: 'test-clean',
  async health() {
    return { health: 'available' }
  },
  async scan() {
    return { status: 'clean' }
  },
}

const unavailableScanner: AttachmentScanner = {
  id: 'test-unavailable',
  async health() {
    return { health: 'unavailable', message: 'scanner offline' }
  },
  async scan() {
    return { status: 'unavailable', reason: 'scanner offline' }
  },
}

const policy = {
  enabled: true,
  allowedMimeTypes: ['application/pdf'],
  maxFileBytes: 1024 * 1024,
  maxFiles: 3,
  temporaryTtlSeconds: 3600,
  retentionDays: 30,
}

const cleanups: Array<() => Promise<void>> = []

afterEach(async () => {
  resetAttachmentRuntime()
  while (cleanups.length > 0) await cleanups.pop()?.()
})

async function harness(scanner: AttachmentScanner): Promise<{
  testDb: TestDb
  storageDir: string
}> {
  const testDb = await createTestDb()
  const storageDir = await mkdtemp(join(tmpdir(), 'instatic-private-attachments-'))
  cleanups.push(async () => rm(storageDir, { recursive: true, force: true }))
  cleanups.push(testDb.cleanup)
  await testDb.db`
    insert into site (id, name, settings_json)
    values (${'default'}, ${'Attachment test'}, ${{}})
    on conflict (id) do nothing
  `
  configureAttachmentRuntime({
    policy,
    storage: createLocalAttachmentStorage(storageDir),
    scanner,
  })
  return { testDb, storageDir }
}

function pdf(name = 'document.pdf'): File {
  return new File([PDF_BYTES], name, { type: 'application/pdf' })
}

describe('private attachment lifecycle', () => {
  it('recovers idempotently when storage activation finishes before persistence', async () => {
    const storageDir = await mkdtemp(join(tmpdir(), 'instatic-activation-recovery-'))
    cleanups.push(async () => rm(storageDir, { recursive: true, force: true }))
    const storage = createLocalAttachmentStorage(storageDir)
    const quarantinePath = await storage.putQuarantined({
      siteId: 'default',
      attachmentId: 'recovery-test',
      extension: '.pdf',
      bytes: PDF_BYTES,
    })
    const activePath = await storage.activate(quarantinePath)

    expect(await storage.activate(activePath)).toBe(activePath)
    expect(await storage.activate(quarantinePath)).toBe(activePath)
    expect(await storage.read(quarantinePath)).toEqual(PDF_BYTES)
    await storage.delete(quarantinePath)
    await expect(storage.read(activePath)).rejects.toThrow()
  })

  it('activates only a clean scan and claims a scoped opaque reference', async () => {
    const { testDb } = await harness(cleanScanner)
    const uploaded = await uploadAndScanAttachment(testDb.db, {
      file: pdf(),
      siteId: 'default',
      pageId: 'page-home',
      formId: 'contact',
      fieldId: 'documents',
    })
    expect(uploaded.ok).toBe(true)
    if (!uploaded.ok) throw new Error(uploaded.message)

    const record = await getAttachmentRecord(testDb.db, uploaded.attachment.id)
    expect(record).toMatchObject({
      siteId: 'default',
      status: 'active',
      scanStatus: 'clean',
      storageAdapterId: 'local-private',
    })
    expect(record?.storagePath).toContain('/active.pdf')

    const table = await createDataTable(testDb.db, {
      id: 'contact_submissions',
      name: 'Contact submissions',
      slug: 'contact-submissions',
      singularLabel: 'Submission',
      pluralLabel: 'Submissions',
      primaryFieldId: 'documents',
      fields: [{
        type: 'attachment',
        id: 'documents',
        label: 'Documents',
        required: true,
      }],
    })
    const prepared = prepareAttachmentClaims({
      table,
      controls: [{
        nodeId: 'file-node',
        fieldId: 'documents',
        name: 'documents',
        inputType: 'file',
        required: true,
        maxFiles: 1,
      }],
      values: { documents: uploaded.attachment.reference },
      siteId: 'default',
      pageId: 'page-home',
      formId: 'contact',
      policyMaxFiles: 3,
    })
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) throw new Error('reference preparation failed')

    const wrongScope = prepareAttachmentClaims({
      table,
      controls: [{
        nodeId: 'file-node',
        fieldId: 'documents',
        name: 'documents',
        inputType: 'file',
      }],
      values: { documents: uploaded.attachment.reference },
      siteId: 'default',
      pageId: 'another-page',
      formId: 'contact',
      policyMaxFiles: 3,
    })
    if (!wrongScope.ok) throw new Error('wrong-scope reference preparation failed')
    expect(await claimPreparedAttachments(testDb.db, wrongScope.claims, {
      dataRowId: 'not-created',
      retentionDays: 30,
    })).toBe(false)

    const rowId = 'submission-1'
    await testDb.db.transaction(async (tx) => {
      await createDataRow(tx, {
        id: rowId,
        tableId: table.id,
        cells: prepared.values,
        slug: '',
      })
      expect(await claimPreparedAttachments(tx, prepared.claims, {
        dataRowId: rowId,
        retentionDays: 30,
      })).toBe(true)
    })

    expect(await getDownloadableAttachment(
      testDb.db,
      uploaded.attachment.id,
      new Date().toISOString(),
    )).toMatchObject({
      status: 'claimed',
      dataRowId: rowId,
    })
  })

  it('keeps scanner outages quarantined and supports a scoped retry', async () => {
    const { testDb, storageDir } = await harness(unavailableScanner)
    const uploaded = await uploadAndScanAttachment(testDb.db, {
      file: pdf('retry.pdf'),
      siteId: 'default',
      pageId: 'page-home',
      formId: 'contact',
      fieldId: 'documents',
    })
    expect(uploaded).toMatchObject({
      ok: false,
      status: 503,
      code: 'scanner_unavailable',
    })
    if (uploaded.ok || !uploaded.retry) throw new Error('retry metadata missing')
    const quarantined = await getAttachmentRecord(testDb.db, uploaded.retry.uploadId)
    expect(quarantined).toMatchObject({
      status: 'quarantined',
      scanStatus: 'unavailable',
    })
    expect(quarantined?.storagePath).toContain('/quarantine.pdf')
    expect(quarantined?.storagePath?.startsWith(storageDir)).toBe(false)

    expect(await retryAttachmentScan(testDb.db, {
      uploadId: uploaded.retry.uploadId,
      retryToken: 'wrong-token',
      siteId: 'default',
      pageId: 'page-home',
      formId: 'contact',
      fieldId: 'documents',
    })).toMatchObject({
      ok: false,
      status: 404,
      code: 'attachment_not_found',
    })

    configureAttachmentRuntime({
      policy,
      storage: createLocalAttachmentStorage(storageDir),
      scanner: cleanScanner,
    })
    const retried = await retryAttachmentScan(testDb.db, {
      uploadId: uploaded.retry.uploadId,
      retryToken: uploaded.retry.retryToken,
      siteId: 'default',
      pageId: 'page-home',
      formId: 'contact',
      fieldId: 'documents',
    })
    expect(retried.ok).toBe(true)
  })

  it('rejects extension, MIME and content-signature mismatches before storage', async () => {
    const { testDb } = await harness(cleanScanner)
    const upload = (file: File) => uploadAndScanAttachment(testDb.db, {
      file,
      siteId: 'default',
      pageId: 'page-home',
      formId: 'contact',
      fieldId: 'documents',
    })

    expect(await upload(new File([PDF_BYTES], 'document.exe', {
      type: 'application/pdf',
    }))).toMatchObject({
      ok: false,
      status: 400,
      code: 'unsupported_extension',
    })
    expect(await upload(new File([PDF_BYTES], 'document.pdf', {
      type: 'image/png',
    }))).toMatchObject({
      ok: false,
      status: 400,
      code: 'mime_mismatch',
    })
    expect(await upload(new File(['not a pdf'], 'document.pdf', {
      type: 'application/pdf',
    }))).toMatchObject({
      ok: false,
      status: 400,
      code: 'signature_mismatch',
    })
  })

  it('deletes expired quarantine records deterministically', async () => {
    const { testDb } = await harness(unavailableScanner)
    const uploaded = await uploadAndScanAttachment(testDb.db, {
      file: pdf('expired.pdf'),
      siteId: 'default',
      pageId: 'page-home',
      formId: 'contact',
      fieldId: 'documents',
      now: new Date('2026-01-01T00:00:00.000Z'),
    })
    if (uploaded.ok || !uploaded.retry) throw new Error('expected quarantined upload')
    const swept = await sweepExpiredAttachments(
      testDb.db,
      new Date('2026-01-02T00:00:01.000Z'),
    )
    expect(swept).toEqual({ deleted: 1, failed: 0 })
    expect(await getAttachmentRecord(testDb.db, uploaded.retry.uploadId)).toMatchObject({
      status: 'deleted',
      storagePath: null,
    })
  })

  it('requires an authorized data reader for private downloads', async () => {
    const testDb = await createCapabilityTestHarness()
    const storageDir = await mkdtemp(join(tmpdir(), 'instatic-private-download-'))
    cleanups.push(async () => rm(storageDir, { recursive: true, force: true }))
    cleanups.push(testDb.cleanup)
    configureAttachmentRuntime({
      policy,
      storage: createLocalAttachmentStorage(storageDir),
      scanner: cleanScanner,
    })

    const cookie = await testDb.setupOwner()

    const uploaded = await uploadAndScanAttachment(testDb.db, {
      file: pdf('private.pdf'),
      siteId: 'default',
      pageId: 'page-home',
      formId: 'contact',
      fieldId: 'documents',
    })
    if (!uploaded.ok) throw new Error(uploaded.message)
    const table = await createDataTable(testDb.db, {
      id: 'private_downloads',
      name: 'Private downloads',
      slug: 'private-downloads',
      singularLabel: 'Download',
      pluralLabel: 'Downloads',
      primaryFieldId: 'documents',
      fields: [{
        type: 'attachment',
        id: 'documents',
        label: 'Documents',
      }],
    })
    const prepared = prepareAttachmentClaims({
      table,
      controls: [{
        nodeId: 'file',
        fieldId: 'documents',
        inputType: 'file',
      }],
      values: { documents: uploaded.attachment.reference },
      siteId: 'default',
      pageId: 'page-home',
      formId: 'contact',
      policyMaxFiles: 1,
    })
    if (!prepared.ok) throw new Error('attachment reference was not prepared')
    await testDb.db.transaction(async (tx) => {
      await createDataRow(tx, {
        id: 'download-row',
        tableId: table.id,
        cells: prepared.values,
        slug: '',
      })
      expect(await claimPreparedAttachments(tx, prepared.claims, {
        dataRowId: 'download-row',
        retentionDays: 30,
      })).toBe(true)
    })

    const path = `/admin/api/cms/attachments/${uploaded.attachment.id}/download`
    const unauthorized = await handleAttachmentAdminRoutes(
      new Request(`http://localhost${path}`),
      testDb.db,
    )
    expect(unauthorized?.status).toBe(401)

    const authorizedRequest = new Request(`http://localhost${path}`)
    authorizedRequest.headers.set('cookie', cookie)
    const authorized = await handleAttachmentAdminRoutes(
      authorizedRequest,
      testDb.db,
    )
    expect(authorized?.status).toBe(200)
    expect(authorized?.headers.get('content-disposition')).toContain('attachment;')
    expect(authorized?.headers.get('cache-control')).toBe('private, no-store')
    expect(new Uint8Array(await authorized!.arrayBuffer())).toEqual(PDF_BYTES)
  })

  it('uploads and claims a scanned reference through the public form routes', async () => {
    const { testDb } = await harness(cleanScanner)
    const pageId = 'attachment-route-page'
    const pageSlug = 'attachment-route'
    const pageVersionId = 'attachment-route-page-v1'
    resetPublicFormChallenges()
    for (const limiter of [
      publicAttachmentPerIpRateLimit,
      publicAttachmentPerFormRateLimit,
      publicFormPerIpRateLimit,
      publicFormPerFormRateLimit,
    ]) {
      limiter.reset('unknown')
    }
    await createDataTable(testDb.db, {
      id: 'attachment_submissions',
      name: 'Attachment submissions',
      slug: 'attachment-submissions',
      singularLabel: 'Submission',
      pluralLabel: 'Submissions',
      primaryFieldId: 'documents',
      fields: [{
        type: 'attachment',
        id: 'documents',
        label: 'Documents',
        required: true,
      }],
    })
    await createDataRow(testDb.db, {
      id: pageId,
      tableId: 'pages',
      cells: { title: 'Attachment route', slug: pageSlug },
      slug: pageSlug,
    })
    const siteDocument = {
      id: 'default',
      name: 'Attachment route test',
      settings: {},
      pages: [{
        id: pageId,
        slug: pageSlug,
        title: 'Attachment route',
        rootNodeId: 'body',
        nodes: {
          body: testNode('body', 'base.body', {}, ['form']),
          form: testNode('form', 'base.form', {
            mode: 'cms',
            formId: 'contact',
            targetTableId: 'attachment_submissions',
            honeypotName: 'company',
            minSubmitSeconds: 0,
          }, ['file']),
          file: testNode('file', 'base.input', {
            inputType: 'file',
            fieldId: 'documents',
            name: 'documents',
            required: true,
            accept: '.pdf',
            attachmentMaxFiles: 1,
            attachmentMaxBytes: 1024,
          }),
        },
      }],
      visualComponents: [],
      layouts: [],
      classes: [],
      breakpoints: [],
      settingsVersion: 1,
      files: [],
      styleRules: {},
      packageJson: {},
      runtime: {
        dependencyLock: { version: 1, packages: {}, updatedAt: 0 },
        scripts: {},
        styles: {},
      },
      createdAt: 0,
      updatedAt: 0,
    }
    await testDb.db`
      insert into site_snapshots (id, site_json, content_hash)
      values (${'attachment-snapshot'}, ${siteDocument}, ${'test-hash'})
    `
    await testDb.db`
      insert into data_row_versions (
        id, row_id, version_number, cells_json, slug, site_snapshot_id
      )
      values (
        ${pageVersionId}, ${pageId}, ${1}, ${{}}, ${pageSlug},
        ${'attachment-snapshot'}
      )
    `
    await testDb.db`
      update data_rows
      set status = ${'published'},
          active_version_id = ${pageVersionId},
          published_at = current_timestamp
      where id = ${pageId}
    `

    const pageToken = issuePublicFormPageToken({
      pageId,
      formId: 'contact',
    })
    const uploadBody = new FormData()
    uploadBody.set('pageId', pageId)
    uploadBody.set('formId', 'contact')
    uploadBody.set('pageToken', pageToken)
    uploadBody.set('fieldId', 'documents')
    uploadBody.set('file', pdf('route.pdf'))
    const uploadRequest = new Request(
      'http://localhost/_instatic/form/attachment/upload',
      { method: 'POST', body: uploadBody },
    )
    uploadRequest.headers.set('origin', 'http://localhost')
    uploadRequest.headers.set('sec-fetch-site', 'same-origin')
    const upload = await handlePublicFormRequest(
      uploadRequest,
      testDb.db,
      new URL(uploadRequest.url),
    )
    expect(upload?.status).toBe(201)
    const uploadPayload = await upload!.json() as {
      attachment: { id: string; reference: string }
    }

    const challengeRequest = jsonFormRequest('/_instatic/form/challenge', {
      pageId,
      formId: 'contact',
      pageToken,
    })
    const challenge = await handlePublicFormRequest(
      challengeRequest,
      testDb.db,
      new URL(challengeRequest.url),
    )
    expect(challenge?.status).toBe(200)
    const challengePayload = await challenge!.json() as {
      token: string
      challenge: string
    }

    const submitRequest = jsonFormRequest('/_instatic/form/submit', {
      pageId,
      formId: 'contact',
      token: challengePayload.token,
      challenge: challengePayload.challenge,
      values: {
        documents: uploadPayload.attachment.reference,
        company: '',
      },
    })
    const submit = await handlePublicFormRequest(
      submitRequest,
      testDb.db,
      new URL(submitRequest.url),
    )
    expect(submit?.status).toBe(200)
    expect(await getAttachmentRecord(
      testDb.db,
      uploadPayload.attachment.id,
    )).toMatchObject({
      status: 'claimed',
      scanStatus: 'clean',
    })
  })
})

function testNode(
  id: string,
  moduleId: string,
  props: Record<string, unknown>,
  children: string[] = [],
) {
  return {
    id,
    moduleId,
    props,
    children,
    breakpointOverrides: {},
    classIds: [],
  }
}

function jsonFormRequest(path: string, body: unknown): Request {
  const request = new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  request.headers.set('origin', 'http://localhost')
  request.headers.set('sec-fetch-site', 'same-origin')
  return request
}
