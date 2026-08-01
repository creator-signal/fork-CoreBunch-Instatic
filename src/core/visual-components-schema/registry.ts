import type { VisualComponent } from '../visualComponents/schemas'

/**
 * Immutable application-owned Visual Component definitions.
 *
 * Site-authored components remain in `site.visualComponents`. Built-ins are a
 * fallback only: an explicit site definition with the same ID wins, which
 * keeps imports and tests deterministic while allowing the base catalogue to
 * reference centrally shipped definitions without copying them into every
 * site's data rows.
 */
class BuiltInVisualComponentRegistry {
  readonly #entries = new Map<string, VisualComponent>()

  registerOrReplace(component: VisualComponent): void {
    this.#entries.set(component.id, component)
  }

  get(componentId: string): VisualComponent | undefined {
    return this.#entries.get(componentId)
  }

  list(): VisualComponent[] {
    return Array.from(this.#entries.values())
  }
}

export const builtInVisualComponentRegistry =
  new BuiltInVisualComponentRegistry()

export function resolveVisualComponent(
  siteComponents: readonly VisualComponent[] | undefined,
  componentId: string,
): VisualComponent | undefined {
  return siteComponents?.find((component) => component.id === componentId) ??
    builtInVisualComponentRegistry.get(componentId)
}

export function resolvableVisualComponents(
  siteComponents: readonly VisualComponent[] = [],
): VisualComponent[] {
  const byId = new Map(
    builtInVisualComponentRegistry.list().map((component) => [
      component.id,
      component,
    ]),
  )
  for (const component of siteComponents) byId.set(component.id, component)
  return Array.from(byId.values())
}

export function resolvableVisualComponentIds(
  siteComponents: readonly VisualComponent[] = [],
): Set<string> {
  return new Set(
    resolvableVisualComponents(siteComponents).map((component) => component.id),
  )
}
