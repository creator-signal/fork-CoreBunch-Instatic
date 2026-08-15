import {
  type ComponentLibraryEntry,
  type ComponentLibraryImplementation,
} from './schemas'
import {
  componentLibraryPatternRegistry,
  type ComponentLibraryPatternDefinition,
} from './patterns'
import type { PageNode } from '@core/page-tree'

type GovernedEntryResolver = (
  node: PageNode,
) => ComponentLibraryEntry | undefined

export function isValidGovernedPatternBoundary(
  root: PageNode,
  nodes: Record<string, PageNode>,
  entry: ComponentLibraryEntry,
  resolveEntry: GovernedEntryResolver,
): boolean {
  const implementation = backingImplementation(entry.implementation)
  if (implementation.type !== 'pattern') return false
  const definition = componentLibraryPatternRegistry.get(
    implementation.patternId,
  )
  if (!definition) return false
  const rootTemplate = definition.nodes.find(
    (candidate) => candidate.key === definition.rootKey,
  )
  if (!rootTemplate || root.moduleId !== rootTemplate.moduleId) return false

  const match = matchPatternBoundary(root, nodes, definition, resolveEntry)
  if (!match) return false
  const { idByKey } = match
  const authorableNodeIds = definition.authorableNodeKeys
    .map((key) => idByKey.get(key))
  if (authorableNodeIds.some((nodeId) => !nodeId)) return false
  return deepEqual(
    root.catalogueInstance?.pattern?.authorableNodeIds,
    authorableNodeIds,
  )
}

function matchPatternBoundary(
  root: PageNode,
  nodes: Record<string, PageNode>,
  definition: ComponentLibraryPatternDefinition,
  resolveEntry: GovernedEntryResolver,
): {
  idByKey: Map<string, string>
  managedIds: Set<string>
} | null {
  const idByKey = new Map<string, string>()
  const visitedIds = new Set<string>()
  if (
    !matchPatternNode(
      definition,
      definition.rootKey,
      root.id,
      nodes,
      idByKey,
      visitedIds,
      resolveEntry,
    )
  ) {
    return null
  }
  return { idByKey, managedIds: visitedIds }
}

export function isManagedGovernedPatternNode(
  node: PageNode,
  nodes: Record<string, PageNode>,
  resolveEntry: GovernedEntryResolver,
): boolean {
  let current: PageNode | undefined = node
  const visited = new Set<string>()
  while (current && !visited.has(current.id)) {
    visited.add(current.id)
    if (current.catalogueInstance?.pattern) {
      const entry = resolveEntry(current)
      if (!entry) return false
      const implementation = backingImplementation(entry.implementation)
      if (implementation.type !== 'pattern') return false
      const definition = componentLibraryPatternRegistry.get(
        implementation.patternId,
      )
      if (!definition) return false
      const match = matchPatternBoundary(
        current,
        nodes,
        definition,
        resolveEntry,
      )
      if (!match) return false
      const authorableNodeIds = definition.authorableNodeKeys
        .map((key) => match.idByKey.get(key))
      return (
        !authorableNodeIds.some((nodeId) => !nodeId) &&
        deepEqual(
          current.catalogueInstance.pattern.authorableNodeIds,
          authorableNodeIds,
        ) &&
        match.managedIds.has(node.id)
      )
    }
    current = parentNodeFor(nodes, current.id)
  }
  return false
}

function matchPatternNode(
  definition: ComponentLibraryPatternDefinition,
  templateKey: string,
  instanceId: string,
  nodes: Record<string, PageNode>,
  idByKey: Map<string, string>,
  visitedIds: Set<string>,
  resolveEntry: GovernedEntryResolver,
): boolean {
  const template = definition.nodes.find(
    (candidate) => candidate.key === templateKey,
  )
  const instance = nodes[instanceId]
  if (!template || !instance || visitedIds.has(instanceId)) return false
  if (
    instance.moduleId !== template.moduleId ||
    instance.classIds.length > 0 ||
    Object.keys(instance.breakpointOverrides).length > 0 ||
    (instance.inlineStyles && Object.keys(instance.inlineStyles).length > 0) ||
    instance.propBindings ||
    instance.dynamicBindings ||
    instance.label !== undefined ||
    instance.locked !== undefined ||
    instance.hidden !== undefined
  ) {
    return false
  }
  if (templateKey === definition.rootKey) {
    const rootEntry = resolveEntry(instance)
    if (
      !rootEntry ||
      !isApprovedPatternRootVariation(template, instance, rootEntry)
    ) {
      return false
    }
  } else if (template.catalogueInstance) {
    const nestedEntry = resolveEntry(instance)
    if (
      !nestedEntry ||
      nestedEntry.id !== template.catalogueInstance.entryId ||
      nestedEntry.version !== template.catalogueInstance.entryVersion ||
      !isApprovedGovernedVariation(template, instance, nestedEntry)
    ) {
      return false
    }
  } else if (
    !deepEqual(instance.props, template.props) ||
    instance.catalogueInstance !== undefined
  ) {
    return false
  }

  visitedIds.add(instanceId)
  idByKey.set(templateKey, instanceId)
  if (definition.authorableNodeKeys.includes(templateKey)) return true
  if (instance.children.length !== template.children.length) return false
  for (let index = 0; index < template.children.length; index += 1) {
    if (
      !matchPatternNode(
        definition,
        template.children[index]!,
        instance.children[index]!,
        nodes,
        idByKey,
        visitedIds,
        resolveEntry,
      )
    ) {
      return false
    }
  }
  return true
}

function isApprovedPatternRootVariation(
  template: ComponentLibraryPatternDefinition['nodes'][number],
  instance: PageNode,
  entry: ComponentLibraryEntry,
): boolean {
  const metadata = instance.catalogueInstance
  const implementation = backingImplementation(entry.implementation)
  if (
    !metadata?.pattern ||
    implementation.type !== 'pattern' ||
    metadata.entryId !== entry.id ||
    metadata.entryVersion !== entry.version
  ) {
    return false
  }
  const permitted = new Set(entry.fields.map((field) => field.key))
  const options = approvedOptions(entry, metadata)
  for (const option of options) {
    for (const key of Object.keys(option.values)) permitted.add(key)
  }
  const keys = new Set([
    ...Object.keys(template.props),
    ...Object.keys(instance.props),
  ])
  if (!Array.from(keys).every((key) =>
    permitted.has(key) || deepEqual(template.props[key], instance.props[key])
  )) {
    return false
  }
  return options.every((option) =>
    Object.entries(option.values).every(([key, value]) =>
      deepEqual(instance.props[key], value),
    ),
  )
}

function isApprovedGovernedVariation(
  template: ComponentLibraryPatternDefinition['nodes'][number],
  instance: PageNode,
  entry: ComponentLibraryEntry,
): boolean {
  const metadata = instance.catalogueInstance
  if (
    !metadata ||
    metadata.pinnedVersion ||
    metadata.pattern ||
    metadata.entryId !== entry.id ||
    metadata.entryVersion !== entry.version
  ) {
    return false
  }
  const implementation = backingImplementation(entry.implementation)
  const permitted = new Set(entry.fields.map((field) => field.key))
  for (const option of approvedOptions(entry, metadata)) {
    for (const key of Object.keys(option.values)) permitted.add(key)
  }

  if (implementation.type === 'primitive') {
    if (implementation.moduleId !== instance.moduleId) return false
    const keys = new Set([
      ...Object.keys(template.props),
      ...Object.keys(instance.props),
    ])
    return Array.from(keys).every((key) =>
      permitted.has(key) ||
      deepEqual(template.props[key], instance.props[key]),
    )
  }
  if (implementation.type === 'visual-component') {
    if (
      instance.moduleId !== 'base.visual-component-ref' ||
      instance.props.componentId !== implementation.componentId
    ) {
      return false
    }
    const overrides = safeRecord(instance.props.propOverrides)
    if (!Object.keys(overrides).every((key) => permitted.has(key))) return false
    return approvedOptions(entry, metadata).every((option) =>
      Object.entries(option.values).every(([key, value]) =>
        deepEqual(overrides[key], value),
      ),
    )
  }
  return false
}

function approvedOptions(
  entry: ComponentLibraryEntry,
  metadata: NonNullable<PageNode['catalogueInstance']>,
) {
  return [
    ...entry.presets.filter((option) => option.id === metadata.presetId),
    ...entry.variants.filter((option) => option.id === metadata.variantId),
  ]
}

function safeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function parentNodeFor(
  nodes: Record<string, PageNode>,
  childId: string,
): PageNode | undefined {
  const child = nodes[childId]
  if (child?.parentId) return nodes[child.parentId]
  return Object.values(nodes).find((candidate) =>
    candidate.children.includes(childId),
  )
}

function backingImplementation(
  implementation: ComponentLibraryImplementation,
): Exclude<ComponentLibraryImplementation, { type: 'capability-backed' }> {
  return implementation.type === 'capability-backed'
    ? implementation.backing
    : implementation
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null || typeof a !== typeof b) return false
  if (typeof a !== 'object') return false
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false
    return a.every((value, index) => deepEqual(value, b[index]))
  }
  if (Array.isArray(b)) return false
  const aRecord = a as Record<string, unknown>
  const bRecord = b as Record<string, unknown>
  const aKeys = Object.keys(aRecord)
  if (aKeys.length !== Object.keys(bRecord).length) return false
  return aKeys.every((key) =>
    Object.prototype.hasOwnProperty.call(bRecord, key) &&
    deepEqual(aRecord[key], bRecord[key]),
  )
}
