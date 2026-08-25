import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'bun:test'
import { safeParseJson } from '@core/utils/jsonValidate'
import { Type } from '@core/utils/typeboxHelpers'
import { componentLibraryPatternRegistry } from '@core/component-library'
import { registry } from '@core/module-engine'
import { builtInVisualComponentRegistry } from '@core/visual-components-schema'
import '@modules/base'
import { BUILT_IN_COMPONENT_LIBRARY_ENTRIES } from '@modules/base/componentLibrary'
import {
  creatorSignalComponentLibraryEntries,
} from '../../../integrations/creator-signal/component-library'
import crmIframeForm from '../../../integrations/creator-signal/modules/crm-iframe-form'
import mauticForm from '../../../integrations/creator-signal/modules/mautic-form'
import {
  creatorSignalSiteModules,
} from '../../../integrations/creator-signal/modules/site-components'
import { heroComponent } from '../../../integrations/creator-signal/pack/hero-component'
import { twoColumnComponent } from '../../../integrations/creator-signal/pack/two-column-component'
import {
  creatorSignalPluginIdentity,
} from '../../../integrations/creator-signal/plugin-contract'
import {
  CREATOR_SIGNAL_SPECIMEN_BUNDLE_REFERENCE,
  validateCreatorSignalComponentSpecimenBundle,
} from '../../../scripts/lib/creator-signal-component-specimens'
import {
  buildDesignImpactManifest,
  DESIGN_IMPACT_MANIFEST_SCHEMA_VERSION,
  validateDesignImpactManifest,
  type DesignImpactManifestInput,
} from '../../../scripts/lib/component-library-design-impact'

const manifestPath = resolve(
  import.meta.dir,
  '../../../docs/features/component-library-design-impact-manifest.json',
)
const designSystemLockPath = resolve(
  import.meta.dir,
  '../../../integrations/creator-signal/design-system/lock.json',
)
const specimenBundlePath = resolve(
  import.meta.dir,
  '../../../integrations/creator-signal/specimens/manifest.json',
)

const DesignSystemLockSchema = Type.Object(
  {
    schema: Type.String(),
    source: Type.Object({
      repository: Type.String(),
      revision: Type.String(),
      package: Type.String(),
      packageVersion: Type.String(),
    }),
  },
  { additionalProperties: true },
)
const lockResult = safeParseJson(
  readFileSync(designSystemLockPath, 'utf8'),
  DesignSystemLockSchema,
)
if (!lockResult.ok) throw lockResult.error
const specimenBundleResult = safeParseJson(
  readFileSync(specimenBundlePath, 'utf8'),
  Type.Unknown(),
)
if (!specimenBundleResult.ok) throw specimenBundleResult.error
const specimenBundle = validateCreatorSignalComponentSpecimenBundle(
  specimenBundleResult.value,
)

function manifestInput(): DesignImpactManifestInput {
  return {
    instaticVersion: '0.0.42',
    builtInEntries: BUILT_IN_COMPONENT_LIBRARY_ENTRIES,
    plugins: [{
      ...creatorSignalPluginIdentity,
      entries: creatorSignalComponentLibraryEntries,
    }],
    designSystemLocks: [{
      ownerId: creatorSignalPluginIdentity.id,
      schema: lockResult.value.schema,
      repository: lockResult.value.source.repository,
      revision: lockResult.value.source.revision,
      packageName: lockResult.value.source.package,
      packageVersion: lockResult.value.source.packageVersion,
    }],
    resolutions: {
      moduleIds: new Set([
        ...registry.list().map((module) => module.id),
        mauticForm.id,
        crmIframeForm.id,
        ...creatorSignalSiteModules.map((module) => module.id),
      ]),
      visualComponentIds: new Set([
        ...builtInVisualComponentRegistry.list().map((component) => component.id),
        heroComponent.id,
        twoColumnComponent.id,
      ]),
      patternIds: new Set(
        componentLibraryPatternRegistry.list().map((pattern) => pattern.id),
      ),
      templateRoles: new Set(['header', 'footer', 'skip-link']),
    },
    specimenArtifacts: specimenBundle.entries.map((entry) => ({
      schemaVersion: specimenBundle.schemaVersion,
      bundleReference: CREATOR_SIGNAL_SPECIMEN_BUNDLE_REFERENCE,
      entryId: entry.id,
      htmlReference: entry.htmlReference,
      contentHash: entry.htmlHash,
    })),
  }
}

describe('Component Library design-impact manifest', () => {
  it('exports every selected executable entry with deterministic hashes', () => {
    const first = buildDesignImpactManifest(manifestInput())
    const secondInput = manifestInput()
    secondInput.builtInEntries = [...secondInput.builtInEntries].reverse()
    secondInput.plugins[0]!.entries = [
      ...secondInput.plugins[0]!.entries,
    ].reverse()
    const second = buildDesignImpactManifest(secondInput)

    expect(first).toEqual(second)
    expect(first.schemaVersion).toBe(DESIGN_IMPACT_MANIFEST_SCHEMA_VERSION)
    expect(first.summary.entryCount).toBe(138)
    expect(first.summary.registryOriginCounts).toEqual({
      'built-in': 101,
      plugin: 37,
    })
    expect(new Set(first.entries.map((entry) => entry.id)).size).toBe(138)
    expect(first.entries.every((entry) =>
      entry.contentHash.startsWith('sha256:') &&
      entry.specimen.contractReference.includes(entry.id)
    )).toBe(true)
    expect(first.entries.filter((entry) => entry.registryOrigin === 'plugin').every(
      (entry) => entry.specimen.executable?.entryId === entry.id,
    )).toBe(true)
    expect(first.entries.find((entry) =>
      entry.definition.requirements.providerAdapters.length > 0
    )?.availability).toMatchObject({
      mode: 'provider-backed',
      renderedBy: 'external-provider',
    })
    expect(first.entries.find((entry) =>
      entry.definition.implementation.type === 'capability-backed' &&
      entry.definition.requirements.providerAdapters.length === 0
    )?.availability.mode).toBe('capability-gated')
    expect(first.entries.filter((entry) =>
      entry.registryOrigin === 'built-in' && entry.definition.category !== 'Forms'
    ).every((entry) => entry.specimen.bundleEntryReference?.includes(entry.id)))
      .toBe(true)
    expect(first.entries.filter((entry) =>
      entry.registryOrigin !== 'built-in' || entry.definition.category === 'Forms'
    ).every((entry) => entry.specimen.bundleEntryReference === null)).toBe(true)
  })

  it('keeps the checked manifest converged with the executable registries', () => {
    const currentResult = safeParseJson(
      readFileSync(manifestPath, 'utf8'),
      Type.Unknown(),
    )
    if (!currentResult.ok) throw currentResult.error
    const current = validateDesignImpactManifest(currentResult.value)
    expect(current).toEqual(buildDesignImpactManifest(manifestInput()))
  })

  it('fails closed on duplicates and unresolved implementations', () => {
    const duplicateInput = manifestInput()
    duplicateInput.builtInEntries = [
      ...duplicateInput.builtInEntries,
      duplicateInput.builtInEntries[0]!,
    ]
    expect(() => buildDesignImpactManifest(duplicateInput)).toThrow(
      'Duplicate selected entry ID',
    )

    const unresolvedInput = manifestInput()
    unresolvedInput.resolutions = {
      ...unresolvedInput.resolutions,
      moduleIds: new Set(),
    }
    expect(() => buildDesignImpactManifest(unresolvedInput)).toThrow(
      'unresolved primitive implementation',
    )
  })

  it('fails closed on schema, ownership, specimen, revision and hash drift', () => {
    const manifest = buildDesignImpactManifest(manifestInput())
    const unsupported = structuredClone(manifest)
    Object.assign(unsupported, { schemaVersion: 'unsupported/v2' })
    expect(() => validateDesignImpactManifest(unsupported)).toThrow(
      'Invalid manifest schema',
    )

    const missingOwnership = structuredClone(manifest)
    Reflect.deleteProperty(missingOwnership.entries[0]!.owner, 'name')
    expect(() => validateDesignImpactManifest(missingOwnership)).toThrow(
      'Invalid manifest schema',
    )

    const specimenDrift = structuredClone(manifest)
    specimenDrift.entries[0]!.specimen.contractReference = 'not-the-entry'
    expect(() => validateDesignImpactManifest(specimenDrift)).toThrow(
      'invalid specimen contract reference',
    )

    const executableSpecimenDrift = structuredClone(manifest)
    executableSpecimenDrift.entries.find((entry) => entry.specimen.executable)!
      .specimen.executable!.entryId = 'creator-signal.site.not-this-entry'
    expect(() => validateDesignImpactManifest(executableSpecimenDrift)).toThrow(
      'executable specimen for another entry',
    )

    const bundleDrift = structuredClone(manifest)
    bundleDrift.entries[0]!.specimen.bundleEntryReference = 'not-the-bundle-entry'
    expect(() => validateDesignImpactManifest(bundleDrift)).toThrow(
      'invalid specimen bundle reference',
    )

    const hashDrift = structuredClone(manifest)
    hashDrift.entries[0]!.definition.name = 'Changed without regeneration'
    expect(() => validateDesignImpactManifest(hashDrift)).toThrow(
      'content hash does not match',
    )

    const revisionDrift = structuredClone(manifest)
    revisionDrift.generatedFrom.instatic.sourceRevision =
      `sha256:${'0'.repeat(64)}`
    expect(() => validateDesignImpactManifest(revisionDrift)).toThrow(
      'source revision does not match',
    )
  })
})
