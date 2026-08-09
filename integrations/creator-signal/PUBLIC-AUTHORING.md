# Creator Signal public authoring contract

Creator Signal public pages use Instatic's existing NodeTree, Component Library, saved-layout, preview and publisher architecture. This contract governs **public output only**; it does not redesign or restyle the Instatic editor/admin interface.

The machine-readable source of truth is `public-authoring-contract.ts`.

## Design-system dependency

Creator Signal brand values are owned by `creator-signal/sales-pulse/packages/design-system` and exposed as `@creator-signal/design-system`. Instatic must consume generated adapters rather than copying colour, typography, spacing, radius, shadow, motion, responsive or chart values.

Expected adapter exports:

- `@creator-signal/design-system/tokens.css`
- `@creator-signal/design-system/adapters.json`
- `@creator-signal/design-system/metadata.json`

Until the upstream design-system foundation is merged and distributable, the Instatic contract records these adapter identities but does not invent replacement token values.

## Authorable public surface

The contract explicitly allow-lists Component Library entries and saved public patterns. The initial governed reusable component is `creator-signal.site.hero`; the current saved patterns are Hero, Feature grid, Call to action, Prose, Testimonial and FAQ.

A Component Library entry must be present in `permittedComponents` before the Creator Signal integration can register it. Variants are allow-listed per component. The Hero currently exposes one governed `default` variant.

## Semantic styling

Authors choose semantic roles and approved component variants. They do not choose arbitrary brand values. Colour, typography, spacing, radius, shadow and motion are design-token-only concerns. Responsive breakpoints also come from the design system rather than page-local pixel choices.

Public theme modes are `system`, `light` and `dark`, with `system` as the default. Theme implementation and generated values remain owned by the master design system.

## Assets and content

Images come from Instatic Media and are selected for an approved role/treatment. Essential information must not exist only inside an image.

The public contract requires semantic heading hierarchy, one page-title role and one primary-action role. More detailed enforcement belongs to the Creator Signal public-authoring guardrail layer rather than editor chrome.

## Boundary

This integration deliberately does **not**:

- redesign Instatic admin/editor UI;
- create a second Creator Signal CMS or renderer;
- expose raw colour, font or breakpoint controls;
- copy master design-token values into authoring metadata;
- publish or deploy production changes by itself.
