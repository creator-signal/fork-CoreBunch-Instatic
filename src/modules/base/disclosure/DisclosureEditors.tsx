import type { ModuleComponentProps } from '@core/module-engine'

type TabsProps = Record<string, unknown> & {
  label: string
  orientation: 'horizontal' | 'vertical'
  activation: 'automatic' | 'manual'
}

type TabPanelProps = Record<string, unknown> & {
  tabId: string
  label: string
  selected: boolean
  disabled: boolean
}

type AccordionProps = Record<string, unknown> & {
  label: string
}

type AccordionItemProps = Record<string, unknown> & {
  title: string
  open: boolean
}

export function TabsEditor({
  children,
  mcClassName,
  nodeWrapperProps,
  props,
}: ModuleComponentProps<TabsProps>) {
  return (
    <div
      {...nodeWrapperProps}
      className={mcClassName}
      data-instatic-tabs=""
      data-instatic-tabs-orientation={props.orientation}
      data-instatic-tabs-activation={props.activation}
      aria-label={props.label || undefined}
    >
      {children}
    </div>
  )
}

export function TabPanelEditor({
  children,
  mcClassName,
  nodeWrapperProps,
  props,
}: ModuleComponentProps<TabPanelProps>) {
  return (
    <section
      {...nodeWrapperProps}
      className={mcClassName}
      data-instatic-tab-panel={props.tabId}
      data-instatic-tab-label={props.label}
      data-instatic-tab-selected={props.selected ? 'true' : undefined}
      data-instatic-tab-disabled={props.disabled ? 'true' : undefined}
      aria-label={props.label || undefined}
    >
      {children}
    </section>
  )
}

export function AccordionEditor({
  children,
  mcClassName,
  nodeWrapperProps,
  props,
}: ModuleComponentProps<AccordionProps>) {
  return (
    <div
      {...nodeWrapperProps}
      className={mcClassName}
      data-instatic-accordion=""
      aria-label={props.label || undefined}
    >
      {children}
    </div>
  )
}

export function AccordionItemEditor({
  children,
  mcClassName,
  nodeWrapperProps,
  props,
}: ModuleComponentProps<AccordionItemProps>) {
  return (
    <details
      {...nodeWrapperProps}
      className={mcClassName}
      data-instatic-accordion-item=""
      data-instatic-authored-open={props.open ? 'true' : 'false'}
      open
    >
      <summary>{props.title}</summary>
      {children}
    </details>
  )
}
