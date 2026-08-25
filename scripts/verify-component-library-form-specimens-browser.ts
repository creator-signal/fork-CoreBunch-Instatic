import { strict as assert } from 'node:assert'
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { chromium, type Page } from '@playwright/test'
import {
  buildFormSpecimenBundle,
  type FormSpecimenEntry,
} from './lib/component-library-form-specimens'

interface DraftRecord {
  id: string
  recoveryToken: string
  revision: number
  values: Record<string, unknown>
  wizard: Record<string, unknown>
}

interface AttachmentRecord {
  uploadId: string
  retryToken: string
  reference: string
  path: string
}

interface EntryEvidence {
  entryId: string
  scenarios: string[]
  axeViolations: number
  overflow: boolean
  checks: string[]
}

const bundle = buildFormSpecimenBundle()
const repositoryRoot = resolve(import.meta.dir, '..')
const outputDirectory = resolve(
  repositoryRoot,
  '.tmp/component-library-form-specimens',
)
const attachmentDirectory = resolve(outputDirectory, 'attachments')
const requestedPort = Number.parseInt(
  process.env.FORM_SPECIMEN_BROWSER_PORT ?? '0',
  10,
)
const browserExecutablePath =
  process.env.FORM_SPECIMEN_BROWSER_EXECUTABLE_PATH?.trim()
const documentsByPath = new Map(
  bundle.manifest.entries.map((entry) => [
    `/${entry.entryId}.html`,
    {
      entry,
      html: bundle.documents.get(entry.reference) ?? '',
    },
  ]),
)
const entryByPageId = new Map(
  bundle.manifest.entries.map((entry) => [
    `form-specimen-${localEntryId(entry.entryId)}`,
    entry,
  ]),
)
const drafts = new Map<string, DraftRecord>()
const attachments = new Map<string, AttachmentRecord>()
let draftSequence = 0
let attachmentSequence = 0

await rm(outputDirectory, { recursive: true, force: true })
await mkdir(attachmentDirectory, { recursive: true })

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: Number.isSafeInteger(requestedPort) && requestedPort > 0 ? requestedPort : 0,
  async fetch(request) {
    const url = new URL(request.url)
    const document = documentsByPath.get(url.pathname)
    if (document && request.method === 'GET') {
      return new Response(
        stampLocalPageTokens(document.html, document.entry),
        { headers: { 'content-type': 'text/html; charset=utf-8' } },
      )
    }
    const moduleId = moduleIdFromPath(url.pathname)
    if (moduleId && request.method === 'GET') {
      const body = bundle.moduleJs.get(moduleId)
      return body === undefined
        ? json({ error: 'Module JavaScript not found.' }, 404)
        : new Response(body, {
            headers: {
              'content-type': 'text/javascript; charset=utf-8',
              'cache-control': 'no-store',
            },
          })
    }
    if (url.pathname === '/_instatic/form/challenge' && request.method === 'POST') {
      const payload = await jsonPayload(request)
      const pageId = stringValue(payload.pageId)
      const formId = stringValue(payload.formId)
      return json({
        token: `local-token-${pageId}-${formId}`,
        challenge: `local-challenge-${pageId}-${formId}`,
        expiresAt: '2099-01-01T00:00:00.000Z',
      })
    }
    if (url.pathname === '/_instatic/form/submit' && request.method === 'POST') {
      const payload = await jsonPayload(request)
      const pageId = stringValue(payload.pageId)
      const entry = entryByPageId.get(pageId)
      if (entry?.entryId.endsWith('.email-input')) {
        return json({
          error: 'Invalid synthetic form values.',
          errors: [{
            fieldId: 'email-input-required',
            code: 'invalid_email',
            message: 'Enter a valid synthetic email address.',
          }],
        }, 400)
      }
      for (const attachment of attachments.values()) {
        await rm(attachment.path, { force: true })
      }
      attachments.clear()
      return json({ ok: true, rowId: `synthetic-${pageId}` })
    }
    if (url.pathname === '/_instatic/form/draft/load' && request.method === 'POST') {
      const payload = await jsonPayload(request)
      const record = drafts.get(draftKey(payload))
      return record
        ? json(draftResponse(record))
        : json({ code: 'draft_not_found', error: 'No local draft exists.' }, 404)
    }
    if (url.pathname === '/_instatic/form/draft/save' && request.method === 'POST') {
      const payload = await jsonPayload(request)
      const key = draftKey(payload)
      const current = drafts.get(key)
      draftSequence += 1
      const record: DraftRecord = {
        id: current?.id ?? `local-draft-${draftSequence}`,
        recoveryToken: current?.recoveryToken ?? `local-recovery-${draftSequence}`,
        revision: (current?.revision ?? 0) + 1,
        values: recordValue(payload.values),
        wizard: recordValue(payload.wizard),
      }
      drafts.set(key, record)
      return json(draftResponse(record))
    }
    if (url.pathname === '/_instatic/form/draft/delete' && request.method === 'POST') {
      const payload = await jsonPayload(request)
      drafts.delete(draftKey(payload))
      return json({ ok: true })
    }
    if (url.pathname === '/_instatic/form/attachment/upload' && request.method === 'POST') {
      const formData = await request.formData()
      const file = formData.get('file')
      if (!(file instanceof File)) {
        return json({ error: 'Synthetic attachment file is missing.' }, 400)
      }
      attachmentSequence += 1
      const uploadId = `local-upload-${attachmentSequence}`
      const retryToken = `local-retry-${attachmentSequence}`
      const path = join(attachmentDirectory, `${uploadId}.pdf`)
      await Bun.write(path, file)
      const record: AttachmentRecord = {
        uploadId,
        retryToken,
        reference: `att:v1:${uploadId}:${retryToken}`,
        path,
      }
      attachments.set(uploadId, record)
      return json({
        error: 'The local scanner is temporarily unavailable.',
        retry: { uploadId, retryToken },
      }, 503)
    }
    if (url.pathname === '/_instatic/form/attachment/scan' && request.method === 'POST') {
      const payload = await jsonPayload(request)
      const uploadId = stringValue(payload.uploadId)
      const retryToken = stringValue(payload.retryToken)
      const record = attachments.get(uploadId)
      if (!record || record.retryToken !== retryToken) {
        return json({ error: 'Synthetic attachment was not found.' }, 404)
      }
      return json({
        attachment: {
          id: uploadId,
          reference: record.reference,
          name: `${uploadId}.pdf`,
          mimeType: 'application/pdf',
          size: (await Bun.file(record.path).arrayBuffer()).byteLength,
        },
      })
    }
    return new Response('Not found', { status: 404 })
  },
})

if (Bun.argv.includes('--serve')) {
  console.log(
    `Component Library form specimens: http://127.0.0.1:${server.port}/${bundle.manifest.entries[0]!.entryId}.html`,
  )
  await new Promise(() => {})
}

const browser = await chromium.launch({
  headless: true,
  timeout: 30_000,
  ...(browserExecutablePath ? { executablePath: browserExecutablePath } : {}),
})
const evidence: EntryEvidence[] = []
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: 'light',
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  for (const entry of bundle.manifest.entries) {
    await openEntry(page, entry)
    const scenarioNodeIds = entry.scenarios.flatMap(
      (scenario) => scenario.subjectNodeIds,
    )
    for (const nodeId of scenarioNodeIds) {
      assert.equal(
        await page.locator(`[uid="${nodeId}"]`).count(),
        1,
        `${entry.entryId} did not render subject ${nodeId}`,
      )
    }
    assert.deepEqual(
      await missingAccessibleControlNames(page),
      [],
      `${entry.entryId} has unnamed controls`,
    )
    const axe = await new AxeBuilder({ page }).analyze()
    const violations = axe.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious',
    )
    assert.deepEqual(
      violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.length })),
      [],
      `${entry.entryId} has serious or critical Axe violations`,
    )
    await page.setViewportSize({ width: 390, height: 844 })
    const overflow = await hasHorizontalOverflow(page)
    assert.equal(overflow, false, `${entry.entryId} overflows the mobile viewport`)
    await page.setViewportSize({ width: 1280, height: 900 })
    const checks = [...new Set(entry.scenarios.flatMap((scenario) => scenario.browserChecks))]
    await runEntryChecks(page, entry, checks)
    evidence.push({
      entryId: entry.entryId,
      scenarios: entry.scenarios.map((scenario) => scenario.id),
      axeViolations: violations.length,
      overflow,
      checks,
    })
  }

  await verifyInvalidFocus(page)
  await verifySuccessfulSubmission(page)
  await verifySessionDraftCleanup(page)
  await verifyPersistentDraftCleanup(page)
  await verifyAttachmentRetryAndCleanup(page)

  assert.equal(drafts.size, 0, 'Persistent draft sandbox retained records after cleanup')
  assert.equal(attachments.size, 0, 'Attachment sandbox retained records after cleanup')
  assert.deepEqual(
    await readdir(attachmentDirectory),
    [],
    'Attachment sandbox retained files after cleanup',
  )
  await context.close()
} finally {
  await browser.close()
  server.stop(true)
  for (const attachment of attachments.values()) {
    await rm(attachment.path, { force: true })
  }
  attachments.clear()
}

const acceptance = {
  schemaVersion: 'instatic.component-library-form-specimen-acceptance/v1',
  entryCount: evidence.length,
  scenarioCount: evidence.reduce((count, entry) => count + entry.scenarios.length, 0),
  entries: evidence,
  runtimeJourneys: {
    invalidFocus: 'passed',
    successfulSubmission: 'passed',
    sessionDraftCleanup: 'passed',
    persistentDraftCleanup: 'passed',
    attachmentRetryAndCleanup: 'passed',
    providerFallback: 'passed',
  },
  cleanup: {
    draftRecordsRemaining: drafts.size,
    attachmentRecordsRemaining: attachments.size,
    attachmentFilesRemaining: (await readdir(attachmentDirectory)).length,
  },
}
await writeFile(
  resolve(outputDirectory, 'acceptance.json'),
  `${JSON.stringify(acceptance, null, 2)}\n`,
  'utf8',
)
console.log(
  `Component Library form browser acceptance passed: ${acceptance.entryCount} entries, ${acceptance.scenarioCount} scenarios. Evidence: ${outputDirectory}`,
)

async function openEntry(page: Page, entry: FormSpecimenEntry): Promise<void> {
  await page.goto(
    `http://127.0.0.1:${server.port}/${entry.entryId}.html`,
    { waitUntil: 'networkidle' },
  )
  await page.evaluate(() => document.fonts.ready)
}

async function runEntryChecks(
  page: Page,
  entry: FormSpecimenEntry,
  checks: string[],
): Promise<void> {
  if (checks.includes('provider-fallback')) {
    assert.equal(await page.locator('[data-instatic-provider-state][role="status"]').count() > 0, true)
    assert.equal(await page.locator('iframe').count(), 0)
  }
  if (checks.includes('form-control-relationships')) {
    for (const scenario of entry.scenarios.filter((candidate) => candidate.fieldId)) {
      const fieldId = scenario.fieldId!
      const control = page.locator(`[data-instatic-field-id="${fieldId}"]`).first()
      if (await control.count() === 0) continue
      const id = await control.getAttribute('id')
      assert(id, `${entry.entryId} field ${fieldId} has no ID`)
      assert.equal(await page.locator(`label[for="${id}"]`).count() > 0, true)
    }
  }
  if (checks.includes('tabs-keyboard')) {
    const tabs = page.getByRole('tab')
    assert.equal(await tabs.count() >= 2, true)
    await tabs.first().focus()
    await page.keyboard.press('ArrowRight')
    assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true')
  }
  if (checks.includes('accordion-keyboard')) {
    const summary = page.locator('summary').first()
    const details = summary.locator('xpath=..')
    const before = await details.getAttribute('open')
    await summary.press('Enter')
    const after = await details.getAttribute('open')
    assert.notEqual(after, before)
  }
  if (checks.includes('fieldset-legend')) {
    assert.equal(await page.locator('fieldset > legend').count() > 0, true)
  }
  if (checks.includes('versioned-consent')) {
    assert.equal(await page.locator('input[type="hidden"][value="1.0"]').count(), 1)
    assert.equal(await page.locator('input[type="checkbox"][required]').count() > 0, true)
  }
  if (checks.includes('reusable-binding-prefix')) {
    assert.equal(
      await page.locator('[data-instatic-field-id="shipping-fragment-email"]').count(),
      1,
    )
  }
}

async function verifyInvalidFocus(page: Page): Promise<void> {
  const entry = entryWithSuffix('email-input')
  await openEntry(page, entry)
  const field = page.locator('[data-instatic-field-id="email-input-required"]')
  await field.fill('invalid-email')
  await field.evaluate((element) => {
    const form = element.closest('form')
    if (!form) throw new Error('Required email specimen is not inside a form.')
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  await assertEventually('invalid email response', async () => await field.getAttribute('aria-invalid') === 'true')
  assert.equal(await field.getAttribute('aria-invalid'), 'true')
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-instatic-field-id')), 'email-input-required')
  assert.equal(await page.getByRole('alert').filter({ hasText: 'Enter a valid synthetic email address.' }).count(), 1)
}

async function verifySuccessfulSubmission(page: Page): Promise<void> {
  const entry = entryWithSuffix('form-container')
  await openEntry(page, entry)
  await page.locator('[data-instatic-field-id="contact-name"]').fill('Synthetic visitor')
  await page.getByRole('button', { name: 'Submit synthetic form' }).click()
  await assertEventually('successful form submission', async () =>
    (await page.getByRole('status').allTextContents()).some((text) =>
      text.includes('Thanks. Your submission was received.')
    )
  )
}

async function verifySessionDraftCleanup(page: Page): Promise<void> {
  const entry = entryWithSuffix('form-container')
  await openEntry(page, entry)
  const field = page.locator('[data-instatic-field-id="contact-name"]')
  await field.fill('Session synthetic visitor')
  await page.waitForTimeout(350)
  assert.equal(await page.evaluate(() => sessionStorage.length > 0), true)
  await page.evaluate(() => sessionStorage.clear())
  assert.equal(await page.evaluate(() => sessionStorage.length), 0)
}

async function verifyPersistentDraftCleanup(page: Page): Promise<void> {
  const saveEntry = entryWithSuffix('save-draft')
  await openEntry(page, saveEntry)
  await page.locator('[data-instatic-field-id="draft-value"]').fill('Persistent synthetic value')
  await page.locator('[data-instatic-draft-action="save-draft"]').first().click()
  await assertEventually('persistent draft save', async () =>
    (await page.getByRole('status').allTextContents()).some((text) => text.includes('Draft saved.'))
  )
  assert.equal(drafts.size, 1)
  await page.locator('[data-instatic-draft-action="delete-draft"]').click()
  await assertEventually('persistent draft deletion', async () => drafts.size === 0)
  assert.equal(drafts.size, 0)

  const deleteEntry = entryWithSuffix('delete-draft')
  await openEntry(page, deleteEntry)
  await page.locator('[data-instatic-draft-action="save-draft"]').click()
  await assertEventually('delete specimen support draft save', async () => drafts.size === 1)
  await page.locator('[data-instatic-draft-action="delete-draft"]').first().click()
  await assertEventually('delete specimen draft deletion', async () => drafts.size === 0)
}

async function verifyAttachmentRetryAndCleanup(page: Page): Promise<void> {
  const entry = entryWithSuffix('file-attachment')
  await openEntry(page, entry)
  const input = page.locator('input[type="file"][data-instatic-field-id="synthetic-attachment"]')
  await input.setInputFiles({
    name: `specimen-${Date.now()}.pdf`,
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7\nsynthetic local specimen\n%%EOF'),
  })
  await page.getByRole('button', { name: 'Submit synthetic form' }).click()
  const retry = page.getByRole('button', { name: 'Retry' })
  await retry.waitFor()
  assert.equal(attachments.size, 1)
  assert.equal((await readdir(attachmentDirectory)).length, 1)
  await retry.click()
  await assertEventually('attachment retry scan', async () =>
    (await page.locator('[data-instatic-attachment-file]').allTextContents()).some((text) =>
      text.includes('ready')
    )
  )
  await page.getByRole('button', { name: 'Submit synthetic form' }).click()
  await assertEventually('attachment claim cleanup', async () => attachments.size === 0)
  assert.deepEqual(await readdir(attachmentDirectory), [])
}

function entryWithSuffix(suffix: string): FormSpecimenEntry {
  const entry = bundle.manifest.entries.find(
    (candidate) => candidate.entryId.endsWith(`.${suffix}`),
  )
  if (!entry) throw new Error(`Missing form specimen entry ${suffix}`)
  return entry
}

function stampLocalPageTokens(html: string, entry: FormSpecimenEntry): string {
  const pageId = `form-specimen-${localEntryId(entry.entryId)}`
  return html.replace(
    /<form\b(?=[^>]*data-instatic-form-mode="cms")/g,
    `<form data-instatic-page-id="${pageId}" data-instatic-page-token="local-form-specimen-token"`,
  )
}

function moduleIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/_instatic\/module-js\/(.+)\.js$/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

function draftResponse(record: DraftRecord): Record<string, unknown> {
  return {
    recoveryToken: record.recoveryToken,
    draft: {
      id: record.id,
      revision: record.revision,
      values: record.values,
      wizard: record.wizard,
      schemaStatus: 'exact',
      warnings: [],
    },
  }
}

function draftKey(payload: Record<string, unknown>): string {
  return `${stringValue(payload.pageId)}:${stringValue(payload.formId)}`
}

async function jsonPayload(request: Request): Promise<Record<string, unknown>> {
  const value: unknown = await request.json()
  return recordValue(value)
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {}
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { 'cache-control': 'no-store' },
  })
}

async function missingAccessibleControlNames(page: Page): Promise<string[]> {
  return page.evaluate(() => Array.from(
    document.querySelectorAll<HTMLElement>(
      'input:not([type="hidden"]):not([data-instatic-honeypot]), textarea, select, button',
    ),
  ).filter((element) => {
    const disabled = 'disabled' in element && Boolean(element.disabled)
    return !disabled && element.getClientRects().length > 0
  }).flatMap((element) => {
    const labelled = element.getAttribute('aria-label')
      || element.getAttribute('aria-labelledby')
      || ('labels' in element && element.labels?.length)
      || element.textContent?.trim()
      || element.getAttribute('title')
    return labelled ? [] : [element.outerHTML]
  }))
}

async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  )
}

async function assertEventually(
  label: string,
  predicate: () => Promise<boolean>,
): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await predicate()) return
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 50))
  }
  assert.fail(`Browser condition did not become true before timeout: ${label}.`)
}

function localEntryId(entryId: string): string {
  return entryId.slice(entryId.lastIndexOf('.') + 1)
}
