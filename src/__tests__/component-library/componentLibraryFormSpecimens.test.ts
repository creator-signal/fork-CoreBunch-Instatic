import { describe, expect, it } from 'bun:test'
import { createHash } from 'node:crypto'
import { BUILT_IN_COMPONENT_LIBRARY_ENTRIES } from '@modules/base/componentLibrary'
import {
  buildFormSpecimenBundle,
  builtInFormEntries,
  validateFormSpecimenManifest,
} from '../../../scripts/lib/component-library-form-specimens'

describe('Component Library CMS-native form specimens', () => {
  it('derives complete deterministic coverage from the executable Forms registry', () => {
    const first = buildFormSpecimenBundle()
    const second = buildFormSpecimenBundle()
    const registryEntries = BUILT_IN_COMPONENT_LIBRARY_ENTRIES
      .filter((entry) => entry.category === 'Forms')
      .sort((left, right) => left.id.localeCompare(right.id))

    expect(registryEntries).toHaveLength(41)
    expect(builtInFormEntries().map((entry) => entry.id)).toEqual(
      registryEntries.map((entry) => entry.id),
    )
    expect(first.manifest).toEqual(second.manifest)
    expect([...first.documents]).toEqual([...second.documents])
    expect(first.manifest.summary).toEqual({
      entryCount: 41,
      scenarioCount: 74,
      capabilityBackedCount: 7,
      providerBackedCount: 1,
    })
    expect(first.documents.size).toBe(41)
    expect(new Set(first.manifest.entries.map((entry) => entry.entryId)).size).toBe(41)
    expect(new Set(first.manifest.entries.map((entry) => entry.reference)).size).toBe(41)

    for (const entry of registryEntries) {
      const manifestEntry = first.manifest.entries.find(
        (candidate) => candidate.entryId === entry.id,
      )
      expect(manifestEntry).toBeDefined()
      expect(entry.preview).toEqual({
        type: 'wireframe',
        reference: manifestEntry?.reference,
      })
      const html = first.documents.get(manifestEntry!.reference)
      expect(html).toBeDefined()
      expect(manifestEntry?.documentHash).toBe(
        `sha256:${createHash('sha256').update(html!).digest('hex')}`,
      )
      for (const scenario of manifestEntry!.scenarios) {
        for (const subjectNodeId of scenario.subjectNodeIds) {
          expect(html).toContain(`uid="${subjectNodeId}"`)
        }
      }
    }
  })

  it('renders real form, pattern, provider fallback, draft and file contracts', () => {
    const bundle = buildFormSpecimenBundle()
    const htmlFor = (suffix: string) => {
      const entry = bundle.manifest.entries.find(
        (candidate) => candidate.entryId.endsWith(`.${suffix}`),
      )
      if (!entry) throw new Error(`Missing ${suffix} specimen`)
      return bundle.documents.get(entry.reference) ?? ''
    }

    expect(htmlFor('form-container')).toContain('data-instatic-form-mode="cms"')
    expect(htmlFor('email-input')).toContain('type="email"')
    expect(htmlFor('email-input')).toContain('required')
    expect(htmlFor('select')).toMatch(
      /<option[^>]* value="standard" selected>Standard<\/option>/,
    )
    expect(htmlFor('checkbox-group')).toContain('<fieldset')
    expect(htmlFor('checkbox-group')).toMatch(
      /<legend[^>]*>Choose all that apply<\/legend>/,
    )
    expect(htmlFor('form-tabs')).toContain('data-instatic-tabs')
    expect(htmlFor('wizard')).toContain('data-instatic-draft-mode="persistent"')
    expect(htmlFor('save-draft')).toContain('data-instatic-draft-action="save-draft"')
    expect(htmlFor('file-attachment')).toContain('type="file"')
    expect(htmlFor('file-attachment')).toContain('data-instatic-attachment-max-files="1"')
    expect(htmlFor('captcha')).toContain('data-instatic-provider-state="unavailable"')
    expect(htmlFor('captcha')).not.toContain('<iframe')
    expect(htmlFor('form-embed')).toContain('This form is currently unavailable.')
    expect(htmlFor('reusable-form-fragment')).toContain(
      'data-instatic-component="reusable-form-fragment"',
    )
    expect(htmlFor('reusable-form-fragment')).toContain(
      'data-instatic-binding-prefix="shipping"',
    )
  })

  it('fails closed on missing, duplicate, reordered and hash-drifted specimens', () => {
    const manifest = buildFormSpecimenBundle().manifest

    const missing = structuredClone(manifest)
    missing.entries.pop()
    expect(() => validateFormSpecimenManifest(missing)).toThrow(
      'Manifest summary does not match',
    )

    const duplicate = structuredClone(manifest)
    duplicate.entries[1] = structuredClone(duplicate.entries[0]!)
    expect(() => validateFormSpecimenManifest(duplicate)).toThrow('Duplicate entry')

    const reordered = structuredClone(manifest)
    reordered.entries.reverse()
    expect(() => validateFormSpecimenManifest(reordered)).toThrow('not ordered')

    const drifted = structuredClone(manifest)
    drifted.entries[0]!.name = 'Changed without regeneration'
    expect(() => validateFormSpecimenManifest(drifted)).toThrow(
      'content hash does not match',
    )
  })
})
