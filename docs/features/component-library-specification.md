# Component Library specification

> Generated from the executable Component Library definitions. Do not edit
> this file directly; run `bun run component-library:spec` after changing
> a catalogue entry.

This specification covers all 101 registered built-in entries.
Each entry describes the author-facing contract independently of its rendered
HTML. The backing module, Visual Component, pattern or template role remains
the canonical implementation.

## Catalogue summary

| Category | Entries |
|---|---:|
| Template | 3 |
| Structure | 5 |
| Navigation | 5 |
| Editorial | 9 |
| Typography | 5 |
| Content | 6 |
| Design | 10 |
| Interactive | 10 |
| Media | 6 |
| Embed | 1 |
| Forms | 41 |

## Template

### Footer

Template-owned site footer, legal and supplementary navigation chrome.

- Registry ID: `base.template-footer`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: template-component
- Backing implementation: template role `footer`
- Search tags: footer, template, legal, site chrome

**Use when:** Open the owning template to configure the shared site footer.

**Accessibility intent:** Use one footer landmark and descriptive link-group headings.

#### Properties

This entry exposes no instance properties.

#### Dependencies

No additional platform dependency.

### Header

Template-owned site header and primary navigation chrome.

- Registry ID: `base.template-header`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: template-component
- Backing implementation: template role `header`
- Search tags: header, template, navigation, site chrome

**Use when:** Open the owning template to configure the shared site header.

**Accessibility intent:** Keep landmarks unique and identify navigation regions clearly.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `label` | Accessible label | text | Yes | No | Controls the accessible label used by this Header instance. |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific label value that explains the component's purpose. |

### Skip Link

Template-owned keyboard shortcut to the primary content region.

- Registry ID: `base.template-skip-link`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: template-component
- Backing implementation: template role `skip-link`
- Search tags: skip link, template, keyboard, accessibility

**Use when:** Configure one visible-on-focus skip link in the owning template.

**Accessibility intent:** Its target must exist and receive focus without obscuring content.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `label` | Label | text | Yes | No | Controls the label used by this Skip Link instance. |
| `target` | Target | text | Yes | No | Controls the target used by this Skip Link instance. |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific label value that explains the component's purpose. |

## Structure

### Columns / Grid

A responsive two-column authored layout.

- Registry ID: `base.grid`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: pattern
- Backing implementation: pattern `base.pattern.grid`
- Search tags: columns, grid, layout, responsive

**Use when:** Place governed content inside each declared column region.

**Accessibility intent:** Keep reading order meaningful when columns stack on narrow screens.

#### Properties

This entry exposes no instance properties.

#### Dependencies

No additional platform dependency.

### Container

A neutral content container with a controlled semantic element.

- Registry ID: `base.container`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.container`
- Search tags: container, layout, group

**Use when:** Group content when no more specific catalogue entry applies.

**Accessibility intent:** Choose a semantic element only when it matches the content purpose.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `tag` | Semantic element | select | Yes | No | The HTML element that describes the text meaning; visual typography belongs to classes. |

#### Dependencies

No additional platform dependency.

### Reusable Section

A centrally defined section frame with governed content.

- Registry ID: `base.reusable-section`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.reusable-section`
- Search tags: reusable, section, shared, layout

**Use when:** Provide shared structure while allowing explicitly governed slot content.

**Accessibility intent:** Name the section when its purpose is not clear from a visible heading.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `label` | Accessible label | text | No | No | Controls the accessible label used by this Reusable Section instance. |

#### Slots

| Slot | Purpose | Cardinality | Allowed content |
|---|---|---|---|
| `content` (Content) | Approved content for the reusable section. | 0–many | Any permitted entry |

#### Dependencies

No additional platform dependency.

### Section

A semantic section that groups related page content.

- Registry ID: `base.section`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.container` with preset `section`
- Search tags: section, layout, structure

**Use when:** Group content that belongs under one heading or purpose.

**Accessibility intent:** Give each major section an identifying heading.

#### Properties

This entry exposes no instance properties.

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `section` | Section | `{"tag":"section"}` |

#### Dependencies

No additional platform dependency.

### Separator / Divider

A semantic thematic break using approved width, colour and spacing tokens.

- Registry ID: `base.separator`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.separator`
- Search tags: separator, divider, rule, thematic break

**Use when:** Use only when a thematic change benefits from an explicit visual boundary.

**Accessibility intent:** The native horizontal-rule element exposes the semantic break without extra ARIA.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `style` | Style | select | Yes | No | Controls the style used by this Separator / Divider instance. |
| `width` | Width | select | Yes | No | Controls the width used by this Separator / Divider instance. |
| `colorToken` | Colour token | design-token | Yes | No | Controls the colour token used by this Separator / Divider instance. |
| `spacing` | Spacing | select | Yes | No | Controls the spacing used by this Separator / Divider instance. |

#### Dependencies

No additional platform dependency.

## Navigation

### Breadcrumb

An ordered navigation trail for the current page hierarchy.

- Registry ID: `base.breadcrumb`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.breadcrumb`
- Search tags: breadcrumb, navigation, hierarchy, trail

**Use when:** Place near the page start and order links from broadest to current context.

**Accessibility intent:** Use a distinct navigation label and identify the current page with aria-current.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `label` | Accessible label | text | Yes | No | Controls the accessible label used by this Breadcrumb instance. |

#### Slots

| Slot | Purpose | Cardinality | Allowed content |
|---|---|---|---|
| `items` (Links) | Ordered, descriptive links in the navigation sequence. | 1–many | `base.link` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific label value that explains the component's purpose. |
| `a11y.keyboard-contract` | behavior-test | warning | Breadcrumb links use native anchor navigation and visible focus. | Name every hierarchy level and mark the current destination in its link attributes. |

### Language Navigation

A locale switcher supplied by the configured localisation capability.

- Registry ID: `base.language-navigation`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: capability-backed
- Backing implementation: capability-backed module `base.loop` with preset `configured-locales`
- Search tags: language, locale, translation, navigation

**Use when:** Enable and configure localisation before adding the approved locale-link item renderer.

**Accessibility intent:** Use each language’s own name and identify the current locale without relying on colour.

#### Properties

This entry exposes no instance properties.

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `configured-locales` | Configured locales | `{"customTag":"","direction":"desc","filters":{},"itemRenderer":"children","limit":100,"manualItems":[],"offset":0,"orderBy":"","pageSize":10,"pagination":"none","query":"","sourceId":"localization.locales","sourceMode":"dynamic","tag":"nav"}` |

#### Dependencies

| Kind | Stable ID |
|---|---|
| Capability | `localization.locales` |

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | behavior-test | warning | The locale navigation and current language require clear programmatic names. | Name the navigation and expose the current locale on its selected link. |

### Navigation

A labelled navigation region with governed link content.

- Registry ID: `base.navigation`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.navigation`
- Search tags: navigation, menu, links, site

**Use when:** Use a distinct label when more than one navigation region appears on the page.

**Accessibility intent:** Keep link text descriptive and identify the current page where applicable.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `label` | Accessible label | text | Yes | No | Controls the accessible label used by this Navigation instance. |

#### Variants

| ID | Name | Applied values |
|---|---|---|
| `horizontal` | Horizontal | `{"orientation":"horizontal"}` |
| `vertical` | Vertical | `{"orientation":"vertical"}` |

#### Slots

| Slot | Purpose | Cardinality | Allowed content |
|---|---|---|---|
| `items` (Navigation items) | Links and approved supplementary actions. | 1–many | `base.link`, `base.button` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific label value that explains the component's purpose. |

### Share Links

Privacy-preserving share destinations supplied by an approved policy capability.

- Registry ID: `base.share-links`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: capability-backed
- Backing implementation: capability-backed module `base.loop` with preset `approved-networks`
- Search tags: share, social, links, privacy

**Use when:** Configure approved networks and metadata policy; no tracking script is loaded by this entry.

**Accessibility intent:** Use ordinary links with descriptive labels and announce any new-window behavior.

#### Properties

This entry exposes no instance properties.

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `approved-networks` | Approved networks | `{"customTag":"","direction":"desc","filters":{},"itemRenderer":"children","limit":20,"manualItems":[],"offset":0,"orderBy":"","pageSize":10,"pagination":"none","query":"","sourceId":"sharing.links","sourceMode":"dynamic","tag":"nav"}` |

#### Dependencies

| Kind | Stable ID |
|---|---|
| Capability | `sharing.links` |

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | behavior-test | warning | Share destinations require specific names and a labelled navigation region. | Include the destination network and sharing action in every link label. |

### Table of Contents

A labelled set of links to headings on the current page.

- Registry ID: `base.table-of-contents`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.table-of-contents`
- Search tags: table of contents, on this page, anchors, navigation

**Use when:** Use on long pages whose major sections have stable fragment identifiers.

**Accessibility intent:** Link text should match or clearly identify the destination heading.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `label` | Accessible label | text | Yes | No | Controls the accessible label used by this Table of Contents instance. |
| `heading` | Visible heading | text | Yes | No | Controls the visible heading used by this Table of Contents instance. |

#### Slots

| Slot | Purpose | Cardinality | Allowed content |
|---|---|---|---|
| `items` (Links) | Ordered, descriptive links in the navigation sequence. | 1–many | `base.link` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific label value that explains the component's purpose. |
| `a11y.keyboard-contract` | behavior-test | warning | Section links use native anchor navigation and visible focus. | Keep each destination ID stable and each link text aligned with its heading. |

## Editorial

### Card

A contained summary with optional media and action.

- Registry ID: `base.card`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.card`
- Search tags: card, teaser, summary, content

**Use when:** Summarise one destination or record. Use Card Grid for repeated cards.

**Accessibility intent:** Use a specific title and avoid duplicating competing links to the same destination.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `image` | Image | image | No | No | Controls the image used by this Card instance. |
| `eyebrow` | Eyebrow | text | No | No | Controls the eyebrow used by this Card instance. |
| `title` | Title | text | Yes | No | Controls the title used by this Card instance. |
| `description` | Description | rich-text | No | No | Controls the description used by this Card instance. |
| `href` | Destination | url | No | No | Controls the destination used by this Card instance. |
| `actionLabel` | Action label | text | No | No | Controls the action label used by this Card instance. |

#### Variants

| ID | Name | Applied values |
|---|---|---|
| `vertical` | Vertical | `{"variant":"vertical"}` |
| `horizontal` | Horizontal | `{"variant":"horizontal"}` |
| `compact` | Compact | `{"variant":"compact"}` |
| `featured` | Featured | `{"variant":"featured"}` |

#### Slots

| Slot | Purpose | Cardinality | Allowed content |
|---|---|---|---|
| `actions` (Actions) | Approved buttons and links. | 0–3 | `base.button`, `base.link` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific title value that explains the component's purpose. |

### Card Grid

A responsive collection composed from the shared Card definition.

- Registry ID: `base.card-grid`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: pattern
- Backing implementation: pattern `base.pattern.card-grid`
- Search tags: cards, grid, collection, teasers

**Use when:** Use for a short manual collection of comparable destinations.

**Accessibility intent:** Keep card headings and action labels specific; document order remains the reading order.

#### Properties

This entry exposes no instance properties.

#### Dependencies

No additional platform dependency.

### Download

A described link to a downloadable site asset.

- Registry ID: `base.download`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.download`
- Search tags: download, file, asset, document

**Use when:** Describe the file and its purpose before the download link.

**Accessibility intent:** Include file type and size in the description when that affects the decision to download.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `title` | Title | text | Yes | No | Controls the title used by this Download instance. |
| `description` | Description | text | No | No | Controls the description used by this Download instance. |
| `href` | File | url | Yes | No | Controls the file used by this Download instance. |
| `label` | Link label | text | Yes | No | Controls the link label used by this Download instance. |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific title value that explains the component's purpose. |

### Hero

A major page introduction with optional media and actions.

- Registry ID: `base.hero`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.hero`
- Search tags: hero, introduction, banner, call to action

**Use when:** Use once near the start of a landing page.

**Accessibility intent:** Keep the heading concise and ensure optional media has suitable alternative text.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `eyebrow` | Eyebrow | text | No | No | Controls the eyebrow used by this Hero instance. |
| `heading` | Heading | text | Yes | No | Controls the heading used by this Hero instance. |
| `body` | Body | rich-text | No | No | Controls the body used by this Hero instance. |
| `image` | Image | image | No | No | Controls the image used by this Hero instance. |

#### Variants

| ID | Name | Applied values |
|---|---|---|
| `image-left` | Image left | `{"variant":"image-left"}` |
| `image-right` | Image right | `{"variant":"image-right"}` |
| `text-only` | Text only | `{"variant":"text-only"}` |

#### Slots

| Slot | Purpose | Cardinality | Allowed content |
|---|---|---|---|
| `actions` (Actions) | Approved buttons and links. | 0–3 | `base.button`, `base.link` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific heading value that explains the component's purpose. |
| `a11y.heading-order` | automated | warning | The Hero heading must fit the page heading hierarchy. | Use one page-level H1 and keep subsequent heading levels logical. |

### List

A static or generated collection using one governed item template.

- Registry ID: `base.list`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: pattern
- Backing implementation: pattern `base.pattern.list`
- Search tags: list, collection, loop, pages, records

**Use when:** Choose manual items or a registered loop source and author one governed item template.

**Accessibility intent:** Retain meaningful item semantics, source order and the shared collection status.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `sourceMode` | Source mode | select | Yes | No | Controls the source mode used by this List instance. |
| `sourceId` | Content source | select | No | No | Controls the content source used by this List instance. |
| `query` | Query | text | No | No | Controls the query used by this List instance. |
| `orderBy` | Sort by | select | No | No | Controls the sort by used by this List instance. |
| `direction` | Direction | select | Yes | No | Controls the direction used by this List instance. |
| `limit` | Limit | number | Yes | No | Controls the limit used by this List instance. |
| `pagination` | Pagination | select | Yes | No | Controls the pagination used by this List instance. |
| `pageSize` | Page size | number | Yes | No | Controls the page size used by this List instance. |

#### Dependencies

No additional platform dependency.

### Notice / Callout

Highlights important information with an approved semantic type.

- Registry ID: `base.notice`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.notice`
- Search tags: notice, callout, alert, message

**Use when:** Use for information that should stand apart from the surrounding flow.

**Accessibility intent:** Do not rely on colour alone to communicate the notice type.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `title` | Title | text | Yes | No | Controls the title used by this Notice / Callout instance. |
| `body` | Body | rich-text | No | No | Controls the body used by this Notice / Callout instance. |

#### Variants

| ID | Name | Applied values |
|---|---|---|
| `information` | Information | `{"variant":"information"}` |
| `success` | Success | `{"variant":"success"}` |
| `warning` | Warning | `{"variant":"warning"}` |
| `error` | Error | `{"variant":"error"}` |

#### Slots

| Slot | Purpose | Cardinality | Allowed content |
|---|---|---|---|
| `actions` (Actions) | Approved buttons and links. | 0–3 | `base.button`, `base.link` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific title value that explains the component's purpose. |

### Person Profile

A named person with portrait, role, biography and governed links.

- Registry ID: `base.person-profile`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.person-profile`
- Search tags: person, profile, author, team

**Use when:** Use for a real person whose role or biography is relevant to the page.

**Accessibility intent:** Use an informative portrait alternative in the media library, or leave it decorative.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `image` | Portrait | image | No | No | Controls the portrait used by this Person Profile instance. |
| `name` | Name | text | Yes | No | Controls the name used by this Person Profile instance. |
| `role` | Role | text | No | No | Controls the role used by this Person Profile instance. |
| `biography` | Biography | rich-text | No | No | Controls the biography used by this Person Profile instance. |

#### Variants

| ID | Name | Applied values |
|---|---|---|
| `vertical` | Vertical | `{"variant":"vertical"}` |
| `horizontal` | Horizontal | `{"variant":"horizontal"}` |
| `compact` | Compact | `{"variant":"compact"}` |

#### Slots

| Slot | Purpose | Cardinality | Allowed content |
|---|---|---|---|
| `links` (Profile links) | Approved links associated with this person. | 0–5 | `base.link` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific name value that explains the component's purpose. |

### Quote / Testimonial

A quotation with a required visible citation.

- Registry ID: `base.quote`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.quote`
- Search tags: quote, testimonial, citation, review

**Use when:** Use for attributed words; keep the source accurate and specific.

**Accessibility intent:** Keep quotation semantics in the rich-text content and identify its source.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `quote` | Quotation | rich-text | Yes | No | Controls the quotation used by this Quote / Testimonial instance. |
| `citation` | Citation | text | Yes | No | Controls the citation used by this Quote / Testimonial instance. |

#### Variants

| ID | Name | Applied values |
|---|---|---|
| `quote` | Quote | `{"variant":"quote"}` |
| `testimonial` | Testimonial | `{"variant":"testimonial"}` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific citation value that explains the component's purpose. |

### Teaser

A promotional Card preset that reuses the Card definition.

- Registry ID: `base.teaser`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.card`
- Search tags: teaser, campaign, article, promotion

**Use when:** Promote another page or resource with the shared Card implementation.

**Accessibility intent:** Use a title and action that identify the destination.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `image` | Image | image | No | No | Controls the image used by this Teaser instance. |
| `eyebrow` | Pre-title | text | No | No | Controls the pre-title used by this Teaser instance. |
| `title` | Title | text | Yes | No | Controls the title used by this Teaser instance. |
| `description` | Description | rich-text | No | No | Controls the description used by this Teaser instance. |
| `href` | Destination | url | Yes | No | Controls the destination used by this Teaser instance. |
| `actionLabel` | Action label | text | No | No | Controls the action label used by this Teaser instance. |

#### Variants

| ID | Name | Applied values |
|---|---|---|
| `banner` | Banner | `{"variant":"horizontal"}` |
| `card` | Card | `{"variant":"vertical"}` |
| `article` | Article | `{"variant":"compact"}` |
| `campaign` | Campaign | `{"variant":"featured"}` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific title value that explains the component's purpose. |

## Typography

### Code / Preformatted Text

Whitespace-preserving text with safe language metadata.

- Registry ID: `base.code-block`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.code-block`
- Search tags: code, preformatted, snippet, example

**Use when:** Use for source code, command output or any content where whitespace is meaningful.

**Accessibility intent:** Name the example and enable wrapping when horizontal scrolling would make it difficult to read.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `code` | Code or preformatted text | text | Yes | No | Controls the code or preformatted text used by this Code / Preformatted Text instance. |
| `language` | Language | text | Yes | No | Controls the language used by this Code / Preformatted Text instance. |
| `label` | Accessible label | text | Yes | No | Controls the accessible label used by this Code / Preformatted Text instance. |
| `wrap` | Wrap long lines | boolean | No | No | Controls the wrap long lines used by this Code / Preformatted Text instance. |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific label value that explains the component's purpose. |

### Heading

A section heading using the shared text implementation.

- Registry ID: `base.heading`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.text` with preset `heading`
- Search tags: heading, title, text

**Use when:** Introduce a page or section with a meaningful heading.

**Accessibility intent:** Keep heading levels logical and do not choose a level for visual size alone.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `text` | Text | text | Yes | No | The literal authored text. Markup is escaped and hard newlines publish as line breaks. |
| `tag` | Semantic element | select | Yes | No | The HTML element that describes the text meaning; visual typography belongs to classes. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `heading` | Heading | `{"tag":"h2","text":"Heading"}` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific text value that explains the component's purpose. |
| `a11y.heading-order` | automated | warning | Heading levels should not skip a level in page order. | Choose the next logical heading level based on document structure. |

### Plain Text

A semantic paragraph or short text fragment.

- Registry ID: `base.plain-text`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.text` with preset `paragraph`
- Search tags: paragraph, copy, text

**Use when:** Use for short plain-text content that does not need rich formatting.

**Accessibility intent:** Use semantic elements that match the content rather than its appearance.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `text` | Text | text | Yes | No | The literal authored text. Markup is escaped and hard newlines publish as line breaks. |
| `tag` | Semantic element | select | Yes | No | The HTML element that describes the text meaning; visual typography belongs to classes. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `paragraph` | Paragraph | `{"tag":"p","text":"Add your text here."}` |

#### Dependencies

No additional platform dependency.

### Rich Text

Sanitised formatted editorial content with one semantic wrapper.

- Registry ID: `base.rich-text`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.rich-text`
- Search tags: rich text, editorial, formatting, quotation

**Use when:** Use for paragraphs, lists, links, quotations and inline formatting that belong together.

**Accessibility intent:** Retain a logical heading structure and descriptive link text inside the formatted content.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `html` | Content | rich-text | Yes | No | Controls the content used by this Rich Text instance. |
| `tag` | Semantic wrapper | select | Yes | No | Controls the semantic wrapper used by this Rich Text instance. |

#### Dependencies

No additional platform dependency.

### Simple List

An ordered or unordered semantic list.

- Registry ID: `base.semantic-list`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.list`
- Search tags: list, ordered, unordered

**Use when:** Use for a sequence or group of related short items.

**Accessibility intent:** Use an ordered list when item order carries meaning.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `items` | Items | text | Yes | No | Controls the items used by this Simple List instance. |
| `listType` | List type | select | Yes | No | Controls the list type used by this Simple List instance. |

#### Dependencies

No additional platform dependency.

## Content

### Progress Bar

A labelled native progress indicator.

- Registry ID: `base.progress-bar`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.progress`
- Search tags: progress, completion, status, measurement

**Use when:** Use for measurable progress with a meaningful current value and maximum.

**Accessibility intent:** Provide a label that explains what is progressing.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `value` | Value | number | Yes | No | Controls the value used by this Progress Bar instance. |
| `maximum` | Maximum | number | Yes | No | Controls the maximum used by this Progress Bar instance. |
| `label` | Label | text | Yes | No | Controls the label used by this Progress Bar instance. |
| `showValue` | Show percentage | boolean | No | No | Controls the show percentage used by this Progress Bar instance. |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific label value that explains the component's purpose. |

### Search Results

Index-backed search across eligible published pages.

- Registry ID: `base.search`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: capability-backed
- Backing implementation: capability-backed module `base.loop` with preset `published-pages`
- Search tags: search, results, index, collection

**Use when:** Enable published-page search in Settings, then place this result collection on a search page.

**Accessibility intent:** Pair results with a labelled GET search form whose field name matches the configured query parameter.

#### Properties

This entry exposes no instance properties.

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `published-pages` | Published pages | `{"customTag":"","direction":"desc","filters":{},"itemRenderer":"search-result","limit":100,"manualItems":[],"offset":0,"orderBy":"relevance","pageSize":10,"pagination":"numbered","query":"","sourceId":"search.pages","sourceMode":"dynamic","tag":"div"}` |

#### Dependencies

| Kind | Stable ID |
|---|---|
| Capability | `search.index` |

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.announcement-contract` | behavior-test | warning | Search result counts, empty results and failures require a polite announcement. | Verify the shared collection status announces each result state. |

### Shared Content Fragment

References centrally managed content fields without owning page layout.

- Registry ID: `base.shared-content-fragment`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: capability-backed
- Backing implementation: capability-backed module `base.loop` with preset `content-fragment`
- Search tags: shared content, fragment, reference, slots

**Use when:** Select a centrally managed fragment and map only its fields into a compatible slot.

**Accessibility intent:** The consuming slot and item template retain ownership of layout and semantics.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `query` | Fragment selector | text | Yes | No | Controls the fragment selector used by this Shared Content Fragment instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `content-fragment` | Content fragment | `{"customTag":"","direction":"desc","filters":{},"itemRenderer":"children","limit":1,"manualItems":[],"offset":0,"orderBy":"","pageSize":10,"pagination":"none","query":"","sourceId":"data.rows","sourceMode":"dynamic","tag":"span"}` |

#### Dependencies

| Kind | Stable ID |
|---|---|
| Capability | `content.structured` |

### Structured Content

Renders one governed CMS record through an approved display component.

- Registry ID: `base.structured-content`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: capability-backed
- Backing implementation: capability-backed module `base.loop` with preset `single-record`
- Search tags: structured content, record, reference, data

**Use when:** Select one approved record and add one compatible display component as its item template.

**Accessibility intent:** The selected display component owns the semantics and fallback for missing content.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `query` | Record selector | text | Yes | No | Controls the record selector used by this Structured Content instance. |
| `orderBy` | Record order | select | No | No | Controls the record order used by this Structured Content instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `single-record` | Single record | `{"customTag":"","direction":"desc","filters":{},"itemRenderer":"children","limit":1,"manualItems":[],"offset":0,"orderBy":"","pageSize":10,"pagination":"none","query":"","sourceId":"data.rows","sourceMode":"dynamic","tag":"div"}` |

#### Dependencies

| Kind | Stable ID |
|---|---|
| Capability | `content.structured` |

### Structured Content List

Queries governed CMS records through the shared collection contract.

- Registry ID: `base.structured-content-list`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: capability-backed
- Backing implementation: capability-backed module `base.loop` with preset `record-collection`
- Search tags: structured content, collection, loop, records

**Use when:** Configure one content query and one or more approved loop item components.

**Accessibility intent:** Use meaningful item landmarks and the shared collection status and pagination contract.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `query` | Query | text | No | No | Controls the query used by this Structured Content List instance. |
| `orderBy` | Sort by | select | No | No | Controls the sort by used by this Structured Content List instance. |
| `direction` | Direction | select | Yes | No | Controls the direction used by this Structured Content List instance. |
| `limit` | Limit | number | Yes | No | Controls the limit used by this Structured Content List instance. |
| `pagination` | Pagination | select | Yes | No | Controls the pagination used by this Structured Content List instance. |
| `pageSize` | Page size | number | Yes | No | Controls the page size used by this Structured Content List instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `record-collection` | Record collection | `{"customTag":"","direction":"desc","filters":{},"itemRenderer":"children","limit":10,"manualItems":[],"offset":0,"orderBy":"","pageSize":10,"pagination":"numbered","query":"","sourceId":"data.rows","sourceMode":"dynamic","tag":"div"}` |

#### Dependencies

| Kind | Stable ID |
|---|---|
| Capability | `content.structured` |

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.announcement-contract` | behavior-test | warning | Empty, unavailable and updated collection states require a polite announcement. | Retain the shared collection status and pagination output. |

### Table

A captioned semantic table for genuinely tabular editorial data.

- Registry ID: `base.table`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.table`
- Search tags: table, data, rows, columns

**Use when:** Use only when row and column relationships are meaningful.

**Accessibility intent:** Provide a specific caption and preserve row and column header associations.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `caption` | Caption | text | Yes | No | Controls the caption used by this Table instance. |
| `columns` | Column headings | text | Yes | No | Controls the column headings used by this Table instance. |
| `rows` | Rows | text | Yes | No | Controls the rows used by this Table instance. |
| `firstColumnHeader` | First cell is a row heading | boolean | No | No | Controls the first cell is a row heading used by this Table instance. |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific caption value that explains the component's purpose. |

## Design

### Badge

A short status or category label using approved semantic variants.

- Registry ID: `base.badge`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.badge`
- Search tags: badge, label, status, tag

**Use when:** Use for short metadata or status, not as the only explanation of a state.

**Accessibility intent:** The text, not colour, communicates the badge meaning.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `text` | Text | text | Yes | No | Controls the text used by this Badge instance. |

#### Variants

| ID | Name | Applied values |
|---|---|---|
| `neutral` | Neutral | `{"variant":"neutral"}` |
| `information` | Information | `{"variant":"information"}` |
| `success` | Success | `{"variant":"success"}` |
| `warning` | Warning | `{"variant":"warning"}` |
| `error` | Error | `{"variant":"error"}` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific text value that explains the component's purpose. |

### Comparison Table

A captioned table comparing any set of options or features.

- Registry ID: `base.comparison-table`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: pattern
- Backing implementation: pattern `base.pattern.comparison-table`
- Search tags: comparison, table, features, options

**Use when:** Use for genuine row-and-column comparison, including but not limited to pricing.

**Accessibility intent:** Provide a specific caption and preserve row and column header associations.

#### Properties

This entry exposes no instance properties.

#### Dependencies

No additional platform dependency.

### Empty State

Explains an empty collection or unavailable result with a next action.

- Registry ID: `base.empty-state`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: pattern
- Backing implementation: pattern `base.pattern.empty-state`
- Search tags: empty, no results, unavailable, fallback

**Use when:** Explain why content is absent and offer the most useful next action.

**Accessibility intent:** Do not rely on illustration alone; keep the message and next action explicit.

#### Properties

This entry exposes no instance properties.

#### Dependencies

No additional platform dependency.

### FAQ List

Frequently asked questions composed from native Accordion items.

- Registry ID: `base.faq-list`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: pattern
- Backing implementation: pattern `base.pattern.faq`
- Search tags: faq, questions, answers, accordion

**Use when:** Use for genuinely frequent questions; keep answers useful when read directly.

**Accessibility intent:** Uses native details and summary controls and remains operable without JavaScript.

#### Properties

This entry exposes no instance properties.

#### Dependencies

No additional platform dependency.

### Icon

An approved symbolic icon with controlled semantics and size.

- Registry ID: `base.icon`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.icon`
- Search tags: icon, symbol, design, status

**Use when:** Use only an approved symbol and pair unfamiliar icons with visible text.

**Accessibility intent:** Decorative icons are hidden; meaningful icons require a concise label.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `name` | Icon | select | Yes | No | Controls the icon used by this Icon instance. |
| `label` | Accessible label | text | No | No | Controls the accessible label used by this Icon instance. |
| `decorative` | Decorative | boolean | No | No | Controls the decorative used by this Icon instance. |
| `size` | Size | select | Yes | No | Controls the size used by this Icon instance. |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | behavior-test | warning | Meaningful icons expose text and decorative icons stay silent. | Supply a short label whenever the icon communicates meaning. |

### Icon List

A concise repeated list ready for approved icon decoration.

- Registry ID: `base.icon-list`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: pattern
- Backing implementation: pattern `base.pattern.icon-list`
- Search tags: icon, list, features, benefits

**Use when:** Use the shared semantic List; apply approved decorative icons through the design system.

**Accessibility intent:** Keep the textual item meaningful without relying on the decorative icon.

#### Properties

This entry exposes no instance properties.

#### Dependencies

No additional platform dependency.

### Logo Cloud

A governed group of partner or organisation logos.

- Registry ID: `base.logo-cloud`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: pattern
- Backing implementation: pattern `base.pattern.logo-cloud`
- Search tags: logos, partners, organisations, trust

**Use when:** Use for a curated set of organisations with consistent image treatment.

**Accessibility intent:** Give linked logos an organisation name and mark purely decorative logos appropriately.

#### Properties

This entry exposes no instance properties.

#### Dependencies

No additional platform dependency.

### Statistics

A responsive group of key measurements.

- Registry ID: `base.statistics`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: pattern
- Backing implementation: pattern `base.pattern.statistics`
- Search tags: statistics, metrics, numbers, measurements

**Use when:** Use for a small set of comparable, well-sourced measurements.

**Accessibility intent:** Include units and enough context for each value to make sense independently.

#### Properties

This entry exposes no instance properties.

#### Dependencies

No additional platform dependency.

### Steps

A semantic ordered sequence of actions.

- Registry ID: `base.steps`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: pattern
- Backing implementation: pattern `base.pattern.steps`
- Search tags: steps, process, instructions, sequence

**Use when:** Use for instructions whose sequence is meaningful.

**Accessibility intent:** Use concise action-led text and keep the required order explicit.

#### Properties

This entry exposes no instance properties.

#### Dependencies

No additional platform dependency.

### Timeline

A semantic ordered sequence of dated milestones.

- Registry ID: `base.timeline`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: pattern
- Backing implementation: pattern `base.pattern.timeline`
- Search tags: timeline, history, events, dates

**Use when:** Use when chronology is essential to understanding the events.

**Accessibility intent:** Include dates in text and retain chronological DOM order.

#### Properties

This entry exposes no instance properties.

#### Dependencies

No additional platform dependency.

## Interactive

### Accordion

A labelled group of native disclosure sections.

- Registry ID: `base.accordion`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.accordion`
- Search tags: accordion, disclosure, interactive

**Use when:** Add independently expandable Accordion Item entries to the Items slot.

**Accessibility intent:** Native details and summary remain keyboard operable without JavaScript.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `label` | Accessible label | text | Yes | No | Controls the accessible label used by this Accordion instance. |

#### Slots

| Slot | Purpose | Cardinality | Allowed content |
|---|---|---|---|
| `items` (Items) | Native disclosure sections. | 1–many | `base.accordion-item` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific label value that explains the component's purpose. |
| `a11y.keyboard-contract` | behavior-test | warning | The shared runtime preserves the documented keyboard interaction. | Retain the canonical module and its tested keyboard contract. |
| `a11y.no-javascript-fallback` | behavior-test | warning | All authored content remains available when enhancement is unavailable. | Keep the server-rendered native fallback in logical source order. |

### Accordion Item

One native disclosure section inside an Accordion.

- Registry ID: `base.accordion-item`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.accordion-item`
- Search tags: accordion, details, summary, form

**Use when:** Add one independently expandable section.

**Accessibility intent:** Write a specific summary that identifies the hidden content.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `title` | Summary | text | Yes | No | Controls the summary used by this Accordion Item instance. |
| `open` | Open initially | boolean | No | No | Controls the open initially used by this Accordion Item instance. |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific title value that explains the component's purpose. |

### Button

A call to action rendered as a button or link.

- Registry ID: `base.button`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.button`
- Search tags: button, action, link, cta

**Use when:** Use for an action or prominent navigation destination.

**Accessibility intent:** Use a specific label that describes the result of activating the control.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `label` | Label | text | Yes | No | Controls the label used by this Button instance. |
| `href` | Destination | url | No | No | Controls the destination used by this Button instance. |
| `target` | Open in | select | Yes | No | Controls the open in used by this Button instance. |
| `disabled` | Disabled | boolean | No | No | Controls the disabled used by this Button instance. |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific label value that explains the component's purpose. |
| `a11y.touch-target` | manual | warning | The rendered action needs an adequate touch target. | Verify the final design provides sufficient target size and spacing. |
| `a11y.contrast` | manual | warning | Text, focus and disabled states require sufficient contrast. | Review the final token combination in every supported theme and state. |

### Carousel

A controlled sequence of governed content slides.

- Registry ID: `base.carousel`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.carousel`
- Search tags: carousel, slides, gallery, featured

**Use when:** Use sparingly when related content benefits from sequential presentation.

**Accessibility intent:** Prefer manual controls. Autoplay pauses on focus or pointer interaction and is disabled for reduced-motion users.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `label` | Accessible label | text | Yes | No | Controls the accessible label used by this Carousel instance. |
| `previousLabel` | Previous label | text | Yes | No | Controls the previous label used by this Carousel instance. |
| `nextLabel` | Next label | text | Yes | No | Controls the next label used by this Carousel instance. |
| `autoplay` | Autoplay | boolean | No | No | Controls the autoplay used by this Carousel instance. |
| `interval` | Autoplay interval | number | No | No | Controls the autoplay interval used by this Carousel instance. |

#### Slots

| Slot | Purpose | Cardinality | Allowed content |
|---|---|---|---|
| `slides` (Slides) | Ordered components presented as carousel slides. | 1–12 | Any permitted entry |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific label value that explains the component's purpose. |
| `a11y.keyboard-contract` | behavior-test | warning | Previous, next and arrow-key controls move through slides. | Run the carousel runtime keyboard behavior suite after implementation changes. |
| `a11y.announcement-contract` | behavior-test | warning | User-initiated slide changes announce the current position. | Keep the polite status region and meaningful carousel label. |
| `a11y.motion-control` | behavior-test | warning | Autoplay pauses for interaction and is disabled for reduced motion. | Do not bypass the runtime reduced-motion and pause checks. |
| `a11y.no-javascript-fallback` | behavior-test | warning | All slides remain visible in document order without JavaScript. | Only hide inactive slides after progressive enhancement. |

### Drawer

Supporting content presented from a governed viewport edge.

- Registry ID: `base.drawer`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.drawer`
- Search tags: drawer, panel, overlay, edge

**Use when:** Use for supporting navigation or detail that can be dismissed without losing page context.

**Accessibility intent:** The enhanced drawer shares the dialog focus and dismissal contract and remains an inline disclosure without JavaScript.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `triggerLabel` | Trigger label | text | Yes | No | Controls the trigger label used by this Drawer instance. |
| `title` | Title | text | Yes | No | Controls the title used by this Drawer instance. |
| `closeLabel` | Close label | text | Yes | No | Controls the close label used by this Drawer instance. |
| `dismissOnEscape` | Dismiss with Escape | boolean | No | No | Controls the dismiss with Escape used by this Drawer instance. |
| `dismissOnBackdrop` | Dismiss from backdrop | boolean | No | No | Controls the dismiss from backdrop used by this Drawer instance. |

#### Variants

| ID | Name | Applied values |
|---|---|---|
| `start` | Start edge | `{"side":"start"}` |
| `end` | End edge | `{"side":"end"}` |

#### Slots

| Slot | Purpose | Cardinality | Allowed content |
|---|---|---|---|
| `content` (Content) | Governed content shown inside the overlay. | 1–many | Any permitted entry |
| `actions` (Actions) | Approved dialog or drawer actions. | 0–3 | `base.button`, `base.link` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific title value that explains the component's purpose. |
| `a11y.keyboard-contract` | behavior-test | warning | Overlay triggers, dismissal and Tab order follow the documented keyboard contract. | Run the overlay runtime keyboard behavior suite after implementation changes. |
| `a11y.focus-contract` | behavior-test | warning | Focus enters, stays within and returns from the enhanced overlay. | Keep a visible close action and do not remove the runtime focus boundary. |
| `a11y.no-javascript-fallback` | behavior-test | warning | Overlay content remains available as a native details disclosure. | Keep the summary and inline panel usable before enhancement. |

### Link

An inline or grouped navigation link.

- Registry ID: `base.link`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.link`
- Search tags: link, navigation, anchor

**Use when:** Use for navigation within text or a group of linked content.

**Accessibility intent:** Link text must make sense without relying on surrounding prose.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `text` | Text | text | Yes | No | Controls the text used by this Link instance. |
| `href` | Destination | url | Yes | No | Controls the destination used by this Link instance. |
| `target` | Open in | select | Yes | No | Controls the open in used by this Link instance. |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific text value that explains the component's purpose. |

### Map

A consent-delayed OpenStreetMap embed.

- Registry ID: `base.map`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: capability-backed
- Backing implementation: capability-backed module `base.provider-embed` with preset `openstreetmap`
- Search tags: map, openstreetmap, provider, consent

**Use when:** Paste an OpenStreetMap export URL from the approved provider origin.

**Accessibility intent:** Use a title that identifies the location and provide the address in ordinary page text.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `sourceUrl` | OpenStreetMap URL | url | Yes | No | Controls the openStreetMap URL used by this Map instance. |
| `title` | Accessible title | text | Yes | No | Controls the accessible title used by this Map instance. |
| `fallbackText` | Fallback text | text | Yes | No | Controls the fallback text used by this Map instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `openstreetmap` | OpenStreetMap | `{"adapterId":"maps.openstreetmap","fallbackText":"Map unavailable.","kind":"map","title":"Map"}` |

#### Dependencies

| Kind | Stable ID |
|---|---|
| Provider adapter | `maps.openstreetmap` |

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.provider-fallback` | automated | error | Provider content requires both an accessible title and fallback text. | Provide a specific title and a useful alternative when provider content cannot load. |

### Modal / Dialog

Focused interactive content with governed dismissal and focus.

- Registry ID: `base.dialog`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.dialog`
- Search tags: modal, dialog, overlay, focus

**Use when:** Use when a short task or decision must interrupt the page flow.

**Accessibility intent:** The enhanced overlay traps focus, restores the trigger and supports Escape; without JavaScript it remains a details disclosure.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `triggerLabel` | Trigger label | text | Yes | No | Controls the trigger label used by this Modal / Dialog instance. |
| `title` | Title | text | Yes | No | Controls the title used by this Modal / Dialog instance. |
| `closeLabel` | Close label | text | Yes | No | Controls the close label used by this Modal / Dialog instance. |
| `dismissOnEscape` | Dismiss with Escape | boolean | No | No | Controls the dismiss with Escape used by this Modal / Dialog instance. |
| `dismissOnBackdrop` | Dismiss from backdrop | boolean | No | No | Controls the dismiss from backdrop used by this Modal / Dialog instance. |

#### Variants

| ID | Name | Applied values |
|---|---|---|
| `small` | Small | `{"size":"small"}` |
| `medium` | Medium | `{"size":"medium"}` |
| `large` | Large | `{"size":"large"}` |

#### Slots

| Slot | Purpose | Cardinality | Allowed content |
|---|---|---|---|
| `content` (Content) | Governed content shown inside the overlay. | 1–many | Any permitted entry |
| `actions` (Actions) | Approved dialog or drawer actions. | 0–3 | `base.button`, `base.link` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific title value that explains the component's purpose. |
| `a11y.keyboard-contract` | behavior-test | warning | Overlay triggers, dismissal and Tab order follow the documented keyboard contract. | Run the overlay runtime keyboard behavior suite after implementation changes. |
| `a11y.focus-contract` | behavior-test | warning | Focus enters, stays within and returns from the enhanced overlay. | Keep a visible close action and do not remove the runtime focus boundary. |
| `a11y.no-javascript-fallback` | behavior-test | warning | Overlay content remains available as a native details disclosure. | Keep the summary and inline panel usable before enhancement. |

### Tab Panel

One labelled panel inside Tabs.

- Registry ID: `base.tab-panel`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.tab-panel`
- Search tags: tab, panel, interactive, form

**Use when:** Add one labelled content region to Tabs.

**Accessibility intent:** Use a short unique label; all panels remain visible when JavaScript is unavailable.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `tabId` | Tab ID | text | Yes | Yes | Controls the tab ID used by this Tab Panel instance. |
| `label` | Label | text | Yes | No | Controls the label used by this Tab Panel instance. |
| `selected` | Selected initially | boolean | No | No | Controls the selected initially used by this Tab Panel instance. |
| `disabled` | Disabled | boolean | No | No | Controls the disabled used by this Tab Panel instance. |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific label value that explains the component's purpose. |

### Tabs

A labelled set of progressively enhanced content panels.

- Registry ID: `base.tabs`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.tabs`
- Search tags: tabs, panels, interactive

**Use when:** Add labelled Tab Panel entries to the governed Panels slot.

**Accessibility intent:** Arrow, Home and End keys navigate; every panel remains in the no-JavaScript fallback.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `label` | Accessible label | text | Yes | No | Controls the accessible label used by this Tabs instance. |

#### Variants

| ID | Name | Applied values |
|---|---|---|
| `horizontal` | Horizontal | `{"orientation":"horizontal"}` |
| `vertical` | Vertical | `{"orientation":"vertical"}` |

#### Slots

| Slot | Purpose | Cardinality | Allowed content |
|---|---|---|---|
| `panels` (Panels) | Labelled peer content panels. | 1–many | `base.tab-panel` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific label value that explains the component's purpose. |
| `a11y.keyboard-contract` | behavior-test | warning | The shared runtime preserves the documented keyboard interaction. | Retain the canonical module and its tested keyboard contract. |
| `a11y.no-javascript-fallback` | behavior-test | warning | All authored content remains available when enhancement is unavailable. | Keep the server-rendered native fallback in logical source order. |

## Media

### Audio

A native audio player with an accessible title and transcript link.

- Registry ID: `base.audio`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.audio`
- Search tags: audio, media, recording, transcript

**Use when:** Use for a site-hosted or HTTPS recording with native playback controls.

**Accessibility intent:** Provide a specific title and a transcript for spoken information.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `source` | Audio file | url | Yes | No | Controls the audio file used by this Audio instance. |
| `title` | Audio title | text | Yes | No | Controls the audio title used by this Audio instance. |
| `transcriptUrl` | Transcript URL | url | No | No | Controls the transcript URL used by this Audio instance. |
| `transcriptLabel` | Transcript link label | text | No | No | Controls the transcript link label used by this Audio instance. |
| `loop` | Loop | boolean | No | Yes | Controls the loop used by this Audio instance. |
| `preload` | Preload | select | Yes | Yes | Controls the preload used by this Audio instance. |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific title value that explains the component's purpose. |
| `a11y.no-javascript-fallback` | manual | warning | Spoken audio needs an equivalent transcript when required. | Link a complete transcript and describe important non-speech audio. |

### Gallery

An ordered responsive collection of governed images.

- Registry ID: `base.gallery`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: pattern
- Backing implementation: pattern `base.pattern.gallery`
- Search tags: gallery, images, collection, media

**Use when:** Use for related images whose order and captions carry meaning.

**Accessibility intent:** Review every image alternative and preserve a meaningful document order.

#### Properties

This entry exposes no instance properties.

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.image-alternative` | behavior-test | warning | Every gallery image needs contextual alternative treatment. | Review each Media Library alternative before publication. |

### Image

An image selected from the Media Library.

- Registry ID: `base.image`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.image`
- Search tags: image, photo, media

**Use when:** Use an uploaded asset with loading behavior appropriate to its page position.

**Accessibility intent:** Provide meaningful alternative text in the Media Library or mark decorative images.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `src` | Image | image | Yes | No | Controls the image used by this Image instance. |
| `loading` | Loading | select | Yes | No | Controls the loading used by this Image instance. |
| `fetchPriority` | Fetch priority | select | Yes | No | Controls the fetch priority used by this Image instance. |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.image-alternative` | manual | warning | Image alternative text must match the authored context. | Review the Media Library alternative text and mark decorative images appropriately. |

### Media

Accessible hosted audio or video using one governed display definition.

- Registry ID: `base.media`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.media`
- Search tags: media, audio, video, captions, transcript

**Use when:** Choose Audio or Hosted video; provider video remains behind its approved adapter entry.

**Accessibility intent:** Provide captions for video and a transcript for spoken audio where required.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `source` | Media | media | Yes | No | Controls the media used by this Media instance. |
| `poster` | Poster or artwork | image | No | No | Controls the poster or artwork used by this Media instance. |
| `title` | Accessible title | text | Yes | No | Controls the accessible title used by this Media instance. |
| `transcriptUrl` | Transcript URL | url | No | No | Controls the transcript URL used by this Media instance. |
| `captionsUrl` | Captions file | url | No | No | Controls the captions file used by this Media instance. |
| `controls` | Show controls | boolean | Yes | No | Controls the show controls used by this Media instance. |
| `autoplay` | Autoplay | boolean | No | Yes | Controls the autoplay used by this Media instance. |
| `loop` | Loop | boolean | No | Yes | Controls the loop used by this Media instance. |
| `preload` | Preload | select | Yes | Yes | Controls the preload used by this Media instance. |

#### Variants

| ID | Name | Applied values |
|---|---|---|
| `audio` | Audio | `{"kind":"audio"}` |
| `hosted-video` | Hosted video | `{"kind":"video"}` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific title value that explains the component's purpose. |
| `a11y.motion-control` | behavior-test | warning | Autoplay and motion require available controls and reduced-motion review. | Keep controls enabled and avoid autoplay unless the policy permits it. |

### PDF Viewer

An embedded PDF with a native fallback and direct download link.

- Registry ID: `base.pdf-viewer`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.pdf-viewer`
- Search tags: pdf, document, viewer, download

**Use when:** Use an inline preview only when it helps and provide equivalent accessible content.

**Accessibility intent:** Name the document and ensure the PDF itself is tagged and accessible.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `source` | PDF file | url | Yes | No | Controls the pDF file used by this PDF Viewer instance. |
| `title` | Document title | text | Yes | No | Controls the document title used by this PDF Viewer instance. |
| `fallbackText` | Fallback message | text | Yes | No | Controls the fallback message used by this PDF Viewer instance. |
| `downloadLabel` | Download link label | text | Yes | No | Controls the download link label used by this PDF Viewer instance. |
| `height` | Viewer height | select | Yes | No | Controls the viewer height used by this PDF Viewer instance. |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific title value that explains the component's purpose. |
| `a11y.no-javascript-fallback` | behavior-test | warning | The document stays available as a direct download. | Keep the title and fallback link specific. |

### YouTube Embed

A consent-delayed privacy-enhanced YouTube video.

- Registry ID: `base.youtube-embed`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: capability-backed
- Backing implementation: capability-backed module `base.provider-embed` with preset `youtube`
- Search tags: video, youtube, provider, consent

**Use when:** Paste an approved YouTube URL; the player loads only after marketing consent or explicit activation.

**Accessibility intent:** Provide an accurate title and a meaningful fallback when provider content is blocked.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `sourceUrl` | YouTube URL | url | Yes | No | Controls the youTube URL used by this YouTube Embed instance. |
| `title` | Accessible title | text | Yes | No | Controls the accessible title used by this YouTube Embed instance. |
| `fallbackText` | Fallback text | text | Yes | No | Controls the fallback text used by this YouTube Embed instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `youtube` | YouTube | `{"adapterId":"media.youtube","fallbackText":"YouTube video unavailable.","kind":"media","title":"YouTube video"}` |

#### Dependencies

| Kind | Stable ID |
|---|---|
| Provider adapter | `media.youtube` |

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.provider-fallback` | automated | error | Provider content requires both an accessible title and fallback text. | Provide a specific title and a useful alternative when provider content cannot load. |
| `a11y.focus-contract` | behavior-test | warning | Consent activation and the loaded player must preserve a predictable focus path. | Verify focus remains visible and does not move unexpectedly when the provider loads. |

## Embed

### Embed

A consent-delayed third-party embed resolved through an approved adapter.

- Registry ID: `base.embed`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: capability-backed
- Backing implementation: capability-backed module `base.provider-embed` with preset `provider-embed`
- Search tags: embed, provider, iframe, consent

**Use when:** Enable the provider-embed capability and select an allow-listed adapter before insertion.

**Accessibility intent:** Keep consent activation keyboard reachable and provide equivalent fallback content.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `adapterId` | Provider adapter | select | Yes | No | Controls the provider adapter used by this Embed instance. |
| `sourceUrl` | Provider URL | url | Yes | No | Controls the provider URL used by this Embed instance. |
| `title` | Accessible title | text | Yes | No | Controls the accessible title used by this Embed instance. |
| `fallbackText` | Fallback text | text | Yes | No | Controls the fallback text used by this Embed instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `provider-embed` | Approved provider | `{"adapterId":"","fallbackText":"Provider content unavailable.","height":480,"heightMode":"responsive","kind":"embed","sourceUrl":"","title":"Provider content"}` |

#### Dependencies

| Kind | Stable ID |
|---|---|
| Capability | `embeds.provider` |

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific title value that explains the component's purpose. |
| `a11y.provider-fallback` | automated | error | Provider content requires both an accessible title and fallback text. | Provide a specific title and a useful alternative when provider content cannot load. |

## Forms

### CAPTCHA

A provider-neutral form verification boundary.

- Registry ID: `base.captcha`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: capability-backed
- Backing implementation: capability-backed module `base.provider-embed` with preset `hcaptcha`
- Search tags: form, captcha, verification, provider

**Use when:** Use only when the platform CAPTCHA capability and an approved adapter are healthy.

**Accessibility intent:** Provide an alternate verification path and never claim availability while provider verification is unconfigured.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `title` | Accessible title | text | Yes | No | Controls the accessible title used by this CAPTCHA instance. |
| `fallbackText` | Unavailable message | text | Yes | No | Controls the unavailable message used by this CAPTCHA instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `hcaptcha` | hCaptcha | `{"adapterId":"captcha.hcaptcha","fallbackText":"CAPTCHA verification is unavailable.","kind":"captcha","title":"Verification challenge"}` |

#### Dependencies

| Kind | Stable ID |
|---|---|
| Capability | `forms.captcha` |
| Provider adapter | `captcha.hcaptcha` |

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.provider-fallback` | automated | error | Provider content requires both an accessible title and fallback text. | Provide a specific title and a useful alternative when provider content cannot load. |

### Checkbox

A form control for an independent yes/no choice.

- Registry ID: `base.checkbox`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.checkbox`
- Search tags: form, checkbox, choice

**Use when:** Use for a choice that can be selected independently.

**Accessibility intent:** Pair with a visible label describing the selected state.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `fieldId` | Field ID | text | Yes | No | Controls the field ID used by this Checkbox instance. |
| `name` | Submission name | text | No | No | Controls the submission name used by this Checkbox instance. |
| `value` | Value | text | Yes | No | Controls the value used by this Checkbox instance. |
| `checked` | Checked | boolean | No | No | Controls the checked used by this Checkbox instance. |
| `required` | Required | boolean | No | No | Controls the required used by this Checkbox instance. |
| `draftBehavior` | Draft storage | select | No | Yes | Controls the draft storage used by this Checkbox instance. |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.form-control-label` | automated | error | This form control has no visible associated label. | Add a visible Label immediately before the control or explicitly target its field ID. |
| `a11y.unique-field-id` | automated | error | Form field IDs must be present and unique within the page. | Assign a stable field ID that is not used by another control. |

### Checkbox Group

A fieldset of independently selectable Checkbox controls.

- Registry ID: `base.checkbox-group`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: pattern
- Backing implementation: pattern `base.pattern.checkbox-group`
- Search tags: form, checkbox, group, multiple choice

**Use when:** Use when zero or more answers may be selected.

**Accessibility intent:** The fieldset legend states the shared question; every option keeps its own label.

#### Properties

This entry exposes no instance properties.

#### Dependencies

No additional platform dependency.

### Date Input

A calendar date.

- Registry ID: `base.date-input`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.input` with preset `date`
- Search tags: form, field, date

**Use when:** Use Date Input when the submitted value is a calendar date.

**Accessibility intent:** Pair the input with a visible Label and useful autocomplete value.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `fieldId` | Field ID | text | Yes | No | Controls the field ID used by this Date Input instance. |
| `name` | Submission name | text | No | No | Controls the submission name used by this Date Input instance. |
| `placeholder` | Placeholder | text | No | No | Controls the placeholder used by this Date Input instance. |
| `required` | Required | boolean | No | No | Controls the required used by this Date Input instance. |
| `draftBehavior` | Draft storage | select | No | Yes | Controls the draft storage used by this Date Input instance. |
| `autocomplete` | Autocomplete | text | No | No | Controls the autocomplete used by this Date Input instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `date` | Date Input | `{"inputType":"date"}` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.form-control-label` | automated | error | This form control has no visible associated label. | Add a visible Label immediately before the control or explicitly target its field ID. |
| `a11y.unique-field-id` | automated | error | Form field IDs must be present and unique within the page. | Assign a stable field ID that is not used by another control. |

### Delete Draft

Delete the current persistent recovery record.

- Registry ID: `base.delete-draft`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: capability-backed
- Backing implementation: capability-backed module `base.form-draft-action` with preset `delete-draft`
- Search tags: form, draft, delete, privacy

**Use when:** Offer a direct privacy control beside Save Draft.

**Accessibility intent:** Use an explicit label and announce successful deletion or revision conflicts.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `label` | Label | text | Yes | No | Controls the label used by this Delete Draft instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `delete-draft` | Delete draft | `{"action":"delete-draft","label":"Delete saved draft"}` |

#### Dependencies

| Kind | Stable ID |
|---|---|
| Capability | `forms.drafts` |

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific label value that explains the component's purpose. |

### Email Input

An email address.

- Registry ID: `base.email-input`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.input` with preset `email`
- Search tags: form, field, email

**Use when:** Use Email Input when the submitted value is an email address.

**Accessibility intent:** Pair the input with a visible Label and useful autocomplete value.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `fieldId` | Field ID | text | Yes | No | Controls the field ID used by this Email Input instance. |
| `name` | Submission name | text | No | No | Controls the submission name used by this Email Input instance. |
| `placeholder` | Placeholder | text | No | No | Controls the placeholder used by this Email Input instance. |
| `required` | Required | boolean | No | No | Controls the required used by this Email Input instance. |
| `draftBehavior` | Draft storage | select | No | Yes | Controls the draft storage used by this Email Input instance. |
| `autocomplete` | Autocomplete | text | No | No | Controls the autocomplete used by this Email Input instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `email` | Email Input | `{"inputType":"email"}` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.form-control-label` | automated | error | This form control has no visible associated label. | Add a visible Label immediately before the control or explicitly target its field ID. |
| `a11y.unique-field-id` | automated | error | Form field IDs must be present and unique within the page. | Assign a stable field ID that is not used by another control. |

### Field Error

A validation message associated with one form control.

- Registry ID: `base.form-error`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.form-message` with preset `error`
- Search tags: form, field, error, validation

**Use when:** Place beside the control whose server validation error it reports.

**Accessibility intent:** The runtime marks the control invalid, announces the message and focuses the first invalid field.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `fieldId` | Field ID | text | Yes | No | Controls the field ID used by this Field Error instance. |
| `text` | Fallback error | text | No | No | Controls the fallback error used by this Field Error instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `error` | Field error | `{"kind":"error"}` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.announcement-contract` | behavior-test | warning | Field errors must be announced and associated with the invalid control. | Verify aria-invalid, aria-errormessage, announcement and first-invalid focus behavior. |

### Field Help

Persistent instructions associated with one form control.

- Registry ID: `base.form-help`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.form-message` with preset `help`
- Search tags: form, field, help, description

**Use when:** Add concise instructions that remain visible before and after validation.

**Accessibility intent:** The form runtime associates this text through aria-describedby.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `fieldId` | Field ID | text | Yes | No | Controls the field ID used by this Field Help instance. |
| `text` | Help text | text | Yes | No | Controls the help text used by this Field Help instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `help` | Field help | `{"kind":"help"}` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific text value that explains the component's purpose. |
| `a11y.announcement-contract` | behavior-test | warning | Field help must be connected through the control description. | Verify aria-describedby includes the authored help message. |

### File Attachment

A private, malware-scanned file upload for CMS-native forms.

- Registry ID: `base.file-attachment`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: capability-backed
- Backing implementation: capability-backed module `base.input` with preset `private-scanned`
- Search tags: form, file, attachment, upload, private

**Use when:** Bind to an Attachment data field. Files remain private, quarantined and unclaimable until the configured malware scanner returns clean.

**Accessibility intent:** Provide a visible label, accepted-file guidance and a non-colour-only failure message.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `fieldId` | Field ID | text | Yes | No | Controls the field ID used by this File Attachment instance. |
| `name` | Submission name | text | No | No | Controls the submission name used by this File Attachment instance. |
| `accept` | Accepted MIME types or extensions | text | No | No | Controls the accepted MIME types or extensions used by this File Attachment instance. |
| `multiple` | Allow multiple | boolean | No | No | Controls the allow multiple used by this File Attachment instance. |
| `attachmentMaxFiles` | Maximum files | number | Yes | No | Controls the maximum files used by this File Attachment instance. |
| `attachmentMaxBytes` | Maximum bytes per file | number | Yes | No | Controls the maximum bytes per file used by this File Attachment instance. |
| `required` | Required | boolean | No | No | Controls the required used by this File Attachment instance. |
| `draftBehavior` | Draft storage | select | No | Yes | Controls the draft storage used by this File Attachment instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `private-scanned` | Private scanned attachment | `{"accept":".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv","attachmentMaxBytes":10485760,"attachmentMaxFiles":1,"inputType":"file","multiple":false}` |

#### Dependencies

| Kind | Stable ID |
|---|---|
| Capability | `forms.attachments` |

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.announcement-contract` | behavior-test | warning | Upload progress, scan failures and retry state must be announced. | Verify aggregate and per-file progress remain available to assistive technology. |

### Form Accordion

Form-aware sections composed from native Accordion items.

- Registry ID: `base.form-accordion`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: pattern
- Backing implementation: pattern `base.pattern.form-accordion`
- Search tags: form, accordion, sections, validation

**Use when:** Use only when collapsing long form sections materially helps authors.

**Accessibility intent:** Native details remain available without JavaScript and validation reveals errors.

#### Properties

This entry exposes no instance properties.

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.focus-contract` | behavior-test | warning | Validation reveals a closed section before focusing its first invalid field. | Keep each native summary specific and preserve validation-to-focus behavior. |

### Form Actions

A governed layout boundary for submit and secondary actions.

- Registry ID: `base.form-actions`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.container` with preset `actions`
- Search tags: form, actions, submit, layout

**Use when:** Group the primary submit control and any secondary link at the end of a form.

**Accessibility intent:** Keep the primary action clear and preserve a predictable keyboard order.

#### Properties

This entry exposes no instance properties.

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `actions` | Actions | `{"tag":"div"}` |

#### Dependencies

No additional platform dependency.

### Form Container

A CMS-native or custom form boundary.

- Registry ID: `base.form-container`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.form`
- Search tags: form, submission, container

**Use when:** Add approved fields and actions inside this form boundary.

**Accessibility intent:** Provide labels, instructions, errors and a clear submission result.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `mode` | Mode | select | Yes | No | Controls the mode used by this Form Container instance. |
| `formId` | Form ID | text | Yes | No | Controls the form ID used by this Form Container instance. |
| `targetTableId` | Target collection | select | No | No | Controls the target collection used by this Form Container instance. |
| `successBehavior` | Success behavior | select | Yes | No | Controls the success behavior used by this Form Container instance. |
| `successMessage` | Success message | text | No | No | Controls the success message used by this Form Container instance. |
| `redirectUrl` | Redirect destination | url | No | No | Controls the redirect destination used by this Form Container instance. |
| `draftMode` | Draft recovery | select | Yes | No | Controls the draft recovery used by this Form Container instance. |
| `draftTtlDays` | Draft expiry days | number | No | No | Controls the draft expiry days used by this Form Container instance. |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.announcement-contract` | behavior-test | warning | Submission success and errors require appropriate live announcements. | Run the CMS form runtime announcement behavior tests. |
| `a11y.focus-contract` | behavior-test | warning | Invalid submissions must reveal and focus the first invalid field. | Run validation through nested disclosure fixtures and verify focus placement. |

### Form Embed

An approved internal or provider form embedded behind consent and sandbox policy.

- Registry ID: `base.form-embed`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: capability-backed
- Backing implementation: capability-backed module `base.provider-embed` with preset `provider-form`
- Search tags: form, embed, provider, iframe

**Use when:** Enable the form-embed capability and choose one governed height mode and provider adapter.

**Accessibility intent:** Name the embedded form, preserve focus order and provide a direct accessible fallback.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `adapterId` | Form provider | select | Yes | No | Controls the form provider used by this Form Embed instance. |
| `sourceUrl` | Form URL | url | Yes | No | Controls the form URL used by this Form Embed instance. |
| `title` | Accessible title | text | Yes | No | Controls the accessible title used by this Form Embed instance. |
| `fallbackText` | Fallback text | text | Yes | No | Controls the fallback text used by this Form Embed instance. |
| `height` | Fallback height | number | Yes | No | Controls the fallback height used by this Form Embed instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `provider-form` | Approved form provider | `{"adapterId":"","fallbackText":"This form is currently unavailable.","height":480,"heightMode":"responsive","kind":"form-embed","sourceUrl":"","title":"Embedded form"}` |

#### Variants

| ID | Name | Applied values |
|---|---|---|
| `responsive` | Responsive | `{"heightMode":"responsive"}` |
| `fixed` | Fixed | `{"heightMode":"fixed"}` |
| `content-driven` | Content driven | `{"heightMode":"content-driven"}` |

#### Dependencies

| Kind | Stable ID |
|---|---|
| Capability | `forms.embed` |

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific title value that explains the component's purpose. |
| `a11y.provider-fallback` | automated | error | Provider content requires both an accessible title and fallback text. | Provide a specific title and a useful alternative when provider content cannot load. |

### Form Field Group

A governed layout boundary for one field, its label, help and error.

- Registry ID: `base.form-field-group`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.container` with preset `field-group`
- Search tags: form, field, group, layout

**Use when:** Group one control with its visible label, help and field error.

**Accessibility intent:** Keep the label and any described help or error in the same group as the control.

#### Properties

This entry exposes no instance properties.

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `field-group` | Field group | `{"tag":"div"}` |

#### Dependencies

No additional platform dependency.

### Form Status

A submission status or result message for a form.

- Registry ID: `base.form-message`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.form-message` with preset `status`
- Search tags: form, status, error, success

**Use when:** Explain form status or the result of a submission.

**Accessibility intent:** Status messages must be concise and announced without moving focus unnecessarily.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `kind` | Message type | select | Yes | No | Controls the message type used by this Form Status instance. |
| `text` | Text | text | Yes | No | Controls the text used by this Form Status instance. |
| `formId` | Form ID | text | No | Yes | Controls the form ID used by this Form Status instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `status` | Status | `{"kind":"status"}` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific text value that explains the component's purpose. |
| `a11y.announcement-contract` | behavior-test | warning | Submission status changes must be announced without unnecessary focus movement. | Run the form runtime announcement and focus behavior tests. |

### Form Step

A recoverable, progressively enhanced wizard step.

- Registry ID: `base.form-step`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.form-step`
- Search tags: form, wizard, step, review

**Use when:** Place fields and actions inside ordered steps. Without JavaScript every step remains visible.

**Accessibility intent:** Give every step a useful title and preserve logical source order.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `stepId` | Step ID | text | Yes | No | Controls the step ID used by this Form Step instance. |
| `title` | Step title | text | Yes | No | Controls the step title used by this Form Step instance. |
| `review` | Review step | boolean | No | No | Controls the review step used by this Form Step instance. |

#### Dependencies

No additional platform dependency.

### Form Tabs

Form-aware sections using the shared Tabs keyboard and fallback contract.

- Registry ID: `base.form-tabs`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: pattern
- Backing implementation: pattern `base.pattern.form-tabs`
- Search tags: form, tabs, sections, horizontal, vertical

**Use when:** Use one Form Tabs pattern and configure horizontal or vertical orientation in HTML view.

**Accessibility intent:** Labels, keyboard behavior and progressive fallback come from shared Tabs.

#### Properties

This entry exposes no instance properties.

#### Variants

| ID | Name | Applied values |
|---|---|---|
| `horizontal` | Horizontal | `{"orientation":"horizontal"}` |
| `vertical` | Vertical | `{"orientation":"vertical"}` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.keyboard-contract` | behavior-test | warning | Tabs provide arrow-key navigation and every panel stays visible without JavaScript. | Use the orientation variant and preserve the shared Tabs runtime. |
| `a11y.focus-contract` | behavior-test | warning | Validation activates a hidden panel before focusing its first invalid field. | Keep validation state connected to the shared Tabs activation contract. |

### Hidden Field

A fixed or context-derived value submitted without a visible control.

- Registry ID: `base.hidden-field`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.input` with preset `hidden`
- Search tags: form, field, hidden, metadata

**Use when:** Use only for non-secret fixed metadata that the server will validate independently.

**Accessibility intent:** Hidden fields have no visual or assistive-technology interface and must not carry instructions.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `fieldId` | Field ID | text | Yes | No | Controls the field ID used by this Hidden Field instance. |
| `name` | Submission name | text | No | No | Controls the submission name used by this Hidden Field instance. |
| `value` | Value | text | Yes | No | Controls the value used by this Hidden Field instance. |
| `draftBehavior` | Draft storage | select | No | Yes | Controls the draft storage used by this Hidden Field instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `hidden` | Hidden field | `{"inputType":"hidden"}` |

#### Dependencies

No additional platform dependency.

### Label

A visible label for a form control.

- Registry ID: `base.form-label`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.label`
- Search tags: form, label

**Use when:** Place immediately before the control it describes.

**Accessibility intent:** Use visible, specific labels; placeholders do not replace labels.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `text` | Text | text | Yes | No | Controls the text used by this Label instance. |
| `targetMode` | Target | select | Yes | Yes | Controls the target used by this Label instance. |
| `targetId` | Target ID | text | No | Yes | Controls the target ID used by this Label instance. |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific text value that explains the component's purpose. |

### Next Step

Move to the next authored form step.

- Registry ID: `base.next-step`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.form-draft-action` with preset `next-step`
- Search tags: form, wizard, next

**Use when:** Advance in source order; all steps remain available when JavaScript is absent.

**Accessibility intent:** Move focus into the newly revealed step.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `label` | Label | text | Yes | No | Controls the label used by this Next Step instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `next-step` | Next step | `{"action":"next-step","label":"Next"}` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific label value that explains the component's purpose. |

### Number Input

A numeric value.

- Registry ID: `base.number-input`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.input` with preset `number`
- Search tags: form, field, number

**Use when:** Use Number Input when the submitted value is a numeric value.

**Accessibility intent:** Pair the input with a visible Label and useful autocomplete value.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `fieldId` | Field ID | text | Yes | No | Controls the field ID used by this Number Input instance. |
| `name` | Submission name | text | No | No | Controls the submission name used by this Number Input instance. |
| `placeholder` | Placeholder | text | No | No | Controls the placeholder used by this Number Input instance. |
| `required` | Required | boolean | No | No | Controls the required used by this Number Input instance. |
| `draftBehavior` | Draft storage | select | No | Yes | Controls the draft storage used by this Number Input instance. |
| `autocomplete` | Autocomplete | text | No | No | Controls the autocomplete used by this Number Input instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `number` | Number Input | `{"inputType":"number"}` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.form-control-label` | automated | error | This form control has no visible associated label. | Add a visible Label immediately before the control or explicitly target its field ID. |
| `a11y.unique-field-id` | automated | error | Form field IDs must be present and unique within the page. | Assign a stable field ID that is not used by another control. |

### Option

One selectable value inside a Select.

- Registry ID: `base.option`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.option`
- Search tags: form, select, option

**Use when:** Add one author-facing choice to a Select.

**Accessibility intent:** Use a distinct label that communicates the choice.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `label` | Label | text | Yes | No | Controls the label used by this Option instance. |
| `value` | Value | text | Yes | No | Controls the value used by this Option instance. |
| `disabled` | Disabled | boolean | No | No | Controls the disabled used by this Option instance. |

#### Dependencies

No additional platform dependency.

### Option Group

A labelled group of related Select options.

- Registry ID: `base.option-group`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.option-group`
- Search tags: form, select, group

**Use when:** Group a longer option list into meaningful labelled sections.

**Accessibility intent:** Use a short group label that distinguishes its options.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `label` | Label | text | Yes | No | Controls the label used by this Option Group instance. |
| `disabled` | Disabled | boolean | No | No | Controls the disabled used by this Option Group instance. |

#### Dependencies

No additional platform dependency.

### Panel

A titled semantic group for related form content.

- Registry ID: `base.form-panel`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: pattern
- Backing implementation: pattern `base.pattern.form-panel`
- Search tags: form, panel, section, fields

**Use when:** Group fields that share one purpose under a concise title.

**Accessibility intent:** Keep a logical source order and identify the section with its heading.

#### Properties

This entry exposes no instance properties.

#### Dependencies

No additional platform dependency.

### Previous / Next Actions

A paired navigation action group for authored Wizard steps.

- Registry ID: `base.previous-next-actions`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: pattern
- Backing implementation: pattern `base.pattern.previous-next-actions`
- Search tags: form, wizard, previous, next, actions

**Use when:** Place at the end of a non-review Wizard step.

**Accessibility intent:** Use clear action labels and keep all steps available without JavaScript.

#### Properties

This entry exposes no instance properties.

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.focus-contract` | behavior-test | warning | Step navigation moves focus into the newly revealed section. | Preserve source order and the shared Wizard runtime. |

### Previous Step

Move to the previous authored form step.

- Registry ID: `base.previous-step`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.form-draft-action` with preset `previous-step`
- Search tags: form, wizard, previous

**Use when:** Return to the previous authored step without submitting.

**Accessibility intent:** Move focus into the newly revealed step.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `label` | Label | text | Yes | No | Controls the label used by this Previous Step instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `previous-step` | Previous step | `{"action":"previous-step","label":"Previous"}` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific label value that explains the component's purpose. |

### Radio

One mutually exclusive choice in a radio group.

- Registry ID: `base.radio`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.radio`
- Search tags: form, radio, choice

**Use when:** Use with other Radio entries sharing one submission name.

**Accessibility intent:** Group related radios under a visible question or fieldset legend.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `fieldId` | Field ID | text | Yes | No | Controls the field ID used by this Radio instance. |
| `name` | Submission name | text | No | No | Controls the submission name used by this Radio instance. |
| `value` | Value | text | Yes | No | Controls the value used by this Radio instance. |
| `checked` | Checked | boolean | No | No | Controls the checked used by this Radio instance. |
| `required` | Required | boolean | No | No | Controls the required used by this Radio instance. |
| `draftBehavior` | Draft storage | select | No | Yes | Controls the draft storage used by this Radio instance. |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.form-control-label` | automated | error | This form control has no visible associated label. | Add a visible Label immediately before the control or explicitly target its field ID. |
| `a11y.unique-field-id` | automated | error | Form field IDs must be present and unique within the page. | Assign a stable field ID that is not used by another control. |

### Radio Button Group

A fieldset of mutually exclusive Radio controls sharing one name.

- Registry ID: `base.radio-group`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: pattern
- Backing implementation: pattern `base.pattern.radio-group`
- Search tags: form, radio, group, single choice

**Use when:** Use when exactly one visible option may be selected.

**Accessibility intent:** The fieldset legend states the question and every radio shares one submission name.

#### Properties

This entry exposes no instance properties.

#### Dependencies

No additional platform dependency.

### Reset Button

Resets the containing form through the shared form-action module.

- Registry ID: `base.reset-button`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.submit` with preset `reset`
- Search tags: form, reset, action, clear

**Use when:** Use sparingly and clearly distinguish reset from submission.

**Accessibility intent:** Use an explicit label; consider confirmation when reset would discard substantial work.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `label` | Label | text | Yes | No | Controls the label used by this Reset Button instance. |
| `disabled` | Disabled | boolean | No | No | Controls the disabled used by this Reset Button instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `reset` | Reset | `{"action":"reset","label":"Reset form"}` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific label value that explains the component's purpose. |

### Reusable Form Fragment

A centrally governed form-field fragment with an explicit binding prefix.

- Registry ID: `base.reusable-form-fragment`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: visual-component
- Backing implementation: Visual Component `base.vc.reusable-form-fragment`
- Search tags: form, fragment, reusable, fields, shared

**Use when:** Use one stable binding prefix per instance so repeated fragments cannot collide.

**Accessibility intent:** Keep every included control labelled and every generated field ID unique.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `label` | Accessible label | text | Yes | No | Controls the accessible label used by this Reusable Form Fragment instance. |
| `bindingPrefix` | Binding prefix | text | No | Yes | Controls the binding prefix used by this Reusable Form Fragment instance. |

#### Slots

| Slot | Purpose | Cardinality | Allowed content |
|---|---|---|---|
| `fields` (Fields) | Governed fields maintained by the fragment definition. | 1–many | `base.form-field-group`, `base.heading`, `base.rich-text`, `base.plain-text`, `base.image` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific label value that explains the component's purpose. |

### Save Draft

Persist recoverable form progress across sessions or devices.

- Registry ID: `base.save-draft`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: capability-backed
- Backing implementation: capability-backed module `base.form-draft-action` with preset `save-draft`
- Search tags: form, draft, save, recovery

**Use when:** Use only on a form configured for Persistent recovery. The capability remains unavailable while server persistence is disabled.

**Accessibility intent:** Announce saved, offline, conflict and failure states without moving focus.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `label` | Label | text | Yes | No | Controls the label used by this Save Draft instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `save-draft` | Save draft | `{"action":"save-draft","label":"Save draft"}` |

#### Dependencies

| Kind | Stable ID |
|---|---|
| Capability | `forms.drafts` |

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific label value that explains the component's purpose. |

### Select

A select control containing approved options.

- Registry ID: `base.select`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.select`
- Search tags: form, select, options

**Use when:** Use when one or more choices come from a controlled option set.

**Accessibility intent:** Pair with a visible Label and keep option labels concise.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `fieldId` | Field ID | text | Yes | No | Controls the field ID used by this Select instance. |
| `name` | Submission name | text | No | No | Controls the submission name used by this Select instance. |
| `required` | Required | boolean | No | No | Controls the required used by this Select instance. |
| `draftBehavior` | Draft storage | select | No | Yes | Controls the draft storage used by this Select instance. |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.form-control-label` | automated | error | This form control has no visible associated label. | Add a visible Label immediately before the control or explicitly target its field ID. |
| `a11y.unique-field-id` | automated | error | Form field IDs must be present and unique within the page. | Assign a stable field ID that is not used by another control. |

### Submit Button

Submits the containing form.

- Registry ID: `base.submit`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.submit`
- Search tags: form, submit, action

**Use when:** Place once near the end of a form.

**Accessibility intent:** Use a label that clearly states what will be submitted.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `label` | Label | text | Yes | No | Controls the label used by this Submit Button instance. |
| `disabled` | Disabled | boolean | No | No | Controls the disabled used by this Submit Button instance. |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.accessible-name` | automated | error | This component requires a non-empty accessible name. | Provide a specific label value that explains the component's purpose. |

### Summary / Review

A review step with editable summary content and final actions.

- Registry ID: `base.form-summary-review`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: pattern
- Backing implementation: pattern `base.pattern.form-summary-review`
- Search tags: form, wizard, summary, review, confirmation

**Use when:** Summarise entered values before the final submission action.

**Accessibility intent:** Keep edit actions specific and retain semantic headings for grouped answers.

#### Properties

This entry exposes no instance properties.

#### Dependencies

No additional platform dependency.

### Switch

An on/off choice backed by the canonical checkbox control.

- Registry ID: `base.switch`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.checkbox` with preset `switch`
- Search tags: form, checkbox, switch, toggle

**Use when:** Use for a setting whose effect is clear and immediate; otherwise use Checkbox.

**Accessibility intent:** Pair with a visible label that describes the enabled state.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `fieldId` | Field ID | text | Yes | No | Controls the field ID used by this Switch instance. |
| `name` | Submission name | text | No | No | Controls the submission name used by this Switch instance. |
| `value` | Enabled value | text | Yes | No | Controls the enabled value used by this Switch instance. |
| `checked` | Enabled initially | boolean | No | No | Controls the enabled initially used by this Switch instance. |
| `required` | Required | boolean | No | No | Controls the required used by this Switch instance. |
| `draftBehavior` | Draft storage | select | No | Yes | Controls the draft storage used by this Switch instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `switch` | Switch | `{"checked":false,"value":"on"}` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.form-control-label` | automated | error | This form control has no visible associated label. | Add a visible Label immediately before the control or explicitly target its field ID. |
| `a11y.unique-field-id` | automated | error | Form field IDs must be present and unique within the page. | Assign a stable field ID that is not used by another control. |

### Telephone Input

A telephone number.

- Registry ID: `base.telephone-input`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.input` with preset `tel`
- Search tags: form, field, tel

**Use when:** Use Telephone Input when the submitted value is a telephone number.

**Accessibility intent:** Pair the input with a visible Label and useful autocomplete value.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `fieldId` | Field ID | text | Yes | No | Controls the field ID used by this Telephone Input instance. |
| `name` | Submission name | text | No | No | Controls the submission name used by this Telephone Input instance. |
| `placeholder` | Placeholder | text | No | No | Controls the placeholder used by this Telephone Input instance. |
| `required` | Required | boolean | No | No | Controls the required used by this Telephone Input instance. |
| `draftBehavior` | Draft storage | select | No | Yes | Controls the draft storage used by this Telephone Input instance. |
| `autocomplete` | Autocomplete | text | No | No | Controls the autocomplete used by this Telephone Input instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `tel` | Telephone Input | `{"inputType":"tel"}` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.form-control-label` | automated | error | This form control has no visible associated label. | Add a visible Label immediately before the control or explicitly target its field ID. |
| `a11y.unique-field-id` | automated | error | Form field IDs must be present and unique within the page. | Assign a stable field ID that is not used by another control. |

### Terms and Conditions

Records agreement to an explicit versioned terms source.

- Registry ID: `base.terms-and-conditions`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: capability-backed
- Backing implementation: capability-backed pattern `base.pattern.terms-and-conditions`
- Search tags: form, terms, consent, versioned

**Use when:** Configure the approved terms content and immutable version before enabling the capability.

**Accessibility intent:** Use a visible required Checkbox label and never infer consent.

#### Properties

This entry exposes no instance properties.

#### Dependencies

| Kind | Stable ID |
|---|---|
| Capability | `forms.versioned-consent` |

### Text Area

A multi-line form input.

- Registry ID: `base.text-area`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.textarea`
- Search tags: form, field, multiline

**Use when:** Use for responses that may need more than one line.

**Accessibility intent:** Pair with a visible Label and concise help text when needed.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `fieldId` | Field ID | text | Yes | No | Controls the field ID used by this Text Area instance. |
| `name` | Submission name | text | No | No | Controls the submission name used by this Text Area instance. |
| `placeholder` | Placeholder | text | No | No | Controls the placeholder used by this Text Area instance. |
| `required` | Required | boolean | No | No | Controls the required used by this Text Area instance. |
| `draftBehavior` | Draft storage | select | No | Yes | Controls the draft storage used by this Text Area instance. |
| `rows` | Rows | number | Yes | No | Controls the rows used by this Text Area instance. |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.form-control-label` | automated | error | This form control has no visible associated label. | Add a visible Label immediately before the control or explicitly target its field ID. |
| `a11y.unique-field-id` | automated | error | Form field IDs must be present and unique within the page. | Assign a stable field ID that is not used by another control. |

### Text Input

General short text.

- Registry ID: `base.text-input`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.input` with preset `text`
- Search tags: form, field, text

**Use when:** Use Text Input when the submitted value is general short text.

**Accessibility intent:** Pair the input with a visible Label and useful autocomplete value.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `fieldId` | Field ID | text | Yes | No | Controls the field ID used by this Text Input instance. |
| `name` | Submission name | text | No | No | Controls the submission name used by this Text Input instance. |
| `placeholder` | Placeholder | text | No | No | Controls the placeholder used by this Text Input instance. |
| `required` | Required | boolean | No | No | Controls the required used by this Text Input instance. |
| `draftBehavior` | Draft storage | select | No | Yes | Controls the draft storage used by this Text Input instance. |
| `autocomplete` | Autocomplete | text | No | No | Controls the autocomplete used by this Text Input instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `text` | Text Input | `{"inputType":"text"}` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.form-control-label` | automated | error | This form control has no visible associated label. | Add a visible Label immediately before the control or explicitly target its field ID. |
| `a11y.unique-field-id` | automated | error | Form field IDs must be present and unique within the page. | Assign a stable field ID that is not used by another control. |

### URL Input

A web address.

- Registry ID: `base.url-input`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: primitive
- Backing implementation: module `base.input` with preset `url`
- Search tags: form, field, url

**Use when:** Use URL Input when the submitted value is a web address.

**Accessibility intent:** Pair the input with a visible Label and useful autocomplete value.

#### Properties

| Field | Author label | Control | Required | Advanced | Purpose |
|---|---|---|:---:|:---:|---|
| `fieldId` | Field ID | text | Yes | No | Controls the field ID used by this URL Input instance. |
| `name` | Submission name | text | No | No | Controls the submission name used by this URL Input instance. |
| `placeholder` | Placeholder | text | No | No | Controls the placeholder used by this URL Input instance. |
| `required` | Required | boolean | No | No | Controls the required used by this URL Input instance. |
| `draftBehavior` | Draft storage | select | No | Yes | Controls the draft storage used by this URL Input instance. |
| `autocomplete` | Autocomplete | text | No | No | Controls the autocomplete used by this URL Input instance. |

#### Presets

| ID | Name | Applied values |
|---|---|---|
| `url` | URL Input | `{"inputType":"url"}` |

#### Dependencies

No additional platform dependency.

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.form-control-label` | automated | error | This form control has no visible associated label. | Add a visible Label immediately before the control or explicitly target its field ID. |
| `a11y.unique-field-id` | automated | error | Form field IDs must be present and unique within the page. | Assign a stable field ID that is not used by another control. |

### Wizard

A persistent multi-step CMS-native form with review and recovery.

- Registry ID: `base.wizard`
- Version: `1.0.0`
- Status: stable
- Source: built-in
- Taxonomy: capability-backed
- Backing implementation: capability-backed pattern `base.pattern.form-wizard`
- Search tags: form, wizard, steps, draft, recovery

**Use when:** Use only when cross-session recovery is enabled and the form warrants multiple steps.

**Accessibility intent:** Keep step titles meaningful, validation local and recovery state explicit.

#### Properties

This entry exposes no instance properties.

#### Dependencies

| Kind | Stable ID |
|---|---|
| Capability | `forms.drafts` |

#### Accessibility checks

| Rule | Enforcement | Severity | Contract | Remediation |
|---|---|---|---|---|
| `a11y.no-javascript-fallback` | behavior-test | warning | Every step remains visible and submit-capable when enhancement is unavailable. | Keep authored steps in logical source order. |
| `a11y.announcement-contract` | behavior-test | warning | Save, recovery, conflict and expiry states are announced without stealing focus. | Preserve the persistent draft runtime contract. |
