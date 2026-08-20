# Creator Signal preview and publish parity

Creator Signal authoring and publishing share one public render profile. The
profile is exported from `pack/design-system.ts` and owns the stylesheet,
theme selectors and assets, responsive media queries, image treatment, and
component state and variant selectors. The Sales Pulse Design System snapshot
remains the upstream source of tokens, fonts, theme behaviour, and brand
assets.

## What is guaranteed

- Pack page compilation consumes `creatorSignalRenderProfile.stylesheet`.
- Every governed module renders the same HTML and shared stylesheet in the
  editable canvas and publisher. A module without an explicit `preview()` uses
  its public `render()` implementation.
- Module styles are installed inside each canvas iframe document. They never
  rely on or leak into the surrounding admin document.
- Full-page Preview uses Instatic's authenticated public renderer, including
  template composition, resolved media, plugin frontend assets, and the same
  Content Security Policy envelope as publication.
- The system, light, and dark choices use the vendored theme bootstrap and
  control assets declared by the render profile. Preview permits those scripts
  in an opaque sandbox so the visible theme result follows public HTML.
- Desktop, tablet, and mobile canvas frames are real iframe viewports. The
  shared CSS media queries therefore select the same responsive rules as a
  published page at the same width.
- Governed image URLs, `object-fit` treatment, component properties, and
  state/variant selectors come from the same rendered markup and stylesheet.

Repository tests fail if pack compilation, module preview CSS, theme assets,
responsive queries, image treatment, or governed state/variant selectors stop
resolving through that contract. Public browser acceptance remains the final
source-owned visual check:

```sh
bun run instatic-plugin build integrations/creator-signal
bun run verify:creator-signal-public-acceptance
```

## Intentional editor differences

The editable Design canvas adds selection markers and neutralises navigation,
form submission, focus rings, cursors, and text selection while the author is
editing. Its frames grow to content and pin viewport units to a deterministic
frame height. Live canvas mode removes those sizing and interaction overrides.

Full-page Preview is the visitor-fidelity surface. It runs scripts but retains
an opaque sandbox: same-origin access, form submission, popups, and top-level
navigation are not granted. Consequently theme choice is represented for the
current preview, while persistent browser storage remains a published-site
behaviour. Preview also does not execute mutating publish hooks. These are
editor safety boundaries, not alternate content, styling, breakpoint, image,
or component contracts.

Passing preview, repository tests, or public-site acceptance proves source
readiness only. It does not publish or deploy a site.
