import { nanoid } from 'nanoid'
import type {
  CatalogueInstanceMetadata,
  PageNode,
} from '@core/page-tree'
import type { ImportFragment } from '@core/htmlImport'

export interface ComponentLibraryPatternNode {
  key: string
  moduleId: string
  props: Record<string, unknown>
  children: string[]
  catalogueInstance?: CatalogueInstanceMetadata
}

export interface ComponentLibraryPatternDefinition {
  id: string
  rootKey: string
  nodes: readonly ComponentLibraryPatternNode[]
  authorableNodeKeys: readonly string[]
}

export class ComponentLibraryPatternRegistry {
  private readonly definitions = new Map<
    string,
    ComponentLibraryPatternDefinition
  >()

  registerOrReplace(definition: ComponentLibraryPatternDefinition): void {
    validatePatternDefinition(definition)
    this.definitions.set(definition.id, freezePatternDefinition(definition))
  }

  get(id: string): ComponentLibraryPatternDefinition | undefined {
    return this.definitions.get(id)
  }

  list(): ComponentLibraryPatternDefinition[] {
    return Array.from(this.definitions.values())
      .sort((a, b) => a.id.localeCompare(b.id))
  }

  materialize(
    id: string,
    metadata: CatalogueInstanceMetadata,
  ): ImportFragment | null {
    const definition = this.get(id)
    if (!definition) return null

    const idByKey = new Map(
      definition.nodes.map((node) => [node.key, nanoid()]),
    )
    const rootId = idByKey.get(definition.rootKey)
    if (!rootId) return null

    const authorableNodeIds = definition.authorableNodeKeys
      .map((key) => idByKey.get(key))
      .filter((nodeId): nodeId is string => Boolean(nodeId))
    const nodes: Record<string, PageNode> = {}

    for (const template of definition.nodes) {
      const nodeId = idByKey.get(template.key)!
      const catalogueInstance = template.key === definition.rootKey
        ? {
            ...cloneValue(metadata),
            pattern: { authorableNodeIds },
          }
        : template.catalogueInstance
          ? cloneValue(template.catalogueInstance)
          : undefined
      nodes[nodeId] = {
        id: nodeId,
        moduleId: template.moduleId,
        props: cloneValue(template.props),
        breakpointOverrides: {},
        children: template.children.map((key) => idByKey.get(key)!),
        classIds: [],
        ...(catalogueInstance ? { catalogueInstance } : {}),
      }
    }

    return { nodes, rootIds: [rootId] }
  }
}

export const componentLibraryPatternRegistry =
  new ComponentLibraryPatternRegistry()

function validatePatternDefinition(
  definition: ComponentLibraryPatternDefinition,
): void {
  if (!definition.id || !definition.id.includes('.')) {
    throw new Error('[component-library] Pattern IDs must be namespaced.')
  }
  if (definition.nodes.length === 0) {
    throw new Error(`[component-library] Pattern "${definition.id}" has no nodes.`)
  }
  const keys = new Set<string>()
  for (const node of definition.nodes) {
    if (!node.key || keys.has(node.key)) {
      throw new Error(
        `[component-library] Pattern "${definition.id}" has a duplicate or empty node key.`,
      )
    }
    keys.add(node.key)
  }
  if (!keys.has(definition.rootKey)) {
    throw new Error(
      `[component-library] Pattern "${definition.id}" root is missing.`,
    )
  }
  const referenced = new Set<string>()
  for (const node of definition.nodes) {
    for (const childKey of node.children) {
      if (!keys.has(childKey)) {
        throw new Error(
          `[component-library] Pattern "${definition.id}" references missing node "${childKey}".`,
        )
      }
      if (referenced.has(childKey)) {
        throw new Error(
          `[component-library] Pattern "${definition.id}" reuses node "${childKey}".`,
        )
      }
      referenced.add(childKey)
    }
  }
  if (referenced.has(definition.rootKey)) {
    throw new Error(
      `[component-library] Pattern "${definition.id}" root cannot have a parent.`,
    )
  }
  for (const key of definition.authorableNodeKeys) {
    if (!keys.has(key)) {
      throw new Error(
        `[component-library] Pattern "${definition.id}" exposes missing node "${key}".`,
      )
    }
  }
}

function freezePatternDefinition(
  definition: ComponentLibraryPatternDefinition,
): ComponentLibraryPatternDefinition {
  return Object.freeze({
    ...definition,
    nodes: Object.freeze(
      definition.nodes.map((node) =>
        Object.freeze({
          ...node,
          props: Object.freeze(cloneValue(node.props)),
          children: Object.freeze([...node.children]),
          ...(node.catalogueInstance
            ? {
                catalogueInstance: Object.freeze(
                  cloneValue(node.catalogueInstance),
                ),
              }
            : {}),
        }),
      ),
    ),
    authorableNodeKeys: Object.freeze([...definition.authorableNodeKeys]),
  })
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneValue(entry)) as T
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]),
    ) as T
  }
  return value
}
