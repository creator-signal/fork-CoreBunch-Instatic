import type { ComponentLibraryEntry, ComponentLibraryField } from '@core/component-library'
import { creatorSignalComponentLibraryEntries } from './component-library'

export const CREATOR_SIGNAL_AUTHORING_TASKS = [
  'discover',
  'insert',
  'configure',
  'preview',
  'publish',
  'revise',
  'remove',
] as const

export type CreatorSignalAuthoringTask =
  typeof CREATOR_SIGNAL_AUTHORING_TASKS[number]

export interface CreatorSignalAuthoringTaskSupport {
  editor: string
  mcp: string
}

export interface CreatorSignalAuthoringTaskRow {
  entryId: string
  name: string
  category: string
  composition: 'leaf' | 'container'
  documentKinds: readonly ('page' | 'template')[]
  fields: readonly string[]
  repeaters: readonly string[]
  tasks: Readonly<Record<CreatorSignalAuthoringTask, CreatorSignalAuthoringTaskSupport>>
}

const RAW_IMPLEMENTATION_FIELD_KEYS = new Set([
  'children',
  'classIds',
  'dynamicBindings',
  'htmlAttributes',
  'inlineStyles',
  'moduleId',
  'props',
])

function supportsConfigure(entry: ComponentLibraryEntry): CreatorSignalAuthoringTaskSupport {
  if (entry.fields.length > 0) {
    return {
      editor: 'Components properties fields and repeaters',
      mcp: 'site_update_component_field',
    }
  }
  return {
    editor: 'Materialized child Components properties',
    mcp: 'site_insert_component then site_update_component_field on an authorable child',
  }
}

function taskSupport(entry: ComponentLibraryEntry): CreatorSignalAuthoringTaskRow['tasks'] {
  return {
    discover: {
      editor: 'Components catalogue search and provider filter',
      mcp: 'site_list_component_library',
    },
    insert: {
      editor: 'Components catalogue insertion with placement explanation',
      mcp: 'site_insert_component',
    },
    configure: supportsConfigure(entry),
    preview: {
      editor: 'Canvas preview at mobile, tablet, and desktop',
      mcp: 'site_open_document then site_render_snapshot',
    },
    publish: {
      editor: 'Publish the active page or shared template',
      mcp: 'site_publish after the browser-bridged draft write',
    },
    revise: {
      editor: 'Edit the retained component instance and publish a revision',
      mcp: 'site_update_component_field then site_publish',
    },
    remove: {
      editor: 'Components tree remove action',
      mcp: 'site_delete_node',
    },
  }
}

function matrixRow(entry: ComponentLibraryEntry): CreatorSignalAuthoringTaskRow {
  const repeaters = entry.fields.filter(
    (field): field is Extract<ComponentLibraryField, { type: 'repeater' }> => field.type === 'repeater',
  )
  return {
    entryId: entry.id,
    name: entry.name,
    category: entry.category,
    composition: entry.composition,
    documentKinds: entry.constraints.allowedDocumentKinds ?? ['page', 'template'],
    fields: entry.fields.map((field) => field.key),
    repeaters: repeaters.map((field) => field.key),
    tasks: taskSupport(entry),
  }
}

/**
 * Application-owned task matrix for the complete Creator Signal catalogue.
 * It is derived from registered entry contracts so a new, renamed, or removed
 * entry cannot leave a stale authoring checklist behind.
 */
export const creatorSignalAuthoringTaskMatrix: readonly CreatorSignalAuthoringTaskRow[] =
  creatorSignalComponentLibraryEntries.map(matrixRow)

export function validateCreatorSignalAuthoringTaskMatrix(): readonly string[] {
  const issues: string[] = []
  const entryIds = new Set<string>()
  const matrixIds = new Set(creatorSignalAuthoringTaskMatrix.map((row) => row.entryId))

  for (const entry of creatorSignalComponentLibraryEntries) {
    if (entryIds.has(entry.id)) issues.push(`Duplicate catalogue entry ${entry.id}.`)
    entryIds.add(entry.id)
    if (!matrixIds.has(entry.id)) issues.push(`Missing task-matrix row for ${entry.id}.`)
    if (!entry.name.trim()) issues.push(`${entry.id} has no author-facing name.`)
    if (!entry.category.trim()) issues.push(`${entry.id} has no author-facing category.`)
    if (!entry.description.trim()) issues.push(`${entry.id} has no author-facing description.`)
    if (entry.composition === 'leaf' && entry.slots.length > 0) {
      issues.push(`${entry.id} is a leaf but exposes a content slot.`)
    }
    for (const field of entry.fields) {
      if (RAW_IMPLEMENTATION_FIELD_KEYS.has(field.key)) {
        issues.push(`${entry.id} exposes raw implementation field ${field.key}.`)
      }
      if (!field.label.trim()) issues.push(`${entry.id}.${field.key} has no field label.`)
      if (!field.description.trim()) issues.push(`${entry.id}.${field.key} has no field help text.`)
      if (field.type === 'repeater') {
        if (!field.itemLabel.trim()) issues.push(`${entry.id}.${field.key} has no repeater item label.`)
        if (field.minItems < 0) issues.push(`${entry.id}.${field.key} has an invalid repeater minimum.`)
        if (field.maxItems !== undefined && field.maxItems < field.minItems) {
          issues.push(`${entry.id}.${field.key} has an invalid repeater range.`)
        }
        for (const itemField of field.itemFields) {
          if (!itemField.label.trim()) issues.push(`${entry.id}.${field.key}.${itemField.key} has no item label.`)
          if (!itemField.description.trim()) issues.push(`${entry.id}.${field.key}.${itemField.key} has no item help text.`)
        }
      }
    }
  }

  for (const row of creatorSignalAuthoringTaskMatrix) {
    if (!entryIds.has(row.entryId)) issues.push(`Task matrix contains unknown entry ${row.entryId}.`)
    for (const task of CREATOR_SIGNAL_AUTHORING_TASKS) {
      const support = row.tasks[task]
      if (!support?.editor) issues.push(`${row.entryId} has no editor support for ${task}.`)
      if (!support?.mcp) issues.push(`${row.entryId} has no MCP support for ${task}.`)
    }
  }

  return issues
}

export function renderCreatorSignalAuthoringTaskMatrix(): string {
  const rows = creatorSignalAuthoringTaskMatrix.map((row) => [
    `| ${row.name} | \`${row.entryId}\` | ${row.documentKinds.join(', ')} | ${row.composition} | ${row.fields.join(', ') || 'Materialized child fields'} | ${row.repeaters.join(', ') || '—'} |`,
  ])
  return [
    '| Component | Entry ID | Placement | Composition | Author controls | Repeaters |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n')
}
