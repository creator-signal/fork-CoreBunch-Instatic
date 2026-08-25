import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'bun:test'
import { safeParseJson } from '@core/utils/jsonValidate'
import { Type } from '@core/utils/typeboxHelpers'
import '@modules/base'
import { BUILT_IN_COMPONENT_LIBRARY_ENTRIES } from '@modules/base/componentLibrary'
import {
  validateDesignImpactManifest,
} from '../../../scripts/lib/component-library-design-impact'
import {
  NON_FORM_SPECIMEN_ENTRY_COUNT,
  validateNonFormSpecimenBundle,
} from '../../../scripts/lib/component-library-non-form-specimens'

const specimenBundlePath = resolve(
  import.meta.dir,
  '../../../docs/features/component-library-non-form-specimens.json',
)
const designImpactPath = resolve(
  import.meta.dir,
  '../../../docs/features/component-library-design-impact-manifest.json',
)

function readUnknownJson(path: string): unknown {
  const result = safeParseJson(readFileSync(path, 'utf8'), Type.Unknown())
  if (!result.ok) throw result.error
  return result.value
}

describe('Component Library non-form specimen bundle', () => {
  const bundle = validateNonFormSpecimenBundle(readUnknownJson(specimenBundlePath))
  const designImpact = validateDesignImpactManifest(readUnknownJson(designImpactPath))
  const liveEntries = BUILT_IN_COMPONENT_LIBRARY_ENTRIES
    .filter((entry) => entry.category !== 'Forms')
    .toSorted((left, right) => left.id.localeCompare(right.id))

  it('covers the executable 60-entry registry without a hand-maintained subset', () => {
    expect(liveEntries).toHaveLength(NON_FORM_SPECIMEN_ENTRY_COUNT)
    expect(bundle.entries.map((entry) => entry.id)).toEqual(
      liveEntries.map((entry) => entry.id),
    )
    expect(bundle.summary.categoryCounts).toEqual({
      Content: 6,
      Design: 10,
      Editorial: 9,
      Embed: 1,
      Interactive: 10,
      Media: 6,
      Navigation: 5,
      Structure: 5,
      Template: 3,
      Typography: 5,
    })
  })

  it('renders every declared variant and explicit unavailable state', () => {
    for (const entry of liveEntries) {
      const bundled = bundle.entries.find((candidate) => candidate.id === entry.id)!
      const scenarioIds = new Set(bundled.scenarios.map((scenario) => scenario.id))
      expect(scenarioIds.has('default')).toBe(true)
      for (const variant of entry.variants) {
        expect(scenarioIds.has(`variant-${variant.id}`)).toBe(true)
      }
      if (entry.fields.some((field) => field.type === 'image')) {
        expect(scenarioIds.has('image-unavailable')).toBe(true)
      }
      const manifestEntry = designImpact.entries.find(
        (candidate) => candidate.id === entry.id,
      )!
      if (manifestEntry.availability.mode !== 'locally-renderable') {
        expect(scenarioIds.has('capability-unavailable')).toBe(true)
      }
    }
  })

  it('keeps manifest lineage, real publisher output and replaceable assets together', () => {
    expect(bundle.generatedFrom.executableRegistry.designImpactManifestChecksum)
      .toBe(designImpact.checksum.value)
    expect(bundle.generatedFrom.executableRegistry.sourceRevision)
      .toBe(designImpact.generatedFrom.instatic.sourceRevision)
    expect(bundle.generatedFrom.renderer).toBe('@core/publisher.publishPage')
    expect(bundle.assetBoundary.replaceable).toBe(true)
    expect(bundle.assetBoundary.files.some((file) => file.target.endsWith('/tokens.css')))
      .toBe(true)
    expect(bundle.assetBoundary.files.some((file) => file.target.endsWith('/typography.css')))
      .toBe(true)
    expect(bundle.assetBoundary.files.some((file) => file.target.endsWith('/theme-runtime.css')))
      .toBe(true)

    for (const entry of bundle.entries) {
      const manifestEntry = designImpact.entries.find(
        (candidate) => candidate.id === entry.id,
      )!
      expect(entry.bundleEntryReference)
        .toBe(manifestEntry.specimen.bundleEntryReference)
      for (const scenario of entry.scenarios) {
        expect(scenario.rendered.html).toContain('<!DOCTYPE html>')
        expect(scenario.rendered.html).toContain(
          `data-instatic-specimen-entry="${entry.id}"`,
        )
        expect(typeof scenario.expectedSelector).toBe('string')
        expect(scenario.rendered.html).toContain(
          'data-instatic-design-system-asset="tokens"',
        )
        expect(scenario.staticAccessibilityDiagnosticCount).toBe(0)
        expect(scenario.rendered.html).not.toMatch(
          /<(?:script|img|audio|video|source)[^>]+src="https?:\/\//i,
        )
      }
    }
  })
})
