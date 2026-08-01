import type { ModuleDefinition } from '@core/module-engine'
import { registry } from '@core/module-engine'
import { Type, Value, type Static } from '@core/utils/typeboxHelpers'
import { SendSolidIcon } from 'pixel-art-icons/icons/send-solid'
import {
  FormDraftActionEditor,
  FormStepEditor,
} from './WizardControls'

const FormStepPropsSchema = Type.Object({
  stepId: Type.String({ default: 'step' }),
  title: Type.String({ default: 'Form step' }),
  review: Type.Boolean({ default: false }),
})
type FormStepProps = Static<typeof FormStepPropsSchema>

const FormDraftActionPropsSchema = Type.Object({
  action: Type.Union([
    Type.Literal('save-draft'),
    Type.Literal('delete-draft'),
    Type.Literal('next-step'),
    Type.Literal('previous-step'),
  ], { default: 'save-draft' }),
  label: Type.String({ default: 'Save draft' }),
  disabled: Type.Boolean({ default: false }),
})
type FormDraftActionProps = Static<typeof FormDraftActionPropsSchema>

export const FormStepModule: ModuleDefinition<FormStepProps> = {
  id: 'base.form-step',
  name: 'Form Step',
  description: 'A progressively enhanced step in a recoverable form wizard.',
  category: 'Forms',
  version: '1.0.0',
  icon: SendSolidIcon,
  trusted: true,
  canHaveChildren: true,
  schema: {
    stepId: { type: 'text', label: 'Step ID', normalize: 'identifier' },
    title: { type: 'text', label: 'Step title' },
    review: { type: 'toggle', label: 'Review step' },
  },
  propsSchema: FormStepPropsSchema,
  defaults: Value.Create(FormStepPropsSchema),
  component: FormStepEditor,
  htmlTag: 'section',
  render: (props, children) => ({
    html: `<section data-instatic-form-step="${escapeHtml(props.stepId)}"`
      + `${props.review ? ' data-instatic-form-review="true"' : ''}`
      + ` aria-label="${escapeHtml(props.title)}">${children.join('')}</section>`,
  }),
}

export const FormDraftActionModule: ModuleDefinition<FormDraftActionProps> = {
  id: 'base.form-draft-action',
  name: 'Form Draft Action',
  description: 'Saves, deletes or navigates a recoverable form draft.',
  category: 'Forms',
  version: '1.0.0',
  icon: SendSolidIcon,
  trusted: true,
  canHaveChildren: false,
  schema: {
    action: { type: 'select', label: 'Action', options: [
      { label: 'Save draft', value: 'save-draft' },
      { label: 'Delete draft', value: 'delete-draft' },
      { label: 'Next step', value: 'next-step' },
      { label: 'Previous step', value: 'previous-step' },
    ] },
    label: { type: 'text', label: 'Label' },
    disabled: { type: 'toggle', label: 'Disabled' },
  },
  propsSchema: FormDraftActionPropsSchema,
  defaults: Value.Create(FormDraftActionPropsSchema),
  component: FormDraftActionEditor,
  htmlTag: 'button',
  render: (props) => ({
    html: `<button type="button" data-instatic-draft-action="${props.action}"`
      + `${props.disabled ? ' disabled' : ''}>${escapeHtml(props.label)}</button>`,
  }),
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

registry.registerOrReplace(FormStepModule)
registry.registerOrReplace(FormDraftActionModule)
