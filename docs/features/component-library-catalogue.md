# Built-in Component Library catalogue

This document is the traceability matrix for the complete default catalogue in
issue #11. The registry IDs are stable authoring identities. They point to
canonical modules, Visual Components, patterns or template roles; they do not
store copied rendered HTML.

The executable matrix is
`src/__tests__/component-library/componentLibraryCatalogueCoverage.test.ts`.
The registered definitions are assembled in
`src/modules/base/componentLibrary.ts`.

## Template, structure and navigation

| Author entry | Registry ID | Taxonomy | Canonical implementation |
|---|---|---|---|
| Header | `base.template-header` | Template component | Template role `header` |
| Footer | `base.template-footer` | Template component | Template role `footer` |
| Skip Link | `base.template-skip-link` | Template component | Template role `skip-link` |
| Container / Section | `base.section` | Primitive | `base.container`, Section preset |
| Columns / Grid | `base.grid` | Pattern | `base.pattern.grid` |
| Navigation | `base.navigation` | Visual Component | `base.vc.navigation` |
| Language Navigation | `base.language-navigation` | Capability-backed | `base.loop`, configured-locales preset |
| Breadcrumb | `base.breadcrumb` | Visual Component | `base.vc.breadcrumb` |
| Table of Contents | `base.table-of-contents` | Visual Component | `base.vc.table-of-contents` |
| Reusable Section | `base.reusable-section` | Visual Component | `base.vc.reusable-section` |

Header, Footer and Skip Link are opened and edited through their owning
template. They are not freely inserted into an ordinary page.

## Editorial content

| Author entry | Registry ID | Taxonomy | Canonical implementation |
|---|---|---|---|
| Title / Heading | `base.heading` | Primitive | `base.text`, Heading preset |
| Rich Text | `base.rich-text` | Primitive | `base.rich-text` |
| Plain Text | `base.plain-text` | Primitive | `base.text`, Paragraph preset |
| Code / Preformatted Text | `base.code-block` | Primitive | `base.code-block` |
| Image | `base.image` | Primitive | `base.image` |
| Button | `base.button` | Primitive | `base.button` |
| Text Link | `base.link` | Primitive | `base.link` |
| Separator / Divider | `base.separator` | Primitive | semantic `base.separator` horizontal rule |
| Table | `base.table` | Visual Component | `base.vc.table` over `base.table` |
| Download | `base.download` | Visual Component | `base.vc.download` |
| Progress Bar | `base.progress-bar` | Visual Component | `base.vc.progress-bar` |
| Notice / Callout | `base.notice` | Visual Component | `base.vc.notice` |
| Hero | `base.hero` | Visual Component | `base.vc.hero` |
| Teaser | `base.teaser` | Visual Component | `base.vc.teaser` |
| Card | `base.card` | Visual Component | `base.vc.card` |
| Card Grid | `base.card-grid` | Pattern | `base.pattern.card-grid` |
| List | `base.list` | Pattern | `base.pattern.list` over `base.loop` |
| Accordion | `base.accordion` | Visual Component | `base.vc.accordion` over native disclosure modules |
| Tabs | `base.tabs` | Visual Component | `base.vc.tabs` over the shared Tabs runtime |
| Carousel | `base.carousel` | Visual Component | `base.vc.carousel` |
| Structured Content | `base.structured-content` | Capability-backed | single-record `base.loop` preset |
| Structured Content List | `base.structured-content-list` | Capability-backed | record-collection `base.loop` preset |
| Shared Content Fragment | `base.shared-content-fragment` | Capability-backed | content-fragment `base.loop` preset |
| Media | `base.media` | Visual Component | `base.vc.media` over hosted audio/video modules |
| Gallery | `base.gallery` | Pattern | `base.pattern.gallery` |

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
| Form Container | `base.form-container` | Primitive | `base.form` |
| Panel | `base.form-panel` | Pattern | `base.pattern.form-panel` |
| Form Accordion | `base.form-accordion` | Pattern | `base.pattern.form-accordion` |
| Form Tabs | `base.form-tabs` | Pattern | `base.pattern.form-tabs`, orientation variant |
| Wizard | `base.wizard` | Capability-backed pattern | `base.pattern.form-wizard` |
| Reusable Form Fragment | `base.reusable-form-fragment` | Visual Component | `base.vc.reusable-form-fragment` |
| Text Input | `base.text-input` | Primitive preset | `base.input`, text preset |
| Email Input | `base.email-input` | Primitive preset | `base.input`, email preset |
| Telephone Input | `base.telephone-input` | Primitive preset | `base.input`, tel preset |
| URL Input | `base.url-input` | Primitive preset | `base.input`, URL preset |
| Number Input | `base.number-input` | Primitive preset | `base.input`, number preset |
| Date Input / Date Picker | `base.date-input` | Primitive preset | `base.input`, date preset |
| Text Area | `base.text-area` | Primitive | `base.textarea` |
| Dropdown List | `base.select` | Primitive | `base.select` |
| Checkbox | `base.checkbox` | Primitive | `base.checkbox` |
| Checkbox Group | `base.checkbox-group` | Pattern | `base.pattern.checkbox-group` |
| Radio Button Group | `base.radio-group` | Pattern | `base.pattern.radio-group` |
| Switch | `base.switch` | Primitive preset | `base.checkbox`, Switch preset |
| Hidden Field | `base.hidden-field` | Primitive preset | `base.input`, Hidden preset |
| File Attachment | `base.file-attachment` | Capability-backed | private scanned `base.input` file preset |
| Terms and Conditions | `base.terms-and-conditions` | Capability-backed pattern | versioned consent pattern |
| CAPTCHA | `base.captcha` | Capability-backed | `base.provider-embed`, provider-neutral contract |
| Submit Button | `base.submit` | Primitive | `base.submit`, submit action |
| Reset Button | `base.reset-button` | Primitive preset | `base.submit`, reset action |
| Save Draft Action | `base.save-draft` | Capability-backed | `base.form-draft-action` |
| Previous / Next Actions | `base.previous-next-actions` | Pattern | `base.pattern.previous-next-actions` |
| Summary / Review | `base.form-summary-review` | Pattern | `base.pattern.form-summary-review` |

Form fields use the same CMS-native form modules and runtime. Their stable field
ID is also the rendered control ID and the fallback submission name, so labels,
help, errors, draft recovery and reusable-fragment prefixes share one identity.

## Design-system and reusable patterns

| Author entry | Registry ID | Taxonomy | Canonical implementation |
|---|---|---|---|
| Icon | `base.icon` | Visual Component | `base.vc.icon` over the approved icon module |
| Icon List | `base.icon-list` | Pattern | `base.pattern.icon-list` |
| Badge | `base.badge` | Visual Component | `base.vc.badge` |
| Quote / Testimonial | `base.quote` | Visual Component | `base.vc.quote` |
| Statistics | `base.statistics` | Pattern | `base.pattern.statistics` |
| Logo Cloud | `base.logo-cloud` | Pattern | `base.pattern.logo-cloud` |
| Person Profile | `base.person-profile` | Visual Component | `base.vc.person-profile` |
| Timeline | `base.timeline` | Pattern | `base.pattern.timeline` |
| Steps | `base.steps` | Pattern | `base.pattern.steps` |
| Comparison Table | `base.comparison-table` | Pattern | `base.pattern.comparison-table` |
| FAQ List | `base.faq-list` | Pattern | `base.pattern.faq` |
| Empty State | `base.empty-state` | Pattern | `base.pattern.empty-state` |
| Modal / Dialog | `base.dialog` | Visual Component | `base.vc.dialog` over the overlay runtime |
| Drawer | `base.drawer` | Visual Component | `base.vc.drawer` over the overlay runtime |

## Discovery and embeds

| Author entry | Registry ID | Taxonomy | Canonical implementation |
|---|---|---|---|
| Search | `base.search` | Capability-backed | Search Results `base.loop` preset |
| Embed | `base.embed` | Capability-backed | `base.provider-embed`, selected adapter |
| Form Embed | `base.form-embed` | Capability-backed | `base.provider-embed`, one height variant |
| PDF Viewer | `base.pdf-viewer` | Visual Component | `base.vc.pdf-viewer` |
| Map | `base.map` | Capability-backed | `base.provider-embed`, OpenStreetMap adapter |
| Share Links | `base.share-links` | Capability-backed | privacy-preserving `base.loop` source |

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
additional top-level promises. `base.semantic-list` remains the canonical
simple semantic-list primitive used inside patterns, while the author-facing
List entry is the shared collection Pattern.
