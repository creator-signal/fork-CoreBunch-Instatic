import type { ComponentLibraryEntry } from '@core/component-library'
import {
  builtInVisualComponentRegistry,
  type VisualComponent,
} from '@core/visual-components-schema'
import { ComponentFrameModule } from './componentFrame'
import { SlotOutletModule } from './slotOutlet'
import {
  accessibleNameCheck,
  visualComponentEntry,
} from './componentLibraryDefinitions'
import {
  visualComponent,
  visualNode,
  visualParam,
} from './visualComponentDefinitionHelpers'

const REUSABLE_FORM_FRAGMENT = visualComponent(
  'base.vc.reusable-form-fragment',
  'Reusable Form Fragment',
  'fragment.root',
  [
    visualParam('label', 'Accessible label', 'string', 'Reusable form fields', {
      required: true,
    }),
    visualParam('bindingPrefix', 'Binding prefix', 'string', ''),
    visualParam('fields', 'Fields', 'slot', []),
  ],
  [
    visualNode(
      'fragment.root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'reusable-form-fragment', tag: 'section' },
      ['fragment.fields'],
      {
        label: { paramId: 'label' },
        bindingPrefix: { paramId: 'bindingPrefix' },
      },
    ),
    visualNode(
      'fragment.fields',
      SlotOutletModule.id,
      SlotOutletModule.defaults,
      { slotName: 'fields' },
    ),
  ],
)

export const BUILT_IN_FORM_VISUAL_COMPONENTS:
readonly VisualComponent[] = [REUSABLE_FORM_FRAGMENT]

for (const definition of BUILT_IN_FORM_VISUAL_COMPONENTS) {
  builtInVisualComponentRegistry.registerOrReplace(definition)
}

export const BUILT_IN_FORM_VISUAL_COMPONENT_LIBRARY_ENTRIES:
readonly ComponentLibraryEntry[] = [
  visualComponentEntry({
    id: 'base.reusable-form-fragment',
    name: 'Reusable Form Fragment',
    description: 'A centrally governed form-field fragment with an explicit binding prefix.',
    category: 'Forms',
    icon: 'container-solid',
    componentId: REUSABLE_FORM_FRAGMENT.id,
    tags: ['form', 'fragment', 'reusable', 'fields', 'shared'],
    fields: [
      { key: 'label', label: 'Accessible label', type: 'text', required: true },
      { key: 'bindingPrefix', label: 'Binding prefix', type: 'text', required: false, advanced: true },
    ],
    slots: [{
      id: 'fields',
      name: 'Fields',
      description: 'Governed fields maintained by the fragment definition.',
      allowedEntryIds: [
        'base.form-field-group',
        'base.heading',
        'base.rich-text',
        'base.plain-text',
        'base.image',
      ],
      minItems: 1,
    }],
    allowedParentEntryIds: [
      'base.form-container',
      'base.form-step',
      'base.form-panel',
      'base.tab-panel',
      'base.accordion-item',
    ],
    accessibilityChecks: [accessibleNameCheck('label')],
    usage: 'Use one stable binding prefix per instance so repeated fragments cannot collide.',
    accessibility: 'Keep every included control labelled and every generated field ID unique.',
  }),
]
