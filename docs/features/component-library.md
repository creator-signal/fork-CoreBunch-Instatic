# Component Library

The Component Library registry defines the author-facing identity, taxonomy, constraints and dependency health of governed components.

The registry is metadata over Instatic's existing modules, Visual Components, patterns and templates. It does not render pages or introduce another document model.

---

## TL;DR

- `src/core/component-library/schemas.ts` is the source of truth for entry metadata.
- Every entry declares one implementation type: Primitive, Visual Component, Pattern, Template component or Capability-backed.
- Creator Signal entries declare an authoring composition of `leaf` or
  `container`. A leaf cannot expose slots; ordered child-like data uses a typed
  repeater field instead.
- IDs are stable and namespaced; entry versions are semantic versions.
- Presets and variants store approved values and continue to reference one canonical implementation.
- `ComponentLibraryRegistry` validates every registration, rejects accidental duplicates and provides deterministic ordering.
- `filterComponentLibraryEntries` is the shared search and taxonomy filter.
- `resolveComponentLibraryAvailability` exposes only dependency IDs and health, never provider settings or credentials.
- Entry-specific accessibility contracts distinguish automated diagnostics,
  behavior tests and manual review; site policy alone selects publication
  blockers.
- `SiteSettings.publicAuthoring` optionally turns an integration catalogue
  into a fail-closed public surface. Sites without it remain freeform.
- The bundled Creator Signal catalogue is explicit in `src/modules/base/componentLibrary.ts`; it is not inferred from every registered HTML module.
- Components view opens a searchable, filterable catalogue and stamps library identity on the inserted backing node in the same undo transaction.
- Add to canvas lists governed non-form entries under Components, groups
  Structure entries as Layout, and gives all form entries their own Forms
  section.
- Insert → Components and the Components tree are catalogue-only. A raw Visual
  Component definition is an implementation asset and stays out of both
  surfaces until a site, design system or plugin registers an explicit entry.
- Catalogue result rows and inserter descriptions show the owning provider;
  the catalogue can also filter by the stable provider ID.
- The registry does not own page trees, rendering, component instances or plugin lifecycle.
- Page SEO settings remain a document-publisher concern: site defaults and the
  public origin live in General settings, while each page can govern search,
  robots, language-alternate, Open Graph and Twitter overrides. See
  [Component HTML and SEO contract](../reference/component-html-seo-contract.md#document-metadata).

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
| Descendant-aware, non-destructive slot-to-data upgrades | `src/core/component-library/treeMigration.ts` |
| Bundled Creator Signal definitions | `src/modules/base/componentLibrary.ts`, `componentLibraryForms.ts`, `componentLibraryVisualComponents.ts` |
| Complete downstream design-impact contract | `docs/features/component-library-design-impact-manifest.json` |
| Application-owned Visual Components | `src/core/visual-components-schema/registry.ts` |
| Pattern definitions and materialization | `src/core/component-library/patterns.ts`, `src/modules/base/componentLibraryPatterns.ts` |
| Catalogue dialog and Components projection | `src/admin/pages/site/panels/LayersPanel/` |
| Canonical backing-node insertion | `src/admin/pages/site/hooks/useInsertComponentLibraryEntry.ts` |
| Public imports | `src/core/component-library/index.ts` |

External consumers import through `@core/component-library`.

## Entry contract

`ComponentLibraryEntrySchema` validates the complete registry shape:

```ts
import type { ComponentLibraryEntry } from '@core/component-library'

const emailInput: ComponentLibraryEntry = {
  id: 'creator-signal.site.catalogue.email-input',
  version: '1.0.0',
  name: 'Email Input',
  description: 'Collects an email address.',
  category: 'Forms',
  tags: ['form', 'email'],
  icon: 'mail',
  source: {
    type: 'design-system',
    id: 'creator-signal.site',
    name: 'Creator Signal',
  },
  status: 'stable',
  composition: 'leaf',
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
    allowedParentEntryIds: ['creator-signal.site.catalogue.form-container'],
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

The mapped catalogue uses `creator-signal.site.catalogue.*` for its public
authoring IDs. Internal `base.*` module, Visual Component and pattern IDs stay
unchanged so the rendering engine keeps one canonical implementation identity.
Every mapped entry declares the `creator-signal.site` design-system source with
the author-facing provider name `Creator Signal`. The Components provider filter
and `site_list_component_library` MCP response read that same registry metadata.

An omitted document, parent, child or slot allow-list means unrestricted. A
present empty allow-list means none are permitted. `allowedDocumentKinds`
limits an entry to ordinary pages or templates, while
`maxInstancesPerDocument` prevents duplicate singleton chrome such as a shared
header. `src/core/component-library/placement.ts` applies these rules to the
picker, drag-and-drop, Agent/MCP insertion and server write validation. This
preserves the difference between an unconstrained container and a deliberately
closed boundary.

### Implementation taxonomy

| Type | Registry reference |
|---|---|
| `primitive` | Namespaced module ID and optional preset ID |
| `visual-component` | Existing Visual Component ID |
| `pattern` | Namespaced pattern definition ID |
| `template-component` | Template role such as header or footer |
| `capability-backed` | One backing implementation plus at least one capability, provider adapter or plugin requirement |

Capability-backed entries cannot register without a real dependency. This keeps incomplete UI-only entries out of the available catalogue.

### Leaf data and composition containers

`composition: 'leaf'` means the component owns its complete published HTML.
Its fields may include a `repeater`, which stores an ordered array of records
with declared text, URL, number, boolean and select properties. Navigation,
Breadcrumb, Table of Contents, Person Profile, Hero, Card/Teaser and Notice use
this model for links or actions. Authors edit the records in one component
properties surface; the renderer owns the list, anchor, button, accessibility
and structured-data markup.

`composition: 'container'` is reserved for genuine arbitrary composition.
Reusable Section, Accordion, Tabs, Carousel, Modal/Dialog, Drawer and Reusable
Form Fragment retain slots because their children are independently authored
components. Registration rejects a leaf that declares any slot.

### Sources and lifecycle status

`source.type` is one of `built-in`, `site`, `design-system` or `plugin`. Design-system and plugin sources carry their stable owner ID so editor surfaces can identify ownership.

`status` is `stable`, `experimental` or `deprecated`. A deprecated entry may name `replacementEntryId`; it cannot replace itself.

### Design-impact manifest

`component-library-design-impact-manifest.json` is the governed,
machine-readable projection for downstream design review. It is generated from
the complete built-in registry plus the selected Creator Signal plugin pack;
documentation is not scraped and rendered markup is not copied. Each record
retains the executable definition, real owner and implementation taxonomy,
dependency limitations, accessibility gates, a stable specimen contract
reference and any registry-owned rendered preview reference.

The manifest records the Instatic version, an executable-registry content
revision, selected plugin versions, the Component Library entry schema version
and the consumed Creator Signal design-system lock revision. Each entry has a
SHA-256 content hash and the complete manifest has a SHA-256 checksum. The
source revision deliberately hashes the executable registry content instead of
the Git commit containing the generated file, avoiding a self-referential
revision that would become stale as soon as it was committed.

Run `bun run component-library:design-impact` to regenerate the projection and
`bun run component-library:design-impact:check` in CI or release evidence. The
check fails on registry drift, duplicate identities, unresolved backing
implementations, missing ownership, unsupported schemas, invalid specimen
references or checksum/hash drift. Capability- and provider-backed entries
state their limitations explicitly; manifest presence is never runtime,
browser or provider acceptance evidence.

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

### Bundled Creator Signal entries

`src/modules/base/componentLibrary.ts` registers the curated authoring catalogue during base-module startup. Shared entry builders live in `componentLibraryDefinitions.ts`, and the form catalogue is split into `componentLibraryForms.ts`. Each entry names its canonical module, author-facing fields, optional preset, constraints, usage and accessibility guidance. The list includes structural, content, action, media and form entries, with separate approved presets for each input type.

Registration is deliberately explicit. A low-level HTML module can remain available in HTML view without automatically becoming a governed Component Library entry.

Shared authored structures such as Hero, Card, Navigation, Notice, Reusable
Section, Download and Progress Bar are application-owned Visual Components.
Their immutable definitions live in `componentLibraryVisualComponents.ts` and
are resolved through the same component-reference and publisher paths as
persistence paths as site-authored Visual Components. A site definition may
explicitly override a built-in ID; otherwise authors insert the built-in
definition without copying it into site data. Governed Properties write only
declared parameter overrides and approved variants, and component-only server
diff validation applies the same contract.

Leaf component version 2 definitions replace their former Link/Button slots
with typed repeaters. Load validation copies recognized legacy slot children
into the new records before slot reconciliation and then removes the obsolete
slot nodes. If a legacy subtree contains an unexpected module, the migration
rolls back and destructive reconciliation is skipped, preserving stored
content for explicit repair.

Modal / Dialog and Drawer share the `base.overlay` implementation rather than
forking focus and dismissal logic. Their unenhanced output is a native
`details` disclosure; the shared runtime adds a labelled modal boundary,
Escape and backdrop dismissal policy, Tab containment and trigger-focus
restoration. Carousel uses `base.carousel`: all slides are visible in document
order without JavaScript, while enhancement adds previous/next and arrow-key
navigation, polite position announcements and optional autoplay. Autoplay
pauses during pointer or focus interaction and does not start when the visitor
prefers reduced motion. Canvas previews keep overlay and slide content open so
the runtime cannot interfere with author selection.

Formatted editorial content uses three dedicated semantic primitives rather
than freeform HTML snippets. `base.rich-text` stores a DOMPurify-governed
rich-text value, `base.code-block` keeps code as escaped text with safe
language metadata, and `base.table` turns a small pipe-delimited authoring
model into captioned `thead`/`tbody` markup with explicit column and optional
row-header scopes. Each has one module renderer shared by canvas and
publisher.

External content uses capability-backed entries. YouTube Embed and Map share
the policy-validated `base.provider-embed` implementation while declaring
`media.youtube` and `maps.openstreetmap` requirements. The editor preview is
inert and the published iframe is consent-delayed. CAPTCHA declares both
`forms.captcha` and `captcha.hcaptcha`; it remains unavailable until protected
hCaptcha configuration and server-side response verification are implemented.
Self-hosted video remains the separate `base.media` entry.

Search Results is backed by `base.loop` plus the request-dependent
`search.pages` source. It requires `search.index`, stays unavailable until the
site enables published search, and reuses the shared collection renderer and
pagination contract. See [Published page search](site-search.md) for indexing,
visibility, freshness, query, security and degraded-state behavior.

File Attachment is backed by the file preset of `base.input` and requires
`forms.attachments`. `ComponentLibraryDialog.tsx` reads the authenticated
attachment health endpoint and keeps the entry unavailable until the operator
enables private storage and a scanner. Published forms upload only through the
quarantine/scan boundary described in
[File Attachments](file-attachments.md).

## Search and filtering

`filterComponentLibraryEntries()` searches:

- stable ID, name, description, category and tags;
- field keys, labels and descriptions;
- variant and preset IDs, names and descriptions;
- slot IDs, names and descriptions.

Multiple search terms use AND semantics. Taxonomy filters cover category, implementation type, source and lifecycle status. Every result set uses the same deterministic ordering as the registry.

The **Components** Layers view exposes this query through the add button beside component-layer search. The dialog presents category chips plus implementation, source and lifecycle filters. Selecting an entry shows its stable ID and version, author fields, slots, preset, dependency health, usage and accessibility notes.

When the active page is wrapped by templates, Components Layers uses the same outer-to-inner template chain as the canvas and publisher. Template-owned rows retain their source template, are always read-only in the consuming page, and are spliced around the active page at the first outlet in exact page order. Authors with structural permission get an explicit action to open the owning template; component-only authors can inspect the hierarchy but cannot navigate into or manipulate the protected source.

Plugins publish governed entries explicitly through `definePlugin({ componentLibrary })`; registering a canvas module by itself never adds an author-facing catalogue entry. The build emits declarative `component-library/entries.json`, and the manifest requests `componentLibrary.register`. Both editor and server validate the granted permission, entry schema, `<pluginId>.*` namespace, plugin source ownership, duplicates, and primitive backing-module availability before mutating the registry. Disable, uninstall, reload, upgrade and rollback paths remove or replace the owning plugin's entries as a unit.

Disable and uninstall first scan the persisted draft pages and Visual Components
for stamped `<pluginId>.*` catalogue instances. Any match returns HTTP 409 with
the affected entry, document and node IDs before plugin state, lifecycle hooks,
registry entries or files are changed. The scan does not rely on the live
registry, so it also protects corrupt or partially loaded plugins, and
`?force=true` bypasses faulty plugin hooks but never this data-integrity gate.
A currently available `replacementEntryId` is reported as remediation guidance;
the operation remains blocked until migration or conversion has actually
rewritten every old instance.

Primitive, Visual Component and Pattern implementations can be inserted into
the active page or Visual Component canvas. Primitive preset values merge over
module defaults. Visual Component references materialize their governed slots,
and Pattern definitions materialize fresh ordinary page-tree subtrees through
the registered canonical definition. The pattern root records its remapped
authorable region node IDs; duplication and paste remap those IDs again.
Insertion is one history transaction, so undo removes content and catalogue
identity together. Template-role placement remains unavailable in an ordinary
page canvas because template chrome is managed through the template workflow.

The editor's Components view is catalogue-identity driven. It stays empty until
an author inserts an item from this library. Imported/freeform nodes, raw Visual
Component references and raw slots remain available in HTML view but do not
become component rows merely because their module type can be inferred. A
catalogue-inserted Visual Component reference records `catalogueInstance`
metadata, so that instance and its governed slots do appear.

Built-in patterns cover Columns / Grid, Card Grid, Gallery, Icon List,
Statistics, Logo Cloud, Timeline, Steps, Comparison Table, FAQ List and Empty
State. They compose the shared primitives and Visual Components rather than
store rendered HTML. Authorable region nodes remain visible beneath the pattern
boundary in Components Layers, while implementation framing stays collapsed.
The component-only server boundary accepts only a registered materialization,
rejects tampered internal nodes and continues to allow declared fields on
governed authorable regions.

### Governed Properties

The selected Layers projection governs the Properties surface:

- **Components** renders `ComponentPropertiesView`. It shows only fields declared by the retained library definition, approved presets and variants, slot contracts, lifecycle state, usage guidance and accessibility guidance.
- **HTML** retains the existing module settings, ClassPicker, CSS sections and raw Attributes surface.
- Unmapped imported/freeform content stays intact but is omitted from the Components hierarchy; it remains available in HTML view. A persisted instance whose retained definition is unavailable stays visible and read-only because its catalogue identity proves that it is an actual component boundary.

Governance is also enforced at the mutation seam. `updateComponentLibraryField()` rejects keys not declared by the instance's retained definition. `applyComponentLibraryOption()` resolves the approved values inside the store and applies those values plus the preset or variant identity in one undoable mutation; the UI cannot submit an arbitrary option payload.

The first focused acceptance starter is
[Plain Text component](plain-text-component.md). Its six pages retain real
catalogue identity so insertion, Components projection, approved properties,
semantics, composition and publisher fidelity can be reviewed in one clean
installation.

The selected instance also exposes its accessibility contract and any current
automated diagnostics. Diagnostics carry the backing node, rule and
remediation. They remain advisory unless the site's
`settings.accessibility.blockingRuleIds` explicitly selects the rule; the
publisher runs the same analyser before any publish writes. See
[Component accessibility contracts](component-accessibility.md).

The `site.components.edit` capability is the narrow authoring boundary for this
surface. Without `site.structure.edit`, the editor forces Layers and Properties
to the Components projection and does not expose HTML/freeform controls. The
server independently validates page diffs: it accepts only valid governed
primitive insertion/removal/reordering, declared field changes, and preset or
variant metadata whose approved values move in the same request. Raw nodes,
catalogue identity changes, arbitrary props, bindings, classes and inline or
breakpoint styles still require their existing structural or style capability.

The browser-bridged MCP surface honours this same boundary. A connection with
`site.read` can search the live registry through
`site_list_component_library`; writes require both `ai.tools.write` and
`site.components.edit`. `site_insert_component`,
`site_update_component_field`, and `site_apply_component_option` reuse the
registry, placement policy, page-tree actions and retained definition version.
They include plugin-owned entries, reject undeclared fields, nested repeater
keys and option IDs, and
never publish implicitly. See [MCP connections](mcp-connectors.md).

`resolveComponentLibraryPlacement()` is the shared composition policy for
catalogue insertion, governed moves and server diff validation. It enforces an
entry's allowed parents, a parent's allowed children, named-slot entry and
implementation allow-lists, and slot maximum cardinality. The editor rejects
an invalid insertion before any history mutation and explains the violated
contract; the server re-evaluates the post-change tree independently.

Components Layers drag-and-drop moves the backing boundary node once, so
patterns and Visual Component instances carry their complete persisted subtree
without serialising or parsing markup. Drop targets first pass the ordinary
page-tree cycle/lock/slot rules and then the shared catalogue placement policy.
Freeform, missing and generated slot boundaries are not draggable; invalid
targets render a rejected state and produce the policy reason without writing
history. HTML Layers retains its existing independent drag-and-drop path.

### Freeform conversion

Unmapped freeform primitives are never rewritten automatically. They are not
invented as component rows. Structural authors may select one on the canvas
while using Components view and open a conversion preview when
`findComponentLibraryConversionCandidates()` finds a lossless match: the
backing module must match, hidden implementation props must already equal
module defaults or canonical preset values, and the node must not already have
catalogue identity. The preview lists the selected definition, mapped author
fields, retained child count and retained styling.

Confirmation calls `convertFreeformPrimitiveToComponent()`, which revalidates
the candidate inside the store and writes only `catalogueInstance` in one
undoable mutation. Props, children, classes, inline styles and breakpoint
overrides remain byte-for-byte unchanged; the publisher ignores authoring
identity, so rendered output is identical. Ineligible nodes remain freeform and
editable only through authorised HTML mode. Pattern and Visual Component
conversion require their later structure/slot mapping workflows and are not
silently approximated by this primitive path.

## Public-authoring policy

`src/core/page-tree/publicAuthoringPolicy.ts` defines the declarative policy
shape stored at `SiteSettings.publicAuthoring`. A plugin pack may install its
own policy through `definePack({ publicAuthoring })`; `server/plugins/pack.ts`
checks owner identity and reconciles the policy with the technical pack.
Normal shell writes cannot add, remove or weaken the policy.

`src/core/component-library/publicAuthoring.ts` is the shared analyser. It
validates current entry definitions and variants, exact pattern composition,
typed fields, component-owned appearance, protected template chrome, fixed
asset roles/treatments and semantic page-title/primary-action limits. Its
diagnostics always include a stable code, document path and remediation.

The same analyser is called from:

- `server/writePolicy/pageDiff.ts` for transactional page saves;
- `server/collab/updateGuard.ts` for Yjs page updates, including full writers
  when a policy is active;
- `server/publish/publishSite.ts` before any publish-side database or artefact
  write.

The shell guard in `server/writePolicy/siteDiff.ts` also prevents site-local
framework, font, breakpoint, style, file, dependency and runtime changes while
component-owned appearance is active. Pack-owned Visual Components listed by
the policy are immutable through both HTTP and collaborative authoring.

This is an opt-in site contract. An absent policy returns no diagnostics and
does not change ordinary Instatic authoring. Direct storage mutation is outside
the supported authoring API; the publisher still re-runs the complete policy
and refuses invalid trees or missing protected records.

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

Missing dependency IDs resolve to `unavailable`. Any unavailable dependency makes the entry unavailable; otherwise a degraded dependency makes it degraded. The result contains only dependency kind, ID and health. The Component Library detail pane lists each non-healthy dependency by kind and stable ID, summarizes the exact reason, and blocks insertion only when at least one requirement is unavailable. Degraded entries remain insertable with a visible warning.

Provider credentials, settings and secret values never enter the Component Library registry.

### Shared collections

List, Card Grid, Gallery, Search and Structured Content List consume the
schema-backed contract in `src/core/collections`. The contract owns
manual/dynamic sources, query/filter/sort inputs, pagination configuration,
load states, canonical URL state and accessible announcements; each catalogue
entry supplies only its item renderer and placement metadata. Pagination is
therefore never exposed as a standalone insertable catalogue entry. The
existing `base.loop` publisher remains the rendering and static/dynamic/hole
execution layer underneath the contract.

### Shared disclosure layouts

Tabs and Accordion are canonical interactive modules that can organize ordinary
content or CMS form groups. Tabs publish every panel as a readable
no-JavaScript fallback, then add the WAI-ARIA tab roles, roving focus and
keyboard activation through one deduplicated runtime. Accordion publishes
native `details` and `summary` elements and needs no runtime. Form validation
opens either boundary before focusing an invalid descendant.

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
- Do not special-case an integration in the editor, write handler or publisher;
  persist a declarative `SiteSettings.publicAuthoring` policy instead.

## Related

- `docs/features/modules.md` — the primitive rendering implementation.
- `docs/features/visual-components.md` — reusable governed structures and slots.
- `docs/features/templates.md` — template-owned site chrome.
- `docs/features/site-search.md` — published index and Search Results capability.
- `docs/features/file-attachments.md` — private form upload and scanner capability.
- `docs/features/component-library-catalogue.md` — complete issue #11 catalogue traceability matrix and capability gates.
- `docs/reference/component-html-seo-contract.md` — semantic HTML, structured data, SEO, native hooks and design-token contract for every built-in entry.
- `docs/reference/typebox-patterns.md` — boundary validation.
- Source-of-truth files: `src/core/component-library/`
- Focused tests: `src/__tests__/component-library/componentLibraryRegistry.test.ts`,
  `src/__tests__/plugins/creatorSignalPublicAuthoringGuardrails.test.ts`
