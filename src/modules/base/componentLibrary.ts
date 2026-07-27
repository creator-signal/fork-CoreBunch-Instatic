import {
  componentLibraryRegistry,
  type ComponentLibraryAccessibilityCategory,
  type ComponentLibraryAccessibilityCheck,
  type ComponentLibraryAccessibilityRule,
  type ComponentLibraryEntry,
  type ComponentLibraryField,
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

function primitiveEntry(options: PrimitiveEntryOptions): ComponentLibraryEntry {
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

function accessibilityCheck(
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

function accessibleNameCheck(field: string): ComponentLibraryAccessibilityCheck {
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

function providerFallbackCheck(): ComponentLibraryAccessibilityCheck {
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

function behaviorCheck(
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

const FORM_CONTROL_ACCESSIBILITY_CHECKS: ComponentLibraryAccessibilityCheck[] = [
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

const textField: ComponentLibraryField = {
  key: 'text',
  label: 'Text',
  type: 'text',
  required: true,
}

const htmlTagField: ComponentLibraryField = {
  key: 'tag',
  label: 'Semantic element',
  type: 'select',
  required: true,
}

const fieldIdField: ComponentLibraryField = {
  key: 'fieldId',
  label: 'Field ID',
  type: 'text',
  required: true,
}

const fieldNameField: ComponentLibraryField = {
  key: 'name',
  label: 'Submission name',
  type: 'text',
  required: false,
}

const requiredField: ComponentLibraryField = {
  key: 'required',
  label: 'Required',
  type: 'boolean',
  required: false,
}

const formLayoutParentEntryIds = [
  'base.form-container',
  'base.tab-panel',
  'base.accordion-item',
]

const formFieldParentEntryIds = [
  ...formLayoutParentEntryIds,
  'base.form-field-group',
]

function inputEntry(
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

export const BUILT_IN_COMPONENT_LIBRARY_ENTRIES: readonly ComponentLibraryEntry[] = [
  primitiveEntry({
    id: 'base.section',
    name: 'Section',
    description: 'A semantic section that groups related page content.',
    category: 'Structure',
    icon: 'layout-columns',
    moduleId: 'base.container',
    tags: ['section', 'layout', 'structure'],
    preset: {
      id: 'section',
      name: 'Section',
      values: { tag: 'section' },
    },
    usage: 'Group content that belongs under one heading or purpose.',
    accessibility: 'Give each major section an identifying heading.',
  }),
  primitiveEntry({
    id: 'base.container',
    name: 'Container',
    description: 'A neutral content container with a controlled semantic element.',
    category: 'Structure',
    icon: 'layout-columns',
    moduleId: 'base.container',
    tags: ['container', 'layout', 'group'],
    fields: [htmlTagField],
    usage: 'Group content when no more specific catalogue entry applies.',
    accessibility: 'Choose a semantic element only when it matches the content purpose.',
  }),
  primitiveEntry({
    id: 'base.heading',
    name: 'Heading',
    description: 'A section heading using the shared text implementation.',
    category: 'Typography',
    icon: 'text-heading',
    moduleId: 'base.text',
    tags: ['heading', 'title', 'text'],
    fields: [textField, htmlTagField],
    preset: {
      id: 'heading',
      name: 'Heading',
      values: { text: 'Heading', tag: 'h2' },
    },
    accessibilityChecks: [
      accessibleNameCheck('text'),
      accessibilityCheck(
        'a11y.heading-order',
        'heading',
        'automated',
        'Heading levels should not skip a level in page order.',
        'Choose the next logical heading level based on document structure.',
        ['tag'],
      ),
    ],
    usage: 'Introduce a page or section with a meaningful heading.',
    accessibility: 'Keep heading levels logical and do not choose a level for visual size alone.',
  }),
  primitiveEntry({
    id: 'base.plain-text',
    name: 'Plain Text',
    description: 'A semantic paragraph or short text fragment.',
    category: 'Typography',
    icon: 'content-text',
    moduleId: 'base.text',
    tags: ['paragraph', 'copy', 'text'],
    fields: [textField, htmlTagField],
    preset: {
      id: 'paragraph',
      name: 'Paragraph',
      values: { text: 'Add your text here.', tag: 'p' },
    },
    usage: 'Use for short plain-text content that does not need rich formatting.',
    accessibility: 'Use semantic elements that match the content rather than its appearance.',
  }),
  primitiveEntry({
    id: 'base.image',
    name: 'Image',
    description: 'An image selected from the Media Library.',
    category: 'Media',
    icon: 'image',
    moduleId: 'base.image',
    tags: ['image', 'photo', 'media'],
    fields: [
      { key: 'src', label: 'Image', type: 'image', required: true },
      { key: 'loading', label: 'Loading', type: 'select', required: true },
      { key: 'fetchPriority', label: 'Fetch priority', type: 'select', required: true },
    ],
    accessibilityChecks: [
      accessibilityCheck(
        'a11y.image-alternative',
        'media',
        'manual',
        'Image alternative text must match the authored context.',
        'Review the Media Library alternative text and mark decorative images appropriately.',
      ),
    ],
    usage: 'Use an uploaded asset with loading behavior appropriate to its page position.',
    accessibility: 'Provide meaningful alternative text in the Media Library or mark decorative images.',
  }),
  primitiveEntry({
    id: 'base.button',
    name: 'Button',
    description: 'A call to action rendered as a button or link.',
    category: 'Interactive',
    icon: 'button',
    moduleId: 'base.button',
    tags: ['button', 'action', 'link', 'cta'],
    fields: [
      { key: 'label', label: 'Label', type: 'text', required: true },
      { key: 'href', label: 'Destination', type: 'url', required: false },
      { key: 'target', label: 'Open in', type: 'select', required: true },
      { key: 'disabled', label: 'Disabled', type: 'boolean', required: false },
    ],
    accessibilityChecks: [
      accessibleNameCheck('label'),
      accessibilityCheck(
        'a11y.touch-target',
        'touch',
        'manual',
        'The rendered action needs an adequate touch target.',
        'Verify the final design provides sufficient target size and spacing.',
      ),
      accessibilityCheck(
        'a11y.contrast',
        'contrast',
        'manual',
        'Text, focus and disabled states require sufficient contrast.',
        'Review the final token combination in every supported theme and state.',
      ),
    ],
    usage: 'Use for an action or prominent navigation destination.',
    accessibility: 'Use a specific label that describes the result of activating the control.',
  }),
  primitiveEntry({
    id: 'base.link',
    name: 'Link',
    description: 'An inline or grouped navigation link.',
    category: 'Interactive',
    icon: 'link',
    moduleId: 'base.link',
    tags: ['link', 'navigation', 'anchor'],
    fields: [
      { key: 'text', label: 'Text', type: 'text', required: true },
      { key: 'href', label: 'Destination', type: 'url', required: true },
      { key: 'target', label: 'Open in', type: 'select', required: true },
    ],
    accessibilityChecks: [accessibleNameCheck('text')],
    usage: 'Use for navigation within text or a group of linked content.',
    accessibility: 'Link text must make sense without relying on surrounding prose.',
  }),
  primitiveEntry({
    id: 'base.search',
    name: 'Search Results',
    description: 'Index-backed search across eligible published pages.',
    category: 'Content',
    icon: 'search',
    moduleId: 'base.loop',
    tags: ['search', 'results', 'index', 'collection'],
    preset: {
      id: 'published-pages',
      name: 'Published pages',
      values: {
        sourceMode: 'dynamic',
        sourceId: 'search.pages',
        manualItems: [],
        filters: {},
        orderBy: 'relevance',
        direction: 'desc',
        limit: 100,
        offset: 0,
        query: '',
        itemRenderer: 'search-result',
        pagination: 'numbered',
        pageSize: 10,
        tag: 'div',
        customTag: '',
      },
    },
    requirements: {
      capabilities: ['search.index'],
      providerAdapters: [],
      plugins: [],
    },
    accessibilityChecks: [
      behaviorCheck(
        'a11y.announcement-contract',
        'naming',
        'Search result counts, empty results and failures require a polite announcement.',
        'Verify the shared collection status announces each result state.',
      ),
    ],
    usage: 'Enable published-page search in Settings, then place this result collection on a search page.',
    accessibility: 'Pair results with a labelled GET search form whose field name matches the configured query parameter.',
  }),
  primitiveEntry({
    id: 'base.list',
    name: 'List',
    description: 'An ordered or unordered semantic list.',
    category: 'Typography',
    icon: 'list-box',
    moduleId: 'base.list',
    tags: ['list', 'ordered', 'unordered'],
    fields: [
      { key: 'items', label: 'Items', type: 'text', required: true },
      { key: 'listType', label: 'List type', type: 'select', required: true },
    ],
    usage: 'Use for a sequence or group of related short items.',
    accessibility: 'Use an ordered list when item order carries meaning.',
  }),
  primitiveEntry({
    id: 'base.media',
    name: 'Media',
    description: 'Accessible self-hosted video from the Media Library.',
    category: 'Media',
    icon: 'video',
    moduleId: 'base.video',
    tags: ['video', 'media', 'hosted'],
    fields: [
      { key: 'videoUrl', label: 'Video', type: 'media', required: true },
      { key: 'poster', label: 'Poster image', type: 'image', required: false },
      { key: 'title', label: 'Accessible title', type: 'text', required: true },
      { key: 'controls', label: 'Show controls', type: 'boolean', required: false },
      { key: 'autoplay', label: 'Autoplay', type: 'boolean', required: false, advanced: true },
    ],
    accessibilityChecks: [
      accessibleNameCheck('title'),
      accessibilityCheck(
        'a11y.motion-control',
        'motion',
        'manual',
        'Autoplay and motion behavior require user control.',
        'Keep controls available and review reduced-motion and autoplay behavior.',
      ),
    ],
    usage: 'Use for a video asset hosted by the site. Use YouTube Embed for provider video.',
    accessibility: 'Provide an accurate title, captions where needed and user controls.',
  }),
  primitiveEntry({
    id: 'base.youtube-embed',
    name: 'YouTube Embed',
    description: 'A consent-delayed privacy-enhanced YouTube video.',
    category: 'Media',
    icon: 'video',
    moduleId: 'base.provider-embed',
    tags: ['video', 'youtube', 'provider', 'consent'],
    fields: [
      { key: 'sourceUrl', label: 'YouTube URL', type: 'url', required: true },
      { key: 'title', label: 'Accessible title', type: 'text', required: true },
      { key: 'fallbackText', label: 'Fallback text', type: 'text', required: true },
    ],
    preset: {
      id: 'youtube',
      name: 'YouTube',
      values: {
        adapterId: 'media.youtube',
        kind: 'media',
        title: 'YouTube video',
        fallbackText: 'YouTube video unavailable.',
      },
    },
    requirements: {
      capabilities: [],
      providerAdapters: ['media.youtube'],
      plugins: [],
    },
    accessibilityChecks: [
      providerFallbackCheck(),
      behaviorCheck(
        'a11y.focus-contract',
        'focus',
        'Consent activation and the loaded player must preserve a predictable focus path.',
        'Verify focus remains visible and does not move unexpectedly when the provider loads.',
      ),
    ],
    usage: 'Paste an approved YouTube URL; the player loads only after marketing consent or explicit activation.',
    accessibility: 'Provide an accurate title and a meaningful fallback when provider content is blocked.',
  }),
  primitiveEntry({
    id: 'base.map',
    name: 'Map',
    description: 'A consent-delayed OpenStreetMap embed.',
    category: 'Interactive',
    icon: 'layout-solid',
    moduleId: 'base.provider-embed',
    tags: ['map', 'openstreetmap', 'provider', 'consent'],
    fields: [
      { key: 'sourceUrl', label: 'OpenStreetMap URL', type: 'url', required: true },
      { key: 'title', label: 'Accessible title', type: 'text', required: true },
      { key: 'fallbackText', label: 'Fallback text', type: 'text', required: true },
    ],
    preset: {
      id: 'openstreetmap',
      name: 'OpenStreetMap',
      values: {
        adapterId: 'maps.openstreetmap',
        kind: 'map',
        title: 'Map',
        fallbackText: 'Map unavailable.',
      },
    },
    requirements: {
      capabilities: [],
      providerAdapters: ['maps.openstreetmap'],
      plugins: [],
    },
    accessibilityChecks: [providerFallbackCheck()],
    usage: 'Paste an OpenStreetMap export URL from the approved provider origin.',
    accessibility: 'Use a title that identifies the location and provide the address in ordinary page text.',
  }),
  primitiveEntry({
    id: 'base.tabs',
    name: 'Tabs',
    description: 'A labelled set of progressively enhanced content panels.',
    category: 'Interactive',
    icon: 'layout-solid',
    moduleId: 'base.tabs',
    tags: ['tabs', 'panels', 'interactive', 'form'],
    fields: [
      { key: 'label', label: 'Accessible label', type: 'text', required: true },
      { key: 'orientation', label: 'Orientation', type: 'select', required: true },
      { key: 'activation', label: 'Keyboard activation', type: 'select', required: true },
    ],
    allowedChildEntryIds: ['base.tab-panel'],
    accessibilityChecks: [
      accessibleNameCheck('label'),
      behaviorCheck(
        'a11y.keyboard-contract',
        'keyboard',
        'Tabs require Arrow, Home, End, Enter and Space behavior appropriate to activation mode.',
        'Run the tab runtime keyboard behavior suite after implementation changes.',
      ),
      behaviorCheck(
        'a11y.focus-contract',
        'focus',
        'Tabs require roving focus and a visible active panel.',
        'Verify selected state, focus order and validation-driven panel activation.',
      ),
      behaviorCheck(
        'a11y.no-javascript-fallback',
        'semantic',
        'Every tab panel must remain available without JavaScript.',
        'Verify the server-rendered output leaves all panels visible.',
      ),
    ],
    usage: 'Organize related peer sections when visitors benefit from switching between them.',
    accessibility: 'Arrow, Home and End keys move through tabs; manual activation also uses Enter or Space.',
  }),
  primitiveEntry({
    id: 'base.tab-panel',
    name: 'Tab Panel',
    description: 'One labelled panel inside Tabs.',
    category: 'Interactive',
    icon: 'layout-solid',
    moduleId: 'base.tab-panel',
    tags: ['tab', 'panel', 'interactive', 'form'],
    fields: [
      { key: 'tabId', label: 'Tab ID', type: 'text', required: true, advanced: true },
      { key: 'label', label: 'Label', type: 'text', required: true },
      { key: 'selected', label: 'Selected initially', type: 'boolean', required: false },
      { key: 'disabled', label: 'Disabled', type: 'boolean', required: false },
    ],
    allowedParentEntryIds: ['base.tabs'],
    accessibilityChecks: [accessibleNameCheck('label')],
    usage: 'Add one labelled content region to Tabs.',
    accessibility: 'Use a short unique label; all panels remain visible when JavaScript is unavailable.',
  }),
  primitiveEntry({
    id: 'base.accordion',
    name: 'Accordion',
    description: 'A labelled group of native disclosure sections.',
    category: 'Interactive',
    icon: 'list-box-solid',
    moduleId: 'base.accordion',
    tags: ['accordion', 'disclosure', 'interactive', 'form'],
    fields: [
      { key: 'label', label: 'Accessible label', type: 'text', required: true },
    ],
    allowedChildEntryIds: ['base.accordion-item'],
    accessibilityChecks: [
      accessibleNameCheck('label'),
      behaviorCheck(
        'a11y.keyboard-contract',
        'keyboard',
        'Accordion items must retain native keyboard-operable disclosure behavior.',
        'Verify the published details and summary elements remain native controls.',
      ),
      behaviorCheck(
        'a11y.no-javascript-fallback',
        'semantic',
        'Accordion content must remain operable without JavaScript.',
        'Verify native details and summary markup in published output.',
      ),
    ],
    usage: 'Organize sections that visitors can expand independently.',
    accessibility: 'Uses native details and summary behavior with a complete no-JavaScript fallback.',
  }),
  primitiveEntry({
    id: 'base.accordion-item',
    name: 'Accordion Item',
    description: 'One native disclosure section inside an Accordion.',
    category: 'Interactive',
    icon: 'list-box-solid',
    moduleId: 'base.accordion-item',
    tags: ['accordion', 'details', 'summary', 'form'],
    fields: [
      { key: 'title', label: 'Summary', type: 'text', required: true },
      { key: 'open', label: 'Open initially', type: 'boolean', required: false },
    ],
    allowedParentEntryIds: ['base.accordion'],
    accessibilityChecks: [accessibleNameCheck('title')],
    usage: 'Add one independently expandable section.',
    accessibility: 'Write a specific summary that identifies the hidden content.',
  }),
  primitiveEntry({
    id: 'base.form-container',
    name: 'Form Container',
    description: 'A CMS-native or custom form boundary.',
    category: 'Forms',
    icon: 'file-text-solid',
    moduleId: 'base.form',
    tags: ['form', 'submission', 'container'],
    fields: [
      { key: 'mode', label: 'Mode', type: 'select', required: true },
      { key: 'formId', label: 'Form ID', type: 'text', required: true },
      { key: 'targetTableId', label: 'Target collection', type: 'select', required: false },
      { key: 'successBehavior', label: 'Success behavior', type: 'select', required: true },
      { key: 'successMessage', label: 'Success message', type: 'text', required: false },
      { key: 'redirectUrl', label: 'Redirect destination', type: 'url', required: false },
    ],
    accessibilityChecks: [
      behaviorCheck(
        'a11y.announcement-contract',
        'form',
        'Submission success and errors require appropriate live announcements.',
        'Run the CMS form runtime announcement behavior tests.',
      ),
      behaviorCheck(
        'a11y.focus-contract',
        'focus',
        'Invalid submissions must reveal and focus the first invalid field.',
        'Run validation through nested disclosure fixtures and verify focus placement.',
      ),
    ],
    usage: 'Add approved fields and actions inside this form boundary.',
    accessibility: 'Provide labels, instructions, errors and a clear submission result.',
  }),
  primitiveEntry({
    id: 'base.form-field-group',
    name: 'Form Field Group',
    description: 'A governed layout boundary for one field, its label, help and error.',
    category: 'Forms',
    icon: 'layout-columns',
    moduleId: 'base.container',
    tags: ['form', 'field', 'group', 'layout'],
    preset: {
      id: 'field-group',
      name: 'Field group',
      values: { tag: 'div' },
    },
    allowedParentEntryIds: formLayoutParentEntryIds,
    allowedChildEntryIds: [
      'base.form-label',
      'base.text-input',
      'base.email-input',
      'base.telephone-input',
      'base.url-input',
      'base.number-input',
      'base.date-input',
      'base.text-area',
      'base.select',
      'base.checkbox',
      'base.radio',
      'base.form-help',
      'base.form-error',
      'base.captcha',
      'base.plain-text',
      'base.image',
    ],
    usage: 'Group one control with its visible label, help and field error.',
    accessibility: 'Keep the label and any described help or error in the same group as the control.',
  }),
  primitiveEntry({
    id: 'base.form-actions',
    name: 'Form Actions',
    description: 'A governed layout boundary for submit and secondary actions.',
    category: 'Forms',
    icon: 'layout-columns',
    moduleId: 'base.container',
    tags: ['form', 'actions', 'submit', 'layout'],
    preset: {
      id: 'actions',
      name: 'Actions',
      values: { tag: 'div' },
    },
    allowedParentEntryIds: formLayoutParentEntryIds,
    allowedChildEntryIds: [
      'base.submit',
      'base.link',
      'base.form-message',
      'base.form-error',
    ],
    usage: 'Group the primary submit control and any secondary link at the end of a form.',
    accessibility: 'Keep the primary action clear and preserve a predictable keyboard order.',
  }),
  primitiveEntry({
    id: 'base.form-label',
    name: 'Label',
    description: 'A visible label for a form control.',
    category: 'Forms',
    icon: 'text-start-t',
    moduleId: 'base.label',
    tags: ['form', 'label'],
    fields: [
      { key: 'text', label: 'Text', type: 'text', required: true },
      { key: 'targetMode', label: 'Target', type: 'select', required: true, advanced: true },
      { key: 'targetId', label: 'Target ID', type: 'text', required: false, advanced: true },
    ],
    allowedParentEntryIds: formFieldParentEntryIds,
    accessibilityChecks: [accessibleNameCheck('text')],
    usage: 'Place immediately before the control it describes.',
    accessibility: 'Use visible, specific labels; placeholders do not replace labels.',
  }),
  inputEntry('base.text-input', 'Text Input', 'text', 'General short text.'),
  inputEntry('base.email-input', 'Email Input', 'email', 'An email address.'),
  inputEntry('base.telephone-input', 'Telephone Input', 'tel', 'A telephone number.'),
  inputEntry('base.url-input', 'URL Input', 'url', 'A web address.'),
  inputEntry('base.number-input', 'Number Input', 'number', 'A numeric value.'),
  inputEntry('base.date-input', 'Date Input', 'date', 'A calendar date.'),
  primitiveEntry({
    id: 'base.text-area',
    name: 'Text Area',
    description: 'A multi-line form input.',
    category: 'Forms',
    icon: 'text-start-t',
    moduleId: 'base.textarea',
    tags: ['form', 'field', 'multiline'],
    fields: [
      fieldIdField,
      fieldNameField,
      { key: 'placeholder', label: 'Placeholder', type: 'text', required: false },
      requiredField,
      { key: 'rows', label: 'Rows', type: 'number', required: true },
    ],
    allowedParentEntryIds: formFieldParentEntryIds,
    accessibilityChecks: FORM_CONTROL_ACCESSIBILITY_CHECKS,
    usage: 'Use for responses that may need more than one line.',
    accessibility: 'Pair with a visible Label and concise help text when needed.',
  }),
  primitiveEntry({
    id: 'base.select',
    name: 'Select',
    description: 'A select control containing approved options.',
    category: 'Forms',
    icon: 'checkbox-solid',
    moduleId: 'base.select',
    tags: ['form', 'select', 'options'],
    fields: [fieldIdField, fieldNameField, requiredField],
    allowedParentEntryIds: formFieldParentEntryIds,
    allowedChildEntryIds: ['base.option', 'base.option-group'],
    accessibilityChecks: FORM_CONTROL_ACCESSIBILITY_CHECKS,
    usage: 'Use when one or more choices come from a controlled option set.',
    accessibility: 'Pair with a visible Label and keep option labels concise.',
  }),
  primitiveEntry({
    id: 'base.option',
    name: 'Option',
    description: 'One selectable value inside a Select.',
    category: 'Forms',
    icon: 'checkbox-solid',
    moduleId: 'base.option',
    tags: ['form', 'select', 'option'],
    fields: [
      { key: 'label', label: 'Label', type: 'text', required: true },
      { key: 'value', label: 'Value', type: 'text', required: true },
      { key: 'disabled', label: 'Disabled', type: 'boolean', required: false },
    ],
    allowedParentEntryIds: ['base.select', 'base.option-group'],
    usage: 'Add one author-facing choice to a Select.',
    accessibility: 'Use a distinct label that communicates the choice.',
  }),
  primitiveEntry({
    id: 'base.option-group',
    name: 'Option Group',
    description: 'A labelled group of related Select options.',
    category: 'Forms',
    icon: 'checkbox-solid',
    moduleId: 'base.option-group',
    tags: ['form', 'select', 'group'],
    fields: [
      { key: 'label', label: 'Label', type: 'text', required: true },
      { key: 'disabled', label: 'Disabled', type: 'boolean', required: false },
    ],
    allowedParentEntryIds: ['base.select'],
    allowedChildEntryIds: ['base.option'],
    usage: 'Group a longer option list into meaningful labelled sections.',
    accessibility: 'Use a short group label that distinguishes its options.',
  }),
  primitiveEntry({
    id: 'base.checkbox',
    name: 'Checkbox',
    description: 'A form control for an independent yes/no choice.',
    category: 'Forms',
    icon: 'checkbox-solid',
    moduleId: 'base.checkbox',
    tags: ['form', 'checkbox', 'choice'],
    fields: [
      fieldIdField,
      fieldNameField,
      { key: 'value', label: 'Value', type: 'text', required: true },
      { key: 'checked', label: 'Checked', type: 'boolean', required: false },
      requiredField,
    ],
    allowedParentEntryIds: formFieldParentEntryIds,
    accessibilityChecks: FORM_CONTROL_ACCESSIBILITY_CHECKS,
    usage: 'Use for a choice that can be selected independently.',
    accessibility: 'Pair with a visible label describing the selected state.',
  }),
  primitiveEntry({
    id: 'base.radio',
    name: 'Radio',
    description: 'One mutually exclusive choice in a radio group.',
    category: 'Forms',
    icon: 'checkbox-solid',
    moduleId: 'base.radio',
    tags: ['form', 'radio', 'choice'],
    fields: [
      fieldIdField,
      fieldNameField,
      { key: 'value', label: 'Value', type: 'text', required: true },
      { key: 'checked', label: 'Checked', type: 'boolean', required: false },
      requiredField,
    ],
    allowedParentEntryIds: formFieldParentEntryIds,
    accessibilityChecks: FORM_CONTROL_ACCESSIBILITY_CHECKS,
    usage: 'Use with other Radio entries sharing one submission name.',
    accessibility: 'Group related radios under a visible question or fieldset legend.',
  }),
  primitiveEntry({
    id: 'base.submit',
    name: 'Submit Button',
    description: 'Submits the containing form.',
    category: 'Forms',
    icon: 'send-solid',
    moduleId: 'base.submit',
    tags: ['form', 'submit', 'action'],
    fields: [
      { key: 'label', label: 'Label', type: 'text', required: true },
      { key: 'disabled', label: 'Disabled', type: 'boolean', required: false },
    ],
    allowedParentEntryIds: [
      'base.form-container',
      'base.form-actions',
    ],
    accessibilityChecks: [accessibleNameCheck('label')],
    usage: 'Place once near the end of a form.',
    accessibility: 'Use a label that clearly states what will be submitted.',
  }),
  primitiveEntry({
    id: 'base.form-message',
    name: 'Form Status',
    description: 'A submission status or result message for a form.',
    category: 'Forms',
    icon: 'warning-diamond-solid',
    moduleId: 'base.form-message',
    tags: ['form', 'status', 'error', 'success'],
    fields: [
      { key: 'kind', label: 'Message type', type: 'select', required: true },
      { key: 'text', label: 'Text', type: 'text', required: true },
      { key: 'formId', label: 'Form ID', type: 'text', required: false, advanced: true },
    ],
    preset: {
      id: 'status',
      name: 'Status',
      values: { kind: 'status' },
    },
    allowedParentEntryIds: [
      'base.form-container',
      'base.form-actions',
    ],
    accessibilityChecks: [
      accessibleNameCheck('text'),
      behaviorCheck(
        'a11y.announcement-contract',
        'form',
        'Submission status changes must be announced without unnecessary focus movement.',
        'Run the form runtime announcement and focus behavior tests.',
      ),
    ],
    usage: 'Explain form status or the result of a submission.',
    accessibility: 'Status messages must be concise and announced without moving focus unnecessarily.',
  }),
  primitiveEntry({
    id: 'base.form-help',
    name: 'Field Help',
    description: 'Persistent instructions associated with one form control.',
    category: 'Forms',
    icon: 'content-text',
    moduleId: 'base.form-message',
    tags: ['form', 'field', 'help', 'description'],
    fields: [
      fieldIdField,
      { key: 'text', label: 'Help text', type: 'text', required: true },
    ],
    preset: {
      id: 'help',
      name: 'Field help',
      values: { kind: 'help' },
    },
    allowedParentEntryIds: formFieldParentEntryIds,
    accessibilityChecks: [
      accessibleNameCheck('text'),
      behaviorCheck(
        'a11y.announcement-contract',
        'form',
        'Field help must be connected through the control description.',
        'Verify aria-describedby includes the authored help message.',
      ),
    ],
    usage: 'Add concise instructions that remain visible before and after validation.',
    accessibility: 'The form runtime associates this text through aria-describedby.',
  }),
  primitiveEntry({
    id: 'base.form-error',
    name: 'Field Error',
    description: 'A validation message associated with one form control.',
    category: 'Forms',
    icon: 'warning-diamond-solid',
    moduleId: 'base.form-message',
    tags: ['form', 'field', 'error', 'validation'],
    fields: [
      fieldIdField,
      { key: 'text', label: 'Fallback error', type: 'text', required: false },
    ],
    preset: {
      id: 'error',
      name: 'Field error',
      values: { kind: 'error' },
    },
    allowedParentEntryIds: formFieldParentEntryIds,
    accessibilityChecks: [
      behaviorCheck(
        'a11y.announcement-contract',
        'form',
        'Field errors must be announced and associated with the invalid control.',
        'Verify aria-invalid, aria-errormessage, announcement and first-invalid focus behavior.',
      ),
    ],
    usage: 'Place beside the control whose server validation error it reports.',
    accessibility: 'The runtime marks the control invalid, announces the message and focuses the first invalid field.',
  }),
  primitiveEntry({
    id: 'base.captcha',
    name: 'CAPTCHA',
    description: 'A provider-neutral form verification boundary.',
    category: 'Forms',
    icon: 'checkbox-solid',
    moduleId: 'base.provider-embed',
    tags: ['form', 'captcha', 'verification', 'provider'],
    fields: [
      { key: 'title', label: 'Accessible title', type: 'text', required: true },
      { key: 'fallbackText', label: 'Unavailable message', type: 'text', required: true },
    ],
    preset: {
      id: 'hcaptcha',
      name: 'hCaptcha',
      values: {
        adapterId: 'captcha.hcaptcha',
        kind: 'captcha',
        title: 'Verification challenge',
        fallbackText: 'CAPTCHA verification is unavailable.',
      },
    },
    allowedParentEntryIds: formFieldParentEntryIds,
    requirements: {
      capabilities: ['forms.captcha'],
      providerAdapters: ['captcha.hcaptcha'],
      plugins: [],
    },
    accessibilityChecks: [providerFallbackCheck()],
    usage: 'Use only when the platform CAPTCHA capability and an approved adapter are healthy.',
    accessibility: 'Provide an alternate verification path and never claim availability while provider verification is unconfigured.',
  }),
]

export function registerBuiltInComponentLibraryEntries(): void {
  for (const entry of BUILT_IN_COMPONENT_LIBRARY_ENTRIES) {
    componentLibraryRegistry.registerOrReplace(entry)
  }
}

registerBuiltInComponentLibraryEntries()
