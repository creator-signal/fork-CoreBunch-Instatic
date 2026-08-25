import { createHash } from 'node:crypto'
import {
  componentLibraryPatternRegistry,
  type ComponentLibraryEntry,
  type ComponentLibraryImplementation,
} from '@core/component-library'
import { registry } from '@core/module-engine'
import {
  DEFAULT_SITE_SETTINGS,
  reindexNodeParents,
  type CatalogueInstanceMetadata,
  type Page,
  type PageNode,
  type SiteDocument,
} from '@core/page-tree'
import { publishPage } from '@core/publisher'
import {
  Type,
  safeParseValue,
  type Static,
} from '@core/utils/typeboxHelpers'
import '@modules/base'
import { BUILT_IN_COMPONENT_LIBRARY_ENTRIES } from '@modules/base/componentLibrary'
import {
  COMPONENT_LIBRARY_FORM_SPECIMEN_MANIFEST_REFERENCE,
  componentLibraryFormSpecimenReference,
} from '@modules/base/componentLibraryFormSpecimenReference'
import {
  buildSiteModuleJsMap,
  injectModuleScripts,
  resolvePublishedModuleJsAssets,
} from '../../server/publish/moduleJsBundle'
import { stableStringify } from './component-library-design-impact'

export const FORM_SPECIMEN_MANIFEST_SCHEMA_VERSION =
  'instatic.component-library-form-specimens/v1'

const PUBLIC_PREFIX = 'creator-signal.site.catalogue.'
const FORM_ENTRY_COUNT = 41

const FormSpecimenScenarioSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  label: Type.String({ minLength: 1 }),
  state: Type.String({ minLength: 1 }),
  subjectNodeIds: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
  variantId: Type.Optional(Type.String({ minLength: 1 })),
  fieldId: Type.Optional(Type.String({ minLength: 1 })),
  browserChecks: Type.Array(Type.String({ minLength: 1 })),
})

const FormSpecimenEntrySchema = Type.Object({
  entryId: Type.String({ minLength: 1 }),
  entryVersion: Type.String({ minLength: 1 }),
  name: Type.String({ minLength: 1 }),
  reference: Type.String({ minLength: 1 }),
  implementationTaxonomy: Type.String({ minLength: 1 }),
  backingReference: Type.String({ minLength: 1 }),
  providerBacked: Type.Boolean(),
  limitations: Type.Array(Type.String({ minLength: 1 })),
  scenarios: Type.Array(FormSpecimenScenarioSchema, { minItems: 1 }),
  documentHash: Type.String({ pattern: '^sha256:[a-f0-9]{64}$' }),
  contentHash: Type.String({ pattern: '^sha256:[a-f0-9]{64}$' }),
})

export const FormSpecimenManifestSchema = Type.Object({
  schemaVersion: Type.Literal(FORM_SPECIMEN_MANIFEST_SCHEMA_VERSION),
  generatedFrom: Type.Object({
    source: Type.Literal('executable-built-in-forms-registry'),
    registryContentHash: Type.String({ pattern: '^sha256:[a-f0-9]{64}$' }),
    designImpactManifest: Type.Literal(
      'docs/features/component-library-design-impact-manifest.json',
    ),
  }),
  summary: Type.Object({
    entryCount: Type.Number({ minimum: 0 }),
    scenarioCount: Type.Number({ minimum: 0 }),
    capabilityBackedCount: Type.Number({ minimum: 0 }),
    providerBackedCount: Type.Number({ minimum: 0 }),
  }),
  entries: Type.Array(FormSpecimenEntrySchema),
  checksum: Type.Object({
    algorithm: Type.Literal('sha256'),
    value: Type.String({ pattern: '^sha256:[a-f0-9]{64}$' }),
  }),
})

export type FormSpecimenManifest = Static<typeof FormSpecimenManifestSchema>
export type FormSpecimenEntry = Static<typeof FormSpecimenEntrySchema>
export type FormSpecimenScenario = Static<typeof FormSpecimenScenarioSchema>

export interface FormSpecimenBundle {
  manifest: FormSpecimenManifest
  documents: ReadonlyMap<string, string>
  moduleJs: ReadonlyMap<string, string>
}

interface BuiltSpecimen {
  scenarios: FormSpecimenScenario[]
  limitations: string[]
}

interface PrimitiveContext {
  entry: ComponentLibraryEntry
  builder: SpecimenPageBuilder
  moduleId: string
  presetValues: Record<string, unknown>
}

class SpecimenPageBuilder {
  readonly nodes: Record<string, PageNode> = {}
  private sequence = 0

  constructor(readonly entry: ComponentLibraryEntry) {}

  add(
    label: string,
    moduleId: string,
    props: Record<string, unknown> = {},
    children: string[] = [],
    catalogueInstance?: CatalogueInstanceMetadata,
  ): string {
    const id = this.allocate(label)
    const definition = registry.get(moduleId)
    if (!definition) {
      throw new Error(
        `[form-specimens] Module "${moduleId}" for "${this.entry.id}" is not registered.`,
      )
    }
    this.nodes[id] = {
      id,
      moduleId,
      props: { ...structuredClone(definition.defaults), ...structuredClone(props) },
      breakpointOverrides: {},
      children: [...children],
      classIds: [],
      ...(catalogueInstance ? { catalogueInstance } : {}),
    }
    return id
  }

  addPattern(
    entry: ComponentLibraryEntry,
    patternId: string,
    variantId?: string,
    rootPropOverrides: Record<string, unknown> = {},
  ): string {
    const fragment = componentLibraryPatternRegistry.materialize(
      patternId,
      metadataFor(entry, variantId),
      rootPropOverrides,
    )
    if (!fragment) {
      throw new Error(
        `[form-specimens] Pattern "${patternId}" for "${entry.id}" is not registered.`,
      )
    }
    const oldIds = orderedFragmentIds(fragment.nodes, fragment.rootIds)
    const idMap = new Map(oldIds.map((oldId) => [oldId, this.allocate('pattern')]))
    for (const oldId of oldIds) {
      const node = fragment.nodes[oldId]
      if (!node) continue
      const id = idMap.get(oldId)!
      const catalogueInstance = node.catalogueInstance
        ? remapPatternMetadata(node.catalogueInstance, idMap)
        : undefined
      this.nodes[id] = {
        ...structuredClone(node),
        id,
        children: node.children.map((childId) => idMap.get(childId)!),
        ...(catalogueInstance ? { catalogueInstance } : {}),
      }
    }
    const rootId = idMap.get(fragment.rootIds[0] ?? '')
    if (!rootId) {
      throw new Error(`[form-specimens] Pattern "${patternId}" has no root.`)
    }
    return rootId
  }

  append(parentId: string, ...childIds: string[]): void {
    const parent = this.nodes[parentId]
    if (!parent) throw new Error(`[form-specimens] Parent node "${parentId}" is missing.`)
    parent.children.push(...childIds)
  }

  makePage(contentIds: string[]): Page {
    const heading = this.add('heading', 'base.text', {
      text: this.entry.name,
      tag: 'h1',
    })
    const description = this.add('description', 'base.text', {
      text: this.entry.description,
      tag: 'p',
    })
    const shell = this.add('specimen-shell', 'base.container', {
      tag: 'main',
      htmlAttributes: {
        'data-instatic-form-specimen': this.entry.id,
        'data-instatic-form-specimen-version': this.entry.version,
      },
    }, [heading, description, ...contentIds])
    const body = this.add('body', 'base.body', {}, [shell])
    reindexNodeParents(this.nodes)
    return {
      id: `form-specimen-${localEntryId(this.entry)}`,
      slug: `component-library-form-specimens/${this.entry.id}`,
      title: `${this.entry.name} form specimen`,
      rootNodeId: body,
      nodes: this.nodes,
    }
  }

  private allocate(label: string): string {
    this.sequence += 1
    return `specimen-${localEntryId(this.entry)}-${slug(label)}-${String(this.sequence).padStart(3, '0')}`
  }
}

export function builtInFormEntries(): ComponentLibraryEntry[] {
  return BUILT_IN_COMPONENT_LIBRARY_ENTRIES
    .filter((entry) => entry.category === 'Forms')
    .sort((left, right) => left.id.localeCompare(right.id))
}

export function buildFormSpecimenBundle(): FormSpecimenBundle {
  const entries = builtInFormEntries()
  if (entries.length !== FORM_ENTRY_COUNT) {
    throw new Error(
      `[form-specimens] Expected ${FORM_ENTRY_COUNT} executable Forms entries, found ${entries.length}.`,
    )
  }
  const documents = new Map<string, string>()
  const pages: Page[] = []
  const built = entries.map((entry) => {
    const builder = new SpecimenPageBuilder(entry)
    const implementation = backingImplementation(entry.implementation)
    const specimen = implementation.type === 'primitive'
      ? buildPrimitiveSpecimen({
          entry,
          builder,
          moduleId: implementation.moduleId,
          presetValues: presetValuesFor(entry, implementation.presetId),
        })
      : implementation.type === 'pattern'
        ? buildPatternSpecimen(entry, builder, implementation.patternId)
        : implementation.type === 'visual-component'
          ? buildVisualComponentSpecimen(entry, builder, implementation.componentId)
          : unreachableTemplate(entry)
    const contentIds = topLevelContentIds(builder.nodes)
    const page = builder.makePage(contentIds)
    pages.push(page)
    return { entry, implementation, specimen, page }
  })

  const site = makeSpecimenSite(pages)
  const moduleJs = buildSiteModuleJsMap(site, registry)
  const manifestEntries = built.map(({ entry, implementation, specimen, page }) => {
    const published = publishPage(page, site, registry, { annotateNodeIds: true })
    const html = injectModuleScripts(
      published.html,
      resolvePublishedModuleJsAssets(published.jsModuleIds, moduleJs),
    )
    const reference = componentLibraryFormSpecimenReference(entry.id)
    if (entry.preview?.reference !== reference) {
      throw new Error(
        `[form-specimens] Entry "${entry.id}" does not own its generated preview reference.`,
      )
    }
    documents.set(reference, `${html.trimEnd()}\n`)
    const entryWithoutHash = {
      entryId: entry.id,
      entryVersion: entry.version,
      name: entry.name,
      reference,
      implementationTaxonomy: entry.implementation.type,
      backingReference: implementationReference(implementation),
      providerBacked: entry.requirements.providerAdapters.length > 0,
      limitations: specimen.limitations,
      scenarios: specimen.scenarios,
      documentHash: hashValue(html.trimEnd() + '\n'),
    }
    return {
      ...entryWithoutHash,
      contentHash: hashValue(entryWithoutHash),
    }
  })

  const manifestWithoutChecksum = {
    schemaVersion: FORM_SPECIMEN_MANIFEST_SCHEMA_VERSION,
    generatedFrom: {
      source: 'executable-built-in-forms-registry' as const,
      registryContentHash: hashValue(entries),
      designImpactManifest:
        'docs/features/component-library-design-impact-manifest.json' as const,
    },
    summary: {
      entryCount: manifestEntries.length,
      scenarioCount: manifestEntries.reduce(
        (count, entry) => count + entry.scenarios.length,
        0,
      ),
      capabilityBackedCount: entries.filter(
        (entry) => entry.implementation.type === 'capability-backed',
      ).length,
      providerBackedCount: entries.filter(
        (entry) => entry.requirements.providerAdapters.length > 0,
      ).length,
    },
    entries: manifestEntries,
  }
  const manifest = validateFormSpecimenManifest({
    ...manifestWithoutChecksum,
    checksum: {
      algorithm: 'sha256' as const,
      value: hashValue(manifestWithoutChecksum),
    },
  })
  return { manifest, documents, moduleJs }
}

export function validateFormSpecimenManifest(raw: unknown): FormSpecimenManifest {
  const parsed = safeParseValue(FormSpecimenManifestSchema, raw)
  if (!parsed.ok) {
    const detail = parsed.errors
      .map((error) => `${error.path || '/'}: ${error.message}`)
      .join('; ')
    throw new Error(`[form-specimens] Invalid manifest: ${detail}`)
  }
  const manifest = parsed.value
  const ids = new Set<string>()
  const references = new Set<string>()
  let previousId = ''
  for (const entry of manifest.entries) {
    if (ids.has(entry.entryId)) {
      throw new Error(`[form-specimens] Duplicate entry "${entry.entryId}".`)
    }
    if (references.has(entry.reference)) {
      throw new Error(`[form-specimens] Duplicate reference "${entry.reference}".`)
    }
    if (entry.entryId < previousId) {
      throw new Error('[form-specimens] Entries are not ordered by stable ID.')
    }
    ids.add(entry.entryId)
    references.add(entry.reference)
    previousId = entry.entryId
    const { contentHash, ...withoutHash } = entry
    if (contentHash !== hashValue(withoutHash)) {
      throw new Error(
        `[form-specimens] Entry "${entry.entryId}" content hash does not match.`,
      )
    }
    const scenarioIds = new Set<string>()
    for (const scenario of entry.scenarios) {
      if (scenarioIds.has(scenario.id)) {
        throw new Error(
          `[form-specimens] Entry "${entry.entryId}" repeats scenario "${scenario.id}".`,
        )
      }
      scenarioIds.add(scenario.id)
    }
  }
  const expectedSummary = {
    entryCount: manifest.entries.length,
    scenarioCount: manifest.entries.reduce(
      (count, entry) => count + entry.scenarios.length,
      0,
    ),
    capabilityBackedCount: manifest.entries.filter(
      (entry) => entry.implementationTaxonomy === 'capability-backed',
    ).length,
    providerBackedCount: manifest.entries.filter((entry) => entry.providerBacked).length,
  }
  if (stableStringify(manifest.summary) !== stableStringify(expectedSummary)) {
    throw new Error(
      `[form-specimens] Manifest summary does not match its entries: expected ${stableStringify(expectedSummary)}, received ${stableStringify(manifest.summary)}.`,
    )
  }
  const { checksum, ...withoutChecksum } = manifest
  if (checksum.value !== hashValue(withoutChecksum)) {
    throw new Error('[form-specimens] Manifest checksum does not match.')
  }
  return manifest
}

export function formSpecimenManifestReference(): string {
  return COMPONENT_LIBRARY_FORM_SPECIMEN_MANIFEST_REFERENCE
}

function buildPrimitiveSpecimen(context: PrimitiveContext): BuiltSpecimen {
  const id = localEntryId(context.entry)
  switch (id) {
    case 'form-container':
      return formContainerSpecimen(context)
    case 'form-field-group':
      return fieldGroupSpecimen(context)
    case 'form-actions':
      return formActionsSpecimen(context)
    case 'form-step':
      return formStepSpecimen(context)
    case 'save-draft':
    case 'delete-draft':
    case 'next-step':
    case 'previous-step':
      return draftActionSpecimen(context)
    case 'form-label':
      return labelSpecimen(context)
    case 'text-input':
    case 'email-input':
    case 'telephone-input':
    case 'url-input':
    case 'number-input':
    case 'date-input':
    case 'text-area':
      return textControlSpecimen(context)
    case 'hidden-field':
      return hiddenFieldSpecimen(context)
    case 'select':
      return selectSpecimen(context)
    case 'option':
    case 'option-group':
      return optionSpecimen(context)
    case 'checkbox':
    case 'switch':
    case 'radio':
      return choiceSpecimen(context)
    case 'submit':
    case 'reset-button':
      return submitSpecimen(context)
    case 'form-message':
    case 'form-help':
    case 'form-error':
      return messageSpecimen(context)
    case 'file-attachment':
      return fileAttachmentSpecimen(context)
    case 'captcha':
      return captchaSpecimen(context)
    case 'form-embed':
      return formEmbedSpecimen(context)
    default:
      throw new Error(
        `[form-specimens] No primitive composition exists for "${context.entry.id}".`,
      )
  }
}

function formContainerSpecimen(context: PrimitiveContext): BuiltSpecimen {
  const field = supportTextField(context.builder, 'contact-name')
  const actions = supportActions(context.builder)
  const status = supportStatus(context.builder)
  const target = context.builder.add(
    'subject-default',
    context.moduleId,
    {
      ...context.presetValues,
      formId: 'form-container-specimen',
      targetTableId: 'synthetic_form_specimens',
      minSubmitSeconds: 0,
      draftMode: 'session',
    },
    [field, actions, status],
    metadataFor(context.entry),
  )
  return specimen(
    [scenario('default-session-recovery', 'Default and session recovery', 'default', [target], ['form-runtime', 'session-draft-cleanup'])],
  )
}

function fieldGroupSpecimen(context: PrimitiveContext): BuiltSpecimen {
  const control = supportInput(context.builder, 'field-group-value')
  const label = supportLabel(context.builder, 'Field group value', 'field-group-value')
  const help = supportMessage(context.builder, 'help', 'field-group-value', 'Enter a synthetic value.')
  const error = supportMessage(context.builder, 'error', 'field-group-value', 'Check this value.')
  const target = context.builder.add(
    'subject-default',
    context.moduleId,
    context.presetValues,
    [label, control, help, error],
    metadataFor(context.entry, undefined, backingPresetId(context.entry)),
  )
  const form = cmsForm(context.builder, [target, supportActions(context.builder), supportStatus(context.builder)])
  return specimen([
    scenario('label-help-error', 'Label, help, error and control group', 'default', [target], ['form-control-relationships'], 'field-group-value'),
  ], [], [form])
}

function formActionsSpecimen(context: PrimitiveContext): BuiltSpecimen {
  const submit = supportSubmit(context.builder, 'Submit specimen')
  const reset = context.builder.add('reset', 'base.submit', {
    action: 'reset',
    label: 'Reset specimen',
  })
  const disabled = context.builder.add('disabled', 'base.submit', {
    action: 'submit',
    label: 'Submitting…',
    disabled: true,
  })
  const target = context.builder.add(
    'subject-default',
    context.moduleId,
    context.presetValues,
    [submit, reset, disabled],
    metadataFor(context.entry, undefined, backingPresetId(context.entry)),
  )
  const form = cmsForm(context.builder, [supportTextField(context.builder, 'action-value'), target, supportStatus(context.builder)])
  return specimen([
    scenario('default-disabled-pending', 'Default, reset and pending actions', 'pending', [target], ['keyboard-actions']),
  ], [], [form])
}

function formStepSpecimen(context: PrimitiveContext): BuiltSpecimen {
  const normal = context.builder.add(
    'subject-step',
    context.moduleId,
    { stepId: 'details', title: 'Your details', review: false },
    [supportTextField(context.builder, 'step-value'), supportActions(context.builder)],
    metadataFor(context.entry),
  )
  const review = context.builder.add(
    'subject-review',
    context.moduleId,
    { stepId: 'review', title: 'Review your answers', review: true },
    [context.builder.add('review-copy', 'base.text', { text: 'Synthetic review content.', tag: 'p' })],
    metadataFor(context.entry),
  )
  const form = cmsForm(context.builder, [normal, review, supportStatus(context.builder)], 'persistent')
  return specimen([
    scenario('step', 'Ordinary step', 'default', [normal], ['wizard-keyboard'], 'step-value'),
    scenario('review', 'Review step', 'review', [review], ['wizard-keyboard']),
  ], capabilityLimitations(context.entry), [form])
}

function draftActionSpecimen(context: PrimitiveContext): BuiltSpecimen {
  const presetId = backingPresetId(context.entry)
  const target = context.builder.add(
    'subject-default',
    context.moduleId,
    { ...context.presetValues, disabled: false },
    [],
    metadataFor(context.entry, undefined, presetId),
  )
  const disabled = context.builder.add(
    'subject-disabled',
    context.moduleId,
    { ...context.presetValues, disabled: true },
    [],
    metadataFor(context.entry, undefined, presetId),
  )
  const support = localEntryId(context.entry) === 'save-draft'
    ? context.builder.add('cleanup-delete', 'base.form-draft-action', {
        action: 'delete-draft',
        label: 'Delete saved draft',
      })
    : context.builder.add('setup-save', 'base.form-draft-action', {
        action: 'save-draft',
        label: 'Save draft for cleanup',
      })
  const step = context.builder.add('step', 'base.form-step', {
    stepId: 'details',
    title: 'Draft details',
  }, [supportTextField(context.builder, 'draft-value'), target, disabled, support])
  const form = cmsForm(context.builder, [step, supportStatus(context.builder)], 'persistent')
  return specimen([
    scenario('default', 'Enabled draft or step action', 'default', [target], ['draft-runtime', 'draft-cleanup'], 'draft-value'),
    scenario('disabled', 'Disabled action', 'disabled', [disabled], ['disabled-state']),
  ], capabilityLimitations(context.entry), [form])
}

function labelSpecimen(context: PrimitiveContext): BuiltSpecimen {
  const explicit = context.builder.add(
    'subject-explicit',
    context.moduleId,
    { ...context.presetValues, text: 'Email address', targetMode: 'explicit', targetId: 'label-email' },
    [],
    metadataFor(context.entry),
  )
  const control = supportInput(context.builder, 'label-email', { inputType: 'email' })
  const automatic = context.builder.add(
    'subject-auto',
    context.moduleId,
    { ...context.presetValues, text: 'Telephone', targetMode: 'auto', targetId: '' },
    [],
    metadataFor(context.entry),
  )
  const autoControl = supportInput(context.builder, 'label-telephone', { inputType: 'tel' })
  const form = cmsForm(context.builder, [explicit, control, automatic, autoControl, supportActions(context.builder), supportStatus(context.builder)])
  return specimen([
    scenario('explicit', 'Explicit label target', 'default', [explicit], ['form-control-relationships'], 'label-email'),
    scenario('automatic', 'Automatic next-control target', 'default', [automatic], ['form-control-relationships'], 'label-telephone'),
  ], [], [form])
}

function textControlSpecimen(context: PrimitiveContext): BuiltSpecimen {
  const inputType = String(context.presetValues.inputType ?? '')
  const isTextarea = context.moduleId === 'base.textarea'
  const requiredField = `${localEntryId(context.entry)}-required`
  const required = addTargetControlGroup(context, 'subject-required', requiredField, {
    ...context.presetValues,
    fieldId: requiredField,
    name: requiredField,
    id: requiredField,
    required: true,
    placeholder: 'Required synthetic value',
    value: inputValue(inputType),
    ...(isTextarea ? { rows: 4 } : {}),
  }, 'Required value')
  const disabledField = `${localEntryId(context.entry)}-disabled`
  const disabled = addTargetControlGroup(context, 'subject-disabled', disabledField, {
    ...context.presetValues,
    fieldId: disabledField,
    name: disabledField,
    id: disabledField,
    disabled: true,
    value: 'Disabled synthetic value',
  }, 'Disabled value')
  const readOnlyField = `${localEntryId(context.entry)}-readonly`
  const readOnly = addTargetControlGroup(context, 'subject-readonly', readOnlyField, {
    ...context.presetValues,
    fieldId: readOnlyField,
    name: readOnlyField,
    id: readOnlyField,
    readOnly: true,
    value: 'Read-only synthetic value',
  }, 'Read-only value')
  const form = cmsForm(context.builder, [required.group, disabled.group, readOnly.group, supportActions(context.builder), supportStatus(context.builder)])
  return specimen([
    scenario('required', 'Required control', 'required', [required.subject], ['form-control-relationships', 'invalid-focus'], requiredField),
    scenario('disabled', 'Disabled control', 'disabled', [disabled.subject], ['disabled-state'], disabledField),
    scenario('read-only', 'Read-only control', 'read-only', [readOnly.subject], ['read-only-state'], readOnlyField),
  ], [], [form])
}

function hiddenFieldSpecimen(context: PrimitiveContext): BuiltSpecimen {
  const target = context.builder.add(
    'subject-hidden',
    context.moduleId,
    {
      ...context.presetValues,
      fieldId: 'source-context',
      name: 'source-context',
      value: 'synthetic-specimen',
    },
    [],
    metadataFor(context.entry, undefined, backingPresetId(context.entry)),
  )
  const explanation = context.builder.add('hidden-explanation', 'base.text', {
    text: 'Hidden value: synthetic-specimen',
    tag: 'p',
  })
  const form = cmsForm(context.builder, [explanation, target, supportActions(context.builder), supportStatus(context.builder)])
  return specimen([
    scenario('hidden', 'Fixed synthetic metadata', 'hidden', [target], ['hidden-field-contract'], 'source-context'),
  ], ['Hidden controls intentionally have no focusable or visual provider UI.'], [form])
}

function selectSpecimen(context: PrimitiveContext): BuiltSpecimen {
  const fieldId = 'select-required'
  const optionA = supportOption(context.builder, 'Standard', 'standard', true)
  const optionB = supportOption(context.builder, 'Priority', 'priority')
  const target = context.builder.add(
    'subject-required',
    context.moduleId,
    { ...context.presetValues, fieldId, name: fieldId, id: fieldId, required: true },
    [optionA, optionB],
    metadataFor(context.entry),
  )
  const label = supportLabel(context.builder, 'Service level', fieldId)
  const error = supportMessage(context.builder, 'error', fieldId, 'Choose a service level.')
  const group = supportGroup(context.builder, [label, target, error])
  const disabledId = 'select-disabled'
  const disabled = context.builder.add(
    'subject-disabled',
    context.moduleId,
    { ...context.presetValues, fieldId: disabledId, name: disabledId, id: disabledId, disabled: true },
    [supportOption(context.builder, 'Unavailable', 'unavailable')],
    metadataFor(context.entry),
  )
  const form = cmsForm(context.builder, [group, supportGroup(context.builder, [supportLabel(context.builder, 'Disabled select', disabledId), disabled]), supportActions(context.builder), supportStatus(context.builder)])
  return specimen([
    scenario('required', 'Required select', 'required', [target], ['form-control-relationships', 'invalid-focus'], fieldId),
    scenario('disabled', 'Disabled select', 'disabled', [disabled], ['disabled-state'], disabledId),
  ], [], [form])
}

function optionSpecimen(context: PrimitiveContext): BuiltSpecimen {
  const isGroup = localEntryId(context.entry) === 'option-group'
  const target = context.builder.add(
    'subject-default',
    context.moduleId,
    isGroup
      ? { ...context.presetValues, label: 'Publishing status', disabled: false }
      : { ...context.presetValues, label: 'Published', value: 'published', selected: true, disabled: false },
    isGroup
      ? [supportOption(context.builder, 'Draft', 'draft'), supportOption(context.builder, 'Published', 'published', true)]
      : [],
    metadataFor(context.entry),
  )
  const disabled = context.builder.add(
    'subject-disabled',
    context.moduleId,
    isGroup
      ? { ...context.presetValues, label: 'Archived choices', disabled: true }
      : { ...context.presetValues, label: 'Archived', value: 'archived', disabled: true },
    isGroup ? [supportOption(context.builder, 'Archived', 'archived')] : [],
    metadataFor(context.entry),
  )
  const select = context.builder.add('select-parent', 'base.select', {
    fieldId: 'status', name: 'status', id: 'status', required: true,
  }, isGroup
    ? [target, disabled]
    : [supportOption(context.builder, 'Draft', 'draft'), target, disabled])
  const form = cmsForm(context.builder, [supportGroup(context.builder, [supportLabel(context.builder, 'Status', 'status'), select]), supportActions(context.builder), supportStatus(context.builder)])
  return specimen([
    scenario('default', 'Selected or grouped option', 'default', [target], ['option-contract'], 'status'),
    scenario('disabled', 'Disabled option state', 'disabled', [disabled], ['disabled-state'], 'status'),
  ], [], [form])
}

function choiceSpecimen(context: PrimitiveContext): BuiltSpecimen {
  const fieldId = `${localEntryId(context.entry)}-choice`
  const target = context.builder.add(
    'subject-required',
    context.moduleId,
    {
      ...context.presetValues,
      fieldId,
      name: fieldId,
      id: fieldId,
      value: 'accepted',
      required: true,
      checked: true,
    },
    [],
    metadataFor(context.entry, undefined, backingPresetId(context.entry)),
  )
  const disabledField = `${fieldId}-disabled`
  const disabled = context.builder.add(
    'subject-disabled',
    context.moduleId,
    {
      ...context.presetValues,
      fieldId: disabledField,
      name: disabledField,
      id: disabledField,
      value: 'disabled',
      disabled: true,
    },
    [],
    metadataFor(context.entry, undefined, backingPresetId(context.entry)),
  )
  const form = cmsForm(context.builder, [
    supportGroup(context.builder, [supportLabel(context.builder, context.entry.name, fieldId), target]),
    supportGroup(context.builder, [supportLabel(context.builder, `Disabled ${context.entry.name}`, disabledField), disabled]),
    supportMessage(context.builder, 'error', fieldId, 'Choose this option.'),
    supportActions(context.builder),
    supportStatus(context.builder),
  ])
  return specimen([
    scenario('required-checked', 'Required checked state', 'required', [target], ['form-control-relationships', 'keyboard-choice'], fieldId),
    scenario('disabled', 'Disabled state', 'disabled', [disabled], ['disabled-state'], disabledField),
  ], [], [form])
}

function submitSpecimen(context: PrimitiveContext): BuiltSpecimen {
  const target = context.builder.add(
    'subject-default',
    context.moduleId,
    { ...context.presetValues, label: context.entry.name, disabled: false },
    [],
    metadataFor(context.entry, undefined, backingPresetId(context.entry)),
  )
  const disabled = context.builder.add(
    'subject-disabled',
    context.moduleId,
    { ...context.presetValues, label: `${context.entry.name} unavailable`, disabled: true },
    [],
    metadataFor(context.entry, undefined, backingPresetId(context.entry)),
  )
  const form = cmsForm(context.builder, [supportTextField(context.builder, 'submit-value'), target, disabled, supportStatus(context.builder)])
  return specimen([
    scenario('default', 'Enabled action', 'default', [target], ['keyboard-actions']),
    scenario('disabled', 'Disabled action', 'disabled', [disabled], ['disabled-state']),
  ], [], [form])
}

function messageSpecimen(context: PrimitiveContext): BuiltSpecimen {
  const localId = localEntryId(context.entry)
  const kind = localId === 'form-help' ? 'help' : localId === 'form-error' ? 'error' : 'status'
  const fieldId = kind === 'status' ? undefined : 'message-value'
  const texts: Array<{ kind: string; text: string; state: string }> = kind === 'status'
    ? [
        { kind: 'status', text: 'Sending synthetic submission…', state: 'pending' },
        { kind: 'success', text: 'Synthetic submission received.', state: 'success' },
        { kind: 'error', text: 'Synthetic submission needs attention.', state: 'error' },
      ]
    : [{
        kind,
        text: kind === 'help' ? 'Use a synthetic work address.' : 'Enter a valid synthetic value.',
        state: kind,
      }]
  const targets = texts.map((item) => context.builder.add(
    `subject-${item.state}`,
    context.moduleId,
    { ...context.presetValues, kind: item.kind, text: item.text, fieldId: fieldId ?? '' },
    [],
    metadataFor(context.entry, undefined, backingPresetId(context.entry)),
  ))
  const field = fieldId
    ? supportGroup(context.builder, [supportLabel(context.builder, 'Message value', fieldId), supportInput(context.builder, fieldId), ...targets])
    : context.builder.add('message-stack', 'base.container', {}, targets)
  const form = cmsForm(context.builder, [field, supportActions(context.builder), ...(fieldId ? [supportStatus(context.builder)] : [])])
  return specimen(texts.map((item, index) =>
    scenario(item.state, `${context.entry.name}: ${item.state}`, item.state, [targets[index]!], ['status-announcement'], fieldId)
  ), [], [form])
}

function fileAttachmentSpecimen(context: PrimitiveContext): BuiltSpecimen {
  const fieldId = 'synthetic-attachment'
  const target = context.builder.add(
    'subject-required',
    context.moduleId,
    {
      ...context.presetValues,
      fieldId,
      name: fieldId,
      id: fieldId,
      required: true,
      accept: '.pdf',
      attachmentMaxFiles: 1,
      attachmentMaxBytes: 1024 * 1024,
    },
    [],
    metadataFor(context.entry, undefined, backingPresetId(context.entry)),
  )
  const group = supportGroup(context.builder, [
    supportLabel(context.builder, 'Synthetic PDF attachment', fieldId),
    target,
    supportMessage(context.builder, 'help', fieldId, 'PDF only. The local verifier scans and removes it.'),
    supportMessage(context.builder, 'error', fieldId, 'Choose a clean PDF file.'),
  ])
  const form = cmsForm(context.builder, [group, supportActions(context.builder), supportStatus(context.builder)])
  return specimen([
    scenario('required-local-scan', 'Required private attachment with retry', 'required', [target], ['attachment-local-scan', 'attachment-retry', 'attachment-cleanup'], fieldId),
  ], capabilityLimitations(context.entry), [form])
}

function captchaSpecimen(context: PrimitiveContext): BuiltSpecimen {
  const target = context.builder.add(
    'subject-unavailable',
    context.moduleId,
    context.presetValues,
    [],
    metadataFor(context.entry, undefined, backingPresetId(context.entry)),
  )
  const form = cmsForm(context.builder, [target, supportActions(context.builder), supportStatus(context.builder)])
  return specimen([
    scenario('provider-unavailable', 'Provider disabled fallback', 'unavailable', [target], ['provider-fallback']),
  ], capabilityLimitations(context.entry), [form])
}

function formEmbedSpecimen(context: PrimitiveContext): BuiltSpecimen {
  const variants = context.entry.variants.length > 0
    ? context.entry.variants
    : [{ id: 'responsive', name: 'Responsive', values: {} }]
  const scenarios = variants.map((variant) => {
    const target = context.builder.add(
      `subject-${variant.id}`,
      context.moduleId,
      { ...context.presetValues, ...variant.values },
      [],
      metadataFor(context.entry, variant.id, backingPresetId(context.entry)),
    )
    return scenario(
      variant.id,
      variant.name,
      'unavailable',
      [target],
      ['provider-fallback', 'no-external-request'],
      undefined,
      variant.id,
    )
  })
  return specimen(scenarios, capabilityLimitations(context.entry), topLevelContentIds(context.builder.nodes))
}

function buildPatternSpecimen(
  entry: ComponentLibraryEntry,
  builder: SpecimenPageBuilder,
  patternId: string,
): BuiltSpecimen {
  const variants = entry.variants.length > 0
    ? entry.variants
    : [{ id: 'default', name: 'Default', values: {} }]
  const subjectIds: string[] = []
  const scenarios: FormSpecimenScenario[] = []
  for (const variant of variants) {
    const variantId = variant.id === 'default' ? undefined : variant.id
    const root = builder.addPattern(entry, patternId, variantId, variant.values)
    subjectIds.push(root)
    addPatternSyntheticField(builder, root, `${localEntryId(entry)}-${variant.id}`)
    scenarios.push(scenario(
      variant.id,
      variant.name,
      entry.requirements.capabilities.length > 0 ? 'sandbox' : 'default',
      [root],
      patternBrowserChecks(entry),
      undefined,
      variantId,
    ))
  }
  const rootModuleIds = subjectIds.map((id) => builder.nodes[id]?.moduleId)
  const content = rootModuleIds.every((moduleId) => moduleId === 'base.form')
    ? subjectIds
    : [cmsForm(builder, wrapPatternSubjects(entry, builder, subjectIds),
        entry.requirements.capabilities.includes('forms.drafts') ? 'persistent' : 'none')]
  return specimen(scenarios, capabilityLimitations(entry), content)
}

function buildVisualComponentSpecimen(
  entry: ComponentLibraryEntry,
  builder: SpecimenPageBuilder,
  componentId: string,
): BuiltSpecimen {
  const field = supportTextField(builder, 'fragment-email', { inputType: 'email' })
  const slot = builder.add('fragment-slot', 'base.slot-instance', { slotName: 'fields' }, [field])
  const target = builder.add(
    'subject-default',
    'base.visual-component-ref',
    {
      componentId,
      propOverrides: {
        label: 'Reusable contact fields',
        bindingPrefix: 'shipping',
      },
    },
    [slot],
    metadataFor(entry),
  )
  const form = cmsForm(builder, [target, supportActions(builder), supportStatus(builder)])
  return specimen([
    scenario('binding-prefix', 'Reusable fields with a stable binding prefix', 'default', [target], ['reusable-binding-prefix', 'form-control-relationships'], 'shipping-fragment-email'),
  ], [], [form])
}

function addTargetControlGroup(
  context: PrimitiveContext,
  label: string,
  fieldId: string,
  props: Record<string, unknown>,
  accessibleLabel: string,
): { group: string; subject: string } {
  const subject = context.builder.add(
    label,
    context.moduleId,
    props,
    [],
    metadataFor(context.entry, undefined, backingPresetId(context.entry)),
  )
  const group = supportGroup(context.builder, [
    supportLabel(context.builder, accessibleLabel, fieldId),
    subject,
    supportMessage(context.builder, 'help', fieldId, 'Synthetic specimen guidance.'),
    supportMessage(context.builder, 'error', fieldId, 'Check this synthetic value.'),
  ])
  return { group, subject }
}

function addPatternSyntheticField(
  builder: SpecimenPageBuilder,
  rootId: string,
  fieldId: string,
): void {
  const emptyContainer = descendantIds(builder.nodes, rootId).find((id) => {
    const node = builder.nodes[id]
    return node?.moduleId === 'base.container' && node.children.length === 0
  })
  if (!emptyContainer) return
  builder.append(emptyContainer, supportTextField(builder, fieldId))
}

function wrapPatternSubjects(
  entry: ComponentLibraryEntry,
  builder: SpecimenPageBuilder,
  subjectIds: string[],
): string[] {
  const subjects = localEntryId(entry) === 'previous-next-actions'
    ? subjectIds.map((subjectId, index) => builder.add(
        `support-step-${index + 1}`,
        'base.form-step',
        {
          stepId: `step-${index + 1}`,
          title: `Synthetic step ${index + 1}`,
        },
        [subjectId],
      ))
    : subjectIds
  return subjects.concat([supportActions(builder), supportStatus(builder)])
}

function cmsForm(
  builder: SpecimenPageBuilder,
  children: string[],
  draftMode: 'none' | 'session' | 'persistent' = 'none',
): string {
  return builder.add('support-form', 'base.form', {
    mode: 'cms',
    formId: `specimen-${localEntryId(builder.entry)}-${draftMode}`,
    targetTableId: 'synthetic_form_specimens',
    successBehavior: 'message',
    successMessage: 'Synthetic submission received.',
    minSubmitSeconds: 0,
    draftMode,
    draftTtlDays: 1,
  }, children)
}

function supportTextField(
  builder: SpecimenPageBuilder,
  fieldId: string,
  inputProps: Record<string, unknown> = {},
): string {
  return supportGroup(builder, [
    supportLabel(builder, humanize(fieldId), fieldId),
    supportInput(builder, fieldId, inputProps),
    supportMessage(builder, 'help', fieldId, 'Synthetic data only.'),
    supportMessage(builder, 'error', fieldId, 'Check this value.'),
  ])
}

function supportGroup(builder: SpecimenPageBuilder, children: string[]): string {
  return builder.add('support-field-group', 'base.container', { tag: 'div' }, children)
}

function supportLabel(
  builder: SpecimenPageBuilder,
  text: string,
  fieldId: string,
): string {
  return builder.add('support-label', 'base.label', {
    text,
    targetMode: 'explicit',
    targetId: fieldId,
  })
}

function supportInput(
  builder: SpecimenPageBuilder,
  fieldId: string,
  props: Record<string, unknown> = {},
): string {
  return builder.add('support-input', 'base.input', {
    inputType: 'text',
    fieldId,
    name: fieldId,
    id: fieldId,
    required: true,
    ...props,
  })
}

function supportOption(
  builder: SpecimenPageBuilder,
  label: string,
  value: string,
  selected = false,
): string {
  return builder.add('support-option', 'base.option', { label, value, selected })
}

function supportSubmit(builder: SpecimenPageBuilder, label = 'Submit synthetic form'): string {
  return builder.add('support-submit', 'base.submit', { action: 'submit', label })
}

function supportActions(builder: SpecimenPageBuilder): string {
  return builder.add('support-actions', 'base.container', { tag: 'div' }, [
    supportSubmit(builder),
  ])
}

function supportStatus(builder: SpecimenPageBuilder): string {
  return supportMessage(builder, 'status', '', '')
}

function supportMessage(
  builder: SpecimenPageBuilder,
  kind: 'help' | 'status' | 'success' | 'error',
  fieldId: string,
  text: string,
): string {
  return builder.add(`support-${kind}`, 'base.form-message', { kind, fieldId, text })
}

function scenario(
  id: string,
  label: string,
  state: string,
  subjectNodeIds: string[],
  browserChecks: string[],
  fieldId?: string,
  variantId?: string,
): FormSpecimenScenario {
  return {
    id,
    label,
    state,
    subjectNodeIds,
    ...(variantId ? { variantId } : {}),
    ...(fieldId ? { fieldId } : {}),
    browserChecks,
  }
}

function specimen(
  scenarios: FormSpecimenScenario[],
  limitations: string[] = [],
  _contentIds: string[] = [],
): BuiltSpecimen {
  return { scenarios, limitations }
}

function metadataFor(
  entry: ComponentLibraryEntry,
  variantId?: string,
  presetId?: string,
): CatalogueInstanceMetadata {
  const capabilityId = entry.requirements.capabilities[0]
  const providerAdapterId = entry.requirements.providerAdapters[0]
  return {
    entryId: entry.id,
    entryVersion: entry.version,
    ...(presetId ? { presetId } : {}),
    ...(variantId ? { variantId } : {}),
    ...(entry.implementation.type === 'capability-backed'
      ? {
          ...(capabilityId ? { capabilityId } : {}),
          ...(providerAdapterId ? { providerAdapterId } : {}),
        }
      : {}),
  }
}

function presetValuesFor(
  entry: ComponentLibraryEntry,
  presetId: string | undefined,
): Record<string, unknown> {
  if (!presetId) return {}
  const preset = entry.presets.find((candidate) => candidate.id === presetId)
  if (!preset) {
    throw new Error(
      `[form-specimens] Entry "${entry.id}" does not declare preset "${presetId}".`,
    )
  }
  return structuredClone(preset.values)
}

function backingPresetId(entry: ComponentLibraryEntry): string | undefined {
  const implementation = backingImplementation(entry.implementation)
  return implementation.type === 'primitive' ? implementation.presetId : undefined
}

function backingImplementation(
  implementation: ComponentLibraryImplementation,
): Exclude<ComponentLibraryImplementation, { type: 'capability-backed' }> {
  return implementation.type === 'capability-backed'
    ? implementation.backing
    : implementation
}

function implementationReference(
  implementation: Exclude<ComponentLibraryImplementation, { type: 'capability-backed' }>,
): string {
  switch (implementation.type) {
    case 'primitive': return implementation.moduleId
    case 'pattern': return implementation.patternId
    case 'visual-component': return implementation.componentId
    case 'template-component': return implementation.role
  }
}

function capabilityLimitations(entry: ComponentLibraryEntry): string[] {
  const limitations = entry.requirements.capabilities.map(
    (capability) => `The local specimen uses a synthetic sandbox for capability "${capability}".`,
  )
  limitations.push(...entry.requirements.providerAdapters.map(
    (provider) => `The provider adapter "${provider}" remains disabled; only its real fallback is rendered.`,
  ))
  return limitations
}

function patternBrowserChecks(entry: ComponentLibraryEntry): string[] {
  const id = localEntryId(entry)
  if (id === 'form-tabs') return ['tabs-keyboard', 'invalid-focus']
  if (id === 'form-accordion') return ['accordion-keyboard', 'invalid-focus']
  if (id === 'wizard' || id === 'previous-next-actions' || id === 'form-summary-review') {
    return ['wizard-keyboard', 'draft-cleanup']
  }
  if (id === 'checkbox-group' || id === 'radio-group') {
    return ['fieldset-legend', 'keyboard-choice']
  }
  if (id === 'terms-and-conditions') return ['versioned-consent', 'keyboard-choice']
  return ['semantic-pattern']
}

function makeSpecimenSite(pages: Page[]): SiteDocument {
  return {
    id: 'component-library-form-specimens',
    name: 'Component Library form specimens',
    pages,
    files: [],
    visualComponents: [],
    packageJson: { dependencies: {}, devDependencies: {} },
    runtime: {
      dependencyLock: { version: 1, packages: {}, updatedAt: 0 },
      scripts: {},
    },
    breakpoints: [
      { id: 'mobile', label: 'Mobile', width: 390, icon: 'smartphone' },
      { id: 'tablet', label: 'Tablet', width: 900, icon: 'tablet' },
      { id: 'desktop', label: 'Desktop', width: 1440, icon: 'monitor' },
    ],
    settings: structuredClone(DEFAULT_SITE_SETTINGS),
    styleRules: {},
    createdAt: 0,
    updatedAt: 0,
  }
}

function topLevelContentIds(nodes: Record<string, PageNode>): string[] {
  const childIds = new Set(Object.values(nodes).flatMap((node) => node.children))
  return Object.keys(nodes).filter((id) => !childIds.has(id))
}

function orderedFragmentIds(
  nodes: Record<string, PageNode>,
  rootIds: readonly string[],
): string[] {
  const ordered: string[] = []
  const seen = new Set<string>()
  const visit = (id: string) => {
    if (seen.has(id)) return
    seen.add(id)
    ordered.push(id)
    for (const childId of nodes[id]?.children ?? []) visit(childId)
  }
  for (const rootId of rootIds) visit(rootId)
  for (const id of Object.keys(nodes).sort()) visit(id)
  return ordered
}

function remapPatternMetadata(
  metadata: CatalogueInstanceMetadata,
  idMap: ReadonlyMap<string, string>,
): CatalogueInstanceMetadata {
  return metadata.pattern
    ? {
        ...structuredClone(metadata),
        pattern: {
          authorableNodeIds: metadata.pattern.authorableNodeIds.map(
            (id) => idMap.get(id) ?? id,
          ),
        },
      }
    : structuredClone(metadata)
}

function descendantIds(
  nodes: Record<string, PageNode>,
  rootId: string,
): string[] {
  const result: string[] = []
  const visit = (id: string) => {
    result.push(id)
    for (const childId of nodes[id]?.children ?? []) visit(childId)
  }
  visit(rootId)
  return result
}

function localEntryId(entry: ComponentLibraryEntry): string {
  if (!entry.id.startsWith(PUBLIC_PREFIX)) {
    throw new Error(`[form-specimens] Entry "${entry.id}" is outside the mapped catalogue.`)
  }
  return entry.id.slice(PUBLIC_PREFIX.length)
}

function inputValue(inputType: string): string {
  switch (inputType) {
    case 'email': return 'synthetic@example.test'
    case 'url': return 'https://example.test/specimen'
    case 'number': return '7'
    case 'date': return '2026-08-24'
    case 'tel': return '+61 400 000 000'
    default: return 'Synthetic specimen value'
  }
}

function humanize(value: string): string {
  return value
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'node'
}

function hashValue(value: unknown): string {
  const serialized = typeof value === 'string' ? value : stableStringify(value)
  return `sha256:${createHash('sha256').update(serialized).digest('hex')}`
}

function unreachableTemplate(entry: ComponentLibraryEntry): never {
  throw new Error(
    `[form-specimens] Form entry "${entry.id}" cannot use a template-role implementation.`,
  )
}
