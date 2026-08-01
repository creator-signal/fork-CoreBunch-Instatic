import { safeParseValue } from '@core/utils/typeboxHelpers'
import {
  ProviderAdapterMetadataSchema,
  type ProviderAdapterDefinition,
  type ProviderAdapterMetadata,
} from './schemas'

export class ProviderAdapterDefinitionError extends Error {
  readonly path: string

  constructor(path: string, message: string) {
    super(`[provider-adapter] ${path}: ${message}`)
    this.name = 'ProviderAdapterDefinitionError'
    this.path = path
  }
}

export function parseProviderAdapterDefinition(
  raw: ProviderAdapterDefinition,
): ProviderAdapterDefinition {
  const { resolve, ...rawMetadata } = raw
  const result = safeParseValue(ProviderAdapterMetadataSchema, rawMetadata)
  if (!result.ok) {
    const issue = result.errors[0]
    throw new ProviderAdapterDefinitionError(
      issue?.path || '<root>',
      issue?.message || 'Invalid provider adapter.',
    )
  }
  if (typeof resolve !== 'function') {
    throw new ProviderAdapterDefinitionError(
      'resolve',
      'A provider adapter must define a resolver.',
    )
  }
  assertMetadata(result.value)
  return { ...result.value, resolve }
}

export function providerAdapterMetadata(
  definition: ProviderAdapterDefinition,
): ProviderAdapterMetadata {
  const { resolve: _resolve, ...metadata } = definition
  return metadata
}

function assertMetadata(metadata: ProviderAdapterMetadata): void {
  const keys = new Set<string>()
  for (const field of metadata.configFields) {
    if (keys.has(field.key)) {
      throw new ProviderAdapterDefinitionError(
        `configFields.${field.key}`,
        `Duplicate configuration key "${field.key}".`,
      )
    }
    keys.add(field.key)
    if (field.type === 'select' && (!field.options || field.options.length === 0)) {
      throw new ProviderAdapterDefinitionError(
        `configFields.${field.key}.options`,
        'Select configuration fields require at least one option.',
      )
    }
    if (field.type !== 'select' && field.options) {
      throw new ProviderAdapterDefinitionError(
        `configFields.${field.key}.options`,
        'Only select configuration fields may declare options.',
      )
    }
  }

  for (const origin of metadata.allowedOrigins) {
    let url: URL
    try {
      url = new URL(origin)
    } catch {
      throw new ProviderAdapterDefinitionError(
        'allowedOrigins',
        `"${origin}" is not a valid absolute origin.`,
      )
    }
    if (
      url.protocol !== 'https:' ||
      url.origin !== origin ||
      url.pathname !== '/'
    ) {
      throw new ProviderAdapterDefinitionError(
        'allowedOrigins',
        `"${origin}" must be an HTTPS origin without a path, query or fragment.`,
      )
    }
  }
}
