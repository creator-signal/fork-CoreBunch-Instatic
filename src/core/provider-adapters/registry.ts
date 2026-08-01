import {
  parseProviderAdapterDefinition,
  providerAdapterMetadata,
} from './definition'
import type {
  ProviderAdapterDefinition,
  ProviderAdapterHealth,
  ProviderAdapterInput,
  ProviderAdapterMetadata,
  ProviderAdapterResolution,
  ProviderAdapterStatus,
  ProviderEditorPreview,
  ProviderRenderPlan,
} from './schemas'

const DEFAULT_STATUS: ProviderAdapterStatus = {
  health: 'unavailable',
  message: 'The provider adapter is not configured.',
}

export class ProviderAdapterRegistry {
  private readonly definitions = new Map<string, ProviderAdapterDefinition>()
  private readonly statuses = new Map<string, ProviderAdapterStatus>()

  register(raw: ProviderAdapterDefinition): ProviderAdapterDefinition {
    const definition = parseProviderAdapterDefinition(raw)
    if (this.definitions.has(definition.id)) {
      throw new Error(
        `[ProviderAdapterRegistry] Adapter "${definition.id}" is already registered.`,
      )
    }
    this.definitions.set(definition.id, definition)
    return definition
  }

  registerOrReplace(raw: ProviderAdapterDefinition): ProviderAdapterDefinition {
    const definition = parseProviderAdapterDefinition(raw)
    this.definitions.set(definition.id, definition)
    return definition
  }

  unregister(id: string): void {
    this.definitions.delete(id)
    this.statuses.delete(id)
  }

  get(id: string): ProviderAdapterDefinition | undefined {
    return this.definitions.get(id)
  }

  list(): ProviderAdapterMetadata[] {
    return Array.from(this.definitions.values())
      .map(providerAdapterMetadata)
      .sort((left, right) =>
        left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
      )
  }

  setStatus(id: string, status: ProviderAdapterStatus): void {
    if (!this.definitions.has(id)) {
      throw new Error(
        `[ProviderAdapterRegistry] Adapter "${id}" is not registered.`,
      )
    }
    this.statuses.set(id, {
      health: status.health,
      ...(status.message ? { message: status.message } : {}),
    })
  }

  status(id: string): ProviderAdapterStatus {
    if (!this.definitions.has(id)) {
      return {
        health: 'unavailable',
        message: 'The provider adapter is not installed.',
      }
    }
    return this.statuses.get(id) ?? DEFAULT_STATUS
  }

  dependencyHealth(): Record<string, ProviderAdapterHealth> {
    return Object.fromEntries(
      Array.from(this.definitions).map(([id]) => [id, this.status(id).health]),
    )
  }

  resolve(adapterId: string, input: ProviderAdapterInput): ProviderAdapterResolution {
    const definition = this.definitions.get(adapterId)
    if (!definition) {
      return {
        status: 'unavailable',
        message: 'The selected provider adapter is not installed.',
      }
    }
    const status = this.status(adapterId)
    const metadata = providerAdapterMetadata(definition)
    if (status.health === 'unavailable') {
      return {
        status: 'unavailable',
        adapter: metadata,
        message: status.message || metadata.fallbackText,
      }
    }
    if (!definition.kinds.includes(input.kind)) {
      return {
        status: 'invalid',
        adapter: metadata,
        message: `${definition.name} does not support ${input.kind}.`,
      }
    }

    const configError = validateConfig(metadata, input.config)
    if (configError) {
      return { status: 'invalid', adapter: metadata, message: configError }
    }

    let plan: ProviderRenderPlan
    try {
      plan = definition.resolve(input)
    } catch {
      return {
        status: 'invalid',
        adapter: metadata,
        message: `${definition.name} rejected this configuration.`,
      }
    }
    const planError = validatePlan(metadata, plan)
    if (planError) {
      return { status: 'invalid', adapter: metadata, message: planError }
    }
    return {
      status: status.health === 'degraded' ? 'degraded' : 'ready',
      adapter: metadata,
      plan,
      ...(status.message ? { message: status.message } : {}),
    }
  }

  editorPreview(
    adapterId: string,
    kind: ProviderAdapterInput['kind'],
  ): ProviderEditorPreview {
    const definition = this.definitions.get(adapterId)
    const status = this.status(adapterId)
    return {
      adapterId,
      providerName: definition?.name ?? adapterId,
      kind,
      consentCategory: definition?.consentCategory ?? 'essential',
      health: status.health,
      inert: true,
      message:
        status.health === 'available'
          ? 'Provider content is disabled in the editor canvas.'
          : status.message || 'Provider content is unavailable.',
    }
  }
}

export const providerAdapterRegistry = new ProviderAdapterRegistry()

function validateConfig(
  metadata: ProviderAdapterMetadata,
  config: Record<string, unknown>,
): string | null {
  const declared = new Map(metadata.configFields.map((field) => [field.key, field]))
  for (const key of Object.keys(config)) {
    const field = declared.get(key)
    if (!field) return `Unknown provider configuration field "${key}".`
    if (field.exposure === 'secret') {
      return `Secret provider configuration "${key}" cannot be stored on a component.`
    }
  }

  for (const field of metadata.configFields) {
    const value = config[field.key]
    if (field.exposure === 'secret') continue
    if (
      field.required &&
      (value === undefined || value === null || value === '')
    ) {
      return `${field.label} is required.`
    }
    if (value === undefined || value === null || value === '') continue
    if (
      (field.type === 'text' || field.type === 'url' || field.type === 'select') &&
      typeof value !== 'string'
    ) {
      return `${field.label} must be text.`
    }
    if (field.type === 'number' && typeof value !== 'number') {
      return `${field.label} must be a number.`
    }
    if (field.type === 'boolean' && typeof value !== 'boolean') {
      return `${field.label} must be true or false.`
    }
    if (
      field.type === 'select' &&
      !field.options?.some((option) => option.value === value)
    ) {
      return `${field.label} must use an allowed value.`
    }
    if (field.type === 'url') {
      try {
        const url = new URL(String(value))
        if (url.protocol !== 'https:') return `${field.label} must use HTTPS.`
      } catch {
        return `${field.label} must be a valid absolute URL.`
      }
    }
  }
  return null
}

function validatePlan(
  metadata: ProviderAdapterMetadata,
  plan: ProviderRenderPlan,
): string | null {
  if (!plan.title.trim()) return 'Provider content requires an accessible title.'
  if (plan.type === 'runtime') {
    const secretFields = new Set(
      metadata.configFields
        .filter((field) => field.exposure === 'secret')
        .map((field) => field.key),
    )
    for (const key of Object.keys(plan.publicConfig)) {
      if (secretFields.has(key)) {
        return `Secret provider configuration "${key}" cannot enter a runtime plan.`
      }
    }
    return null
  }

  let url: URL
  try {
    url = new URL(plan.src)
  } catch {
    return 'The provider returned an invalid embed URL.'
  }
  if (url.protocol !== 'https:' || !metadata.allowedOrigins.includes(url.origin)) {
    return 'The provider returned a URL outside its approved origin allow-list.'
  }
  if (!metadata.iframePolicy) {
    return 'Iframe providers must declare a sandbox and permissions policy.'
  }
  return null
}
