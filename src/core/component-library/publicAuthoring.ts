import type {
  Page,
  PageNode,
  PublicAuthoringPolicy,
  SiteDocument,
} from '@core/page-tree'
import { deepEqual } from '@core/utils/deepEqual'
import type { ComponentLibraryRegistry } from './registry'
import type {
  ComponentLibraryEntry,
  ComponentLibraryField,
  ComponentLibraryImplementation,
} from './schemas'
import { analysePublicAuthoringPolicyContract } from './publicAuthoringPolicyContract'
import {
  diagnostic,
  type PublicAuthoringDiagnostic,
} from './publicAuthoringTypes'

export type { PublicAuthoringDiagnostic } from './publicAuthoringTypes'

export class PublicAuthoringPolicyError extends Error {
  readonly diagnostics: readonly PublicAuthoringDiagnostic[]

  constructor(diagnostics: readonly PublicAuthoringDiagnostic[]) {
    super(
      `Public authoring policy blocked the change: ${diagnostics
        .map((item) => `${item.path} ${item.code}: ${item.message}`)
        .join('; ')}`,
    )
    this.name = 'PublicAuthoringPolicyError'
    this.diagnostics = diagnostics
  }
}

/**
 * Validate the complete public-output surface selected by a site-owned policy.
 * Sites without a policy deliberately retain Instatic's normal freeform model.
 */
export function analysePublicAuthoringPolicy(
  site: SiteDocument,
  registry: ComponentLibraryRegistry,
): PublicAuthoringDiagnostic[] {
  const policy = site.settings.publicAuthoring
  if (!policy) return []

  const diagnostics = analysePublicAuthoringPolicyContract(policy, registry)
  if (site.settings.framework) {
    diagnostics.push(diagnostic(
      'appearance.framework-not-allowed',
      'settings.framework',
      'The governed public surface cannot use site-local framework values.',
      'Remove the local framework settings and use the owner design-system package.',
    ))
  }
  if (site.settings.fonts) {
    diagnostics.push(diagnostic(
      'appearance.fonts-not-allowed',
      'settings.fonts',
      'The governed public surface cannot install site-local fonts.',
      'Remove the local font library and use typography supplied by the owner design system.',
    ))
  }
  for (const styleRuleId of Object.keys(site.styleRules)) {
    if (!ownedId(policy.ownerPluginId, styleRuleId)) {
      diagnostics.push(diagnostic(
        'appearance.style-rule-not-owned',
        `styleRules.${styleRuleId}`,
        `Style rule "${styleRuleId}" is outside the policy owner namespace.`,
        'Remove the site-local rule; governed component appearance comes from the design system.',
      ))
    }
  }
  for (const componentId of policy.protectedVisualComponentIds) {
    if (!site.visualComponents.some((component) => component.id === componentId)) {
      diagnostics.push(diagnostic(
        'visual-component.missing',
        `visualComponents.${componentId}`,
        `Protected Visual Component "${componentId}" is missing.`,
        'Re-sync the owning plugin pack before publishing.',
      ))
    }
  }

  for (const page of site.pages) {
    diagnostics.push(...analysePublicAuthoringPage(page, policy, registry))
  }
  for (const template of policy.templates) {
    if (!site.pages.some((page) => page.id === template.pageId)) {
      diagnostics.push(diagnostic(
        'template.missing',
        `pages.${template.pageId}`,
        `Required template "${template.pageId}" is missing.`,
        'Re-sync the owning plugin pack to restore template-controlled chrome.',
      ))
    }
  }
  return diagnostics
}

export function assertPublicAuthoringPolicyPublishable(
  site: SiteDocument,
  registry: ComponentLibraryRegistry,
): PublicAuthoringDiagnostic[] {
  const diagnostics = analysePublicAuthoringPolicy(site, registry)
  if (diagnostics.length > 0) throw new PublicAuthoringPolicyError(diagnostics)
  return diagnostics
}

/** Validate one page for the HTTP and collaborative write boundaries. */
export function analysePublicAuthoringPage(
  page: Page,
  policy: PublicAuthoringPolicy,
  registry: ComponentLibraryRegistry,
): PublicAuthoringDiagnostic[] {
  const diagnostics: PublicAuthoringDiagnostic[] = []
  const pagePath = `pages.${page.id}`
  const allowedComponents = new Set(policy.allowedComponentEntryIds)
  const allowedPatterns = new Set(policy.allowedPatternEntryIds)
  const allowedEntries = new Set([...allowedComponents, ...allowedPatterns])
  const allowedStructuralModules = new Set(policy.allowedStructuralModuleIds)
  const protectedTemplate = policy.templates.find((candidate) => candidate.pageId === page.id)
  const patternRoots = Object.values(page.nodes).filter((node) =>
    Boolean(node.catalogueInstance && allowedPatterns.has(node.catalogueInstance.entryId)),
  )
  const managedPatternNodeIds = new Set<string>()
  for (const root of patternRoots) {
    managedPatternNodeIds.add(root.id)
    for (const nodeId of root.catalogueInstance?.pattern?.authorableNodeIds ?? []) {
      managedPatternNodeIds.add(nodeId)
    }
  }

  if (protectedTemplate) {
    if (!page.template) {
      diagnostics.push(diagnostic(
        'template.not-template',
        `${pagePath}.template`,
        'The policy-controlled chrome document is no longer a template.',
        'Restore its template target from the owning plugin pack.',
      ))
    }
    for (const entryId of protectedTemplate.requiredEntryIds) {
      const count = Object.values(page.nodes).filter(
        (node) => node.catalogueInstance?.entryId === entryId,
      ).length
      if (count !== 1) {
        diagnostics.push(diagnostic(
          'template.chrome-count',
          `${pagePath}.nodes`,
          `Template-controlled entry "${entryId}" occurs ${count} times; exactly one is required.`,
          'Restore the shared template from the owning plugin pack.',
        ))
      }
    }
  } else if (patternRoots.length !== 1) {
    diagnostics.push(diagnostic(
      'composition.pattern-count',
      `${pagePath}.nodes`,
      `The governed document contains ${patternRoots.length} approved pattern roots; exactly one is required.`,
      'Replace the document body with one approved public-authoring pattern.',
    ))
  }

  const entryForNode = (node: PageNode): ComponentLibraryEntry | undefined =>
    resolvePolicyEntry(node, policy, registry)

  for (const node of Object.values(page.nodes)) {
    const nodePath = `${pagePath}.nodes.${node.id}`
    const metadata = node.catalogueInstance
    const managedPatternNode = managedPatternNodeIds.has(node.id)

    if (hasAuthoredAppearance(node)) {
      diagnostics.push(diagnostic(
        'appearance.component-owned',
        nodePath,
        'Classes, inline styles and breakpoint overrides are not authorable on this public surface.',
        'Remove the node-local appearance values and choose an approved component variant.',
      ))
    }

    if (!metadata) {
      if (!managedPatternNode && !allowedStructuralModules.has(node.moduleId)) {
        diagnostics.push(diagnostic(
          'composition.structural-module-not-allowed',
          `${nodePath}.moduleId`,
          `Ungoverned module "${node.moduleId}" is not approved public scaffolding.`,
          'Use an allow-listed Component Library entry or pattern.',
        ))
      } else if (
        !protectedTemplate &&
        patternRoots.length === 1 &&
        node.id !== page.rootNodeId &&
        !managedPatternNode
      ) {
        diagnostics.push(diagnostic(
          'composition.outside-pattern',
          nodePath,
          'A public page node sits outside its single governed pattern boundary.',
          'Move the content into an approved pattern field or replace the page pattern.',
        ))
      }
      continue
    }

    if (!allowedEntries.has(metadata.entryId)) {
      diagnostics.push(diagnostic(
        'entry.not-allowed',
        `${nodePath}.catalogueInstance.entryId`,
        `Component Library entry "${metadata.entryId}" is not allow-listed by policy.`,
        'Replace it with an approved Creator Signal component or pattern.',
      ))
      continue
    }
    const entry = entryForNode(node)
    if (!entry) {
      diagnostics.push(diagnostic(
        'entry.definition-invalid',
        `${nodePath}.catalogueInstance`,
        `Entry "${metadata.entryId}@${metadata.entryVersion}" is missing, stale or does not match the backing module.`,
        'Reinsert the current Component Library entry or re-sync the owning plugin.',
      ))
      continue
    }
    if (!allowedVariant(policy, entry.id, metadata.variantId)) {
      diagnostics.push(diagnostic(
        'entry.variant-not-allowed',
        `${nodePath}.catalogueInstance.variantId`,
        `Variant "${metadata.variantId ?? '<none>'}" is not approved for "${entry.id}".`,
        `Choose one of: ${(policy.allowedVariants[entry.id] ?? []).join(', ')}.`,
      ))
    }
    if (metadata.pinnedVersion || metadata.presetId) {
      diagnostics.push(diagnostic(
        'entry.option-not-allowed',
        `${nodePath}.catalogueInstance`,
        'Pinned versions and ad hoc presets are not part of the public authoring contract.',
        'Use the current entry version and an approved variant.',
      ))
    }

    const implementation = backingImplementation(entry.implementation)
    const documentKind = page.template ? 'template' : 'page'
    if (
      entry.constraints.allowedDocumentKinds &&
      !entry.constraints.allowedDocumentKinds.includes(documentKind)
    ) {
      diagnostics.push(diagnostic(
        'composition.document-kind-not-allowed',
        nodePath,
        `Entry "${entry.id}" cannot be used in a ${documentKind}.`,
        `Move it to an allowed ${entry.constraints.allowedDocumentKinds.join(' or ')} document.`,
      ))
    }
    if (implementation.type === 'pattern') {
      diagnostics.push(...validatePolicyPatternBoundary(page, node, policy))
      continue
    }
    if (!managedPatternNode && !protectedTemplate) {
      diagnostics.push(diagnostic(
        'composition.component-outside-pattern',
        nodePath,
        `Component "${entry.id}" is outside the document pattern.`,
        'Insert the component through an approved pattern slot.',
      ))
    }
    diagnostics.push(...validateComponentNode(page, node, entry, policy))
  }

  const titleCount = Object.values(page.nodes).filter((node) =>
    policy.content.pageTitleEntryIds.includes(node.catalogueInstance?.entryId ?? ''),
  ).length
  if (!protectedTemplate && titleCount !== policy.content.pageTitleCount) {
    diagnostics.push(diagnostic(
      'content.page-title-count',
      `${pagePath}.nodes`,
      `The document has ${titleCount} page-title components; ${policy.content.pageTitleCount} is required.`,
      'Use one approved Hero, Recovery State or Public Document page title.',
    ))
  }
  const primaryActionCount = Object.values(page.nodes).filter((node) =>
    policy.content.primaryActionEntryIds.includes(node.catalogueInstance?.entryId ?? ''),
  ).length
  if (!protectedTemplate && primaryActionCount > policy.content.primaryActionMaxCount) {
    diagnostics.push(diagnostic(
      'content.primary-action-count',
      `${pagePath}.nodes`,
      `The document has ${primaryActionCount} primary-action components; at most ${policy.content.primaryActionMaxCount} is allowed.`,
      'Keep one primary journey and use secondary component roles for later actions.',
    ))
  }
  for (const entryId of allowedEntries) {
    const max = registry.get(entryId)?.constraints.maxInstancesPerDocument
    if (!max) continue
    const count = Object.values(page.nodes).filter(
      (node) => node.catalogueInstance?.entryId === entryId,
    ).length
    if (count > max) {
      diagnostics.push(diagnostic(
        'composition.instance-count',
        `${pagePath}.nodes`,
        `Entry "${entryId}" occurs ${count} times; at most ${max} is allowed.`,
        'Remove duplicate instances or choose a pattern with the required composition.',
      ))
    }
  }
  return diagnostics
}

export function assertPublicAuthoringPage(
  page: Page,
  policy: PublicAuthoringPolicy,
  registry: ComponentLibraryRegistry,
): void {
  const diagnostics = analysePublicAuthoringPage(page, policy, registry)
  if (diagnostics.length > 0) throw new PublicAuthoringPolicyError(diagnostics)
}

function validateComponentNode(
  page: Page,
  node: PageNode,
  entry: ComponentLibraryEntry,
  policy: PublicAuthoringPolicy,
): PublicAuthoringDiagnostic[] {
  const diagnostics: PublicAuthoringDiagnostic[] = []
  const nodePath = `pages.${page.id}.nodes.${node.id}`
  const implementation = backingImplementation(entry.implementation)
  const values = implementation.type === 'visual-component'
    ? safeRecord(node.props.propOverrides)
    : node.props
  const allowedKeys = new Set(entry.fields.map((field) => field.key))

  if (entry.composition === 'leaf' && node.children.length > 0) {
    diagnostics.push(diagnostic(
      'composition.leaf-has-children',
      `${nodePath}.children`,
      `Leaf component "${entry.id}" contains child nodes.`,
      'Move nested content into its typed fields or use an approved container pattern.',
    ))
  }
  for (const key of Object.keys(values)) {
    if (!allowedKeys.has(key)) {
      diagnostics.push(diagnostic(
        'field.not-allowed',
        `${nodePath}.props.${key}`,
        `Property "${key}" is not an authorable field of "${entry.id}".`,
        'Remove the property and use a declared typed field.',
      ))
    }
  }
  for (const field of entry.fields) {
    diagnostics.push(...validateFieldValue(
      field,
      values[field.key],
      `${nodePath}.props.${field.key}`,
      policy,
    ))
  }
  for (const [key, value] of Object.entries(values)) {
    const field = entry.fields.find((candidate) => candidate.key === key)
    if (field?.type !== 'rich-text' || typeof value !== 'string') continue
    const fieldPath = `${nodePath}.props.${key}`
    diagnostics.push(...validateRichTextMarkup(value, fieldPath))
    for (const match of value.matchAll(/<h([1-6])\b/gi)) {
      const level = `h${match[1]}`
      if (
        level === 'h1' ||
        !policy.content.headingLevels.some((allowedLevel) => allowedLevel === level)
      ) {
        diagnostics.push(diagnostic(
          'content.heading-level-not-allowed',
          fieldPath,
          `Rich text contains an unsupported ${level} heading.`,
          `Keep the component-owned page title and use ${policy.content.headingLevels.filter((item) => item !== 'h1').join(' or ')} inside rich text.`,
        ))
      }
    }
  }
  return diagnostics
}

function validateRichTextMarkup(
  value: string,
  path: string,
): PublicAuthoringDiagnostic[] {
  const diagnostics: PublicAuthoringDiagnostic[] = []
  const tags = Array.from(value.matchAll(/<[a-z][^>]*>/gi), (match) => match[0])
  if (tags.some((tag) => /\s(?:class|style)\s*=/i.test(tag))) {
    diagnostics.push(diagnostic(
      'appearance.rich-text-style-not-allowed',
      path,
      'Rich text contains an authored class or inline style.',
      'Remove presentational attributes; public prose inherits component-owned design tokens.',
    ))
  }
  if (tags.some((tag) => /^<(?:font|style)\b/i.test(tag))) {
    diagnostics.push(diagnostic(
      'appearance.rich-text-element-not-allowed',
      path,
      'Rich text contains a presentational HTML element.',
      'Use semantic prose markup and let the approved component own typography and colour.',
    ))
  }
  if (tags.some((tag) =>
    /^<button\b/i.test(tag) ||
    (/^<a\b/i.test(tag) && /\srole\s*=\s*(?:"button"|'button'|button)(?=\s|>)/i.test(tag)),
  )) {
    diagnostics.push(diagnostic(
      'content.raw-button-not-allowed',
      path,
      'Rich text contains a raw button role outside the approved action components.',
      'Use an allow-listed Hero, Recovery State or Call to Action component.',
    ))
  }
  return diagnostics
}

function validatePolicyPatternBoundary(
  page: Page,
  root: PageNode,
  policy: PublicAuthoringPolicy,
): PublicAuthoringDiagnostic[] {
  const path = `pages.${page.id}.nodes.${root.id}`
  const entryId = root.catalogueInstance?.entryId ?? ''
  const pattern = policy.patterns.find((candidate) => candidate.entryId === entryId)
  if (!pattern) {
    return [diagnostic(
      'composition.pattern-invalid',
      path,
      `Pattern "${entryId}" has no exact policy composition.`,
      'Replace the pattern from the current owning plugin pack.',
    )]
  }
  const authorableNodeIds = root.catalogueInstance?.pattern?.authorableNodeIds ?? []
  const childEntryIds = authorableNodeIds.map(
    (nodeId) => page.nodes[nodeId]?.catalogueInstance?.entryId ?? '<missing>',
  )
  if (
    root.moduleId !== pattern.rootModuleId ||
    !deepEqual(root.props, pattern.rootProps) ||
    !deepEqual(root.children, authorableNodeIds) ||
    !deepEqual(childEntryIds, pattern.childEntryIds)
  ) {
    return [diagnostic(
      'composition.pattern-invalid',
      path,
      `Pattern "${entryId}" no longer matches its policy-owned root and child sequence.`,
      'Replace the damaged pattern with a fresh Component Library instance.',
    )]
  }
  return []
}

function validateFieldValue(
  field: ComponentLibraryField,
  value: unknown,
  path: string,
  policy: PublicAuthoringPolicy,
): PublicAuthoringDiagnostic[] {
  const diagnostics: PublicAuthoringDiagnostic[] = []
  if (field.required && (value === undefined || value === null || value === '')) {
    diagnostics.push(diagnostic(
      'field.required',
      path,
      `Required field "${field.label}" is empty.`,
      'Provide a value through the Component Library field editor.',
    ))
    return diagnostics
  }
  if (value === undefined || value === null || value === '') return diagnostics

  if (field.type === 'repeater') {
    if (!Array.isArray(value)) {
      return [diagnostic(
        'field.invalid-repeater',
        path,
        `Field "${field.label}" must be an ordered list.`,
        'Use the component repeater editor instead of a custom value.',
      )]
    }
    if (value.length < field.minItems || (field.maxItems !== undefined && value.length > field.maxItems)) {
      diagnostics.push(diagnostic(
        'field.repeater-count',
        path,
        `Field "${field.label}" has ${value.length} items; allowed range is ${field.minItems} to ${field.maxItems ?? 'unbounded'}.`,
        'Add or remove items within the declared component limit.',
      ))
    }
    const itemKeys = new Set(field.itemFields.map((itemField) => itemField.key))
    for (const [index, item] of value.entries()) {
      const record = safeRecord(item)
      for (const key of Object.keys(record)) {
        if (!itemKeys.has(key)) {
          diagnostics.push(diagnostic(
            'field.repeater-property-not-allowed',
            `${path}.${index}.${key}`,
            `Repeater property "${key}" is not declared by "${field.label}".`,
            'Remove the property and use a declared repeater field.',
          ))
        }
      }
      for (const itemField of field.itemFields) {
        const itemValue = record[itemField.key]
        if (itemField.required && (itemValue === undefined || itemValue === null || itemValue === '')) {
          diagnostics.push(diagnostic(
            'field.required',
            `${path}.${index}.${itemField.key}`,
            `Required repeater field "${itemField.label}" is empty.`,
            'Provide a value through the component repeater editor.',
          ))
        }
      }
    }
    return diagnostics
  }

  const expected = field.type === 'number'
    ? 'number'
    : field.type === 'boolean'
      ? 'boolean'
      : 'string'
  if (typeof value !== expected) {
    diagnostics.push(diagnostic(
      'field.invalid-type',
      path,
      `Field "${field.label}" must be a ${expected}.`,
      'Use the typed Component Library field control.',
    ))
  }
  if (field.type === 'color' || field.type === 'design-token') {
    diagnostics.push(diagnostic(
      'appearance.raw-style-field',
      path,
      `Field "${field.label}" exposes an authorable appearance value.`,
      'Remove the field from the public component; appearance is component-owned.',
    ))
  }
  void policy
  return diagnostics
}

function resolvePolicyEntry(
  node: PageNode,
  policy: PublicAuthoringPolicy,
  registry: ComponentLibraryRegistry,
): ComponentLibraryEntry | undefined {
  const metadata = node.catalogueInstance
  if (!metadata) return undefined
  const entry = registry.getVersion(metadata.entryId, metadata.entryVersion)
  if (!entry || entry.source.type !== 'plugin' || entry.source.pluginId !== policy.ownerPluginId) {
    return undefined
  }
  const implementation = backingImplementation(entry.implementation)
  if (implementation.type === 'primitive' && implementation.moduleId !== node.moduleId) return undefined
  if (
    implementation.type === 'visual-component' &&
    (node.moduleId !== 'base.visual-component-ref' || node.props.componentId !== implementation.componentId)
  ) return undefined
  if (implementation.type === 'pattern' && !node.catalogueInstance?.pattern) return undefined
  return entry
}

function allowedVariant(
  policy: PublicAuthoringPolicy,
  entryId: string,
  variantId: string | undefined,
): boolean {
  return Boolean(variantId && policy.allowedVariants[entryId]?.includes(variantId))
}

function hasAuthoredAppearance(node: PageNode): boolean {
  return (
    node.classIds.length > 0 ||
    Object.keys(node.breakpointOverrides).length > 0 ||
    Boolean(node.inlineStyles && Object.keys(node.inlineStyles).length > 0)
  )
}

function backingImplementation(
  implementation: ComponentLibraryImplementation,
): Exclude<ComponentLibraryImplementation, { type: 'capability-backed' }> {
  return implementation.type === 'capability-backed'
    ? implementation.backing
    : implementation
}

function safeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function ownedId(pluginId: string, value: string): boolean {
  return value.startsWith(`${pluginId}.`) || value.startsWith(`${pluginId}/`)
}

/** Narrow helper used by write guards for protected Visual Component rows. */
export function isProtectedPublicAuthoringVisualComponent(
  policy: PublicAuthoringPolicy | undefined,
  componentId: string,
): boolean {
  return policy?.protectedVisualComponentIds.includes(componentId) ?? false
}
