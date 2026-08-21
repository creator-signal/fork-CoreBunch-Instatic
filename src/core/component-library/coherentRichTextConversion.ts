import type { CatalogueInstanceMetadata, NodeTree, PageNode } from '@core/page-tree'
import { escapeHtml } from '@core/html-sanitize'
import { sanitizeRenderableHtmlAttribute } from '@core/htmlAttributes'
import { sanitizeRichtext } from '@core/sanitize'
import type { ComponentLibraryEntry, ComponentLibraryImplementation } from './schemas'

export interface CoherentRichTextConversionCandidate {
  entry: ComponentLibraryEntry
  metadata: CatalogueInstanceMetadata
  parentId: string
  sourceNodeIds: string[]
  sourceIndex: number
  props: {
    heading: string
    body: string
    sectionId: string
    headingLanguage: string
  }
}

export type CoherentRichTextConversionAnalysis =
  | { eligible: true; candidate: CoherentRichTextConversionCandidate }
  | { eligible: false; reason: string }

/**
 * Converts only a deliberately small, source-authored subset of adjacent
 * freeform Typography nodes. The conversion serialises persisted props, never
 * a rendered DOM snapshot, so it cannot capture publisher-only markup.
 */
export function analyseCoherentRichTextConversion(
  tree: NodeTree<PageNode>,
  startNodeId: string,
  entry: ComponentLibraryEntry | undefined,
): CoherentRichTextConversionAnalysis {
  if (!entry || backingModuleId(entry.implementation) !== 'creator-signal.site.rich-text-section') {
    return ineligible('The governed Rich Text Section definition is not installed.')
  }
  const start = tree.nodes[startNodeId]
  if (!start) return ineligible('The selected source block no longer exists.')
  if (!isEligibleNode(start)) return ineligible(nodeIneligibilityReason(start))
  if (start.moduleId !== 'base.text' || start.props.tag !== 'h2') {
    return ineligible('Select an ungoverned H2 followed by the prose it introduces.')
  }
  const parentId = start.parentId
  if (!parentId) return ineligible('The selected heading has no editable parent.')
  const parent = parentId ? tree.nodes[parentId] : undefined
  if (!parent) return ineligible('The selected heading has no editable parent.')
  const sourceIndex = parent.children.indexOf(startNodeId)
  if (sourceIndex < 0) return ineligible('The selected heading is not a direct child of its parent.')

  const headingAttributes = safeAttributes(start.props.htmlAttributes)
  const unsupportedHeadingAttribute = Object.keys(headingAttributes)
    .find((name) => name !== 'id' && name !== 'lang')
  if (unsupportedHeadingAttribute) {
    return ineligible(`The heading attribute "${unsupportedHeadingAttribute}" cannot be represented by Rich Text Section.`)
  }
  const sectionId = headingAttributes.id
  if (!sectionId) {
    return ineligible('The heading needs an id so the converted section can preserve its link target.')
  }
  const heading = typeof start.props.text === 'string' ? start.props.text : ''
  if (!heading.trim()) return ineligible('The heading is empty.')

  const sourceNodeIds = [start.id]
  const fragments: string[] = []
  for (const siblingId of parent.children.slice(sourceIndex + 1)) {
    const sibling = tree.nodes[siblingId]
    if (!sibling || !isEligibleNode(sibling)) break
    const fragment = sourceFragment(sibling)
    if (!fragment.ok) break
    sourceNodeIds.push(sibling.id)
    fragments.push(fragment.html)
  }
  if (fragments.length === 0) {
    return ineligible('Add one or more adjacent paragraphs, lists, quotations, or inline text blocks before converting.')
  }

  return {
    eligible: true,
    candidate: {
      entry,
      metadata: { entryId: entry.id, entryVersion: entry.version },
      parentId,
      sourceNodeIds,
      sourceIndex,
      props: {
        heading,
        body: fragments.join(''),
        sectionId,
        headingLanguage: headingAttributes.lang ?? '',
      },
    },
  }
}

/** Apply a previously analysed candidate only while its sibling range is intact. */
export function applyCoherentRichTextConversion(
  tree: NodeTree<PageNode>,
  candidate: CoherentRichTextConversionCandidate,
  replacement: PageNode,
): boolean {
  const parent = tree.nodes[candidate.parentId]
  if (!parent || tree.nodes[replacement.id]) return false
  const actual = parent.children.slice(
    candidate.sourceIndex,
    candidate.sourceIndex + candidate.sourceNodeIds.length,
  )
  if (actual.length !== candidate.sourceNodeIds.length || actual.some((id, index) => id !== candidate.sourceNodeIds[index])) {
    return false
  }
  if (candidate.sourceNodeIds.some((id) => !tree.nodes[id])) return false

  replacement.parentId = parent.id
  parent.children.splice(candidate.sourceIndex, candidate.sourceNodeIds.length, replacement.id)
  for (const sourceNodeId of candidate.sourceNodeIds) delete tree.nodes[sourceNodeId]
  tree.nodes[replacement.id] = replacement
  return true
}

function sourceFragment(node: PageNode): { ok: true; html: string } | { ok: false } {
  if (node.moduleId === 'base.text') {
    const tag = node.props.tag
    if (!isBodyTextTag(tag)) return { ok: false }
    const text = typeof node.props.text === 'string' ? node.props.text : ''
    const rendered = escapeHtml(text).replaceAll('\n', '<br>')
    if (tag === 'none') return { ok: true, html: rendered }
    return { ok: true, html: `<${tag}${attributesHtml(node.props.htmlAttributes)}>${rendered}</${tag}>` }
  }
  if (node.moduleId === 'base.rich-text' && node.props.tag === 'div' && typeof node.props.html === 'string') {
    const sanitized = sanitizeRichtext(node.props.html)
    return sanitized === node.props.html
      ? { ok: true, html: `<div>${sanitized}</div>` }
      : { ok: false }
  }
  return { ok: false }
}

function isEligibleNode(node: PageNode): boolean {
  return !node.catalogueInstance &&
    node.children.length === 0 &&
    node.classIds.length === 0 &&
    Object.keys(node.inlineStyles ?? {}).length === 0 &&
    Object.keys(node.breakpointOverrides).length === 0 &&
    Object.keys(node.dynamicBindings ?? {}).length === 0 &&
    (node.moduleId === 'base.text' || node.moduleId === 'base.rich-text')
}

function nodeIneligibilityReason(node: PageNode): string {
  if (node.catalogueInstance) return 'Governed components are never converted again.'
  if (node.children.length > 0) return 'Structural containers and nodes with children are not eligible.'
  if (node.classIds.length > 0 || Object.keys(node.inlineStyles ?? {}).length > 0 || Object.keys(node.breakpointOverrides).length > 0) {
    return 'Styled source blocks remain unchanged because Rich Text Section owns presentation.'
  }
  if (Object.keys(node.dynamicBindings ?? {}).length > 0) return 'Bound content remains unchanged because conversion must preserve its authored source.'
  return 'Only adjacent freeform Text or Rich Text blocks can be consolidated.'
}

function isBodyTextTag(value: unknown): value is 'p' | 'none' | 'h3' | 'h4' | 'h5' | 'h6' | 'div' | 'span' | 'small' | 'strong' | 'em' {
  return value === 'p' || value === 'none' || value === 'h3' || value === 'h4' || value === 'h5' || value === 'h6' || value === 'div' || value === 'span' || value === 'small' || value === 'strong' || value === 'em'
}

function safeAttributes(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const attrs: Record<string, string> = {}
  for (const [rawName, rawValue] of Object.entries(value as Record<string, unknown>)) {
    if (typeof rawValue !== 'string') continue
    const name = rawName.trim().toLowerCase()
    const safeValue = sanitizeRenderableHtmlAttribute(name, rawValue)
    if (safeValue !== null) attrs[name] = safeValue
  }
  return attrs
}

function attributesHtml(value: unknown): string {
  return Object.entries(safeAttributes(value))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, attributeValue]) => ` ${name}="${escapeHtml(attributeValue)}"`)
    .join('')
}

function backingModuleId(implementation: ComponentLibraryImplementation): string | undefined {
  const backing = implementation.type === 'capability-backed' ? implementation.backing : implementation
  return backing.type === 'primitive' ? backing.moduleId : undefined
}

function ineligible(reason: string): CoherentRichTextConversionAnalysis {
  return { eligible: false, reason }
}
