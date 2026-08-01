import { describe, expect, it } from 'bun:test'
import {
  ComponentLibraryDefinitionError,
  ComponentLibraryRegistry,
  filterComponentLibraryEntries,
  parseComponentLibraryEntry,
  resolveComponentLibraryAvailability,
  type ComponentLibraryEntry,
} from '@core/component-library'

function entry(
  overrides: Partial<ComponentLibraryEntry> = {},
): ComponentLibraryEntry {
  return {
    id: 'base.email-input',
    version: '1.0.0',
    name: 'Email Input',
    description: 'Collects an email address.',
    category: 'Forms',
    tags: ['form', 'email'],
    icon: 'mail',
    source: { type: 'built-in' },
    status: 'stable',
    implementation: {
      type: 'primitive',
      moduleId: 'base.input',
      presetId: 'email',
    },
    fields: [
      {
        key: 'label',
        label: 'Label',
        type: 'text',
        required: true,
      },
    ],
    variants: [],
    presets: [
      {
        id: 'email',
        name: 'Email',
        values: { type: 'email' },
      },
    ],
    slots: [],
    constraints: {
      allowedParentEntryIds: ['base.form-container'],
      allowedChildEntryIds: [],
    },
    requirements: {
      capabilities: [],
      providerAdapters: [],
      plugins: [],
    },
    documentation: {
      usage: 'Use for email addresses.',
      accessibility: 'Keep a visible label.',
    },
    ...overrides,
  }
}

describe('Component Library definitions', () => {
  it('parses a complete primitive entry', () => {
    expect(parseComponentLibraryEntry(entry())).toEqual(entry())
  })

  it('rejects identifiers and versions that are not stable namespaced contracts', () => {
    expect(() => parseComponentLibraryEntry(entry({ id: 'email' }))).toThrow(
      ComponentLibraryDefinitionError,
    )
    expect(() => parseComponentLibraryEntry(entry({ version: 'latest' }))).toThrow(
      ComponentLibraryDefinitionError,
    )
  })

  it('rejects duplicate local identifiers and invalid slot cardinality', () => {
    expect(() => parseComponentLibraryEntry(entry({
      variants: [
        { id: 'compact', name: 'Compact', values: {} },
        { id: 'compact', name: 'Compact again', values: {} },
      ],
    }))).toThrow('Duplicate variants identifier "compact"')

    expect(() => parseComponentLibraryEntry(entry({
      slots: [{
        id: 'items',
        name: 'Items',
        allowedEntryIds: [],
        allowedImplementationTypes: [],
        minItems: 2,
        maxItems: 1,
      }],
    }))).toThrow('maxItems must be greater than or equal to minItems')

    expect(() => parseComponentLibraryEntry(entry({
      accessibility: {
        checks: [
          {
            rule: 'a11y.accessible-name',
            category: 'naming',
            enforcement: 'automated',
            severity: 'error',
            fields: ['label'],
            summary: 'Requires a name.',
            remediation: 'Add a label.',
          },
          {
            rule: 'a11y.accessible-name',
            category: 'naming',
            enforcement: 'manual',
            severity: 'warning',
            summary: 'Duplicate rule.',
            remediation: 'Remove the duplicate.',
          },
        ],
      },
    }))).toThrow(
      'Duplicate accessibility.checks identifier "a11y.accessible-name"',
    )
  })

  it('requires capability-backed entries to name a real dependency', () => {
    expect(() => parseComponentLibraryEntry(entry({
      implementation: {
        type: 'capability-backed',
        backing: { type: 'primitive', moduleId: 'base.input' },
      },
    }))).toThrow(
      'A capability-backed entry must declare at least one capability, provider adapter or plugin',
    )
  })

  it('requires primitive preset mappings to resolve inside the same entry', () => {
    expect(() => parseComponentLibraryEntry(entry({
      implementation: {
        type: 'primitive',
        moduleId: 'base.input',
        presetId: 'missing',
      },
    }))).toThrow('Preset "missing" is not declared by this entry')
  })
})

describe('ComponentLibraryRegistry', () => {
  it('rejects accidental duplicates and supports explicit replacement', () => {
    const registry = new ComponentLibraryRegistry()
    registry.register(entry())

    expect(() => registry.register(entry())).toThrow('already registered')
    registry.registerOrReplace(entry({ name: 'Work Email Input' }))

    expect(registry.getOrThrow('base.email-input').name).toBe('Work Email Input')
  })

  it('returns deterministic catalogue order and emits one generation per mutation', () => {
    const registry = new ComponentLibraryRegistry()
    let notifications = 0
    const unsubscribe = registry.subscribe(() => {
      notifications += 1
    })

    registry.register(entry({
      id: 'base.hero',
      name: 'Hero',
      category: 'Structure',
      implementation: { type: 'pattern', patternId: 'base.hero' },
    }))
    registry.register(entry())
    registry.unregister('base.hero')
    unsubscribe()
    registry.unregister('base.email-input')

    expect(registry.generation()).toBe(4)
    expect(notifications).toBe(3)
    expect(registry.size).toBe(0)
  })

  it('unregisters one plugin source without removing another plugin package', () => {
    const registry = new ComponentLibraryRegistry()
    registry.register(entry({
      id: 'acme.hero',
      source: { type: 'plugin', pluginId: 'acme.components' },
    }))
    registry.register(entry({
      id: 'other.hero',
      source: { type: 'plugin', pluginId: 'other.components' },
    }))

    registry.unregisterSource({ type: 'plugin', pluginId: 'acme.components' })

    expect(registry.has('acme.hero')).toBe(false)
    expect(registry.has('other.hero')).toBe(true)
  })
})

describe('Component Library discovery', () => {
  it('searches author metadata with AND semantics and filters taxonomy', () => {
    const entries = [
      entry(),
      entry({
        id: 'base.hero',
        name: 'Hero',
        description: 'A prominent page introduction.',
        category: 'Structure',
        tags: ['banner', 'lead'],
        implementation: { type: 'pattern', patternId: 'base.hero' },
        fields: [],
        source: { type: 'design-system', id: 'acme.design-system', name: 'Acme' },
      }),
    ]

    expect(filterComponentLibraryEntries(entries, { search: 'email form' }))
      .toHaveLength(1)
    expect(filterComponentLibraryEntries(entries, {
      implementationTypes: ['pattern'],
      sources: ['design-system'],
    }).map((candidate) => candidate.id)).toEqual(['base.hero'])
  })

  it('resolves unavailable and degraded dependencies without exposing settings', () => {
    const candidate = entry({
      implementation: {
        type: 'capability-backed',
        backing: { type: 'primitive', moduleId: 'base.input' },
      },
      requirements: {
        capabilities: ['forms.attachments'],
        providerAdapters: ['scanner.clamav'],
        plugins: [],
      },
    })

    expect(resolveComponentLibraryAvailability(candidate, {
      capabilities: { 'forms.attachments': 'available' },
      providerAdapters: { 'scanner.clamav': 'degraded' },
      plugins: {},
    })).toEqual({
      health: 'degraded',
      issues: [{
        kind: 'provider-adapter',
        id: 'scanner.clamav',
        health: 'degraded',
      }],
    })

    expect(resolveComponentLibraryAvailability(candidate, {
      capabilities: {},
      providerAdapters: {},
      plugins: {},
    }).health).toBe('unavailable')
  })
})
