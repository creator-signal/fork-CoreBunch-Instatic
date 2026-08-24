import { afterEach, describe, expect, it } from 'bun:test'
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { SlotInstanceEditor } from '@modules/base/slotInstance/SlotInstanceEditor'

afterEach(cleanup)

const defaultProps = {
  props: { slotName: 'left' },
  breakpointId: undefined,
  nodeId: 'slot-left',
}

describe('SlotInstanceEditor WYSIWYG surface', () => {
  it('keeps an empty slot discoverable as a drop target', () => {
    const { container } = render(
      <SlotInstanceEditor {...defaultProps}>{[]}</SlotInstanceEditor>,
    )

    expect(screen.getByText('Empty left slot')).toBeDefined()
    expect(container.querySelector('[data-instatic-slot-instance]')).not.toBeNull()
  })

  it('removes editor scaffolding around populated slot content', () => {
    const { container } = render(
      <SlotInstanceEditor {...defaultProps}>
        <section>Rendered page content</section>
      </SlotInstanceEditor>,
    )

    expect(screen.queryByText(/slot/i)).toBeNull()
    expect(screen.getByText('Rendered page content')).toBeDefined()
    expect(container.querySelector('[data-instatic-slot-instance]')).not.toBeNull()
    expect(container.querySelector('[data-instatic-slot-instance-header]')).toBeNull()
  })
})
