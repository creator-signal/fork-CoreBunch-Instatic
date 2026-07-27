import { describe, expect, it } from 'bun:test'
import { componentLibraryRegistry } from '@core/component-library'
import { registry } from '@core/module-engine'
import {
  BUILT_IN_COMPONENT_LIBRARY_ENTRIES,
  registerBuiltInComponentLibraryEntries,
} from '@modules/base/componentLibrary'
import '@modules/base/index'

describe('built-in Component Library', () => {
  it('registers explicit, uniquely identified catalogue entries', () => {
    registerBuiltInComponentLibraryEntries()

    const ids = BUILT_IN_COMPONENT_LIBRARY_ENTRIES.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('base.section')
    expect(ids).toContain('base.heading')
    expect(ids).toContain('base.email-input')
    expect(ids).toContain('base.form-message')

    for (const entry of BUILT_IN_COMPONENT_LIBRARY_ENTRIES) {
      expect(componentLibraryRegistry.get(entry.id)).toEqual(entry)
    }
  })

  it('maps every primitive entry to a registered module and declared preset', () => {
    for (const entry of BUILT_IN_COMPONENT_LIBRARY_ENTRIES) {
      if (entry.implementation.type !== 'primitive') continue
      expect(registry.get(entry.implementation.moduleId)).toBeTruthy()

      const presetId = entry.implementation.presetId
      if (presetId) {
        expect(entry.presets.some((preset) => preset.id === presetId)).toBe(true)
      }
    }
  })
})
