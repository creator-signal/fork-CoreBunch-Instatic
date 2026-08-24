# Creator Signal authoring reference

This reference maps the public site to the shared template and governed components authors edit in Instatic.

The source of truth is `integrations/creator-signal/pack/site.ts`. It defines
the 26 route documents as page content only, one everywhere template that owns
shared header/footer/privacy choices, and one not-found template that owns the
unknown-route recovery content.

---

## TL;DR

- New pages inherit `Creator Signal site template` automatically.
- The template owns Site Header, Site Footer and Privacy Choices around one content outlet.
- Unknown routes compose that shared chrome with the governed `notFound`
  template and publish `noindex, follow, noarchive` metadata.
- Every catalogue component is available on ordinary pages and templates.
- Components placed in the shared template are inherited by its pages; components placed in a page affect that page only.
- Components may be added, reordered or removed freely.
- Starter patterns are insertion recipes only. They expand directly into ordinary page components and never persist a `creator-signal.site.pattern.*` owner around a page body.
- Creator Signal components are opinionated leaves except for **Two Column Layout**, a real container with independently editable Left and Right slots. Populated slots render without editor scaffolding so the canvas matches the published layout.
- `bun run verify:creator-signal-authoring-tasks` writes the current 37-entry task matrix to `.tmp/creator-signal-authoring-tasks/` and fails when the catalogue drifts from a supported authoring task.
- `bun run verify:creator-signal-parity` writes the browsable side-by-side report to `.tmp/creator-signal-parity/index.html`.
- `bun run verify:creator-signal-public-acceptance` verifies the locally
  published pack against the committed responsive, accessibility and visual
  baseline.

## Shared template

`integrations/creator-signal/pack/site.ts` installs this publish order:

```text
Creator Signal site template
├── Site Header                    creator-signal.site.header
├── main#main-content
│   └── content outlet
├── Site Footer                    creator-signal.site.footer
└── Privacy Choices                creator-signal.site.consent-banner
```

The page-creation dialog in `src/admin/shared/dialogs/SiteCreateDialog/SiteCreateDialog.tsx` identifies the active shared page frame before creation. The new page starts with an empty `base.body`; `src/core/templates/pageWrapperTemplates.ts` resolves the shared template for canvas preview and publication.

The separate `Creator Signal not found` template contains one governed
Recovery State with the `not-found` kind. It is not an ordinary route seed and
is excluded from the public route roster and sitemap inputs.

In Components view, template rows are read-only while an ordinary page is active. The owning-template action in `src/admin/pages/site/panels/LayersPanel/ComponentLayersTree.tsx` opens the shared template for editing. One edit therefore propagates to every wrapped route without copying header or footer nodes into those pages.

## Task-based authoring

`integrations/creator-signal/authoring-tasks.ts` is the application-owned task
matrix. It derives one row per registered Creator Signal entry and records the
same supported task on both surfaces: Components catalogue discovery,
placement-aware insertion, typed configuration, responsive preview,
publication, revision, and removal. Run:

```sh
bun run verify:creator-signal-authoring-tasks
```

The command writes a machine-readable `matrix.json` and a readable `matrix.md`
to `.tmp/creator-signal-authoring-tasks/`. Do not maintain a second checklist:
the matrix follows `integrations/creator-signal/component-library.ts` and fails
if an entry is missing, exposes a raw implementation field, leaves field help
blank, gives a leaf a slot, or lacks editor/MCP task support.

For ordinary page work, create the page from the shared template, select any
catalogue component from Components, complete its labelled fields or repeaters,
check mobile/tablet/desktop preview, and publish. Starter patterns are optional
insertion recipes: insertion places their real child components directly on the
page, where each one can be selected, configured, dragged or removed.
To revise, edit the retained component instance and publish again; remove the
component from the Components tree when it no longer belongs. For shared
chrome, open the template owner and add, reorder, edit or remove Header, Footer,
Navigation link repeaters, or Privacy Choices once.

MCP follows the same model: call `site_list_component_library`, insert the
returned entry with `site_insert_component`, change declared values with
`site_update_component_field`, inspect with `site_open_document` and
`site_render_snapshot`, then publish through the existing explicit publish
tool. It cannot supply arbitrary props, styles, or implementation markup.

## Public route and section map

Every row below is wrapped by the shared template. The sequence column lists only the content an author manages on that route.

| Route | Page | Opinionated page components in order |
| --- | --- | --- |
| `/` | Creator Signal | Campaign Hero → Signal Strip → Signal Comparison → Feature Grid → Process Steps → Feature Grid → Feature Grid → Pricing Plans → Founder Story → FAQ → Call to Action |
| `/products` | Products | Hero → Feature Grid → Call to Action |
| `/products/sales-pulse` | Sales Pulse | Hero → Feature Grid → Call to Action |
| `/features` | Features | Hero → Feature Grid |
| `/pricing` | Pricing | Hero → Feature Grid → Call to Action |
| `/contact` | Contact | Hero → Two Column Layout (Left: Section Intro; Right: Managed Form) |
| `/feedback` | Feedback | Hero → Two Column Layout (Left: Section Intro; Right: Embedded CRM Form) |
| `/wishlist` | Join the wishlist | Hero → Two Column Layout (Left: Section Intro; Right: Managed Form) |
| `/early-access` | Creator Signal Early Access | Campaign Hero → Signal Strip → Feature Grid → Two Column Layout (Left: Section Intro; Right: Managed Form) → Feature Grid → Feature Grid → Testimonial |
| `/waitlist` | Join the waitlist | Hero → Two Column Layout (Left: Section Intro; Right: Managed Form) |
| `/beta` | Try it early | Hero → Two Column Layout (Left: Section Intro; Right: Managed Form) |
| `/ask-a-question` | Ask a question | Hero → Two Column Layout (Left: Section Intro; Right: Managed Form) |
| `/feature-request` | Feature request | Hero → Two Column Layout (Left: Section Intro; Right: Managed Form) |
| `/report-an-error` | Report an error | Hero → Two Column Layout (Left: Section Intro; Right: Managed Form) |
| `/legal/privacy` | Privacy | Hero → Rich Text Section |
| `/legal/terms` | Terms | Hero → Rich Text Section |
| `/legal/billing` | Subscriptions, Cancellation and Refunds | Public Document |
| `/legal/acceptable-use` | Acceptable Use Policy | Public Document |
| `/legal/browser-extension` | Browser Extension Privacy and Permissions | Public Document |
| `/legal/cookies` | Cookie Policy | Public Document |
| `/legal/dpa` | Data Processing Addendum | Public Document |
| `/trust/security` | Security and Data Handling | Public Document |
| `/trust/subprocessors` | Subprocessors and Service Providers | Public Document |
| `/support` | Support and Complaints | Public Document |
| `/help/account-data` | Account Export and Deletion | Public Document |
| `/status` | Service Status | Public Document |

`creatorSignalPageAuthoringReference` in `integrations/creator-signal/pack/site.ts` exposes this mapping, its nested slot tree, component-boundary classification and migration disposition to tests and the visual report. `integrations/creator-signal/pack/routes.ts` owns the independent route roster so a route cannot silently disappear from verification. The reviewed route-by-route inventory is recorded in `PAGE-BODY-AUTHORING.md`.

## Pattern catalogue

`creatorSignalPublicPatternCatalogue` is the one role-to-implementation map. A
pattern-owned role materializes an atomic subtree through Instatic's Component
Library registry. A component-owned role points at an existing governed leaf
instead of duplicating it as a second implementation.

| Author need | Stable mapping | Implementation |
| --- | --- | --- |
| Home page | `creator-signal.site.pattern.home-v2-page` | Recipe for the reference-design eleven-section marketing flow; the ID is not persisted as a page node |
| Early Access page | `creator-signal.site.pattern.early-access-page` | Noindex preview with separate Section Intro and governed wishlist provider inside Two Column Layout |
| Hero | `creator-signal.site.pattern.hero` | Existing Hero Visual Component |
| Content page | `creator-signal.site.pattern.content-page` | Hero → Rich Text Section → Call to Action |
| Product page | `creator-signal.site.pattern.product-page` | Hero → Feature Grid → Call to Action |
| Pricing page | `creator-signal.site.pattern.pricing-page` | Hero → Feature Grid → Call to Action |
| Features page | `creator-signal.site.pattern.features-page` | Hero → Feature Grid |
| CTA | `creator-signal.site.pattern.call-to-action` | Existing Call to Action component |
| FAQ | `creator-signal.site.pattern.faq` | Existing native-disclosure FAQ component |
| Contact/intake page | `creator-signal.site.pattern.contact-page` | Hero → Two Column Layout with independent Section Intro and capability-backed Managed Form |
| Feedback page | `creator-signal.site.pattern.feedback-page` | Hero → Two Column Layout with an independent Section Intro in the Left slot and Embedded CRM Form in the Right slot |
| Legal/trust document | `creator-signal.site.pattern.legal-trust-page` | Recipe that inserts one directly selectable versioned Public Document |
| Article/content page | `creator-signal.site.pattern.article-content-page` | Hero → Rich Text Section |
| Comparison section | `creator-signal.site.pattern.comparison-section` | Captioned row-and-column Comparison Section |
| Empty state | `creator-signal.site.pattern.empty-state` | Textual Recovery State with action |
| Error state | `creator-signal.site.pattern.error-state` | Textual Recovery State with action |
| Offline state | `creator-signal.site.pattern.offline-state` | Textual Recovery State with status action |
| Not-found state | `creator-signal.site.pattern.not-found-state` | Noindex Recovery State with return-home action |

Use a Visual Component when a reusable fixed tree needs scalar parameters.
Use a governed module component when one opinionated semantic renderer owns
repeaters, rich text or provider behaviour. Use a pattern when authors need an
approved multi-component starting structure whose child components remain
independently authorable. Saved layouts are intentionally not used by this
pack: they are for copyable structures that may diverge after insertion.

## Component authoring map

| Component | Placement | Author controls | Repeatable data | Slots |
| --- | --- | --- | --- | --- |
| Creator Signal Hero | Page or template | Eyebrow, heading, introduction, action label, action URL, artwork | None | None |
| Campaign Hero | Page or template | Eyebrow, heading, introduction, two actions, footnote and artwork | None | None |
| Signal Strip | Page or template | Accessible label | Short static promise messages | None |
| Signal Comparison | Page or template | Heading, before/after copy, artwork and section anchor | None | None |
| Process Steps | Page or template | Heading, introduction and section anchor | Ordered step marker, heading and description | None |
| Pricing Plans | Page or template | Heading, introduction, footnote and section anchor | Plan price, cadence, features, action and emphasis | None |
| Founder Story | Page or template | Heading, formatted story, attribution, portrait and section anchor | None | None |
| Site Header | Page or template | Brand name, tagline, home URL | Navigation links with label, URL and treatment | None |
| Site Footer | Page or template | Brand name, tagline, copyright | Footer links with label and URL | None |
| Privacy Choices | Page or template | Heading, explanation and both choice labels | None | None |
| Feature Grid | Page or template | Eyebrow, heading, introduction, section anchor and default/signature tone | Feature marker, heading and description | None |
| Call to Action | Page or template | Eyebrow, heading, explanation, action label, action URL, section anchor | None | None |
| Rich Text Section | Page or template | Heading, one coherent formatted content field, section anchor | None | None |
| Testimonial | Page or template | Quotation, attribution, role or business | None | None |
| FAQ | Page or template | Heading and section anchor | Question and answer | None |
| Comparison Section | Page or template | Heading, introduction, caption and three option labels | Criterion and three option values | None |
| Recovery State | Page or template | Empty/error/offline/not-found kind, heading, explanation and recovery action | None | None |
| Public Document | Page or template | Eyebrow, document heading, summary, one formatted document field, date modified | None | None |
| Managed Form | Page or template, including layout slots | Success message, section anchor and governed provider/analytics configuration | Form markup and fields are resolved from the governed registry | None |
| Section Intro | Page or template, including layout slots | Eyebrow, heading, introduction and section anchor | None | None |
| Two Column Layout | Page or template | Component order and content within each column | None | Left and Right |
| Embedded CRM Form | Page or template, including layout slots | CRM form URL, iframe title, fallback copy and bounded resize heights | Same-origin observation or CRM `postMessage` resize events | None |

The catalogue contract lives in `integrations/creator-signal/component-library.ts`. The semantic renderers live in `integrations/creator-signal/modules/site-components/index.ts`, `integrations/creator-signal/modules/mautic-form.ts` and `integrations/creator-signal/modules/crm-iframe-form.ts`. They preserve headings, landmarks, accessible names and schema.org metadata while keeping markup structure out of routine authoring.

## Embedded CRM Form resizing

Use **Embedded CRM Form** when Mautic exposes a complete HTTPS form page. The
author chooses its Mautic URL, accessible iframe title, fallback link text and
bounded initial/minimum/maximum height. The visible fallback link always opens
the same form in a new tab. The component owns only the embed: place it in the
Right slot of **Two Column Layout** for the Feedback treatment, and place an
independent **Section Intro** or another suitable component in the Left slot.
The built-in Teaser is not used by the starter because its contract requires a
navigation destination; static form-introduction copy does not.

The seeded Feedback tree is:

```text
Feedback Page
├── Creator Signal Hero
└── Two Column Layout
    ├── Left
    │   └── Section Intro
    └── Right
        └── Embedded CRM Form
```

Every named node above has its own Component Library entry and remains
selectable. A `Missing library entry` label means the editor is running stale
plugin catalogue records, not that the content has been intentionally hidden.
Reconcile/install plugin 0.8.0 and use the previewed content migration for
retained 0.7.0 pages. It removes only the exact technical recipe wrapper,
preserves the authored child component IDs, fields and order, and never
publishes automatically.

If the Mautic form and public page have the same origin, Instatic observes the
iframe document and updates its height automatically. For the usual
cross-origin `marketing.creatorsignal.me` form, the Mautic form page must send
resize updates to its exact public-site origin; a browser cannot read a
cross-origin iframe's document height.

Add this helper to the hosted Mautic form page, replacing the two placeholders
with the page's public origin and the component's **Section anchor**:

```js
const publishHeight = () => window.parent.postMessage({
  type: 'creator-signal.crm-form.resize.v1',
  instanceId: '<SECTION_ANCHOR>',
  height: document.documentElement.scrollHeight,
}, '<PUBLIC_SITE_ORIGIN>')

new ResizeObserver(publishHeight).observe(document.documentElement)
window.addEventListener('load', publishHeight)
```

The Mautic page must permit framing by the public-site origin. If it sends
`X-Frame-Options: DENY` or a restrictive `frame-ancestors` policy, the browser
will block the iframe; retain the fallback link in that case.

## Placement enforcement

`src/core/component-library/schemas.ts` declares `allowedDocumentKinds` and `maxInstancesPerDocument`. `src/core/component-library/placement.ts` evaluates them with the existing parent, child, slot and cardinality rules.

The same resolver protects all authoring paths:

- `src/admin/pages/site/panels/LayersPanel/ComponentLibraryDialog.tsx` disables invalid insertion and explains where the component belongs.
- `src/admin/pages/site/component-library/componentLibraryAuthoring.ts` enforces insertion for the editor and Agent/MCP bridge.
- `src/admin/pages/site/panels/LayersPanel/componentLayersDnd.ts` enforces drag-and-drop moves.
- `server/writePolicy/pageDiff.ts` validates component-only writes at the server boundary.

This validates a component's own declared data and safety contracts without
locking it to a route, fixed child sequence, document kind or cardinality.

## Side-by-side visual report

Run:

```sh
bun run test:e2e:install
bun run verify:creator-signal-parity \
  --baseline-base https://creatorsignal.me \
  --candidate-base http://localhost:4330
```

Open `.tmp/creator-signal-parity/index.html`. The report contains:

- the shared-template sequence;
- the complete route-to-component matrix;
- the authoring catalogue with placement, fields, repeaters and slot counts;
- full-page production and candidate images at desktop, tablet and mobile;
- production and candidate images for every header, content section, footer and privacy section;
- pixel metrics, semantic differences and SEO failures; and
- consent and managed-form interaction results.

`.tmp/creator-signal-parity/report.json` contains the same evidence for automation. Screenshots are always retained for the reference report, including passing comparisons.

## Acceptance contract

A route comparison passes only when:

- full-page and per-section visual deltas stay within the configured tolerance;
- visible text, heading hierarchy, landmarks, class names and page height match;
- the component-section order matches;
- title, description, canonical, robots, Open Graph, Twitter and language metadata are complete;
- schema.org navigation metadata is present; and
- the JavaScript-enabled consent and managed-form checks pass.

The visual report is evidence, not deployment authority. Production release and deployment remain separate governed actions.

## Forbidden patterns

| Pattern | Use instead |
| --- | --- |
| Header, footer or privacy controls copied into each page | Edit the shared site template once |
| Multiple components for one prose block | One Rich Text Section or Public Document rich-text field |
| Navigation or cards represented as child slots | Typed repeater items on the owning leaf component |
| Numeric managed-form IDs in page content | Stable form aliases resolved from the generated registry |
| Hand-edited HTML or CSS for routine content changes | Governed fields and Creator Signal design tokens |
| A route seed assembled independently from string templates | A registered insertion recipe that expands into governed page components |
| Declaring parity from one desktop screenshot | The complete desktop, tablet, mobile, section, interaction and metadata report |

## Related

- `integrations/creator-signal/ACCEPTANCE.md` — published-pack browser and visual gate
- `integrations/creator-signal/PARITY.md` — parity command and thresholds
- `integrations/creator-signal/COMPONENTS.md` — extending the component catalogue
- `integrations/creator-signal/component-library.ts` — component authoring source of truth
- `integrations/creator-signal/pack/site.ts` — route and shared-template source of truth
- `scripts/verify-creator-signal-parity.ts` — side-by-side report generator
- `scripts/verify-creator-signal-public-acceptance.ts` — source-owned public browser gate
- `src/__tests__/plugins/creatorSignalSitePack.test.ts` — route, template and component gates
- `src/__tests__/component-library/componentLibraryPlacement.test.ts` — placement-policy gate
- `src/__tests__/panels/componentLibraryDialog.test.tsx` — author-facing placement explanation gate
