# Plain Text Component Showcase

This optional starter plugin is the first end-to-end component reference. It is
deliberately separate from product starter sites and focuses on the governed
Plain Text entry (`base.plain-text`) until its complete author workflow works.

The six pages cover insertion and properties, semantic elements, composition,
hard line breaks and escaping, accessibility guidance, styles and publishing.
Every visible text sample has real `catalogueInstance` metadata, so Components
view and Component Properties use the same definition as normal authoring.

The independent catalogue can add other components as similarly focused
showcases without coupling their acceptance to this starter.

The manifest requests `visualComponents.register` because that is Instatic's
site-pack import gate for pages, classes, layouts and Visual Components. This
starter does not register a new Visual Component.

Build it with:

```sh
bun run instatic-plugin build integrations/component-showcase
```

For a clean isolated Docker installation, set
`INSTATIC_BOOTSTRAP_PLUGIN_PACKAGE=/app/starter-plugins/component-showcase.plugin.zip`.
Use a new Compose project/volume because bootstrap imports a starter only into
a new site.
