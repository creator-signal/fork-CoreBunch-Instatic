import { describe, expect, it } from 'bun:test'
import {
  twoColumnLayoutShell,
  twoColumnLayoutShellId,
} from '../../../integrations/creator-signal/modules/site-components'
import {
  twoColumnComponent,
  twoColumnSlotIds,
} from '../../../integrations/creator-signal/pack/two-column-component'

describe('Creator Signal Two Column Layout authoring contract', () => {
  it('owns the responsive stylesheet at the reusable component root', () => {
    const root = twoColumnComponent.tree.nodes[twoColumnComponent.tree.rootNodeId]!
    const columns = root.children.map((nodeId) => twoColumnComponent.tree.nodes[nodeId]!)
    const outlets = columns.map((column) => twoColumnComponent.tree.nodes[column.children[0]!]!)

    expect(root.moduleId).toBe(twoColumnLayoutShellId)
    expect(columns.map((column) => column.moduleId)).toEqual([
      'base.container',
      'base.container',
    ])
    expect(outlets.map((outlet) => outlet.moduleId)).toEqual([
      'base.slot-outlet',
      'base.slot-outlet',
    ])
    expect(outlets.map((outlet) => outlet.props.slotName)).toEqual([
      twoColumnSlotIds.left,
      twoColumnSlotIds.right,
    ])
  })

  it('publishes one semantic layout and previews its child outlet with the same CSS contract', () => {
    const published = twoColumnLayoutShell.render(
      twoColumnLayoutShell.defaults,
      ['<div>Left</div>', '<div>Right</div>'],
    )
    const preview = twoColumnLayoutShell.preview!(twoColumnLayoutShell.defaults, [])

    expect(published.html).toBe(
      '<section class="two-column-layout"><div>Left</div><div>Right</div></section>',
    )
    expect(published.css).toContain('.two-column-layout,')
    expect(preview.html).toBe('')
    expect(preview.css).toContain(
      `[data-plugin-module="${twoColumnLayoutShellId}"] > [data-plugin-children="true"]`,
    )
    expect(preview.css).toContain('grid-template-columns: minmax(0, .8fr) minmax(20rem, 1.2fr)')
  })
})
