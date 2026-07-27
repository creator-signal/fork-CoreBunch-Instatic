import type { ComponentLibraryEntry } from '@core/component-library'
import {
  accessibleNameCheck,
  templateComponentEntry,
} from './componentLibraryDefinitions'

export const BUILT_IN_TEMPLATE_COMPONENT_LIBRARY_ENTRIES:
readonly ComponentLibraryEntry[] = [
  templateComponentEntry({
    id: 'base.template-header',
    name: 'Header',
    description: 'Template-owned site header and primary navigation chrome.',
    category: 'Template',
    icon: 'layout-solid',
    role: 'header',
    tags: ['header', 'template', 'navigation', 'site chrome'],
    fields: [
      { key: 'label', label: 'Accessible label', type: 'text', required: true },
    ],
    accessibilityChecks: [accessibleNameCheck('label')],
    usage: 'Open the owning template to configure the shared site header.',
    accessibility: 'Keep landmarks unique and identify navigation regions clearly.',
  }),
  templateComponentEntry({
    id: 'base.template-footer',
    name: 'Footer',
    description: 'Template-owned site footer, legal and supplementary navigation chrome.',
    category: 'Template',
    icon: 'layout-solid',
    role: 'footer',
    tags: ['footer', 'template', 'legal', 'site chrome'],
    usage: 'Open the owning template to configure the shared site footer.',
    accessibility: 'Use one footer landmark and descriptive link-group headings.',
  }),
  templateComponentEntry({
    id: 'base.template-skip-link',
    name: 'Skip Link',
    description: 'Template-owned keyboard shortcut to the primary content region.',
    category: 'Template',
    icon: 'link',
    role: 'skip-link',
    tags: ['skip link', 'template', 'keyboard', 'accessibility'],
    fields: [
      { key: 'label', label: 'Label', type: 'text', required: true },
      { key: 'target', label: 'Target', type: 'text', required: true },
    ],
    accessibilityChecks: [accessibleNameCheck('label')],
    usage: 'Configure one visible-on-focus skip link in the owning template.',
    accessibility: 'Its target must exist and receive focus without obscuring content.',
  }),
]
