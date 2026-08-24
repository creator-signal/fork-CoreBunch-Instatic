# Creator Signal page-body authoring audit

This audit records the governed 0.8.0 starter composition for every public
route. The site uses one shared chrome template; every route body contains its
real component roots and no persisted page-pattern wrapper. It is enforced by `creatorSignalPageAuthoringReference` and
`creatorSignalPageBodyComponentBoundaries` in `pack/site.ts` plus the
route-driven `creatorSignalPageBodyAuthoring.test.ts` regression gate.

Boundary classifications are intentional:

- **Atomic** owns one coherent visible responsibility and exposes all copy or
  repeated items through governed fields and repeaters.
- **Layout** owns only real authorable slots and responsive placement.
- **Provider** owns only provider configuration, delivery, fallback and result
  state. It does not own surrounding copy or layout.

`Columns(Intro | Managed)` means Two Column Layout (**Layout**) with Section
Intro (**Atomic**) in the Left slot and Managed Form (**Provider**) in the Right
slot. `Columns(Intro | CRM)` uses Embedded CRM Form (**Provider**) instead.
Populated slots render their real contents without structural labels or padding
on the canvas, while empty slots remain discoverable drop targets.

| Route | Pattern | Current page-body tree | Boundary result | Migration from 0.6.0 |
| --- | --- | --- | --- | --- |
| `/` | Home Page | Campaign Hero → Signal Strip → Signal Comparison → Feature Grid → Process Steps → Feature Grid → Feature Grid → Pricing Plans → Founder Story → FAQ → Call to Action | Atomic leaves | None |
| `/products` | Product Page | Hero → Feature Grid → Call to Action | Atomic leaves | None |
| `/products/sales-pulse` | Product Page | Hero → Feature Grid → Call to Action | Atomic leaves | None |
| `/features` | Features Page | Hero → Feature Grid | Atomic leaves | None |
| `/pricing` | Pricing Page | Hero → Feature Grid → Call to Action | Atomic leaves | None |
| `/contact` | Contact Page | Hero → Columns(Intro \| Managed) | Atomic + Layout + Provider | Preview required |
| `/feedback` | Feedback Page | Hero → Columns(Intro \| CRM) | Atomic + Layout + Provider | None; already composed in 0.6.0 |
| `/wishlist` | Contact Page | Hero → Columns(Intro \| Managed) | Atomic + Layout + Provider | Preview required |
| `/early-access` | Early Access Page | Campaign Hero → Signal Strip → Feature Grid → Columns(Intro \| Managed) → Feature Grid → Feature Grid → Testimonial | Atomic + Layout + Provider | Preview required |
| `/waitlist` | Contact Page | Hero → Columns(Intro \| Managed) | Atomic + Layout + Provider | Preview required |
| `/beta` | Contact Page | Hero → Columns(Intro \| Managed) | Atomic + Layout + Provider | Preview required |
| `/ask-a-question` | Contact Page | Hero → Columns(Intro \| Managed) | Atomic + Layout + Provider | Preview required |
| `/feature-request` | Contact Page | Hero → Columns(Intro \| Managed) | Atomic + Layout + Provider | Preview required |
| `/report-an-error` | Contact Page | Hero → Columns(Intro \| Managed) | Atomic + Layout + Provider | Preview required |
| `/legal/privacy` | Article or Content Page | Hero → Rich Text Section | Atomic leaves | None |
| `/legal/terms` | Article or Content Page | Hero → Rich Text Section | Atomic leaves | None |
| `/legal/billing` | Legal or Trust Page | Public Document | Atomic | None |
| `/legal/acceptable-use` | Legal or Trust Page | Public Document | Atomic | None |
| `/legal/browser-extension` | Legal or Trust Page | Public Document | Atomic | None |
| `/legal/cookies` | Legal or Trust Page | Public Document | Atomic | None |
| `/legal/dpa` | Legal or Trust Page | Public Document | Atomic | None |
| `/trust/security` | Legal or Trust Page | Public Document | Atomic | None |
| `/trust/subprocessors` | Legal or Trust Page | Public Document | Atomic | None |
| `/support` | Legal or Trust Page | Public Document | Atomic | None |
| `/help/account-data` | Legal or Trust Page | Public Document | Atomic | None |
| `/status` | Legal or Trust Page | Public Document | Atomic | None |
| `/404` | Not Found Page | Recovery State | Atomic | None |

The eight rows marked **Preview required** move copy out of the former Managed
Form leaf into a separately selectable Section Intro and place both components
inside real layout slots. The immutable `retained-0.6.0-hashes.ts` boundary
recognises only untouched 0.6.0 starter rows. Any authored difference blocks
the whole migration for manual mapping. A successful migration writes draft
rows only; it never publishes content.

Retained 0.7.0 rows use the same real child components beneath one technical
`creator-signal.site.pattern.*` container. The 0.8.0 migration recognises only
that exact presentation-free wrapper, promotes its children into the page body,
and preserves authored component IDs, fields, ordering, nested slots and page
publication status. It never publishes automatically.

The audit found no other bundled page-body responsibility. Feature collections,
plans, steps, FAQ items and navigation-like lists are intentionally atomic
repeaters because their items share one semantic component and already expose
governed add, edit and remove controls. Legal, trust, support, help and status
documents remain one versioned Public Document rich-text boundary so approved
prose is not fragmented into reorderable paragraphs.
