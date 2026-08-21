import {
  aiToolError,
  aiToolOk,
  type AiToolOutput,
  type ApplyComponentLibraryOptionInput,
  type ConsolidateRichTextInput,
  type InsertComponentLibraryEntryInput,
  type ListComponentLibraryInput,
  type UpdateComponentLibraryFieldInput,
} from '@core/ai'
import {
  analyseCoherentRichTextConversion,
  componentLibraryRegistry,
  filterComponentLibraryEntries,
  resolveComponentLibraryAvailability,
  type ComponentLibraryEntry,
  type ComponentLibraryDependencyHealth,
  type ComponentLibraryDependencyState,
  type ComponentLibraryField,
  type ComponentLibraryRepeaterItemField,
} from '@core/component-library'
import { AttachmentCapabilityStatusSchema } from '@core/attachments'
import { FormDraftCapabilityStatusSchema } from '@core/forms'
import { apiRequest } from '@core/http'
import type { PageNode } from '@core/page-tree'
import { providerAdapterRegistry } from '@core/provider-adapters'
import { sanitizeRichtext } from '@core/sanitize'
import { searchCapabilityHealth } from '@core/search'
import { insertComponentLibraryEntry } from '@site/component-library/componentLibraryAuthoring'
import type { EditorStore } from '@site/store/types'
import { activeRenderPage } from './documentTools'

export function runListComponentLibrary(
  input: ListComponentLibraryInput,
): AiToolOutput {
  const entries = filterComponentLibraryEntries(componentLibraryRegistry.list(), {
    ...(input.search !== undefined ? { search: input.search } : {}),
    ...(input.category ? { categories: [input.category] } : {}),
    ...(input.implementationType
      ? { implementationTypes: [input.implementationType] }
      : {}),
    ...(input.sourceType ? { sources: [input.sourceType] } : {}),
    ...(input.status ? { statuses: [input.status] } : {}),
  })
  const limit = input.limit ?? 100
  return aiToolOk({
    total: entries.length,
    entries: entries.slice(0, limit).map(describeEntry),
  })
}

export async function runInsertComponentLibraryEntry(
  input: InsertComponentLibraryEntryInput,
  store: EditorStore,
): Promise<AiToolOutput> {
  const page = activeRenderPage(store)
  if (!page) return aiToolError('No active editable document.')
  const entry = componentLibraryRegistry.get(input.entryId)
  if (!entry) {
    return aiToolError(
      `Component Library entry not found: ${input.entryId}. ` +
        'Call site_list_component_library to resolve a current entry id.',
    )
  }
  const availability = resolveComponentLibraryAvailability(
    entry,
    await dependencyStateForEntry(entry, store),
  )
  if (availability.health === 'unavailable') {
    const unavailable = availability.issues
      .filter((issue) => issue.health === 'unavailable')
      .map((issue) => issue.id)
    return aiToolError(
      unavailable.length > 0
        ? `Component ${entry.id} requires unavailable dependencies: ${unavailable.join(', ')}.`
        : `Component ${entry.id} has unavailable dependencies.`,
    )
  }
  const result = insertComponentLibraryEntry(
    store,
    page,
    entry,
    { parentId: input.parentId, index: input.index },
    { presetId: input.presetId, variantId: input.variantId },
  )
  return result.ok
    ? aiToolOk({
        nodeId: result.nodeId,
        entryId: result.metadata.entryId,
        entryVersion: result.metadata.entryVersion,
        ...(result.metadata.presetId ? { presetId: result.metadata.presetId } : {}),
        ...(result.metadata.variantId ? { variantId: result.metadata.variantId } : {}),
      })
    : aiToolError(result.error)
}

async function dependencyStateForEntry(
  entry: ComponentLibraryEntry,
  store: EditorStore,
): Promise<ComponentLibraryDependencyState> {
  const capabilities: Record<string, ComponentLibraryDependencyHealth> = {}
  for (const capabilityId of entry.requirements.capabilities) {
    if (capabilityId === 'search.index') {
      capabilities[capabilityId] = searchCapabilityHealth(store.site)
    } else if (capabilityId === 'forms.attachments') {
      capabilities[capabilityId] = await readCapabilityHealth(
        '/admin/api/cms/attachments/health',
        AttachmentCapabilityStatusSchema,
      )
    } else if (capabilityId === 'forms.drafts') {
      capabilities[capabilityId] = await readCapabilityHealth(
        '/admin/api/cms/form-drafts/health',
        FormDraftCapabilityStatusSchema,
      )
    } else {
      capabilities[capabilityId] = 'unavailable'
    }
  }

  const plugins: Record<string, ComponentLibraryDependencyHealth> = {}
  for (const registered of componentLibraryRegistry.list()) {
    if (registered.source.type === 'plugin') {
      plugins[registered.source.pluginId] = 'available'
    }
  }
  return {
    capabilities,
    providerAdapters: providerAdapterRegistry.dependencyHealth(),
    plugins,
  }
}

async function readCapabilityHealth(
  path: string,
  schema: typeof AttachmentCapabilityStatusSchema | typeof FormDraftCapabilityStatusSchema,
): Promise<ComponentLibraryDependencyHealth> {
  try {
    return (await apiRequest(path, { schema })).health
  } catch {
    return 'unavailable'
  }
}

export function runUpdateComponentLibraryField(
  input: UpdateComponentLibraryFieldInput,
  store: EditorStore,
): AiToolOutput {
  const node = catalogueNode(store, input.nodeId)
  if (!node) {
    return aiToolError(
      `Node ${input.nodeId} is not a governed Component Library instance in the active document.`,
    )
  }
  const entry = componentLibraryRegistry.getVersion(
    node.catalogueInstance!.entryId,
    node.catalogueInstance!.entryVersion,
  )
  const field = entry?.fields.find((candidate) => candidate.key === input.fieldKey)
  if (!field) {
    return aiToolError(
      `Field "${input.fieldKey}" is not declared by ${node.catalogueInstance!.entryId}.`,
    )
  }
  const value = validatedFieldValue(field, input.value)
  if (!value.ok) return aiToolError(value.error)
  if (!store.updateComponentLibraryField(input.nodeId, input.fieldKey, value.value)) {
    return aiToolError(`Could not update governed field "${input.fieldKey}" on ${input.nodeId}.`)
  }
  return aiToolOk({
    nodeId: input.nodeId,
    entryId: node.catalogueInstance!.entryId,
    entryVersion: node.catalogueInstance!.entryVersion,
    fieldKey: input.fieldKey,
  })
}

export function runConsolidateRichText(
  input: ConsolidateRichTextInput,
  store: EditorStore,
): AiToolOutput {
  const page = activeRenderPage(store)
  const entry = componentLibraryRegistry.get('creator-signal.site.rich-text-section')
  if (!page || !entry) return aiToolError('The governed Rich Text Section is not installed in the active document.')
  const analysis = analyseCoherentRichTextConversion(page, input.nodeId, entry)
  if (!analysis.eligible) return aiToolError(analysis.reason)
  if (!store.consolidateCoherentRichText(input.nodeId)) {
    return aiToolError('The prose changed before it could be consolidated. Review the preview and try again.')
  }
  return aiToolOk({
    nodeId: input.nodeId,
    entryId: entry.id,
    entryVersion: entry.version,
    replacedNodeIds: analysis.candidate.sourceNodeIds,
    preview: analysis.candidate.props,
  })
}

function validatedFieldValue(
  field: ComponentLibraryField,
  value: unknown,
): { ok: true; value: unknown } | { ok: false; error: string } {
  if (field.type === 'repeater') {
    return validatedRepeaterValue(field, value)
  }
  if (field.type === 'number') {
    return typeof value === 'number' && Number.isFinite(value)
      ? { ok: true, value }
      : { ok: false, error: `Field "${field.key}" requires a finite number.` }
  }
  if (field.type === 'boolean') {
    return typeof value === 'boolean'
      ? { ok: true, value }
      : { ok: false, error: `Field "${field.key}" requires a boolean.` }
  }
  if (typeof value !== 'string') {
    return { ok: false, error: `Field "${field.key}" requires a string.` }
  }
  return {
    ok: true,
    value: field.type === 'rich-text' ? sanitizeRichtext(value) : value,
  }
}

function validatedRepeaterValue(
  field: Extract<ComponentLibraryField, { type: 'repeater' }>,
  value: unknown,
): { ok: true; value: unknown } | { ok: false; error: string } {
  if (!Array.isArray(value)) {
    return { ok: false, error: `Field "${field.key}" requires an array of records.` }
  }
  if (value.length < field.minItems) {
    return {
      ok: false,
      error: `Field "${field.key}" requires at least ${field.minItems} item(s).`,
    }
  }
  if (field.maxItems !== undefined && value.length > field.maxItems) {
    return {
      ok: false,
      error: `Field "${field.key}" allows at most ${field.maxItems} item(s).`,
    }
  }

  const declared = new Map(field.itemFields.map((itemField) => [itemField.key, itemField]))
  const normalized: Array<Record<string, unknown>> = []
  for (let index = 0; index < value.length; index += 1) {
    const rawItem = value[index]
    if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
      return {
        ok: false,
        error: `Field "${field.key}" item ${index + 1} must be a record.`,
      }
    }
    const item = rawItem as Record<string, unknown>
    const unknownKey = Object.keys(item).find((key) => !declared.has(key))
    if (unknownKey) {
      return {
        ok: false,
        error: `Field "${field.key}" item ${index + 1} contains undeclared key "${unknownKey}".`,
      }
    }
    const next: Record<string, unknown> = {}
    for (const itemField of field.itemFields) {
      const itemValue = item[itemField.key]
      if (itemValue === undefined) {
        if (itemField.required) {
          return {
            ok: false,
            error: `Field "${field.key}" item ${index + 1} requires "${itemField.key}".`,
          }
        }
        continue
      }
      const validated = validatedRepeaterItemValue(field.key, index, itemField, itemValue)
      if (!validated.ok) return validated
      next[itemField.key] = validated.value
    }
    normalized.push(next)
  }
  return { ok: true, value: normalized }
}

function validatedRepeaterItemValue(
  fieldKey: string,
  index: number,
  itemField: ComponentLibraryRepeaterItemField,
  value: unknown,
): { ok: true; value: unknown } | { ok: false; error: string } {
  const location = `Field "${fieldKey}" item ${index + 1} property "${itemField.key}"`
  if (itemField.type === 'boolean') {
    return typeof value === 'boolean'
      ? { ok: true, value }
      : { ok: false, error: `${location} requires a boolean.` }
  }
  if (itemField.type === 'number') {
    return typeof value === 'number' && Number.isFinite(value)
      ? { ok: true, value }
      : { ok: false, error: `${location} requires a finite number.` }
  }
  if (typeof value !== 'string') {
    return { ok: false, error: `${location} requires a string.` }
  }
  if (itemField.required && value.trim() === '') {
    return { ok: false, error: `${location} cannot be empty.` }
  }
  if (
    itemField.type === 'select' &&
    !itemField.options?.some((option) => option.value === value)
  ) {
    return { ok: false, error: `${location} is not an allowed option.` }
  }
  return { ok: true, value }
}

export function runApplyComponentLibraryOption(
  input: ApplyComponentLibraryOptionInput,
  store: EditorStore,
): AiToolOutput {
  const node = catalogueNode(store, input.nodeId)
  if (!node) {
    return aiToolError(
      `Node ${input.nodeId} is not a governed Component Library instance in the active document.`,
    )
  }
  const entry = componentLibraryRegistry.getVersion(
    node.catalogueInstance!.entryId,
    node.catalogueInstance!.entryVersion,
  )
  const options = input.kind === 'preset' ? entry?.presets : entry?.variants
  if (!options?.some((candidate) => candidate.id === input.optionId)) {
    return aiToolError(
      `${input.kind === 'preset' ? 'Preset' : 'Variant'} "${input.optionId}" ` +
        `is not declared by ${node.catalogueInstance!.entryId}.`,
    )
  }
  if (!store.applyComponentLibraryOption(input.nodeId, input.kind, input.optionId)) {
    return aiToolError(
      `Could not apply governed ${input.kind} "${input.optionId}" to ${input.nodeId}.`,
    )
  }
  return aiToolOk({
    nodeId: input.nodeId,
    entryId: node.catalogueInstance!.entryId,
    entryVersion: node.catalogueInstance!.entryVersion,
    kind: input.kind,
    optionId: input.optionId,
  })
}

function catalogueNode(store: EditorStore, nodeId: string): PageNode | undefined {
  const node = activeRenderPage(store)?.nodes[nodeId]
  return node?.catalogueInstance ? node : undefined
}

function describeEntry(entry: ComponentLibraryEntry) {
  return {
    id: entry.id,
    version: entry.version,
    name: entry.name,
    description: entry.description,
    category: entry.category,
    tags: entry.tags,
    status: entry.status,
    composition: entry.composition,
    source: entry.source,
    implementation: entry.implementation,
    fields: entry.fields,
    presets: entry.presets.map(({ values: _values, ...option }) => option),
    variants: entry.variants.map(({ values: _values, ...option }) => option),
    slots: entry.slots,
    constraints: entry.constraints,
    requirements: entry.requirements,
    documentation: entry.documentation,
    accessibility: entry.accessibility,
  }
}
