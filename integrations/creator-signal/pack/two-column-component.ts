import { defineComponent, h } from '@core/plugin-sdk'

const componentId = 'creator-signal.site/component/two-column-layout'
const siteClass = (name: string) => `creator-signal.site/site/${name}`

export const twoColumnSlotIds = {
  left: 'left',
  right: 'right',
} as const

export const twoColumnComponent = defineComponent(
  componentId,
  'Two Column Layout',
  () => h.container({
    tag: 'section',
    classIds: [siteClass('two-column-layout')],
  }, [
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
  ]),
)

export default twoColumnComponent
