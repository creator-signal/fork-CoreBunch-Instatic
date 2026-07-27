import { afterEach, describe, expect, it } from 'bun:test'
import type { PublishedFormSnapshot } from '@core/forms'
import { createTestDb, type TestDb } from '../helpers/createTestDb'
import { findUserById } from '../../../server/repositories/users'
import { createDataRow } from '../../../server/repositories/data'
import { handlePublicFormRequest } from '../../../server/forms/handler'
import { issuePublicFormPageToken } from '../../../server/forms/challenge'
import {
  configurePublicOrigins,
  resetPublicOrigins,
} from '../../../server/auth/security'
import {
  configureFormDraftRuntime,
  resetFormDraftRuntime,
} from '../../../server/forms/drafts/runtime'
import {
  loadFormDraft,
  removeFormDraft,
  saveFormDraft,
} from '../../../server/forms/drafts/service'
import {
  deleteExpiredFormDrafts,
  getFormDraft,
} from '../../../server/forms/drafts/repository'

const cleanups: Array<() => Promise<void>> = []

afterEach(async () => {
  resetFormDraftRuntime()
  resetPublicOrigins()
  while (cleanups.length > 0) await cleanups.pop()?.()
})

async function harness(): Promise<TestDb> {
  const testDb = await createTestDb()
  cleanups.push(testDb.cleanup)
  await testDb.db`
    insert into site (id, name, settings_json)
    values (${'default'}, ${'Draft test'}, ${{}})
    on conflict (id) do nothing
  `
  configureFormDraftRuntime({
    enabled: true,
    ttlDays: 30,
    maxBytes: 256 * 1024,
  })
  return testDb
}

function snapshot(
  controls: PublishedFormSnapshot['controls'] = [{
    nodeId: 'email-node',
    fieldId: 'email',
    name: 'contact_email',
    inputType: 'email',
    catalogueEntryId: 'base.email-input',
    catalogueEntryVersion: '1.0.0',
  }],
): PublishedFormSnapshot {
  return {
    pageId: 'page-home',
    nodeId: 'form-node',
    formId: 'contact',
    targetTableId: 'contact_submissions',
    honeypotName: 'company',
    minSubmitSeconds: 0,
    draftMode: 'persistent',
    draftTtlDays: 14,
    controls,
    labels: [],
    submits: [],
    messages: [],
  }
}

const wizard = {
  stepId: 'details',
  visitedStepIds: ['details'],
  review: false,
}

describe('persistent form drafts', () => {
  it('enforces the published-page boundary through the public HTTP contract', async () => {
    const { db } = await harness()
    configurePublicOrigins(['http://localhost'])
    const pageId = 'draft-route-page'
    const pageVersionId = 'draft-route-version'
    await createDataRow(db, {
      id: pageId,
      tableId: 'pages',
      cells: { title: 'Draft route', slug: 'draft-route' },
      slug: 'draft-route',
    })
    const siteDocument = {
      id: 'default',
      name: 'Draft route test',
      settings: {},
      pages: [{
        id: pageId,
        slug: 'draft-route',
        title: 'Draft route',
        rootNodeId: 'body',
        nodes: {
          body: pageNode('body', 'base.body', {}, ['form']),
          form: pageNode('form', 'base.form', {
            mode: 'cms',
            formId: 'contact',
            targetTableId: 'contact_submissions',
            minSubmitSeconds: 0,
            draftMode: 'persistent',
            draftTtlDays: 7,
          }, ['email']),
          email: pageNode('email', 'base.input', {
            inputType: 'email',
            fieldId: 'email',
            name: 'email',
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
    await db`
      insert into site_snapshots (id, site_json, content_hash)
      values (${'draft-route-snapshot'}, ${siteDocument}, ${'test-hash'})
    `
    await db`
      insert into data_row_versions (
        id, row_id, version_number, cells_json, slug, site_snapshot_id
      )
      values (
        ${pageVersionId}, ${pageId}, ${1}, ${{}}, ${'draft-route'},
        ${'draft-route-snapshot'}
      )
    `
    await db`
      update data_rows
         set status = ${'published'},
             active_version_id = ${pageVersionId},
             published_at = current_timestamp
       where id = ${pageId}
    `
    const pageToken = issuePublicFormPageToken({ pageId, formId: 'contact' })
    const saveRequest = publicDraftRequest('/_instatic/form/draft/save', {
      pageId,
      formId: 'contact',
      pageToken,
      values: { email: 'route@example.com' },
      wizard,
    })
    const saved = await handlePublicFormRequest(
      saveRequest,
      db,
      new URL(saveRequest.url),
    )
    if (saved?.status !== 200) {
      throw new Error(`draft save failed: ${saved?.status} ${await saved?.text()}`)
    }
    expect(saved?.status).toBe(200)
    const savedBody = await saved!.json() as {
      recoveryToken: string
      draft: { id: string; revision: number }
    }
    expect(savedBody.recoveryToken).toBeString()

    const invalidPageToken = publicDraftRequest('/_instatic/form/draft/load', {
      pageId,
      formId: 'contact',
      pageToken: 'forged',
      draftId: savedBody.draft.id,
      recoveryToken: savedBody.recoveryToken,
    })
    const rejected = await handlePublicFormRequest(
      invalidPageToken,
      db,
      new URL(invalidPageToken.url),
    )
    expect(rejected?.status).toBe(403)

    const loadRequest = publicDraftRequest('/_instatic/form/draft/load', {
      pageId,
      formId: 'contact',
      pageToken,
      draftId: savedBody.draft.id,
      recoveryToken: savedBody.recoveryToken,
    })
    const loaded = await handlePublicFormRequest(
      loadRequest,
      db,
      new URL(loadRequest.url),
    )
    expect(loaded?.status).toBe(200)
    expect(await loaded!.json()).toMatchObject({
      draft: { values: { email: 'route@example.com' }, revision: 1 },
    })
  })

  it('uses scoped anonymous recovery tokens and optimistic revisions', async () => {
    const { db } = await harness()
    const form = snapshot([
      {
        nodeId: 'email-node',
        fieldId: 'email',
        name: 'contact_email',
        inputType: 'email',
      },
      {
        nodeId: 'password-node',
        fieldId: 'password',
        name: 'password',
        inputType: 'password',
      },
      {
        nodeId: 'file-node',
        fieldId: 'resume',
        name: 'resume',
        inputType: 'file',
      },
      {
        nodeId: 'private-note',
        fieldId: 'private_note',
        name: 'private_note',
        inputType: 'text',
        draftBehavior: 'session-only',
      },
    ])
    const created = await saveFormDraft(db, {
      identity: { user: null },
      siteId: 'default',
      snapshot: form,
      values: {
        contact_email: 'person@example.com',
        password: 'never-persist',
        resume: 'att:v1:secret',
        private_note: 'session only',
        unknown: 'ignored',
      },
      wizard,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) throw new Error(created.message)
    expect(created.recoveryToken).toBeString()
    expect(created.draft.values).toEqual({ email: 'person@example.com' })
    expect(created.draft.warnings.length).toBeGreaterThan(0)

    const denied = await loadFormDraft(db, {
      identity: {
        user: null,
        draftId: created.draft.id,
        recoveryToken: 'wrong-token-with-enough-length',
      },
      siteId: 'default',
      snapshot: form,
    })
    expect(denied).toMatchObject({ ok: false, status: 404 })

    const loaded = await loadFormDraft(db, {
      identity: {
        user: null,
        draftId: created.draft.id,
        recoveryToken: created.recoveryToken,
      },
      siteId: 'default',
      snapshot: form,
    })
    expect(loaded).toMatchObject({
      ok: true,
      draft: {
        revision: 1,
        values: { email: 'person@example.com' },
        schemaStatus: 'current',
      },
    })

    const firstUpdate = await saveFormDraft(db, {
      identity: {
        user: null,
        draftId: created.draft.id,
        recoveryToken: created.recoveryToken,
      },
      siteId: 'default',
      snapshot: form,
      revision: 1,
      values: { email: 'new@example.com' },
      wizard,
    })
    expect(firstUpdate).toMatchObject({ ok: true, draft: { revision: 2 } })

    const staleUpdate = await saveFormDraft(db, {
      identity: {
        user: null,
        draftId: created.draft.id,
        recoveryToken: created.recoveryToken,
      },
      siteId: 'default',
      snapshot: form,
      revision: 1,
      values: { email: 'stale@example.com' },
      wizard,
    })
    expect(staleUpdate).toMatchObject({
      ok: false,
      status: 409,
      code: 'draft_conflict',
      revision: 2,
    })
    expect((await getFormDraft(db, created.draft.id))?.values)
      .toEqual({ email: 'new@example.com' })
  })

  it('resumes the latest authenticated draft across devices and deletes it', async () => {
    const { db } = await harness()
    await db`
      insert into users (
        id, email, email_normalized, display_name, password_hash, status, role_id
      )
      values (
        ${'draft-owner'}, ${'draft@example.com'}, ${'draft@example.com'},
        ${'Draft Owner'}, ${'test-password-hash'}, ${'active'}, ${'admin'}
      )
    `
    const user = await findUserById(db, 'draft-owner')
    if (!user) throw new Error('test user not found')

    const created = await saveFormDraft(db, {
      identity: { user },
      siteId: 'default',
      snapshot: snapshot(),
      values: { email: 'owner@example.com' },
      wizard,
    })
    expect(created).toMatchObject({ ok: true })
    if (!created.ok) throw new Error(created.message)
    expect(created.recoveryToken).toBeUndefined()

    const resumed = await loadFormDraft(db, {
      identity: { user },
      siteId: 'default',
      snapshot: snapshot(),
    })
    expect(resumed).toMatchObject({
      ok: true,
      draft: { id: created.draft.id, values: { email: 'owner@example.com' } },
    })

    const deleted = await removeFormDraft(db, {
      identity: { user, draftId: created.draft.id },
      siteId: 'default',
      snapshot: snapshot(),
      revision: 1,
    })
    expect(deleted).toEqual({ ok: true, deleted: true })
    expect(await getFormDraft(db, created.draft.id)).toBeNull()
  })

  it('migrates by stable field ID and reports incompatible schema changes', async () => {
    const { db } = await harness()
    const created = await saveFormDraft(db, {
      identity: { user: null },
      siteId: 'default',
      snapshot: snapshot(),
      values: { email: 'person@example.com' },
      wizard,
    })
    if (!created.ok || !created.recoveryToken) throw new Error('draft creation failed')

    const changed = snapshot([{
      nodeId: 'email-node-v2',
      fieldId: 'email',
      name: 'contact_email',
      inputType: 'text',
      catalogueEntryId: 'base.text-input',
      catalogueEntryVersion: '2.0.0',
    }])
    const migrated = await loadFormDraft(db, {
      identity: {
        user: null,
        draftId: created.draft.id,
        recoveryToken: created.recoveryToken,
      },
      siteId: 'default',
      snapshot: changed,
    })
    expect(migrated).toMatchObject({
      ok: true,
      draft: {
        values: {},
        schemaStatus: 'migrated',
      },
    })
    if (!migrated.ok) throw new Error(migrated.message)
    expect(migrated.draft.warnings.join(' ')).toContain('changed field')
  })

  it('refuses drafts written by a newer unsupported schema version', async () => {
    const { db } = await harness()
    const created = await saveFormDraft(db, {
      identity: { user: null },
      siteId: 'default',
      snapshot: snapshot(),
      values: { email: 'future@example.com' },
      wizard,
    })
    if (!created.ok || !created.recoveryToken) throw new Error('draft creation failed')
    await db`
      update form_drafts
         set schema_version = ${2}
       where id = ${created.draft.id}
    `
    const loaded = await loadFormDraft(db, {
      identity: {
        user: null,
        draftId: created.draft.id,
        recoveryToken: created.recoveryToken,
      },
      siteId: 'default',
      snapshot: snapshot(),
    })
    expect(loaded).toMatchObject({
      ok: false,
      status: 409,
      code: 'draft_schema_newer',
      revision: 1,
    })
  })

  it('expires and cleans records even after new draft persistence is disabled', async () => {
    const { db } = await harness()
    const created = await saveFormDraft(db, {
      identity: { user: null },
      siteId: 'default',
      snapshot: snapshot(),
      values: { email: 'person@example.com' },
      wizard,
    })
    if (!created.ok) throw new Error(created.message)
    await db`
      update form_drafts
         set expires_at = ${'2000-01-01T00:00:00.000Z'}
       where id = ${created.draft.id}
    `
    resetFormDraftRuntime()
    expect(await deleteExpiredFormDrafts(db)).toBe(1)
    expect(await getFormDraft(db, created.draft.id)).toBeNull()
  })
})

function pageNode(
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

function publicDraftRequest(path: string, body: unknown): Request {
  const request = new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  request.headers.set('origin', 'http://localhost')
  request.headers.set('sec-fetch-site', 'same-origin')
  return request
}
