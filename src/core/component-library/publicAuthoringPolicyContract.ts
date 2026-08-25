import type { PublicAuthoringPolicy } from '@core/page-tree'
import { deepEqual } from '@core/utils/deepEqual'
import type { ComponentLibraryRegistry } from './registry'
import type {
  ComponentLibraryField,
  ComponentLibraryImplementation,
} from './schemas'
import {
  diagnostic,
  type PublicAuthoringDiagnostic,
} from './publicAuthoringTypes'

/** Validate that a persisted policy still agrees with its owner catalogue. */
export function analysePublicAuthoringPolicyContract(
  policy: PublicAuthoringPolicy,
  registry: ComponentLibraryRegistry,
): PublicAuthoringDiagnostic[] {
  const diagnostics: PublicAuthoringDiagnostic[] = []
  const entryIds = [...policy.allowedComponentEntryIds, ...policy.allowedPatternEntryIds]
  if (!deepEqual(
    Object.keys(policy.allowedVariants).sort(),
    [...entryIds].sort(),
  )) {
    diagnostics.push(diagnostic(
      'policy.variant-list-mismatch',
      'settings.publicAuthoring.allowedVariants',
      'The variant map does not exactly cover the allow-listed entries.',
      'Regenerate the variant map from the same integration authoring contract.',
    ))
  }
  if (!deepEqual(
    [...policy.patterns.map((pattern) => pattern.entryId)].sort(),
    [...policy.allowedPatternEntryIds].sort(),
  )) {
    diagnostics.push(diagnostic(
      'policy.pattern-list-mismatch',
      'settings.publicAuthoring.patterns',
      'The exact pattern contracts do not match the allow-listed pattern entry IDs.',
      'Regenerate both lists from the same integration authoring contract.',
    ))
  }
  const allowedComponents = new Set(policy.allowedComponentEntryIds)
  for (const template of policy.templates) {
    if (!ownedId(policy.ownerPluginId, template.pageId)) {
      diagnostics.push(diagnostic(
        'policy.template-not-owned',
        `settings.publicAuthoring.templates.${template.pageId}`,
        `Template "${template.pageId}" is outside the policy owner namespace.`,
        'Use a template owned and reconciled by the policy plugin.',
      ))
    }
    for (const entryId of template.requiredEntryIds) {
      if (!allowedComponents.has(entryId)) {
        diagnostics.push(diagnostic(
          'policy.template-entry-not-allowed',
          `settings.publicAuthoring.templates.${template.pageId}.requiredEntryIds`,
          `Template entry "${entryId}" is not an allow-listed component.`,
          'Add the component to the policy or remove it from the template contract.',
        ))
      }
    }
  }
  for (const componentId of policy.protectedVisualComponentIds) {
    if (!ownedId(policy.ownerPluginId, componentId)) {
      diagnostics.push(diagnostic(
        'policy.visual-component-not-owned',
        `settings.publicAuthoring.protectedVisualComponentIds.${componentId}`,
        `Protected Visual Component "${componentId}" is outside the policy owner namespace.`,
        'Protect only Visual Components reconciled by the policy plugin.',
      ))
    }
  }
  for (const [role, roleEntryIds] of [
    ['page-title', policy.content.pageTitleEntryIds],
    ['primary-action', policy.content.primaryActionEntryIds],
  ] as const) {
    for (const entryId of roleEntryIds) {
      if (!allowedComponents.has(entryId)) {
        diagnostics.push(diagnostic(
          'policy.content-role-entry-not-allowed',
          `settings.publicAuthoring.content.${role}`,
          `Content role "${role}" references non-allow-listed component "${entryId}".`,
          'Derive semantic content roles from the allow-listed component contract.',
        ))
      }
    }
  }
  for (const pattern of policy.patterns) {
    for (const childEntryId of pattern.childEntryIds) {
      if (!allowedComponents.has(childEntryId)) {
        diagnostics.push(diagnostic(
          'policy.pattern-child-not-allowed',
          `settings.publicAuthoring.patterns.${pattern.entryId}.childEntryIds`,
          `Pattern child "${childEntryId}" is not an allow-listed component.`,
          'Add the component to the policy or remove it from the exact pattern contract.',
        ))
      }
    }
  }
  for (const entryId of entryIds) {
    const entry = registry.get(entryId)
    if (!entry || entry.source.type !== 'plugin' || entry.source.pluginId !== policy.ownerPluginId) {
      diagnostics.push(diagnostic(
        'policy.entry-definition-missing',
        `settings.publicAuthoring.allowedEntries.${entryId}`,
        `Policy entry "${entryId}" is not registered by "${policy.ownerPluginId}".`,
        'Enable or re-sync the owning plugin before authoring or publishing.',
      ))
      continue
    }
    const implementation = backingImplementation(entry.implementation)
    const expectedPattern = policy.allowedPatternEntryIds.includes(entryId)
    if ((implementation.type === 'pattern') !== expectedPattern) {
      diagnostics.push(diagnostic(
        'policy.entry-kind-mismatch',
        `settings.publicAuthoring.allowedEntries.${entryId}`,
        `Entry "${entryId}" is classified in the wrong policy collection.`,
        'Regenerate the policy from the owning integration contract.',
      ))
    }
    const variants = new Set(entry.variants.map((variant) => variant.id))
    for (const variant of policy.allowedVariants[entryId] ?? []) {
      if (!variants.has(variant)) {
        diagnostics.push(diagnostic(
          'policy.variant-definition-missing',
          `settings.publicAuthoring.allowedVariants.${entryId}`,
          `Variant "${variant}" is not declared by "${entryId}".`,
          'Regenerate the policy from the current Component Library catalogue.',
        ))
      }
    }
  }
  for (const assetField of policy.assets.fields) {
    const entry = registry.get(assetField.entryId)
    const field = entry?.fields.find((candidate) => candidate.key === assetField.fieldKey)
    if (
      !allowedComponents.has(assetField.entryId) ||
      !entry ||
      !field ||
      !isAssetField(field)
    ) {
      diagnostics.push(diagnostic(
        'policy.asset-field-invalid',
        `settings.publicAuthoring.assets.fields.${assetField.entryId}.${assetField.fieldKey}`,
        'The asset rule does not point to an allow-listed image or media field.',
        'Regenerate the asset rule from the Component Library field definition.',
      ))
    }
    if (!policy.assets.roles.includes(assetField.role)) {
      diagnostics.push(diagnostic(
        'policy.asset-role-not-allowed',
        `settings.publicAuthoring.assets.fields.${assetField.entryId}.${assetField.fieldKey}.role`,
        `Asset role "${assetField.role}" is not allow-listed.`,
        'Choose one of the policy asset roles.',
      ))
    }
    if (!policy.assets.treatments.includes(assetField.treatment)) {
      diagnostics.push(diagnostic(
        'policy.asset-treatment-not-allowed',
        `settings.publicAuthoring.assets.fields.${assetField.entryId}.${assetField.fieldKey}.treatment`,
        `Asset treatment "${assetField.treatment}" is not allow-listed.`,
        'Choose one of the policy asset treatments.',
      ))
    }
  }
  for (const entryId of policy.allowedComponentEntryIds) {
    const entry = registry.get(entryId)
    for (const field of entry?.fields ?? []) {
      if (!isAssetField(field)) continue
      if (!policy.assets.fields.some(
        (candidate) => candidate.entryId === entryId && candidate.fieldKey === field.key,
      )) {
        diagnostics.push(diagnostic(
          'policy.asset-field-unmapped',
          `settings.publicAuthoring.assets.fields.${entryId}.${field.key}`,
          `Asset field "${entryId}.${field.key}" has no fixed role and treatment.`,
          'Add an allow-listed semantic role and component-owned treatment.',
        ))
      }
    }
  }
  return diagnostics
}

function isAssetField(field: ComponentLibraryField): boolean {
  return field.type === 'image' || field.type === 'media'
}

function backingImplementation(
  implementation: ComponentLibraryImplementation,
): Exclude<ComponentLibraryImplementation, { type: 'capability-backed' }> {
  return implementation.type === 'capability-backed'
    ? implementation.backing
    : implementation
}

function ownedId(pluginId: string, value: string): boolean {
  return value.startsWith(`${pluginId}.`) || value.startsWith(`${pluginId}/`)
}
