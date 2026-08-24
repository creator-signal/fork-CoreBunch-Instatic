import { createHash } from 'node:crypto'
import {
  ComponentLibraryEntrySchema,
  ComponentLibraryPreviewSchema,
  type ComponentLibraryEntry,
  type ComponentLibraryImplementation,
} from '@core/component-library'
import {
  safeParseValue,
  Type,
  type Static,
} from '@core/utils/typeboxHelpers'

export const DESIGN_IMPACT_MANIFEST_SCHEMA_VERSION =
  'instatic.component-library-design-impact/v1' as const
export const COMPONENT_LIBRARY_ENTRY_SCHEMA_VERSION = '1.0.0' as const

const SHA256_PATTERN = '^sha256:[a-f0-9]{64}$'
const SEMVER_PATTERN =
  '^[0-9]+\\.[0-9]+\\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$'

const Sha256Schema = Type.String({ pattern: SHA256_PATTERN })
const SemverSchema = Type.String({ pattern: SEMVER_PATTERN })

const DesignImpactOwnerSchema = Type.Object(
  {
    type: Type.Union([
      Type.Literal('instatic'),
      Type.Literal('site'),
      Type.Literal('design-system'),
      Type.Literal('plugin'),
    ]),
    id: Type.String({ minLength: 1 }),
    name: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

const DesignImpactAvailabilitySchema = Type.Object(
  {
    mode: Type.Union([
      Type.Literal('locally-renderable'),
      Type.Literal('capability-gated'),
      Type.Literal('provider-backed'),
    ]),
    renderedBy: Type.Union([
      Type.Literal('instatic'),
      Type.Literal('external-provider'),
    ]),
    limitations: Type.Array(Type.String({ minLength: 1 }), {
      uniqueItems: true,
    }),
  },
  { additionalProperties: false },
)

const DesignImpactSpecimenSchema = Type.Object(
  {
    contractReference: Type.String({ minLength: 1 }),
    rendered: Type.Union([ComponentLibraryPreviewSchema, Type.Null()]),
  },
  { additionalProperties: false },
)

export const DesignImpactManifestEntrySchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    registryOrigin: Type.Union([
      Type.Literal('built-in'),
      Type.Literal('plugin'),
    ]),
    owner: DesignImpactOwnerSchema,
    implementationTaxonomy: Type.Union([
      Type.Literal('primitive'),
      Type.Literal('visual-component'),
      Type.Literal('pattern'),
      Type.Literal('template-component'),
      Type.Literal('capability-backed'),
    ]),
    definition: ComponentLibraryEntrySchema,
    availability: DesignImpactAvailabilitySchema,
    specimen: DesignImpactSpecimenSchema,
    contentHash: Sha256Schema,
  },
  { additionalProperties: false },
)

const PluginVersionSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    name: Type.String({ minLength: 1 }),
    version: SemverSchema,
  },
  { additionalProperties: false },
)

const DesignSystemLockSchema = Type.Object(
  {
    ownerId: Type.String({ minLength: 1 }),
    schema: Type.String({ minLength: 1 }),
    repository: Type.String({ minLength: 1 }),
    revision: Type.String({ minLength: 1 }),
    packageName: Type.String({ minLength: 1 }),
    packageVersion: SemverSchema,
  },
  { additionalProperties: false },
)

const CountMapSchema = Type.Record(
  Type.String({ minLength: 1 }),
  Type.Integer({ minimum: 0 }),
)

export const DesignImpactManifestSchema = Type.Object(
  {
    schemaVersion: Type.Literal(DESIGN_IMPACT_MANIFEST_SCHEMA_VERSION),
    generatedFrom: Type.Object(
      {
        instatic: Type.Object(
          {
            version: SemverSchema,
            sourceRevision: Sha256Schema,
            revisionKind: Type.Literal('executable-registry-content'),
          },
          { additionalProperties: false },
        ),
        componentLibraryEntrySchemaVersion: Type.Literal(
          COMPONENT_LIBRARY_ENTRY_SCHEMA_VERSION,
        ),
        plugins: Type.Array(PluginVersionSchema),
        designSystemLocks: Type.Array(DesignSystemLockSchema),
      },
      { additionalProperties: false },
    ),
    summary: Type.Object(
      {
        entryCount: Type.Integer({ minimum: 0 }),
        registryOriginCounts: CountMapSchema,
        sourceOwnershipCounts: CountMapSchema,
        implementationCounts: CountMapSchema,
      },
      { additionalProperties: false },
    ),
    entries: Type.Array(DesignImpactManifestEntrySchema),
    checksum: Type.Object(
      {
        algorithm: Type.Literal('sha256'),
        value: Sha256Schema,
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
)

export type DesignImpactManifest = Static<typeof DesignImpactManifestSchema>
export type DesignImpactManifestEntry = Static<
  typeof DesignImpactManifestEntrySchema
>

export interface DesignImpactPluginInput {
  id: string
  name: string
  version: string
  entries: readonly ComponentLibraryEntry[]
}

export interface DesignImpactResolutionInput {
  moduleIds: ReadonlySet<string>
  visualComponentIds: ReadonlySet<string>
  patternIds: ReadonlySet<string>
  templateRoles: ReadonlySet<string>
}

export interface DesignImpactManifestInput {
  instaticVersion: string
  builtInEntries: readonly ComponentLibraryEntry[]
  plugins: readonly DesignImpactPluginInput[]
  designSystemLocks: readonly Static<typeof DesignSystemLockSchema>[]
  resolutions: DesignImpactResolutionInput
}

export function buildDesignImpactManifest(
  input: DesignImpactManifestInput,
): DesignImpactManifest {
  const entryInputs = [
    ...input.builtInEntries.map((definition) => ({
      registryOrigin: 'built-in' as const,
      definition,
    })),
    ...input.plugins.flatMap((plugin) =>
      plugin.entries.map((definition) => ({
        registryOrigin: 'plugin' as const,
        pluginId: plugin.id,
        definition,
      })),
    ),
  ].sort((left, right) =>
    left.definition.id.localeCompare(right.definition.id) ||
    left.definition.version.localeCompare(right.definition.version)
  )

  const seenIds = new Set<string>()
  const entries = entryInputs.map((entryInput) => {
    const { definition } = entryInput
    if (seenIds.has(definition.id)) {
      throw new Error(
        `[design-impact] Duplicate selected entry ID "${definition.id}".`,
      )
    }
    seenIds.add(definition.id)
    if (
      entryInput.registryOrigin === 'plugin' &&
      (
        definition.source.type !== 'plugin' ||
        definition.source.pluginId !== entryInput.pluginId
      )
    ) {
      throw new Error(
        `[design-impact] Plugin entry "${definition.id}" does not retain ownership by "${entryInput.pluginId}".`,
      )
    }
    assertImplementationResolved(definition, input.resolutions)

    const entryWithoutHash = {
      id: definition.id,
      registryOrigin: entryInput.registryOrigin,
      owner: sourceOwner(definition),
      implementationTaxonomy: definition.implementation.type,
      definition,
      availability: availabilityMetadata(definition),
      specimen: {
        contractReference: specimenContractReference(definition),
        rendered: definition.preview ?? null,
      },
    }
    assertRenderedSpecimenReference(definition)
    return {
      ...entryWithoutHash,
      contentHash: hashValue(entryWithoutHash),
    }
  })

  const pluginVersions = [...input.plugins]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(({ id, name, version }) => ({ id, name, version }))
  const designSystemLocks = [...input.designSystemLocks]
    .sort((left, right) => left.ownerId.localeCompare(right.ownerId))
  const sourceRevision = hashValue(
    entries.map(({ registryOrigin, definition }) => ({
      registryOrigin,
      definition,
    })),
  )
  const manifestWithoutChecksum = {
    schemaVersion: DESIGN_IMPACT_MANIFEST_SCHEMA_VERSION,
    generatedFrom: {
      instatic: {
        version: input.instaticVersion,
        sourceRevision,
        revisionKind: 'executable-registry-content' as const,
      },
      componentLibraryEntrySchemaVersion:
        COMPONENT_LIBRARY_ENTRY_SCHEMA_VERSION,
      plugins: pluginVersions,
      designSystemLocks,
    },
    summary: {
      entryCount: entries.length,
      registryOriginCounts: countBy(entries, (entry) => entry.registryOrigin),
      sourceOwnershipCounts: countBy(
        entries,
        (entry) => `${entry.owner.type}:${entry.owner.id}`,
      ),
      implementationCounts: countBy(
        entries,
        (entry) => entry.implementationTaxonomy,
      ),
    },
    entries,
  }
  return validateDesignImpactManifest({
    ...manifestWithoutChecksum,
    checksum: {
      algorithm: 'sha256',
      value: hashValue(manifestWithoutChecksum),
    },
  })
}

export function validateDesignImpactManifest(
  raw: unknown,
): DesignImpactManifest {
  const result = safeParseValue(DesignImpactManifestSchema, raw)
  if (!result.ok) {
    const details = result.errors
      .map((error) => `${error.path || '/'}: ${error.message}`)
      .join('; ')
    throw new Error(`[design-impact] Invalid manifest schema: ${details}`)
  }
  const manifest = result.value
  const ids = new Set<string>()
  let previousId = ''
  for (const entry of manifest.entries) {
    if (ids.has(entry.id)) {
      throw new Error(`[design-impact] Duplicate manifest entry ID "${entry.id}".`)
    }
    ids.add(entry.id)
    if (entry.id < previousId) {
      throw new Error('[design-impact] Manifest entries are not ordered by stable ID.')
    }
    previousId = entry.id
    if (entry.id !== entry.definition.id) {
      throw new Error(
        `[design-impact] Entry identity "${entry.id}" does not match its executable definition.`,
      )
    }
    if (entry.implementationTaxonomy !== entry.definition.implementation.type) {
      throw new Error(
        `[design-impact] Entry "${entry.id}" has inconsistent implementation taxonomy.`,
      )
    }
    if (
      stableStringify(entry.owner) !==
        stableStringify(sourceOwner(entry.definition))
    ) {
      throw new Error(
        `[design-impact] Entry "${entry.id}" has inconsistent source ownership.`,
      )
    }
    if (
      stableStringify(entry.availability) !==
        stableStringify(availabilityMetadata(entry.definition))
    ) {
      throw new Error(
        `[design-impact] Entry "${entry.id}" has inconsistent availability metadata.`,
      )
    }
    if (entry.specimen.contractReference !== specimenContractReference(entry.definition)) {
      throw new Error(
        `[design-impact] Entry "${entry.id}" has an invalid specimen contract reference.`,
      )
    }
    assertRenderedSpecimenReference(entry.definition)
    if (
      stableStringify(entry.specimen.rendered) !==
        stableStringify(entry.definition.preview ?? null)
    ) {
      throw new Error(
        `[design-impact] Entry "${entry.id}" has a specimen reference that is not owned by its executable definition.`,
      )
    }
    const { contentHash, ...entryWithoutHash } = entry
    if (contentHash !== hashValue(entryWithoutHash)) {
      throw new Error(
        `[design-impact] Entry "${entry.id}" content hash does not match its content.`,
      )
    }
  }

  const expectedSummary = {
    entryCount: manifest.entries.length,
    registryOriginCounts: countBy(
      manifest.entries,
      (entry) => entry.registryOrigin,
    ),
    sourceOwnershipCounts: countBy(
      manifest.entries,
      (entry) => `${entry.owner.type}:${entry.owner.id}`,
    ),
    implementationCounts: countBy(
      manifest.entries,
      (entry) => entry.implementationTaxonomy,
    ),
  }
  if (stableStringify(manifest.summary) !== stableStringify(expectedSummary)) {
    throw new Error('[design-impact] Manifest summary does not match its entries.')
  }
  const expectedSourceRevision = hashValue(
    manifest.entries.map(({ registryOrigin, definition }) => ({
      registryOrigin,
      definition,
    })),
  )
  if (
    manifest.generatedFrom.instatic.sourceRevision !== expectedSourceRevision
  ) {
    throw new Error(
      '[design-impact] Instatic source revision does not match the executable registry content.',
    )
  }
  const { checksum, ...manifestWithoutChecksum } = manifest
  if (checksum.value !== hashValue(manifestWithoutChecksum)) {
    throw new Error('[design-impact] Manifest checksum does not match its content.')
  }
  return manifest
}

export function stableStringify(value: unknown): string {
  if (value === undefined) {
    throw new Error('[design-impact] Undefined values cannot be hashed.')
  }
  if (value === null || typeof value !== 'object') {
    const serialized = JSON.stringify(value)
    if (serialized === undefined) {
      throw new Error('[design-impact] Unsupported value cannot be hashed.')
    }
    return serialized
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }
  const entries = Object.entries(value)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
  return `{${entries.map(([key, item]) =>
    `${JSON.stringify(key)}:${stableStringify(item)}`
  ).join(',')}}`
}

function hashValue(value: unknown): string {
  return `sha256:${createHash('sha256').update(stableStringify(value)).digest('hex')}`
}

function countBy<T>(
  values: readonly T[],
  keyFor: (value: T) => string,
): Record<string, number> {
  const counts = new Map<string, number>()
  for (const value of values) {
    const key = keyFor(value)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Object.fromEntries(
    [...counts.entries()].sort(([left], [right]) => left.localeCompare(right)),
  )
}

function sourceOwner(entry: ComponentLibraryEntry): Static<
  typeof DesignImpactOwnerSchema
> {
  switch (entry.source.type) {
    case 'built-in':
      return { type: 'instatic', id: 'instatic.core', name: 'Instatic' }
    case 'site':
      return { type: 'site', id: 'instatic.site', name: 'Instatic site' }
    case 'design-system':
      return {
        type: 'design-system',
        id: entry.source.id,
        name: entry.source.name,
      }
    case 'plugin':
      return {
        type: 'plugin',
        id: entry.source.pluginId,
        name: entry.source.name ?? entry.source.pluginId,
      }
  }
}

function availabilityMetadata(
  entry: ComponentLibraryEntry,
): Static<typeof DesignImpactAvailabilitySchema> {
  const limitations = [
    ...entry.requirements.capabilities.map(
      (id) => `Requires capability "${id}" to report healthy.`,
    ),
    ...entry.requirements.providerAdapters.map(
      (id) => `Requires provider adapter "${id}" to report healthy.`,
    ),
    ...entry.requirements.plugins.map(
      (id) => `Requires plugin "${id}" to be installed and active.`,
    ),
  ]
  if (entry.requirements.providerAdapters.length > 0) {
    limitations.push(
      'The manifest records the provider boundary; it does not claim that external provider output rendered.',
    )
    return {
      mode: 'provider-backed',
      renderedBy: 'external-provider',
      limitations,
    }
  }
  if (entry.implementation.type === 'capability-backed') {
    return {
      mode: 'capability-gated',
      renderedBy: 'instatic',
      limitations,
    }
  }
  return {
    mode: 'locally-renderable',
    renderedBy: 'instatic',
    limitations,
  }
}

function backingImplementation(
  implementation: ComponentLibraryImplementation,
): Exclude<ComponentLibraryImplementation, { type: 'capability-backed' }> {
  return implementation.type === 'capability-backed'
    ? implementation.backing
    : implementation
}

function assertImplementationResolved(
  entry: ComponentLibraryEntry,
  resolutions: DesignImpactResolutionInput,
): void {
  const implementation = backingImplementation(entry.implementation)
  const resolved = implementation.type === 'primitive'
    ? resolutions.moduleIds.has(implementation.moduleId)
    : implementation.type === 'visual-component'
      ? resolutions.visualComponentIds.has(implementation.componentId)
      : implementation.type === 'pattern'
        ? resolutions.patternIds.has(implementation.patternId)
        : resolutions.templateRoles.has(implementation.role)
  if (!resolved) {
    throw new Error(
      `[design-impact] Entry "${entry.id}" has unresolved ${implementation.type} implementation "${implementationReference(implementation)}".`,
    )
  }
}

function implementationReference(
  implementation: Exclude<
    ComponentLibraryImplementation,
    { type: 'capability-backed' }
  >,
): string {
  switch (implementation.type) {
    case 'primitive':
      return implementation.moduleId
    case 'visual-component':
      return implementation.componentId
    case 'pattern':
      return implementation.patternId
    case 'template-component':
      return implementation.role
  }
}

function specimenContractReference(entry: ComponentLibraryEntry): string {
  return `instatic://component-library/${entry.id}@${entry.version}`
}

function assertRenderedSpecimenReference(entry: ComponentLibraryEntry): void {
  const preview = entry.preview
  if (!preview) return
  const reference = preview.reference
  const isHttps = /^https:\/\/[A-Za-z0-9.-]+(?:\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*)?$/.test(
    reference,
  )
  const isRepositoryRelative =
    /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(reference) &&
    !reference.split('/').includes('..')
  if (!isHttps && !isRepositoryRelative) {
    throw new Error(
      `[design-impact] Entry "${entry.id}" has invalid rendered specimen reference "${reference}".`,
    )
  }
  if (preview.type === 'image' && !preview.alt?.trim()) {
    throw new Error(
      `[design-impact] Entry "${entry.id}" image specimen requires alternative text.`,
    )
  }
}
