import type { ComponentLibraryEntry } from './schemas'
import { compareComponentLibraryVersions } from './version'
import { deepEqual } from '@core/utils/deepEqual'

/** A reviewable, lossless optional-field update for direct implementations.
 * Patterns, changed rendering/slots/options and required additions need their
 * own migration; this helper never grants that authority.
 */
export function canUpgradeComponentContentFields(
  source: ComponentLibraryEntry | undefined,
  target: ComponentLibraryEntry | undefined,
): boolean {
  if (!source || !target || source.id !== target.id
    || compareComponentLibraryVersions(source.version, target.version) >= 0
    || !['primitive', 'visual-component'].includes(source.implementation.type)) return false
  for (const key of ['implementation', 'source', 'slots', 'variants', 'presets', 'constraints', 'requirements', 'composition'] as const) {
    if (!deepEqual(source[key], target[key])) return false
  }
  const previous = new Map(source.fields.map(field => [field.key, field]))
  const next = new Map(target.fields.map(field => [field.key, field]))
  for (const [key, field] of previous) {
    const replacement = next.get(key)
    if (!replacement) return false
    const oldSemantics = { ...field, label: undefined, description: undefined }
    const newSemantics = { ...replacement, label: undefined, description: undefined }
    if (!deepEqual(oldSemantics, newSemantics)) return false
  }
  return target.fields.every(field => previous.has(field.key) || !field.required)
}
