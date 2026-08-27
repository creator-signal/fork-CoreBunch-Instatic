import { useEffect, useState } from 'react'
import { activateInstalledEditorPlugins } from '@core/plugins/editorPluginLoader'
import { bindDashboardWidgetIconResolver } from '@core/plugins/runtime'
import { editorPluginModuleComponentFactory } from '@site/canvas/pluginModuleComponentFactory'
import { resolveDashboardWidgetIcon } from '@admin/pages/dashboard/widgetIcons'
import { ensurePluginRuntime } from '@admin/pluginRuntimeBootstrap'
import { CMS_PLUGINS_CHANGED_EVENT } from '@plugins/utils/pluginEvents'
import { setEditorActivationFailures } from './editorPluginActivationErrors'
import { createEditorPluginActivationCoordinator } from './editorPluginActivationCoordinator'

// Bind the dashboard widget icon resolver at module-load time, BEFORE
// any React effect fires. Plugins call `api.dashboard.widgets.register`
// during their `activate()` hook, and that requires a bound resolver
// to map iconName strings to React components. The DashboardPage used
// to do this binding at its own module-load — but plugin activation
// runs at admin boot regardless of which route the user is on, so the
// dashboard module hadn't loaded yet when the analytics plugin tried
// to register its Visitors / Top pages widgets. Binding here, in the
// same file that owns `useInstalledEditorPlugins`, guarantees the
// resolver is ready before the activation pass it triggers.
bindDashboardWidgetIconResolver(resolveDashboardWidgetIcon)

function createActivationCoordinator() {
  return createEditorPluginActivationCoordinator(async () => {
    // The runtime MUST be ready before any plugin module dynamic-imports
    // (the plugin bundle's `import * as React from 'react'` statements
    // resolve via the `/runtime/*.js` shims, which read
    // `globalThis.__instatic`). The first call triggers the download; later
    // activation passes receive the cached resolved promise.
    await ensurePluginRuntime()
    return activateInstalledEditorPlugins({
      componentFactory: editorPluginModuleComponentFactory,
    })
  }, (result) => {
    setEditorActivationFailures(result.failed)
    if (result.failed.length > 0) {
      console.error('Some editor plugins failed to activate', result.failed)
    }
  })
}

let activationCoordinator = createActivationCoordinator()

/** Reset module-scoped session state between isolated browser-layout tests. */
export function resetInstalledEditorPluginActivationForTests(): void {
  activationCoordinator = createActivationCoordinator()
}

export type EditorPluginActivationStatus =
  | 'disabled'
  | 'activating'
  | 'ready'
  | 'failed'

export function useInstalledEditorPlugins(enabled = true): EditorPluginActivationStatus {
  const [status, setStatus] = useState<EditorPluginActivationStatus>(
    enabled ? 'activating' : 'disabled',
  )

  useEffect(() => {
    if (!enabled) {
      setEditorActivationFailures([])
      return
    }

    let mounted = true

    function observeActivation(activation: Promise<void>) {
      void activation.then(
        () => {
          if (mounted) setStatus('ready')
        },
        (error: unknown) => {
          console.error('Editor plugin activation failed', error)
          if (mounted) setStatus('failed')
        },
      )
    }

    function refreshPlugins() {
      setStatus('activating')
      observeActivation(activationCoordinator.refresh())
    }

    // Route layouts share this session-scoped pass. A transition that
    // unmounts one layout and mounts another attaches to the same promise,
    // so the shared registries are never reset by overlapping activations.
    observeActivation(activationCoordinator.activateInitial())
    window.addEventListener(CMS_PLUGINS_CHANGED_EVENT, refreshPlugins)

    return () => {
      mounted = false
      window.removeEventListener(CMS_PLUGINS_CHANGED_EVENT, refreshPlugins)
    }
  }, [enabled])

  // When a previously disabled caller becomes enabled, keep the dependent
  // editor surface closed during the render before the effect starts the
  // activation pass.
  if (!enabled) return 'disabled'
  if (status === 'disabled') return 'activating'
  return status
}
