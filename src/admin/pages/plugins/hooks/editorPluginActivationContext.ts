import { createContext, useContext } from 'react'
import type { EditorPluginActivationState } from './useInstalledEditorPlugins'

export const EditorPluginActivationContext =
  createContext<EditorPluginActivationState>({
    status: 'disabled',
    retry: () => {},
  })

export function useEditorPluginActivationStatus(): EditorPluginActivationState {
  return useContext(EditorPluginActivationContext)
}
