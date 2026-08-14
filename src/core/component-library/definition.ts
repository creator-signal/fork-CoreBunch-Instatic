import { safeParseValue } from '@core/utils/typeboxHelpers'
import {
  ComponentLibraryEntrySchema,
  type ComponentLibraryEntry,
} from './schemas'

export class ComponentLibraryDefinitionError extends Error {
  readonly path: string

  constructor(path: string, message: string) {
    super(`[component-library] ${path}: ${message}`)
    this.name = 'ComponentLibraryDefinitionError'
    this.path = path
  }
}

function assertUniqueIds(collection: string, itemIds: readonly string[]): void {
  const ids = new Set<string>()
  for (const id of itemIds) {
    if (ids.has(id)) {
      throw new ComponentLibraryDefinitionError(
        `${collection}.${id}`,
        `Duplicate ${collection} identifier "${id}".`,
      )
    }
    ids.add(id)
  }
}

function assertEntryInvariants(entry: ComponentLibraryEntry): void {
  assertUniqueIds('fields', entry.fields.map((field) => field.key))
  assertUniqueIds('variants', entry.variants.map((variant) => variant.id))
  assertUniqueIds('presets', entry.presets.map((preset) => preset.id))
  assertUniqueIds('slots', entry.slots.map((slot) => slot.id))
  assertUniqueIds(
    'accessibility.checks',
    entry.accessibility?.checks.map((check) => check.rule) ?? [],
  )

  if (entry.composition === 'leaf' && entry.slots.length > 0) {
    throw new ComponentLibraryDefinitionError(
      'slots',
      'A leaf component cannot declare slots. Use typed fields for its authored data.',
    )
  }

  for (const field of entry.fields) {
    if (field.type !== 'repeater') continue
    assertUniqueIds(
      `fields.${field.key}.itemFields`,
      field.itemFields.map((itemField) => itemField.key),
    )
    if (field.maxItems !== undefined && field.maxItems < field.minItems) {
      throw new ComponentLibraryDefinitionError(
        `fields.${field.key}.maxItems`,
        'maxItems must be greater than or equal to minItems.',
      )
    }
    for (const itemField of field.itemFields) {
      if (
        itemField.type === 'select' &&
        (!itemField.options || itemField.options.length === 0)
      ) {
        throw new ComponentLibraryDefinitionError(
          `fields.${field.key}.itemFields.${itemField.key}.options`,
          'A repeater select field must declare at least one option.',
        )
      }
    }
  }

  if (entry.replacementEntryId === entry.id) {
    throw new ComponentLibraryDefinitionError(
      'replacementEntryId',
      'An entry cannot replace itself.',
    )
  }

  if (entry.implementation.type === 'primitive') {
    const presetId = entry.implementation.presetId
    if (presetId && !entry.presets.some((preset) => preset.id === presetId)) {
      throw new ComponentLibraryDefinitionError(
        'implementation.presetId',
        `Preset "${presetId}" is not declared by this entry.`,
      )
    }
  }

  if (entry.implementation.type === 'capability-backed') {
    const requirements = entry.requirements
    if (
      requirements.capabilities.length === 0 &&
      requirements.providerAdapters.length === 0 &&
      requirements.plugins.length === 0
    ) {
      throw new ComponentLibraryDefinitionError(
        'requirements',
        'A capability-backed entry must declare at least one capability, provider adapter or plugin.',
      )
    }
  }

  for (const slot of entry.slots) {
    if (slot.maxItems !== undefined && slot.maxItems < slot.minItems) {
      throw new ComponentLibraryDefinitionError(
        `slots.${slot.id}.maxItems`,
        'maxItems must be greater than or equal to minItems.',
      )
    }
  }
}

/**
 * Validate an entry at an untyped registration boundary, then enforce the
 * cross-field invariants that JSON Schema cannot express.
 */
export function parseComponentLibraryEntry(raw: unknown): ComponentLibraryEntry {
  const result = safeParseValue(ComponentLibraryEntrySchema, raw)
  if (!result.ok) {
    const issue = result.errors[0]
    throw new ComponentLibraryDefinitionError(
      issue?.path || '<root>',
      issue?.message || 'Invalid Component Library entry.',
    )
  }

  assertEntryInvariants(result.value)
  return result.value
}
