# Creator Signal Site Pack

This plugin packages the Creator Signal public component catalogue, initial
site content, and runtime integrations for Instatic.

TL;DR: build the plugin, install its zip, approve the requested permissions,
and publish the imported pages. Managed deployments can use the starter-site
bootstrap variables to create the owner, install this package into an empty
page roster, and publish the complete site automatically.

## Included experience

- Twenty-three launch, form, legal, trust, support, and status pages plus one
  shared `everywhere` site template.
- The warm Creator Signal editorial design system shared by the editor canvas
  and published pages.
- A parameterised Hero Visual Component with optional MinIO-backed artwork.
- Creator Signal favicon, touch icon, maskable icon, and web app manifest
  injected into every published page from versioned plugin assets.
- Governed Hero, Header, Footer, Privacy Choices, Feature Grid, Call to Action,
  Rich Text Section, Testimonial, FAQ, Public Document, and Managed Form components.
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

The integrations are disabled by default. Configure and enable them in the plugin settings only after the corresponding collectors and consent policy are ready.

Configure the host with the `MINIO_*` environment/file variables documented in
`docs/deployment/creator-signal-stack.md`. Startup verifies the bucket and
elects **MinIO object storage** for every supported media role. Every additional
site uses a separate identity and bucket.

## Build and install

```sh
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
namespaced styles, Mautic validation, CSP inputs, analytics event schemas and
integration behaviour. Pack installation applies its database changes in one
transaction. A failure leaves both authored content and technical records at
their prior state, and an empty managed installation retries the same-version
starter import on its next bootstrap.

Future changes to already-authored marketing or approved legal copy require an
explicit, versioned CMS content migration with preview, backup and rollback.
They must not be implemented by changing a deterministic starter page and
relying on plugin upgrade reconciliation.

### Upgrade existing 0.1.11 starter content

Installing plugin 0.2.1 runs the versioned technical-pack upgrade and does not
change existing pages. The authored-content migration remains version 0.2.0.
Export the complete site from **Admin → Export**, then run the read-only
classifier:

```sh
bun run integrations/creator-signal/migrations/0.2.0/prepare.ts preview \
  --input ./creator-signal-export.zip
```

The preview is ready only when every one of the 23 known routes is either the
exact retained 0.1.11 starter or already uses the 0.2.0 model, no unexpected
page would inherit the new shared template, and the template ID is available.
Any authored difference blocks the whole migration for manual mapping; it is
never overwritten heuristically.

The shared template uses the validator-compliant slug
`creator-signal-site-template`. If an operator imported the unpublished 0.0.29
migration archive, the classifier recognises and repairs only that release's
exact `_templates/creator-signal-site` template. Any change to that template's
content still blocks as authored content.

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

## Component authoring model

Only structural containers and templates own child composition. Every Creator
Signal leaf component exposes scalar or repeatable typed fields and renders its
own opinionated semantic HTML. Navigation links, feature cards and FAQ items are
repeaters; complete prose and public documents use one sanitised rich-text
value rather than a stack of paragraph nodes. The visual editor, Agent tools
and MCP use the same Component Library entries and field validation.

`integrations/creator-signal/AUTHORING.md` is the complete route, section,
component and shared-template reference. Its parity command generates a
browsable production-versus-candidate report with full-page and per-section
images at desktop, tablet and mobile widths.

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
- `integrations/creator-signal/PARITY.md`
- `integrations/creator-signal/instatic-plugin.config.ts`
- `integrations/creator-signal/modules/mautic-form.ts`
- `integrations/creator-signal/frontend/analytics.ts`
- `src/__tests__/plugin-sdk/builders.test.ts`
