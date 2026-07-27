# Component Accessibility Contracts

Component Library entries declare the accessibility work that applies to their
actual behavior. The contract distinguishes checks that a tree analyser can
prove from behavior tests and context-dependent manual review.

## Entry metadata

`ComponentLibraryEntry.accessibility.checks` contains:

- a stable rule ID and category;
- `automated`, `behavior-test` or `manual` enforcement;
- warning or error severity;
- the backing fields used by an automated check, where applicable;
- a concise requirement and remediation.

The built-in catalogue declares rules for accessible names, heading order,
visible form labels, unique field IDs, provider fallbacks, keyboard and focus
behavior, announcements, no-JavaScript fallbacks, image alternatives, motion,
contrast and touch targets.

Automated checks currently evaluate governed instances for:

- empty accessible-name fields;
- skipped heading levels in authored page order;
- missing visible form labels;
- empty or duplicate form field IDs;
- missing provider titles or fallback text.

Each diagnostic identifies the page, backing node, catalogue entry, rule,
severity and remediation. The governed Properties view shows both the complete
entry contract and diagnostics for the selected instance.

## Publication policy

Diagnostics are advisory by default. A site can opt specific automated rules
into publication blocking through:

```json
{
  "settings": {
    "accessibility": {
      "blockingRuleIds": ["a11y.accessible-name", "a11y.form-control-label"]
    }
  }
}
```

`server/publish/publishSite.ts` runs the same pure analyser before runtime
builds or database writes. Only a current diagnostic whose rule ID is present
in `blockingRuleIds` stops publication. Severity alone never changes policy,
and manual or behavior-test declarations do not claim an automated result.

## Behavior coverage

Static checks do not prove interaction behavior. Tabs retain dedicated
keyboard, roving-focus, validation-reveal and no-JavaScript tests. Accordion
uses native `details` and `summary`. CMS-native forms test description/error
association, announcements and first-invalid focus through nested disclosure
content. Provider embeds test inert editor output, consent-delayed loading,
fallbacks and iframe policy.

Manual rules remain explicit for concerns that depend on final content or
design context, including image alternatives, contrast, touch target size and
motion. They are review obligations, not fabricated pass/fail results.
