# Creator Signal production-look and authoring parity

Generated: 2026-08-21

This report is the durable reference for the Creator Signal public-site migration. It compares the current public site with the authorable Instatic candidate across every governed route and records the component and template contract used to reproduce each page.

## Accepted candidate

- Source commit: `a72776790b1a96db5a2cbbbb16ffd48bb1fc6f04`
- Local runtime: `creator-signal-instatic:issue-105`
- Local image ID: `sha256:67dd6cb363111dcfc4909e70a23daa4995929b68c717cef80cf886a8f0ab959f`
- Runtime version label: `0.0.37-local`
- Creator Signal technical pack: `0.3.9`
- Existing-site upgrade result: `publishedPages=0`; no authored page was replaced
- Reviewed local publish: 26 draft pages, 26 published pages, `draftMatchesPublished=true`

## Result

- 24 routes at desktop, tablet and mobile: **72/72 passed**
- Public-site comparisons: **69/69 passed**
- Candidate-only early-access captures: **3/3 passed**; the public site returns HTTP 404 for this route, so no visual-parity claim is made
- Consent and generated-form interactions: **8/8 passed**
- Candidate SEO checks: title, description, canonical, robots, Open Graph, Twitter card, `en-AU` and navigation schema passed on every route
- Ordinary page maximum pixel difference: `0.8836926479%`
- Ordinary page maximum mean channel delta: `0.1624136263`
- Ordinary component-section maximum pixel difference: `2.0120552382%`
- Ordinary component-section maximum mean channel delta: `0.3621887792`

The comparison keeps the exact raw image metrics. Its production-look limits are 1% and 0.25 for full pages, and 2.5% and 0.5 for isolated component sections. Those bounds cover cross-origin font rasterisation but remain below the material failures found and fixed during the review: desktop card geometry, generated-form styling and CTA button treatment.

One intentional responsive correction is accepted and identified in the machine-readable report. At 390px, the public `/legal/privacy` page is 13px wider than its viewport. The candidate has zero horizontal overflow and preserves the same visible text, headings, landmarks and component order; its heading wraps to an additional line instead of clipping the document.

## Authoring model

The shared `Creator Signal site template` owns the reusable site chrome:

1. `creator-signal.site.header`
2. one page-content outlet
3. `creator-signal.site.footer`
4. `creator-signal.site.consent-banner`

Header and footer links are repeatable data fields. Authors using the template add only page content. All 20 content/chrome components are opinionated leaf components with typed fields or repeaters and zero authored child slots. The 14 page patterns are editable starter compositions used to create coherent pages; they do not expose arbitrary component slots.

The catalogue contains 34 Creator Signal entries in total: 20 opinionated components and 14 governed page patterns. All use the `creator-signal.site` namespace.

## Page and section reference

| Route | Page | Governed page pattern | Opinionated page components | Result |
| --- | --- | --- | --- | --- |
| `/` | Creator Signal | `creator-signal.site.pattern.home-v2-page` | Hero, Feature Grid, Call to Action | 3/3 |
| `/products` | Products | `creator-signal.site.pattern.product-page` | Hero, Feature Grid, Call to Action | 3/3 |
| `/products/sales-pulse` | Sales Pulse | `creator-signal.site.pattern.product-page` | Hero, Feature Grid, Call to Action | 3/3 |
| `/features` | Features | `creator-signal.site.pattern.features-page` | Hero, Feature Grid | 3/3 |
| `/pricing` | Pricing | `creator-signal.site.pattern.pricing-page` | Hero, Feature Grid, Call to Action | 3/3 |
| `/contact` | Contact | `creator-signal.site.pattern.contact-page` | Hero, Managed Form | 3/3 |
| `/feedback` | Feedback | `creator-signal.site.pattern.contact-page` | Hero, Managed Form | 3/3 |
| `/wishlist` | Join the wishlist | `creator-signal.site.pattern.contact-page` | Hero, Managed Form | 3/3 |
| `/early-access` | Creator Signal Early Access | `creator-signal.site.pattern.early-access-page` | Campaign Hero, Signal Strip, Feature Grids, Managed Form, Testimonial | 3/3 candidate-only |
| `/ask-a-question` | Ask a question | `creator-signal.site.pattern.contact-page` | Hero, Managed Form | 3/3 |
| `/feature-request` | Feature request | `creator-signal.site.pattern.contact-page` | Hero, Managed Form | 3/3 |
| `/report-an-error` | Report an error | `creator-signal.site.pattern.contact-page` | Hero, Managed Form | 3/3 |
| `/legal/privacy` | Privacy | `creator-signal.site.pattern.article-content-page` | Hero, Rich Text Section | 3/3 |
| `/legal/terms` | Terms | `creator-signal.site.pattern.article-content-page` | Hero, Rich Text Section | 3/3 |
| `/legal/billing` | Subscriptions, Cancellation and Refunds | `creator-signal.site.pattern.legal-trust-page` | Public Document | 3/3 |
| `/legal/acceptable-use` | Acceptable Use Policy | `creator-signal.site.pattern.legal-trust-page` | Public Document | 3/3 |
| `/legal/browser-extension` | Browser Extension Privacy and Permissions | `creator-signal.site.pattern.legal-trust-page` | Public Document | 3/3 |
| `/legal/cookies` | Cookie Policy | `creator-signal.site.pattern.legal-trust-page` | Public Document | 3/3 |
| `/legal/dpa` | Data Processing Addendum | `creator-signal.site.pattern.legal-trust-page` | Public Document | 3/3 |
| `/trust/security` | Security and Data Handling | `creator-signal.site.pattern.legal-trust-page` | Public Document | 3/3 |
| `/trust/subprocessors` | Subprocessors and Service Providers | `creator-signal.site.pattern.legal-trust-page` | Public Document | 3/3 |
| `/support` | Support and Complaints | `creator-signal.site.pattern.legal-trust-page` | Public Document | 3/3 |
| `/help/account-data` | Account Export and Deletion | `creator-signal.site.pattern.legal-trust-page` | Public Document | 3/3 |
| `/status` | Service Status | `creator-signal.site.pattern.legal-trust-page` | Public Document | 3/3 |

## Reproduce the evidence

Run the candidate locally on port 4330, then execute:

```powershell
bun run verify:creator-signal-public-acceptance
bun run verify:creator-signal-parity -- --baseline-base https://creatorsignal.me --candidate-base http://localhost:4330
```

The acceptance gate writes its report to `.tmp/creator-signal-public-acceptance`. The parity gate writes `report.json`, the full side-by-side HTML report, and every page and section screenshot to `.tmp/creator-signal-parity`. The HTML report is the detailed visual review artifact; this file is the committed summary and route/component index.
