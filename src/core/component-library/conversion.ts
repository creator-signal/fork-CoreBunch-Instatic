import type { CatalogueInstanceMetadata, PageNode } from '@core/page-tree'
import type { ComponentLibraryEntry, ComponentLibraryImplementation } from './schemas'

export interface ComponentLibraryConversionField {
  key: string
  label: string
  value: unknown
}

export interface ComponentLibraryConversionCandidate {
  entry: ComponentLibraryEntry
  presetId?: string
  metadata: CatalogueInstanceMetadata
  fields: ComponentLibraryConversionField[]
  retainedChildCount: number
  retainsStyling: boolean
}

export type ComponentLibraryConversionAnalysis =
  | {
      eligible: true
      candidate: ComponentLibraryConversionCandidate
    }
  | {
      eligible: false
      reason: string
    }

/**
 * Find lossless primitive conversions for a freeform node. A candidate may
 * stamp authoring identity only: existing props, children and styles are never
 * rewritten. Non-authorable implementation props must already match either
 * the module default or the selected preset's canonical value.
 */
export function findComponentLibraryConversionCandidates(
  node: PageNode,
  entries: readonly ComponentLibraryEntry[],
  defaultsForModule: (moduleId: string) => Readonly<Record<string, unknown>> | undefined,
): ComponentLibraryConversionCandidate[] {
  if (node.catalogueInstance) return []
  const candidates: ComponentLibraryConversionCandidate[] = []
  for (const entry of entries) {
    const implementation = backingPrimitive(entry.implementation)
    if (!implementation || implementation.moduleId !== node.moduleId) continue
    const presetIds = conversionPresetIds(entry, implementation.presetId)
    for (const presetId of presetIds) {
      const analysis = analyseComponentLibraryPrimitiveConversion(
        node,
        entry,
        defaultsForModule(node.moduleId),
        presetId,
      )
      if (analysis.eligible) candidates.push(analysis.candidate)
    }
  }
  // A canonical primitive without a preset is the only identity that can be
  // inferred when more-specific presets resolve to the same default props.
  // For example, a plain div is a Container; its bytes alone do not prove it
  // was authored as a Form Field Group or Form Actions boundary.
  const canonical = candidates.filter((candidate) => !candidate.presetId)
  if (canonical.length === 1) return canonical
  return candidates
}

export function analyseComponentLibraryPrimitiveConversion(
  node: PageNode,
  entry: ComponentLibraryEntry,
  moduleDefaults: Readonly<Record<string, unknown>> | undefined,
  presetId?: string,
): ComponentLibraryConversionAnalysis {
  if (node.catalogueInstance) return ineligible('This node is already governed.')
  const implementation = backingPrimitive(entry.implementation)
  if (!implementation) return ineligible('Only primitive catalogue entries are supported.')
  if (implementation.moduleId !== node.moduleId) {
    return ineligible('The catalogue implementation does not match this node.')
  }
  if (!moduleDefaults) return ineligible('The backing module is not installed.')

  const requiredPresetId = implementation.presetId
  const resolvedPresetId = presetId ?? requiredPresetId
  if (requiredPresetId && resolvedPresetId !== requiredPresetId) {
    return ineligible(`This entry requires the ${requiredPresetId} preset.`)
  }
  const preset = resolvedPresetId
    ? entry.presets.find((candidate) => candidate.id === resolvedPresetId)
    : undefined
  if (resolvedPresetId && !preset) {
    return ineligible(`Preset "${resolvedPresetId}" is not declared by this entry.`)
  }

  const fieldKeys = new Set(entry.fields.map((field) => field.key))
  const propKeys = new Set([...Object.keys(moduleDefaults), ...Object.keys(node.props)])
  for (const key of propKeys) {
    if (fieldKeys.has(key)) continue
    if (preset && Object.prototype.hasOwnProperty.call(preset.values, key)) {
      if (!deepEqual(node.props[key], preset.values[key])) {
        return ineligible(`Implementation property "${key}" does not match the preset.`)
      }
      continue
    }
    if (!deepEqual(node.props[key], moduleDefaults[key])) {
      return ineligible(`Implementation property "${key}" differs from the module default.`)
    }
  }

  const metadata: CatalogueInstanceMetadata = {
    entryId: entry.id,
    entryVersion: entry.version,
    ...(resolvedPresetId ? { presetId: resolvedPresetId } : {}),
  }
  return {
    eligible: true,
    candidate: {
      entry,
      ...(resolvedPresetId ? { presetId: resolvedPresetId } : {}),
      metadata,
      fields: entry.fields.map((field) => ({
        key: field.key,
        label: field.label,
        value: node.props[field.key],
      })),
      retainedChildCount: node.children.length,
      retainsStyling:
        node.classIds.length > 0 ||
        Object.keys(node.inlineStyles ?? {}).length > 0 ||
        Object.keys(node.breakpointOverrides).length > 0,
    },
  }
}

function backingPrimitive(implementation: ComponentLibraryImplementation) {
  const backing = implementation.type === 'capability-backed'
    ? undefined
    : implementation
  return backing?.type === 'primitive' ? backing : undefined
}

function conversionPresetIds(
  entry: ComponentLibraryEntry,
  requiredPresetId: string | undefined,
): Array<string | undefined> {
  if (requiredPresetId) return [requiredPresetId]
  if (entry.presets.length === 0) return [undefined]
  return entry.presets.map((preset) => preset.id)
}

function ineligible(reason: string): ComponentLibraryConversionAnalysis {
  return { eligible: false, reason }
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (
    !left ||
    !right ||
    typeof left !== 'object' ||
    typeof right !== 'object'
  ) {
    return false
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false
    }
    return left.every((value, index) => deepEqual(value, right[index]))
  }
  const leftRecord = left as Record<string, unknown>
  const rightRecord = right as Record<string, unknown>
  const leftKeys = Object.keys(leftRecord)
  const rightKeys = Object.keys(rightRecord)
  return leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(rightRecord, key) &&
        deepEqual(leftRecord[key], rightRecord[key]),
    )
}
