import type { ModuleDefinition } from '@core/module-engine'
import { registry } from '@core/module-engine'
import { Value } from '@core/utils/typeboxHelpers'
import { ChartSolidIcon } from 'pixel-art-icons/icons/chart-solid'
import { ProgressEditor } from './ProgressEditor'
import { ProgressPropsSchema, type ProgressStoredProps } from './props'
import { normalizeProgress } from './values'

export const ProgressModule: ModuleDefinition<ProgressStoredProps> = {
  id: 'base.progress',
  name: 'Progress',
  description: 'A labelled native progress indicator.',
  category: 'Content',
  version: '1.0.0',
  icon: ChartSolidIcon,
  trusted: true,
  canHaveChildren: false,

  schema: {
    value: { type: 'number', label: 'Value', min: 0 },
    maximum: { type: 'number', label: 'Maximum', min: 1 },
    label: { type: 'text', label: 'Label' },
    showValue: { type: 'toggle', label: 'Show percentage' },
  },

  propsSchema: ProgressPropsSchema,
  defaults: Value.Create(ProgressPropsSchema),
  component: ProgressEditor,
  htmlTag: 'div',
  render: (props) => {
    const progress = normalizeProgress(props.value, props.maximum)
    const percent = Math.round((progress.value / progress.maximum) * 100)
    return {
      html:
        `<div><span>${props.label}</span>` +
        `<progress value="${progress.value}" max="${progress.maximum}">${percent}%</progress>` +
        `${props.showValue ? `<span aria-hidden="true">${percent}%</span>` : ''}</div>`,
    }
  },
}

registry.registerOrReplace(ProgressModule)
