/**
 * Independent Components-view expansion state.
 *
 * Rows default to expanded; the store records only explicit collapses. Keeping
 * this outside React state lets selection synchronisation expand ancestors
 * without an effect-driven React state update.
 */
export class ComponentLayersExpansionStore {
  private readonly collapsed = new Set<string>()
  private readonly listeners = new Set<() => void>()

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  isExpanded = (key: string): boolean => !this.collapsed.has(key)

  toggle = (key: string): void => {
    if (this.collapsed.has(key)) {
      this.collapsed.delete(key)
    } else {
      this.collapsed.add(key)
    }
    this.notify()
  }

  expand = (key: string): void => {
    if (!this.collapsed.delete(key)) return
    this.notify()
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }
}
