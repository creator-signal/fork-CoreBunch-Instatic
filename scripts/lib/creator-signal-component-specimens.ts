import { createHash } from 'node:crypto'
import type { AnyModuleDefinition, IModuleRegistry } from '@core/module-engine'
import { registry } from '@core/module-engine'
import {
  componentLibraryPatternRegistry,
  type ComponentLibraryEntry,
  type ComponentLibraryImplementation,
} from '@core/component-library'
import {
  DEFAULT_SITE_SETTINGS,
  reindexNodeParents,
  type CatalogueInstanceMetadata,
  type Page,
  type PageNode,
  type SiteDocument,
} from '@core/page-tree'
import { pluginModuleToHostModule } from '@core/plugins/moduleAdapter'
import { publishPage } from '@core/publisher'
import {
  safeParseValue,
  Type,
  type Static,
} from '@core/utils/typeboxHelpers'
import { installPackCompileEnvironment } from '@core/plugin-sdk/cli/packCompileEnvironment'
import {
  injectFrontendAssets,
  renderFrontendAsset,
  type FrontendInjections,
} from '../../server/publish/frontendInjections'
import {
  buildSiteModuleJsMap,
  injectModuleScripts,
  resolvePublishedModuleJsAssets,
} from '../../server/publish/moduleJsBundle'

export const CREATOR_SIGNAL_SPECIMEN_SCHEMA_VERSION =
  'creator-signal.component-library-specimens/v1' as const
export const CREATOR_SIGNAL_SPECIMEN_BUNDLE_REFERENCE =
  'integrations/creator-signal/specimens/manifest.json' as const

const SHA256_PATTERN = '^sha256:[a-f0-9]{64}$'
const Sha256Schema = Type.String({ pattern: SHA256_PATTERN })

const SpecimenFieldSchema = Type.Object(
  {
    key: Type.String({ minLength: 1 }),
    type: Type.String({ minLength: 1 }),
    required: Type.Boolean(),
  },
  { additionalProperties: false },
)

const PatternLineageSchema = Type.Object(
  {
    nodeKey: Type.String({ minLength: 1 }),
    entryId: Type.String({ minLength: 1 }),
    entryVersion: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
)

export const CreatorSignalComponentSpecimenEntrySchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    version: Type.String({ minLength: 1 }),
    name: Type.String({ minLength: 1 }),
    kind: Type.Union([Type.Literal('component'), Type.Literal('pattern')]),
    implementationTaxonomy: Type.String({ minLength: 1 }),
    htmlReference: Type.String({ minLength: 1 }),
    htmlHash: Sha256Schema,
    fixture: Type.Object(
      {
        source: Type.Union([
          Type.Literal('starter-route'),
          Type.Literal('pattern-materializer'),
          Type.Literal('registry-defaults'),
        ]),
        sourceId: Type.String({ minLength: 1 }),
      },
      { additionalProperties: false },
    ),
    fields: Type.Array(SpecimenFieldSchema),
    accessibilityIntent: Type.Object(
      {
        guidance: Type.String({ minLength: 1 }),
        rules: Type.Array(Type.String({ minLength: 1 }), { uniqueItems: true }),
      },
      { additionalProperties: false },
    ),
    patternChildLineage: Type.Array(PatternLineageSchema),
    browserContract: Type.Object(
      {
        viewports: Type.Array(
          Type.Union([
            Type.Literal('desktop'),
            Type.Literal('tablet'),
            Type.Literal('mobile'),
          ]),
          { uniqueItems: true },
        ),
        themes: Type.Array(
          Type.Union([
            Type.Literal('system'),
            Type.Literal('light'),
            Type.Literal('dark'),
          ]),
          { uniqueItems: true },
        ),
        reducedMotion: Type.Boolean(),
        forcedColors: Type.Boolean(),
        imageUnavailable: Type.Boolean(),
        interactions: Type.Array(Type.String({ minLength: 1 }), {
          uniqueItems: true,
        }),
      },
      { additionalProperties: false },
    ),
    providerBoundary: Type.Object(
      {
        mode: Type.Union([
          Type.Literal('local-render'),
          Type.Literal('non-delivering-provider-state'),
        ]),
        providerEntryIds: Type.Array(Type.String({ minLength: 1 }), {
          uniqueItems: true,
        }),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
)

export const CreatorSignalComponentSpecimenBundleSchema = Type.Object(
  {
    schemaVersion: Type.Literal(CREATOR_SIGNAL_SPECIMEN_SCHEMA_VERSION),
    plugin: Type.Object(
      {
        id: Type.Literal('creator-signal.site'),
        version: Type.String({ minLength: 1 }),
      },
      { additionalProperties: false },
    ),
    designSystem: Type.Object(
      {
        owner: Type.Literal('@creator-signal/design-system'),
        revision: Type.String({ minLength: 1 }),
        replaceableAssets: Type.Array(Type.String({ minLength: 1 }), {
          minItems: 1,
          uniqueItems: true,
        }),
      },
      { additionalProperties: false },
    ),
    summary: Type.Object(
      {
        entryCount: Type.Integer({ minimum: 0 }),
        componentCount: Type.Integer({ minimum: 0 }),
        patternCount: Type.Integer({ minimum: 0 }),
      },
      { additionalProperties: false },
    ),
    entries: Type.Array(CreatorSignalComponentSpecimenEntrySchema),
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

export type CreatorSignalComponentSpecimenEntry = Static<
  typeof CreatorSignalComponentSpecimenEntrySchema
>
export type CreatorSignalComponentSpecimenBundle = Static<
  typeof CreatorSignalComponentSpecimenBundleSchema
>

export interface RenderedCreatorSignalComponentSpecimens {
  bundle: CreatorSignalComponentSpecimenBundle
  htmlByReference: ReadonlyMap<string, string>
  moduleJsByPath: ReadonlyMap<string, string>
}

type CreatorSignalPack = Awaited<
  ReturnType<typeof loadCreatorSignalSpecimenSources>
>['pack']

interface FixtureResult {
  page: Page
  source: CreatorSignalComponentSpecimenEntry['fixture']['source']
  sourceId: string
}

/**
 * Render the complete executable Creator Signal catalogue through the real
 * pattern materializer, plugin module adapter and public publisher.
 */
export async function buildCreatorSignalComponentSpecimens(): Promise<
  RenderedCreatorSignalComponentSpecimens
> {
  installPackCompileEnvironment()
  const sources = await loadCreatorSignalSpecimenSources()
  const { pack, plugin, entries, pluginVersion, designSystemRevision } = sources
  const moduleRegistry = creatorSignalModuleRegistry(plugin)
  const site = creatorSignalSpecimenSite(pack)
  const orderedEntries = [...entries].sort((left, right) => left.id.localeCompare(right.id))
  const fixtures = new Map(
    orderedEntries.map((entry) => [entry.id, specimenFixture(entry, pack, moduleRegistry)]),
  )
  site.pages = orderedEntries.map((entry) => fixtures.get(entry.id)!.page)
  const moduleJsMap = buildSiteModuleJsMap(site, moduleRegistry)
  const frontendPlan = creatorSignalFrontendPlan(plugin, pluginVersion)
  const htmlByReference = new Map<string, string>()
  const specimenEntries: CreatorSignalComponentSpecimenEntry[] = []

  for (const entry of orderedEntries) {
    const fixture = fixtures.get(entry.id)!
    const published = publishPage(fixture.page, site, moduleRegistry)
    const withFrontend = injectFrontendAssets(published.html, frontendPlan)
    const withModules = injectModuleScripts(
      withFrontend,
      resolvePublishedModuleJsAssets(published.jsModuleIds, moduleJsMap),
    )
    const html = annotateSpecimenDocument(withModules, entry)
    const htmlReference = specimenHtmlReference(entry.id)
    htmlByReference.set(htmlReference, html)

    const patternChildLineage = patternLineage(entry)
    const providerEntryIds = providerEntries(entry, patternChildLineage)
    const interactions = entry.accessibility?.checks
      .filter((check) => check.enforcement === 'behavior-test')
      .map((check) => check.rule)
      .filter((rule, index, values) => values.indexOf(rule) === index)
      .sort() ?? []

    specimenEntries.push({
      id: entry.id,
      version: entry.version,
      name: entry.name,
      kind: entry.implementation.type === 'pattern' ? 'pattern' : 'component',
      implementationTaxonomy: entry.implementation.type,
      htmlReference,
      htmlHash: sha256Text(html),
      fixture: {
        source: fixture.source,
        sourceId: fixture.sourceId,
      },
      fields: entry.fields.map((field) => ({
        key: field.key,
        type: field.type,
        required: field.required,
      })),
      accessibilityIntent: {
        guidance: entry.documentation.accessibility,
        rules: entry.accessibility?.checks
          .map((check) => check.rule)
          .filter((rule, index, values) => values.indexOf(rule) === index)
          .sort() ?? [],
      },
      patternChildLineage,
      browserContract: {
        viewports: ['desktop', 'tablet', 'mobile'],
        themes: ['system', 'light', 'dark'],
        reducedMotion: true,
        forcedColors: true,
        imageUnavailable: true,
        interactions,
      },
      providerBoundary: {
        mode: providerEntryIds.length > 0
          ? 'non-delivering-provider-state'
          : 'local-render',
        providerEntryIds,
      },
    })
  }

  const summary = {
    entryCount: specimenEntries.length,
    componentCount: specimenEntries.filter((entry) => entry.kind === 'component').length,
    patternCount: specimenEntries.filter((entry) => entry.kind === 'pattern').length,
  }
  const bundleWithoutChecksum = {
    schemaVersion: CREATOR_SIGNAL_SPECIMEN_SCHEMA_VERSION,
    plugin: { id: 'creator-signal.site' as const, version: pluginVersion },
    designSystem: {
      owner: '@creator-signal/design-system' as const,
      revision: designSystemRevision,
      replaceableAssets: [
        'integrations/creator-signal/assets/design-system/tokens.css',
        'integrations/creator-signal/assets/design-system/typography.css',
        'integrations/creator-signal/assets/design-system/theme-runtime.css',
        'integrations/creator-signal/assets/design-system/theme-bootstrap.js',
        'integrations/creator-signal/assets/design-system/theme-runtime.js',
      ],
    },
    summary,
    entries: specimenEntries,
  }
  const bundle = validateCreatorSignalComponentSpecimenBundle({
    ...bundleWithoutChecksum,
    checksum: {
      algorithm: 'sha256' as const,
      value: sha256Value(bundleWithoutChecksum),
    },
  })

  return {
    bundle,
    htmlByReference,
    moduleJsByPath: new Map(
      [...moduleJsMap.entries()].map(([moduleId, body]) => [
        `/_instatic/module-js/${encodeURIComponent(moduleId)}.js`,
        body,
      ]),
    ),
  }
}

export function validateCreatorSignalComponentSpecimenBundle(
  raw: unknown,
): CreatorSignalComponentSpecimenBundle {
  const result = safeParseValue(CreatorSignalComponentSpecimenBundleSchema, raw)
  if (!result.ok) {
    const details = result.errors
      .map((error) => `${error.path || '/'}: ${error.message}`)
      .join('; ')
    throw new Error(`[creator-signal-specimens] Invalid bundle schema: ${details}`)
  }
  const bundle = result.value
  const ids = new Set<string>()
  const references = new Set<string>()
  let previousId = ''
  for (const entry of bundle.entries) {
    if (ids.has(entry.id)) {
      throw new Error(`[creator-signal-specimens] Duplicate entry ID "${entry.id}".`)
    }
    if (references.has(entry.htmlReference)) {
      throw new Error(
        `[creator-signal-specimens] Duplicate HTML reference "${entry.htmlReference}".`,
      )
    }
    if (entry.id < previousId) {
      throw new Error('[creator-signal-specimens] Entries are not ordered by stable ID.')
    }
    ids.add(entry.id)
    references.add(entry.htmlReference)
    previousId = entry.id
  }
  const expectedSummary = {
    entryCount: bundle.entries.length,
    componentCount: bundle.entries.filter((entry) => entry.kind === 'component').length,
    patternCount: bundle.entries.filter((entry) => entry.kind === 'pattern').length,
  }
  if (stableStringify(bundle.summary) !== stableStringify(expectedSummary)) {
    throw new Error('[creator-signal-specimens] Summary does not match bundle entries.')
  }
  const { checksum, ...bundleWithoutChecksum } = bundle
  if (checksum.value !== sha256Value(bundleWithoutChecksum)) {
    throw new Error('[creator-signal-specimens] Bundle checksum does not match its content.')
  }
  return bundle
}

export function specimenHtmlReference(entryId: string): string {
  const slug = entryId.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `integrations/creator-signal/specimens/html/${slug}.html`
}

export function sha256Text(value: string): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

export function sha256Value(value: unknown): `sha256:${string}` {
  return sha256Text(stableStringify(value))
}

export function stableStringify(value: unknown): string {
  if (value === undefined) {
    throw new Error('[creator-signal-specimens] Undefined values cannot be hashed.')
  }
  if (value === null || typeof value !== 'object') {
    const serialized = JSON.stringify(value)
    if (serialized === undefined) {
      throw new Error('[creator-signal-specimens] Unsupported value cannot be hashed.')
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

async function loadCreatorSignalSpecimenSources() {
  const [pluginModule, packModule, catalogueModule, contractModule, lockModule] =
    await Promise.all([
      import('../../integrations/creator-signal/instatic-plugin.config'),
      import('../../integrations/creator-signal/pack/site'),
      import('../../integrations/creator-signal/component-library'),
      import('../../integrations/creator-signal/design-system/contract'),
      import('../../integrations/creator-signal/design-system/lock.json'),
    ])
  return {
    plugin: pluginModule.default,
    pack: packModule.pack,
    entries: catalogueModule.creatorSignalComponentLibraryEntries,
    pluginVersion: contractModule.creatorSignalPluginVersion,
    designSystemRevision: lockModule.default.source.revision,
  }
}

function creatorSignalModuleRegistry(
  plugin: Awaited<ReturnType<typeof loadCreatorSignalSpecimenSources>>['plugin'],
): IModuleRegistry {
  const modules: Record<string, AnyModuleDefinition> = Object.fromEntries(
    registry.list().map((module) => [module.id, module]),
  )
  for (const definition of plugin.modules) {
    modules[definition.id] = pluginModuleToHostModule(
      'creator-signal.site',
      definition,
      () => () => null,
      plugin.manifest.permissions,
      plugin.manifest.networkAllowedHosts,
    )
  }
  return {
    register: () => {},
    registerOrReplace: () => {},
    unregister: () => {},
    get: (id) => modules[id],
    getOrThrow: (id) => {
      const module = modules[id]
      if (!module) throw new Error(`Module not found: ${id}`)
      return module
    },
    has: (id) => id in modules,
    list: () => Object.values(modules),
    listByCategory: () => ({}),
    subscribe: () => () => {},
    generation: () => 0,
    isDynamic: (id) => modules[id]?.dynamic === true,
    getStaticPlaceholder: (id) => modules[id]?.staticPlaceholder ?? null,
  } as IModuleRegistry
}

function creatorSignalSpecimenSite(
  pack: CreatorSignalPack,
): SiteDocument {
  const site: SiteDocument = {
    id: 'creator-signal-component-specimens',
    name: 'Creator Signal component specimens',
    pages: [],
    files: [],
    visualComponents: pack.visualComponents,
    packageJson: { dependencies: {}, devDependencies: {} },
    runtime: { dependencyLock: { version: 1, packages: {}, updatedAt: 0 }, scripts: {} },
    breakpoints: [
      { id: 'mobile', label: 'Mobile', width: 390, icon: 'smartphone' },
      { id: 'tablet', label: 'Tablet', width: 900, icon: 'tablet' },
      { id: 'desktop', label: 'Desktop', width: 1440, icon: 'monitor' },
    ],
    settings: structuredClone(DEFAULT_SITE_SETTINGS),
    styleRules: Object.fromEntries(pack.classes.map((rule) => [rule.id, rule])),
    createdAt: 0,
    updatedAt: 0,
  }
  return site
}

function creatorSignalFrontendPlan(
  plugin: Awaited<ReturnType<typeof loadCreatorSignalSpecimenSources>>['plugin'],
  pluginVersion: string,
): FrontendInjections {
  const plan: FrontendInjections = {
    tags: { head: [], 'head-end': [], 'body-start': [], 'body-end': [] },
    hasInlineScript: false,
    hasInlineStyle: false,
    hasExternalScript: false,
    networkAllowedHosts: [...plugin.manifest.networkAllowedHosts],
    publicConnectOrigins: [],
    mediaCspOrigins: [],
  }
  const installedPlugin = {
    manifest: {
      id: plugin.manifest.id,
      assetBasePath: `/uploads/plugins/creator-signal.site/${pluginVersion}`,
    },
  }
  for (const asset of plugin.manifest.frontend?.assets ?? []) {
    const resolved = renderFrontendAsset(asset, installedPlugin)
    if (!resolved) continue
    plan.tags[resolved.placement].push(resolved.html)
    if (asset.kind === 'script') plan.hasExternalScript = true
    if (asset.kind === 'script-inline') plan.hasInlineScript = true
    if (asset.kind === 'style-inline') plan.hasInlineStyle = true
  }
  return plan
}

function specimenFixture(
  entry: ComponentLibraryEntry,
  pack: CreatorSignalPack,
  moduleRegistry: IModuleRegistry,
): FixtureResult {
  if (entry.implementation.type === 'pattern') {
    const starter = pack.pages.find(
      (page) => page.nodes[page.rootNodeId]?.catalogueInstance?.entryId === entry.id,
    )
    if (starter) {
      const page = structuredClone(starter)
      page.id = `specimen:${entry.id}`
      page.slug = specimenSlug(entry.id)
      page.title = entry.name
      page.template = undefined
      return { page, source: 'starter-route', sourceId: starter.slug }
    }
    const fragment = componentLibraryPatternRegistry.materialize(
      entry.implementation.patternId,
      instanceMetadata(entry),
    )
    if (!fragment) {
      throw new Error(`[creator-signal-specimens] Pattern ${entry.id} did not materialize.`)
    }
    return {
      page: pageFromFragment(entry, fragment.nodes, fragment.rootIds),
      source: 'pattern-materializer',
      sourceId: entry.implementation.patternId,
    }
  }

  const occurrence = firstPackOccurrence(entry.id, pack)
  if (occurrence) {
    return {
      page: pageFromSubtree(entry, occurrence.page, occurrence.node.id),
      source: 'starter-route',
      sourceId: occurrence.page.slug,
    }
  }

  const implementation = backingImplementation(entry.implementation)
  if (implementation.type === 'primitive') {
    const definition = moduleRegistry.getOrThrow(implementation.moduleId)
    const node = specimenNode(
      `specimen-node:${entry.id}`,
      definition.id,
      { ...definition.defaults },
      instanceMetadata(entry),
    )
    return {
      page: pageFromFragment(entry, { [node.id]: node }, [node.id]),
      source: 'registry-defaults',
      sourceId: definition.id,
    }
  }
  if (implementation.type === 'visual-component') {
    const node = specimenNode(
      `specimen-node:${entry.id}`,
      'base.visual-component-ref',
      { componentId: implementation.componentId, propOverrides: {} },
      instanceMetadata(entry),
    )
    return {
      page: pageFromFragment(entry, { [node.id]: node }, [node.id]),
      source: 'registry-defaults',
      sourceId: implementation.componentId,
    }
  }
  throw new Error(
    `[creator-signal-specimens] Unsupported implementation for ${entry.id}.`,
  )
}

function firstPackOccurrence(entryId: string, pack: CreatorSignalPack) {
  for (const page of pack.pages) {
    const node = Object.values(page.nodes).find(
      (candidate) => candidate.catalogueInstance?.entryId === entryId,
    )
    if (node) return { page, node }
  }
  return undefined
}

function pageFromSubtree(entry: ComponentLibraryEntry, source: Page, rootId: string): Page {
  const nodes: Record<string, PageNode> = {}
  const visit = (nodeId: string): void => {
    const node = source.nodes[nodeId]
    if (!node || nodes[nodeId]) return
    nodes[nodeId] = structuredClone(node)
    for (const childId of node.children) visit(childId)
  }
  visit(rootId)
  return pageFromFragment(entry, nodes, [rootId])
}

function pageFromFragment(
  entry: ComponentLibraryEntry,
  fragmentNodes: Record<string, PageNode>,
  rootIds: readonly string[],
): Page {
  const bodyId = `specimen-body:${entry.id}`
  if (fragmentNodes[bodyId]) {
    throw new Error(`[creator-signal-specimens] Fixture ID collides for ${entry.id}.`)
  }
  const nodes = structuredClone(fragmentNodes)
  nodes[bodyId] = specimenNode(bodyId, 'base.body', {}, undefined, [...rootIds])
  reindexNodeParents(nodes)
  return {
    id: `specimen:${entry.id}`,
    slug: specimenSlug(entry.id),
    title: entry.name,
    nodes,
    rootNodeId: bodyId,
  }
}

function specimenNode(
  id: string,
  moduleId: string,
  props: Record<string, unknown>,
  catalogueInstance?: CatalogueInstanceMetadata,
  children: string[] = [],
): PageNode {
  return {
    id,
    moduleId,
    props,
    breakpointOverrides: {},
    children,
    classIds: [],
    ...(catalogueInstance ? { catalogueInstance } : {}),
  }
}

function instanceMetadata(entry: ComponentLibraryEntry): CatalogueInstanceMetadata {
  return {
    entryId: entry.id,
    entryVersion: entry.version,
    ...(entry.variants.some((variant) => variant.id === 'default')
      ? { variantId: 'default' }
      : {}),
  }
}

function backingImplementation(
  implementation: ComponentLibraryImplementation,
): Exclude<ComponentLibraryImplementation, { type: 'capability-backed' }> {
  return implementation.type === 'capability-backed'
    ? implementation.backing
    : implementation
}

function patternLineage(
  entry: ComponentLibraryEntry,
): CreatorSignalComponentSpecimenEntry['patternChildLineage'] {
  if (entry.implementation.type !== 'pattern') return []
  const definition = componentLibraryPatternRegistry.get(entry.implementation.patternId)
  if (!definition) {
    throw new Error(`[creator-signal-specimens] Missing pattern ${entry.id}.`)
  }
  return definition.nodes.flatMap((node) =>
    node.catalogueInstance
      ? [{
          nodeKey: node.key,
          entryId: node.catalogueInstance.entryId,
          entryVersion: node.catalogueInstance.entryVersion,
        }]
      : []
  )
}

function providerEntries(
  entry: ComponentLibraryEntry,
  lineage: CreatorSignalComponentSpecimenEntry['patternChildLineage'],
): string[] {
  const providerIds = new Set([
    'creator-signal.site.mautic-form',
    'creator-signal.site.crm-iframe-form',
  ])
  return [entry.id, ...lineage.map((child) => child.entryId)]
    .filter((entryId, index, values) =>
      providerIds.has(entryId) && values.indexOf(entryId) === index
    )
    .sort()
}

function annotateSpecimenDocument(html: string, entry: ComponentLibraryEntry): string {
  const escapedId = escapeAttribute(entry.id)
  const escapedVersion = escapeAttribute(entry.version)
  const annotatedHead = html.replace(
    '</head>',
    `<meta name="instatic-component-library-entry" content="${escapedId}@${escapedVersion}">\n</head>`,
  )
  const annotatedBody = annotatedHead.replace(
    /<body(?=[\s>])/,
    `<body data-instatic-component-specimen="${escapedId}" data-entry-version="${escapedVersion}"`,
  )
  return annotatedBody.replace(/[ \t]+$/gm, '')
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function specimenSlug(entryId: string): string {
  return `__component-library/creator-signal/${entryId}`
}
