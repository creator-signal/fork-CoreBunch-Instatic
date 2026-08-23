# Creator Signal Site Pack

This plugin packages the Creator Signal public component catalogue, initial
site content, and runtime integrations for Instatic.

TL;DR: build the plugin, install its zip, approve the requested permissions,
and publish the imported pages. Managed deployments can use the starter-site
bootstrap variables to create the owner, install this package into an empty
page roster, and publish the complete site automatically.

## Included experience

- Twenty-four launch, form, legal, trust, support, and status pages plus a
  shared `everywhere` template and governed `notFound` template.
- The canonical Creator Signal Design System shared by the editor canvas and
  published pages, with generated semantic roles and packaged font, theme and
  brand assets available to governed components without exposing a public
  appearance selector.
- A parameterised Hero Visual Component with optional MinIO-backed artwork,
  governed brand fallback art and real generated design assets on the primary
  starter marketing routes.
- Creator Signal favicon, touch icon, maskable icon, and web app manifest
  injected into every published page from versioned plugin assets.
- Governed Hero, Campaign Hero, Signal Strip, Signal Comparison, Process Steps,
  Pricing Plans, Founder Story, Header, Footer, Privacy Choices, Feature Grid,
  Call to Action, Rich Text Section, Testimonial, FAQ, Comparison, Recovery
  State, Public Document, and Managed Form components.
- Fourteen stable page/section patterns plus explicit Hero, CTA and FAQ mappings;
  starter routes materialize the same registry definitions authors insert.
- Six Mautic-backed public forms that resolve governed aliases through the
  Mautic-generated registry and emit typed success/failure events.
- The host-level MinIO adapter for originals, variants, avatars, and fonts.
- Plausible pageviews, consent-gated OpenPanel events, GlitchTip browser monitoring, consent UI, and hashed Mautic attribution.
- Header, footer, navigation and consent edited once as typed shared-template
  components. Ordinary pages contain only their page-specific components.
- Operator-approved initial legal, trust, support, and account-data copy marked
  with version `2026-08-02`, its effective date, and the verified operating
  company. External legal advice remains outside the site-pack contract.
- One shared public stylesheet across all launch routes, so authoring and
  published output use the same bounded, responsive page layout without
  duplicate ambient rules.

## Design System source of truth

`creator-signal/sales-pulse/packages/design-system` and its governed brand-asset
pipeline are authoritative. This repository does not maintain an independent
palette, font stack, theme algorithm or logo source. The exact upstream Git
revision and SHA-256 of every consumed artifact are recorded in
`design-system/lock.json`; CI rejects edited, missing or stale vendored files
and rejects a stale generated canvas adapter.

Verify the committed snapshot:

```sh
bun run creator-signal:design-system:check
```

To advance it, first generate the artifacts in a clean Sales Pulse checkout at
the intended `develop` revision, then run:

```sh
bun run creator-signal:design-system:sync -- \
  --source-root ../sales-pulse \
  --revision <full-sales-pulse-git-sha>
```

Review the revision, lock diff, generated adapter and packaged assets together.
Never edit files under `assets/design-system`, `design-system/foundation-css.ts`
or the current `icon.svg` by hand. The frozen
`migrations/legacy-0.1.11-design-system.ts` is historical classifier evidence,
not a runtime styling source.

The integrations are disabled by default. Configure and enable them in the plugin settings only after the corresponding collectors and consent policy are ready.

Configure the host with the `MINIO_*` environment/file variables documented in
`docs/deployment/creator-signal-stack.md`. Startup verifies the bucket and
elects **MinIO object storage** for every supported media role. Every additional
site uses a separate identity and bucket.

## Build and install

```sh
bun run creator-signal:design-system:check
bun run instatic-plugin lint integrations/creator-signal
bun run instatic-plugin build integrations/creator-signal
```

Upload `integrations/creator-signal.plugin.zip` from **Admin → Plugins** and
approve all declared permissions. On a managed empty installation, configure
the starter-site bootstrap so setup defers its default homepage and the pack
can import and publish the complete initial site.

## Content ownership and upgrades

Pack pages are starter content, not a live production source of truth. They are
imported atomically only when the site has no active pages. From that first
import onward, page IDs, routes, order and node content belong to CMS authors.
Installing a newer plugin version or using **Re-sync pack** skips every bundled
page whenever any active page exists; it never replaces, deletes, reorders or
publishes authored pages.

The plugin continues to govern technical records that must follow its runtime
contract: Component Library definitions, Visual Components, saved layouts,
namespaced styles, the locked Design System adapter, Mautic validation, CSP
inputs, analytics event schemas and integration behaviour. Pack installation applies its database changes in one
transaction. A failure leaves both authored content and technical records at
their prior state, and an empty managed installation retries the same-version
starter import on its next bootstrap.

Future changes to already-authored marketing or approved legal copy require an
explicit, versioned CMS content migration with preview, backup and rollback.
They must not be implemented by changing a deterministic starter page and
relying on plugin upgrade reconciliation.

### Upgrade existing retained starter content

Installing plugin 0.5.0 runs the versioned technical-pack upgrade, installs the
public-authoring policy and does not change existing pages. The authored-content
migration remains version 0.2.0.
Export the complete site from **Admin → Export**, then run the read-only
classifier:

```sh
bun run integrations/creator-signal/migrations/0.2.0/prepare.ts preview \
  --input ./creator-signal-export.zip
```

The preview is ready only when every retained route is either the exact 0.1.11
starter, the exact governed 0.2.0-0.2.6, 0.3.5 or 0.4.0 pack, or already uses
the current model; no unexpected page would inherit the new shared template; and both
governed template IDs are available. A newly governed page is added only when
its reserved ID is absent. An occupied ID with any other content blocks the
whole migration.
Any authored difference blocks the whole migration for manual mapping; it is
never overwritten heuristically.
Page classification hashes the semantic tree independently of generated node
IDs, so exporting or compiling the same retained content in another process
does not create a false authored-content result. Text, properties, metadata,
structure and ordering remain part of the hash and still block on change.

The shared template uses the validator-compliant slug
`creator-signal-site-template`. The classifier recognises only the exact
historical invalid-slug template, the exact repaired 0.2.0-0.2.6 template, or
the current template. Any other change to that template's content still blocks
as authored content.

After reviewing a ready preview, prepare the immutable evidence set:

```sh
bun run integrations/creator-signal/migrations/0.2.0/prepare.ts prepare \
  --input ./creator-signal-export.zip \
  --output-dir ./creator-signal-content-migration
```

This writes an untouched full backup, a JSON audit report with hashes, and a
content-only migration archive. Review the archive through the normal import
preview, apply it with `merge-overwrite`, preview the draft site, and publish
deliberately. The archive does not publish. Exact rollback uses the untouched
backup through the guarded `replace` import after its preview and step-up gate.
The guarded restore path uses a dialect-neutral system-table predicate and is
covered for both the PostgreSQL production schema and SQLite acceptance schema.

## Component authoring model

Only structural containers and templates own child composition. Every Creator
Signal leaf component exposes scalar or repeatable typed fields and renders its
own opinionated semantic HTML. Navigation links, feature cards and FAQ items are
repeaters; complete prose and public documents use one sanitised rich-text
value rather than a stack of paragraph nodes. The visual editor, Agent tools
and MCP use the same Component Library entries and field validation.
Registered `creator-signal.site.pattern.*` roots compose those leaves into
approved page and section structures; saved layouts remain reserved for
structures that authors are intentionally allowed to copy and diverge.

`integrations/creator-signal/AUTHORING.md` is the complete route, section,
component and shared-template reference. Its parity command generates a
browsable production-versus-candidate report with full-page and per-section
images at desktop, tablet and mobile widths.

`integrations/creator-signal/PREVIEW-PARITY.md` defines the shared render
profile used by the editable canvas, full-page Preview and public publisher,
including the narrow editor-safety differences that do not change content or
visual semantics.

`integrations/creator-signal/ACCEPTANCE.md` defines the source-owned WCAG,
keyboard, responsive, degraded-state and committed visual-baseline gate that
runs against pages produced by Instatic's real public publishing pipeline.

`integrations/creator-signal/CONTENT-WORKFLOWS.md` defines the executable
create, edit, revision, preview, publish, unpublish, media, pattern, legal,
product-page, theme, catalogue-task and guardrail acceptance matrix. Run it
with `bun run verify:creator-signal-content-workflows`; run
`bun run verify:creator-signal-authoring-tasks` to write the 33-entry editor
and MCP task matrix from the registered catalogue.

`integrations/creator-signal/ACCESSIBILITY.md` records the entry-specific
accessibility contracts and the equivalent editor/MCP diagnostic tool. Run
`bun run verify:creator-signal-accessibility` for the source contract and tool
surface checks.

`integrations/creator-signal/WEBSITE-V2.md` records the governed reference-design
Home and Early Access flow, page ownership boundaries and one-form intent
contract.

Deploy Mautic first and verify
`https://marketing.creatorsignal.me/media/creator-signal/forms-v1.js` exposes
the `creator-signal.mautic-forms/v1` schema and all six governed aliases. Do not
copy numeric form IDs or generated API names into Instatic: the module resolves
those deployment-specific values from the registry on every page load.

## Replacement boundary

This pack covers the public marketing routes. Instatic author authentication
uses Zitadel when `INSTATIC_AUTH_MODE=zitadel`; the Sales Pulse product keeps
its own role-protected application boundary.

## Related

- `docs/deployment/creator-signal-stack.md`
- `integrations/creator-signal/COMPONENTS.md`
- `integrations/creator-signal/AUTHORING.md`
- `integrations/creator-signal/PREVIEW-PARITY.md`
- `integrations/creator-signal/ACCEPTANCE.md`
- `integrations/creator-signal/CONTENT-WORKFLOWS.md`
- `integrations/creator-signal/WEBSITE-V2.md`
- `integrations/creator-signal/PARITY.md`
- `integrations/creator-signal/instatic-plugin.config.ts`
- `integrations/creator-signal/modules/mautic-form.ts`
- `integrations/creator-signal/frontend/analytics.ts`
- `src/__tests__/plugin-sdk/builders.test.ts`
