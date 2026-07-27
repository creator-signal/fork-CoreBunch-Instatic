import { describe, expect, it } from 'bun:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { stampFormPageTokens } from '../../../server/forms/formRuntime'
import { FORM_RUNTIME_JS } from '../../modules/base/forms/formRuntimeJs'

const PAGE_WITH_CMS_FORM = `<!doctype html>
<html>
<head>
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'none'; worker-src 'none'; style-src 'self'; img-src 'self' data:; connect-src 'self';">
</head>
<body>
<form data-instatic-form-mode="cms" data-instatic-form-id="contact"></form>
</body>
</html>`

describe('stampFormPageTokens', () => {
  it('stamps a page token and page id onto every CMS-native form tag', () => {
    const html = stampFormPageTokens(PAGE_WITH_CMS_FORM, 'page-home')
    expect(html).toContain('data-instatic-page-token=')
    expect(html).toContain('data-instatic-page-id="page-home"')
  })

  it('leaves non-CMS forms untouched', () => {
    const html = stampFormPageTokens(
      PAGE_WITH_CMS_FORM.replace('data-instatic-form-mode="cms"', 'data-instatic-form-mode="custom"'),
      'page-home',
    )
    expect(html).not.toContain('data-instatic-page-token=')
    expect(html).not.toContain('data-instatic-page-id=')
  })

  it('is idempotent', () => {
    const once = stampFormPageTokens(PAGE_WITH_CMS_FORM, 'page-home')
    const twice = stampFormPageTokens(once, 'page-home')
    expect(twice).toBe(once)
    expect(twice.match(/data-instatic-page-token=/g)?.length).toBe(1)
  })
})

describe('form runtime browser behaviour', () => {
  it('submits through delegation and exposes field errors to assistive technology', async () => {
    document.body.innerHTML = `
      <form data-instatic-form-mode="cms" data-instatic-form-id="contact" data-instatic-page-id="page-home" data-instatic-page-token="page-token">
        <div data-instatic-tabs>
          <section data-instatic-tab-panel="contact" data-instatic-tab-label="Contact" hidden>
            <details>
              <summary>Contact details</summary>
              <label data-instatic-label-target="auto">Email</label>
              <input data-instatic-form-control="input" data-instatic-field-id="email" name="email" value="invalid">
              <p data-instatic-form-message="help" data-instatic-form-help-for="email">Use your work address.</p>
              <p data-instatic-form-message="error" data-instatic-form-error-for="email"></p>
            </details>
          </section>
        </div>
        <button type="submit">Send</button>
        <p data-instatic-form-message="status"></p>
      </form>
    `

    const calls: Array<{ path: string; payload: Record<string, unknown> }> = []
    const originalFetch = globalThis.fetch

    ;(globalThis as Record<string, unknown>).fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.pathname
          : input.url
      const payload = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
      calls.push({ path, payload })

      if (path === '/_instatic/form/challenge') {
        return new Response(JSON.stringify({
          token: 'prefetched-token',
          challenge: 'prefetched-challenge',
          expiresAt: '2099-01-01T00:00:00.000Z',
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({
        error: 'Invalid form values',
        errors: [
          {
            fieldId: 'email',
            code: 'invalid_email',
            message: 'Enter a valid email address.',
          },
        ],
      }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    }

    try {
      await importRuntimeScript(FORM_RUNTIME_JS)
      await flushRuntime()

      expect(calls.map((call) => call.path)).toEqual(['/_instatic/form/challenge'])
      expect(calls[0].payload.pageId).toBe('page-home')

      const form = document.querySelector('form')
      expect(form).not.toBeNull()
      // No per-form listener — submit is intercepted at document level.
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await waitForCalls(calls, 2)

      expect(calls[0].path).toBe('/_instatic/form/challenge')
      expect(calls[1].path).toBe('/_instatic/form/submit')
      expect(calls[1].payload.pageId).toBe('page-home')
      expect(calls[1].payload.token).toBe('prefetched-token')
      expect(calls[1].payload.challenge).toBe('prefetched-challenge')

      const input = document.querySelector<HTMLInputElement>('[data-instatic-field-id="email"]')
      const fieldError = document.querySelector<HTMLElement>('[data-instatic-form-error-for="email"]')
      const help = document.querySelector<HTMLElement>('[data-instatic-form-help-for="email"]')
      await waitForCondition(() => input?.getAttribute('aria-invalid') === 'true')

      expect(input?.id).not.toBe('')
      expect(document.querySelector('label')?.getAttribute('for')).toBe(input?.id)
      expect(input?.getAttribute('aria-describedby')?.split(/\s+/).sort()).toEqual(
        [help?.id, fieldError?.id].sort(),
      )
      expect(input?.getAttribute('aria-errormessage')).toBe(fieldError?.id)
      expect(fieldError?.hidden).toBe(false)
      expect(fieldError?.textContent).toBe('Enter a valid email address.')
      expect(document.activeElement).toBe(input)
      expect(input?.closest('details')?.open).toBe(true)
      expect(input?.closest<HTMLElement>('[data-instatic-tab-panel]')?.hidden).toBe(false)

      input?.dispatchEvent(new Event('input', { bubbles: true }))
      expect(input?.hasAttribute('aria-invalid')).toBe(false)
      expect(fieldError?.hidden).toBe(true)
    } finally {
      const cleanup = (window as unknown as Record<string, unknown>)
        .__instaticFormRuntimeCleanup
      if (typeof cleanup === 'function') cleanup()
      ;(globalThis as Record<string, unknown>).fetch = originalFetch
      document.body.innerHTML = ''
    }
  })

  it('prefixes reusable fragment controls, labels and messages once per instance', async () => {
    document.body.innerHTML = `
      <form data-instatic-form-mode="cms" data-instatic-form-id="contact">
        <section data-instatic-component="reusable-form-fragment" data-instatic-binding-prefix="Billing Address">
          <label for="street">Street</label>
          <input id="street" name="street" data-instatic-form-control="input" data-instatic-field-id="street">
          <p data-instatic-form-help-for="street">Include the unit number.</p>
          <p data-instatic-form-error-for="street"></p>
        </section>
      </form>
    `
    try {
      await importRuntimeScript(FORM_RUNTIME_JS)
      await flushRuntime()

      const input = document.querySelector<HTMLInputElement>('input')
      expect(input?.getAttribute('data-instatic-field-id')).toBe(
        'billing-address-street',
      )
      expect(input?.id).toBe('billing-address-street')
      expect(input?.name).toBe('billing-address-street')
      expect(document.querySelector('label')?.getAttribute('for')).toBe(
        'billing-address-street',
      )
      expect(
        document.querySelector('[data-instatic-form-help-for]')
          ?.getAttribute('data-instatic-form-help-for'),
      ).toBe('billing-address-street')
      expect(
        document.querySelector('[data-instatic-form-error-for]')
          ?.getAttribute('data-instatic-form-error-for'),
      ).toBe('billing-address-street')
    } finally {
      const cleanup = (window as unknown as Record<string, unknown>)
        .__instaticFormRuntimeCleanup
      if (typeof cleanup === 'function') cleanup()
      document.body.innerHTML = ''
    }
  })
})

async function flushRuntime(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

let runtimeImportCounter = 0

async function importRuntimeScript(source: string): Promise<void> {
  runtimeImportCounter += 1
  const dir = join(process.cwd(), '.tmp', 'form-runtime-tests')
  await mkdir(dir, { recursive: true })
  const path = join(dir, `runtime-${runtimeImportCounter}.mjs`)
  await writeFile(path, source, 'utf8')
  await import(`${pathToFileURL(path).href}?v=${runtimeImportCounter}`)
}

async function waitForCalls(calls: unknown[], count: number): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (calls.length >= count) return
    await flushRuntime()
  }
}

async function waitForCondition(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return
    await flushRuntime()
  }
}
