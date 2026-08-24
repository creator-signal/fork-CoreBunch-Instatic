import type {
  ComponentLibraryAccessibilityCategory,
  ComponentLibraryAccessibilityCheck,
  ComponentLibraryAccessibilityRule,
  ComponentLibraryEntry,
  ComponentLibraryField,
} from '@core/component-library'
import { creatorSignalCatalogueEntryId } from '@core/page-tree'
import { componentLibraryFormSpecimenReference } from './componentLibraryFormSpecimenReference'

function creatorSignalCatalogueSource(): ComponentLibraryEntry['source'] {
  return {
    type: 'design-system',
    id: 'creator-signal.site',
    name: 'Creator Signal',
  }
}

interface PrimitiveEntryOptions {
  id: string
  name: string
  description: string
  category: string
  icon: string
  moduleId: string
  tags: string[]
  fields?: ComponentLibraryField[]
  variants?: ComponentLibraryEntry['variants']
  preset?: {
    id: string
    name: string
    values: Record<string, unknown>
  }
  allowedParentEntryIds?: string[]
  allowedChildEntryIds?: string[]
  requirements?: {
    capabilities: string[]
    providerAdapters: string[]
    plugins: string[]
  }
  accessibilityChecks?: ComponentLibraryAccessibilityCheck[]
  usage: string
  accessibility: string
  version?: string
  /** Required for unconstrained primitives that own authored child components. */
  container?: true
}

interface VisualComponentEntryOptions {
  id: string
  name: string
  description: string
  category: string
  icon: string
  componentId: string
  tags: string[]
  fields?: ComponentLibraryField[]
  variants?: ComponentLibraryEntry['variants']
  slots?: ComponentLibraryEntry['slots']
  allowedParentEntryIds?: string[]
  allowedChildEntryIds?: string[]
  accessibilityChecks?: ComponentLibraryAccessibilityCheck[]
  usage: string
  accessibility: string
  version?: string
  /** Required for the small set of composition components that expose slots. */
  container?: true
}

interface PatternEntryOptions {
  id: string
  name: string
  description: string
  category: string
  icon: string
  patternId: string
  tags: string[]
  fields?: ComponentLibraryField[]
  allowedParentEntryIds?: string[]
  allowedChildEntryIds?: string[]
  accessibilityChecks?: ComponentLibraryAccessibilityCheck[]
  variants?: ComponentLibraryEntry['variants']
  requirements?: {
    capabilities: string[]
    providerAdapters: string[]
    plugins: string[]
  }
  usage: string
  accessibility: string
  version?: string
  /** Required for unconstrained patterns that own authored child components. */
  container?: true
}

interface TemplateComponentEntryOptions {
  id: string
  name: string
  description: string
  category: string
  icon: string
  role: string
  tags: string[]
  fields?: ComponentLibraryField[]
  accessibilityChecks?: ComponentLibraryAccessibilityCheck[]
  usage: string
  accessibility: string
  version?: string
}

function catalogueEntryIds(ids: readonly string[] | undefined): string[] | undefined {
  return ids?.map(creatorSignalCatalogueEntryId)
}

function catalogueSlots(
  slots: ComponentLibraryEntry['slots'] | undefined,
): ComponentLibraryEntry['slots'] {
  return (slots ?? []).map((slot) => ({
    ...slot,
    ...(slot.allowedEntryIds
      ? { allowedEntryIds: slot.allowedEntryIds.map(creatorSignalCatalogueEntryId) }
      : {}),
  }))
}

function renderedPreview(
  category: string,
  entryId: string,
): Pick<ComponentLibraryEntry, 'preview'> | Record<string, never> {
  return category === 'Forms'
    ? {
        preview: {
          type: 'wireframe',
          reference: componentLibraryFormSpecimenReference(entryId),
        },
      }
    : {}
}

export function primitiveEntry(
  options: PrimitiveEntryOptions,
): ComponentLibraryEntry {
  const entryId = creatorSignalCatalogueEntryId(options.id)
  return {
    id: entryId,
    version: options.version ?? '1.0.0',
    name: options.name,
    description: options.description,
    category: options.category,
    tags: options.tags,
    icon: options.icon,
    source: creatorSignalCatalogueSource(),
    status: 'stable',
    composition: options.container || (options.allowedChildEntryIds?.length ?? 0) > 0
      ? 'container'
      : 'leaf',
    implementation: options.requirements
      ? {
          type: 'capability-backed',
          backing: {
            type: 'primitive',
            moduleId: options.moduleId,
            ...(options.preset ? { presetId: options.preset.id } : {}),
          },
        }
      : {
          type: 'primitive',
          moduleId: options.moduleId,
          ...(options.preset ? { presetId: options.preset.id } : {}),
        },
    fields: options.fields ?? [],
    variants: options.variants ?? [],
    presets: options.preset
      ? [{
          id: options.preset.id,
          name: options.preset.name,
          values: options.preset.values,
        }]
      : [],
    slots: [],
    constraints: {
      ...(options.allowedParentEntryIds
        ? { allowedParentEntryIds: catalogueEntryIds(options.allowedParentEntryIds) }
        : {}),
      ...(options.allowedChildEntryIds
        ? { allowedChildEntryIds: catalogueEntryIds(options.allowedChildEntryIds) }
        : {}),
    },
    requirements: options.requirements ?? {
      capabilities: [],
      providerAdapters: [],
      plugins: [],
    },
    documentation: {
      usage: options.usage,
      accessibility: options.accessibility,
    },
    accessibility: {
      checks: options.accessibilityChecks ?? [],
    },
    ...renderedPreview(options.category, entryId),
  }
}

export function templateComponentEntry(
  options: TemplateComponentEntryOptions,
): ComponentLibraryEntry {
  const entryId = creatorSignalCatalogueEntryId(options.id)
  return {
    id: entryId,
    version: options.version ?? '1.0.0',
    name: options.name,
    description: options.description,
    category: options.category,
    tags: options.tags,
    icon: options.icon,
    source: creatorSignalCatalogueSource(),
    status: 'stable',
    composition: 'leaf',
    implementation: {
      type: 'template-component',
      role: options.role,
    },
    fields: options.fields ?? [],
    variants: [],
    presets: [],
    slots: [],
    constraints: {},
    requirements: {
      capabilities: [],
      providerAdapters: [],
      plugins: [],
    },
    documentation: {
      usage: options.usage,
      accessibility: options.accessibility,
    },
    accessibility: {
      checks: options.accessibilityChecks ?? [],
    },
    ...renderedPreview(options.category, entryId),
  }
}

export function visualComponentEntry(
  options: VisualComponentEntryOptions,
): ComponentLibraryEntry {
  const entryId = creatorSignalCatalogueEntryId(options.id)
  return {
    id: entryId,
    version: options.version ?? '1.0.0',
    name: options.name,
    description: options.description,
    category: options.category,
    tags: options.tags,
    icon: options.icon,
    source: creatorSignalCatalogueSource(),
    status: 'stable',
    composition: options.container || (options.allowedChildEntryIds?.length ?? 0) > 0
      ? 'container'
      : 'leaf',
    implementation: {
      type: 'visual-component',
      componentId: options.componentId,
    },
    fields: options.fields ?? [],
    variants: options.variants ?? [],
    presets: [],
    slots: catalogueSlots(options.slots),
    constraints: {
      ...(options.allowedParentEntryIds
        ? { allowedParentEntryIds: catalogueEntryIds(options.allowedParentEntryIds) }
        : {}),
      ...(options.allowedChildEntryIds
        ? { allowedChildEntryIds: catalogueEntryIds(options.allowedChildEntryIds) }
        : {}),
    },
    requirements: {
      capabilities: [],
      providerAdapters: [],
      plugins: [],
    },
    documentation: {
      usage: options.usage,
      accessibility: options.accessibility,
    },
    accessibility: {
      checks: options.accessibilityChecks ?? [],
    },
    ...renderedPreview(options.category, entryId),
  }
}

export function patternEntry(
  options: PatternEntryOptions,
): ComponentLibraryEntry {
  const entryId = creatorSignalCatalogueEntryId(options.id)
  return {
    id: entryId,
    version: options.version ?? '1.0.0',
    name: options.name,
    description: options.description,
    category: options.category,
    tags: options.tags,
    icon: options.icon,
    source: creatorSignalCatalogueSource(),
    status: 'stable',
    composition: options.container || (options.allowedChildEntryIds?.length ?? 0) > 0
      ? 'container'
      : 'leaf',
    implementation: options.requirements
      ? {
          type: 'capability-backed',
          backing: {
            type: 'pattern',
            patternId: options.patternId,
          },
        }
      : {
          type: 'pattern',
          patternId: options.patternId,
        },
    fields: options.fields ?? [],
    variants: options.variants ?? [],
    presets: [],
    slots: [],
    constraints: {
      ...(options.allowedParentEntryIds
        ? { allowedParentEntryIds: catalogueEntryIds(options.allowedParentEntryIds) }
        : {}),
      ...(options.allowedChildEntryIds
        ? { allowedChildEntryIds: catalogueEntryIds(options.allowedChildEntryIds) }
        : {}),
    },
    requirements: options.requirements ?? {
      capabilities: [],
      providerAdapters: [],
      plugins: [],
    },
    documentation: {
      usage: options.usage,
      accessibility: options.accessibility,
    },
    accessibility: {
      checks: options.accessibilityChecks ?? [],
    },
    ...renderedPreview(options.category, entryId),
  }
}

export function accessibilityCheck(
  rule: ComponentLibraryAccessibilityRule,
  category: ComponentLibraryAccessibilityCategory,
  enforcement: ComponentLibraryAccessibilityCheck['enforcement'],
  summary: string,
  remediation: string,
  fields?: string[],
  severity: ComponentLibraryAccessibilityCheck['severity'] = 'warning',
): ComponentLibraryAccessibilityCheck {
  return {
    rule,
    category,
    enforcement,
    severity,
    ...(fields ? { fields } : {}),
    summary,
    remediation,
  }
}

export function accessibleNameCheck(
  field: string,
): ComponentLibraryAccessibilityCheck {
  return accessibilityCheck(
    'a11y.accessible-name',
    'naming',
    'automated',
    'This component requires a non-empty accessible name.',
    `Provide a specific ${field} value that explains the component's purpose.`,
    [field],
    'error',
  )
}

export function providerFallbackCheck(): ComponentLibraryAccessibilityCheck {
  return accessibilityCheck(
    'a11y.provider-fallback',
    'provider',
    'automated',
    'Provider content requires both an accessible title and fallback text.',
    'Provide a specific title and a useful alternative when provider content cannot load.',
    ['title', 'fallbackText'],
    'error',
  )
}

export function behaviorCheck(
  rule: ComponentLibraryAccessibilityRule,
  category: ComponentLibraryAccessibilityCategory,
  summary: string,
  remediation: string,
): ComponentLibraryAccessibilityCheck {
  return accessibilityCheck(
    rule,
    category,
    'behavior-test',
    summary,
    remediation,
  )
}

export const FORM_CONTROL_ACCESSIBILITY_CHECKS: ComponentLibraryAccessibilityCheck[] = [
  accessibilityCheck(
    'a11y.form-control-label',
    'form',
    'automated',
    'This form control has no visible associated label.',
    'Add a visible Label immediately before the control or explicitly target its field ID.',
    undefined,
    'error',
  ),
  accessibilityCheck(
    'a11y.unique-field-id',
    'form',
    'automated',
    'Form field IDs must be present and unique within the page.',
    'Assign a stable field ID that is not used by another control.',
    ['fieldId'],
    'error',
  ),
]

export const textField: ComponentLibraryField = {
  key: 'text',
  label: 'Text',
  description:
    'The literal authored text. Markup is escaped and hard newlines publish as line breaks.',
  type: 'text',
  required: true,
}

export const htmlTagField: ComponentLibraryField = {
  key: 'tag',
  label: 'Semantic element',
  description:
    'The HTML element that describes the text meaning; visual typography belongs to classes.',
  type: 'select',
  required: true,
}

export const fieldIdField: ComponentLibraryField = {
  key: 'fieldId',
  label: 'Field ID',
  type: 'text',
  required: true,
}

export const fieldNameField: ComponentLibraryField = {
  key: 'name',
  label: 'Submission name',
  type: 'text',
  required: false,
}

export const requiredField: ComponentLibraryField = {
  key: 'required',
  label: 'Required',
  type: 'boolean',
  required: false,
}

export const draftBehaviorField: ComponentLibraryField = {
  key: 'draftBehavior',
  label: 'Draft storage',
  type: 'select',
  required: false,
  advanced: true,
}

export const formLayoutParentEntryIds = [
  'base.form-container',
  'base.form-step',
  'base.tab-panel',
  'base.accordion-item',
]

export const formFieldParentEntryIds = [
  ...formLayoutParentEntryIds,
  'base.form-field-group',
]

export function inputEntry(
  id: string,
  name: string,
  inputType: string,
  description: string,
): ComponentLibraryEntry {
  return primitiveEntry({
    id,
    name,
    description,
    category: 'Forms',
    icon: 'text-start-t',
    moduleId: 'base.input',
    tags: ['form', 'field', inputType],
    fields: [
      fieldIdField,
      fieldNameField,
      {
        key: 'placeholder',
        label: 'Placeholder',
        type: 'text',
        required: false,
      },
      requiredField,
      draftBehaviorField,
      {
        key: 'autocomplete',
        label: 'Autocomplete',
        type: 'text',
        required: false,
      },
    ],
    preset: {
      id: inputType,
      name,
      values: { inputType },
    },
    allowedParentEntryIds: formFieldParentEntryIds,
    accessibilityChecks: FORM_CONTROL_ACCESSIBILITY_CHECKS,
    usage: `Use ${name} when the submitted value is ${description.toLowerCase()}`,
    accessibility: 'Pair the input with a visible Label and useful autocomplete value.',
  })
}
