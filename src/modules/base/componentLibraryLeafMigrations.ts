import {
  componentLibraryTreeMigrationRegistry,
  type ComponentLibraryTreeMigrationContext,
} from '@core/component-library'
import { creatorSignalCatalogueEntryId, type BaseNode } from '@core/page-tree'

interface LegacySlotMigrationSpec {
  entryId: string
  slotName: string
  targetParam: 'actions' | 'items' | 'links'
  mode: 'actions' | 'links' | 'navigation' | 'breadcrumb'
}

const migrations: LegacySlotMigrationSpec[] = [
  { entryId: 'base.hero', slotName: 'actions', targetParam: 'actions', mode: 'actions' },
  { entryId: 'base.card', slotName: 'actions', targetParam: 'actions', mode: 'actions' },
  { entryId: 'base.teaser', slotName: 'actions', targetParam: 'actions', mode: 'actions' },
  { entryId: 'base.navigation', slotName: 'items', targetParam: 'items', mode: 'navigation' },
  { entryId: 'base.notice', slotName: 'actions', targetParam: 'actions', mode: 'actions' },
  { entryId: 'base.person-profile', slotName: 'links', targetParam: 'links', mode: 'links' },
  { entryId: 'base.breadcrumb', slotName: 'items', targetParam: 'items', mode: 'breadcrumb' },
  { entryId: 'base.table-of-contents', slotName: 'items', targetParam: 'items', mode: 'links' },
]

for (const spec of migrations) {
  componentLibraryTreeMigrationRegistry.registerOrReplace({
    entryId: creatorSignalCatalogueEntryId(spec.entryId),
    fromVersion: '1.0.0',
    toVersion: '2.0.0',
    migrate: (context) => migrateLegacySlot(context, spec),
  })
}

function migrateLegacySlot(
  { node, nodes }: ComponentLibraryTreeMigrationContext,
  spec: LegacySlotMigrationSpec,
): void {
  if (node.moduleId !== 'base.visual-component-ref') {
    throw new Error('The governed instance is not a Visual Component reference.')
  }
  const directChildren = node.children.map((childId) => nodes[childId])
  if (directChildren.some((child) =>
    !child ||
    child.moduleId !== 'base.slot-instance' ||
    child.props.slotName !== spec.slotName
  )) {
    throw new Error('Legacy component contains an unexpected direct child; its subtree was preserved.')
  }
  if (directChildren.length > 1) {
    throw new Error('Legacy component contains duplicate slot instances; both subtrees were preserved.')
  }
  const slot = directChildren.find((child) =>
      child?.moduleId === 'base.slot-instance' &&
      child.props.slotName === spec.slotName,
    )
  const migrated = slot
    ? slot.children.map((childId) => migrateLegacyItem(nodes[childId], spec.mode))
    : []
  if (spec.mode === 'breadcrumb' && migrated.length > 0) {
    migrated[migrated.length - 1] = {
      ...migrated[migrated.length - 1],
      current: true,
    }
  }

  const overrides = plainRecord(node.props.propOverrides)
  const existing = Array.isArray(overrides[spec.targetParam])
    ? overrides[spec.targetParam] as unknown[]
    : []
  node.props = {
    ...node.props,
    propOverrides: {
      ...overrides,
      [spec.targetParam]: [...existing, ...migrated],
    },
  }
}

function migrateLegacyItem(
  child: BaseNode | undefined,
  mode: LegacySlotMigrationSpec['mode'],
): Record<string, unknown> {
  if (!child || (child.moduleId !== 'base.link' && child.moduleId !== 'base.button')) {
    throw new Error(
      `Legacy slot contains unsupported module ${child?.moduleId ?? '<missing>'}; its subtree was preserved.`,
    )
  }
  if (child.children.length > 0) {
    throw new Error(
      `Legacy ${child.moduleId} contains authored children; its subtree was preserved.`,
    )
  }
  const href = stringProp(child.props.href, mode === 'actions' ? '' : '#')
  const target = normalizeTarget(child.props.target)
  const htmlAttributes = plainRecord(child.props.htmlAttributes)
  const migrated: Record<string, unknown> = {
    label: child.moduleId === 'base.button'
      ? stringProp(child.props.label, 'Action')
      : stringProp(child.props.text, 'Link'),
    href,
    target,
  }
  if (mode === 'actions') {
    migrated.kind = child.moduleId === 'base.button' && !href ? 'button' : 'link'
  }
  if (mode === 'navigation' || mode === 'breadcrumb') {
    migrated.current = htmlAttributes['aria-current'] === 'page'
  }
  return migrated
}

function plainRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function stringProp(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function normalizeTarget(value: unknown): '_self' | '_blank' | '_parent' {
  return value === '_blank' || value === '_parent' ? value : '_self'
}
