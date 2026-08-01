import { describe, expect, it } from 'bun:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { FORM_RUNTIME_JS } from '../../modules/base/forms/formRuntimeJs'

class TestEventTarget {
  listeners = new Map<string, Array<(event: Record<string, unknown>) => void>>()

  addEventListener(name: string, listener: (event: Record<string, unknown>) => void): void {
    const listeners = this.listeners.get(name) ?? []
    listeners.push(listener)
    this.listeners.set(name, listeners)
  }

  emit(name: string, event: Record<string, unknown> = {}): void {
    for (const listener of this.listeners.get(name) ?? []) listener(event)
  }
}

class RetryableUploadRequest extends TestEventTarget {
  static progressListenerRegistered = false
  upload = new TestEventTarget()
  status = 0
  responseText = ''

  open(): void {}
  setRequestHeader(): void {}

  send(body: FormData): void {
    RetryableUploadRequest.progressListenerRegistered =
      (this.upload.listeners.get('progress')?.length ?? 0) > 0
    const file = body.get('file')
    const size = file instanceof File ? file.size : 1
    queueMicrotask(() => {
      this.upload.emit('progress', {
        loaded: Math.max(1, Math.floor(size / 2)),
        total: size,
        lengthComputable: true,
      })
      this.status = 503
      this.responseText = JSON.stringify({
        error: 'The file remains quarantined because scanning is unavailable.',
        retry: { uploadId: 'attachment-1', retryToken: 'retry-token' },
      })
      this.emit('load')
    })
  }
}

describe('form attachment browser runtime', () => {
  it('announces upload progress, exposes retry, then submits only the opaque reference', async () => {
    document.body.innerHTML = `
      <form data-instatic-form-mode="cms" data-instatic-form-id="contact" data-instatic-page-id="page-home" data-instatic-page-token="page-token">
        <input
          type="file"
          name="documents"
          data-instatic-field-id="documents"
          data-instatic-attachment-max-files="1"
          data-instatic-attachment-max-bytes="1024"
        >
        <button type="submit">Send</button>
        <p data-instatic-form-message="status"></p>
      </form>
    `
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
    const file = new File(
      [new TextEncoder().encode('%PDF-1.7\nsafe\n%%EOF')],
      'document.pdf',
      { type: 'application/pdf' },
    )
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [file],
    })

    const originalFetch = globalThis.fetch
    const originalXhr = globalThis.XMLHttpRequest
    const submitted: Array<Record<string, unknown>> = []
    ;(globalThis as Record<string, unknown>).XMLHttpRequest = RetryableUploadRequest
    ;(globalThis as Record<string, unknown>).fetch = async (
      request: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      const path = typeof request === 'string'
        ? request
        : request instanceof URL
          ? request.pathname
          : new URL(request.url).pathname
      if (path === '/_instatic/form/challenge') {
        return json({
          token: 'challenge-token',
          challenge: 'challenge',
          expiresAt: '2099-01-01T00:00:00.000Z',
        })
      }
      if (path === '/_instatic/form/attachment/scan') {
        return json({
          ok: true,
          attachment: {
            id: 'attachment-1',
            name: 'document.pdf',
            mimeType: 'application/pdf',
            sizeBytes: file.size,
            reference: 'att:v1:attachment-1:reference-token',
          },
        })
      }
      if (path === '/_instatic/form/submit') {
        submitted.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
        return json({ ok: true, rowId: 'row-1' })
      }
      throw new Error(`Unexpected request: ${path}`)
    }

    try {
      delete (window as unknown as Record<string, unknown>).__instaticFormRuntimeLoaded
      await importRuntimeScript()
      await waitFor(() => document.querySelector('form')?.hasAttribute('data-instatic-form-state') === false)

      document.querySelector('form')!.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
      await waitFor(() => Boolean(document.querySelector('[data-instatic-attachment-status] button')))

      expect(RetryableUploadRequest.progressListenerRegistered).toBe(true)
      expect(document.querySelector('[data-instatic-attachment-status]')?.textContent)
        .toContain('scanning is unavailable')

      ;(document.querySelector('[data-instatic-attachment-status] button') as HTMLButtonElement).click()
      await waitFor(() =>
        document.querySelector('[data-instatic-attachment-status]')?.textContent?.includes('ready') === true,
      )

      document.querySelector('form')!.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
      await waitFor(() => submitted.length === 1)
      expect((submitted[0].values as Record<string, unknown>).documents)
        .toBe('att:v1:attachment-1:reference-token')
      expect(JSON.stringify(submitted[0])).not.toContain('%PDF')
    } finally {
      const cleanup = (window as unknown as Record<string, unknown>)
        .__instaticFormRuntimeCleanup
      if (typeof cleanup === 'function') cleanup()
      ;(globalThis as Record<string, unknown>).fetch = originalFetch
      ;(globalThis as Record<string, unknown>).XMLHttpRequest = originalXhr
      document.body.innerHTML = ''
    }
  })
})

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

let importSerial = 0

async function importRuntimeScript(): Promise<void> {
  importSerial += 1
  const dir = join(process.cwd(), '.tmp', 'form-attachment-runtime-tests')
  await mkdir(dir, { recursive: true })
  const path = join(dir, `runtime-${importSerial}.mjs`)
  await writeFile(path, FORM_RUNTIME_JS, 'utf8')
  await import(`${pathToFileURL(path).href}?v=${importSerial}`)
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  throw new Error('Timed out waiting for form attachment runtime state')
}
