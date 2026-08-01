import type { PluginPermission } from '@core/plugin-sdk'

interface ComponentLibraryManifestFields {
  componentLibrary?: unknown
  permissions: readonly PluginPermission[]
}

export function assertComponentLibraryCoherent(
  manifest: ComponentLibraryManifestFields,
): void {
  if (
    manifest.componentLibrary
    && !manifest.permissions.includes('componentLibrary.register')
  ) {
    throw new Error(
      'Invalid plugin manifest: `componentLibrary` requires the ' +
      '`componentLibrary.register` permission. Add "componentLibrary.register" to `permissions`.',
    )
  }
}
