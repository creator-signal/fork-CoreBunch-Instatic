import type { ModuleComponentProps } from '@core/module-engine'

type FormStepProps = Record<string, unknown> & {
  stepId: string
  title: string
  review: boolean
}

type FormDraftActionProps = Record<string, unknown> & {
  action: 'save-draft' | 'delete-draft' | 'next-step' | 'previous-step'
  label: string
  disabled: boolean
}

export function FormStepEditor({
  children,
  mcClassName,
  nodeWrapperProps,
  props,
}: ModuleComponentProps<FormStepProps>) {
  return (
    <section
      {...nodeWrapperProps}
      className={mcClassName}
      data-instatic-form-step={props.stepId}
      data-instatic-form-review={props.review ? 'true' : undefined}
      aria-label={props.title}
    >
      {children}
    </section>
  )
}

export function FormDraftActionEditor({
  mcClassName,
  nodeWrapperProps,
  props,
}: ModuleComponentProps<FormDraftActionProps>) {
  return (
    <button
      {...nodeWrapperProps}
      className={mcClassName}
      type="button"
      disabled={props.disabled}
      data-instatic-draft-action={props.action}
    >
      {props.label}
    </button>
  )
}
