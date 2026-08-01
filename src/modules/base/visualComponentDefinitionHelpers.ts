import type {
  VCNode,
  VCParam,
  VisualComponent,
} from '@core/visual-components-schema'

type PropBindings = NonNullable<VCNode['propBindings']>

export function visualNode(
  id: string,
  moduleId: string,
  defaults: Record<string, unknown>,
  props: Record<string, unknown> = {},
  children: string[] = [],
  propBindings?: PropBindings,
): VCNode {
  return {
    id,
    moduleId,
    props: { ...defaults, ...props },
    breakpointOverrides: {},
    children,
    classIds: [],
    parentId: null,
    ...(propBindings ? { propBindings } : {}),
  }
}

export function visualComponent(
  id: string,
  name: string,
  rootNodeId: string,
  params: VCParam[],
  nodes: VCNode[],
): VisualComponent {
  const byId = Object.fromEntries(nodes.map((entry) => [entry.id, entry]))
  for (const entry of nodes) {
    for (const childId of entry.children) {
      const child = byId[childId]
      if (child) child.parentId = entry.id
    }
  }
  byId[rootNodeId].parentId = null
  return {
    id,
    name,
    tree: { rootNodeId, nodes: byId },
    params,
    classIds: [],
    createdAt: 0,
  }
}

export function visualParam(
  id: string,
  name: string,
  type: VCParam['type'],
  defaultValue: unknown,
  options: Partial<
    Pick<VCParam, 'description' | 'required' | 'enumOptions'>
  > = {},
): VCParam {
  return {
    id,
    name,
    type,
    defaultValue,
    required: options.required ?? false,
    ...(options.description ? { description: options.description } : {}),
    ...(options.enumOptions ? { enumOptions: options.enumOptions } : {}),
  }
}
