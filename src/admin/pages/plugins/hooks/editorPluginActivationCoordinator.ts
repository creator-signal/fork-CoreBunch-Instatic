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
    const inFlight = execution.then(
      () => {
        // A newer refresh may already own the coordinator when an older
        // pass settles. Only its own completion may release the shared slot.
        if (activationInFlight === inFlight) activationInFlight = null
      },
      (error: unknown) => {
        if (activationInFlight === inFlight) activationInFlight = null
        throw error
      },
    )
    activationInFlight = inFlight
    return inFlight
  }

  return {
    activateInitial() {
      // A route transition can mount a new editor layout while a plugin
      // change is rebuilding the shared registries. The initial pass may be
      // complete, but that does not make the registries ready for this new
      // consumer yet. Attach it to the refresh instead of exposing a
      // premature ready state (and an incomplete canvas) during the handoff.
      if (activationInFlight) return activationInFlight
      if (initialActivationComplete) return Promise.resolve()
      return startActivation()
    },
    refresh: startActivation,
  }
}
