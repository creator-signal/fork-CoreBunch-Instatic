import { describe, expect, it } from 'bun:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { INTERACTIVE_RUNTIME_JS } from '@modules/base/interactive/interactiveRuntimeJs'

describe('interactive component runtime browser behavior', () => {
  it('enhances overlay focus and carousel controls without weakening fallbacks', async () => {
    document.body.innerHTML = `
      <button id="outside-control" type="button">Outside</button>
      <details data-instatic-overlay data-instatic-overlay-kind="dialog"
        data-instatic-overlay-dismiss-escape="true"
        data-instatic-overlay-dismiss-backdrop="true">
        <summary data-instatic-overlay-trigger>Open help</summary>
        <div data-instatic-overlay-panel aria-label="Help">
          <button type="button" data-instatic-overlay-close>Close</button>
          <a href="/help">Read help</a>
        </div>
      </details>
      <section data-instatic-carousel data-instatic-carousel-autoplay="false"
        data-instatic-carousel-interval="5000" aria-label="Highlights">
        <p data-instatic-carousel-status aria-live="polite"></p>
        <div data-instatic-carousel-track>
          <article>One</article>
          <article>Two</article>
          <article>Three</article>
        </div>
        <button type="button" data-instatic-carousel-action="previous">Previous</button>
        <button type="button" data-instatic-carousel-action="next">Next</button>
      </section>
    `

    const slidesBefore = Array.from(
      document.querySelectorAll<HTMLElement>('[data-instatic-carousel-track] > *'),
    )
    expect(slidesBefore.every((slide) => !slide.hidden)).toBe(true)

    await importRuntimeScript(INTERACTIVE_RUNTIME_JS)

    const overlay = document.querySelector<HTMLDetailsElement>(
      '[data-instatic-overlay]',
    )!
    const trigger = overlay.querySelector<HTMLElement>(
      '[data-instatic-overlay-trigger]',
    )!
    const close = overlay.querySelector<HTMLButtonElement>(
      '[data-instatic-overlay-close]',
    )!
    const lastLink = overlay.querySelector<HTMLAnchorElement>('a')!

    trigger.focus()
    trigger.click()
    expect(overlay.open).toBe(true)
    expect(
      overlay.querySelector('[data-instatic-overlay-panel]')?.getAttribute('role'),
    ).toBe('dialog')
    expect(document.activeElement).toBe(close)

    close.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
      }),
    )
    expect(document.activeElement).toBe(lastLink)

    document.querySelector<HTMLButtonElement>('#outside-control')!.focus()
    expect(document.activeElement).toBe(close)

    lastLink.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
    expect(overlay.open).toBe(false)
    expect(document.activeElement).toBe(trigger)

    const slides = Array.from(
      document.querySelectorAll<HTMLElement>('[data-instatic-carousel-track] > *'),
    )
    const next = document.querySelector<HTMLButtonElement>(
      '[data-instatic-carousel-action="next"]',
    )!
    expect(slides[0]?.hidden).toBe(false)
    expect(slides[1]?.hidden).toBe(true)

    next.click()
    expect(slides[0]?.hidden).toBe(true)
    expect(slides[1]?.hidden).toBe(false)
    expect(
      document.querySelector('[data-instatic-carousel-status]')?.textContent,
    ).toBe('Slide 2 of 3')

    next.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
    )
    expect(slides[0]?.hidden).toBe(false)
    expect(slides[1]?.hidden).toBe(true)

    document.body.innerHTML = ''
  })
})

let runtimeImportCounter = 0

async function importRuntimeScript(source: string): Promise<void> {
  runtimeImportCounter += 1
  const dir = join(process.cwd(), '.tmp', 'interactive-runtime-tests')
  await mkdir(dir, { recursive: true })
  const path = join(dir, `runtime-${runtimeImportCounter}.mjs`)
  await writeFile(path, source, 'utf8')
  await import(`${pathToFileURL(path).href}?v=${runtimeImportCounter}`)
}
