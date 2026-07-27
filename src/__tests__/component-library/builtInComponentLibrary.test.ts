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
    expect(ids).toContain('base.form-field-group')
    expect(ids).toContain('base.form-actions')
    expect(ids).toContain('base.form-help')
    expect(ids).toContain('base.form-error')
    expect(ids).toContain('base.tabs')
    expect(ids).toContain('base.tab-panel')
    expect(ids).toContain('base.accordion')
    expect(ids).toContain('base.accordion-item')
    expect(ids).toContain('base.youtube-embed')
    expect(ids).toContain('base.map')
    expect(ids).toContain('base.captcha')

    for (const entry of BUILT_IN_COMPONENT_LIBRARY_ENTRIES) {
      expect(componentLibraryRegistry.get(entry.id)).toEqual(entry)
    }
  })

  it('maps every primitive entry to a registered module and declared preset', () => {
    for (const entry of BUILT_IN_COMPONENT_LIBRARY_ENTRIES) {
      const implementation =
        entry.implementation.type === 'capability-backed'
          ? entry.implementation.backing
          : entry.implementation
      if (implementation.type !== 'primitive') continue
      expect(registry.get(implementation.moduleId)).toBeTruthy()

      const presetId = implementation.presetId
      if (presetId) {
        expect(entry.presets.some((preset) => preset.id === presetId)).toBe(true)
      }
      for (const field of entry.fields) {
        expect(
          registry.get(implementation.moduleId)?.schema[field.key],
          `${entry.id} field ${field.key} must map to its canonical module schema`,
        ).toBeTruthy()
      }
    }
  })

  it('composes governed form controls through the canonical CMS form modules', () => {
    const byId = new Map(
      BUILT_IN_COMPONENT_LIBRARY_ENTRIES.map((entry) => [entry.id, entry]),
    )
    const fieldGroup = byId.get('base.form-field-group')
    const email = byId.get('base.email-input')
    const help = byId.get('base.form-help')
    const error = byId.get('base.form-error')
    const actions = byId.get('base.form-actions')
    const submit = byId.get('base.submit')

    expect(fieldGroup?.implementation).toMatchObject({
      type: 'primitive',
      moduleId: 'base.container',
      presetId: 'field-group',
    })
    expect(email?.implementation).toMatchObject({
      type: 'primitive',
      moduleId: 'base.input',
      presetId: 'email',
    })
    expect(help?.implementation).toMatchObject({
      type: 'primitive',
      moduleId: 'base.form-message',
      presetId: 'help',
    })
    expect(error?.implementation).toMatchObject({
      type: 'primitive',
      moduleId: 'base.form-message',
      presetId: 'error',
    })
    expect(email?.constraints.allowedParentEntryIds).toContain(
      'base.form-field-group',
    )
    expect(actions?.constraints.allowedChildEntryIds).toContain('base.submit')
    expect(submit?.constraints.allowedParentEntryIds).toContain(
      'base.form-actions',
    )
    expect(fieldGroup?.constraints.allowedParentEntryIds).toContain(
      'base.tab-panel',
    )
    expect(fieldGroup?.constraints.allowedParentEntryIds).toContain(
      'base.accordion-item',
    )
  })

  it('defines tabs and accordion as shared governed primitives', () => {
    const byId = new Map(
      BUILT_IN_COMPONENT_LIBRARY_ENTRIES.map((entry) => [entry.id, entry]),
    )
    expect(byId.get('base.tabs')?.constraints.allowedChildEntryIds).toEqual([
      'base.tab-panel',
    ])
    expect(byId.get('base.tab-panel')?.constraints.allowedParentEntryIds)
      .toEqual(['base.tabs'])
    expect(byId.get('base.accordion')?.constraints.allowedChildEntryIds)
      .toEqual(['base.accordion-item'])
    expect(byId.get('base.accordion-item')?.constraints.allowedParentEntryIds)
      .toEqual(['base.accordion'])
  })

  it('declares provider-backed media, map and CAPTCHA dependencies', () => {
    const byId = new Map(
      BUILT_IN_COMPONENT_LIBRARY_ENTRIES.map((entry) => [entry.id, entry]),
    )

    expect(byId.get('base.youtube-embed')).toMatchObject({
      implementation: {
        type: 'capability-backed',
        backing: {
          type: 'primitive',
          moduleId: 'base.provider-embed',
          presetId: 'youtube',
        },
      },
      requirements: { providerAdapters: ['media.youtube'] },
    })
    expect(byId.get('base.map')).toMatchObject({
      implementation: {
        type: 'capability-backed',
        backing: {
          type: 'primitive',
          moduleId: 'base.provider-embed',
          presetId: 'openstreetmap',
        },
      },
      requirements: { providerAdapters: ['maps.openstreetmap'] },
    })
    expect(byId.get('base.captcha')).toMatchObject({
      implementation: {
        type: 'capability-backed',
        backing: {
          type: 'primitive',
          moduleId: 'base.provider-embed',
          presetId: 'hcaptcha',
        },
      },
      requirements: {
        capabilities: ['forms.captcha'],
        providerAdapters: ['captcha.hcaptcha'],
      },
    })
  })
})
