# Creator Signal public-site acceptance baseline

The current public site remains the behavioural and content baseline for every
route in the Creator Signal pack. Issue `creator-signal/sales-pulse#995`
intentionally replaces its legacy visual language with the master Creator
Signal Design System, so pixel equality with the old production styling is not
an approval criterion for that migration. Route behaviour, content, landmarks,
integrations and metadata must still remain intact.

Run the deterministic comparison against a local candidate:

```sh
bun run test:e2e:install
bun run verify:creator-signal-parity \
  --baseline-base https://creatorsignal.me \
  --candidate-base http://localhost:4330
```

The verifier derives the route roster from the shared public-route contract,
which the pack test matches against the compiled pages. A newly added route
cannot silently miss the matrix. It can compare all 23 current routes at desktop,
tablet and mobile widths. JavaScript is disabled for the deterministic pass so analytics,
consent persistence and third-party form timing cannot make the visual result
non-deterministic. During the intentional Design System migration, use the
pixel output as review evidence and diagnose behavioural/layout regressions;
do not treat expected old-versus-new brand pixels as a failure. The report covers:

- full-page pixel comparison with a narrow anti-aliasing tolerance (0.2% of
  pixels and 0.1 mean channel delta);
- visible copy and heading hierarchy;
- header, main, navigation, form and footer landmarks;
- the public class contract and document height;
- canonical, robots, Open Graph, Twitter and language metadata; and
- preserved schema.org navigation markup.

Differences write the baseline and candidate PNGs plus `report.json` under
`.tmp/creator-signal-parity`. Metadata is intentionally a candidate quality
gate rather than a production-equality check: the component-authored candidate
retains complete SEO metadata even where the older public baseline omits it.

The same command also runs JavaScript-enabled comparisons for the essential-only
consent choice and all six generated Mautic forms without submitting them.
When the production baseline's generated script does not attach in headless
Chromium, the gate records that diagnostic, matches the governed alias, and
still requires the candidate to render labelled fields and a submit control.
Repository tests separately verify the pinned Design System snapshot, theme
runtime, navigation contracts, keyboard/accessibility rules and Agent/MCP
component authoring. Epic surface #997 owns the final multi-viewport visual and
browser acceptance baseline after #995 and #996 are integrated. Passing either
this verifier or repository tests does not authorize a production deployment.
