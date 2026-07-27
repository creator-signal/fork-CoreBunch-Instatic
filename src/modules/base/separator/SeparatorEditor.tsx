import type { ModuleComponentProps } from '@core/module-engine'

type SeparatorProps = Record<string, unknown> & {
  style: 'solid' | 'dashed' | 'dotted'
  width: 'content' | 'wide' | 'full'
  colorToken: string
  spacing: 'compact' | 'normal' | 'spacious'
}

export function SeparatorEditor({
  mcClassName,
  nodeWrapperProps,
  props,
}: ModuleComponentProps<SeparatorProps>) {
  return (
    <hr
      {...nodeWrapperProps}
      className={mcClassName}
      data-separator-style={props.style}
      data-separator-width={props.width}
      data-separator-color={props.colorToken}
      data-separator-spacing={props.spacing}
    />
  )
}
