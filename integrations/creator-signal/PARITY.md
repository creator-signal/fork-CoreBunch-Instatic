# Creator Signal public-site acceptance baseline

The current public site is the visual, behavioural and content baseline for
every production route in the Creator Signal pack. The implementation uses the
governed Creator Signal Design System and authorable `creator-signal.site`
components, but the resulting typography, colour, spacing, responsive layout,
content, landmarks, integrations and metadata must preserve the production
look and experience.

Run the deterministic comparison against a local candidate:

```sh
bun run test:e2e:install
bun run verify:creator-signal-parity \
  --baseline-base https://creatorsignal.me \
  --candidate-base http://localhost:4330
```

The verifier derives the route roster from the shared public-route contract,
which the pack test matches against the compiled pages. A newly added route
cannot silently miss the matrix. It captures all 26 current routes at desktop,
tablet and mobile widths. The 23 routes exposed by production receive direct
side-by-side comparisons. `/early-access` is candidate-only while production
returns HTTP 404, so the report captures its candidate output and metadata
without claiming visual parity. Any other baseline failure remains a failed
comparison. JavaScript is disabled for the deterministic pass so analytics,
consent persistence and third-party form timing cannot make the visual result
non-deterministic. Material pixel, component-section or semantic differences
are release blockers. The report covers:

- full-page pixel comparison with a narrow anti-aliasing tolerance (0.2% of
  pixels and 0.1 mean channel delta);
- visible copy and heading hierarchy;
- header, main, navigation, form and footer landmarks;
- the public class contract and document height;
- canonical, robots, Open Graph, Twitter and language metadata; and
- preserved schema.org navigation markup.

Every complete run writes baseline and candidate full-page PNGs, per-section PNGs,
`report.json`, and a browsable `index.html` under
`.tmp/creator-signal-parity`. The HTML report shows the shared template,
route-to-component map, authoring fields, desktop/tablet/mobile page pairs and
section pairs even when they pass. Candidate-only routes are labelled and do
not inflate the production-comparable count. Metadata is intentionally a candidate
quality gate rather than a production-equality check: the component-authored
candidate retains complete SEO metadata even where the older public baseline omits
it. `/early-access` specifically requires `noindex`, `follow` and `noarchive`;
ordinary public routes require `index` and `follow`.

The same command also runs JavaScript-enabled comparisons for the essential-only
consent choice and all eight generated Mautic forms without submitting them.
When the production baseline's generated script does not attach in headless
Chromium, the gate records that diagnostic, matches the governed alias, and
still requires the candidate to render labelled fields and a submit control.
Repository tests separately verify the pinned Design System snapshot, theme
runtime, navigation contracts and Agent/MCP component authoring. The completed
source-owned multi-viewport, WCAG, keyboard, degraded-state and visual gate is
documented in `integrations/creator-signal/ACCEPTANCE.md` and runs through
`bun run verify:creator-signal-public-acceptance`. Passing either verifier or
repository tests does not authorize a production deployment.

The durable authoring and route reference is
`integrations/creator-signal/AUTHORING.md`.
