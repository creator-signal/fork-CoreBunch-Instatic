# Component Library

The Component Library registry defines the author-facing identity, taxonomy, constraints and dependency health of governed components.

The registry is metadata over Instatic's existing modules, Visual Components, patterns and templates. It does not render pages or introduce another document model.

---

## TL;DR

- `src/core/component-library/schemas.ts` is the source of truth for entry metadata.
- Every entry declares one implementation type: Primitive, Visual Component, Pattern, Template component or Capability-backed.
- IDs are stable and namespaced; entry versions are semantic versions.
- Presets and variants store approved values and continue to reference one canonical implementation.
- `ComponentLibraryRegistry` validates every registration, rejects accidental duplicates and provides deterministic ordering.
- `filterComponentLibraryEntries` is the shared search and taxonomy filter.
- `resolveComponentLibraryAvailability` exposes only dependency IDs and health, never provider settings or credentials.
- The built-in catalogue is explicit in `src/modules/base/componentLibrary.ts`; it is not inferred from every registered HTML module.
- Components view opens a searchable, filterable catalogue and stamps library identity on the inserted backing node in the same undo transaction.
- The registry does not own page trees, rendering, component instances or plugin lifecycle.

## Architecture

```text
module / Visual Component / pattern / template
                    │
                    │ referenced by
                    ▼
       ComponentLibraryEntry metadata
                    │
        ┌───────────┼────────────┐
        ▼           ▼            ▼
     registry     query     availability
        │           │            │
        └───────────┴────────────┘
                    │
                    ▼
         editor catalogue surfaces
```

| Responsibility | Source |
|---|---|
| TypeBox schemas and derived types | `src/core/component-library/schemas.ts` |
| Boundary validation and cross-field invariants | `src/core/component-library/definition.ts` |
| Registration and subscriptions | `src/core/component-library/registry.ts` |
| Search, filters and deterministic ordering | `src/core/component-library/query.ts` |
| Capability/provider/plugin health | `src/core/component-library/availability.ts` |
| Retained versions, migration paths and impact previews | `src/core/component-library/version.ts`, `migration.ts` |
| Explicit built-in definitions | `src/modules/base/componentLibrary.ts` |
| Catalogue dialog and Components projection | `src/admin/pages/site/panels/LayersPanel/` |
| Canonical backing-node insertion | `src/admin/pages/site/hooks/useInsertComponentLibraryEntry.ts` |
| Public imports | `src/core/component-library/index.ts` |

External consumers import through `@core/component-library`.

## Entry contract

`ComponentLibraryEntrySchema` validates the complete registry shape:

```ts
import type { ComponentLibraryEntry } from '@core/component-library'

const emailInput: ComponentLibraryEntry = {
  id: 'base.email-input',
  version: '1.0.0',
  name: 'Email Input',
  description: 'Collects an email address.',
  category: 'Forms',
  tags: ['form', 'email'],
  icon: 'mail',
  source: { type: 'built-in' },
  status: 'stable',
  implementation: {
    type: 'primitive',
    moduleId: 'base.input',
    presetId: 'email',
  },
  fields: [
    { key: 'label', label: 'Label', type: 'text', required: true },
  ],
  variants: [],
  presets: [
    {
      id: 'email',
      name: 'Email',
      values: { inputType: 'email' },
    },
  ],
  slots: [],
  constraints: {
    allowedParentEntryIds: ['base.form-container'],
    allowedChildEntryIds: [],
  },
  requirements: {
    capabilities: [],
    providerAdapters: [],
    plugins: [],
  },
  documentation: {
    usage: 'Use for email addresses.',
    accessibility: 'Keep a visible label.',
  },
}
```

The definition carries authoring identity and governance metadata. The referenced module, Visual Component, pattern or template remains the rendering implementation.

An omitted parent, child or slot allow-list means unrestricted. A present empty allow-list means none are permitted. This preserves the difference between an unconstrained container and a deliberately closed boundary.

### Implementation taxonomy

| Type | Registry reference |
|---|---|
| `primitive` | Namespaced module ID and optional preset ID |
| `visual-component` | Existing Visual Component ID |
| `pattern` | Namespaced pattern definition ID |
| `template-component` | Template role such as header or footer |
| `capability-backed` | One backing implementation plus at least one capability, provider adapter or plugin requirement |

Capability-backed entries cannot register without a real dependency. This keeps incomplete UI-only entries out of the available catalogue.

### Sources and lifecycle status

`source.type` is one of `built-in`, `site`, `design-system` or `plugin`. Design-system and plugin sources carry their stable owner ID so editor surfaces can identify ownership.

`status` is `stable`, `experimental` or `deprecated`. A deprecated entry may name `replacementEntryId`; it cannot replace itself.

## Registration

Use the singleton for application registrations:

```ts
import {
  componentLibraryRegistry,
  type ComponentLibraryEntry,
} from '@core/component-library'

componentLibraryRegistry.register(emailInput)
```

`register()` validates the TypeBox shape and cross-field invariants. It rejects a duplicate ID. Use `registerOrReplace()` only for an intentional definition update such as a plugin lifecycle transition.

`generation()` and `subscribe()` provide the same external-store integration shape as the module registry in `src/core/module-engine/registry.ts`. A registration, replacement or removal increments the generation once.

`list()` sorts by category, display name and stable ID. Registration order and plugin activation timing therefore do not change catalogue presentation.

`registerOrReplace()` also retains each validated semantic version. `getVersion()` and `listVersions()` expose those retained definitions for pinned instances, migration previews and rollback. Removing an entry or its owning source removes its retained versions too, so uninstall checks must inspect active usages first.

### Built-in entries

`src/modules/base/componentLibrary.ts` registers the curated authoring catalogue during base-module startup. Each entry names its canonical module, author-facing fields, optional preset, constraints, usage and accessibility guidance. The list includes structural, content, action, media and form entries, with separate approved presets for each input type.

Registration is deliberately explicit. A low-level HTML module can remain available in HTML view without automatically becoming a governed Component Library entry.

## Search and filtering

`filterComponentLibraryEntries()` searches:

- stable ID, name, description, category and tags;
- field keys, labels and descriptions;
- variant and preset IDs, names and descriptions;
- slot IDs, names and descriptions.

Multiple search terms use AND semantics. Taxonomy filters cover category, implementation type, source and lifecycle status. Every result set uses the same deterministic ordering as the registry.

The **Components** Layers view exposes this query through the add button beside component-layer search. The dialog presents category chips plus implementation, source and lifecycle filters. Selecting an entry shows its stable ID and version, author fields, slots, preset, dependency health, usage and accessibility notes.

Primitive and Visual Component implementations can be inserted into the active page or Visual Component canvas. Primitive preset values merge over the module defaults. The store writes `catalogueInstance.entryId`, `entryVersion` and optional `presetId` on the backing node atomically with insertion, so undo removes both content and identity together. Pattern materialization and template-role placement remain disabled until their canonical factories exist; the picker does not synthesize partial content.

### Governed Properties

The selected Layers projection governs the Properties surface:

- **Components** renders `ComponentPropertiesView`. It shows only fields declared by the retained library definition, approved presets and variants, slot contracts, lifecycle state, usage guidance and accessibility guidance.
- **HTML** retains the existing module settings, ClassPicker, CSS sections and raw Attributes surface.
- Custom / Freeform content and instances whose retained definition is unavailable stay intact but are read-only in Components view. Advanced users receive an explicit route to HTML view.

Governance is also enforced at the mutation seam. `updateComponentLibraryField()` rejects keys not declared by the instance's retained definition. `applyComponentLibraryOption()` resolves the approved values inside the store and applies those values plus the preset or variant identity in one undoable mutation; the UI cannot submit an arbitrary option payload.

## Versioning and migration

Every persisted catalogue instance carries a semantic `entryVersion`. It may also carry `pinnedVersion` while an administrator deliberately retains an older definition, and `variantId` when an approved variant was applied.

Runtime transforms register with `ComponentLibraryMigrationRegistry` as directed, increasing edges:

```ts
componentLibraryMigrationRegistry.register({
  entryId: 'site.notice',
  fromVersion: '1.0.0',
  toVersion: '2.0.0',
  migrate: (data) => ({
    ...data,
    props: { ...data.props, dismissible: false },
  }),
})
```

`migrateComponentLibraryInstance()` finds a complete path, clones the source data, runs every transform and validates the final preset and variant against the target definition. A missing path, pinned instance, thrown transform or invalid output returns an actionable failure without mutating the source node.

`findComponentLibraryUsages()` scans both page and Visual Component trees. `planComponentLibraryMigration()` combines those usages with detached migration results to produce changed, unchanged and failed impact groups suitable for an administrator preview. It does not apply writes. Components Layers rows surface missing definitions, required migrations, pins, newer-than-installed versions and invalid presets or variants.

## Dependency health

`resolveComponentLibraryAvailability()` compares an entry's requirements with `ComponentLibraryDependencyState`:

```ts
const availability = resolveComponentLibraryAvailability(entry, {
  capabilities: { 'forms.attachments': 'available' },
  providerAdapters: { 'scanner.clamav': 'degraded' },
  plugins: {},
})
```

Missing dependency IDs resolve to `unavailable`. Any unavailable dependency makes the entry unavailable; otherwise a degraded dependency makes it degraded. The result contains only dependency kind, ID and health.

Provider credentials, settings and secret values never enter the Component Library registry.

## Forbidden patterns

- Do not store rendered HTML in a library entry.
- Do not create a second component-only page tree.
- Do not duplicate a module or Visual Component implementation for each preset or variant.
- Do not register a capability-backed entry without a named platform dependency.
- Do not bypass `parseComponentLibraryEntry()` at an untyped registration boundary.
- Do not use registration order as presentation order.
- Do not auto-register every module as a governed authoring component.
- Do not write catalogue identity after insertion in a second history transaction.
- Do not route Components Properties controls through unrestricted module-prop patches.
- Do not mutate live nodes while calculating a migration or impact preview.
- Do not skip semantic versions or invent an implicit migration across an unregistered gap.
- Do not include provider credentials or secret configuration in requirements or availability.
- Do not import internal files from outside the module; use `@core/component-library`.

## Related

- `docs/features/modules.md` — the primitive rendering implementation.
- `docs/features/visual-components.md` — reusable governed structures and slots.
- `docs/features/templates.md` — template-owned site chrome.
- `docs/reference/typebox-patterns.md` — boundary validation.
- Source-of-truth files: `src/core/component-library/`
- Focused tests: `src/__tests__/component-library/componentLibraryRegistry.test.ts`
