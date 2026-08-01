import React from 'react'
import type { ModuleComponentProps } from '@core/module-engine'
import { normalizeProgress } from './values'
import type { ProgressStoredProps } from './props'

export const ProgressEditor: React.FC<
  ModuleComponentProps<ProgressStoredProps>
> = ({ props, mcClassName, nodeWrapperProps }) => {
  const progress = normalizeProgress(props.value, props.maximum)
  const percent = Math.round((progress.value / progress.maximum) * 100)
  return (
    <div {...nodeWrapperProps} className={mcClassName}>
      <span>{props.label}</span>
      <progress value={progress.value} max={progress.maximum}>
        {percent}%
      </progress>
      {props.showValue ? <span aria-hidden="true">{percent}%</span> : null}
    </div>
  )
}
