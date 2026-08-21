# Creator Signal public website flow

This contract keeps the public site visually and behaviourally aligned with
the current production website while making every page section authorable as a
governed Creator Signal component. The filename and the stable
`creator-signal.site.pattern.home-v2-page` identifier remain for migration
compatibility; they do not describe a separate visual redesign.

Published markup, semantic tokens, responsive behaviour, assets and authoring
constraints are owned by the Creator Signal component catalogue. The parity
verifier compares the generated pages with the production baseline at desktop,
tablet and mobile sizes before a release can pass.

## Page ownership

```text
Instatic public site
├── /                              Production-look Home
├── /early-access                  Noindex launch/testing interest capture
├── /products/*, /features         Supporting marketing pages
└── /legal/*, /trust/*, /support   Public documents and help
             │
             ├── Product action ─────────► Sales Pulse sign-up or product route
             └── Sign in ─────────────────► Sales Pulse identity boundary
```

Instatic does not reproduce account creation, login, identity recovery,
onboarding, connection setup or the Sales Pulse dashboard. Those remain
application-owned journeys. Marketing actions use the canonical application
URLs; they do not point at placeholder routes.

## Home flow

The stable `creator-signal.site.pattern.home-v2-page` pattern now materialises
the concise production composition:

1. Hero owns the only H1, introduction, primary action and optional artwork.
2. Feature Grid owns the section introduction and typed feature-card repeater.
3. Call to Action owns the final next step.

The shared template supplies the authorable Header, Footer and Privacy Choices
once around the page outlet. The Header owns a typed list of navigation links;
it does not expose child slots. The CSS-built signal is the default Hero artwork
so an author may replace it through the optional image field without editing
markup.

## Early Access and form flow

`/early-access` is an additional preview page with
`noindex, follow, noarchive`. Production currently has no comparable route, so
the side-by-side report labels it candidate-only and still enforces its own
semantic, responsive, SEO and interaction checks. It contains exactly one
Managed Form using the governed `creator_signal_wishlist` alias and the
`early_access` campaign code.

```text
Early Access page
  ├── Choose launch notification
  ├── Choose early testing
  └── Choose both
          │
          ▼
one creator_signal_wishlist form
          │
          ├── submitting  aria-busy + submit disabled + live status
          ├── success     form hidden + confirmation + typed success event
          ├── rejected    retry copy + typed safe failure event
          └── unavailable explanatory state + typed safe failure event
```

The provider form exposes an explicit preference field for launch notification,
early testing or both. That field is resolved from the generated provider
registry and is not copied into page markup. Permission copy is specific to the
requested update and is not treated as general marketing consent.

## Content lifecycle

Pack pages are starter content for an empty installation. Plugin 0.3.9
reconciles technical catalogue, policy, style and runtime records but does not
overwrite authored pages. The explicit content migration recognises exact
retained 0.1.11, 0.2.0-0.2.6 and 0.3.5 content, produces a reviewable
`merge-overwrite` archive, and blocks the complete migration if any page or
template contains an unrecognised authored difference.
Its semantic hashes ignore generated node identities while retaining authored
content, metadata, structure and ordering, making repeated preparation
deterministic without weakening the overwrite guard.

The migration archive does not publish. Operators review the report and import
preview, apply it deliberately, inspect the draft site, and then publish. The
untouched export is retained as rollback evidence.

## Local acceptance

Run:

```sh
bun run creator-signal:design-system:check
bun test src/__tests__/plugins/creatorSignalSitePack.test.ts
bun test src/__tests__/plugins/creatorSignalContentMigration.test.ts
bun run instatic-plugin lint integrations/creator-signal
bun run instatic-plugin build integrations/creator-signal
bun run verify:creator-signal-public-acceptance
bun run verify:creator-signal-parity -- \
  --baseline-base https://creatorsignal.me \
  --candidate-base http://localhost:4330
```

The side-by-side report must cover every public route and section at all three
viewports. Live provider delivery and production publication remain separate
post-deployment acceptance gates.
