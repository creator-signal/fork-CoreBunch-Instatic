import type {
  ComponentLibraryAccessibilityCategory,
  ComponentLibraryAccessibilityCheck,
  ComponentLibraryAccessibilityRule,
  ComponentLibraryEntry,
  ComponentLibraryField,
} from '@core/component-library'

interface PrimitiveEntryOptions {
  id: string
  name: string
  description: string
  category: string
  icon: string
  moduleId: string
  tags: string[]
  fields?: ComponentLibraryField[]
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
}

interface PatternEntryOptions {
  id: string
  name: string
  description: string
  category: string
  icon: string
  patternId: string
  tags: string[]
  allowedParentEntryIds?: string[]
  allowedChildEntryIds?: string[]
  accessibilityChecks?: ComponentLibraryAccessibilityCheck[]
  usage: string
  accessibility: string
}

export function primitiveEntry(
  options: PrimitiveEntryOptions,
): ComponentLibraryEntry {
  return {
    id: options.id,
    version: '1.0.0',
    name: options.name,
    description: options.description,
    category: options.category,
    tags: options.tags,
    icon: options.icon,
    source: { type: 'built-in' },
    status: 'stable',
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
    variants: [],
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
        ? { allowedParentEntryIds: options.allowedParentEntryIds }
        : {}),
      ...(options.allowedChildEntryIds
        ? { allowedChildEntryIds: options.allowedChildEntryIds }
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
  }
}

export function visualComponentEntry(
  options: VisualComponentEntryOptions,
): ComponentLibraryEntry {
  return {
    id: options.id,
    version: '1.0.0',
    name: options.name,
    description: options.description,
    category: options.category,
    tags: options.tags,
    icon: options.icon,
    source: { type: 'built-in' },
    status: 'stable',
    implementation: {
      type: 'visual-component',
      componentId: options.componentId,
    },
    fields: options.fields ?? [],
    variants: options.variants ?? [],
    presets: [],
    slots: options.slots ?? [],
    constraints: {
      ...(options.allowedParentEntryIds
        ? { allowedParentEntryIds: options.allowedParentEntryIds }
        : {}),
      ...(options.allowedChildEntryIds
        ? { allowedChildEntryIds: options.allowedChildEntryIds }
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
  }
}

export function patternEntry(
  options: PatternEntryOptions,
): ComponentLibraryEntry {
  return {
    id: options.id,
    version: '1.0.0',
    name: options.name,
    description: options.description,
    category: options.category,
    tags: options.tags,
    icon: options.icon,
    source: { type: 'built-in' },
    status: 'stable',
    implementation: {
      type: 'pattern',
      patternId: options.patternId,
    },
    fields: [],
    variants: [],
    presets: [],
    slots: [],
    constraints: {
      ...(options.allowedParentEntryIds
        ? { allowedParentEntryIds: options.allowedParentEntryIds }
        : {}),
      ...(options.allowedChildEntryIds
        ? { allowedChildEntryIds: options.allowedChildEntryIds }
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
  type: 'text',
  required: true,
}

export const htmlTagField: ComponentLibraryField = {
  key: 'tag',
  label: 'Semantic element',
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
