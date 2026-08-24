import { createHash } from 'node:crypto'
import {
  analyseComponentLibraryAccessibility,
  componentLibraryPatternRegistry,
  componentLibraryRegistry,
  type ComponentLibraryEntry,
  type ComponentLibraryField,
  type ComponentLibraryImplementation,
} from '@core/component-library'
import { registry } from '@core/module-engine'
import {
  DEFAULT_BREAKPOINTS,
  DEFAULT_SITE_SETTINGS,
  createDefaultSiteExplorerOrganization,
  reindexNodeParents,
  type CatalogueInstanceMetadata,
  type Page,
  type PageNode,
  type SiteDocument,
} from '@core/page-tree'
import {
  addCspSources,
  publishPage,
  rewriteCspMeta,
  type ResolvedLoopRenderData,
} from '@core/publisher'
import { normalizeSitePackageJson } from '@core/site-dependencies/manifest'
import { normalizeSiteRuntimeConfig } from '@core/site-runtime'
import { resolveVisualComponent } from '@core/visual-components-schema'
import {
  safeParseValue,
  Type,
  type Static,
} from '@core/utils/typeboxHelpers'
import {
  buildSiteModuleJsMap,
  injectModuleScripts,
  moduleJsContentHash,
  resolvePublishedModuleJsAssets,
} from '../../server/publish/moduleJsBundle'
import {
  NON_FORM_BUILT_IN_SPECIMEN_BUNDLE_PATH,
  stableStringify,
  type DesignImpactManifest,
} from './component-library-design-impact'

export const NON_FORM_SPECIMEN_BUNDLE_SCHEMA_VERSION =
  'instatic.component-library-non-form-specimens/v1' as const
export const NON_FORM_SPECIMEN_ENTRY_COUNT = 60

const SHA256_PATTERN = '^sha256:[a-f0-9]{64}$'
const Sha256Schema = Type.String({ pattern: SHA256_PATTERN })

const SpecimenScenarioSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    kind: Type.Union([
      Type.Literal('default'),
      Type.Literal('variant'),
      Type.Literal('image-unavailable'),
      Type.Literal('capability-unavailable'),
    ]),
    variantId: Type.Optional(Type.String({ minLength: 1 })),
    route: Type.String({ pattern: '^/specimens/' }),
    targetNodeId: Type.String({ minLength: 1 }),
    targetModuleId: Type.String({ minLength: 1 }),
    expectedSelector: Type.String({ minLength: 1 }),
    declaredBehaviorRules: Type.Array(Type.String({ minLength: 1 }), {
      uniqueItems: true,
    }),
    staticAccessibilityDiagnosticCount: Type.Integer({ minimum: 0 }),
    rendered: Type.Object(
      {
        html: Type.String({ minLength: 1 }),
        htmlHash: Sha256Schema,
        moduleJsAssetIds: Type.Array(Type.String({ minLength: 1 }), {
          uniqueItems: true,
        }),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
)

const SpecimenEntrySchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    category: Type.String({ minLength: 1 }),
    contractReference: Type.String({ minLength: 1 }),
    bundleEntryReference: Type.String({ minLength: 1 }),
    availabilityMode: Type.Union([
      Type.Literal('locally-renderable'),
      Type.Literal('capability-gated'),
      Type.Literal('provider-backed'),
    ]),
    scenarios: Type.Array(SpecimenScenarioSchema, { minItems: 1 }),
  },
  { additionalProperties: false },
)

const AssetBoundaryFileSchema = Type.Object(
  {
    source: Type.String({ minLength: 1 }),
    target: Type.String({ minLength: 1 }),
    sha256: Type.String({ pattern: '^[a-f0-9]{64}$' }),
  },
  { additionalProperties: false },
)

const EmbeddedAssetSchema = Type.Object(
  {
    path: Type.String({ pattern: '^/assets/specimens/' }),
    contentType: Type.String({ minLength: 1 }),
    bodyBase64: Type.String(),
    contentHash: Sha256Schema,
  },
  { additionalProperties: false },
)

const ModuleJsAssetSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    contentHash: Type.String({ pattern: '^[a-f0-9]{64}$' }),
    body: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

const CountMapSchema = Type.Record(
  Type.String({ minLength: 1 }),
  Type.Integer({ minimum: 0 }),
)

export const NonFormSpecimenBundleSchema = Type.Object(
  {
    schemaVersion: Type.Literal(NON_FORM_SPECIMEN_BUNDLE_SCHEMA_VERSION),
    generatedFrom: Type.Object(
      {
        executableRegistry: Type.Object(
          {
            designImpactManifestPath: Type.Literal(
              'docs/features/component-library-design-impact-manifest.json',
            ),
            designImpactManifestChecksum: Sha256Schema,
            sourceRevision: Sha256Schema,
          },
          { additionalProperties: false },
        ),
        renderer: Type.Literal('@core/publisher.publishPage'),
        designSystem: Type.Object(
          {
            repository: Type.String({ minLength: 1 }),
            revision: Type.String({ minLength: 1 }),
            packageName: Type.String({ minLength: 1 }),
            packageVersion: Type.String({ minLength: 1 }),
          },
          { additionalProperties: false },
        ),
      },
      { additionalProperties: false },
    ),
    assetBoundary: Type.Object(
      {
        baseUrl: Type.Literal('/assets/design-system/'),
        replaceable: Type.Literal(true),
        files: Type.Array(AssetBoundaryFileSchema, { minItems: 1 }),
      },
      { additionalProperties: false },
    ),
    summary: Type.Object(
      {
        entryCount: Type.Integer({ minimum: 0 }),
        scenarioCount: Type.Integer({ minimum: 0 }),
        categoryCounts: CountMapSchema,
        scenarioKindCounts: CountMapSchema,
      },
      { additionalProperties: false },
    ),
    entries: Type.Array(SpecimenEntrySchema),
    moduleJsAssets: Type.Array(ModuleJsAssetSchema),
    syntheticAssets: Type.Array(EmbeddedAssetSchema),
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

export type NonFormSpecimenBundle = Static<
  typeof NonFormSpecimenBundleSchema
>

export interface DesignSystemLockInput {
  source: {
    repository: string
    revision: string
    package: string
    packageVersion: string
  }
  files: ReadonlyArray<{
    source: string
    target: string
    sha256: string
  }>
}

interface ScenarioPlan {
  id: string
  kind: Static<typeof SpecimenScenarioSchema>['kind']
  variantId?: string
}

interface MaterializedScenario {
  entry: ComponentLibraryEntry
  plan: ScenarioPlan
  page: Page
  targetNodeId: string
  loopData: Map<string, ResolvedLoopRenderData>
}

interface MaterializationState {
  entry: ComponentLibraryEntry
  plan: ScenarioPlan
  nodes: Record<string, PageNode>
  sequence: number
  targetNodeId: string | null
  loopData: Map<string, ResolvedLoopRenderData>
}

const SYNTHETIC_IMAGE_PATH = '/assets/specimens/creator-signal-specimen.svg'
const MISSING_IMAGE_PATH = '/assets/specimens/missing-image.svg'

export function buildNonFormSpecimenBundle(
  entries: readonly ComponentLibraryEntry[],
  designImpactManifest: DesignImpactManifest,
  designSystemLock: DesignSystemLockInput,
): NonFormSpecimenBundle {
  const selectedEntries = entries
    .filter((entry) => entry.category !== 'Forms')
    .toSorted((left, right) => left.id.localeCompare(right.id))
  if (selectedEntries.length !== NON_FORM_SPECIMEN_ENTRY_COUNT) {
    throw new Error(
      `[non-form-specimens] Expected ${NON_FORM_SPECIMEN_ENTRY_COUNT} executable non-form built-ins, received ${selectedEntries.length}.`,
    )
  }

  const manifestById = new Map(
    designImpactManifest.entries.map((entry) => [entry.id, entry]),
  )
  for (const entry of selectedEntries) {
    const manifestEntry = manifestById.get(entry.id)
    if (!manifestEntry || manifestEntry.registryOrigin !== 'built-in') {
      throw new Error(
        `[non-form-specimens] Executable entry "${entry.id}" is missing from the design-impact manifest.`,
      )
    }
    const expectedReference = bundleEntryReference(entry.id)
    if (manifestEntry.specimen.bundleEntryReference !== expectedReference) {
      throw new Error(
        `[non-form-specimens] Design-impact entry "${entry.id}" does not reference ${expectedReference}.`,
      )
    }
  }

  const materialized = selectedEntries.flatMap((entry) =>
    scenarioPlans(entry, manifestById.get(entry.id)!.availability.mode)
      .map((plan) => materializeScenario(entry, plan)),
  )
  const site = specimenSite(materialized.map((scenario) => scenario.page))
  const moduleJsMap = buildSiteModuleJsMap(site, registry)

  const bundleEntries = selectedEntries.map((entry) => {
    const manifestEntry = manifestById.get(entry.id)!
    const scenarios = materialized
      .filter((candidate) => candidate.entry.id === entry.id)
      .map((scenario) => renderScenario(scenario, site, moduleJsMap))
    return {
      id: entry.id,
      category: entry.category,
      contractReference: manifestEntry.specimen.contractReference,
      bundleEntryReference: bundleEntryReference(entry.id),
      availabilityMode: manifestEntry.availability.mode,
      scenarios,
    }
  })

  const usedModuleIds = new Set(
    bundleEntries.flatMap((entry) =>
      entry.scenarios.flatMap((scenario) => scenario.rendered.moduleJsAssetIds),
    ),
  )
  const moduleJsAssets = [...usedModuleIds]
    .sort()
    .map((id) => {
      const body = moduleJsMap.get(id)
      if (!body) {
        throw new Error(
          `[non-form-specimens] Rendered module JavaScript "${id}" is unavailable.`,
        )
      }
      return { id, contentHash: moduleJsContentHash(body), body }
    })
  const syntheticAssets = specimenAssets()
  const allScenarios = bundleEntries.flatMap((entry) => entry.scenarios)
  const bundleWithoutChecksum = {
    schemaVersion: NON_FORM_SPECIMEN_BUNDLE_SCHEMA_VERSION,
    generatedFrom: {
      executableRegistry: {
        designImpactManifestPath:
          'docs/features/component-library-design-impact-manifest.json' as const,
        designImpactManifestChecksum: designImpactManifest.checksum.value,
        sourceRevision: designImpactManifest.generatedFrom.instatic.sourceRevision,
      },
      renderer: '@core/publisher.publishPage' as const,
      designSystem: {
        repository: designSystemLock.source.repository,
        revision: designSystemLock.source.revision,
        packageName: designSystemLock.source.package,
        packageVersion: designSystemLock.source.packageVersion,
      },
    },
    assetBoundary: {
      baseUrl: '/assets/design-system/' as const,
      replaceable: true as const,
      files: designSystemLock.files
        .filter((file) => file.target.startsWith('assets/design-system/'))
        .map(({ source, target, sha256 }) => ({ source, target, sha256 }))
        .toSorted((left, right) => left.target.localeCompare(right.target)),
    },
    summary: {
      entryCount: bundleEntries.length,
      scenarioCount: allScenarios.length,
      categoryCounts: countBy(bundleEntries, (entry) => entry.category),
      scenarioKindCounts: countBy(allScenarios, (scenario) => scenario.kind),
    },
    entries: bundleEntries,
    moduleJsAssets,
    syntheticAssets,
  }
  return validateNonFormSpecimenBundle({
    ...bundleWithoutChecksum,
    checksum: {
      algorithm: 'sha256',
      value: hashValue(bundleWithoutChecksum),
    },
  })
}

export function validateNonFormSpecimenBundle(
  raw: unknown,
): NonFormSpecimenBundle {
  const parsed = safeParseValue(NonFormSpecimenBundleSchema, raw)
  if (!parsed.ok) {
    const details = parsed.errors
      .map((error) => `${error.path || '/'}: ${error.message}`)
      .join('; ')
    throw new Error(`[non-form-specimens] Invalid bundle schema: ${details}`)
  }
  const bundle = parsed.value
  if (bundle.entries.length !== NON_FORM_SPECIMEN_ENTRY_COUNT) {
    throw new Error(
      `[non-form-specimens] Bundle must contain ${NON_FORM_SPECIMEN_ENTRY_COUNT} entries.`,
    )
  }
  const entryIds = new Set<string>()
  let previousEntryId = ''
  for (const entry of bundle.entries) {
    if (entryIds.has(entry.id)) {
      throw new Error(`[non-form-specimens] Duplicate entry "${entry.id}".`)
    }
    entryIds.add(entry.id)
    if (entry.id < previousEntryId) {
      throw new Error('[non-form-specimens] Entries are not ordered by stable ID.')
    }
    previousEntryId = entry.id
    if (entry.bundleEntryReference !== bundleEntryReference(entry.id)) {
      throw new Error(
        `[non-form-specimens] Entry "${entry.id}" has an invalid bundle reference.`,
      )
    }
    const scenarioIds = new Set<string>()
    for (const scenario of entry.scenarios) {
      if (scenarioIds.has(scenario.id)) {
        throw new Error(
          `[non-form-specimens] Entry "${entry.id}" repeats scenario "${scenario.id}".`,
        )
      }
      scenarioIds.add(scenario.id)
      if (!scenario.rendered.html.includes(`data-instatic-specimen-entry="${entry.id}"`)) {
        throw new Error(
          `[non-form-specimens] Scenario "${entry.id}/${scenario.id}" is missing its entry identity.`,
        )
      }
      if (scenario.rendered.htmlHash !== hashValue(scenario.rendered.html)) {
        throw new Error(
          `[non-form-specimens] Scenario "${entry.id}/${scenario.id}" HTML hash is stale.`,
        )
      }
    }
    if (!scenarioIds.has('default')) {
      throw new Error(`[non-form-specimens] Entry "${entry.id}" has no default scenario.`)
    }
  }
  const expectedSummary = {
    entryCount: bundle.entries.length,
    scenarioCount: bundle.entries.reduce(
      (total, entry) => total + entry.scenarios.length,
      0,
    ),
    categoryCounts: countBy(bundle.entries, (entry) => entry.category),
    scenarioKindCounts: countBy(
      bundle.entries.flatMap((entry) => entry.scenarios),
      (scenario) => scenario.kind,
    ),
  }
  if (stableStringify(bundle.summary) !== stableStringify(expectedSummary)) {
    throw new Error('[non-form-specimens] Bundle summary does not match its entries.')
  }
  for (const asset of bundle.moduleJsAssets) {
    if (asset.contentHash !== moduleJsContentHash(asset.body)) {
      throw new Error(
        `[non-form-specimens] Module JavaScript hash is stale for "${asset.id}".`,
      )
    }
  }
  for (const asset of bundle.syntheticAssets) {
    if (asset.contentHash !== hashValue(Buffer.from(asset.bodyBase64, 'base64'))) {
      throw new Error(
        `[non-form-specimens] Synthetic asset hash is stale for "${asset.path}".`,
      )
    }
  }
  const { checksum, ...withoutChecksum } = bundle
  if (checksum.value !== hashValue(withoutChecksum)) {
    throw new Error('[non-form-specimens] Bundle checksum does not match its content.')
  }
  return bundle
}

function scenarioPlans(
  entry: ComponentLibraryEntry,
  availabilityMode: 'locally-renderable' | 'capability-gated' | 'provider-backed',
): ScenarioPlan[] {
  return [
    { id: 'default', kind: 'default' },
    ...entry.variants.map((variant) => ({
      id: `variant-${variant.id}`,
      kind: 'variant' as const,
      variantId: variant.id,
    })),
    ...(entry.fields.some((field) => field.type === 'image')
      ? [{ id: 'image-unavailable', kind: 'image-unavailable' as const }]
      : []),
    ...(availabilityMode === 'locally-renderable'
      ? []
      : [{
          id: 'capability-unavailable',
          kind: 'capability-unavailable' as const,
        }]),
  ]
}

function materializeScenario(
  entry: ComponentLibraryEntry,
  plan: ScenarioPlan,
): MaterializedScenario {
  const rootId = `${scenarioSlug(entry.id, plan.id)}--root`
  const rootModule = requiredModule('base.body')
  const state: MaterializationState = {
    entry,
    plan,
    nodes: {
      [rootId]: pageNode(rootId, rootModule.id, rootModule.defaults, null),
    },
    sequence: 0,
    targetNodeId: null,
    loopData: new Map(),
  }

  const parentEntryId = entry.constraints.allowedParentEntryIds?.[0]
  if (parentEntryId) {
    const parentEntry = componentLibraryRegistry.get(parentEntryId)
    if (!parentEntry) {
      throw new Error(
        `[non-form-specimens] Parent entry "${parentEntryId}" for "${entry.id}" is unavailable.`,
      )
    }
    materializeEntry(state, parentEntry, rootId, {
      forcedChild: entry,
      depth: 0,
    })
  } else {
    materializeEntry(state, entry, rootId, { isTarget: true, depth: 0 })
  }
  if (!state.targetNodeId) {
    throw new Error(`[non-form-specimens] Entry "${entry.id}" did not materialize.`)
  }
  reindexNodeParents(state.nodes)
  const page: Page = {
    id: `specimen-${scenarioSlug(entry.id, plan.id)}`,
    slug: `specimens/${entry.id}/${plan.id}`,
    title: `${entry.name} — ${plan.id}`,
    rootNodeId: rootId,
    nodes: state.nodes,
    ...(entry.implementation.type === 'template-component'
      ? {
          template: {
            enabled: true as const,
            target: { kind: 'everywhere' as const },
            priority: 0,
          },
        }
      : {}),
  }
  return {
    entry,
    plan,
    page,
    targetNodeId: state.targetNodeId,
    loopData: state.loopData,
  }
}

function materializeEntry(
  state: MaterializationState,
  entry: ComponentLibraryEntry,
  parentId: string,
  options: {
    isTarget?: boolean
    forcedChild?: ComponentLibraryEntry
    depth: number
  },
): string {
  const implementation = backingImplementation(entry.implementation)
  switch (implementation.type) {
    case 'primitive':
      return materializePrimitive(state, entry, implementation, parentId, options)
    case 'visual-component':
      return materializeVisualComponent(
        state,
        entry,
        implementation.componentId,
        parentId,
        options,
      )
    case 'pattern':
      return materializePattern(
        state,
        entry,
        implementation.patternId,
        parentId,
        options,
      )
    case 'template-component':
      return materializeTemplateComponent(
        state,
        entry,
        implementation.role,
        parentId,
        options,
      )
  }
}

function materializePrimitive(
  state: MaterializationState,
  entry: ComponentLibraryEntry,
  implementation: Extract<
    Exclude<ComponentLibraryImplementation, { type: 'capability-backed' }>,
    { type: 'primitive' }
  >,
  parentId: string,
  options: { isTarget?: boolean; forcedChild?: ComponentLibraryEntry; depth: number },
): string {
  const module = requiredModule(implementation.moduleId)
  const presetId = implementation.presetId
  const preset = presetId
    ? entry.presets.find((candidate) => candidate.id === presetId)
    : undefined
  const variant = options.isTarget && state.plan.variantId
    ? entry.variants.find((candidate) => candidate.id === state.plan.variantId)
    : undefined
  const unavailable = options.isTarget && state.plan.kind === 'capability-unavailable'
  const props = authoredValues(
    entry,
    {
      ...cloneValue(module.defaults),
      ...cloneValue(preset?.values ?? {}),
      ...cloneValue(variant?.values ?? {}),
    },
    {
      imageUnavailable:
        options.isTarget && state.plan.kind === 'image-unavailable',
      capabilityUnavailable: unavailable,
    },
  )
  if (module.id === 'base.loop') props.sourceId = ''
  if (module.id === 'base.provider-embed' && unavailable) {
    props.adapterId = 'specimen.unavailable'
  }
  const nodeId = nextNodeId(state, entry.id)
  const metadata = catalogueMetadata(entry, presetId, variant?.id)
  state.nodes[nodeId] = pageNode(nodeId, module.id, props, parentId, metadata)
  appendChild(state, parentId, nodeId)
  if (options.isTarget) state.targetNodeId = nodeId

  if (module.id === 'base.loop') {
    state.loopData.set(
      nodeId,
      unavailable
        ? {
            items: [],
            totalItems: 0,
            pageNumber: 1,
            hasMore: false,
            operationalState: 'unavailable',
            operationalMessage:
              `${entry.name} is unavailable in this synthetic capability state.`,
          }
        : specimenLoopData(entry),
    )
  }

  if (options.depth < 3 && (entry.composition === 'container' || module.canHaveChildren)) {
    const childEntry = options.forcedChild ?? firstAllowedChild(entry)
    if (childEntry) {
      materializeEntry(state, childEntry, nodeId, {
        isTarget: options.forcedChild?.id === state.entry.id,
        depth: options.depth + 1,
      })
    } else if (module.id !== 'base.link') {
      materializeSyntheticText(state, nodeId, `${entry.name} synthetic content`)
    }
  }
  return nodeId
}

function materializeVisualComponent(
  state: MaterializationState,
  entry: ComponentLibraryEntry,
  componentId: string,
  parentId: string,
  options: { isTarget?: boolean; forcedChild?: ComponentLibraryEntry; depth: number },
): string {
  const definition = resolveVisualComponent([], componentId)
  if (!definition) {
    throw new Error(
      `[non-form-specimens] Visual Component "${componentId}" is unavailable.`,
    )
  }
  const variant = options.isTarget && state.plan.variantId
    ? entry.variants.find((candidate) => candidate.id === state.plan.variantId)
    : undefined
  const defaults = Object.fromEntries(
    definition.params.map((parameter) => [parameter.id, cloneValue(parameter.defaultValue)]),
  )
  const propOverrides = authoredValues(
    entry,
    { ...defaults, ...cloneValue(variant?.values ?? {}) },
    {
      imageUnavailable:
        options.isTarget && state.plan.kind === 'image-unavailable',
      capabilityUnavailable: false,
    },
  )
  const nodeId = nextNodeId(state, entry.id)
  state.nodes[nodeId] = pageNode(
    nodeId,
    'base.visual-component-ref',
    { componentId, propOverrides },
    parentId,
    catalogueMetadata(entry, undefined, variant?.id),
  )
  appendChild(state, parentId, nodeId)
  if (options.isTarget) state.targetNodeId = nodeId

  for (const slot of entry.slots) {
    const slotId = nextNodeId(state, `${entry.id}-${slot.id}`)
    state.nodes[slotId] = pageNode(
      slotId,
      'base.slot-instance',
      { slotName: slot.id },
      nodeId,
    )
    appendChild(state, nodeId, slotId)
    const forcedChild = options.forcedChild && slotAccepts(slot, options.forcedChild)
      ? options.forcedChild
      : undefined
    const childEntry = forcedChild ?? entryForSlot(slot)
    if (childEntry && options.depth < 3) {
      materializeEntry(state, childEntry, slotId, {
        isTarget: forcedChild?.id === state.entry.id,
        depth: options.depth + 1,
      })
    } else {
      const actionSlot = /action/i.test(slot.id)
      const itemCount = entry.id.endsWith('.carousel') && slot.id === 'slides' ? 2 : 1
      for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
        if (actionSlot) materializeSyntheticButton(state, slotId)
        else {
          materializeSyntheticText(
            state,
            slotId,
            `${slot.name} synthetic content ${itemIndex + 1}`,
          )
        }
      }
    }
  }
  return nodeId
}

function materializePattern(
  state: MaterializationState,
  entry: ComponentLibraryEntry,
  patternId: string,
  parentId: string,
  options: { isTarget?: boolean; depth: number },
): string {
  const definition = componentLibraryPatternRegistry.get(patternId)
  if (!definition) {
    throw new Error(`[non-form-specimens] Pattern "${patternId}" is unavailable.`)
  }
  const variant = options.isTarget && state.plan.variantId
    ? entry.variants.find((candidate) => candidate.id === state.plan.variantId)
    : undefined
  const idByKey = new Map(
    definition.nodes.map((node) => [node.key, nextNodeId(state, `${entry.id}-${node.key}`)]),
  )
  const authorableNodeIds = definition.authorableNodeKeys
    .map((key) => idByKey.get(key))
    .filter((nodeId): nodeId is string => Boolean(nodeId))
  for (const template of definition.nodes) {
    const nodeId = idByKey.get(template.key)!
    const isRoot = template.key === definition.rootKey
    const props = syntheticizeProps({
      ...cloneValue(template.props),
      ...(isRoot ? cloneValue(variant?.values ?? {}) : {}),
    })
    const nodeParentId = isRoot
      ? parentId
      : idByKey.get(
          definition.nodes.find((candidate) => candidate.children.includes(template.key))?.key ?? '',
        ) ?? parentId
    const metadata = isRoot
      ? {
          ...catalogueMetadata(entry, undefined, variant?.id),
          pattern: { authorableNodeIds },
        }
      : template.catalogueInstance
        ? cloneValue(template.catalogueInstance)
        : undefined
    state.nodes[nodeId] = pageNode(
      nodeId,
      template.moduleId,
      props,
      nodeParentId,
      metadata,
    )
    state.nodes[nodeId]!.children = template.children.map((key) => idByKey.get(key)!)
  }
  const rootId = idByKey.get(definition.rootKey)!
  appendChild(state, parentId, rootId)
  if (options.isTarget) state.targetNodeId = rootId
  for (const node of definition.nodes) {
    const materializedId = idByKey.get(node.key)!
    if (state.nodes[materializedId]?.moduleId === 'base.loop') {
      state.nodes[materializedId]!.props.sourceId = ''
      state.loopData.set(materializedId, specimenLoopData(entry))
    }
    if (
      state.nodes[materializedId]?.moduleId === 'base.slot-instance' &&
      state.nodes[materializedId]!.children.length === 0
    ) {
      const slotName = String(state.nodes[materializedId]!.props.slotName ?? 'content')
      if (/action/i.test(slotName)) materializeSyntheticButton(state, materializedId)
      else {
        materializeSyntheticText(
          state,
          materializedId,
          `${slotName} synthetic content`,
        )
      }
    } else if (
      state.nodes[materializedId]!.children.length === 0 &&
      requiredModule(state.nodes[materializedId]!.moduleId).canHaveChildren
    ) {
      materializeSyntheticText(
        state,
        materializedId,
        `${entry.name} synthetic content`,
      )
    }
  }
  return rootId
}

function materializeTemplateComponent(
  state: MaterializationState,
  entry: ComponentLibraryEntry,
  role: string,
  parentId: string,
  options: { isTarget?: boolean },
): string {
  const metadata = catalogueMetadata(entry)
  if (role === 'skip-link') {
    const nodeId = nextNodeId(state, entry.id)
    state.nodes[nodeId] = pageNode(
      nodeId,
      'base.link',
      authoredValues(entry, {
        ...cloneValue(requiredModule('base.link').defaults),
        href: '#main-content',
        text: 'Skip to specimen content',
        target: '_self',
      }, { imageUnavailable: false, capabilityUnavailable: false }),
      parentId,
      metadata,
    )
    appendChild(state, parentId, nodeId)
    const mainId = nextNodeId(state, 'main-content')
    state.nodes[mainId] = pageNode(
      mainId,
      'base.container',
      {
        ...cloneValue(requiredModule('base.container').defaults),
        tag: 'main',
        htmlAttributes: { id: 'main-content', tabindex: '-1' },
      },
      parentId,
    )
    appendChild(state, parentId, mainId)
    materializeSyntheticText(state, mainId, 'Primary synthetic template content')
    if (options.isTarget) state.targetNodeId = nodeId
    return nodeId
  }

  const nodeId = nextNodeId(state, entry.id)
  state.nodes[nodeId] = pageNode(
    nodeId,
    'base.container',
    authoredValues(entry, {
      ...cloneValue(requiredModule('base.container').defaults),
      tag: role === 'footer' ? 'footer' : 'header',
      htmlAttributes: role === 'header'
        ? { 'aria-label': 'Synthetic site header' }
        : {},
    }, { imageUnavailable: false, capabilityUnavailable: false }),
    parentId,
    metadata,
  )
  appendChild(state, parentId, nodeId)
  materializeSyntheticText(
    state,
    nodeId,
    role === 'footer'
      ? 'Synthetic site footer and legal navigation'
      : 'Synthetic site header and primary navigation',
  )
  if (options.isTarget) state.targetNodeId = nodeId
  return nodeId
}

function renderScenario(
  scenario: MaterializedScenario,
  site: SiteDocument,
  moduleJsMap: ReadonlyMap<string, string>,
): Static<typeof SpecimenScenarioSchema> {
  const diagnostics = analyseComponentLibraryAccessibility(
    scenario.page,
    componentLibraryRegistry,
    { blockingRuleIds: [] },
  )
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error')
  if (errors.length > 0) {
    throw new Error(
      `[non-form-specimens] ${scenario.entry.id}/${scenario.plan.id} has accessibility diagnostics: ` +
      errors.map((error) => `${error.rule} ${error.message}`).join('; '),
    )
  }
  const published = publishPage(scenario.page, site, registry, {
    annotateNodeIds: true,
    loopData: scenario.loopData,
  })
  const moduleAssets = resolvePublishedModuleJsAssets(
    published.jsModuleIds,
    moduleJsMap,
  )
  let html = injectModuleScripts(published.html, moduleAssets)
  html = injectDesignSystemBoundary(html)
  html = html.replace(
    '<body',
    `<body data-instatic-specimen-entry="${scenario.entry.id}" ` +
      `data-instatic-specimen-scenario="${scenario.plan.id}"`,
  )
  const targetModuleId = scenario.page.nodes[scenario.targetNodeId]?.moduleId
  if (!targetModuleId) {
    throw new Error(
      `[non-form-specimens] Target node "${scenario.targetNodeId}" is missing.`,
    )
  }
  const expectedSelector = renderedIdentitySelector(
    html,
    scenario.entry,
    scenario.targetNodeId,
    targetModuleId,
  )
  const declaredBehaviorRules = (scenario.entry.accessibility?.checks ?? [])
    .filter((check) => check.enforcement === 'behavior-test')
    .map((check) => check.rule)
    .toSorted()
  return {
    id: scenario.plan.id,
    kind: scenario.plan.kind,
    ...(scenario.plan.variantId ? { variantId: scenario.plan.variantId } : {}),
    route: `/specimens/${scenario.entry.id}/${scenario.plan.id}`,
    targetNodeId: scenario.targetNodeId,
    targetModuleId,
    expectedSelector,
    declaredBehaviorRules,
    staticAccessibilityDiagnosticCount: diagnostics.length,
    rendered: {
      html,
      htmlHash: hashValue(html),
      moduleJsAssetIds: moduleAssets.map((asset) => asset.id),
    },
  }
}

function renderedIdentitySelector(
  html: string,
  entry: ComponentLibraryEntry,
  targetNodeId: string,
  targetModuleId: string,
): string {
  if (html.includes(`uid="${targetNodeId}"`)) {
    return `[uid="${targetNodeId}"]`
  }
  const componentIdentity = html.match(/data-instatic-component="([^"]+)"/)
  if (componentIdentity?.[1]) {
    return `[data-instatic-component="${componentIdentity[1]}"]`
  }
  const moduleIdentity = `data-instatic-${targetModuleId.replace(/^base\./, '')}`
  if (html.includes(moduleIdentity)) {
    return `[${moduleIdentity}]`
  }
  if (entry.implementation.type === 'template-component') {
    if (entry.implementation.role === 'header') return 'header'
    if (entry.implementation.role === 'footer') return 'footer'
    return 'a[href="#main-content"]'
  }
  throw new Error(
    `[non-form-specimens] Rendered target identity is missing for ${entry.id}.`,
  )
}

function injectDesignSystemBoundary(html: string): string {
  const tags = [
    '<link rel="stylesheet" href="/assets/design-system/tokens.css" data-instatic-design-system-asset="tokens">',
    '<link rel="stylesheet" href="/assets/design-system/typography.css" data-instatic-design-system-asset="typography">',
    '<link rel="stylesheet" href="/assets/design-system/theme-runtime.css" data-instatic-design-system-asset="theme">',
    '<script src="/assets/design-system/theme-bootstrap.js" data-instatic-design-system-asset="theme-bootstrap"></script>',
  ].join('\n  ')
  const injected = html.replace('</head>', `  ${tags}\n</head>`)
  return rewriteCspMeta(injected, (csp) =>
    addCspSources(csp, 'script-src', ["'self'"]),
  )
}

function authoredValues(
  entry: ComponentLibraryEntry,
  initial: Record<string, unknown>,
  state: { imageUnavailable: boolean; capabilityUnavailable: boolean },
): Record<string, unknown> {
  const values = syntheticizeProps(initial)
  for (const field of entry.fields) {
    values[field.key] = authoredFieldValue(entry, field, values[field.key], state)
  }
  return values
}

function authoredFieldValue(
  entry: ComponentLibraryEntry,
  field: ComponentLibraryField,
  current: unknown,
  state: { imageUnavailable: boolean; capabilityUnavailable: boolean },
): unknown {
  if (field.type === 'repeater') {
    const count = Math.max(field.minItems, 2)
    return Array.from({ length: Math.min(count, field.maxItems ?? count) }, (_, index) =>
      Object.fromEntries(field.itemFields.map((itemField) => [
        itemField.key,
        repeaterFieldValue(entry, itemField, index),
      ])),
    )
  }
  switch (field.type) {
    case 'text':
      return textFieldValue(entry, field.key, current)
    case 'rich-text':
      return `<p>Synthetic ${entry.name} content for design-impact review.</p>`
    case 'url':
      return urlFieldValue(entry, field.key)
    case 'image':
      return state.imageUnavailable ? MISSING_IMAGE_PATH : SYNTHETIC_IMAGE_PATH
    case 'media':
      return '/assets/specimens/sample.mp4'
    case 'number':
      return numberFieldValue(field.key, current)
    case 'boolean':
      return typeof current === 'boolean' ? current : false
    case 'select':
    case 'color':
    case 'design-token':
      return current
  }
}

function textFieldValue(
  entry: ComponentLibraryEntry,
  key: string,
  current: unknown,
): string {
  const special: Record<string, string> = {
    code: 'const signal = "synthetic";\nconsole.info(signal);',
    language: 'typescript',
    columns: 'Signal | State',
    rows: 'Catalogue | Ready\nBrowser gate | Passing',
    items: 'First synthetic item\nSecond synthetic item',
    tabId: 'specimen-tab',
    target: 'main-content',
    citation: 'Synthetic design-impact source',
    query: 'synthetic',
  }
  if (special[key]) return special[key]
  if (typeof current === 'string' && current.trim() && !/^(Label|Title|Text)$/i.test(current)) {
    return current
  }
  if (/heading|title|name/i.test(key)) return `${entry.name} specimen`
  if (/label/i.test(key)) return `${entry.name} ${humanizeKey(key)}`
  return `Synthetic ${entry.name} ${humanizeKey(key)}`
}

function urlFieldValue(entry: ComponentLibraryEntry, key: string): string {
  if (key === 'href') return '#specimen-destination'
  if (key === 'sourceUrl' && entry.id.endsWith('.youtube-embed')) {
    return 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ'
  }
  if (key === 'sourceUrl' && entry.id.endsWith('.map')) {
    return 'https://www.openstreetmap.org/export/embed.html?bbox=151.20%2C-33.88%2C151.22%2C-33.86'
  }
  if (key === 'sourceUrl') return 'https://example.test/synthetic-provider'
  if (key === 'captionsUrl') return '/assets/specimens/sample.vtt'
  if (key === 'transcriptUrl') return '/assets/specimens/transcript.txt'
  if (key === 'source' && entry.id.endsWith('.audio')) {
    return '/assets/specimens/sample.wav'
  }
  if (key === 'source' && entry.id.endsWith('.pdf-viewer')) {
    return '/assets/specimens/sample.pdf'
  }
  return '/assets/specimens/document.txt'
}

function numberFieldValue(key: string, current: unknown): number {
  const values: Record<string, number> = {
    value: 62,
    maximum: 100,
    interval: 5_000,
    limit: 2,
    pageSize: 2,
  }
  return values[key] ?? (typeof current === 'number' ? current : 2)
}

function repeaterFieldValue(
  entry: ComponentLibraryEntry,
  field: Extract<ComponentLibraryField, { type: 'repeater' }>['itemFields'][number],
  index: number,
): unknown {
  switch (field.type) {
    case 'text':
      return `${entry.name} ${humanizeKey(field.key)} ${index + 1}`
    case 'number':
      return index + 1
    case 'boolean':
      return index === 0
    case 'select':
      return field.options?.[0]?.value ?? ''
    case 'url':
      return `#synthetic-${index + 1}`
  }
}

function syntheticizeProps(
  props: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(props).map(([key, value]) => {
      if (typeof value !== 'string') return [key, cloneValue(value)]
      if (/^(src|source|image|poster)$/i.test(key)) {
        return [key, SYNTHETIC_IMAGE_PATH]
      }
      if (/href$/i.test(key) && /^https?:\/\//.test(value)) {
        return [key, '#specimen-destination']
      }
      return [key, value]
    }),
  )
}

function specimenLoopData(entry: ComponentLibraryEntry): ResolvedLoopRenderData {
  return {
    items: [
      {
        id: `${entry.id}-item-1`,
        fields: {
          title: `${entry.name} synthetic result`,
          permalink: '#specimen-result',
          excerpt: 'Deterministic synthetic collection content.',
          text: 'Deterministic synthetic collection content.',
        },
      },
      {
        id: `${entry.id}-item-2`,
        fields: {
          title: `${entry.name} second result`,
          permalink: '#specimen-result-2',
          excerpt: 'A second deterministic result.',
          text: 'A second deterministic result.',
        },
      },
    ],
    totalItems: 2,
    pageNumber: 1,
    hasMore: false,
  }
}

function materializeSyntheticText(
  state: MaterializationState,
  parentId: string,
  text: string,
): string {
  const module = requiredModule('base.text')
  const nodeId = nextNodeId(state, 'synthetic-text')
  state.nodes[nodeId] = pageNode(
    nodeId,
    module.id,
    { ...cloneValue(module.defaults), text, tag: 'p' },
    parentId,
  )
  appendChild(state, parentId, nodeId)
  return nodeId
}

function materializeSyntheticButton(
  state: MaterializationState,
  parentId: string,
): string {
  const module = requiredModule('base.button')
  const nodeId = nextNodeId(state, 'synthetic-action')
  state.nodes[nodeId] = pageNode(
    nodeId,
    module.id,
    {
      ...cloneValue(module.defaults),
      label: 'Continue with synthetic action',
      href: '#specimen-action',
    },
    parentId,
  )
  appendChild(state, parentId, nodeId)
  return nodeId
}

function firstAllowedChild(entry: ComponentLibraryEntry): ComponentLibraryEntry | undefined {
  const childId = entry.constraints.allowedChildEntryIds?.[0]
  return childId ? componentLibraryRegistry.get(childId) : undefined
}

function entryForSlot(
  slot: ComponentLibraryEntry['slots'][number],
): ComponentLibraryEntry | undefined {
  const explicit = slot.allowedEntryIds?.[0]
  if (explicit) return componentLibraryRegistry.get(explicit)
  if (/action/i.test(slot.id)) {
    return componentLibraryRegistry.get('creator-signal.site.catalogue.button')
  }
  return undefined
}

function slotAccepts(
  slot: ComponentLibraryEntry['slots'][number],
  entry: ComponentLibraryEntry,
): boolean {
  if (slot.allowedEntryIds && !slot.allowedEntryIds.includes(entry.id)) return false
  if (
    slot.allowedImplementationTypes &&
    !slot.allowedImplementationTypes.includes(entry.implementation.type)
  ) return false
  return true
}

function catalogueMetadata(
  entry: ComponentLibraryEntry,
  presetId?: string,
  variantId?: string,
): CatalogueInstanceMetadata {
  const capabilityId = entry.requirements.capabilities[0]
  const providerAdapterId = entry.requirements.providerAdapters[0]
  return {
    entryId: entry.id,
    entryVersion: entry.version,
    ...(presetId ? { presetId } : {}),
    ...(variantId ? { variantId } : {}),
    ...(entry.implementation.type === 'capability-backed'
      ? {
          ...(capabilityId ? { capabilityId } : {}),
          ...(providerAdapterId ? { providerAdapterId } : {}),
        }
      : {}),
  }
}

function pageNode(
  id: string,
  moduleId: string,
  props: Record<string, unknown>,
  parentId: string | null,
  catalogueInstance?: CatalogueInstanceMetadata,
): PageNode {
  return {
    id,
    moduleId,
    props: cloneValue(props),
    breakpointOverrides: {},
    children: [],
    classIds: [],
    parentId,
    ...(catalogueInstance ? { catalogueInstance } : {}),
  }
}

function appendChild(
  state: MaterializationState,
  parentId: string,
  childId: string,
): void {
  const parent = state.nodes[parentId]
  if (!parent) throw new Error(`[non-form-specimens] Missing parent "${parentId}".`)
  if (!parent.children.includes(childId)) parent.children.push(childId)
}

function nextNodeId(state: MaterializationState, hint: string): string {
  state.sequence += 1
  return `${scenarioSlug(state.entry.id, state.plan.id)}--${state.sequence.toString().padStart(3, '0')}--${slug(hint)}`
}

function requiredModule(id: string) {
  const module = registry.get(id)
  if (!module) throw new Error(`[non-form-specimens] Module "${id}" is unavailable.`)
  return module
}

function backingImplementation(
  implementation: ComponentLibraryImplementation,
): Exclude<ComponentLibraryImplementation, { type: 'capability-backed' }> {
  return implementation.type === 'capability-backed'
    ? implementation.backing
    : implementation
}

function specimenSite(pages: Page[]): SiteDocument {
  return {
    id: 'component-library-non-form-specimens',
    name: 'Instatic non-form Component Library specimens',
    pages,
    breakpoints: structuredClone(DEFAULT_BREAKPOINTS),
    settings: {
      ...structuredClone(DEFAULT_SITE_SETTINGS),
      language: 'en-AU',
      publicOrigin: 'http://127.0.0.1',
    },
    styleRules: {},
    explorer: createDefaultSiteExplorerOrganization(),
    files: [],
    visualComponents: [],
    layouts: [],
    packageJson: normalizeSitePackageJson(undefined),
    runtime: normalizeSiteRuntimeConfig(undefined),
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
  }
}

function specimenAssets(): NonFormSpecimenBundle['syntheticAssets'] {
  const assets = [
    {
      path: SYNTHETIC_IMAGE_PATH,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450" role="img" aria-label="Synthetic Creator Signal specimen"><rect width="800" height="450" fill="#e9e7ff"/><circle cx="400" cy="205" r="96" fill="#5b4fc7"/><path d="M340 205h120M400 145v120" stroke="#fff" stroke-width="20" stroke-linecap="round"/><text x="400" y="360" text-anchor="middle" font-family="sans-serif" font-size="32" fill="#242132">Synthetic specimen</text></svg>',
    },
    {
      path: MISSING_IMAGE_PATH,
      contentType: 'image/svg+xml',
      body: '',
    },
    {
      path: '/assets/specimens/sample.vtt',
      contentType: 'text/vtt; charset=utf-8',
      body: 'WEBVTT\n\n00:00.000 --> 00:02.000\nSynthetic caption.\n',
    },
    {
      path: '/assets/specimens/transcript.txt',
      contentType: 'text/plain; charset=utf-8',
      body: 'Synthetic media transcript.\n',
    },
    {
      path: '/assets/specimens/document.txt',
      contentType: 'text/plain; charset=utf-8',
      body: 'Synthetic document.\n',
    },
    {
      path: '/assets/specimens/sample.wav',
      contentType: 'audio/wav',
      body: 'RIFF$\u0000\u0000\u0000WAVEfmt \u0010\u0000\u0000\u0000\u0001\u0000\u0001\u0000@\u001f\u0000\u0000@\u001f\u0000\u0000\u0001\u0000\b\u0000data\u0000\u0000\u0000\u0000',
    },
    {
      path: '/assets/specimens/sample.mp4',
      contentType: 'video/mp4',
      body: '',
    },
    {
      path: '/assets/specimens/sample.pdf',
      contentType: 'application/pdf',
      body: '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
    },
  ]
  return assets.map(({ path, contentType, body }) => {
    const bytes = Buffer.from(body)
    return {
      path,
      contentType,
      bodyBase64: bytes.toString('base64'),
      contentHash: hashValue(bytes),
    }
  })
}

function bundleEntryReference(entryId: string): string {
  return `instatic://component-library/specimen-bundle/non-form/${entryId}`
}

function scenarioSlug(entryId: string, scenarioId: string): string {
  return `${slug(entryId)}--${slug(scenarioId)}`
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function humanizeKey(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
}

function hashValue(value: unknown): string {
  const input = Buffer.isBuffer(value)
    ? value
    : Buffer.from(stableStringify(value))
  return `sha256:${createHash('sha256').update(input).digest('hex')}`
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
    [...counts].toSorted(([left], [right]) => left.localeCompare(right)),
  )
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => cloneValue(item)) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)]),
    ) as T
  }
  return value
}

export { NON_FORM_BUILT_IN_SPECIMEN_BUNDLE_PATH }
