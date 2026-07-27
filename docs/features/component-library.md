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
  presets: [],
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

## Search and filtering

`filterComponentLibraryEntries()` searches:

- stable ID, name, description, category and tags;
- field keys, labels and descriptions;
- variant and preset IDs, names and descriptions;
- slot IDs, names and descriptions.

Multiple search terms use AND semantics. Taxonomy filters cover category, implementation type, source and lifecycle status. Every result set uses the same deterministic ordering as the registry.

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
- Do not include provider credentials or secret configuration in requirements or availability.
- Do not import internal files from outside the module; use `@core/component-library`.

## Related

- `docs/features/modules.md` — the primitive rendering implementation.
- `docs/features/visual-components.md` — reusable governed structures and slots.
- `docs/features/templates.md` — template-owned site chrome.
- `docs/reference/typebox-patterns.md` — boundary validation.
- Source-of-truth files: `src/core/component-library/`
- Focused tests: `src/__tests__/component-library/componentLibraryRegistry.test.ts`
