# Creator Signal Component Guide

This guide explains how to add reusable Creator Signal Visual Components to the Instatic plugin pack.

The Hero in `integrations/creator-signal/pack/hero-component.ts` is the reference
implementation. It uses typed instance parameters, the shared public design
system, and an image parameter that resolves through Instatic's configured
media storage.

---

## TL;DR

- Use a **Visual Component** for a reusable fixed tree with scalar parameters.
- Use a governed **pattern** for an approved multi-component page or section
  composition whose child components remain authorable after insertion.
- Use a governed **module component** for opinionated markup, repeatable typed
  data, runtime behaviour or external services.
- Only structural container components may expose child slots. Leaf components
  use scalar fields and repeaters.
- Build Visual Component trees with `defineComponent` and `h` from `@core/plugin-sdk`.
- Wrap the component tree in `base.body`.
- Give every component and parameter a stable, plugin-namespaced ID.
- Bind node properties to parameter IDs through `node.propBindings`.
- Reference compiled design-system class IDs, not unqualified CSS class names.
- Register the component in `definePack({ visualComponents: [...] })`.
- Register an explicit governed entry in `component-library.ts`; raw Visual
  Component definitions never appear in Insert → Components.
- Test the component shape, bindings, media behaviour, plugin build, and published output.

## Choose the right extension type

| Requirement | Instatic extension | Creator Signal example |
| --- | --- | --- |
| Reusable section with per-instance fields | Visual Component | `integrations/creator-signal/pack/hero-component.ts` |
| Opinionated section with repeatable data | Governed module component | `integrations/creator-signal/modules/site-components/index.ts` |
| Approved page/section composition | Component Library pattern | `integrations/creator-signal/component-library.ts` |
| Copyable structure intentionally allowed to diverge | Saved layout | Not used by the Creator Signal pack |
| Runtime JavaScript or an external integration | Module | `integrations/creator-signal/modules/mautic-form.ts` |
| Shared typography, colour, spacing, and responsive rules | Pack stylesheet | `integrations/creator-signal/pack/design-system.ts` |

The Hero is a Visual Component. The other public blocks are governed module
components so their typed properties can include repeaters while their HTML
structure remains consistent.

The public page and section patterns are registered beside those entries in
`component-library.ts`. Their stable IDs use
`creator-signal.site.pattern.*`, their roots record the catalogue instance,
and only their declared child component nodes are authorable. Route seeds use
the same registry materializer, so the Insert experience and installed site
cannot drift into separate structures.

The Home and Early Access compositions exercise the full module-component
model. Home uses Campaign Hero, Signal Strip, Signal Comparison, three Feature
Grids, Process Steps, Pricing Plans, Founder Story, FAQ and Call to Action to
implement the approved reference flow. Early Access uses Campaign Hero, Signal
Strip, typed Feature Grids, one Managed Form and a Testimonial. The catalogue
components are leaf components with no authored child slots; the stable
`home-v2-page` and `early-access-page` pattern roots provide their initial
order, which authors may then adjust.

## Hero component anatomy

`integrations/creator-signal/pack/hero-component.ts` builds this tree:

```text
base.body
└── section.hero-section
    ├── div.hero-copy
    │   ├── p.eyebrow
    │   ├── h1
    │   ├── p.hero-body
    │   └── div.actions
    │       └── base.button
    └── div.hero-art
        ├── base.image (optional authored artwork)
        └── div.signal-visual (production fallback)
            └── four decorative spans
```

The component exposes `Eyebrow`, `Heading`, `Introduction`, `Action label`,
`Action URL`, and `Artwork`. The first five bind to text or button properties.
`Artwork` binds to `base.image.props.src`.

An empty artwork value renders the governed Creator Signal mark from the locked
brand-asset pipeline. Selecting an image from the Media workspace supplies the
image value. The primary starter marketing routes use governed generated social
artwork rather than a synthetic placeholder. On the Creator Signal production
stack that upload and its generated variants use the MinIO adapter configured
in `server/media/minioStorageAdapter.ts`.

## Add a component

### 1. Create the component file

Place the component under `integrations/creator-signal/pack/`. Start with the
tree builder:

```ts
import { defineComponent, h } from '@core/plugin-sdk'

const component = defineComponent(
  'creator-signal.site/component/example',
  'Creator Signal Example',
  () => h.custom('base.body', {}, {
    children: [
      h.container({ tag: 'section' }, [
        h.text({ tag: 'h2', text: 'Example heading' }),
      ]),
    ],
  }),
)
```

The stored root is always `base.body`. The publisher treats that root as a
transparent structural anchor when a component instance is rendered.

### 2. Reuse the shared design system

Classes compiled from `integrations/creator-signal/pack/design-system.ts` use
IDs under `creator-signal.site/site/`. Visual Component nodes reference the
full class ID:

```ts
const siteClass = (name: string) => `creator-signal.site/site/${name}`

h.container({
  tag: 'section',
  classIds: [siteClass('content-section')],
})
```

Do not pass `content-section` by itself. A Visual Component stores class IDs,
whereas HTML compiled by `compilePackPages` starts with class names and links
them to IDs during compilation.

The token, typography, theme and brand values are owned by Sales Pulse and
consumed through `integrations/creator-signal/design-system/lock.json`. Add only
semantic `var(--cs-...)` declarations to the Instatic adapter. Do not copy a
hex value, font family or theme algorithm into a component stylesheet.

### 3. Add stable typed parameters

Parameter IDs survive display-name changes and are the binding contract:

```ts
const headingParamId =
  'creator-signal.site.example.heading'

component.params = [{
  id: headingParamId,
  name: 'Heading',
  type: 'string',
  description: 'Section heading.',
  defaultValue: 'Example heading',
  required: true,
}]
```

Supported types are defined by `VCParamType` in
`src/core/visualComponents/schemas.ts`: `string`, `number`, `boolean`, `url`,
`enum`, `color`, `image`, `richText`, and `slot`.

### 4. Bind parameters to node properties

Bindings point to parameter IDs:

```ts
const heading = Object.values(component.tree.nodes).find(
  (node) => node.props.text === 'Example heading',
)
if (!heading) throw new Error('Example component heading node is missing.')

heading.propBindings = {
  text: { paramId: headingParamId },
}
```

Keep a design-time default in `node.props`. At render time the component
instance value replaces that property, falling back to the parameter default
when the instance has no override.

Use a `base.slot-outlet` only when the Component Library entry is explicitly a
container. Navigation, cards, FAQs, calls to action, documents and other leaf
components use repeaters or rich-text fields and must remain slot-free. Slot
behaviour and synchronisation are defined in
`docs/features/visual-components.md`.

### 5. Register the implementation and authoring contract

Import the component in `integrations/creator-signal/pack/site.ts` and add it to
the one pack definition:

```ts
const pack = definePack({
  pluginId: 'creator-signal.site',
  visualComponents: [heroComponent, exampleComponent],
  pages: compiled.pages,
  conditions: compiled.conditions,
})
```

The plugin already requests `visualComponents.register` in
`integrations/creator-signal/instatic-plugin.config.ts`.

Next, add a `ComponentLibraryEntry` to
`integrations/creator-signal/component-library.ts`. This is the author-facing
contract: its field keys must exactly match the Visual Component parameter IDs.

```ts
export const exampleEntry: ComponentLibraryEntry = {
  id: 'creator-signal.site.example',
  version: '1.0.0',
  name: 'Creator Signal Example',
  description: 'A governed Creator Signal example section.',
  category: 'Creator Signal',
  tags: ['creator signal', 'example'],
  icon: 'layout-solid',
  source: {
    type: 'plugin',
    pluginId: 'creator-signal.site',
    name: 'Creator Signal',
  },
  status: 'stable',
  implementation: {
    type: 'visual-component',
    componentId: component.id,
  },
  fields: [{
    key: headingParamId,
    label: 'Heading',
    type: 'text',
    required: true,
  }],
  variants: [],
  presets: [],
  slots: [],
  constraints: {},
  requirements: {
    capabilities: [],
    providerAdapters: [],
    plugins: ['creator-signal.site'],
  },
  documentation: {
    usage: 'Explain where authors should use the component.',
    accessibility: 'Document the manual checks authors must complete.',
  },
}
```

Add the entry to `creatorSignalComponentLibraryEntries`. The plugin config
passes that list to `componentLibrary` and requests
`componentLibrary.register`. Instatic validates source ownership and prevents a
plugin from registering entries outside its namespace.

Always pass `compiled.conditions` with `compiled.pages`. This installs the
media, container, and feature-query registry referenced by compiled class
overrides. Omitting it leaves desktop styles intact but prevents responsive
`@media` rules from being emitted on the published site.

### 6. Add tests

Extend `src/__tests__/plugins/creatorSignalSitePack.test.ts` to verify:

- stable component ID and display name;
- expected parameter names, types, defaults, and required flags;
- every parameter has a matching `propBindings` entry;
- referenced class IDs exist in `pack.classes`;
- image parameters bind to a `base.image` property;
- required modules and governed entries remain registered;
- every leaf entry declares no slots; intentional containers declare named slots and tests prove their starter children resolve to governed entries.

Run the integration gates:

```sh
bun run creator-signal:design-system:check
bun test src/__tests__/plugins/creatorSignalSitePack.test.ts
bun run instatic-plugin lint integrations/creator-signal
bun run instatic-plugin build integrations/creator-signal
bun run build
bun test
bun run lint
```

## Use the Hero as an author

1. Install or re-sync the Creator Signal plugin from **Admin → Plugins**.
2. Open **Site** and choose the page to edit.
3. Insert **Creator Signal Hero** from the Components section.
   The **Creator Signal** source badge distinguishes it from built-in and other
   provider components; the provider filter can show only Creator Signal entries.
4. Select the component instance and edit its governed fields.
5. For **Artwork**, select or upload an image in the Media picker. The host
   stores it through the configured media adapter; Creator Signal production
   uses its site-specific MinIO bucket.
6. Preview desktop and mobile canvas breakpoints.
7. Publish the draft and verify the public route.

Component definition edits affect every instance. Instance parameter edits
affect only the selected reference.

## Forbidden patterns

| Pattern | Use instead |
| --- | --- |
| Random IDs generated when the plugin builds | Stable plugin-namespaced component and parameter IDs |
| Bare CSS names in `VisualComponent.tree.nodes[*].classIds` | Full compiled class IDs such as `creator-signal.site/site/hero-section` |
| A root element without `base.body` | `base.body` containing the rendered component root |
| Looking up instance values by parameter name | Bind and override by stable parameter ID |
| Exposing a raw Visual Component directly in Insert → Components | Register a governed `ComponentLibraryEntry` with an explicit owner and field contract |
| Hard-coded object-storage URLs | An `image` parameter bound to `base.image.props.src` |
| JavaScript embedded in a Visual Component | A registered module such as `integrations/creator-signal/modules/mautic-form.ts` |
| Rebuilding an approved page sequence from ad hoc containers | Insert the stable `creator-signal.site.pattern.*` entry |
| Editing generated `pack/site.json` | Edit TypeScript sources and rebuild the plugin |

## Related

- `integrations/creator-signal/pack/hero-component.ts` — reference component
- `integrations/creator-signal/component-library.ts` — governed authoring entries
- `integrations/creator-signal/pack/design-system.ts` — public design system
- `integrations/creator-signal/pack/site.ts` — governed starter pages and shared template
- `integrations/creator-signal/modules/site-components/index.ts` — opinionated leaf renderers
- `integrations/creator-signal/AUTHORING.md` — shared-template, route, component and visual-report reference
- `src/core/plugin-sdk/builders/tree.ts` — `defineComponent` and `h`
- `src/core/plugin-sdk/builders/definePack.ts` — pack registration
- `docs/features/visual-components.md` — component data model, slots, editor, and publisher
- `docs/features/media.md` — Media workspace and adapter-backed assets
- `src/__tests__/plugins/creatorSignalSitePack.test.ts` — pack regression gates
