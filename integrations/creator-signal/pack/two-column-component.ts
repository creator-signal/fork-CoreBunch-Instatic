import { defineComponent, h } from '@core/plugin-sdk'
import { twoColumnLayoutShellId } from '../modules/site-components'

const componentId = 'creator-signal.site/component/two-column-layout'
const siteClass = (name: string) => `creator-signal.site/site/${name}`

export const twoColumnSlotIds = {
  left: 'left',
  right: 'right',
} as const

export const twoColumnComponent = defineComponent(
  componentId,
  'Two Column Layout',
  () => h.custom(twoColumnLayoutShellId, {}, {
    children: [
      h.container({
        classIds: [
          siteClass('two-column-layout-column'),
          siteClass('two-column-layout-left'),
        ],
      }, [
        h.custom('base.slot-outlet', { slotName: twoColumnSlotIds.left }),
      ]),
      h.container({
        classIds: [
          siteClass('two-column-layout-column'),
          siteClass('two-column-layout-right'),
        ],
      }, [
        h.custom('base.slot-outlet', { slotName: twoColumnSlotIds.right }),
      ]),
    ],
  }),
)

export default twoColumnComponent
