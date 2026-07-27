import { describe, expect, it } from 'bun:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { PROVIDER_EMBED_RUNTIME_JS } from '@modules/base/providerEmbed/providerEmbedRuntimeJs'

describe('provider embed runtime browser behavior', () => {
  it('does not create a non-essential iframe before activation', async () => {
    document.body.innerHTML = hostMarkup('marketing')

    await importRuntimeScript(PROVIDER_EMBED_RUNTIME_JS)

    expect(document.querySelector('iframe')).toBeNull()
    document.querySelector<HTMLButtonElement>(
      '[data-instatic-provider-load]',
    )?.click()

    const frame = document.querySelector<HTMLIFrameElement>('iframe')
    expect(frame?.src).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
    expect(frame?.title).toBe('Product walkthrough')
    expect(frame?.getAttribute('sandbox')).toContain('allow-scripts')
    expect(frame?.getAttribute('allow')).toContain('fullscreen')
    expect(frame?.referrerPolicy).toBe('strict-origin-when-cross-origin')
    document.body.innerHTML = ''
  })

  it('loads after the matching consent category is granted', async () => {
    document.body.innerHTML = hostMarkup('preferences')
    await importRuntimeScript(PROVIDER_EMBED_RUNTIME_JS)

    document.dispatchEvent(
      new CustomEvent('instatic:consent-changed', {
        detail: { categories: ['preferences'] },
      }),
    )

    expect(document.querySelector('iframe')).not.toBeNull()
    document.body.innerHTML = ''
  })
})

function hostMarkup(consent: string): string {
  return `
    <div data-instatic-provider-embed
      data-instatic-provider-consent="${consent}"
      data-instatic-provider-src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
      data-instatic-provider-title="Product walkthrough"
      data-instatic-provider-sandbox="allow-same-origin allow-scripts"
      data-instatic-provider-referrer="strict-origin-when-cross-origin"
      data-instatic-provider-allow="fullscreen; picture-in-picture"
      data-instatic-provider-aspect="16 / 9">
      <button type="button" data-instatic-provider-load>Load YouTube</button>
    </div>
  `
}

let runtimeImportCounter = 0

async function importRuntimeScript(source: string): Promise<void> {
  runtimeImportCounter += 1
  delete (window as Window & {
    __instaticProviderEmbedRuntimeLoaded?: boolean
  }).__instaticProviderEmbedRuntimeLoaded
  const dir = join(process.cwd(), '.tmp', 'provider-embed-runtime-tests')
  await mkdir(dir, { recursive: true })
  const path = join(dir, `runtime-${runtimeImportCounter}.mjs`)
  await writeFile(path, source, 'utf8')
  await import(`${pathToFileURL(path).href}?v=${runtimeImportCounter}`)
}
