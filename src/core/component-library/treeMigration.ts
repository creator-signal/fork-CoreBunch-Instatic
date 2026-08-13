import type { BaseNode } from '@core/page-tree'
import { compareComponentLibraryVersions } from './version'

export interface ComponentLibraryTreeMigrationContext {
  node: BaseNode
  nodes: Record<string, BaseNode>
}

export interface ComponentLibraryTreeMigration {
  entryId: string
  fromVersion: string
  toVersion: string
  migrate: (context: ComponentLibraryTreeMigrationContext) => void
}

/**
 * Registry for the narrow class of catalogue upgrades that must inspect a
 * governed node's descendants. Ordinary prop-only upgrades continue to use
 * ComponentLibraryMigrationRegistry; this registry exists so a former slot can
 * be copied into typed data before slot reconciliation removes its subtree.
 */
export class ComponentLibraryTreeMigrationRegistry {
  private readonly migrations = new Map<string, Map<string, ComponentLibraryTreeMigration>>()

  registerOrReplace(migration: ComponentLibraryTreeMigration): void {
    if (compareComponentLibraryVersions(migration.fromVersion, migration.toVersion) >= 0) {
      throw new Error('[component-library] Tree migrations must move to a newer version.')
    }
    const byVersion = this.migrations.get(migration.entryId) ?? new Map()
    byVersion.set(migration.fromVersion, migration)
    this.migrations.set(migration.entryId, byVersion)
  }

  next(entryId: string, fromVersion: string): ComponentLibraryTreeMigration | undefined {
    return this.migrations.get(entryId)?.get(fromVersion)
  }
}

export const componentLibraryTreeMigrationRegistry =
  new ComponentLibraryTreeMigrationRegistry()

export interface ComponentLibraryTreeMigrationReport {
  migratedNodeIds: Set<string>
  blockedNodeIds: Set<string>
}

/**
 * Apply registered descendant-aware migrations in place. A failed migration
 * restores the complete node map snapshot and marks the owning node blocked so
 * callers can skip destructive slot reconciliation. Persisted content is never
 * discarded merely because an upgrade cannot understand an unexpected child.
 */
export function migrateComponentLibraryTrees(
  nodeMaps: Array<Record<string, BaseNode>>,
): ComponentLibraryTreeMigrationReport {
  const report: ComponentLibraryTreeMigrationReport = {
    migratedNodeIds: new Set(),
    blockedNodeIds: new Set(),
  }
  for (const nodes of nodeMaps) {
    for (const nodeId of Object.keys(nodes)) {
      const node = nodes[nodeId]
      if (!node?.catalogueInstance) continue
      if (node.catalogueInstance.pinnedVersion) {
        if (componentLibraryTreeMigrationRegistry.next(
          node.catalogueInstance.entryId,
          node.catalogueInstance.entryVersion,
        )) {
          report.blockedNodeIds.add(node.id)
        }
        continue
      }
      let migration = componentLibraryTreeMigrationRegistry.next(
        node.catalogueInstance.entryId,
        node.catalogueInstance.entryVersion,
      )
      while (migration) {
        const snapshot = structuredClone(nodes)
        try {
          migration.migrate({ node, nodes })
          node.catalogueInstance = {
            ...node.catalogueInstance,
            entryVersion: migration.toVersion,
          }
          report.migratedNodeIds.add(node.id)
        } catch (error) {
          replaceNodeMap(nodes, snapshot)
          report.blockedNodeIds.add(node.id)
          console.error(
            '[component-library] preserving legacy component after tree migration failed',
            node.catalogueInstance.entryId,
            node.id,
            error instanceof Error ? error.message : error,
          )
          break
        }
        migration = componentLibraryTreeMigrationRegistry.next(
          node.catalogueInstance.entryId,
          node.catalogueInstance.entryVersion,
        )
      }
    }
  }
  return report
}

function replaceNodeMap(
  target: Record<string, BaseNode>,
  snapshot: Record<string, BaseNode>,
): void {
  for (const key of Object.keys(target)) delete target[key]
  Object.assign(target, snapshot)
}
