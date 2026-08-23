# Creator Signal accessibility gates

The complete Creator Signal component catalogue declares accessibility in
`accessibility-contract.ts`. Each of the 37 entries marks every supported rule
as either an applicable, entry-specific check or an explicit not-applicable
decision. Applicable checks name their enforcement level, severity, affected
authoring fields where a deterministic check is possible, and remediation.

`automated` checks inspect the retained site draft. They return the page,
component instance, field, rule, severity, blocking decision and remediation.
`behavior-test` and `manual` checks deliberately remain contracts: semantics,
keyboard, focus, dismissal, announcements, motion, contrast, touch targets and
no-JavaScript behavior need the documented browser or review evidence and are
not falsely claimed by a static tree scan.

Run the focused contract and tool-surface checks with:

```sh
bun run verify:creator-signal-accessibility
```

In the editor or through MCP, call `site_check_accessibility`. The same
browser-bridged result is returned to both callers. Publication only stops for
diagnostics whose rule is present in the site `blockingRuleIds` policy; warnings
remain visible but do not block publishing. The existing public acceptance
command remains the browser evidence for keyboard, 200% reflow, reduced motion,
forced colors, form feedback and unavailable/degraded states:

```sh
bun run verify:creator-signal-public-acceptance
```
