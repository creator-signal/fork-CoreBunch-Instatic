import type { AttachmentCapabilityStatus } from '@core/attachments'
import { createUnavailableAttachmentScanner } from './scanner'
import type {
  AttachmentRuntime,
  AttachmentScanner,
  AttachmentStorageAdapter,
} from './types'

let configuredRuntime: AttachmentRuntime | null = null

export function configureAttachmentRuntime(input: {
  policy: AttachmentRuntime['policy']
  storage: AttachmentStorageAdapter
  scanner?: AttachmentScanner
}): void {
  configuredRuntime = {
    policy: input.policy,
    storage: input.storage,
    scanner: input.scanner ?? createUnavailableAttachmentScanner(),
  }
}

export function resetAttachmentRuntime(): void {
  configuredRuntime = null
}

export function getAttachmentRuntime(): AttachmentRuntime | null {
  return configuredRuntime
}

export async function attachmentCapabilityStatus(): Promise<AttachmentCapabilityStatus> {
  const runtime = configuredRuntime
  if (!runtime) {
    return {
      health: 'unavailable',
      storage: 'unavailable',
      scanner: 'unavailable',
      message: 'Attachment runtime is not configured.',
      policy: {
        enabled: false,
        allowedMimeTypes: [],
        maxFileBytes: 1,
        maxFiles: 1,
        temporaryTtlSeconds: 60,
        retentionDays: 1,
      },
    }
  }

  const [storage, scanner] = await Promise.all([
    runtime.storage.health(),
    runtime.scanner.health(),
  ])
  const health = !runtime.policy.enabled
    ? 'unavailable'
    : storage.health === 'unavailable' || scanner.health === 'unavailable'
      ? 'unavailable'
      : storage.health === 'degraded' || scanner.health === 'degraded'
        ? 'degraded'
        : 'available'
  const message = !runtime.policy.enabled
    ? 'Private attachments are disabled by the operator.'
    : storage.message ?? scanner.message

  return {
    health,
    storage: storage.health,
    scanner: scanner.health,
    ...(message ? { message } : {}),
    policy: runtime.policy,
  }
}

