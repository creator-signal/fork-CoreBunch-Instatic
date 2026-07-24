# Creator Signal Site Pack

This plugin packages the current Creator Signal launch pages and public-site integrations for an authoring comparison in Instatic.

TL;DR: build the plugin, install its zip, approve the requested permissions, publish the imported pages, and move the imported homepage to the `index` slug after archiving the blank setup page.

## Included experience

- Eight launch pages matching the Strapi-managed public routes.
- Editable hero, feature-grid, call-to-action, and prose layouts.
- A Mautic form module with configurable form identity and typed success/failure events.
- The host-level MinIO adapter for originals, variants, avatars, and fonts.
- Plausible pageviews, consent-gated OpenPanel events, GlitchTip browser monitoring, consent UI, and hashed Mautic attribution.
- Header, footer, legal copy, and navigation links represented as editable page nodes.

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

Upload `integrations/creator-signal.plugin.zip` from **Admin → Plugins** and approve all declared permissions. A new Instatic instance starts with a blank page at `index`; rename that blank page first, then change `creator-signal-home` to `index` to publish the imported homepage at `/`.

Verify the live Mautic form ID and API name before publishing Contact. The comparison default uses form ID `3` and API name `creatorsignalcontactenquiry`; these are author-editable module properties.

## Replacement boundary

This pack covers the currently public launch pages. It does not replace the Next.js ZITADEL BFF or role-protected public routes. Instatic author authentication is also independent from the existing ZITADEL Strapi sign-in until an SSO integration is implemented and accepted.

## Related

- `docs/deployment/creator-signal-stack.md`
- `integrations/creator-signal/instatic-plugin.config.ts`
- `integrations/creator-signal/modules/mautic-form.ts`
- `integrations/creator-signal/frontend/analytics.ts`
- `src/__tests__/plugin-sdk/builders.test.ts`
