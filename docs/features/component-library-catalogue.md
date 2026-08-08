# Built-in Component Library catalogue

This document is the traceability matrix for the complete default catalogue in
issue #11. The registry IDs are stable authoring identities. They point to
canonical modules, Visual Components, patterns or template roles; they do not
store copied rendered HTML.

All mapped authoring identities use the `creator-signal.site.catalogue.*`
namespace. Canonical engine modules, Visual Components and patterns retain
their internal `base.*` implementation IDs.

The executable matrix is
`src/__tests__/component-library/componentLibraryCatalogueCoverage.test.ts`.
The registered definitions are assembled in
`src/modules/base/componentLibrary.ts`.

## Template, structure and navigation

| Author entry | Registry ID | Taxonomy | Canonical implementation |
|---|---|---|---|
| Header | `creator-signal.site.catalogue.template-header` | Template component | Template role `header` |
| Footer | `creator-signal.site.catalogue.template-footer` | Template component | Template role `footer` |
| Skip Link | `creator-signal.site.catalogue.template-skip-link` | Template component | Template role `skip-link` |
| Container / Section | `creator-signal.site.catalogue.section` | Primitive | `base.container`, Section preset |
| Columns / Grid | `creator-signal.site.catalogue.grid` | Pattern | `base.pattern.grid` |
| Navigation | `creator-signal.site.catalogue.navigation` | Visual Component | `base.vc.navigation` |
| Language Navigation | `creator-signal.site.catalogue.language-navigation` | Capability-backed | `base.loop`, configured-locales preset |
| Breadcrumb | `creator-signal.site.catalogue.breadcrumb` | Visual Component | `base.vc.breadcrumb` |
| Table of Contents | `creator-signal.site.catalogue.table-of-contents` | Visual Component | `base.vc.table-of-contents` |
| Reusable Section | `creator-signal.site.catalogue.reusable-section` | Visual Component | `base.vc.reusable-section` |

Header, Footer and Skip Link are opened and edited through their owning
template. They are not freely inserted into an ordinary page.

## Editorial content

| Author entry | Registry ID | Taxonomy | Canonical implementation |
|---|---|---|---|
| Title / Heading | `creator-signal.site.catalogue.heading` | Primitive | `base.text`, Heading preset |
| Rich Text | `creator-signal.site.catalogue.rich-text` | Primitive | `base.rich-text` |
| Plain Text | `creator-signal.site.catalogue.plain-text` | Primitive | `base.text`, Paragraph preset |
| Code / Preformatted Text | `creator-signal.site.catalogue.code-block` | Primitive | `base.code-block` |
| Image | `creator-signal.site.catalogue.image` | Primitive | `base.image` |
| Button | `creator-signal.site.catalogue.button` | Primitive | `base.button` |
| Text Link | `creator-signal.site.catalogue.link` | Primitive | `base.link` |
| Separator / Divider | `creator-signal.site.catalogue.separator` | Primitive | semantic `base.separator` horizontal rule |
| Table | `creator-signal.site.catalogue.table` | Visual Component | `base.vc.table` over `base.table` |
| Download | `creator-signal.site.catalogue.download` | Visual Component | `base.vc.download` |
| Progress Bar | `creator-signal.site.catalogue.progress-bar` | Visual Component | `base.vc.progress-bar` |
| Notice / Callout | `creator-signal.site.catalogue.notice` | Visual Component | `base.vc.notice` |
| Hero | `creator-signal.site.catalogue.hero` | Visual Component | `base.vc.hero` |
| Teaser | `creator-signal.site.catalogue.teaser` | Visual Component | `base.vc.teaser` |
| Card | `creator-signal.site.catalogue.card` | Visual Component | `base.vc.card` |
| Card Grid | `creator-signal.site.catalogue.card-grid` | Pattern | `base.pattern.card-grid` |
| List | `creator-signal.site.catalogue.list` | Pattern | `base.pattern.list` over `base.loop` |
| Accordion | `creator-signal.site.catalogue.accordion` | Visual Component | `base.vc.accordion` over native disclosure modules |
| Tabs | `creator-signal.site.catalogue.tabs` | Visual Component | `base.vc.tabs` over the shared Tabs runtime |
| Carousel | `creator-signal.site.catalogue.carousel` | Visual Component | `base.vc.carousel` |
| Structured Content | `creator-signal.site.catalogue.structured-content` | Capability-backed | single-record `base.loop` preset |
| Structured Content List | `creator-signal.site.catalogue.structured-content-list` | Capability-backed | record-collection `base.loop` preset |
| Shared Content Fragment | `creator-signal.site.catalogue.shared-content-fragment` | Capability-backed | content-fragment `base.loop` preset |
| Media | `creator-signal.site.catalogue.media` | Visual Component | `base.vc.media` over hosted audio/video modules |
| Gallery | `creator-signal.site.catalogue.gallery` | Pattern | `base.pattern.gallery` |

Reusable Section owns shared layout. Structured Content selects one routed CMS
record and a display definition. Shared Content Fragment maps centrally managed
content into a compatible slot without owning layout. Structured Content List
queries multiple records through the shared collection contract.

The Media definition has Audio and Hosted video variants. Native controls are
retained; audio supports a transcript link and hosted video supports a captions
track. Provider-hosted video remains behind an approved provider adapter rather
than bypassing consent and CSP policy.

## Forms

| Author entry | Registry ID | Taxonomy | Canonical implementation |
|---|---|---|---|
| Form Container | `creator-signal.site.catalogue.form-container` | Primitive | `base.form` |
| Panel | `creator-signal.site.catalogue.form-panel` | Pattern | `base.pattern.form-panel` |
| Form Accordion | `creator-signal.site.catalogue.form-accordion` | Pattern | `base.pattern.form-accordion` |
| Form Tabs | `creator-signal.site.catalogue.form-tabs` | Pattern | `base.pattern.form-tabs`, orientation variant |
| Wizard | `creator-signal.site.catalogue.wizard` | Capability-backed pattern | `base.pattern.form-wizard` |
| Reusable Form Fragment | `creator-signal.site.catalogue.reusable-form-fragment` | Visual Component | `base.vc.reusable-form-fragment` |
| Text Input | `creator-signal.site.catalogue.text-input` | Primitive preset | `base.input`, text preset |
| Email Input | `creator-signal.site.catalogue.email-input` | Primitive preset | `base.input`, email preset |
| Telephone Input | `creator-signal.site.catalogue.telephone-input` | Primitive preset | `base.input`, tel preset |
| URL Input | `creator-signal.site.catalogue.url-input` | Primitive preset | `base.input`, URL preset |
| Number Input | `creator-signal.site.catalogue.number-input` | Primitive preset | `base.input`, number preset |
| Date Input / Date Picker | `creator-signal.site.catalogue.date-input` | Primitive preset | `base.input`, date preset |
| Text Area | `creator-signal.site.catalogue.text-area` | Primitive | `base.textarea` |
| Dropdown List | `creator-signal.site.catalogue.select` | Primitive | `base.select` |
| Checkbox | `creator-signal.site.catalogue.checkbox` | Primitive | `base.checkbox` |
| Checkbox Group | `creator-signal.site.catalogue.checkbox-group` | Pattern | `base.pattern.checkbox-group` |
| Radio Button Group | `creator-signal.site.catalogue.radio-group` | Pattern | `base.pattern.radio-group` |
| Switch | `creator-signal.site.catalogue.switch` | Primitive preset | `base.checkbox`, Switch preset |
| Hidden Field | `creator-signal.site.catalogue.hidden-field` | Primitive preset | `base.input`, Hidden preset |
| File Attachment | `creator-signal.site.catalogue.file-attachment` | Capability-backed | private scanned `base.input` file preset |
| Terms and Conditions | `creator-signal.site.catalogue.terms-and-conditions` | Capability-backed pattern | versioned consent pattern |
| CAPTCHA | `creator-signal.site.catalogue.captcha` | Capability-backed | `base.provider-embed`, provider-neutral contract |
| Submit Button | `creator-signal.site.catalogue.submit` | Primitive | `base.submit`, submit action |
| Reset Button | `creator-signal.site.catalogue.reset-button` | Primitive preset | `base.submit`, reset action |
| Save Draft Action | `creator-signal.site.catalogue.save-draft` | Capability-backed | `base.form-draft-action` |
| Previous / Next Actions | `creator-signal.site.catalogue.previous-next-actions` | Pattern | `base.pattern.previous-next-actions` |
| Summary / Review | `creator-signal.site.catalogue.form-summary-review` | Pattern | `base.pattern.form-summary-review` |

Form fields use the same CMS-native form modules and runtime. Their stable field
ID is also the rendered control ID and the fallback submission name, so labels,
help, errors, draft recovery and reusable-fragment prefixes share one identity.

## Design-system and reusable patterns

| Author entry | Registry ID | Taxonomy | Canonical implementation |
|---|---|---|---|
| Icon | `creator-signal.site.catalogue.icon` | Visual Component | `base.vc.icon` over the approved icon module |
| Icon List | `creator-signal.site.catalogue.icon-list` | Pattern | `base.pattern.icon-list` |
| Badge | `creator-signal.site.catalogue.badge` | Visual Component | `base.vc.badge` |
| Quote / Testimonial | `creator-signal.site.catalogue.quote` | Visual Component | `base.vc.quote` |
| Statistics | `creator-signal.site.catalogue.statistics` | Pattern | `base.pattern.statistics` |
| Logo Cloud | `creator-signal.site.catalogue.logo-cloud` | Pattern | `base.pattern.logo-cloud` |
| Person Profile | `creator-signal.site.catalogue.person-profile` | Visual Component | `base.vc.person-profile` |
| Timeline | `creator-signal.site.catalogue.timeline` | Pattern | `base.pattern.timeline` |
| Steps | `creator-signal.site.catalogue.steps` | Pattern | `base.pattern.steps` |
| Comparison Table | `creator-signal.site.catalogue.comparison-table` | Pattern | `base.pattern.comparison-table` |
| FAQ List | `creator-signal.site.catalogue.faq-list` | Pattern | `base.pattern.faq` |
| Empty State | `creator-signal.site.catalogue.empty-state` | Pattern | `base.pattern.empty-state` |
| Modal / Dialog | `creator-signal.site.catalogue.dialog` | Visual Component | `base.vc.dialog` over the overlay runtime |
| Drawer | `creator-signal.site.catalogue.drawer` | Visual Component | `base.vc.drawer` over the overlay runtime |

## Discovery and embeds

| Author entry | Registry ID | Taxonomy | Canonical implementation |
|---|---|---|---|
| Search | `creator-signal.site.catalogue.search` | Capability-backed | Search Results `base.loop` preset |
| Embed | `creator-signal.site.catalogue.embed` | Capability-backed | `base.provider-embed`, selected adapter |
| Form Embed | `creator-signal.site.catalogue.form-embed` | Capability-backed | `base.provider-embed`, one height variant |
| PDF Viewer | `creator-signal.site.catalogue.pdf-viewer` | Visual Component | `base.vc.pdf-viewer` |
| Map | `creator-signal.site.catalogue.map` | Capability-backed | `base.provider-embed`, OpenStreetMap adapter |
| Share Links | `creator-signal.site.catalogue.share-links` | Capability-backed | privacy-preserving `base.loop` source |

Form Embed is registered once. Responsive, fixed and content-driven height are
variants on that one entry. Pagination is not registered as a component; it is
configuration on List, Search, Card Grid, Gallery and Structured Content List.

## Capability gates

Capability-backed entries are intentionally unavailable when the dependency is
not reported healthy. A catalogue card or renderer is not evidence that an
operational capability is enabled.

| Capability or adapter | Entries | Required completion outside catalogue metadata |
|---|---|---|
| `localization.locales` | Language Navigation | locale configuration, fallback and current-locale source |
| `content.structured` | Structured Content, Structured Content List, Shared Content Fragment | record/fragment selection, field mapping and authorised data source |
| `search.index` | Search | published index, query route, security and degraded-state health |
| `forms.attachments` | File Attachment | private storage, validation, scanning, references and retention |
| `forms.drafts` | Save Draft, Wizard | recovery identity, persistence, retention, conflicts and schema migration |
| `forms.versioned-consent` | Terms and Conditions | immutable terms version and recorded consent metadata |
| `forms.captcha` plus `captcha.hcaptcha` | CAPTCHA | server verification and accessible provider failure |
| `embeds.provider` | Embed | allow-listed adapter, consent, CSP, sandbox and fallback policy |
| `forms.embed` | Form Embed | approved form adapter, height policy, focus and success behavior |
| `sharing.links` | Share Links | approved networks and page-metadata/privacy policy |
| `maps.openstreetmap` | Map | provider health, consent and ordinary-text location fallback |

Unknown capability IDs resolve to unavailable. The editor blocks insertion and
shows the stable dependency ID; it never exposes credentials or secret
configuration.

## Supporting entries

The built-in registry also contains authoring building blocks such as Tab Panel,
Accordion Item, form field groups, labels, help, errors and option entries.
They are constrained children of the catalogue rows above rather than
additional top-level promises. `creator-signal.site.catalogue.semantic-list` remains the canonical
simple semantic-list primitive used inside patterns, while the author-facing
List entry is the shared collection Pattern.
