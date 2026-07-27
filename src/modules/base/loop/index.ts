/**
 * base.loop — pluggable repeater that iterates a data source and renders
 * its child subtree(s) per item.
 *
 * Round-robin children: a loop with N children renders iteration `i`
 * with child `i mod N`. Two children alternate (1,2,1,2,…); three
 * children cycle (1,2,3,1,2,3…). Empty list of children renders nothing.
 *
 * Data comes from a registered `LoopEntitySource` (see
 * `src/core/loops/types.ts`). Built-ins are data.rows, site.pages,
 * site.media. Plugins can register more.
 *
 * The publisher's `renderLoop()` interceptor handles rendering — this
 * module's own `render()` is a no-op fallback. Same pattern as
 * `base.visual-component-ref`.
 *
 * Pagination is collection configuration, never a separate insertable module:
 * none, numbered, previous-next, load-more or cursor. The legacy persisted
 * value `infinite` remains accepted and normalizes to load-more.
 *
 * The wrapper element emitted around iterations is configurable via the
 * shared `htmlTag` helper (same controls as `base.container`): authors
 * can pick a built-in tag (div, ul, nav, …) or supply a custom name.
 * Default is 'div' so existing loops keep their current published HTML.
 */
import type { ModuleDefinition } from '@core/module-engine'
import { registry } from '@core/module-engine'
import { Type, Value, type Static } from '@core/utils/typeboxHelpers'
import { CollectionPaginationModeSchema } from '@core/collections'
import { BoxStackSolidIcon } from 'pixel-art-icons/icons/box-stack-solid'
import { resolveHtmlTag } from '@modules/base/utils/htmlTag'
import { LoopEditor } from './LoopEditor'

const LoopPropsSchema = Type.Object({
  sourceId: Type.String({ default: '' }),
  // filters is a free-form key→value bag: source plugins may store arbitrary
  // filter criteria. Type.Record with Unknown values is the most accurate
  // model; Value.Create yields {} which matches the runtime default.
  filters: Type.Record(Type.String(), Type.Unknown(), { default: {} }),
  orderBy: Type.String({ default: '' }),
  direction: Type.Union([Type.Literal('asc'), Type.Literal('desc')], { default: 'desc' }),
  limit: Type.Number({ default: 10 }),
  offset: Type.Number({ default: 0 }),
  query: Type.String({ default: '' }),
  pagination: Type.Union([
    CollectionPaginationModeSchema,
    Type.Literal('infinite'),
  ], { default: 'none' }),
  pageSize: Type.Number({ default: 10 }),
  tag: Type.String({ default: 'div' }),
  customTag: Type.String({ default: '' }),
})

type LoopProps = Static<typeof LoopPropsSchema>

export const LoopModule: ModuleDefinition<LoopProps> = {
  id: 'base.loop',
  name: 'Loop',
  description: 'Iterate a data source and repeat the child template per item.',
  category: 'Layout',
  version: '1.0.0',
  icon: BoxStackSolidIcon,
  trusted: true,
  canHaveChildren: true,

  // The publisher intercepts loop nodes with `renderLoop()` instead of the
  // standard walk — declared here so the dispatch is visible on the definition.
  publishBehavior: 'special',

  // Loop properties are NOT panel-edited via the generic schema renderer
  // because filterSchema is dynamic per source. The Properties Panel
  // branches on moduleId === 'base.loop' and renders LoopPropertiesView,
  // which itself renders the shared htmlTag controls.
  schema: {},

  propsSchema: LoopPropsSchema,
  defaults: Value.Create(LoopPropsSchema),

  component: LoopEditor,

  htmlTag: (props) => resolveHtmlTag(props.tag, props.customTag),

  /**
   * Defense-in-depth fallback: the publisher walker intercepts base.loop
   * nodes via `renderLoop()` in `render.ts` before this method is ever
   * called. This implementation is intentionally unreachable under
   * normal operation.
   */
  render: () => ({ html: '<!-- instatic: loop render fell through to default -->' }),
}

registry.registerOrReplace(LoopModule)
