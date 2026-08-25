export type CreatorSignalContentWorkflowId =
  | 'create-edit-revise'
  | 'preview-publish-unpublish'
  | 'media'
  | 'patterns'
  | 'legal-pages'
  | 'product-pages'
  | 'themes'
  | 'catalogue-tasks'
  | 'guardrails'

export interface CreatorSignalContentWorkflow {
  id: CreatorSignalContentWorkflowId
  label: string
  acceptance: readonly string[]
  automatedEvidence: readonly string[]
}

/**
 * Source-owned acceptance contract for Creator Signal public authoring.
 *
 * This deliberately describes CMS workflows, not production activation. The
 * command below exercises the real Instatic repositories and publisher in an
 * isolated database; deployment and live-site acceptance remain separate.
 */
export const creatorSignalContentWorkflowAcceptance = Object.freeze({
  issue: 48,
  relatedIssues: [145],
  boundary: 'source-only' as const,
  command: 'bun run verify:creator-signal-content-workflows',
  workflows: [
    {
      id: 'create-edit-revise',
      label: 'Create, edit, and retain revisions',
      acceptance: [
        'Install the governed pack into an empty site.',
        'Edit typed component content without changing protected composition.',
        'Retain an immutable published version for every publish.',
      ],
      automatedEvidence: [
        'src/__tests__/plugins/creatorSignalContentWorkflows.test.ts',
      ],
    },
    {
      id: 'preview-publish-unpublish',
      label: 'Preview, publish, and unpublish',
      acceptance: [
        'Preview the current draft through the shared page publisher.',
        'Keep a later draft edit out of the active public snapshot until publish.',
        'Remove an unpublished route while retaining its revision history.',
      ],
      automatedEvidence: [
        'src/__tests__/plugins/creatorSignalContentWorkflows.test.ts',
      ],
    },
    {
      id: 'media',
      label: 'Select and publish governed media',
      acceptance: [
        'Resolve Creator Signal image fields through approved media roles and treatments.',
        'Publish selected artwork with accessible alternative text.',
        'Preserve Instatic image variants through repository and publisher mapping.',
      ],
      automatedEvidence: [
        'src/__tests__/plugins/creatorSignalContentWorkflows.test.ts',
        'src/__tests__/server/mediaAssetMapping.test.ts',
        'src/__tests__/server/mediaBatchResolution.test.ts',
      ],
    },
    {
      id: 'patterns',
      label: 'Insert reusable governed patterns',
      acceptance: [
        'Materialize every approved pattern from the Component Library registry.',
        'Retain catalogue identity and the authorable child boundary.',
      ],
      automatedEvidence: [
        'src/__tests__/plugins/creatorSignalContentWorkflows.test.ts',
        'src/__tests__/plugins/creatorSignalSitePack.test.ts',
      ],
    },
    {
      id: 'legal-pages',
      label: 'Author and publish legal pages',
      acceptance: [
        'Publish legal content through the legal/trust pattern and public-document component.',
        'Retain version, effective date, and operating-company copy in published output.',
      ],
      automatedEvidence: [
        'src/__tests__/plugins/creatorSignalContentWorkflows.test.ts',
        'src/__tests__/plugins/creatorSignalSitePack.test.ts',
      ],
    },
    {
      id: 'product-pages',
      label: 'Author and publish product pages',
      acceptance: [
        'Edit a product hero through typed Visual Component parameters.',
        'Preview and publish the edited product page with shared site chrome.',
      ],
      automatedEvidence: [
        'src/__tests__/plugins/creatorSignalContentWorkflows.test.ts',
      ],
    },
    {
      id: 'themes',
      label: 'Render system, light, and dark preferences',
      acceptance: [
        'Expose system, light, and dark choices from the locked render profile.',
        'Use the same first-render theme runtime and token stylesheet in preview and public output.',
      ],
      automatedEvidence: [
        'src/__tests__/plugins/creatorSignalContentWorkflows.test.ts',
        'src/__tests__/plugins/creatorSignalSitePack.test.ts',
      ],
    },
    {
      id: 'catalogue-tasks',
      label: 'Author every governed catalogue task',
      acceptance: [
        'Keep one generated task row for every Creator Signal component and pattern.',
        'Exercise discovery, insertion, typed configuration, preview, publish, revision, and removal through the editor and MCP contracts.',
        'Reject raw implementation fields and leaf content slots from the public authoring surface.',
      ],
      automatedEvidence: [
        'src/__tests__/plugins/creatorSignalCatalogueAuthoringTasks.test.ts',
        'scripts/verify-creator-signal-authoring-tasks.ts',
      ],
    },
    {
      id: 'guardrails',
      label: 'Enforce public authoring guardrails',
      acceptance: [
        'Reject arbitrary appearance, unsupported variants, raw structure, and damaged patterns.',
        'Protect shared template chrome and require accessible media semantics.',
      ],
      automatedEvidence: [
        'src/__tests__/plugins/creatorSignalPublicAuthoringGuardrails.test.ts',
      ],
    },
  ] satisfies readonly CreatorSignalContentWorkflow[],
})
