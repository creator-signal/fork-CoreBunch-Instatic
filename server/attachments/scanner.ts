import { toArrayBuffer } from '../binary'
import type { AttachmentScanner } from './types'

export function createUnavailableAttachmentScanner(
  reason = 'No malware scanner is configured.',
): AttachmentScanner {
  return {
    id: 'unavailable',
    async health() {
      return { health: 'unavailable', message: reason }
    },
    async scan() {
      return { status: 'unavailable', reason }
    },
  }
}

/**
 * Small provider-neutral scanner adapter.
 *
 * The configured endpoint receives raw bytes and must return JSON with
 * `{ "status": "clean" }` or `{ "status": "rejected", "reason": "..." }`.
 * Non-2xx responses and transport failures are treated as unavailable; the
 * host keeps the upload quarantined so a later retry can re-scan the same
 * bytes without asking the visitor to upload them again.
 */
export function createHttpAttachmentScanner(input: {
  endpoint: string
  bearerToken?: string
  timeoutMs?: number
}): AttachmentScanner {
  const endpoint = input.endpoint
  const timeoutMs = input.timeoutMs ?? 15_000
  let lastHealth: { health: 'available' | 'degraded'; message?: string } = {
    health: 'degraded',
    message: 'Scanner is configured but has not completed a scan yet.',
  }

  return {
    id: 'http',
    async health() {
      return lastHealth
    },
    async scan(file) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const headers = new Headers({
          accept: 'application/json',
          'content-type': 'application/octet-stream',
          'x-instatic-filename': encodeURIComponent(file.filename),
          'x-instatic-mime-type': file.mimeType,
          'x-instatic-sha256': file.sha256,
        })
        if (input.bearerToken) {
          headers.set('authorization', `Bearer ${input.bearerToken}`)
        }
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: toArrayBuffer(file.bytes),
          signal: controller.signal,
        })
        if (!response.ok) {
          const reason = `Scanner returned HTTP ${response.status}.`
          lastHealth = { health: 'degraded', message: reason }
          return { status: 'unavailable', reason }
        }
        const body = await response.json().catch(() => null) as {
          status?: unknown
          reason?: unknown
        } | null
        if (body?.status === 'clean') {
          lastHealth = { health: 'available' }
          return { status: 'clean' }
        }
        if (body?.status === 'rejected') {
          lastHealth = { health: 'available' }
          return {
            status: 'rejected',
            reason: typeof body.reason === 'string'
              ? body.reason
              : 'The malware scanner rejected this file.',
          }
        }
        const reason = 'Scanner returned an invalid response.'
        lastHealth = { health: 'degraded', message: reason }
        return { status: 'error', reason }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err)
        lastHealth = { health: 'degraded', message: reason }
        return { status: 'unavailable', reason }
      } finally {
        clearTimeout(timeout)
      }
    },
  }
}

