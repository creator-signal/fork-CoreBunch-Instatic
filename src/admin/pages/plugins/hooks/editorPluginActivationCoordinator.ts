export interface EditorPluginActivationCoordinator {
  activateInitial: () => Promise<void>
  refresh: () => Promise<void>
}

/**
 * Own editor-plugin activation outside any route layout's lifetime.
 *
 * Admin route transitions can unmount one layout while the next mounts. Both
 * layouts must attach to the same activation pass because each pass resets the
 * shared plugin registries before rebuilding them.
 */
export function createEditorPluginActivationCoordinator<TResult>(
  activate: () => Promise<TResult>,
  accept: (result: TResult) => void,
): EditorPluginActivationCoordinator {
  let initialActivationComplete = false
  let activationInFlight: Promise<void> | null = null

  function startActivation(): Promise<void> {
    if (activationInFlight) return activationInFlight

    const execution = activate().then((result) => {
      accept(result)
      initialActivationComplete = true
    })
    activationInFlight = execution.finally(() => {
      activationInFlight = null
    })
    return activationInFlight
  }

  return {
    activateInitial() {
      if (initialActivationComplete) return Promise.resolve()
      return startActivation()
    },
    refresh: startActivation,
  }
}
