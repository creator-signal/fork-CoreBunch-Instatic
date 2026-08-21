# Creator Signal content workflow acceptance

This is the source-owned acceptance contract for Creator Signal public content
authoring in Instatic. It validates existing CMS mechanisms; it does not add a
second editor, change the editor shell, deploy the plugin, or prove production
activation.

Run the complete contract from the repository root:

```sh
bun run verify:creator-signal-content-workflows
bun run verify:creator-signal-authoring-tasks
```

The command uses isolated databases and the real pack, repositories, Component
Library registry, preview publisher, public publisher, media mapping, and
authoring policy. Its machine-readable workflow inventory is
`integrations/creator-signal/content-workflows.ts`.

## Workflow matrix

| Workflow | Instatic mechanism | Automated evidence | Acceptance |
| --- | --- | --- | --- |
| Create and edit | Empty-site pack install, page rows, typed component props, page write policy | `creatorSignalContentWorkflows.test.ts` | The pack creates governed pages; a typed product-Hero edit passes the write policy. |
| Revisions | `publishDraftSite` and immutable `data_row_versions` | `creatorSignalContentWorkflows.test.ts` | Two publishes retain versions 1 and 2. |
| Preview | Shared `publishPage` path with the everywhere template | `creatorSignalContentWorkflows.test.ts`, `creatorSignalSitePack.test.ts` | Draft copy and site chrome render before publication. |
| Publish | Site publisher, published snapshots, and public renderer | `creatorSignalContentWorkflows.test.ts` | Product and legal pages render from the active snapshot. |
| Unpublish | `updateDataRowStatus(..., 'unpublished')` | `creatorSignalContentWorkflows.test.ts` | The public route disappears while both historical versions remain. |
| Media | Governed image fields and roles, host media records, variants, batch resolution | `creatorSignalContentWorkflows.test.ts`, `mediaAssetMapping.test.ts`, `mediaBatchResolution.test.ts` | Selected artwork and alt text publish; `contain` and `cover` are the approved presentation treatments; stored variants retain repository/publisher parity. |
| Reusable components and patterns | Component Library entries and `componentLibraryPatternRegistry` | `creatorSignalContentWorkflows.test.ts`, `creatorSignalSitePack.test.ts` | Every approved pattern materializes with catalogue version, variant, and authorable child IDs intact. |
| Legal pages | Legal/trust pattern and typed public-document component | `creatorSignalContentWorkflows.test.ts`, `creatorSignalSitePack.test.ts` | The published privacy page retains the approved version, effective date, and operating-company copy. |
| Product pages | Product-page pattern and parameterised Hero Visual Component | `creatorSignalContentWorkflows.test.ts` | A typed Hero edit is isolated as draft, visible in preview, then visible after publish. |
| Themes | Locked render profile, token stylesheet, first-render bootstrap, and theme control | `creatorSignalContentWorkflows.test.ts`, `creatorSignalSitePack.test.ts` | System, light, and dark remain the only public preferences and use one preview/public render contract. |
| Catalogue tasks | Application-owned task matrix generated from all 33 Creator Signal Component Library entries | `creatorSignalCatalogueAuthoringTasks.test.ts`, `verify-creator-signal-authoring-tasks.ts` | Every entry has editor and MCP support for discovery, insertion, configuration, preview, publish, revision, and removal; the matrix rejects catalogue drift, raw implementation fields, and leaf slots. |
| Guardrails | Site-owned public-authoring policy at write and publish boundaries | `creatorSignalPublicAuthoringGuardrails.test.ts` | Arbitrary appearance, unsupported variants, raw structure, damaged patterns, unsafe media roles, and protected-template edits are rejected. |

## Media boundary

Creator Signal authors choose media through Instatic and supply accessible text
through the typed component fields. The integration permits the semantic
`contain` and `cover` treatments; it does not introduce a separate freeform
crop model. Instatic owns upload security, storage, responsive variant
generation, and public URL mapping. The workflow command exercises the media
mapping and batch-resolution boundaries alongside the Creator Signal field
contract.

## Publication boundary

Passing this command proves source readiness only. Plugin build/install,
deployment, live authentication, public DNS, production rendering, analytics,
and browser acceptance are separate operational stages and are intentionally
not claimed here.
