import { createHash } from 'node:crypto'

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`
}

export function canonicalSha256(value: unknown): string {
  return createHash('sha256').update(canonical(value)).digest('hex')
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

/**
 * Hash page cells by semantic tree position rather than generated node IDs.
 * Component-pattern insertion historically used nanoid values, so exact
 * untouched content from two builds could otherwise receive different hashes.
 * Structural order, props, metadata and every non-ID value remain part of the
 * hash; only internal node references are replaced with traversal IDs.
 */
export function canonicalPageCellsSha256(value: unknown): string {
  const cells = recordValue(value)
  const body = recordValue(cells?.body)
  const nodes = recordValue(body?.nodes)
  const rootNodeId = body?.rootNodeId
  if (!cells || !body || !nodes || typeof rootNodeId !== 'string') {
    return canonicalSha256(value)
  }

  const orderedIds: string[] = []
  const parentById = new Map<string, string | null>()
  const visited = new Set<string>()
  let invalid = false
  const visit = (nodeId: string, parentId: string | null): void => {
    if (visited.has(nodeId)) return
    const node = recordValue(nodes[nodeId])
    if (!node || !Array.isArray(node.children) ||
      node.children.some((childId) => typeof childId !== 'string')) {
      invalid = true
      return
    }
    visited.add(nodeId)
    orderedIds.push(nodeId)
    parentById.set(nodeId, parentId)
    for (const childId of node.children as string[]) visit(childId, nodeId)
  }
  visit(rootNodeId, null)
  if (invalid || visited.size !== Object.keys(nodes).length) return canonicalSha256(value)

  const nextIdByCurrentId = new Map(orderedIds.map((nodeId, index) => [
    nodeId,
    `node-${String(index).padStart(3, '0')}`,
  ]))
  const remap = (nodeId: string): string => nextIdByCurrentId.get(nodeId) ?? nodeId
  const nextNodes: Record<string, unknown> = {}

  for (const currentId of orderedIds) {
    const node = recordValue(nodes[currentId])!
    const catalogueInstance = recordValue(node.catalogueInstance)
    const pattern = recordValue(catalogueInstance?.pattern)
    const authorableNodeIds = Array.isArray(pattern?.authorableNodeIds)
      ? pattern.authorableNodeIds.filter((nodeId): nodeId is string => typeof nodeId === 'string')
      : null
    const nextId = remap(currentId)
    nextNodes[nextId] = {
      ...node,
      id: nextId,
      children: (node.children as string[]).map(remap),
      parentId: parentById.get(currentId) === null
        ? null
        : remap(parentById.get(currentId)!),
      ...(catalogueInstance
        ? {
            catalogueInstance: {
              ...catalogueInstance,
              ...(pattern && authorableNodeIds
                ? {
                    pattern: {
                      ...pattern,
                      authorableNodeIds: authorableNodeIds.map(remap),
                    },
                  }
                : {}),
            },
          }
        : {}),
    }
  }

  return canonicalSha256({
    ...cells,
    body: {
      ...body,
      nodes: nextNodes,
      rootNodeId: remap(rootNodeId),
    },
  })
}
