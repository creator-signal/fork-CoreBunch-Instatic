# Creator Signal reference website flow

This contract maps the approved website references in Sales Pulse
`ref/design/website` into governed, authorable Instatic components. The stable
`creator-signal.site.pattern.home-v2-page` identifier and this filename remain
for migration compatibility; they do not identify a second design system.

The Sales Pulse Design System is authoritative for colour, typography, theme,
assets and accessibility. Instatic consumes its locked generated foundation
and composes those semantic roles into the website layouts. Intake raster
references guide hierarchy and flow but are not copied into the runtime.

## Page ownership

```text
Instatic public site
├── /                              Reference-design marketing Home
├── /early-access                  Noindex launch/testing interest capture
├── /products/*, /features         Supporting marketing pages
└── /legal/*, /trust/*, /support   Public documents, forms and help
             │
             ├── Get started ───────────► Sales Pulse sign-up
             └── Sign in ───────────────► Sales Pulse identity boundary
```

Instatic owns public marketing content and Mautic-backed intake forms. It does
not reproduce account creation, login, identity recovery, onboarding,
connection setup or the Sales Pulse dashboard. Marketing actions use the
canonical application URLs:

- sign-up: `https://salespulse.creatorsignal.me/sign-up`
- sign-in and product: `https://salespulse.creatorsignal.me`

## Home flow

The stable `creator-signal.site.pattern.home-v2-page` pattern materialises the
approved long-form flow as eleven independently authorable sections:

1. Campaign Hero introduces the promise and owns the only H1.
2. Signal Strip reinforces the core signal proposition.
3. Signal Comparison frames the before-and-after outcome.
4. Feature Grid explains the product choices.
5. Process Steps explains how the workflow operates.
6. Feature Grid describes the capability set.
7. Feature Grid describes Creator Signal's values.
8. Pricing Plans presents the plans and product actions.
9. Founder Story provides trust and provenance.
10. FAQ answers the principal decision questions.
11. Call to Action hands the visitor to Sales Pulse sign-up.

The shared template supplies the authorable Header, Footer and Privacy Choices
once around the page outlet. The Header uses the governed brand mark and typed
navigation repeater; it does not expose arbitrary child slots. Every section
uses the same semantic theme and responsive contract at desktop, tablet and
mobile widths.

## Forms and early-access flow

Every public intake route separates page copy from provider behaviour. A Two
Column Layout owns real Left and Right slots, Section Intro owns the section
heading and introduction in the Left slot, and a standalone Managed Form in the
Right slot resolves its alias through the generated Mautic registry. Managed
Form owns only provider configuration, delivery and result state. Feedback uses
the same composition boundary with Embedded CRM Form as its provider.

`/early-access` remains `noindex, follow, noarchive` and contains exactly one
`creator_signal_wishlist` form with the `early_access` campaign code:

```text
Early Access page
  ├── Choose launch notification
  ├── Choose early testing
  └── Choose both
          │
          ▼
one creator_signal_wishlist form
          │
          ├── submitting  aria-busy + disabled submit + live status
          ├── success     form hidden + confirmation + typed success event
          ├── rejected    retry copy + typed safe failure event
          └── unavailable explanation + typed safe failure event
```

The preference field is provider-owned and resolved from the governed registry.
Permission copy is specific to the requested update and is not treated as
general marketing consent. Contact, question, feature-request and error-report
routes use Managed Form with their own governed aliases. Feedback instead uses
an editable Two Column Layout with separate Section Intro and Embedded CRM Form
components so its text and iframe can be selected, replaced or removed independently.

## Content lifecycle

Pack pages are starter content for an empty installation. Plugin 0.7.0
reconciles technical catalogue, policy, style and runtime records but does not
overwrite authored pages. The explicit content migration recognises exact
retained 0.1.11, 0.2.0-0.2.6, 0.3.5, 0.4.0, 0.5.0 and 0.6.0 starter content, produces a
reviewable `merge-overwrite` archive, and blocks the complete migration if any
page or template contains an unrecognised authored difference.

Semantic hashes ignore generated node identities while retaining authored
content, metadata, structure and ordering. The migration archive never
publishes: operators review the report and import preview, apply it
deliberately, inspect the draft site, and then publish. The untouched export is
retained as rollback evidence.

## Local acceptance

Run:

```sh
bun run creator-signal:design-system:check
bun test src/__tests__/plugins/creatorSignalPageBodyAuthoring.test.ts
bun test src/__tests__/plugins/creatorSignalSitePack.test.ts
bun test src/__tests__/plugins/creatorSignalContentMigration.test.ts
bun run instatic-plugin lint integrations/creator-signal
bun run instatic-plugin build integrations/creator-signal
bun run verify:creator-signal-public-acceptance
```

The browser gate covers 1440px, 900px and 390px viewports, light/dark/system
themes, keyboard and WCAG checks, form states, degraded states and committed
visual baselines. Production comparison remains a separate deployment audit:

```sh
bun run verify:creator-signal-parity -- \
  --baseline-base https://creatorsignal.me \
  --candidate-base http://localhost:4330
```

The production comparison is expected to show the deliberate reference-design
change until that design is deployed. Live provider delivery and production
publication remain separate post-deployment acceptance gates.
