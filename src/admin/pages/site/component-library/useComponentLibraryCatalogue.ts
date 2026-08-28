import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  componentLibraryRegistry,
  type ComponentLibraryDependencyState,
  type ComponentLibraryEntry,
} from '@core/component-library'
import { providerAdapterRegistry } from '@core/provider-adapters'
import { searchCapabilityHealth } from '@core/search'
import { AttachmentCapabilityStatusSchema } from '@core/attachments'
import { FormDraftCapabilityStatusSchema } from '@core/forms'
import { apiRequest } from '@core/http'
import { useEditorStore } from '@site/store/store'

const subscribe = (listener: () => void) =>
  componentLibraryRegistry.subscribe(listener)
let entriesSnapshotGeneration = -1
let entriesSnapshot = componentLibraryRegistry.list()

function getEntriesSnapshot(): ComponentLibraryEntry[] {
  const generation = componentLibraryRegistry.generation()
  if (generation !== entriesSnapshotGeneration) {
    entriesSnapshotGeneration = generation
    entriesSnapshot = componentLibraryRegistry.list()
  }
  return entriesSnapshot
}

export function useComponentLibraryEntries(): ComponentLibraryEntry[] {
  return useSyncExternalStore(
    subscribe,
    getEntriesSnapshot,
    getEntriesSnapshot,
  )
}

export function useComponentLibraryDependencyState(
  active: boolean,
  override?: ComponentLibraryDependencyState,
): ComponentLibraryDependencyState {
  const entries = useComponentLibraryEntries()
  const searchHealth = useEditorStore((state) =>
    searchCapabilityHealth(state.site),
  )
  const [attachmentHealth, setAttachmentHealth] = useState<
    ComponentLibraryDependencyState['capabilities'][string]
  >('unavailable')
  const [formDraftHealth, setFormDraftHealth] = useState<
    ComponentLibraryDependencyState['capabilities'][string]
  >('unavailable')

  useEffect(() => {
    if (!active || override) return
    const controller = new AbortController()
    apiRequest('/admin/api/cms/attachments/health', {
      schema: AttachmentCapabilityStatusSchema,
      signal: controller.signal,
    })
      .then((body) => body.health)
      .then(setAttachmentHealth)
      .catch(() => {
        if (!controller.signal.aborted) setAttachmentHealth('unavailable')
      })
    apiRequest('/admin/api/cms/form-drafts/health', {
      schema: FormDraftCapabilityStatusSchema,
      signal: controller.signal,
    })
      .then((body) => body.health)
      .then(setFormDraftHealth)
      .catch(() => {
        if (!controller.signal.aborted) setFormDraftHealth('unavailable')
      })
    return () => controller.abort()
  }, [active, override])

  return override ?? {
    capabilities: {
      'search.index': searchHealth,
      'forms.attachments': attachmentHealth,
      'forms.drafts': formDraftHealth,
    },
    providerAdapters: providerAdapterRegistry.dependencyHealth(),
    plugins: installedComponentLibraryPlugins(entries),
  }
}

/**
 * Plugin catalogue entries exist only while their owning editor package is
 * active. The editor plugin loader unregisters the entire source on disable or
 * uninstall, so a live entry is the authoritative client-side availability
 * signal and does not need a second, racing plugin-status request.
 */
export function installedComponentLibraryPlugins(
  entries: readonly ComponentLibraryEntry[],
): ComponentLibraryDependencyState['plugins'] {
  const plugins: ComponentLibraryDependencyState['plugins'] = {}
  for (const entry of entries) {
    if (entry.source.type === 'plugin') {
      plugins[entry.source.pluginId] = 'available'
    }
  }
  return plugins
}
