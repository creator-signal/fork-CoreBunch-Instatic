import type {
  ComponentLibraryAvailability,
  ComponentLibraryDependencyHealth,
  ComponentLibraryDependencyIssue,
  ComponentLibraryDependencyState,
  ComponentLibraryEntry,
} from './schemas'

function collectIssues(
  ids: readonly string[],
  states: Readonly<Record<string, ComponentLibraryDependencyHealth>>,
  kind: ComponentLibraryDependencyIssue['kind'],
): ComponentLibraryDependencyIssue[] {
  return ids.flatMap((id) => {
    const health = states[id] ?? 'unavailable'
    return health === 'available' ? [] : [{ kind, id, health }]
  })
}

/**
 * Resolve dependency health without reading credentials or provider settings.
 * Missing dependency IDs are unavailable by default.
 */
export function resolveComponentLibraryAvailability(
  entry: ComponentLibraryEntry,
  state: ComponentLibraryDependencyState,
): ComponentLibraryAvailability {
  const issues = [
    ...collectIssues(
      entry.requirements.capabilities,
      state.capabilities,
      'capability',
    ),
    ...collectIssues(
      entry.requirements.providerAdapters,
      state.providerAdapters,
      'provider-adapter',
    ),
    ...collectIssues(
      entry.requirements.plugins,
      state.plugins,
      'plugin',
    ),
  ]

  const health = issues.some((issue) => issue.health === 'unavailable')
    ? 'unavailable'
    : issues.length > 0
      ? 'degraded'
      : 'available'

  return { health, issues }
}
