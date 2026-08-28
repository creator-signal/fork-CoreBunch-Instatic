import { afterEach, describe, expect, it } from 'bun:test'
import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import {
  componentLibraryRegistry,
  type ComponentLibraryEntry,
} from '@core/component-library'
import { ComponentLibraryDialog } from '@site/panels/LayersPanel/ComponentLibraryDialog'
import { useEditorStore } from '@site/store/store'
import { DEFAULT_SITE_SEARCH_SETTINGS } from '@core/page-tree'
import { makePage, makeSite } from '../publisher/helpers'
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

const templateOnlyEntry: ComponentLibraryEntry = {
  ...dependencyEntry,
  id: 'test.shared-header',
  name: 'Shared header',
  description: 'Shared site chrome for the template.',
  constraints: { allowedDocumentKinds: ['template'] },
}

afterEach(() => {
  cleanup()
  componentLibraryRegistry.unregister(dependencyEntry.id)
  componentLibraryRegistry.unregister(templateOnlyEntry.id)
  useEditorStore.setState({ site: null })
})

describe('ComponentLibraryDialog dependency availability', () => {
  it('reconciles an open catalogue when plugin entries register and refresh', async () => {
    render(<ComponentLibraryDialog open onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('Search Component Library'), {
      target: { value: dependencyEntry.id },
    })
    expect(screen.getByText('No components match')).toBeDefined()

    act(() => componentLibraryRegistry.register(dependencyEntry))

    expect(
      await screen.findByRole('heading', { name: dependencyEntry.name, level: 3 }),
    ).toBeDefined()
    expect(screen.queryByText('No components match')).toBeNull()

    act(() => componentLibraryRegistry.unregister(dependencyEntry.id))

    await waitFor(() => {
      expect(screen.getByText('No components match')).toBeDefined()
    })
    expect(
      screen.queryByRole('heading', { name: dependencyEntry.name, level: 3 }),
    ).toBeNull()
  })

  it('explains template-only placement before an author tries to insert', () => {
    componentLibraryRegistry.register(templateOnlyEntry)
    const page = makePage({
      root: { moduleId: 'base.body', children: [] },
    })
    useEditorStore.setState({
      site: makeSite({ pages: [page] }),
      activePageId: page.id,
      activeDocument: { kind: 'page', pageId: page.id },
      selectedNodeId: page.rootNodeId,
    })

    render(
      <ComponentLibraryDialog
        open
        onClose={() => {}}
        dependencyState={{
          capabilities: { 'test.delivery': 'available' },
          providerAdapters: { 'test.mailer': 'available' },
          plugins: { 'test.delivery-plugin': 'available' },
        }}
      />,
    )
    fireEvent.change(screen.getByLabelText('Search Component Library'), {
      target: { value: templateOnlyEntry.name },
    })

    const notice = screen.getByRole('status')
    expect(within(notice).getByText('Choose the shared template')).toBeDefined()
    expect(notice.textContent).toContain('can only be placed in a template')
    expect(screen.getByRole('heading', { name: 'Placement' }).parentElement?.textContent)
      .toContain('Shared templates only')
    expect(screen.getByRole('button', { name: 'Insert component' }).getAttribute('aria-disabled'))
      .toBe('true')
  })

  it('shows the mapped catalogue under the Creator Signal provider', () => {
    render(<ComponentLibraryDialog open onClose={() => {}} />)

    const providerFilter = screen.getByLabelText('Filter by provider')
      .closest('div')!
      .querySelector('select')!
    const providerLabels = Array.from(providerFilter.options)
      .map((option) => option.textContent)
    expect(providerLabels).toContain('Creator Signal')
    expect(providerLabels).not.toContain('Built-in')

    fireEvent.change(providerFilter, {
      target: { value: 'creator-signal.site' },
    })

    const results = screen.getByRole('listbox', { name: 'Components' })
    expect(within(results).getByText('Hero')).toBeDefined()
    expect(within(results).getAllByText('Creator Signal').length).toBeGreaterThan(0)
  })

  it('shows component ownership and supports provider-level filtering', () => {
    componentLibraryRegistry.register(dependencyEntry)
    render(<ComponentLibraryDialog open onClose={() => {}} />)

    const providerFilter = screen.getByLabelText('Filter by provider')
      .closest('div')!
      .querySelector('select')!
    expect(Array.from(providerFilter.options).map((option) => option.textContent))
      .toContain('Test delivery plugin')

    fireEvent.change(providerFilter, {
      target: { value: dependencyEntry.source.type === 'plugin'
        ? dependencyEntry.source.pluginId
        : '' },
    })

    const results = screen.getByRole('listbox', { name: 'Components' })
    expect(within(results).getByText(dependencyEntry.name)).toBeDefined()
    expect(within(results).getByText('Test delivery plugin')).toBeDefined()
    expect(within(results).queryByText('Hero')).toBeNull()
  })

  it('explains every unavailable dependency and blocks insertion', () => {
    componentLibraryRegistry.register(dependencyEntry)
    render(
      <ComponentLibraryDialog
        open
        onClose={() => {}}
        dependencyState={{
          capabilities: { 'test.delivery': 'unavailable' },
          providerAdapters: { 'test.mailer': 'unavailable' },
          plugins: { 'test.delivery-plugin': 'unavailable' },
        }}
      />,
    )

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

  it('uses built-in provider health when no dependency override is supplied', () => {
    render(<ComponentLibraryDialog open onClose={() => {}} />)

    fireEvent.change(screen.getByLabelText('Search Component Library'), {
      target: { value: 'YouTube Embed' },
    })

    const dependencies = screen.getByRole('heading', {
      name: 'Dependencies',
    }).parentElement!
    expect(dependencies.textContent).toContain(
      'All required capabilities, provider adapters and plugins are available.',
    )
    expect(screen.getByRole('button', { name: 'Insert component' }).getAttribute('aria-disabled'))
      .toBeNull()

    fireEvent.change(screen.getByLabelText('Search Component Library'), {
      target: { value: 'CAPTCHA' },
    })

    const notice = screen.getByRole('status')
    expect(within(notice).getByText('Insertion unavailable')).toBeDefined()
    expect(notice.textContent).toContain('Capability “forms.captcha”')
    expect(notice.textContent).toContain('Provider adapter “captcha.hcaptcha”')
    expect(screen.getByRole('button', { name: 'Insert component' }).getAttribute('aria-disabled'))
      .toBe('true')
  })

  it('keeps Search unavailable until its site capability is enabled and eligible', () => {
    useEditorStore.setState({ site: makeSite({ pages: [] }) })
    const first = render(<ComponentLibraryDialog open onClose={() => {}} />)

    fireEvent.change(screen.getByLabelText('Search Component Library'), {
      target: { value: 'Search Results' },
    })
    expect(screen.getByRole('status').textContent).toContain(
      'Capability “search.index” is unavailable',
    )
    first.unmount()

    const page = makePage({
      root: { moduleId: 'base.body', children: ['text'] },
      text: { moduleId: 'base.text', props: { text: 'Searchable page.' } },
    })
    useEditorStore.setState({
      site: makeSite({
        pages: [page],
        settings: {
          shortcuts: {},
          search: {
            ...DEFAULT_SITE_SEARCH_SETTINGS,
            enabled: true,
          },
        },
      }),
    })
    render(<ComponentLibraryDialog open onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('Search Component Library'), {
      target: { value: 'Search Results' },
    })

    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByRole('button', { name: 'Insert component' }).getAttribute('aria-disabled'))
      .toBeNull()
  })

  it('supports governed pattern insertion and exposes declared variants', () => {
    render(<ComponentLibraryDialog open onClose={() => {}} />)

    fireEvent.change(screen.getByLabelText('Search Component Library'), {
      target: { value: 'Form Tabs' },
    })

    const variant = screen.getAllByLabelText('Variant')
      .find((element) => element.tagName === 'SELECT') as HTMLSelectElement
    expect(Array.from(variant.options).map((option) => option.textContent))
      .toEqual(['Horizontal', 'Vertical'])
    fireEvent.change(variant, { target: { value: 'vertical' } })
    expect(variant.value).toBe('vertical')
    expect(
      screen.getByRole('button', { name: 'Insert component' })
        .getAttribute('aria-disabled'),
    ).toBeNull()
  })
})
