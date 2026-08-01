import type {
  ComponentLibraryEntry,
  ComponentLibraryImplementation,
} from './schemas'

const CATEGORY_ORDER = [
  'Template',
  'Structure',
  'Navigation',
  'Editorial',
  'Typography',
  'Content',
  'Design',
  'Interactive',
  'Media',
  'Embed',
  'Forms',
]

export function renderComponentLibrarySpecification(
  entries: readonly ComponentLibraryEntry[],
): string {
  const categories = groupByCategory(entries)
  const lines = [
    '# Component Library specification',
    '',
    '> Generated from the executable Component Library definitions. Do not edit',
    '> this file directly; run `bun run component-library:spec` after changing',
    '> a catalogue entry.',
    '',
    `This specification covers all ${entries.length} registered built-in entries.`,
    'Each entry describes the author-facing contract independently of its rendered',
    'HTML. The backing module, Visual Component, pattern or template role remains',
    'the canonical implementation.',
    '',
    '## Catalogue summary',
    '',
    '| Category | Entries |',
    '|---|---:|',
    ...categories.map(([category, categoryEntries]) =>
      `| ${cell(category)} | ${categoryEntries.length} |`),
    '',
  ]

  for (const [category, categoryEntries] of categories) {
    lines.push(`## ${category}`, '')
    for (const entry of categoryEntries) {
      lines.push(...entrySpecification(entry))
    }
  }

  return `${lines.join('\n').trim()}\n`
}

function groupByCategory(
  entries: readonly ComponentLibraryEntry[],
): Array<[string, ComponentLibraryEntry[]]> {
  const grouped = new Map<string, ComponentLibraryEntry[]>()
  for (const entry of entries) {
    const categoryEntries = grouped.get(entry.category) ?? []
    categoryEntries.push(entry)
    grouped.set(entry.category, categoryEntries)
  }
  return [...grouped.entries()]
    .map(([category, categoryEntries]) => [
      category,
      [...categoryEntries].sort((left, right) =>
        left.name.localeCompare(right.name)),
    ] as [string, ComponentLibraryEntry[]])
    .sort(([left], [right]) => {
      const leftIndex = CATEGORY_ORDER.indexOf(left)
      const rightIndex = CATEGORY_ORDER.indexOf(right)
      if (leftIndex !== rightIndex) {
        if (leftIndex < 0) return 1
        if (rightIndex < 0) return -1
        return leftIndex - rightIndex
      }
      return left.localeCompare(right)
    })
}

function entrySpecification(entry: ComponentLibraryEntry): string[] {
  const lines = [
    `### ${entry.name}`,
    '',
    entry.description,
    '',
    `- Registry ID: \`${entry.id}\``,
    `- Version: \`${entry.version}\``,
    `- Status: ${entry.status}`,
    `- Source: ${source(entry)}`,
    `- Taxonomy: ${entry.implementation.type}`,
    `- Backing implementation: ${implementation(entry.implementation)}`,
    `- Search tags: ${entry.tags.length > 0 ? entry.tags.join(', ') : 'None'}`,
    '',
  ]

  if (entry.documentation.usage) {
    lines.push(`**Use when:** ${entry.documentation.usage}`, '')
  }
  if (entry.documentation.accessibility) {
    lines.push(
      `**Accessibility intent:** ${entry.documentation.accessibility}`,
      '',
    )
  }

  lines.push(...fieldSpecification(entry))
  lines.push(...optionSpecification('Presets', entry.presets))
  lines.push(...optionSpecification('Variants', entry.variants))
  lines.push(...slotSpecification(entry))
  lines.push(...requirementSpecification(entry))
  lines.push(...accessibilitySpecification(entry))
  return lines
}

function fieldSpecification(entry: ComponentLibraryEntry): string[] {
  if (entry.fields.length === 0) {
    return ['#### Properties', '', 'This entry exposes no instance properties.', '']
  }
  return [
    '#### Properties',
    '',
    '| Field | Author label | Control | Required | Advanced | Purpose |',
    '|---|---|---|:---:|:---:|---|',
    ...entry.fields.map((field) =>
      `| \`${cell(field.key)}\` | ${cell(field.label)} | ${cell(field.type)} | ` +
      `${field.required ? 'Yes' : 'No'} | ${field.advanced ? 'Yes' : 'No'} | ` +
      `${cell(field.description ?? inferredFieldPurpose(entry, field.label))} |`),
    '',
  ]
}

function inferredFieldPurpose(
  entry: ComponentLibraryEntry,
  label: string,
): string {
  const subject = label.charAt(0).toLowerCase() + label.slice(1)
  return `Controls the ${subject} used by this ${entry.name} instance.`
}

function optionSpecification(
  heading: string,
  options: ComponentLibraryEntry['presets'],
): string[] {
  if (options.length === 0) return []
  return [
    `#### ${heading}`,
    '',
    '| ID | Name | Applied values |',
    '|---|---|---|',
    ...options.map((option) =>
      `| \`${cell(option.id)}\` | ${cell(option.name)} | ` +
      `\`${cell(stableJson(option.values))}\` |`),
    '',
  ]
}

function slotSpecification(entry: ComponentLibraryEntry): string[] {
  if (entry.slots.length === 0) return []
  return [
    '#### Slots',
    '',
    '| Slot | Purpose | Cardinality | Allowed content |',
    '|---|---|---|---|',
    ...entry.slots.map((slot) => {
      const cardinality = `${slot.minItems}–${slot.maxItems ?? 'many'}`
      const allowed = [
        ...(slot.allowedEntryIds ?? []).map((id) => `\`${id}\``),
        ...(slot.allowedImplementationTypes ?? []).map((type) => type),
      ]
      return `| \`${cell(slot.id)}\` (${cell(slot.name)}) | ` +
        `${cell(slot.description ?? 'Governed child content.')} | ` +
        `${cardinality} | ${allowed.length > 0 ? allowed.join(', ') : 'Any permitted entry'} |`
    }),
    '',
  ]
}

function requirementSpecification(entry: ComponentLibraryEntry): string[] {
  const rows = [
    ...entry.requirements.capabilities.map((id) => ['Capability', id]),
    ...entry.requirements.providerAdapters.map((id) => ['Provider adapter', id]),
    ...entry.requirements.plugins.map((id) => ['Plugin', id]),
  ]
  if (rows.length === 0) {
    return ['#### Dependencies', '', 'No additional platform dependency.', '']
  }
  return [
    '#### Dependencies',
    '',
    '| Kind | Stable ID |',
    '|---|---|',
    ...rows.map(([kind, id]) => `| ${kind} | \`${cell(id ?? '')}\` |`),
    '',
  ]
}

function accessibilitySpecification(entry: ComponentLibraryEntry): string[] {
  const checks = entry.accessibility?.checks ?? []
  if (checks.length === 0) return []
  return [
    '#### Accessibility checks',
    '',
    '| Rule | Enforcement | Severity | Contract | Remediation |',
    '|---|---|---|---|---|',
    ...checks.map((check) =>
      `| \`${cell(check.rule)}\` | ${cell(check.enforcement)} | ` +
      `${cell(check.severity)} | ${cell(check.summary)} | ` +
      `${cell(check.remediation)} |`),
    '',
  ]
}

function implementation(value: ComponentLibraryImplementation): string {
  if (value.type === 'capability-backed') {
    return `capability-backed ${implementation(value.backing)}`
  }
  if (value.type === 'primitive') {
    return `module \`${value.moduleId}\`${value.presetId
      ? ` with preset \`${value.presetId}\``
      : ''}`
  }
  if (value.type === 'visual-component') {
    return `Visual Component \`${value.componentId}\``
  }
  if (value.type === 'pattern') return `pattern \`${value.patternId}\``
  return `template role \`${value.role}\``
}

function source(entry: ComponentLibraryEntry): string {
  if (entry.source.type === 'plugin') {
    return `plugin \`${entry.source.pluginId}\``
  }
  if (entry.source.type === 'design-system') {
    return `design system \`${entry.source.id}\` (${entry.source.name})`
  }
  return entry.source.type
}

function stableJson(value: Record<string, unknown>): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
    ),
  )
}

function cell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ')
}
