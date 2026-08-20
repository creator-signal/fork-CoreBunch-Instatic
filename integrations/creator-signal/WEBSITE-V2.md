# Creator Signal website v2 flow

This contract translates the review material in the Sales Pulse repository
into testable Instatic pages. The visual references are:

- `ref/design/website/index.html` — Home direction;
- `ref/design/website/presale.html` — pre-launch/Early Access direction; and
- `ref/design/website/creator_signal_site_flow.png` — cross-surface journey.

The references inform hierarchy, voice and section intent. Published markup,
tokens, assets, themes, responsive behaviour and authoring constraints remain
owned by the governed Creator Signal Design System and Instatic component
catalogue.

## Page ownership

```text
Instatic public site
├── /                              Home v2 marketing and product explanation
├── /early-access                  Noindex launch/testing interest capture
├── /products/*, /features         Supporting marketing pages
└── /legal/*, /trust/*, /support   Public documents and help
             │
             ├── Get started free ───────► Sales Pulse /sign-up
             └── Log in ─────────────────► Sales Pulse OIDC login endpoint
                                                │
                                                ▼
                                      ZITADEL identity boundary
                                                │
                                                ▼
                                  Sales Pulse onboarding and dashboard
```

Instatic does not reproduce account creation, login, identity recovery,
onboarding, connection setup or the Sales Pulse dashboard. Those remain
application-owned journeys. Marketing actions use the canonical application
URLs; they do not point at placeholder Instatic routes.

## Home flow

The `creator-signal.site.pattern.home-v2-page` pattern keeps the reviewed story
in one governed sequence:

1. Campaign Hero states the product promise and offers one primary signup.
2. Signal Strip reinforces short brand promises without animation.
3. Signal Comparison shows the limited current view and the intended visual
   signal without relying on colour alone.
4. Current Options names the three existing workarounds.
5. Process Steps explains Connect, See and Grow as an ordered list.
6. Feature and signature-value grids explain outcomes and trust principles.
7. Pricing Plans provide Free, Starter and Pro comparisons; all signup actions
   enter the application-owned signup journey.
8. Founder Story, FAQ and the final secondary CTA close the decision flow.

The Header preserves one direct login action and one primary signup action.
Every Home section anchor is unique and the Campaign Hero owns the only H1.

## Early Access and form flow

`/early-access` is an explicit test page with `noindex, follow, noarchive`.
It is not an account-registration page. It contains exactly one Managed Form
using the governed `creator_signal_wishlist` alias and the `early_access`
campaign code.

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

The provider form must expose an explicit preference field for launch
notification, early testing, or both. That field is owned by the Sales Pulse
Mautic source and generated registry, not copied into Instatic markup. The
permission copy is specific to the requested update and must not be treated as
general marketing consent. The form retains visible provider labels, required
field semantics and its existing consent timestamp contract.

## Content lifecycle

These pages are starter content for an empty local/test installation. Plugin
0.3.5 reconciles technical catalogue, policy, style and runtime records, but it
does not overwrite an installation that already has authored pages. Moving
Home v2 or Early Access into an existing site therefore requires an explicit
content migration with preview, backup and rollback. Installing the plugin is
not a production publication or deployment.

## Local acceptance

Run:

```sh
bun run creator-signal:design-system:check
bun test src/__tests__/plugins/creatorSignalSitePack.test.ts
bun run instatic-plugin lint integrations/creator-signal
bun run instatic-plugin build integrations/creator-signal
bun run verify:creator-signal-public-acceptance
```

Source acceptance must verify both routes at desktop, tablet and mobile widths,
light/dark/system themes, keyboard order, one H1, no horizontal document
overflow, exact application-owned links, one Early Access form and every
managed-form state. Live form delivery and production publication remain
separate post-deployment acceptance gates.
