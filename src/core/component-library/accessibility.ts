import type { Page, PageNode, SiteDocument } from '@core/page-tree'
import type { ComponentLibraryRegistry } from './registry'
import type {
  ComponentLibraryAccessibilityCheck,
  ComponentLibraryAccessibilityCategory,
  ComponentLibraryAccessibilityRule,
  ComponentLibraryEntry,
} from './schemas'

export interface ComponentLibraryAccessibilityPolicy {
  blockingRuleIds: readonly string[]
}

export interface ComponentLibraryAccessibilityDiagnostic {
  pageId: string
  nodeId: string
  entryId: string
  rule: ComponentLibraryAccessibilityRule
  category: ComponentLibraryAccessibilityCategory
  severity: 'warning' | 'error'
  blocking: boolean
  message: string
  remediation: string
}

const EMPTY_POLICY: ComponentLibraryAccessibilityPolicy = {
  blockingRuleIds: [],
}

const FORM_CONTROL_MODULES = new Set([
  'base.input',
  'base.textarea',
  'base.select',
  'base.checkbox',
  'base.radio',
])

/**
 * Run deterministic, entry-specific automated checks against one authored
 * page. Behavior-test and manual declarations remain metadata: they document
 * required coverage without pretending a static tree scan proves behavior.
 */
export function analyseComponentLibraryAccessibility(
  page: Page,
  registry: ComponentLibraryRegistry,
  policy: ComponentLibraryAccessibilityPolicy = EMPTY_POLICY,
): ComponentLibraryAccessibilityDiagnostic[] {
  const blockingRules = new Set(policy.blockingRuleIds)
  const diagnostics: ComponentLibraryAccessibilityDiagnostic[] = []
  const orderedNodeIds = nodeIdsInPageOrder(page)
  const fieldOccurrences = collectFieldOccurrences(page)
  let previousHeadingLevel: number | null = null

  for (const nodeId of orderedNodeIds) {
    const node = page.nodes[nodeId]
    if (!node) continue
    const entry = entryForNode(node, registry)
    if (!entry) continue

    for (const check of entry.accessibility?.checks ?? []) {
      if (check.enforcement !== 'automated') continue

      switch (check.rule) {
        case 'a11y.accessible-name':
        case 'a11y.provider-fallback':
          for (const field of check.fields ?? []) {
            if (nonEmptyString(node.props[field])) continue
            diagnostics.push(diagnostic(
              page,
              node,
              entry,
              check,
              blockingRules,
              `${check.summary} Missing or empty field: ${field}.`,
            ))
          }
          break

        case 'a11y.unique-field-id': {
          const field = check.fields?.[0] ?? 'fieldId'
          const value = nonEmptyString(node.props[field])
          const occurrences = value ? fieldOccurrences.get(value) ?? [] : []
          if (!value) {
            diagnostics.push(diagnostic(
              page,
              node,
              entry,
              check,
              blockingRules,
              `${check.summary} The ${field} value is empty.`,
            ))
          } else if (occurrences.length > 1) {
            diagnostics.push(diagnostic(
              page,
              node,
              entry,
              check,
              blockingRules,
              `${check.summary} "${value}" is also used by ${occurrences
                .filter((candidate) => candidate !== node.id)
                .join(', ')}.`,
            ))
          }
          break
        }

        case 'a11y.form-control-label':
          if (!hasVisibleFormLabel(page, node)) {
            diagnostics.push(diagnostic(
              page,
              node,
              entry,
              check,
              blockingRules,
              check.summary,
            ))
          }
          break

        case 'a11y.heading-order': {
          const level = headingLevel(node.props[check.fields?.[0] ?? 'tag'])
          if (
            level !== null &&
            previousHeadingLevel !== null &&
            level > previousHeadingLevel + 1
          ) {
            diagnostics.push(diagnostic(
              page,
              node,
              entry,
              check,
              blockingRules,
              `${check.summary} Heading level jumps from h${previousHeadingLevel} to h${level}.`,
            ))
          }
          if (level !== null) previousHeadingLevel = level
          break
        }
      }
    }
  }

  return diagnostics
}

export function analyseSiteComponentLibraryAccessibility(
  site: SiteDocument,
  registry: ComponentLibraryRegistry,
  policy: ComponentLibraryAccessibilityPolicy = EMPTY_POLICY,
): ComponentLibraryAccessibilityDiagnostic[] {
  return site.pages.flatMap((page) =>
    analyseComponentLibraryAccessibility(page, registry, policy),
  )
}

export function blockingComponentLibraryAccessibilityDiagnostics(
  diagnostics: readonly ComponentLibraryAccessibilityDiagnostic[],
): ComponentLibraryAccessibilityDiagnostic[] {
  return diagnostics.filter((candidate) => candidate.blocking)
}

export class ComponentLibraryAccessibilityPublishError extends Error {
  readonly diagnostics: readonly ComponentLibraryAccessibilityDiagnostic[]

  constructor(diagnostics: readonly ComponentLibraryAccessibilityDiagnostic[]) {
    super(
      `Accessibility policy blocked publication: ${diagnostics
        .map((item) => `${item.pageId}/${item.nodeId} ${item.rule}: ${item.message}`)
        .join('; ')}`,
    )
    this.name = 'ComponentLibraryAccessibilityPublishError'
    this.diagnostics = diagnostics
  }
}

export function assertComponentLibraryAccessibilityPublishable(
  site: SiteDocument,
  registry: ComponentLibraryRegistry,
  policy: ComponentLibraryAccessibilityPolicy = EMPTY_POLICY,
): ComponentLibraryAccessibilityDiagnostic[] {
  const diagnostics = analyseSiteComponentLibraryAccessibility(
    site,
    registry,
    policy,
  )
  const blockers = blockingComponentLibraryAccessibilityDiagnostics(diagnostics)
  if (blockers.length > 0) {
    throw new ComponentLibraryAccessibilityPublishError(blockers)
  }
  return diagnostics
}

function diagnostic(
  page: Page,
  node: PageNode,
  entry: ComponentLibraryEntry,
  check: ComponentLibraryAccessibilityCheck,
  blockingRules: ReadonlySet<string>,
  message: string,
): ComponentLibraryAccessibilityDiagnostic {
  return {
    pageId: page.id,
    nodeId: node.id,
    entryId: entry.id,
    rule: check.rule,
    category: check.category,
    severity: check.severity,
    blocking: blockingRules.has(check.rule),
    message,
    remediation: check.remediation,
  }
}

function entryForNode(
  node: PageNode,
  registry: ComponentLibraryRegistry,
): ComponentLibraryEntry | undefined {
  const metadata = node.catalogueInstance
  if (!metadata) return undefined
  return (
    registry.getVersion(metadata.entryId, metadata.entryVersion) ??
    registry.get(metadata.entryId)
  )
}

function nodeIdsInPageOrder(page: Page): string[] {
  const ordered: string[] = []
  const visited = new Set<string>()
  const visit = (nodeId: string): void => {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    const node = page.nodes[nodeId]
    if (!node) return
    ordered.push(nodeId)
    for (const childId of node.children) visit(childId)
  }
  visit(page.rootNodeId)
  for (const nodeId of Object.keys(page.nodes).sort()) visit(nodeId)
  return ordered
}

function collectFieldOccurrences(page: Page): Map<string, string[]> {
  const occurrences = new Map<string, string[]>()
  for (const node of Object.values(page.nodes)) {
    if (!FORM_CONTROL_MODULES.has(node.moduleId)) continue
    const value =
      nonEmptyString(node.props.fieldId) ??
      nonEmptyString(node.props.id)
    if (!value) continue
    const nodes = occurrences.get(value) ?? []
    nodes.push(node.id)
    occurrences.set(value, nodes)
  }
  return occurrences
}

function hasVisibleFormLabel(page: Page, control: PageNode): boolean {
  const controlTargets = new Set([
    control.id,
    nonEmptyString(control.props.id),
    nonEmptyString(control.props.fieldId),
  ].filter((value): value is string => Boolean(value)))

  for (const candidate of Object.values(page.nodes)) {
    if (candidate.moduleId !== 'base.label') continue
    if (!nonEmptyString(candidate.props.text)) continue
    if (
      candidate.props.targetMode === 'explicit' &&
      controlTargets.has(String(candidate.props.targetId ?? ''))
    ) {
      return true
    }
  }

  const parent = parentOf(page, control)
  if (!parent) return false
  const index = parent.children.indexOf(control.id)
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const sibling = page.nodes[parent.children[cursor] ?? '']
    if (!sibling) continue
    if (FORM_CONTROL_MODULES.has(sibling.moduleId)) return false
    if (
      sibling.moduleId === 'base.label' &&
      sibling.props.targetMode !== 'explicit' &&
      nonEmptyString(sibling.props.text)
    ) {
      return true
    }
  }
  return false
}

function parentOf(page: Page, node: PageNode): PageNode | undefined {
  if (node.parentId) return page.nodes[node.parentId]
  return Object.values(page.nodes).find((candidate) =>
    candidate.children.includes(node.id),
  )
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function headingLevel(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const match = value.match(/^h([1-6])$/)
  return match ? Number(match[1]) : null
}
