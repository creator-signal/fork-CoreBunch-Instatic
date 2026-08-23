import { describe, expect, it } from 'bun:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import crmIframeForm, {
  CRM_IFRAME_FORM_MESSAGE_TYPE,
  CRM_IFRAME_FORM_MAX_HEIGHT,
  CRM_IFRAME_FORM_MIN_HEIGHT,
  crmIframeFormHeights,
  crmIframeFormOrigin,
} from '../../../integrations/creator-signal/modules/crm-iframe-form'

describe('Creator Signal Embedded CRM Form', () => {
  it('accepts only the approved HTTPS Mautic origin', () => {
    expect(crmIframeFormOrigin('https://marketing.creatorsignal.me/form/contact'))
      .toBe('https://marketing.creatorsignal.me')
    expect(crmIframeFormOrigin('http://marketing.creatorsignal.me/form/contact'))
      .toBeNull()
    expect(crmIframeFormOrigin('https://marketing.creatorsignal.me.evil.example/form/contact'))
      .toBeNull()
    expect(crmIframeFormOrigin('not a URL')).toBeNull()
  })

  it('bounds every author-provided height before publishing', () => {
    expect(crmIframeFormHeights({
      initialHeight: 99_999,
      minimumHeight: 0,
      maximumHeight: -50,
    })).toEqual({
      initial: CRM_IFRAME_FORM_MIN_HEIGHT,
      minimum: CRM_IFRAME_FORM_MIN_HEIGHT,
      maximum: CRM_IFRAME_FORM_MIN_HEIGHT,
    })
    expect(crmIframeFormHeights({
      initialHeight: 720,
      minimumHeight: 320,
      maximumHeight: 99_999,
    })).toEqual({
      initial: 720,
      minimum: 320,
      maximum: CRM_IFRAME_FORM_MAX_HEIGHT,
    })
  })

  it('publishes an accessible iframe, fallback link, safe CSP source and resize runtime', () => {
    const output = crmIframeForm.render({
      ...crmIframeForm.defaults,
      sectionId: 'newsletter-form',
      formUrl: 'https://marketing.creatorsignal.me/form/newsletter?source=site',
      iframeTitle: 'Newsletter signup form',
      initialHeight: 680,
      minimumHeight: 280,
      maximumHeight: 1800,
    }, [])

    expect(output.html).toContain('data-cs-crm-iframe-form')
    expect(output.html).toContain('data-cs-crm-form-instance="newsletter-form"')
    expect(output.html).toContain('title="Newsletter signup form"')
    expect(output.html).toContain('style="height:680px"')
    expect(output.html).toContain('target="_blank"')
    expect(output.html).toContain('rel="noopener noreferrer"')
    expect(output.html).toContain('role="status"')
    expect(output.js).toContain(CRM_IFRAME_FORM_MESSAGE_TYPE)
    expect(output.js).toContain("event.origin !== origin || event.source !== frame.contentWindow")
    expect(output.cspSources).toEqual([{
      directive: 'frame-src',
      sources: ['https://marketing.creatorsignal.me'],
    }])
  })

  it('fails closed without an iframe or CSP relaxation for an unapproved form URL', () => {
    const output = crmIframeForm.render({
      ...crmIframeForm.defaults,
      formUrl: 'https://untrusted.example/form/contact',
    }, [])

    expect(output.html).not.toContain('<iframe')
    expect(output.html).toContain('role="status"')
    expect(output.js).toBeUndefined()
    expect(output.cspSources).toBeUndefined()
  })

  it('resizes only from the exact iframe origin, source and message shape', async () => {
    const output = crmIframeForm.render({
      ...crmIframeForm.defaults,
      sectionId: 'feedback-frame',
      initialHeight: 640,
      minimumHeight: 300,
      maximumHeight: 900,
    }, [])
    document.body.innerHTML = output.html

    try {
      await importRuntimeScript(output.js!)
      const frame = document.querySelector<HTMLIFrameElement>('[data-cs-crm-form-frame]')
      expect(frame).not.toBeNull()

      window.dispatchEvent(new window.MessageEvent('message', {
        origin: 'https://marketing.creatorsignal.me',
        source: frame!.contentWindow,
        data: {
          type: CRM_IFRAME_FORM_MESSAGE_TYPE,
          instanceId: 'feedback-frame',
          height: 840,
        },
      }))
      expect(frame?.style.height).toBe('840px')

      window.dispatchEvent(new window.MessageEvent('message', {
        origin: 'https://evil.example',
        source: frame!.contentWindow,
        data: {
          type: CRM_IFRAME_FORM_MESSAGE_TYPE,
          instanceId: 'feedback-frame',
          height: 500,
        },
      }))
      expect(frame?.style.height).toBe('840px')

      window.dispatchEvent(new window.MessageEvent('message', {
        origin: 'https://marketing.creatorsignal.me',
        source: window,
        data: {
          type: CRM_IFRAME_FORM_MESSAGE_TYPE,
          instanceId: 'feedback-frame',
          height: 500,
        },
      }))
      expect(frame?.style.height).toBe('840px')

      window.dispatchEvent(new window.MessageEvent('message', {
        origin: 'https://marketing.creatorsignal.me',
        source: frame!.contentWindow,
        data: {
          type: CRM_IFRAME_FORM_MESSAGE_TYPE,
          instanceId: 'feedback-frame',
          height: 99_999,
        },
      }))
      expect(frame?.style.height).toBe('900px')
    } finally {
      cleanupRuntime()
      document.body.innerHTML = ''
    }
  })
})

let runtimeImportCounter = 0

async function importRuntimeScript(source: string): Promise<void> {
  runtimeImportCounter += 1
  const dir = join(process.cwd(), '.tmp', 'crm-iframe-form-runtime-tests')
  await mkdir(dir, { recursive: true })
  const path = join(dir, `runtime-${runtimeImportCounter}.mjs`)
  await writeFile(path, source, 'utf8')
  await import(`${pathToFileURL(path).href}?v=${runtimeImportCounter}`)
}

function cleanupRuntime(): void {
  const runtimeWindow = window as unknown as Record<string, unknown>
  const cleanup = runtimeWindow.__creatorSignalCrmIframeFormRuntimeCleanup
  if (typeof cleanup === 'function') cleanup()
}
