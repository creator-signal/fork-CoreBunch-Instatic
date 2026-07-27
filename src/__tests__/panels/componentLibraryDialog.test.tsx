import { afterEach, describe, expect, it } from 'bun:test'
import React from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import {
  componentLibraryRegistry,
  type ComponentLibraryEntry,
} from '@core/component-library'
import { ComponentLibraryDialog } from '@site/panels/LayersPanel/ComponentLibraryDialog'
import '@modules/base/index'

const dependencyEntry: ComponentLibraryEntry = {
  id: 'test.delivery-field',
  version: '1.0.0',
  name: 'Delivery field',
  description: 'Exercises dependency health in the catalogue.',
  category: 'Test',
  tags: ['delivery'],
  icon: 'mail',
  source: {
    type: 'plugin',
    pluginId: 'test.delivery-plugin',
    name: 'Test delivery plugin',
  },
  status: 'experimental',
  implementation: {
    type: 'capability-backed',
    backing: {
      type: 'primitive',
      moduleId: 'base.input',
    },
  },
  fields: [],
  variants: [],
  presets: [],
  slots: [],
  constraints: {},
  requirements: {
    capabilities: ['test.delivery'],
    providerAdapters: ['test.mailer'],
    plugins: ['test.delivery-plugin'],
  },
  documentation: {
    usage: 'Use for dependency status testing.',
  },
}

afterEach(() => {
  cleanup()
  componentLibraryRegistry.unregister(dependencyEntry.id)
})

describe('ComponentLibraryDialog dependency availability', () => {
  it('explains every unavailable dependency and blocks insertion', () => {
    componentLibraryRegistry.register(dependencyEntry)
    render(<ComponentLibraryDialog open onClose={() => {}} />)

    fireEvent.change(screen.getByLabelText('Search Component Library'), {
      target: { value: dependencyEntry.name },
    })

    const notice = screen.getByRole('status')
    expect(within(notice).getByText('Insertion unavailable')).toBeDefined()
    expect(notice.textContent).toContain('Capability “test.delivery”')
    expect(notice.textContent).toContain('Provider adapter “test.mailer”')
    expect(notice.textContent).toContain('Plugin “test.delivery-plugin”')
    expect(notice.textContent).toContain('are unavailable')

    const dependencies = screen.getByRole('heading', { name: 'Dependencies' }).parentElement!
    expect(dependencies.textContent).toContain('Capability · test.delivery · unavailable')
    expect(dependencies.textContent).toContain('Provider adapter · test.mailer · unavailable')
    expect(dependencies.textContent).toContain('Plugin · test.delivery-plugin · unavailable')
    expect(screen.getByRole('button', { name: 'Insert component' }).getAttribute('aria-disabled'))
      .toBe('true')
  })

  it('allows insertion when no dependency is unavailable and identifies degradation', () => {
    componentLibraryRegistry.register(dependencyEntry)
    render(
      <ComponentLibraryDialog
        open
        onClose={() => {}}
        dependencyState={{
          capabilities: { 'test.delivery': 'available' },
          providerAdapters: { 'test.mailer': 'degraded' },
          plugins: { 'test.delivery-plugin': 'available' },
        }}
      />,
    )

    fireEvent.change(screen.getByLabelText('Search Component Library'), {
      target: { value: dependencyEntry.name },
    })

    const notice = screen.getByRole('status')
    expect(within(notice).getByText('Dependency degraded')).toBeDefined()
    expect(notice.textContent).toContain('Provider adapter “test.mailer” is degraded')
    expect(screen.getByRole('button', { name: 'Insert component' }).getAttribute('aria-disabled'))
      .toBeNull()
  })
})
