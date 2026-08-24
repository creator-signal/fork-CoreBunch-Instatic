import { describe, expect, it } from 'bun:test'
import type { ComponentLibraryEntry } from '@core/component-library'
import { installedComponentLibraryPlugins } from '@site/component-library/useComponentLibraryCatalogue'

describe('Component Library plugin dependency state', () => {
  it('marks every active plugin catalogue source available', () => {
    const entries = [
      { source: { type: 'built-in' } },
      { source: { type: 'plugin', pluginId: 'creator-signal.site' } },
      { source: { type: 'plugin', pluginId: 'creator-signal.site' } },
      { source: { type: 'plugin', pluginId: 'example.components' } },
    ] as ComponentLibraryEntry[]

    expect(installedComponentLibraryPlugins(entries)).toEqual({
      'creator-signal.site': 'available',
      'example.components': 'available',
    })
  })
})
