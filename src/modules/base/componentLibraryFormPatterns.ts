import {
  componentLibraryPatternRegistry,
  type ComponentLibraryPatternDefinition,
  type ComponentLibraryPatternNode,
} from '@core/component-library'
import { creatorSignalCatalogueEntryId } from '@core/page-tree'
import { ComponentFrameModule } from './componentFrame'
import { ContainerModule } from './container'
import {
  AccordionItemModule,
  AccordionModule,
  TabPanelModule,
  TabsModule,
} from './disclosure'
import {
  CheckboxModule,
  FormModule,
  InputModule,
  LabelModule,
  RadioModule,
  SubmitModule,
} from './forms'
import { FormDraftActionModule, FormStepModule } from './forms/wizard'
import { RichTextModule } from './richText'
import { TextModule } from './text'

function metadata(entryId: string, presetId?: string) {
  return {
    entryId: creatorSignalCatalogueEntryId(entryId),
    entryVersion: '1.0.0',
    ...(presetId ? { presetId } : {}),
  }
}

function patternNode(
  key: string,
  moduleId: string,
  defaults: Record<string, unknown>,
  props: Record<string, unknown> = {},
  children: string[] = [],
  entryId?: string,
  presetId?: string,
): ComponentLibraryPatternNode {
  return {
    key,
    moduleId,
    props: { ...defaults, ...props },
    children,
    ...(entryId ? { catalogueInstance: metadata(entryId, presetId) } : {}),
  }
}

function definition(
  id: string,
  nodes: ComponentLibraryPatternNode[],
  authorableNodeKeys: string[],
  rootKey = 'root',
): ComponentLibraryPatternDefinition {
  return { id, rootKey, nodes, authorableNodeKeys }
}

function textNode(
  key: string,
  text: string,
  tag: 'p' | 'h2' | 'legend' = 'p',
): ComponentLibraryPatternNode {
  return patternNode(
    key,
    TextModule.id,
    TextModule.defaults,
    { text, tag },
    [],
    tag === 'h2' ? 'base.heading' : 'base.plain-text',
  )
}

function fieldGroup(
  key: string,
  control: 'checkbox' | 'radio',
  input: {
    fieldId: string
    name: string
    value: string
    label: string
  },
): ComponentLibraryPatternNode[] {
  const controlModule = control === 'checkbox' ? CheckboxModule : RadioModule
  const entryId = control === 'checkbox' ? 'base.checkbox' : 'base.radio'
  return [
    patternNode(
      key,
      ContainerModule.id,
      ContainerModule.defaults,
      { tag: 'div' },
      [`${key}.label`, `${key}.control`],
      'base.form-field-group',
    ),
    patternNode(
      `${key}.label`,
      LabelModule.id,
      LabelModule.defaults,
      {
        text: input.label,
        targetMode: 'explicit',
        targetId: input.fieldId,
      },
      [],
      'base.form-label',
    ),
    patternNode(
      `${key}.control`,
      controlModule.id,
      controlModule.defaults,
      {
        fieldId: input.fieldId,
        name: input.name,
        value: input.value,
      },
      [],
      entryId,
    ),
  ]
}

export const PANEL = definition(
  'base.pattern.form-panel',
  [
    patternNode(
      'root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'form-panel', tag: 'section', label: 'Form section' },
      ['title', 'description', 'fields'],
    ),
    textNode('title', 'Section title', 'h2'),
    textNode('description', 'Explain what information belongs in this section.'),
    patternNode(
      'fields',
      ContainerModule.id,
      ContainerModule.defaults,
      { tag: 'div' },
      [],
      'base.container',
    ),
  ],
  ['title', 'description', 'fields'],
)

export const FORM_ACCORDION = definition(
  'base.pattern.form-accordion',
  [
    patternNode(
      'root',
      AccordionModule.id,
      AccordionModule.defaults,
      { label: 'Form sections' },
      ['section-1', 'section-2'],
    ),
    patternNode(
      'section-1',
      AccordionItemModule.id,
      AccordionItemModule.defaults,
      { title: 'First section', open: true },
      ['section-1.fields'],
      'base.accordion-item',
    ),
    patternNode(
      'section-1.fields',
      ContainerModule.id,
      ContainerModule.defaults,
      { tag: 'div' },
      [],
      'base.container',
    ),
    patternNode(
      'section-2',
      AccordionItemModule.id,
      AccordionItemModule.defaults,
      { title: 'Second section' },
      ['section-2.fields'],
      'base.accordion-item',
    ),
    patternNode(
      'section-2.fields',
      ContainerModule.id,
      ContainerModule.defaults,
      { tag: 'div' },
      [],
      'base.container',
    ),
  ],
  ['section-1', 'section-2'],
)

export const FORM_TABS = definition(
  'base.pattern.form-tabs',
  [
    patternNode(
      'root',
      TabsModule.id,
      TabsModule.defaults,
      {
        label: 'Form sections',
        orientation: 'horizontal',
        activation: 'automatic',
      },
      ['tab-1', 'tab-2'],
    ),
    patternNode(
      'tab-1',
      TabPanelModule.id,
      TabPanelModule.defaults,
      { tabId: 'first', label: 'First section', selected: true },
      ['tab-1.fields'],
      'base.tab-panel',
    ),
    patternNode(
      'tab-1.fields',
      ContainerModule.id,
      ContainerModule.defaults,
      { tag: 'div' },
      [],
      'base.container',
    ),
    patternNode(
      'tab-2',
      TabPanelModule.id,
      TabPanelModule.defaults,
      { tabId: 'second', label: 'Second section', selected: false },
      ['tab-2.fields'],
      'base.tab-panel',
    ),
    patternNode(
      'tab-2.fields',
      ContainerModule.id,
      ContainerModule.defaults,
      { tag: 'div' },
      [],
      'base.container',
    ),
  ],
  ['tab-1', 'tab-2'],
)

export const CHECKBOX_GROUP = definition(
  'base.pattern.checkbox-group',
  [
    patternNode(
      'root',
      ContainerModule.id,
      ContainerModule.defaults,
      { tag: 'custom', customTag: 'fieldset' },
      ['legend', 'option-1', 'option-2'],
    ),
    textNode('legend', 'Choose all that apply', 'legend'),
    ...fieldGroup('option-1', 'checkbox', {
      fieldId: 'choice-one',
      name: 'choices',
      value: 'one',
      label: 'First choice',
    }),
    ...fieldGroup('option-2', 'checkbox', {
      fieldId: 'choice-two',
      name: 'choices',
      value: 'two',
      label: 'Second choice',
    }),
  ],
  ['legend', 'option-1', 'option-2'],
)

export const RADIO_GROUP = definition(
  'base.pattern.radio-group',
  [
    patternNode(
      'root',
      ContainerModule.id,
      ContainerModule.defaults,
      { tag: 'custom', customTag: 'fieldset' },
      ['legend', 'option-1', 'option-2'],
    ),
    textNode('legend', 'Choose one option', 'legend'),
    ...fieldGroup('option-1', 'radio', {
      fieldId: 'radio-one',
      name: 'radio-choice',
      value: 'one',
      label: 'First option',
    }),
    ...fieldGroup('option-2', 'radio', {
      fieldId: 'radio-two',
      name: 'radio-choice',
      value: 'two',
      label: 'Second option',
    }),
  ],
  ['legend', 'option-1', 'option-2'],
)

export const PREVIOUS_NEXT_ACTIONS = definition(
  'base.pattern.previous-next-actions',
  [
    patternNode(
      'root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'form-actions', tag: 'div' },
      ['actions'],
    ),
    patternNode(
      'actions',
      ContainerModule.id,
      ContainerModule.defaults,
      { tag: 'div' },
      ['previous', 'next'],
      'base.form-actions',
    ),
    patternNode(
      'previous',
      FormDraftActionModule.id,
      FormDraftActionModule.defaults,
      { action: 'previous-step', label: 'Previous' },
      [],
      'base.previous-step',
      'previous-step',
    ),
    patternNode(
      'next',
      FormDraftActionModule.id,
      FormDraftActionModule.defaults,
      { action: 'next-step', label: 'Next' },
      [],
      'base.next-step',
      'next-step',
    ),
  ],
  ['actions'],
)

export const SUMMARY_REVIEW = definition(
  'base.pattern.form-summary-review',
  [
    patternNode(
      'root',
      FormStepModule.id,
      FormStepModule.defaults,
      { stepId: 'review', title: 'Review your answers', review: true },
      ['title', 'summary', 'actions'],
    ),
    textNode('title', 'Review your answers', 'h2'),
    patternNode(
      'summary',
      ContainerModule.id,
      ContainerModule.defaults,
      { tag: 'div' },
      [],
      'base.container',
    ),
    patternNode(
      'actions',
      ContainerModule.id,
      ContainerModule.defaults,
      { tag: 'div' },
      ['previous', 'submit'],
      'base.form-actions',
    ),
    patternNode(
      'previous',
      FormDraftActionModule.id,
      FormDraftActionModule.defaults,
      { action: 'previous-step', label: 'Previous' },
      [],
      'base.previous-step',
      'previous-step',
    ),
    patternNode(
      'submit',
      SubmitModule.id,
      SubmitModule.defaults,
      { action: 'submit', label: 'Confirm and submit' },
      [],
      'base.submit',
    ),
  ],
  ['title', 'summary', 'actions'],
)

export const TERMS = definition(
  'base.pattern.terms-and-conditions',
  [
    patternNode(
      'root',
      ComponentFrameModule.id,
      ComponentFrameModule.defaults,
      { kind: 'terms-and-conditions', tag: 'section', label: 'Terms and conditions' },
      ['content', 'consent', 'version'],
    ),
    patternNode(
      'content',
      RichTextModule.id,
      RichTextModule.defaults,
      {
        html:
          '<h2>Terms and conditions</h2><p>Link to or include the approved versioned terms.</p>',
      },
      [],
      'base.rich-text',
    ),
    patternNode(
      'consent',
      ContainerModule.id,
      ContainerModule.defaults,
      { tag: 'div' },
      ['consent.label', 'consent.checkbox'],
      'base.form-field-group',
    ),
    patternNode(
      'consent.label',
      LabelModule.id,
      LabelModule.defaults,
      {
        text: 'I agree to the terms and conditions',
        targetMode: 'explicit',
        targetId: 'terms-agreement',
      },
      [],
      'base.form-label',
    ),
    patternNode(
      'consent.checkbox',
      CheckboxModule.id,
      CheckboxModule.defaults,
      {
        fieldId: 'terms-agreement',
        name: 'termsAgreement',
        value: 'accepted',
        required: true,
      },
      [],
      'base.checkbox',
    ),
    patternNode(
      'version',
      InputModule.id,
      InputModule.defaults,
      {
        inputType: 'hidden',
        fieldId: 'terms-version',
        name: 'termsVersion',
        value: '1.0',
      },
      [],
      'base.hidden-field',
    ),
  ],
  ['content', 'consent'],
)

export const WIZARD = definition(
  'base.pattern.form-wizard',
  [
    patternNode(
      'root',
      FormModule.id,
      FormModule.defaults,
      {
        mode: 'cms',
        formId: 'wizard',
        draftMode: 'persistent',
        draftTtlDays: 30,
      },
      ['step-1', 'review'],
    ),
    patternNode(
      'step-1',
      FormStepModule.id,
      FormStepModule.defaults,
      { stepId: 'details', title: 'Your details', review: false },
      ['step-1.fields', 'step-1.actions'],
      'base.form-step',
    ),
    patternNode(
      'step-1.fields',
      ContainerModule.id,
      ContainerModule.defaults,
      { tag: 'div' },
      [],
      'base.container',
    ),
    patternNode(
      'step-1.actions',
      ContainerModule.id,
      ContainerModule.defaults,
      { tag: 'div' },
      ['step-1.next'],
      'base.form-actions',
    ),
    patternNode(
      'step-1.next',
      FormDraftActionModule.id,
      FormDraftActionModule.defaults,
      { action: 'next-step', label: 'Next' },
      [],
      'base.next-step',
      'next-step',
    ),
    patternNode(
      'review',
      FormStepModule.id,
      FormStepModule.defaults,
      { stepId: 'review', title: 'Review your answers', review: true },
      ['review.summary', 'review.actions'],
      'base.form-step',
    ),
    patternNode(
      'review.summary',
      ContainerModule.id,
      ContainerModule.defaults,
      { tag: 'div' },
      [],
      'base.container',
    ),
    patternNode(
      'review.actions',
      ContainerModule.id,
      ContainerModule.defaults,
      { tag: 'div' },
      ['review.previous', 'review.submit'],
      'base.form-actions',
    ),
    patternNode(
      'review.previous',
      FormDraftActionModule.id,
      FormDraftActionModule.defaults,
      { action: 'previous-step', label: 'Previous' },
      [],
      'base.previous-step',
      'previous-step',
    ),
    patternNode(
      'review.submit',
      SubmitModule.id,
      SubmitModule.defaults,
      { action: 'submit', label: 'Submit' },
      [],
      'base.submit',
    ),
  ],
  ['step-1.fields', 'review.summary'],
)

export const BUILT_IN_FORM_COMPONENT_LIBRARY_PATTERNS:
readonly ComponentLibraryPatternDefinition[] = [
  PANEL,
  FORM_ACCORDION,
  FORM_TABS,
  CHECKBOX_GROUP,
  RADIO_GROUP,
  PREVIOUS_NEXT_ACTIONS,
  SUMMARY_REVIEW,
  TERMS,
  WIZARD,
]

for (const pattern of BUILT_IN_FORM_COMPONENT_LIBRARY_PATTERNS) {
  componentLibraryPatternRegistry.registerOrReplace(pattern)
}
