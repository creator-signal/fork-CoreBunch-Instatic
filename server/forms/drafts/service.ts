import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { nanoid } from 'nanoid'
import {
  FORM_DRAFT_SCHEMA_VERSION,
  type FormDraftWizardState,
  type PublishedFormSnapshot,
} from '@core/forms'
import type { AuthUser } from '../../repositories/users'
import type { DbClient } from '../../db/client'
import {
  createFormDraft,
  deleteFormDraft,
  getFormDraft,
  getLatestOwnedFormDraft,
  hashFormDraftRecoveryToken,
  updateFormDraft,
  type FormDraftRecord,
} from './repository'
import { getFormDraftPolicy } from './runtime'

interface DraftSchemaControl {
  fieldId: string
  name: string
  kind: string
  catalogueEntryId?: string
  catalogueEntryVersion?: string
}

interface DraftSchema {
  version: number
  controls: DraftSchemaControl[]
}

type DraftIdentity = {
  user: AuthUser | null
  draftId?: string
  recoveryToken?: string
}

type DraftFailure = {
  ok: false
  status: number
  code: string
  message: string
  revision?: number
}

type DraftPayload = {
  ok: true
  draft: {
    id: string
    revision: number
    values: Record<string, unknown>
    wizard: FormDraftWizardState
    expiresAt: string
    schemaStatus: 'current' | 'migrated'
    warnings: string[]
  }
  recoveryToken?: string
}

export type FormDraftResult = DraftFailure | DraftPayload

export async function loadFormDraft(
  db: DbClient,
  input: {
    identity: DraftIdentity
    snapshot: PublishedFormSnapshot
  },
): Promise<FormDraftResult> {
  const enabled = requirePersistentDrafts(input.snapshot)
  if (enabled) return enabled
  const nowIso = new Date().toISOString()
  const record = input.identity.draftId
    ? await getFormDraft(db, input.identity.draftId)
    : input.identity.user
      ? await getLatestOwnedFormDraft(db, {
          ownerUserId: input.identity.user.id,
          pageId: input.snapshot.pageId,
          formId: input.snapshot.formId,
          nowIso,
        })
      : null
  if (!record) return notFound()
  const owned = ownsDraft(record, input.identity)
  if (owned) return owned
  const scoped = draftMatchesScope(record, input.snapshot)
  if (scoped) return scoped
  if (record.expiresAt <= nowIso || record.deletedAt) {
    await deleteFormDraft(db, record.id)
    return {
      ok: false,
      status: 410,
      code: 'draft_expired',
      message: 'This saved draft has expired or was deleted.',
    }
  }
  if (record.schemaVersion > FORM_DRAFT_SCHEMA_VERSION) {
    return {
      ok: false,
      status: 409,
      code: 'draft_schema_newer',
      message: 'This draft was saved by a newer form version and cannot be recovered here.',
      revision: record.revision,
    }
  }
  const current = currentDraftSchema(input.snapshot)
  const migrated = migrateValues(record, current)
  return payload(record, migrated.values, migrated.status, migrated.warnings)
}

export async function saveFormDraft(
  db: DbClient,
  input: {
    identity: DraftIdentity
    snapshot: PublishedFormSnapshot
    revision?: number
    values: Record<string, unknown>
    wizard: FormDraftWizardState
  },
): Promise<FormDraftResult> {
  const enabled = requirePersistentDrafts(input.snapshot)
  if (enabled) return enabled
  const schema = currentDraftSchema(input.snapshot)
  const normalized = normalizeDraftValues(input.values, schema)
  if (!normalized.ok) return normalized
  const policy = getFormDraftPolicy()
  const encodedBytes = Buffer.byteLength(JSON.stringify({
    values: normalized.values,
    wizard: input.wizard,
  }))
  if (encodedBytes > policy.maxBytes) {
    return {
      ok: false,
      status: 413,
      code: 'draft_too_large',
      message: 'This draft is too large to save.',
    }
  }
  const now = new Date()
  const authoredTtl = input.snapshot.draftTtlDays ?? policy.ttlDays
  const ttlDays = Math.max(1, Math.min(authoredTtl, policy.ttlDays))
  const expiresAt = new Date(now.getTime() + ttlDays * 86_400_000).toISOString()
  const schemaHash = hashDraftSchema(schema)

  if (input.identity.draftId) {
    const current = await getFormDraft(db, input.identity.draftId)
    if (!current) return notFound()
    const owned = ownsDraft(current, input.identity)
    if (owned) return owned
    const scoped = draftMatchesScope(current, input.snapshot)
    if (scoped) return scoped
    if (input.revision === undefined || input.revision !== current.revision) {
      return conflict(current.revision)
    }
    const updated = await updateFormDraft(db, {
      id: current.id,
      expectedRevision: input.revision,
      values: normalized.values,
      wizard: input.wizard,
      schema,
      schemaHash,
      schemaVersion: FORM_DRAFT_SCHEMA_VERSION,
      updatedAt: now.toISOString(),
      expiresAt,
    })
    if (!updated) {
      const winner = await getFormDraft(db, current.id)
      return conflict(winner?.revision ?? current.revision + 1)
    }
    return payload(updated, normalized.values, 'current', normalized.warnings)
  }

  const recoveryToken = input.identity.user
    ? undefined
    : randomBytes(32).toString('base64url')
  const created = await createFormDraft(db, {
    id: nanoid(),
    pageId: input.snapshot.pageId,
    formId: input.snapshot.formId,
    targetTableId: input.snapshot.targetTableId,
    ownerUserId: input.identity.user?.id ?? null,
    recoveryTokenHash: recoveryToken
      ? hashFormDraftRecoveryToken(recoveryToken)
      : null,
    values: normalized.values,
    wizard: input.wizard,
    schema,
    schemaHash,
    schemaVersion: FORM_DRAFT_SCHEMA_VERSION,
    expiresAt,
  })
  return {
    ...payload(created, normalized.values, 'current', normalized.warnings),
    ...(recoveryToken ? { recoveryToken } : {}),
  }
}

export async function removeFormDraft(
  db: DbClient,
  input: {
    identity: DraftIdentity
    snapshot: PublishedFormSnapshot
    revision: number
  },
): Promise<FormDraftResult | { ok: true; deleted: true }> {
  const enabled = requirePersistentDrafts(input.snapshot)
  if (enabled) return enabled
  if (!input.identity.draftId) return notFound()
  const current = await getFormDraft(db, input.identity.draftId)
  if (!current) return notFound()
  const owned = ownsDraft(current, input.identity)
  if (owned) return owned
  const scoped = draftMatchesScope(current, input.snapshot)
  if (scoped) return scoped
  if (current.revision !== input.revision) return conflict(current.revision)
  const deleted = await deleteFormDraft(db, current.id, input.revision)
  if (!deleted) {
    const winner = await getFormDraft(db, current.id)
    return conflict(winner?.revision ?? current.revision + 1)
  }
  return { ok: true, deleted: true }
}

function requirePersistentDrafts(snapshot: PublishedFormSnapshot): DraftFailure | null {
  const policy = getFormDraftPolicy()
  if (!policy.enabled || snapshot.draftMode !== 'persistent') {
    return {
      ok: false,
      status: 503,
      code: 'drafts_unavailable',
      message: 'Persistent recovery is not available for this form.',
    }
  }
  return null
}

function ownsDraft(
  record: FormDraftRecord,
  identity: DraftIdentity,
): DraftFailure | null {
  if (record.ownerUserId) {
    return identity.user?.id === record.ownerUserId ? null : notFound()
  }
  if (
    identity.user
    || !identity.recoveryToken
    || !record.recoveryTokenHash
    || !tokenHashEqual(
      hashFormDraftRecoveryToken(identity.recoveryToken),
      record.recoveryTokenHash,
    )
  ) {
    return notFound()
  }
  return null
}

function draftMatchesScope(
  record: FormDraftRecord,
  snapshot: PublishedFormSnapshot,
): DraftFailure | null {
  return record.pageId === snapshot.pageId
    && record.formId === snapshot.formId
    && record.targetTableId === snapshot.targetTableId
    ? null
    : notFound()
}

function currentDraftSchema(snapshot: PublishedFormSnapshot): DraftSchema {
  return {
    version: FORM_DRAFT_SCHEMA_VERSION,
    controls: snapshot.controls
      .filter((control) =>
        control.inputType !== 'password'
        && control.inputType !== 'file'
        && control.inputType !== 'hidden'
        && control.draftBehavior !== 'exclude'
        && control.draftBehavior !== 'session-only')
      .map((control) => ({
        fieldId: control.fieldId,
        name: control.name ?? control.fieldId,
        kind: control.inputType ?? 'value',
        ...(control.catalogueEntryId
          ? { catalogueEntryId: control.catalogueEntryId }
          : {}),
        ...(control.catalogueEntryVersion
          ? { catalogueEntryVersion: control.catalogueEntryVersion }
          : {}),
      }))
      .sort((left, right) => left.fieldId.localeCompare(right.fieldId)),
  }
}

function normalizeDraftValues(
  input: Record<string, unknown>,
  schema: DraftSchema,
): { ok: true; values: Record<string, unknown>; warnings: string[] } | DraftFailure {
  const byInputKey = new Map<string, DraftSchemaControl>()
  for (const control of schema.controls) {
    byInputKey.set(control.fieldId, control)
    byInputKey.set(control.name, control)
  }
  const values: Record<string, unknown> = {}
  const warnings: string[] = []
  for (const [key, raw] of Object.entries(input)) {
    const control = byInputKey.get(key)
    if (!control) {
      warnings.push(`Skipped unavailable field "${key}".`)
      continue
    }
    const value = safeDraftValue(raw)
    if (!value.ok) {
      return {
        ok: false,
        status: 400,
        code: 'invalid_draft_value',
        message: `Field "${control.fieldId}" cannot be saved in a draft.`,
      }
    }
    values[control.fieldId] = value.value
  }
  return { ok: true, values, warnings }
}

function migrateValues(
  record: FormDraftRecord,
  current: DraftSchema,
): {
  values: Record<string, unknown>
  status: 'current' | 'migrated'
  warnings: string[]
} {
  if (record.schemaHash === hashDraftSchema(current)) {
    const normalized = normalizeDraftValues(record.values, current)
    return normalized.ok
      ? { values: normalized.values, status: 'current', warnings: normalized.warnings }
      : { values: {}, status: 'migrated', warnings: [normalized.message] }
  }
  const previous = parseDraftSchema(record.schema)
  if (!previous) {
    return {
      values: {},
      status: 'migrated',
      warnings: ['The previous form schema could not be read; field values were not restored.'],
    }
  }
  const previousById = new Map(previous.controls.map((control) => [control.fieldId, control]))
  const values: Record<string, unknown> = {}
  const warnings: string[] = []
  for (const control of current.controls) {
    const old = previousById.get(control.fieldId)
    if (!old || old.kind !== control.kind) {
      if (old) warnings.push(`Skipped changed field "${control.fieldId}".`)
      continue
    }
    if (Object.hasOwn(record.values, control.fieldId)) {
      const safe = safeDraftValue(record.values[control.fieldId])
      if (safe.ok) values[control.fieldId] = safe.value
    }
  }
  const currentIds = new Set(current.controls.map((control) => control.fieldId))
  for (const fieldId of Object.keys(record.values)) {
    if (!currentIds.has(fieldId)) warnings.push(`Skipped removed field "${fieldId}".`)
  }
  return { values, status: 'migrated', warnings }
}

function parseDraftSchema(value: unknown): DraftSchema | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const candidate = value as Partial<DraftSchema>
  if (!Number.isInteger(candidate.version) || !Array.isArray(candidate.controls)) return null
  const controls: DraftSchemaControl[] = []
  for (const raw of candidate.controls) {
    if (!raw || typeof raw !== 'object') return null
    const control = raw as Partial<DraftSchemaControl>
    if (
      typeof control.fieldId !== 'string'
      || typeof control.name !== 'string'
      || typeof control.kind !== 'string'
    ) return null
    controls.push({
      fieldId: control.fieldId,
      name: control.name,
      kind: control.kind,
      ...(typeof control.catalogueEntryId === 'string'
        ? { catalogueEntryId: control.catalogueEntryId }
        : {}),
      ...(typeof control.catalogueEntryVersion === 'string'
        ? { catalogueEntryVersion: control.catalogueEntryVersion }
        : {}),
    })
  }
  return { version: candidate.version!, controls }
}

function safeDraftValue(
  value: unknown,
): { ok: true; value: string | number | boolean | null | string[] } | { ok: false } {
  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'boolean'
    || (typeof value === 'number' && Number.isFinite(value))
  ) {
    return { ok: true, value }
  }
  if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
    return { ok: true, value: value.slice(0, 100) }
  }
  return { ok: false }
}

function hashDraftSchema(schema: DraftSchema): string {
  return createHash('sha256').update(JSON.stringify(schema)).digest('hex')
}

function tokenHashEqual(leftHex: string, rightHex: string): boolean {
  const left = Buffer.from(leftHex)
  const right = Buffer.from(rightHex)
  return left.length === right.length && timingSafeEqual(left, right)
}

function payload(
  record: FormDraftRecord,
  values: Record<string, unknown>,
  schemaStatus: 'current' | 'migrated',
  warnings: string[],
): DraftPayload {
  return {
    ok: true,
    draft: {
      id: record.id,
      revision: record.revision,
      values,
      wizard: normalizeWizard(record.wizard),
      expiresAt: record.expiresAt,
      schemaStatus,
      warnings,
    },
  }
}

function normalizeWizard(value: Record<string, unknown>): FormDraftWizardState {
  return {
    ...(typeof value.stepId === 'string' ? { stepId: value.stepId } : {}),
    visitedStepIds: Array.isArray(value.visitedStepIds)
      ? value.visitedStepIds.filter((entry): entry is string => typeof entry === 'string').slice(0, 100)
      : [],
    review: value.review === true,
  }
}

function notFound(): DraftFailure {
  return {
    ok: false,
    status: 404,
    code: 'draft_not_found',
    message: 'Saved draft not found.',
  }
}

function conflict(revision: number): DraftFailure {
  return {
    ok: false,
    status: 409,
    code: 'draft_conflict',
    message: 'A newer version of this draft exists. Reload it before saving again.',
    revision,
  }
}
