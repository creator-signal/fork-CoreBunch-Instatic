import { describe, expect, it } from 'bun:test'
import { componentLibraryRegistry } from '@core/component-library'
import { componentLibraryPatternRegistry } from '@core/component-library'
import { registry } from '@core/module-engine'
import { creatorSignalCatalogueEntryId } from '@core/page-tree'
import {
  BUILT_IN_COMPONENT_LIBRARY_ENTRIES,
  registerBuiltInComponentLibraryEntries,
} from '@modules/base/componentLibrary'
import '@modules/base/index'

const publicId = creatorSignalCatalogueEntryId

function entriesByMappedSourceId() {
  return new Map(
    BUILT_IN_COMPONENT_LIBRARY_ENTRIES.map((entry) => [
      entry.id.replace('creator-signal.site.catalogue.', 'base.'),
      entry,
    ]),
  )
}

describe('Creator Signal Component Library', () => {
  it('registers explicit, uniquely identified catalogue entries', () => {
    registerBuiltInComponentLibraryEntries()

    const ids = BUILT_IN_COMPONENT_LIBRARY_ENTRIES.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.startsWith('creator-signal.site.catalogue.')))
      .toBe(true)
    expect(ids.some((id) => id.startsWith('base.'))).toBe(false)
    expect(ids).toEqual(expect.arrayContaining([
      publicId('base.section'),
      publicId('base.heading'),
      publicId('base.table'),
      publicId('base.email-input'),
      publicId('base.tabs'),
      publicId('base.accordion'),
      publicId('base.hero'),
      publicId('base.navigation'),
      publicId('base.form-panel'),
      publicId('base.file-attachment'),
      publicId('base.reusable-form-fragment'),
    ]))

    for (const entry of BUILT_IN_COMPONENT_LIBRARY_ENTRIES) {
      expect(entry.source).toEqual({
        type: 'design-system',
        id: 'creator-signal.site',
        name: 'Creator Signal',
      })
      expect(componentLibraryRegistry.get(entry.id)).toEqual(entry)
    }
  })

  it('maps every pattern entry to a registered canonical materializer', () => {
    for (const entry of BUILT_IN_COMPONENT_LIBRARY_ENTRIES) {
      const implementation =
        entry.implementation.type === 'capability-backed'
          ? entry.implementation.backing
          : entry.implementation
      if (implementation.type !== 'pattern') continue

      const definition = componentLibraryPatternRegistry.get(
        implementation.patternId,
      )
      expect(definition).toBeTruthy()
      const fragment = componentLibraryPatternRegistry.materialize(
        implementation.patternId,
        {
          entryId: entry.id,
          entryVersion: entry.version,
        },
      )
      expect(fragment?.rootIds).toHaveLength(1)
      const root = fragment?.nodes[fragment.rootIds[0]!]
      expect(root?.catalogueInstance?.entryId).toBe(entry.id)
      expect(root?.catalogueInstance?.pattern?.authorableNodeIds.length)
        .toBe(definition?.authorableNodeKeys.length)
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
        const definition = registry.get(implementation.moduleId)
        expect(
          definition?.schema[field.key] ??
            (Object.hasOwn(definition?.defaults ?? {}, field.key)
              ? definition?.defaults[field.key]
              : undefined),
          `${entry.id} field ${field.key} must map to its canonical module schema`,
        ).toBeDefined()
      }
    }
  })

  it('composes governed form controls through the canonical CMS form modules', () => {
    const byId = entriesByMappedSourceId()
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
      publicId('base.form-field-group'),
    )
    expect(actions?.constraints.allowedChildEntryIds).toContain(publicId('base.submit'))
    expect(submit?.constraints.allowedParentEntryIds).toContain(
      publicId('base.form-actions'),
    )
    expect(fieldGroup?.constraints.allowedParentEntryIds).toContain(
      publicId('base.tab-panel'),
    )
    expect(fieldGroup?.constraints.allowedParentEntryIds).toContain(
      publicId('base.accordion-item'),
    )
  })

  it('defines tabs and accordion as shared governed Visual Components', () => {
    const byId = entriesByMappedSourceId()
    expect(byId.get('base.tabs')?.constraints.allowedChildEntryIds).toEqual([
      publicId('base.tab-panel'),
    ])
    expect(byId.get('base.tabs')?.implementation).toEqual({
      type: 'visual-component',
      componentId: 'base.vc.tabs',
    })
    expect(byId.get('base.tab-panel')?.constraints.allowedParentEntryIds)
      .toEqual([publicId('base.tabs')])
    expect(byId.get('base.accordion')?.constraints.allowedChildEntryIds)
      .toEqual([publicId('base.accordion-item')])
    expect(byId.get('base.accordion')?.implementation).toEqual({
      type: 'visual-component',
      componentId: 'base.vc.accordion',
    })
    expect(byId.get('base.accordion-item')?.constraints.allowedParentEntryIds)
      .toEqual([publicId('base.accordion')])
  })

  it('declares provider-backed media, map and CAPTCHA dependencies', () => {
    const byId = entriesByMappedSourceId()

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

  it('defines Search as a capability-backed shared collection preset', () => {
    const search = BUILT_IN_COMPONENT_LIBRARY_ENTRIES.find(
      (entry) => entry.id === publicId('base.search'),
    )
    expect(search).toMatchObject({
      implementation: {
        type: 'capability-backed',
        backing: {
          type: 'primitive',
          moduleId: 'base.loop',
          presetId: 'published-pages',
        },
      },
      requirements: {
        capabilities: ['search.index'],
      },
      presets: [{
        values: {
          sourceId: 'search.pages',
          itemRenderer: 'search-result',
          pagination: 'numbered',
        },
      }],
    })
  })

  it('defines File Attachment as a governed capability-backed form control', () => {
    const byId = entriesByMappedSourceId()
    expect(byId.get('base.file-attachment')).toMatchObject({
      implementation: {
        type: 'capability-backed',
        backing: {
          type: 'primitive',
          moduleId: 'base.input',
          presetId: 'private-scanned',
        },
      },
      requirements: {
        capabilities: ['forms.attachments'],
      },
    })
    expect(byId.get('base.form-field-group')?.constraints.allowedChildEntryIds)
      .toContain(publicId('base.file-attachment'))
  })

  it('advertises Save Draft only through the persistent draft capability', () => {
    const saveDraft = componentLibraryRegistry.get(publicId('base.save-draft'))
    expect(saveDraft?.implementation.type).toBe('capability-backed')
    expect(saveDraft?.requirements.capabilities).toEqual(['forms.drafts'])
    expect(saveDraft?.implementation).toMatchObject({
      backing: {
        type: 'primitive',
        moduleId: 'base.form-draft-action',
        presetId: 'save-draft',
      },
    })
  })

  it('completes the form catalogue through shared primitives and governed compositions', () => {
    const byId = entriesByMappedSourceId()

    expect(byId.get('base.switch')).toMatchObject({
      implementation: {
        type: 'primitive',
        moduleId: 'base.checkbox',
        presetId: 'switch',
      },
    })
    expect(byId.get('base.hidden-field')).toMatchObject({
      implementation: {
        type: 'primitive',
        moduleId: 'base.input',
        presetId: 'hidden',
      },
    })
    expect(byId.get('base.reset-button')).toMatchObject({
      implementation: {
        type: 'primitive',
        moduleId: 'base.submit',
        presetId: 'reset',
      },
    })
    expect(byId.get('base.form-tabs')?.variants).toEqual([
      {
        id: 'horizontal',
        name: 'Horizontal',
        values: { orientation: 'horizontal' },
      },
      {
        id: 'vertical',
        name: 'Vertical',
        values: { orientation: 'vertical' },
      },
    ])
    expect(byId.get('base.terms-and-conditions')?.requirements.capabilities)
      .toEqual(['forms.versioned-consent'])
    expect(byId.get('base.wizard')?.requirements.capabilities)
      .toEqual(['forms.drafts'])
  })
})
