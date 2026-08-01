import type {
  BaseNode,
  CatalogueInstanceMetadata,
  PageNode,
  SiteDocument,
} from '@core/page-tree'
import type { ComponentLibraryEntry } from './schemas'
import {
  compareComponentLibraryVersions,
  isValidComponentLibraryVersion,
} from './version'

export interface ComponentLibraryMigrationData {
  props: Record<string, unknown>
  presetId?: string
  variantId?: string
}

export interface ComponentLibraryMigration {
  entryId: string
  fromVersion: string
  toVersion: string
  migrate: (
    data: ComponentLibraryMigrationData,
  ) => ComponentLibraryMigrationData
}

export type ComponentLibraryInstanceStatus =
  | 'current'
  | 'migration-required'
  | 'version-pinned'
  | 'version-ahead'
  | 'definition-missing'
  | 'invalid-preset'
  | 'invalid-variant'

export interface ComponentLibraryMigrationSuccess<TNode extends BaseNode = BaseNode> {
  ok: true
  node: TNode
  path: ReadonlyArray<Pick<ComponentLibraryMigration, 'fromVersion' | 'toVersion'>>
}

export interface ComponentLibraryMigrationFailure {
  ok: false
  error: string
}

export type ComponentLibraryMigrationResult<TNode extends BaseNode = BaseNode> =
  | ComponentLibraryMigrationSuccess<TNode>
  | ComponentLibraryMigrationFailure

export interface ComponentLibraryUsage {
  documentKind: 'page' | 'visual-component'
  documentId: string
  documentName: string
  nodeId: string
  entryId: string
  entryVersion: string
  pinnedVersion?: string
}

export interface ComponentLibraryMigrationChange {
  usage: ComponentLibraryUsage
  node: PageNode | BaseNode
  path: ReadonlyArray<Pick<ComponentLibraryMigration, 'fromVersion' | 'toVersion'>>
}

export interface ComponentLibraryMigrationPlan {
  entryId: string
  targetVersion: string
  usages: ComponentLibraryUsage[]
  unchanged: ComponentLibraryUsage[]
  changes: ComponentLibraryMigrationChange[]
  failures: Array<{
    usage: ComponentLibraryUsage
    error: string
  }>
}

export class ComponentLibraryMigrationRegistry {
  private readonly migrations = new Map<string, Map<string, ComponentLibraryMigration>>()

  register(migration: ComponentLibraryMigration): void {
    validateMigration(migration)
    let bySource = this.migrations.get(migration.entryId)
    if (!bySource) {
      bySource = new Map()
      this.migrations.set(migration.entryId, bySource)
    }
    const key = migrationKey(migration.fromVersion, migration.toVersion)
    if (bySource.has(key)) {
      throw new Error(
        `[component-library] Migration ${migration.entryId} ` +
          `${migration.fromVersion} -> ${migration.toVersion} is already registered.`,
      )
    }
    bySource.set(key, migration)
  }

  unregisterEntry(entryId: string): void {
    this.migrations.delete(entryId)
  }

  list(entryId: string): ComponentLibraryMigration[] {
    return Array.from(this.migrations.get(entryId)?.values() ?? [])
      .sort((left, right) => {
        const source = compareComponentLibraryVersions(
          left.fromVersion,
          right.fromVersion,
        )
        return source !== 0
          ? source
          : compareComponentLibraryVersions(left.toVersion, right.toVersion)
      })
  }

  findPath(
    entryId: string,
    fromVersion: string,
    toVersion: string,
  ): ComponentLibraryMigration[] | null {
    if (fromVersion === toVersion) return []
    const outgoing = new Map<string, ComponentLibraryMigration[]>()
    for (const migration of this.list(entryId)) {
      const edges = outgoing.get(migration.fromVersion) ?? []
      edges.push(migration)
      outgoing.set(migration.fromVersion, edges)
    }

    const pending: Array<{
      version: string
      path: ComponentLibraryMigration[]
    }> = [{ version: fromVersion, path: [] }]
    const visited = new Set([fromVersion])
    while (pending.length > 0) {
      const current = pending.shift()
      if (!current) break
      for (const migration of outgoing.get(current.version) ?? []) {
        if (migration.toVersion === toVersion) {
          return [...current.path, migration]
        }
        if (visited.has(migration.toVersion)) continue
        visited.add(migration.toVersion)
        pending.push({
          version: migration.toVersion,
          path: [...current.path, migration],
        })
      }
    }
    return null
  }
}

export const componentLibraryMigrationRegistry =
  new ComponentLibraryMigrationRegistry()

export function resolveComponentLibraryInstanceStatus(
  metadata: CatalogueInstanceMetadata,
  entry: ComponentLibraryEntry | undefined,
): ComponentLibraryInstanceStatus {
  if (!entry) return 'definition-missing'
  if (metadata.pinnedVersion) return 'version-pinned'

  const comparison = compareComponentLibraryVersions(
    metadata.entryVersion,
    entry.version,
  )
  if (comparison > 0) return 'version-ahead'
  if (comparison < 0) return 'migration-required'
  if (
    metadata.presetId &&
    !entry.presets.some((preset) => preset.id === metadata.presetId)
  ) {
    return 'invalid-preset'
  }
  if (
    metadata.variantId &&
    !entry.variants.some((variant) => variant.id === metadata.variantId)
  ) {
    return 'invalid-variant'
  }
  return 'current'
}

/**
 * Run an instance upgrade against a detached snapshot. The source node is
 * never mutated, including when a migration throws or returns invalid data.
 */
export function migrateComponentLibraryInstance<TNode extends BaseNode>(
  node: TNode,
  targetEntry: ComponentLibraryEntry,
  registry: ComponentLibraryMigrationRegistry,
): ComponentLibraryMigrationResult<TNode> {
  const metadata = node.catalogueInstance
  if (!metadata) return failure('The node is not a Component Library instance.')
  if (metadata.entryId !== targetEntry.id) {
    return failure(
      `Instance entry "${metadata.entryId}" does not match target "${targetEntry.id}".`,
    )
  }
  if (metadata.pinnedVersion) {
    return failure(`Instance is pinned to ${metadata.pinnedVersion}.`)
  }

  const comparison = compareComponentLibraryVersions(
    metadata.entryVersion,
    targetEntry.version,
  )
  if (comparison > 0) {
    return failure(
      `Instance version ${metadata.entryVersion} is newer than available definition ${targetEntry.version}.`,
    )
  }

  const path = registry.findPath(
    targetEntry.id,
    metadata.entryVersion,
    targetEntry.version,
  )
  if (!path) {
    return failure(
      `No migration path from ${metadata.entryVersion} to ${targetEntry.version}.`,
    )
  }

  let data: ComponentLibraryMigrationData = {
    props: structuredClone(node.props),
    ...(metadata.presetId ? { presetId: metadata.presetId } : {}),
    ...(metadata.variantId ? { variantId: metadata.variantId } : {}),
  }
  try {
    for (const migration of path) {
      const output = migration.migrate(structuredClone(data))
      if (!isMigrationData(output)) {
        return failure(
          `Migration ${migration.fromVersion} -> ${migration.toVersion} returned invalid instance data.`,
        )
      }
      data = structuredClone(output)
    }
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Migration failed.')
  }

  if (
    data.presetId &&
    !targetEntry.presets.some((preset) => preset.id === data.presetId)
  ) {
    return failure(
      `Migrated preset "${data.presetId}" is not declared by ${targetEntry.id}@${targetEntry.version}.`,
    )
  }
  if (
    data.variantId &&
    !targetEntry.variants.some((variant) => variant.id === data.variantId)
  ) {
    return failure(
      `Migrated variant "${data.variantId}" is not declared by ${targetEntry.id}@${targetEntry.version}.`,
    )
  }

  const nextMetadata: CatalogueInstanceMetadata = {
    ...metadata,
    entryVersion: targetEntry.version,
    ...(data.presetId ? { presetId: data.presetId } : {}),
    ...(data.variantId ? { variantId: data.variantId } : {}),
  }
  delete nextMetadata.pinnedVersion
  if (!data.presetId) delete nextMetadata.presetId
  if (!data.variantId) delete nextMetadata.variantId

  return {
    ok: true,
    node: {
      ...structuredClone(node),
      props: data.props,
      catalogueInstance: nextMetadata,
    },
    path: path.map(({ fromVersion, toVersion }) => ({
      fromVersion,
      toVersion,
    })),
  }
}

export function findComponentLibraryUsages(
  site: SiteDocument,
  entryId: string,
): ComponentLibraryUsage[] {
  const usages: ComponentLibraryUsage[] = []
  for (const page of site.pages) {
    collectTreeUsages(
      page.nodes,
      entryId,
      'page',
      page.id,
      page.title,
      usages,
    )
  }
  for (const component of site.visualComponents) {
    collectTreeUsages(
      component.tree.nodes,
      entryId,
      'visual-component',
      component.id,
      component.name,
      usages,
    )
  }
  return usages.sort((left, right) =>
    `${left.documentKind}\u0000${left.documentName}\u0000${left.nodeId}`
      .localeCompare(
        `${right.documentKind}\u0000${right.documentName}\u0000${right.nodeId}`,
      ),
  )
}

export function planComponentLibraryMigration(
  site: SiteDocument,
  targetEntry: ComponentLibraryEntry,
  registry: ComponentLibraryMigrationRegistry,
): ComponentLibraryMigrationPlan {
  const usages = findComponentLibraryUsages(site, targetEntry.id)
  const plan: ComponentLibraryMigrationPlan = {
    entryId: targetEntry.id,
    targetVersion: targetEntry.version,
    usages,
    unchanged: [],
    changes: [],
    failures: [],
  }

  for (const usage of usages) {
    const node = findUsageNode(site, usage)
    if (!node) {
      plan.failures.push({ usage, error: 'Backing node is missing.' })
      continue
    }
    const status = resolveComponentLibraryInstanceStatus(
      node.catalogueInstance!,
      targetEntry,
    )
    if (status === 'current') {
      plan.unchanged.push(usage)
      continue
    }
    const result = migrateComponentLibraryInstance(node, targetEntry, registry)
    if (!result.ok) {
      plan.failures.push({ usage, error: result.error })
      continue
    }
    plan.changes.push({
      usage,
      node: result.node,
      path: result.path,
    })
  }
  return plan
}

function validateMigration(migration: ComponentLibraryMigration): void {
  if (!migration.entryId.includes('.')) {
    throw new Error('[component-library] Migration entryId must be namespaced.')
  }
  if (
    !isValidComponentLibraryVersion(migration.fromVersion) ||
    !isValidComponentLibraryVersion(migration.toVersion)
  ) {
    throw new Error('[component-library] Migration versions must be semantic versions.')
  }
  if (
    compareComponentLibraryVersions(
      migration.fromVersion,
      migration.toVersion,
    ) >= 0
  ) {
    throw new Error('[component-library] Migrations must move to a newer version.')
  }
}

function migrationKey(fromVersion: string, toVersion: string): string {
  return `${fromVersion}\u0000${toVersion}`
}

function isMigrationData(value: unknown): value is ComponentLibraryMigrationData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Partial<ComponentLibraryMigrationData>
  if (!candidate.props || typeof candidate.props !== 'object' || Array.isArray(candidate.props)) {
    return false
  }
  return (
    (candidate.presetId === undefined || typeof candidate.presetId === 'string') &&
    (candidate.variantId === undefined || typeof candidate.variantId === 'string')
  )
}

function failure(error: string): ComponentLibraryMigrationFailure {
  return { ok: false, error }
}

function collectTreeUsages(
  nodes: Readonly<Record<string, BaseNode>>,
  entryId: string,
  documentKind: ComponentLibraryUsage['documentKind'],
  documentId: string,
  documentName: string,
  usages: ComponentLibraryUsage[],
): void {
  for (const node of Object.values(nodes)) {
    const metadata = node.catalogueInstance
    if (!metadata || metadata.entryId !== entryId) continue
    usages.push({
      documentKind,
      documentId,
      documentName,
      nodeId: node.id,
      entryId,
      entryVersion: metadata.entryVersion,
      ...(metadata.pinnedVersion
        ? { pinnedVersion: metadata.pinnedVersion }
        : {}),
    })
  }
}

function findUsageNode(
  site: SiteDocument,
  usage: ComponentLibraryUsage,
): PageNode | BaseNode | undefined {
  if (usage.documentKind === 'page') {
    return site.pages.find((page) => page.id === usage.documentId)
      ?.nodes[usage.nodeId]
  }
  return site.visualComponents.find((component) => component.id === usage.documentId)
    ?.tree.nodes[usage.nodeId]
}
