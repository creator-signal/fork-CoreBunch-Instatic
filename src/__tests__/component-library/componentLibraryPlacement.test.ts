import { describe, expect, it } from 'bun:test'
import {
  componentLibraryRegistry,
  resolveComponentLibraryPlacement,
  type ComponentLibraryEntry,
} from '@core/component-library'
import { creatorSignalCatalogueEntryId } from '@core/page-tree'
import '@modules/base/index'

const publicId = creatorSignalCatalogueEntryId

describe('Component Library placement policy', () => {
  it('keeps shared chrome in template documents', () => {
    const text = componentLibraryRegistry.getOrThrow(publicId('base.plain-text'))
    const sharedChrome: ComponentLibraryEntry = {
      ...text,
      id: 'test.shared-header',
      name: 'Shared header',
      constraints: { allowedDocumentKinds: ['template'] },
    }

    expect(resolveComponentLibraryPlacement(sharedChrome, {
      documentKind: 'page',
      parentIsPageRoot: true,
      existingChildCount: 0,
    })).toMatchObject({
      allowed: false,
      code: 'document-rejects-entry',
    })
    expect(resolveComponentLibraryPlacement(sharedChrome, {
      documentKind: 'template',
      parentIsPageRoot: true,
      existingChildCount: 0,
    })).toEqual({ allowed: true })
  })

  it('enforces per-document component cardinality', () => {
    const hero: ComponentLibraryEntry = {
      ...componentLibraryRegistry.getOrThrow(publicId('base.hero')),
      constraints: {
        allowedDocumentKinds: ['page'],
        maxInstancesPerDocument: 1,
      },
    }

    expect(resolveComponentLibraryPlacement(hero, {
      documentKind: 'page',
      parentIsPageRoot: true,
      existingChildCount: 1,
      existingDocumentEntryCount: 1,
    })).toMatchObject({
      allowed: false,
      code: 'document-entry-limit',
    })
    expect(resolveComponentLibraryPlacement(hero, {
      documentKind: 'page',
      parentIsPageRoot: true,
      existingChildCount: 1,
      existingDocumentEntryCount: 0,
    })).toEqual({ allowed: true })
  })

  it('enforces child-required parents and parent child allow-lists', () => {
    const email = componentLibraryRegistry.getOrThrow(publicId('base.email-input'))
    const form = componentLibraryRegistry.getOrThrow(publicId('base.form-container'))

    expect(resolveComponentLibraryPlacement(email, {
      existingChildCount: 0,
    })).toMatchObject({
      allowed: false,
      code: 'parent-required',
    })
    expect(resolveComponentLibraryPlacement(email, {
      parentEntry: form,
      existingChildCount: 0,
    })).toEqual({ allowed: true })
    expect(resolveComponentLibraryPlacement(
      componentLibraryRegistry.getOrThrow(publicId('base.plain-text')),
      { existingChildCount: 0 },
    )).toMatchObject({
      allowed: false,
      code: 'parent-ungoverned',
    })
    expect(resolveComponentLibraryPlacement(
      componentLibraryRegistry.getOrThrow(publicId('base.plain-text')),
      { parentIsPageRoot: true, existingChildCount: 0 },
    )).toEqual({ allowed: true })
    const restrictedForm = {
      ...form,
      constraints: { allowedChildEntryIds: [] },
    }
    expect(resolveComponentLibraryPlacement(email, {
      parentEntry: restrictedForm,
      existingChildCount: 0,
    })).toMatchObject({
      allowed: false,
      code: 'parent-rejects-child',
    })
  })

  it('rejects direct children under opinionated leaf components', () => {
    const text = componentLibraryRegistry.getOrThrow(publicId('base.plain-text'))
    const link = componentLibraryRegistry.getOrThrow(publicId('base.link'))

    expect(resolveComponentLibraryPlacement(text, {
      parentEntry: link,
      existingChildCount: 0,
    })).toMatchObject({
      allowed: false,
      code: 'parent-is-leaf',
    })
  })

  it('enforces named-slot entry, implementation and cardinality contracts', () => {
    const text = componentLibraryRegistry.getOrThrow(publicId('base.plain-text'))
    const slotOwner: ComponentLibraryEntry = {
      ...componentLibraryRegistry.getOrThrow(publicId('base.container')),
      id: 'test.slot-owner',
      slots: [{
        id: 'items',
        name: 'Items',
        allowedEntryIds: [text.id],
        allowedImplementationTypes: ['primitive'],
        minItems: 0,
        maxItems: 1,
      }],
    }
    const slot = slotOwner.slots[0]!

    expect(resolveComponentLibraryPlacement(text, {
      parentEntry: slotOwner,
      slot,
      existingChildCount: 0,
    })).toEqual({ allowed: true })
    expect(resolveComponentLibraryPlacement(text, {
      parentEntry: slotOwner,
      slot,
      existingChildCount: 1,
    })).toMatchObject({
      allowed: false,
      code: 'slot-full',
    })

    const visualComponent = {
      ...text,
      id: 'test.visual',
      implementation: {
        type: 'visual-component' as const,
        componentId: 'test-vc',
      },
    }
    expect(resolveComponentLibraryPlacement(visualComponent, {
      parentEntry: slotOwner,
      slot: { ...slot, allowedEntryIds: undefined },
      existingChildCount: 0,
    })).toMatchObject({
      allowed: false,
      code: 'slot-rejects-implementation',
    })
  })
})
