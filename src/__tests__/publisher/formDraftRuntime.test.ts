import { afterEach, describe, expect, it } from 'bun:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { FORM_DRAFT_RUNTIME_JS } from '../../modules/base/forms/formDraftRuntimeJs'

afterEach(() => {
  cleanupRuntime()
  document.body.innerHTML = ''
  localStorage.clear()
  sessionStorage.clear()
  history.replaceState(null, '', '/')
})

describe('form draft browser runtime', () => {
  it('saves only persistent-safe fields, restores wizard state and surfaces conflicts', async () => {
    document.body.innerHTML = persistentForm()
    const calls: Array<{ path: string; body: Record<string, unknown> }> = []
    const originalFetch = globalThis.fetch
    let saveCount = 0
    ;(globalThis as Record<string, unknown>).fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      const path = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.pathname
          : new URL(input.url).pathname
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
      calls.push({ path, body })
      if (path.endsWith('/load')) return json({ error: 'Saved draft not found.', code: 'draft_not_found' }, 404)
      saveCount += 1
      if (saveCount === 2) {
        return json({
          error: 'A newer version exists.',
          code: 'draft_conflict',
          revision: 2,
        }, 409)
      }
      return json({
        ok: true,
        recoveryToken: 'anonymous-recovery-token',
        draft: {
          id: 'draft-one',
          revision: 1,
          values: { email: 'person@example.com' },
          wizard: { stepId: 'details', visitedStepIds: [], review: false },
          expiresAt: '2099-01-01T00:00:00.000Z',
          schemaStatus: 'current',
          warnings: [],
        },
      })
    }

    try {
      await importRuntimeScript()
      await waitFor(() => calls.length === 1)
      const form = document.querySelector('form')!
      const email = form.querySelector<HTMLInputElement>('[data-instatic-field-id="email"]')!
      email.value = 'person@example.com'
      form.querySelector<HTMLButtonElement>('[data-instatic-draft-action="next-step"]')!.click()
      expect(form.querySelector<HTMLElement>('[data-instatic-form-step="details"]')!.hidden)
        .toBe(true)
      expect(form.querySelector<HTMLElement>('[data-instatic-form-step="review"]')!.hidden)
        .toBe(false)

      form.querySelector<HTMLButtonElement>('[data-instatic-draft-action="save-draft"]')!.click()
      await waitFor(() => calls.length === 2)
      await waitFor(() =>
        form.querySelector('[data-instatic-draft-status]')?.textContent === 'Draft saved.',
      )
      const saved = calls[1].body
      expect(saved.values).toEqual({ email: 'person@example.com' })
      expect(JSON.stringify(saved)).not.toContain('secret-password')
      expect(JSON.stringify(saved)).not.toContain('session-note')
      expect(JSON.stringify(saved)).not.toContain('resume.pdf')
      expect(saved.wizard).toEqual({
        stepId: 'review',
        visitedStepIds: ['details'],
        review: true,
      })
      expect(window.location.hash).toContain('instatic-draft-token=anonymous-recovery-token')
      expect(form.querySelector('[data-instatic-draft-status]')?.textContent)
        .toBe('Draft saved.')

      form.querySelector<HTMLButtonElement>('[data-instatic-draft-action="save-draft"]')!.click()
      await waitFor(() => calls.length === 3)
      await waitFor(() =>
        form.querySelector('[data-instatic-draft-status]')?.textContent?.includes('newer draft') === true,
      )
      expect(calls[2].body).toMatchObject({ draftId: 'draft-one', revision: 1 })
      expect(email.value).toBe('person@example.com')
    } finally {
      ;(globalThis as Record<string, unknown>).fetch = originalFetch
    }
  })

  it('keeps session-only recovery local and makes no network request', async () => {
    document.body.innerHTML = `
      <form data-instatic-form-mode="cms" data-instatic-draft-mode="session"
        data-instatic-form-id="contact" data-instatic-page-id="page-home"
        data-instatic-page-token="page-token">
        <input data-instatic-field-id="email" value="">
        <input data-instatic-field-id="note" data-instatic-draft-behavior="session-only" value="">
        <input type="password" data-instatic-field-id="password" value="">
      </form>
    `
    const originalFetch = globalThis.fetch
    let fetched = false
    ;(globalThis as Record<string, unknown>).fetch = async () => {
      fetched = true
      throw new Error('unexpected fetch')
    }
    try {
      await importRuntimeScript()
      const email = document.querySelector<HTMLInputElement>('[data-instatic-field-id="email"]')!
      const note = document.querySelector<HTMLInputElement>('[data-instatic-field-id="note"]')!
      const password = document.querySelector<HTMLInputElement>('[data-instatic-field-id="password"]')!
      email.value = 'session@example.com'
      note.value = 'session-note'
      password.value = 'never-store'
      note.dispatchEvent(new Event('input', { bubbles: true }))
      await waitFor(() => sessionStorage.length === 1, 500)
      const persisted = sessionStorage.getItem(sessionStorage.key(0)!) ?? ''
      expect(persisted).toContain('session@example.com')
      expect(persisted).toContain('session-note')
      expect(persisted).not.toContain('never-store')
      expect(fetched).toBe(false)
    } finally {
      ;(globalThis as Record<string, unknown>).fetch = originalFetch
    }
  })
})

function persistentForm(): string {
  return `
    <form data-instatic-form-mode="cms" data-instatic-draft-mode="persistent"
      data-instatic-form-id="contact" data-instatic-page-id="page-home"
      data-instatic-page-token="page-token">
      <section data-instatic-form-step="details">
        <input data-instatic-field-id="email" name="email" value="">
        <input type="password" data-instatic-field-id="password" value="secret-password">
        <input type="file" data-instatic-field-id="resume" value="resume.pdf">
        <input data-instatic-field-id="note" data-instatic-draft-behavior="session-only" value="session-note">
        <button type="button" data-instatic-draft-action="next-step">Next</button>
      </section>
      <section data-instatic-form-step="review" data-instatic-form-review="true">
        <button type="button" data-instatic-draft-action="save-draft">Save draft</button>
      </section>
    </form>
  `
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

let importSerial = 0

async function importRuntimeScript(): Promise<void> {
  importSerial += 1
  delete (window as unknown as Record<string, unknown>).__instaticFormDraftRuntimeLoaded
  const dir = join(process.cwd(), '.tmp', 'form-draft-runtime-tests')
  await mkdir(dir, { recursive: true })
  const path = join(dir, `runtime-${importSerial}.mjs`)
  await writeFile(path, FORM_DRAFT_RUNTIME_JS, 'utf8')
  await import(`${pathToFileURL(path).href}?v=${importSerial}`)
}

function cleanupRuntime(): void {
  const cleanup = (window as unknown as Record<string, unknown>)
    .__instaticFormDraftRuntimeCleanup
  if (typeof cleanup === 'function') cleanup()
}

async function waitFor(predicate: () => boolean, attempts = 100): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error('Timed out waiting for form draft runtime state')
}
