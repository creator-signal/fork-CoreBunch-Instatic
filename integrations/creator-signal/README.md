# Creator Signal Site Pack

This plugin packages the current Creator Signal launch pages and public-site integrations for an authoring comparison in Instatic.

TL;DR: build the plugin, install its zip, approve the requested permissions,
and publish the imported pages. Managed deployments can use the starter-site
bootstrap variables to create the owner, install this package, replace the
blank setup homepage, and publish the complete site automatically.

## Included experience

- Eighteen launch, legal, trust, support, and status pages.
- The warm Creator Signal editorial design system shared by the editor canvas
  and published pages.
- A parameterised Hero Visual Component with optional MinIO-backed artwork.
- Creator Signal favicon, touch icon, maskable icon, and web app manifest
  injected into every published page from versioned plugin assets.
- Editable hero, feature-grid, call-to-action, prose, testimonial, and FAQ layouts.
- A Mautic form module with configurable form identity and typed success/failure events.
- The host-level MinIO adapter for originals, variants, avatars, and fonts.
- Plausible pageviews, consent-gated OpenPanel events, GlitchTip browser monitoring, consent UI, and hashed Mautic attribution.
- Header, footer, legal copy, and navigation links represented as editable page nodes.
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
approve all declared permissions. The pack owns the `index` route. On a managed
empty installation, configure the starter-site bootstrap so Instatic removes
the generated blank homepage before importing and publishing this pack.

Verify the live Mautic form ID and API name before publishing Contact. The comparison default uses form ID `3` and API name `creatorsignalcontactenquiry`; these are author-editable module properties.

## Replacement boundary

This pack covers the public marketing routes. Instatic author authentication
uses Zitadel when `INSTATIC_AUTH_MODE=zitadel`; the Sales Pulse product keeps
its own role-protected application boundary.

## Related

- `docs/deployment/creator-signal-stack.md`
- `integrations/creator-signal/COMPONENTS.md`
- `integrations/creator-signal/instatic-plugin.config.ts`
- `integrations/creator-signal/modules/mautic-form.ts`
- `integrations/creator-signal/frontend/analytics.ts`
- `src/__tests__/plugin-sdk/builders.test.ts`
