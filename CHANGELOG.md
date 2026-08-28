# Changelog

All notable changes to Instatic will be documented here.

This project is pre-1.0. Breaking changes may appear in minor or patch releases until a stable release line exists.

## Unreleased

## 0.0.51 - 2026-08-28

### Plugin canvas keyboard navigation

- Restored the browser's sequential Tab order inside the editor canvas so
  plugin-backed component roots are keyboard reachable.
- Kept nested preview-owned interactive descendants out of the editor's Tab
  sequence while preserving child component roots as independent focus stops.
- Added regressions for canvas Tab handling and plugin preview focus ownership.

## 0.0.50 - 2026-08-28

### Live Component Library catalogue

- Reconciled an already-open Component Library when plugin-backed entries
  register after the editor first renders.
- Removed stale searchable entries when a plugin catalogue unregisters or
  refreshes, without requiring a route reload.
- Returned the generation-keyed sorted entry snapshot directly through React's
  external-store boundary so compiler caching cannot retain an old catalogue.

## 0.0.49 - 2026-08-28

### Plugin registry reconciliation

- Reconciled retained Components-tree projections when plugin-backed module and
  Component Library registries activate after the editor first renders.
- Preserved truthful missing-entry states for unresolved definitions while
  allowing newly registered definitions to appear without a route reload or
  page-state mutation.
- Added a retained-page regression that proves registry activation alone
  invalidates the projected tree.

## 0.0.48 - 2026-08-28

### Release verification

- Accounted for the bounded retained-plugin failure and retry UI in the
  post-paint Site editor bundle budget.
- Kept the editor body behind the route-shell lazy boundary and Import HTML
  behind its separate open-state lazy boundary.
- Superseded the unpublished 0.0.47 candidate after its exact release gate
  rejected the previous bundle cap.

## 0.0.47 - 2026-08-28

### Retained plugin readiness and recovery

- Activated retained editor plugins before resolving plugin-backed component
  nodes after authenticated route transitions and remounts.
- Kept rejected or partially failed activation out of the Component tree while
  leaving the canvas and HTML view usable.
- Added a visible retry action and focused recovery coverage so the Component
  tree becomes ready only after a clean activation pass.

## 0.0.46 - 2026-08-28

### Authenticated editor plugin activation

- Moved editor plugin activation outside individual route-layout lifetimes so
  authenticated navigation shares one session-scoped registry rebuild.
- Coalesced concurrent plugin lifecycle refreshes and kept a failed initial
  activation retryable without overlapping registry resets.
- Added deterministic coordinator coverage for route transitions, refresh
  coalescing and recovery from an initial activation failure.

## 0.0.45 - 2026-08-26

### Plugin canvas selection contract

- Forwarded the complete canvas node identity and interaction contract through
  both leaf and child-capable plugin module wrappers.
- Restored WYSIWYG hover outlines, canvas click selection, Components-tree
  synchronisation and property editing for plugin-backed page sections.
- Added focused adapter coverage and authenticated browser acceptance for all
  eleven direct plugin-backed Homepage sections.

## 0.0.44 - 2026-08-25

### Idempotent retained-content migration

- Repaired the exact stale `0.7.0` artwork references left on Home and Early
  Access by the earlier WYSIWYG recipe expansion, but only when the complete
  repaired page matches the current governed target.
- Preserved authored near-matches without emitting replacement rows and kept
  missing pages, additional pages, template conflicts and altered retained
  Feedback providers fail-closed.
- Made repeated wrapper and Feedback migration preparation safe and
  idempotent, including authored-only zero-row no-op results.

## 0.0.43 - 2026-08-25

### Retained authoring-safe Feedback migration

- Allowed the exact one-row Feedback iframe repair to proceed beside unrelated
  authored pages while keeping those authored rows out of the migration.
- Kept missing or additional pages, template conflicts, altered Feedback
  providers and every broader migration fail-closed.
- Added mixed retained/authored coverage proving the repair preserves Home and
  Early Access authoring while replacing only the machine-owned Feedback node.

## 0.0.42 - 2026-08-25

### Local WYSIWYG Feedback authoring

- Replaced the Feedback page's production-hosted iframe with the same
  capability-backed Managed Form component used by every other public intake
  route, while retaining independently authorable Two Column slots.
- Added a fail-closed retained-content repair that changes only the exact
  machine-owned 0.8.1 Feedback iframe node and preserves all other authored
  page components, IDs, order, fields and publication metadata.
- Updated the Feedback insertion recipe to materialize a governed
  `creator_signal_feedback` Managed Form instead of a remote iframe.

## 0.0.41 - 2026-08-25

### Stable authorable Creator Signal page composition

- Expanded optional Creator Signal page recipes into their real child
  components so retained pages no longer persist an opaque page-pattern owner;
  every page section remains independently selectable, configurable, movable,
  replaceable and removable through the Components editor.
- Rendered the protected Two Column Layout definition as real responsive left
  and right WYSIWYG slot placeholders while preserving author-controlled slot
  content in ordinary pages.
- Clarified that patterns are insertion recipes, shared-template content is
  edited once in the CMS, and plugin releases own technical definitions rather
  than authored page or template content.

## 0.0.40 - 2026-08-24

### Creator Signal retained-content operations

- Shipped the governed Creator Signal retained-content classifier inside the
  runtime image so operators can prepare an untouched backup, hash report,
  content-only migration archive and equivalent import-preview JSON without a
  separate source checkout; classification remains fail-closed and never
  imports or publishes content automatically.

## 0.0.39 - 2026-08-24

### Governed Creator Signal reference site and forms

- Rebuilt the complete Creator Signal public route set from the governed
  reference design while keeping starter patterns optional and every page body
  freely authorable after insertion.
- Added purpose-specific Waitlist and Beta routes, governed Mautic aliases and
  production-shaped managed-form submission under the published content
  security policy, including validation, latency, failure and unavailable
  states.
- Added a standalone CRM iframe provider component with bounded resizing,
  fallback behaviour and source-owned acceptance for the Feedback route.
- Split all managed-form pages into separately selectable Section Intro,
  Two Column Layout and provider components, with responsive copy-first reading
  order across Contact, Wishlist, Early Access and every public intake route.
- Audited every public route and nested slot boundary, verified all current
  catalogue entries through discovery, insertion, configuration, revision and
  removal, and added route-wide browser and accessibility regression gates.
- Advanced the bundled Creator Signal technical pack to 0.7.0 and recognised
  exact untouched 0.4.0, 0.5.0 and 0.6.0 starter content through an explicit,
  preview-only migration that never overwrites or publishes authored pages.

## 0.0.38 - 2026-08-21

### Complete Creator Signal authoring acceptance

- Consolidated eligible adjacent prose into one governed Rich Text component
  through the shared editor and MCP operation, preserving semantic source
  content and author-controlled revisions.
- Proved discover, insert, configure, preview, publish, revise and removal
  tasks for all 33 Creator Signal catalogue entries through the editor and MCP
  bridge, while keeping shared chrome single-owned and leaf entries slot-free.
- Added explicit semantic, keyboard, focus, dismissal, announcement, form,
  media, motion, contrast, touch and no-JavaScript accessibility contracts for
  every catalogue entry, including field-level deterministic diagnostics and
  policy-only publication blockers.
- Advanced the bundled Creator Signal technical pack to 0.4.0 so retained
  installations receive the accepted catalogue upgrade without replacing or
  publishing authored pages.

## 0.0.37 - 2026-08-21

### Production-look Creator Signal authoring parity

- Rebuilt all 24 public routes from opinionated `creator-signal.site`
  components while keeping shared header, footer and privacy choices reusable
  through the site template.
- Kept every leaf component slot-free and field-driven, including repeatable
  navigation, footer, feature, FAQ, comparison and pricing data.
- Restored public card, generated-form and CTA styling, retained responsive
  component rules, and removed the mobile privacy page's horizontal overflow.
- Advanced the technical pack to 0.3.9 without replacing authored pages and
  made retained-content migration classification deterministic.
- Added a governed 72-capture page and section comparison report, 8 interaction
  checks, SEO/schema verification and deterministic browser baselines in CI.

## 0.0.36 - 2026-08-21

### Creator Signal Website v2 and retained-site migration

- Added the governed Home v2 and Early Access flows, campaign components,
  responsive states, SEO contracts and visual acceptance baselines.
- Recognised exact retained 0.1.11 and 0.2.0-0.2.6 starter content as explicit
  migration predecessors while continuing to block unknown authored changes.
- Added newly governed pages only when their reserved IDs are absent, repaired
  only exact historical shared templates, and advanced the technical plugin
  reconciliation boundary to 0.3.5.

## 0.0.35 - 2026-08-21

### Fixed

- Kept the packaged plugin module registry identical to its configured module
  list, including the Creator Signal comparison and recovery components, and
  fail plugin builds when direct module exports drift from that registry.

## 0.0.34 - 2026-08-20

### Complete Creator Signal authoring experience

- Made the shared Header, Footer and Privacy Choices template-only singletons,
  kept ordinary pages content-only, and applied the same placement rules to
  editor insertion, drag-and-drop, server writes and Agent/MCP authoring.
- Integrated the versioned Creator Signal design system, governed public
  patterns and authoring guardrails as the single source for component fields,
  assets, responsive behavior, themes and published semantics.
- Added durable 23-route page/section authoring references plus desktop,
  tablet and mobile visual, accessibility, SEO, consent, form, degraded-state
  and unknown-route acceptance evidence.
- Aligned component previews, full-page Preview and published rendering while
  retaining editor-only sandbox protections and preserving authored pages
  during technical plugin upgrades.
- Added accessible navigation, skip links, persistent privacy choices,
  long-content and 200% reflow handling, forced-colour/reduced-motion support,
  and governed not-found, comparison and recovery experiences.

## 0.0.33 - 2026-08-14

### Creator Signal production parity

- Restored the complete shared Creator Signal design contract across all 23
  governed routes while keeping leaf components field-driven and reserving
  slots for true containers.
- Added route-by-route desktop, tablet and mobile visual, semantic, SEO and
  structured-data parity verification, plus consent and form interaction
  checks against the current public site.
- Made plugin-owned component styles available in isolated previews and
  deduplicated the shared stylesheet in public, preview and Agent/MCP output.
- Rebuilt published static artifacts from active published snapshots during
  technical plugin upgrades without replacing authored pages, publishing
  drafts or discarding installed runtime assets.
- Extended safe opinionated semantic markup support and locked the full
  Creator Signal component, upgrade, publisher, security and Agent/MCP
  contracts with regression coverage.

## 0.0.32 - 2026-08-14

### Preserved site-pack collaboration repair

- Advanced the bundled Creator Signal plugin to 0.2.1 so installations that
  already contain the 0.2.0 plugin execute the technical-pack upgrade instead
  of incorrectly treating the changed component contract as current.
- Reused the collaboration-aware pack reconciliation path to replace stale
  managed component lineages from authoritative rows while starter and
  authored pages remain create-only and are never overwritten or published.
- Locked the bootstrap reconciliation version in the governed site-pack test
  and documented that the authored-content migration remains version 0.2.0.

## 0.0.31 - 2026-08-14

### Creator Signal authoring and SEO acceptance

- Preserved each terminal page's title, description, canonical URL, locale,
  robots policy and social metadata when shared templates wrap published pages.
- Made draft Preview compose the same shared template chrome and Visual
  Component overrides as public rendering while leaving non-routable component
  edit surfaces unwrapped.
- Started collaboration invalidation before managed starter reconciliation so
  upgraded Visual Component parameter contracts replace stale editor lineages
  before an author can bind to them.

## 0.0.30 - 2026-08-14

### Creator Signal shared-template persistence

- Replaced the invalid shared-template slug with the authoring-safe
  `creator-signal-site-template` slug.
- Added a backup-first, exact-content repair for the previously generated
  invalid template row while blocking automatic replacement of authored data.
- Added full-pack persistence validation so every governed starter page and
  shared template crosses the same boundary used by normal authoring.

## 0.0.29 - 2026-08-14

### Media-edge security

- Updated the media-edge build toolchain from Go 1.26.5 to Go 1.26.6, fixing
  CVE-2026-39821 and CVE-2026-46600 in the compiled standard library.
- Retained the v0.0.28 governed Creator Signal authoring release content in
  this replacement release; v0.0.28 was rejected by the candidate scan and
  never published to immutable semver image tags or deployed.

## 0.0.28 - 2026-08-14

### Governed Creator Signal authoring

- Replaced slots on non-container Creator Signal components with typed fields
  and repeatable data, while retaining slots only for structural composition.
- Added opinionated semantic output for the Creator Signal catalogue, including
  authorable navigation, rich text, feature, testimonial, FAQ, document, form,
  header, footer, consent, hero, and call-to-action content.
- Added a sanitised rich-text editor, shared site chrome, page-level SEO and
  structured metadata, and the same governed component model for Agent and MCP
  authoring.

### Safe starter-site lifecycle

- Made starter pages an empty-site bootstrap only so plugin upgrades cannot
  replace or publish authored pages.
- Rebuilt the 23-page Creator Signal starter site as structured component data
  with one shared template and preserved its existing public appearance.
- Added a previewable, backup-first migration for exact legacy starter content;
  authored or conflicting content is blocked from automatic replacement.

## 0.0.27 - 2026-08-13

### Media-edge security

- Updated the media-edge Caddy build to `golang.org/x/net` 0.56.0, fixing
  CVE-2026-46600 in DNS record parsing after the v0.0.26 candidate scan stopped
  publication.
- Retained the v0.0.26 content-addressed published module JavaScript repair in
  this replacement release; v0.0.26 was never published to immutable image
  tags or deployed.

## 0.0.26 - 2026-08-13

### Published module JavaScript cache safety

- Replaced process-local publish counters in module JavaScript URLs with the
  SHA-256 identity of the exact published script body.
- Rejected missing, malformed, and stale content identities at the asset route
  so one cache key can never serve different JavaScript after a restart or
  deployment.
- Made successfully verified module JavaScript assets immutable and added
  regression coverage for body changes, stale URLs, previews, and public
  rendering.

## 0.0.25 - 2026-08-13

### Creator Signal public forms

- Published governed Contact, Feedback, Join Wishlist, Ask a Question,
  Feature Request, and Error Report routes in the Creator Signal starter site.
- Replaced environment-specific Mautic form IDs and generated callback names
  with a validated, versioned alias registry that fails visibly when its
  contract is missing or malformed.
- Preserved module-declared Mautic origins when plugin scripts relax a
  published page's Content Security Policy, and added regression coverage for
  the combined module/plugin publishing path.
- Bumped the embedded Creator Signal plugin to `0.1.11` so preserved
  installations upgrade and can republish the expanded 23-page public site.

### Governed public authoring

- Added a machine-readable Creator Signal public-authoring contract and bound
  governed Component Library identities and variants to its allow-list.
- Recorded canonical generated design-system adapter identities without
  duplicating raw token values, and governed public theme, responsive, asset,
  and content roles.

### Creator Signal release governance

- Established protected `creator-signal/develop` integration and
  `creator-signal/main` release branches, with CI and upstream-refresh rules
  that preserve the fork's accepted release ancestry.

## 0.0.24 - 2026-08-10

### Release image security

- Moved the production runtime to a patched, digest-pinned Alpine Bun image and
  updated `brace-expansion`, `nanoid`, and `ws` to fixed versions.
- Rebuilt the media edge from Caddy 2.11.4 with Go 1.26.5 and fixed `x/text`
  and gRPC dependencies, then copied it into a patched minimal Alpine runtime
  without curl.
- Added mandatory zero-HIGH/CRITICAL Trivy gates for both commit-addressed
  candidates and independently resolved published digests before release
  bundle creation.
- Pinned every third-party action in the privileged release workflow to an
  immutable commit and retained complete scan reports as release evidence.

## 0.0.23 - 2026-08-10

### Creator Signal catalogue ownership

- Moved every mapped public catalogue identity into the
  `creator-signal.site.catalogue.*` namespace while preserving the native
  renderer, Visual Component, pattern, CSS, and plugin implementation IDs.
- Migrated stored page, component, layout, collaboration, version, and form
  draft references without rewriting unrelated properties.
- Attributed the complete mapped catalogue to the Creator Signal design-system
  provider in the authoring interface and MCP component-library responses.

### Editor, collaboration, and publishing reliability

- Adopted the latest upstream collaboration persistence lifecycle while
  retaining catalogue namespace migration during document hydration.
- Added selector usage filtering, improved floating-panel dock clearance and
  shared data-binding selection, and made canvas form-control tests
  deterministic across view modes.
- Added published-page `HEAD` handling, surfaced runtime script diagnostics,
  and improved deterministic collaborative publishing.

## 0.0.22 - 2026-08-05

### Collaborative authoring and data

- Added real-time Yjs collaboration for pages, components, layouts, and the
  site shell, including presence, guarded writes, conflict recovery, and
  persistent relay documents.
- Expanded the Data workspace with repeater authoring, schema composition,
  media galleries, entry-field loops, and safer row and post-type mutations.

### Editor and governed components

- Made Components layers and insertion catalogue-only: imported or freeform
  HTML and raw Visual Components remain in HTML view until an author inserts a
  governed catalogue entry.
- Added provider identity and filtering to the Component Library, an explicit
  empty state, and the governed Creator Signal Hero with MinIO-backed artwork.
- Added resizable and undockable editor panels, site-explorer hover previews,
  improved Tabs controls, and more reliable authoring persistence.

### Publishing, import, and MCP reliability

- Prevented author-bound account email values from leaking into published
  output, scoped entry-route assets to their owning template, and prefetched
  bound media without changing published markup.
- Improved large CSS imports, loop-reference diagnostics, authored-structure
  preservation, and URL-scheme validation.
- Adopted stateless MCP transport behavior and hardened governed authoring,
  workspace requirements, and multi-operation style changes.

## 0.0.21 - 2026-08-02

### Creator Signal legal publication

- Published version `2026-08-02` of the concise Creator Signal legal, trust,
  support, status, and account-data page set with a shared effective date and
  verified operating-company disclosure.
- Removed the pre-activation disclaimer from Terms and Privacy after operator
  approval, without representing the page pack as external legal advice.
- Bumped the embedded Creator Signal plugin to `0.1.9` so managed existing
  installations upgrade and republish the reviewed page pack on deployment.

## 0.0.20 - 2026-08-02

### MCP Component Library authoring

- Added capability-filtered MCP tools to search the live governed Component
  Library, including plugin-owned entries, and insert registered components.
- Added declared-field and preset/variant authoring tools that retain catalogue
  identity and version while rejecting invalid placement, fields and options.
- Shared the canonical registry, placement, dependency installation and
  page-tree insertion path between the Site editor and browser-bridged MCP.
- Kept component changes as drafts until an explicit, separately authorized
  publish operation.

### Release reliability

- Made private source-map upload conditional on the complete protected
  monitoring configuration so missing optional credentials no longer suppress
  otherwise verified release bundles and runtime images.

## 0.0.19 - 2026-08-02

### MCP connections

- Added an end-user guide for connecting Claude Code and hosted custom
  connectors through OAuth or capability-scoped personal access tokens.
- Corrected the generated Claude Code HTTP command to use the canonical
  option order and added regression coverage for the copyable command.
- Documented least-privilege capability selection, draft and publish
  behaviour, credential revocation, endpoint verification, and troubleshooting.
- Clarified that governed Component Library insertion remains an editor action;
  MCP currently exposes generic freeform authoring rather than catalogue-native
  list or insert tools.

## 0.0.18 - 2026-08-01

### Component Library and authoring

- Added a governed 101-entry Component Library covering templates, reusable
  components, editorial primitives, patterns, forms, collections, media, and
  capability-backed integrations.
- Added catalogue insertion, component-aware Layers and Properties surfaces,
  placement rules, migrations, lossless Freeform conversion, plugin ownership,
  and author-permission enforcement.
- Added generated field specifications, a component showcase site pack, and
  complete author and visitor acceptance documentation.

### Components and visitor behaviour

- Added accessible tabs, accordions, overlays, carousels, navigation, tables,
  rich content, media, provider embeds, search, and structured form patterns
  with useful no-JavaScript fallbacks.
- Added governed form drafts, wizard state, secure file attachments, collection
  pagination, site search, provider policies, and accessibility diagnostics.

### Publishing and metadata

- Added page and site controls for canonical URLs, robots directives, language
  alternates, Open Graph metadata, Twitter cards, and social-image alternatives.
- Added semantic breadcrumb and image structured data, safe metadata URL
  handling, and mandatory no-index directives for previews.
- Documented the complete semantic HTML, accessibility, metadata, structured
  data, progressive-enhancement, BEM, and design-token publishing contract.

## 0.0.17 - 2026-07-25

### Authentication and deployment

- Added Zitadel OIDC authorization-code authentication with PKCE for the
  Instatic admin, including role-gated just-in-time operator provisioning,
  signed state, verified immutable identities, logout, and short-lived
  deployment authorization.
- Added PostgreSQL and SQLite identity migrations plus automated coverage for
  login, denial, session, deployment, and static admin behavior.

### Creator Signal integration

- Restored imported section, feature, prose, header, and footer layout styles
  so the visual editor and published multi-site pages retain the intended
  bounded responsive design.
- Added production image, site-pack, and integration verification for the
  Zitadel, MinIO, and Creator Signal delivery contracts.

## 0.0.16 - 2026-07-25

### Creator Signal integration

- Restored the bounded responsive layout on every public route and compiled
  the launch site against one shared stylesheet instead of repeating global
  rules for every page.
- Made plugin-pack style upgrades authoritative for plugin-owned rules, so
  obsolete package CSS is removed without touching user-owned styles.

## 0.0.15 - 2026-07-25

### Creator Signal integration

- Preserved complete HTTP(S) media origins in published Content Security
  Policies so MinIO endpoints with an explicit local port remain valid.
- Removed Caddy's privileged-port file capability from the media-edge image so
  it can run as an unprivileged user with all Linux capabilities dropped.
## 0.0.14 - 2026-07-25

### Security

- Fixed a URL-scheme filter bypass in `isSafeUrl()` ([GHSA-pqcp-872g-gmp8](https://github.com/CoreBunch/Instatic/security/advisories/GHSA-pqcp-872g-gmp8)). The guard normalised input with `String.prototype.trim()`, which does not strip U+0000–U+0008 or U+000E–U+001F, while browsers strip the whole U+0000–U+0020 range before reading a URL scheme. A `javascript:` URL behind a leading control character was therefore reported safe and emitted verbatim into `href` / `src` / `action` attributes. Reported by [@overgrowncarrot1](https://github.com/overgrowncarrot1).
- Replaced the three-entry scheme denylist with an allowlist (`http`, `https`, `mailto`, `tel`, `sms`, plus all relative forms) read through a scheme extractor that follows the WHATWG stripping rules, so the guard cannot disagree with the browser that resolves the value.
- Consolidated three divergent URL guards into one. The plugin-SDK `safeUrl` was a weaker copy that a plain leading space defeated and that never blocked `data:` at all; the editor input gate now shares the same scheme extractor. An architecture test fails the build if a fourth copy appears.

## 0.0.13 - 2026-07-24

### Editor, import, and publishing

- Added a dedicated Page settings dialog so authors can edit page slugs directly.
- Restored contrast for editor switches and canvas mode controls.
- Preserved node inline styles in image previews and hid empty canvas chrome for ambient style rules.
- Rendered imported SVG sizing and presentation styles on the canvas root so editor previews match published output.
- Preserved safe SVG fragment references through Super Import, editor rendering, and publishing so circular text paths remain visible and animated.

### Platform and maintenance

- Updated Sharp to its patched release.
- Restored function-level coverage reporting for Fallow health checks.

## 0.0.12 - 2026-07-24

### AI and integrations

- Redesigned AI provider settings around clearer provider and connection management.
- Added OAuth authorization for MCP connectors, including scoped authorization, token lifecycle handling, and hardened protocol validation.

### Editor, content, and publishing

- Rendered loop output in page preview so preview mode matches authored loop content.
- Preserved in-progress decimal values in number controls instead of replacing valid partial input while editing.
- Kept responsive admin navigation aligned to the left at narrow widths.
- Fixed new custom data tables retaining their selected table kind instead of always becoming plain data tables.
- Fixed composed templates so published pages, entries, and entry previews use the rendered page or entry title rather than the wrapping template title.

## 0.0.11 - 2026-07-11

### AI and integrations

- Added multi-image AI conversations with paste and picker flows, compact galleries and previews, private history persistence, model capability checks, and optional Save to Media actions.
- Added a compact context meter with remaining-context, token, cache, cost, and model-pricing details.
- Made render snapshots faithfully capture authored backgrounds and breakpoint-specific layouts without changing the visible canvas state.
- Expanded `site_apply_css` with explicit merge, replace, property-removal, and delete operations, preserved `!important` priorities, and an Anthropic-compatible provider schema.
- Expanded MCP connectors with headless document listing, scoped Site and Content workspace bridges, and explicit capability-gated publishing after saved draft edits.

### Editor, content, and publishing

- Added a light admin theme and UI text-size preferences alongside the existing density setting.
- Added editors for custom content fields, including structured, media, and relation values, directly in the Content settings panel.
- Added middle-mouse canvas panning and improved Layers visibility, scrolling, and empty-container presentation.
- Derived font-weight choices from installed variants, tolerated malformed stored font settings, and fixed stale selection or focus after undo, redo, and assistant-panel interactions.

### Import and publishing

- Imported YouTube iframes and HTML `<video>` elements as native Video modules, preserving playback and accessibility settings.
- Optimized media-library background images into responsive variant fallbacks and `image-set()` output in both the editor and published CSS.
- Made whole-site saves transactional with explicit deletes and a serialized save queue, preventing partial or interleaved saves before publishing.

### Security and data safety

- Hardened custom HTML attributes and tags against stored script injection by rejecting dangerous URL schemes, `srcdoc`, and unsafe embedded elements.
- Applied shared magic-byte, MIME, extension, SVG-sanitization, traversal, and reserved-path validation to JSON and archive media imports.
- Added `base-uri 'self'` and `object-src 'none'` to the admin Content Security Policy.

### Platform and reliability

- Fixed Postgres JSON text-column hydration and made static publish-slot swaps reliable on Windows.
- Made Windows development startup use the active Bun runtime with safer Vite launching and stale-port recovery.
- Recovered interrupted AI browser-tool turns as terminal, retryable failures instead of leaving conversations stuck or replaying malformed history.
- Cleaned up disconnected MCP, editor, and plugin streams and bounded orphaned connection lifetimes so abandoned connections cannot exhaust the development proxy.

## 0.0.10 - 2026-07-01

### AI and integrations

- Added an OpenAI-compatible AI provider for custom base URL endpoints.

### Import, editor, and publishing

- Fixed imported module scripts so their npm dependencies install correctly.
- Aligned canvas and Layers panel keyboard shortcuts.
- Let modules declare Content Security Policy sources, so published `base.video` YouTube embeds render correctly.
- Fixed empty-folder explorer operations so they apply without showing the "0 paths" dialog.

## 0.0.9 - 2026-07-01

### AI and integrations

- Redesigned the AI assistant panel message stream: agent tool calls render as compact rows with a per-tool icon, a human-readable label, and status, with consecutive calls grouped under one turn.
- Added inline previews to tool calls — colour-token swatches for palette updates, and the captured screenshot for render-snapshot.
- Auto-titled conversations from the first prompt instead of "New conversation", and gave each message turn an avatar and a relative timestamp.
- Fixed the AI panel dropping the selected model when starting a new chat, and surfaced conversation delete/load failures as toasts.

### Editor and framework

- Added a body context menu when right-clicking empty space on the canvas.

## 0.0.8 - 2026-07-01

### Editor and framework

- Unified Core Framework management into one tabbed panel with a declarative Full / Variables / None manager.
- Consolidated Layers, Site, Code, and Media into one Explorer panel, including a dedicated Code tab and refreshed media browsing.
- Added canvas support for dragging media assets directly from the Media workspace.
- Fixed onboarding framework import defaults and retained pending site reloads so imported framework changes appear in the editor without a hard refresh.
- Fixed canvas mouse-wheel behavior so normal wheel scrolling stays vertical and Shift+wheel pans sideways.
- Kept the highlighted Spotlight result scrolled into view during keyboard navigation.

### AI and integrations

- Made AI token tools more tolerant of model-authored argument aliases for framework typography and spacing updates.

### Security

- Added central security response headers for admin and upload routes.
- Revalidated and sanitized imported archive media, including SVG payloads, before writing them to disk.
- Added expiry timestamps for MCP connector tokens, with existing tokens backfilled to a 90-day grace period.

## 0.0.7 - 2026-06-29

### AI & integrations

- Added MCP connectors so external AI clients can use the CMS tool surface through scoped connector tokens.

### Design and onboarding

- Imported Core Framework defaults from onboarding so new sites start with the selected design system values in place.

### Security

- Hardened sanitizers and regular expressions flagged by CodeQL.

### Documentation and deployment

- Replaced the README hero screenshot with a YouTube-linked introductory video thumbnail.
- Added README guidance explaining that image-based installs update by redeploying the latest image.

## 0.0.6 - 2026-06-26

### AI & agent tooling

- Added runtime code asset tools for agents so generated or edited runtime assets can be managed through the same agent workflow.

### Site import, export, and transfer

- Fixed site export downloads in environments where blob-backed responses were unreliable.
- Streamed site transfer bundles and unified the import review flow around the transfer archive path.
- Reused the CMS media client across site import code paths.

### Templates, content, and publishing

- Fixed dynamic data resolution inside outlet previews.
- Stopped auto-creating post type templates; entry templates are now explicit pages users create and assign.
- Hid the empty content settings panel until an entry is selected.

### Editor and admin

- Split non-site workspace layout state from the site editor layout.
- Fixed Spotlight layer commands to operate on the active canvas tree.
- Removed circular admin dependencies and restored lazy HMR loading.
- Simplified admin color token vocabulary and added fluid typography and spacing token scales.

### Quality

- Reused page-tree traversal selectors in form analysis.
- Expanded feature validation coverage across the admin, server, and architecture gates.

## 0.0.5 - 2026-06-17

### AI & agent tooling

- Added document-targeted site agent tools for pages, templates, and Visual Components: `list_documents`, `read_document`, and `open_document` replace the page-only read surface.
- Loop authoring now routes through the HTML import path and gives agents valid loop-source field tokens before they bind dynamic content.

### Content, data, and export

- Split system-table and custom-table capabilities, and locked system table identity while still allowing safe custom field edits.
- Routed collection create, update, and delete through step-up authentication.
- Added a granular full-site export dialog with Cmd+K access and server-accurate export size estimates, including media.
- Fixed Content Outlet rendering so current-entry bodies render in any content outlet.

### Editor and canvas

- Made the Settings modal and toolbar trailer global instead of editor-panel scoped.
- Made saved layouts the single source of truth.
- Rendered `base.text` with `tag: none` as bare text on canvas to match the published DOM.
- Rewrote the GitHub README with deeper product and self-hosting detail.

## 0.0.4 - 2026-06-13

### Editor & canvas

- Inline text editing on the canvas — double-click any text node to edit it in place, byte-identical to the published element.
- User-saved layouts: save any subtree and re-insert it exactly elsewhere.
- Double-click a row in the explorer / DOM panels to rename it.
- Design mode now opens at 50% zoom; live mode is pinned to 100%.
- Live mode shows the shared frame skeleton while hydrating, and the template read-only hint/open action is scoped to template chrome rather than page content.
- Removed inconsistent panel keyboard shortcuts from the rail.
- Fixed template-preview fidelity: composed read-only content (template chrome, outlet previews, inlined Visual Components) now carries each node's inline styles, matching the published page.

### Publisher & media

- `<img sizes>` is now derived automatically from the layout — the manual Sizes field is gone, and lazy images use the standards-based `sizes=auto` with a layout-resolved fallback.
- Responsive images never serve multi-MB originals to retina screens: `srcset` is built from variants only.
- Single class-CSS emission engine shared by publish and canvas, and one-way publisher layering (repositories never import the publish layer).
- Per-module published-JS channel; the form runtime now rides it.

### Templates & content

- Added a "Not found" template target for designing 404 pages.
- Content Outlet availability fixes and toast layering; closed outlet invariant holes.
- Roster saves now survive slug handoffs (homepage swap, swaps, revivals).

### Site import

- Refactored the Super Import pipeline into one adapter contract with a phase-decomposed plan/commit flow and deduped helpers; conflict resolution split into named concerns.
- Improved import fidelity: rgba color tokens, import-from-anywhere, and engine-proof `var()` / `env()` declarations at the import boundary.

### AI & plugins

- AI tools now inherit the caller's capabilities — `ai.chat` no longer acts as a blanket read grant, and write tools require `ai.tools.write`.
- AI credential auth is derived from the provider.
- Plugin performance: handle-based VM dispatch, native base64, and indexed content-API lookups; fixed `useCanvasNodeRect` to measure real canvas nodes.

### Admin & performance

- Unknown admin URLs (typos, stale deep links, `/admin/login`) now redirect to the dashboard — showing the login form when signed out — instead of rendering a blank page. Public-site 404s keep their own handling.
- Incremental site saves with runtime builds hoisted out of the publish transaction, plus hot-path fixes across the publish pipeline, public serving, and the editor store.
- Dead-code cleanup across the codebase (knip reports zero unused surface).

### Infrastructure

- Standardized container images on GHCR and dropped the Docker Hub mirror.

## 0.0.3 - 2026-06-10

- Hardened the plugin QuickJS sandbox against hangs: interrupt deadlines on plugin-source and timer execution, a host-side worker RPC timeout, and preserved VM stack traces in server logs.
- Made plugin `fetch` and plugin HTTP routes binary-safe end to end (byte-exact request/response bodies, including multipart uploads).
- Plugin settings saved in the admin UI (or via `settings.replace`) now propagate to the running plugin VM immediately, without a reload.
- Fixed plugin scheduler correctness: schedule cancellation, pause persistence across restarts, no firing for disabled plugins, and a sweep for orphaned schedules.
- Plugin-emitted hook events are now namespaced to `plugin.<id>.*`, so a plugin can no longer forge core or other plugins' events.
- Required a dedicated `editor.code` permission for unsandboxed admin-window plugin code, and the install review dialog now always shows.
- Secret plugin settings are masked on every client-facing payload and encrypted at rest in a dedicated `plugin_secrets` table using `INSTATIC_SECRET_KEY`.
- Added a force-uninstall escape hatch for plugins with failing lifecycle hooks, and run `deactivate` before `uninstall`.
- Decoupled the CSRF origin check from proxy trust: it now uses `PUBLIC_ORIGIN` (auto-detected from `RENDER_EXTERNAL_URL` / `RAILWAY_PUBLIC_DOMAIN` on managed platforms), and `TRUSTED_PROXY_CIDRS` is now used only for client-IP attribution. Removed blanket `0.0.0.0/0` proxy trust from the deploy templates.
- Refreshed deployment docs and one-click templates (`TRUSTED_PROXY_CIDRS`, `PUBLIC_ORIGIN`, `RAILWAY_RUN_UID`, template-generated `INSTATIC_SECRET_KEY`).
- Fixed the data-table step-up authentication flow and revamped the README.

## 0.0.2 - 2026-06-09

- Added public repository community files and contribution workflow docs.
- Tightened forwarded-origin handling so `X-Forwarded-Proto` and `X-Forwarded-Host` are trusted only from configured proxy peers.
- Added Render deployment blueprints and refreshed public deployment docs.
- Improved static site import fidelity, including imported runtime behavior and CSS cascade isolation.
- Added editable HTML attributes and path-derived Site Explorer organization.
- Hardened plugin media handling, public forms, AI credential storage, and MFA secret encryption.

## 0.0.1 - 2026-06-08

- First public preview release.
- Self-hosted Bun CMS server with SQLite and Postgres support.
- React admin UI with visual site editor, content/data/media workspaces, publishing pipeline, and plugin runtime.
- Docker image, Compose files, release bundle, and Railway/Render/VPS deployment docs.
