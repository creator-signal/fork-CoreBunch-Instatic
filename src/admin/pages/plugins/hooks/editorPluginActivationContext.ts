import { createContext, useContext } from 'react'
import type { EditorPluginActivationStatus } from './useInstalledEditorPlugins'

export const EditorPluginActivationContext =
  createContext<EditorPluginActivationStatus>('disabled')

export function useEditorPluginActivationStatus(): EditorPluginActivationStatus {
  return useContext(EditorPluginActivationContext)
}
