# Creator Signal authoring reference

This reference maps the public site to the shared template and governed components authors edit in Instatic.

The source of truth is `integrations/creator-signal/pack/site.ts`. It defines the 23 route documents as page content only and one everywhere template that owns the shared header, footer and privacy choices.

---

## TL;DR

- New pages inherit `Creator Signal site template` automatically.
- The template owns Site Header, Site Footer and Privacy Choices around one content outlet.
- Authors creating an ordinary page add only page-content components.
- Shared chrome is template-only and limited to one instance of each component per template.
- Page-content components are page-only; the Hero is limited to one instance per page.
- All Creator Signal components are opinionated leaves. They expose typed fields, rich text and repeaters, never child slots.
- `bun run verify:creator-signal-parity` writes the browsable side-by-side report to `.tmp/creator-signal-parity/index.html`.

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

In Components view, template rows are read-only while an ordinary page is active. The owning-template action in `src/admin/pages/site/panels/LayersPanel/ComponentLayersTree.tsx` opens the shared template for editing. One edit therefore propagates to every wrapped route without copying header or footer nodes into those pages.

## Public route and section map

Every row below is wrapped by the shared template. The sequence column lists only the content an author manages on that route.

| Route | Page | Opinionated page components in order |
| --- | --- | --- |
| `/` | Creator Signal | Hero → Feature Grid → Call to Action |
| `/products` | Products | Hero → Feature Grid → Call to Action |
| `/products/sales-pulse` | Sales Pulse | Hero → Feature Grid → Call to Action |
| `/features` | Features | Hero → Feature Grid |
| `/pricing` | Pricing | Hero → Feature Grid → Call to Action |
| `/contact` | Contact | Hero → Managed Form |
| `/feedback` | Feedback | Hero → Managed Form |
| `/wishlist` | Join the wishlist | Hero → Managed Form |
| `/ask-a-question` | Ask a question | Hero → Managed Form |
| `/feature-request` | Feature request | Hero → Managed Form |
| `/report-an-error` | Report an error | Hero → Managed Form |
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

`creatorSignalPageAuthoringReference` in `integrations/creator-signal/pack/site.ts` exposes this mapping to tests and the visual report. `integrations/creator-signal/pack/routes.ts` owns the independent route roster so a route cannot silently disappear from verification.

## Component authoring map

| Component | Placement | Author controls | Repeatable data | Slots |
| --- | --- | --- | --- | --- |
| Creator Signal Hero | Page; maximum one | Eyebrow, heading, introduction, action label, action URL, artwork | None | None |
| Site Header | Shared template; maximum one | Brand name, tagline, home URL | Navigation links with label, URL and treatment | None |
| Site Footer | Shared template; maximum one | Brand name, tagline, copyright | Footer links with label and URL | None |
| Privacy Choices | Shared template; maximum one | Heading, explanation and both choice labels | None | None |
| Feature Grid | Page | Eyebrow, heading, introduction, section anchor | Feature marker, heading and description | None |
| Call to Action | Page | Eyebrow, heading, explanation, action label, action URL, section anchor | None | None |
| Rich Text Section | Page | Heading, one coherent formatted content field, section anchor | None | None |
| Testimonial | Page | Quotation, attribution, role or business | None | None |
| FAQ | Page | Heading and section anchor | Question and answer | None |
| Public Document | Page | Eyebrow, document heading, summary, one formatted document field, date modified | None | None |
| Managed Form | Page | Eyebrow, heading, introduction and success message | Provider fields are resolved from the governed registry | None |

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
| Declaring parity from one desktop screenshot | The complete desktop, tablet, mobile, section, interaction and metadata report |

## Related

- `integrations/creator-signal/PARITY.md` — parity command and thresholds
- `integrations/creator-signal/COMPONENTS.md` — extending the component catalogue
- `integrations/creator-signal/component-library.ts` — component authoring source of truth
- `integrations/creator-signal/pack/site.ts` — route and shared-template source of truth
- `scripts/verify-creator-signal-parity.ts` — side-by-side report generator
- `src/__tests__/plugins/creatorSignalSitePack.test.ts` — route, template and component gates
- `src/__tests__/component-library/componentLibraryPlacement.test.ts` — placement-policy gate
- `src/__tests__/panels/componentLibraryDialog.test.tsx` — author-facing placement explanation gate
