import type { FormDraftCapabilityStatus } from '@core/forms'

export interface FormDraftPolicy {
  enabled: boolean
  ttlDays: number
  maxBytes: number
}

let policy: FormDraftPolicy = {
  enabled: false,
  ttlDays: 30,
  maxBytes: 256 * 1024,
}

export function configureFormDraftRuntime(input: FormDraftPolicy): void {
  policy = { ...input }
}

export function resetFormDraftRuntime(): void {
  configureFormDraftRuntime({
    enabled: false,
    ttlDays: 30,
    maxBytes: 256 * 1024,
  })
}

export function getFormDraftPolicy(): FormDraftPolicy {
  return policy
}

export function formDraftCapabilityStatus(): FormDraftCapabilityStatus {
  return {
    health: policy.enabled ? 'available' : 'unavailable',
    ...(!policy.enabled
      ? { message: 'Persistent form drafts are disabled by the operator.' }
      : {}),
    policy,
  }
}
