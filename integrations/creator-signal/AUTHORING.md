# Creator Signal authoring reference

This reference maps the public site to the shared template and governed components authors edit in Instatic.

The source of truth is `integrations/creator-signal/pack/site.ts`. It defines
the 24 route documents as page content only, one everywhere template that owns
shared header/footer/privacy choices, and one not-found template that owns the
unknown-route recovery content.

---

## TL;DR

- New pages inherit `Creator Signal site template` automatically.
- The template owns Site Header, Site Footer and Privacy Choices around one content outlet.
- Unknown routes compose that shared chrome with the governed `notFound`
  template and publish `noindex, follow, noarchive` metadata.
- Authors creating an ordinary page add only page-content components.
- Shared chrome is template-only and limited to one instance of each component per template.
- Page-content components are page-only; the Hero is limited to one instance per page.
- Every starter route materializes one stable `creator-signal.site.pattern.*` catalogue entry; its authorable children are governed components.
- Creator Signal components are opinionated leaves. Pattern roots are governed containers; neither model exposes arbitrary child slots.
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

## Public route and section map

Every row below is wrapped by the shared template. The sequence column lists only the content an author manages on that route.

| Route | Page | Opinionated page components in order |
| --- | --- | --- |
| `/` | Creator Signal | Campaign Hero → Signal Strip → Signal Comparison → Feature Grid → Process Steps → Feature Grid → Feature Grid → Pricing Plans → Founder Story → FAQ → Call to Action |
| `/products` | Products | Hero → Feature Grid → Call to Action |
| `/products/sales-pulse` | Sales Pulse | Hero → Feature Grid → Call to Action |
| `/features` | Features | Hero → Feature Grid |
| `/pricing` | Pricing | Hero → Comparison Section → Call to Action |
| `/contact` | Contact | Hero → Managed Form |
| `/feedback` | Feedback | Hero → Managed Form |
| `/wishlist` | Join the wishlist | Hero → Managed Form |
| `/early-access` | Creator Signal Early Access | Campaign Hero → Signal Strip → Feature Grid → Managed Form → Feature Grid → Feature Grid → Testimonial |
| `/ask-a-question` | Ask a question | Hero → Managed Form |
| `/feature-request` | Feature request | Hero → Managed Form |
| `/report-an-error` | Report an error | Hero → Managed Form |
| `/legal/privacy` | Privacy | Public Document |
| `/legal/terms` | Terms | Public Document |
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

`creatorSignalPageAuthoringReference` in `integrations/creator-signal/pack/site.ts` exposes this mapping to tests and the visual report. `integrations/creator-signal/pack/routes.ts` owns the independent route roster so a route cannot silently disappear from verification.

## Pattern catalogue

`creatorSignalPublicPatternCatalogue` is the one role-to-implementation map. A
pattern-owned role materializes an atomic subtree through Instatic's Component
Library registry. A component-owned role points at an existing governed leaf
instead of duplicating it as a second implementation.

| Author need | Stable mapping | Implementation |
| --- | --- | --- |
| Home v2 page | `creator-signal.site.pattern.home-v2-page` | Complete governed marketing flow with pricing, founder story and signup |
| Early Access page | `creator-signal.site.pattern.early-access-page` | Noindex preview with one governed wishlist form |
| Hero | `creator-signal.site.pattern.hero` | Existing Hero Visual Component |
| Content page | `creator-signal.site.pattern.content-page` | Hero → Rich Text Section → Call to Action |
| Product page | `creator-signal.site.pattern.product-page` | Hero → Feature Grid → Call to Action |
| Pricing page | `creator-signal.site.pattern.pricing-page` | Hero → Comparison Section → Call to Action |
| Features page | `creator-signal.site.pattern.features-page` | Hero → Feature Grid |
| CTA | `creator-signal.site.pattern.call-to-action` | Existing Call to Action component |
| FAQ | `creator-signal.site.pattern.faq` | Existing native-disclosure FAQ component |
| Contact/intake page | `creator-signal.site.pattern.contact-page` | Hero → capability-backed Managed Form |
| Legal/trust document | `creator-signal.site.pattern.legal-trust-page` | Versioned Public Document |
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
| Creator Signal Hero | Page; maximum one | Eyebrow, heading, introduction, action label, action URL, artwork | None | None |
| Campaign Hero | Page; maximum one | Eyebrow, heading, introduction, two actions, footnote and artwork | None | None |
| Signal Strip | Page | Accessible label | Short static promise messages | None |
| Signal Comparison | Page | Heading, before/after copy, artwork and section anchor | None | None |
| Process Steps | Page | Heading, introduction and section anchor | Ordered step marker, heading and description | None |
| Pricing Plans | Page | Heading, introduction, footnote and section anchor | Plan price, cadence, features, action and emphasis | None |
| Founder Story | Page | Heading, formatted story, attribution, portrait and section anchor | None | None |
| Site Header | Shared template; maximum one | Brand name, tagline, home URL | Navigation links with label, URL and treatment | None |
| Site Footer | Shared template; maximum one | Brand name, tagline, copyright | Footer links with label and URL | None |
| Privacy Choices | Shared template; maximum one | Heading, explanation and both choice labels | None | None |
| Feature Grid | Page | Eyebrow, heading, introduction, section anchor and default/signature tone | Feature marker, heading and description | None |
| Call to Action | Page | Eyebrow, heading, explanation, action label, action URL, section anchor | None | None |
| Rich Text Section | Page | Heading, one coherent formatted content field, section anchor | None | None |
| Testimonial | Page | Quotation, attribution, role or business | None | None |
| FAQ | Page | Heading and section anchor | Question and answer | None |
| Comparison Section | Page | Heading, introduction, caption and three option labels | Criterion and three option values | None |
| Recovery State | Page or not-found template; maximum one | Empty/error/offline/not-found kind, heading, explanation and recovery action | None | None |
| Public Document | Page | Eyebrow, document heading, summary, one formatted document field, date modified | None | None |
| Managed Form | Page | Eyebrow, heading, introduction, success message and section anchor | Provider fields are resolved from the governed registry | None |

The catalogue contract lives in `integrations/creator-signal/component-library.ts`. The semantic renderers live in `integrations/creator-signal/modules/site-components/index.ts` and `integrations/creator-signal/modules/mautic-form.ts`. They preserve headings, landmarks, accessible names and schema.org metadata while keeping markup structure out of routine authoring.

## Placement enforcement

`src/core/component-library/schemas.ts` declares `allowedDocumentKinds` and `maxInstancesPerDocument`. `src/core/component-library/placement.ts` evaluates them with the existing parent, child, slot and cardinality rules.

The same resolver protects all authoring paths:

- `src/admin/pages/site/panels/LayersPanel/ComponentLibraryDialog.tsx` disables invalid insertion and explains where the component belongs.
- `src/admin/pages/site/component-library/componentLibraryAuthoring.ts` enforces insertion for the editor and Agent/MCP bridge.
- `src/admin/pages/site/panels/LayersPanel/componentLayersDnd.ts` enforces drag-and-drop moves.
- `server/writePolicy/pageDiff.ts` validates component-only writes at the server boundary.

This keeps a shared header or footer from becoming duplicated page content and stops a page Hero from being inserted into the shared site template.

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
| A page-content component inserted into the shared template | Add it to the ordinary page content outlet |
| Multiple components for one prose block | One Rich Text Section or Public Document rich-text field |
| Navigation or cards represented as child slots | Typed repeater items on the owning leaf component |
| Numeric managed-form IDs in page content | Stable form aliases resolved from the generated registry |
| Hand-edited HTML or CSS for routine content changes | Governed fields and Creator Signal design tokens |
| A route seed assembled independently from string templates | A registered pattern plus its governed child components |
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
