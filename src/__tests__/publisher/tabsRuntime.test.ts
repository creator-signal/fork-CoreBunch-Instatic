import { describe, expect, it } from 'bun:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { TABS_RUNTIME_JS } from '@modules/base/disclosure/tabsRuntimeJs'

describe('tabs runtime browser behavior', () => {
  it('progressively adds tab semantics, roving focus and keyboard activation', async () => {
    document.body.innerHTML = `
      <div data-instatic-tabs data-instatic-tabs-orientation="horizontal" data-instatic-tabs-activation="automatic" aria-label="Profile sections">
        <section data-instatic-tab-panel="profile" data-instatic-tab-label="Profile">Profile content</section>
        <section data-instatic-tab-panel="security" data-instatic-tab-label="Security" data-instatic-tab-selected="true">Security content</section>
        <section data-instatic-tab-panel="disabled" data-instatic-tab-label="Disabled" data-instatic-tab-disabled="true">Disabled content</section>
      </div>
    `
    const panelsBeforeRuntime = Array.from(
      document.querySelectorAll<HTMLElement>('[data-instatic-tab-panel]'),
    )
    expect(panelsBeforeRuntime.every((panel) => !panel.hidden)).toBe(true)

    await importRuntimeScript(TABS_RUNTIME_JS)

    const tabs = document.querySelector<HTMLElement>('[data-instatic-tabs]')
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    )
    const panels = Array.from(
      document.querySelectorAll<HTMLElement>('[role="tabpanel"]'),
    )
    expect(tabs?.querySelector('[role="tablist"]')?.getAttribute('aria-label'))
      .toBe('Profile sections')
    expect(buttons.map((button) => button.textContent)).toEqual([
      'Profile',
      'Security',
      'Disabled',
    ])
    expect(buttons[2]?.disabled).toBe(true)
    expect(buttons[1]?.getAttribute('aria-selected')).toBe('true')
    expect(panels[1]?.hidden).toBe(false)
    expect(panels[0]?.hidden).toBe(true)

    buttons[1]?.focus()
    buttons[1]?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    )
    expect(document.activeElement).toBe(buttons[0])
    expect(buttons[0]?.getAttribute('aria-selected')).toBe('true')
    expect(panels[0]?.hidden).toBe(false)
    expect(panels[1]?.hidden).toBe(true)

    document.body.innerHTML = ''
  })
})

let runtimeImportCounter = 0

async function importRuntimeScript(source: string): Promise<void> {
  runtimeImportCounter += 1
  const dir = join(process.cwd(), '.tmp', 'tabs-runtime-tests')
  await mkdir(dir, { recursive: true })
  const path = join(dir, `runtime-${runtimeImportCounter}.mjs`)
  await writeFile(path, source, 'utf8')
  await import(`${pathToFileURL(path).href}?v=${runtimeImportCounter}`)
}
