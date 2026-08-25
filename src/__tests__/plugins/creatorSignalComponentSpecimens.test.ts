import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'bun:test'
import { safeParseJson } from '@core/utils/jsonValidate'
import { Type } from '@core/utils/typeboxHelpers'
import {
  creatorSignalComponentLibraryEntries,
} from '../../../integrations/creator-signal/component-library'
import {
  buildCreatorSignalComponentSpecimens,
  CREATOR_SIGNAL_SPECIMEN_BUNDLE_REFERENCE,
  sha256Text,
  validateCreatorSignalComponentSpecimenBundle,
} from '../../../scripts/lib/creator-signal-component-specimens'

const repositoryRoot = resolve(import.meta.dir, '../../..')
const bundlePath = resolve(repositoryRoot, CREATOR_SIGNAL_SPECIMEN_BUNDLE_REFERENCE)

function committedBundle() {
  const parsed = safeParseJson(readFileSync(bundlePath, 'utf8'), Type.Unknown())
  if (!parsed.ok) throw parsed.error
  return validateCreatorSignalComponentSpecimenBundle(parsed.value)
}

describe('Creator Signal Component Library specimens', () => {
  it('renders one deterministic published specimen for every current registry entry', async () => {
    const first = await buildCreatorSignalComponentSpecimens()
    const second = await buildCreatorSignalComponentSpecimens()
    expect(first.bundle).toEqual(second.bundle)
    expect([...first.htmlByReference]).toEqual([...second.htmlByReference])
    const committed = committedBundle()
    expect(committed.entries.map((entry) => ({
      id: entry.id,
      version: entry.version,
      htmlReference: entry.htmlReference,
    }))).toEqual(first.bundle.entries.map((entry) => ({
      id: entry.id,
      version: entry.version,
      htmlReference: entry.htmlReference,
    })))

    expect(first.bundle.summary).toEqual({
      entryCount: 37,
      componentCount: 22,
      patternCount: 15,
    })
    expect(first.bundle.entries.map((entry) => entry.id)).toEqual(
      [...creatorSignalComponentLibraryEntries]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((entry) => entry.id),
    )

    for (const entry of first.bundle.entries) {
      const html = first.htmlByReference.get(entry.htmlReference)
      expect(html).toBeDefined()
      expect(sha256Text(html!)).toBe(entry.htmlHash)
      expect(html).toContain(
        `data-instatic-component-specimen="${entry.id}"`,
      )
      expect(html).toContain(
        `name="instatic-component-library-entry" content="${entry.id}@${entry.version}"`,
      )
      expect(html).not.toContain('instatic: unknown component')
      expect(html).not.toContain('instatic: visual-component-ref missing componentId')
      expect(entry.browserContract).toMatchObject({
        viewports: ['desktop', 'tablet', 'mobile'],
        themes: ['system', 'light', 'dark'],
        reducedMotion: true,
        forcedColors: true,
        imageUnavailable: true,
      })
    }
  })

  it('retains field, accessibility, pattern-lineage and provider boundaries', () => {
    const bundle = committedBundle()
    const definitionById = new Map(
      creatorSignalComponentLibraryEntries.map((entry) => [entry.id, entry]),
    )
    for (const specimen of bundle.entries) {
      const definition = definitionById.get(specimen.id)!
      expect(specimen.fields).toEqual(definition.fields.map((field) => ({
        key: field.key,
        type: field.type,
        required: field.required,
      })))
      expect(specimen.accessibilityIntent.guidance).toBe(
        definition.documentation.accessibility,
      )
      expect(specimen.accessibilityIntent.rules.length).toBeGreaterThan(0)
      expect(specimen.patternChildLineage.length > 0).toBe(
        definition.implementation.type === 'pattern',
      )
    }

    expect(bundle.entries.filter((entry) =>
      entry.providerBoundary.mode === 'non-delivering-provider-state'
    ).map((entry) => entry.id)).toEqual([
      'creator-signal.site.crm-iframe-form',
      'creator-signal.site.mautic-form',
      'creator-signal.site.pattern.contact-page',
      'creator-signal.site.pattern.early-access-page',
      'creator-signal.site.pattern.feedback-page',
    ])
  })

  it('fails closed on duplicate identities, summary drift and checksum drift', () => {
    const bundle = committedBundle()
    const duplicate = structuredClone(bundle)
    duplicate.entries.push(duplicate.entries[0]!)
    expect(() => validateCreatorSignalComponentSpecimenBundle(duplicate)).toThrow(
      'Duplicate entry ID',
    )

    const summaryDrift = structuredClone(bundle)
    summaryDrift.summary.entryCount--
    expect(() => validateCreatorSignalComponentSpecimenBundle(summaryDrift)).toThrow(
      'Summary does not match',
    )

    const checksumDrift = structuredClone(bundle)
    checksumDrift.entries[0]!.name = 'Changed without regeneration'
    expect(() => validateCreatorSignalComponentSpecimenBundle(checksumDrift)).toThrow(
      'checksum does not match',
    )
  })
})
