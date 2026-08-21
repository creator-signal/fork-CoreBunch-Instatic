# Rich Text consolidation

Rich Text consolidation turns one eligible adjacent prose run into one governed Creator Signal Rich Text Section without reading rendered HTML.

The operation makes fragmented imported or freeform editorial copy authorable through the existing `creator-signal.site.rich-text-section` contract while preserving its source text, semantic order, anchor, and revision history.

---

## TL;DR

- Start with an ungoverned `base.text` H2 with an `id`, then adjacent unstyled Text or Rich Text blocks.
- The editor serialises persisted node props into the Rich Text `body`; it never captures canvas or published markup.
- Cards, navigation, calls to action, forms, media, containers, bound nodes, governed components, and styled nodes are ineligible and remain unchanged.
- The replacement and all source removals are one `mutateActiveTree` revision, so Undo restores the exact source run.
- MCP exposes the same operation as `site_consolidate_rich_text`, gated by `site.components.edit`; it remains a draft until an authorised explicit publish.

## Eligibility and conversion

`src/core/component-library/coherentRichTextConversion.ts` analyses only direct siblings. The first node must be an ungoverned `base.text` H2 with an `id`; its text becomes `heading`, its `id` becomes `sectionId`, and its optional `lang` becomes `headingLanguage`. Subsequent eligible `base.text` values retain their semantic tags and safe attributes in `body`; unstyled `base.rich-text` divs retain their sanitised authored HTML.

The converter rejects node children, classes, inline styles, breakpoint overrides, dynamic bindings, unsupported heading attributes, unanchored headings, structural rich-text wrappers, and source markup that sanitisation would change. This keeps an unclear or lossy candidate untouched rather than silently approximating it.

`applyCoherentRichTextConversion` replaces the complete contiguous sibling slice only when it is unchanged. `src/admin/pages/site/store/slices/site/nodeActions.ts` creates the replacement using the installed module defaults, stamps its versioned catalogue metadata, and applies that replacement through the single active-tree mutation path.

## Editor and MCP

`src/admin/pages/site/panels/PropertiesPanel/ComponentPropertiesView.tsx` provides a conversion preview with the resulting governed fields and source-block count. `src/admin/pages/site/agent/componentLibraryTools.ts` reuses the same analysis and store action for MCP; `server/ai/tools/site/writeTools.ts` assigns the tool the existing Component Library capability boundary.

## Related

- `docs/features/plain-text-component.md` — the governed source Text primitive
- `docs/features/mcp-connectors.md` — MCP bridge and draft-only editing model
- Source of truth: `src/core/component-library/coherentRichTextConversion.ts`
- Source of truth: `integrations/creator-signal/modules/site-components/index.ts`
- Gate tests: `src/__tests__/component-library/componentLibraryConversion.test.ts`
- Gate tests: `src/__tests__/architecture/agent-tool-surface.test.ts`
