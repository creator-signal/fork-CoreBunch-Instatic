import { describe, expect, it } from 'bun:test'
import {
  componentLibraryRegistry,
  resolveComponentLibraryPlacement,
  type ComponentLibraryEntry,
} from '@core/component-library'
import '@modules/base/index'

describe('Component Library placement policy', () => {
  it('enforces child-required parents and parent child allow-lists', () => {
    const email = componentLibraryRegistry.getOrThrow('base.email-input')
    const form = componentLibraryRegistry.getOrThrow('base.form-container')

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
      componentLibraryRegistry.getOrThrow('base.plain-text'),
      { existingChildCount: 0 },
    )).toMatchObject({
      allowed: false,
      code: 'parent-ungoverned',
    })
    expect(resolveComponentLibraryPlacement(
      componentLibraryRegistry.getOrThrow('base.plain-text'),
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

  it('enforces named-slot entry, implementation and cardinality contracts', () => {
    const text = componentLibraryRegistry.getOrThrow('base.plain-text')
    const slotOwner: ComponentLibraryEntry = {
      ...componentLibraryRegistry.getOrThrow('base.container'),
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
