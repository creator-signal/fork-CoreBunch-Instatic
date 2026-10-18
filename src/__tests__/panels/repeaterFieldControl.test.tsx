import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import { useState } from 'react'
import type { ComponentLibraryField } from '@core/component-library'
import { RepeaterFieldControl } from '@site/panels/PropertiesPanel/RepeaterFieldControl'

afterEach(cleanup)

const field: Extract<ComponentLibraryField, { type: 'repeater' }> = {
  key: 'plans', label: 'Plans', description: 'Ordered plans.',
  type: 'repeater', required: true, itemLabel: 'Plan', minItems: 1, maxItems: 3,
  itemFields: [
    { key: 'features', label: 'Features', description: 'One feature per line.', type: 'text', required: true },
    { key: 'href', label: 'Destination', description: 'Plan destination.', type: 'url', required: true },
    { key: 'count', label: 'Count', description: 'Plan allowance.', type: 'number', required: false },
  ],
}

describe('RepeaterFieldControl text content', () => {
  it('preserves existing lines and other records through text and URL edits', () => {
    const initial = [
      { features: 'First feature\nSecond feature\nThird feature', href: 'https://example.com/first', count: 3 },
      { features: 'Another feature\nLast feature', href: 'https://example.com/second', count: 2 },
    ]
    let changed: Array<Record<string, unknown>> = []
    function Fixture() {
      const [items, setItems] = useState<Array<Record<string, unknown>>>(initial)
      return <RepeaterFieldControl field={field} value={items} disabled={false} onChange={(next) => {
        changed = next
        setItems(next)
      }}/>
    }
    render(<Fixture/>)
    const features = screen.getAllByLabelText('Features')[0] as HTMLTextAreaElement
    expect(features.tagName).toBe('TEXTAREA')
    expect(features.value).toBe(initial[0]!.features)
    expect((screen.getAllByLabelText('Features')[1] as HTMLTextAreaElement).value).toBe(initial[1]!.features)
    expect(screen.getAllByLabelText('Destination')[0]!.getAttribute('type')).toBe('url')
    expect(screen.getAllByLabelText('Count')[0]!.getAttribute('type')).toBe('number')

    const revised = 'Updated first feature\nSecond feature\nThird feature'
    fireEvent.change(features, { target: { value: revised } })
    expect(changed).toEqual([{ ...initial[0], features: revised }, initial[1]])
    expect(features.value).toBe(revised)
    fireEvent.change(screen.getAllByLabelText('Destination')[0]!, { target: { value: 'https://example.com/updated' } })
    expect(changed).toEqual([{ ...initial[0], features: revised, href: 'https://example.com/updated' }, initial[1]])
    expect(initial[0]!.features).toBe('First feature\nSecond feature\nThird feature')
  })

  it('allows new line-separated content and retains disabled semantics', () => {
    let changed: Array<Record<string, unknown>> = []
    const props = { field, value: [{ features: '', href: '', count: 0 }], onChange: (next: Array<Record<string, unknown>>) => { changed = next } }
    const view = render(<RepeaterFieldControl {...props} disabled={false}/>)
    fireEvent.change(screen.getByLabelText('Features'), { target: { value: 'One\nTwo' } })
    expect(changed[0]!.features).toBe('One\nTwo')
    view.rerender(<RepeaterFieldControl {...props} disabled/>)
    expect((screen.getByLabelText('Features') as HTMLTextAreaElement).disabled).toBe(true)
  })
})
