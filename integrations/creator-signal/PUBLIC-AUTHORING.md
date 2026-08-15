# Creator Signal public authoring contract

Creator Signal public pages use Instatic's existing NodeTree, Component Library, saved-layout, preview and publisher architecture. This contract governs **public output only**; it does not redesign or restyle the Instatic editor/admin interface.

The machine-readable source of truth is `public-authoring-contract.ts`. It
exports both the integration contract and the `creatorSignalPublicAuthoringPolicy`
installed by `pack/site.ts`; the policy lists are derived from the contract.

## Design-system dependency

Creator Signal brand values are owned by `creator-signal/sales-pulse/packages/design-system` and exposed as `@creator-signal/design-system`. Instatic must consume generated adapters rather than copying colour, typography, spacing, radius, shadow, motion, responsive or chart values.

Expected adapter exports:

- `@creator-signal/design-system/tokens.css`
- `@creator-signal/design-system/adapters.json`
- `@creator-signal/design-system/metadata.json`

Until the upstream design-system foundation is merged and distributable, the Instatic contract records these adapter identities but does not invent replacement token values.

## Authorable public surface

The contract explicitly allow-lists every site-specific Component Library
entry. The governed surface includes the Hero, shared Header, shared Footer,
Privacy Choices, Feature Grid, Call to Action, Rich Text Section, Testimonial,
FAQ, Public Document and Managed Form. Freeform starter layouts are not part of
the public contract.

A Component Library entry must be present in `permittedComponents` before the
Creator Signal integration can register it. Variants are allow-listed per
component. All current entries expose one governed `default` variant.

Only containers may expose slots. Site-specific leaf components declare
`composition: 'leaf'`, keep `slots: []`, and use typed repeater fields for
ordered links, feature cards and questions. Coherent prose is one rich-text
field. These rules are shared by human authoring, Agent tools and MCP.

## Semantic styling

Authors choose semantic roles and approved component variants. They do not choose arbitrary brand values. Colour, typography, spacing, radius, shadow and motion are design-token-only concerns. Responsive breakpoints also come from the design system rather than page-local pixel choices.

Public theme modes are `system`, `light` and `dark`, with `system` as the default. Theme implementation and generated values remain owned by the master design system.

## Assets and content

Images come from Instatic Media and are selected for an approved role/treatment. Essential information must not exist only inside an image.

The Hero artwork field has the fixed `hero-artwork` role and `contain`
treatment. Authors select the media value; the component owns its role and
treatment. Adding an undeclared asset role/treatment property is rejected.

The public contract requires a semantic heading hierarchy, one page-title
component and at most one primary-action component in page content. Hero and
Recovery State own the primary role; a later Call to Action uses the secondary
treatment. Rich text cannot introduce another H1 or a heading outside H1-H3.
Button treatment comes from the component's declared semantic role, never raw
styles.

## Enforcement and diagnostics

`SiteSettings.publicAuthoring` persists the Creator Signal policy with the
site. `src/core/component-library/publicAuthoring.ts` validates the ordinary
NodeTree; it does not create a second page model. The checks run at all three
durable boundaries:

1. `server/writePolicy/pageDiff.ts` rejects invalid transactional saves.
2. `server/collab/updateGuard.ts` rejects invalid Yjs updates, including owner
   updates that would otherwise use the full-writer fast path.
3. `server/publish/publishSite.ts` revalidates the complete draft before any
   publication write.

Diagnostics include a stable code, exact page/node path, explanation and
remediation. Invalid variants, arbitrary styles, unknown props, raw modules,
damaged patterns, missing template chrome, unsupported heading levels and
unmapped asset fields therefore fail with an actionable location.

The shared template identified by the policy owns the Header, Footer and
Privacy Choices components exactly once. Ordinary pages contain one approved
pattern and cannot author independent copies of that chrome. The shared
template is immutable through normal page authoring and is reconciled only by
the owning technical pack.

## Bypass boundary

Normal HTTP and collaborative authoring cannot remove or weaken the policy,
change pack-owned styles/runtime dependencies, or edit the protected Hero
Visual Component. Plugin pack reconciliation is the sole supported policy and
technical-record update path.

Direct database/storage mutation is not a supported authoring path. Publication
still fails closed for an invalid governed tree, missing protected component or
missing shared template. Sites with no `publicAuthoring` policy retain normal
Instatic freeform compatibility.

## Boundary

This integration deliberately does **not**:

- redesign Instatic admin/editor UI;
- create a second Creator Signal CMS or renderer;
- expose raw colour, font or breakpoint controls;
- copy master design-token values into authoring metadata;
- publish or deploy production changes by itself.

## Related

- `integrations/creator-signal/public-authoring-contract.ts` — Creator Signal
  contract and derived site policy.
- `src/core/page-tree/publicAuthoringPolicy.ts` — persisted TypeBox boundary.
- `src/core/component-library/publicAuthoring.ts` — shared analyser and
  diagnostics.
- `src/__tests__/plugins/creatorSignalPublicAuthoringGuardrails.test.ts` —
  allowed and rejected authoring examples.
