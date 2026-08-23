# Creator Signal public acceptance

This is the source-owned browser gate for the Creator Signal public site. It
publishes the bundled pages through Instatic's real page renderer, frontend
asset injection and module-JavaScript pipeline, then serves only that output to
Chromium. It does not substitute hand-built fixtures for route acceptance.

Run the normal comparison after building the plugin:

```sh
bun run instatic-plugin build integrations/creator-signal
bun run verify:creator-signal-public-acceptance
```

The command writes actual screenshots and `report.json` under
`.tmp/creator-signal-public-acceptance`. CI uploads that directory even when a
check fails. Passing this command proves source readiness only; it does not
deploy, converge or accept a production environment.

For a non-accepting local browser preview of the same published output, run
the script with `--serve-only` and optionally set
`CREATOR_SIGNAL_PUBLIC_ACCEPTANCE_PORT`. The preview intentionally does not
replace the complete automated gate or a live provider-form check.

## Governed matrix

The verifier covers:

- every one of the 26 public routes at 1440px desktop, 900px tablet and 390px
  mobile widths, with one header, main, H1 and footer and no document overflow;
- Home, Early Access, Waitlist, Beta, Products, Sales Pulse, Pricing, Contact, Privacy, Security, the
  not-found template, FAQ and all recovery states with Axe's WCAG 2.0, 2.1 and
  2.2 A/AA rules;
- skip navigation, visible 44px mobile navigation targets and native FAQ
  keyboard disclosure;
- system, light and dark theme-runtime states, including persisted API choices,
  while the production-look public presentation remains visually stable;
- consent denial and granting consent while the runtime analytics
  configuration endpoint is down;
- managed-form required-field focus/error association, submitting/busy,
  success, provider failure and provider-unavailable states without a live
  submission, with exactly one wishlist form on Early Access;
- 200% reflow represented by a 640 CSS-pixel viewport for a 1280px reference,
  with comparison overflow contained in its labelled, focusable region;
- reduced motion, forced colours, broken images, long unbroken content and the
  governed noindex 404 response; and
- twelve committed visual scenarios spanning routes, chrome, themes,
  viewports, legal reflow, FAQ and empty/error/offline/not-found states.

## Visual baseline governance

Normal runs are compare-only. Baseline changes require the explicit flag and
environment gate together:

```sh
CREATOR_SIGNAL_ALLOW_BASELINE_UPDATE=1 \
  bun run verify:creator-signal-public-acceptance -- --update-baselines
```

Generate baselines with Playwright 1.60.0's Noble container, the same pinned
browser family used for repository acceptance. Review every PNG under
`integrations/creator-signal/acceptance/baselines` with the source diff. The
script rejects missing or extra PNGs and fails when dimensions change or the
pixel/channel tolerance is exceeded. Never refresh baselines merely to make an
unexplained change pass.

## Limits and follow-up

Axe and Chromium cannot prove all assistive-technology, cognitive,
localisation or manual usability outcomes. Forced-colour emulation is a
Chromium contract, and the 200% check is a deterministic reflow equivalent
rather than an operating-system zoom capture. Release acceptance must still
run the deployed browser journeys, real generated Mautic forms, production
headers, sitemap and unknown-route behaviour. Those deployed checks remain
separate from this source gate and require deployment authority.
