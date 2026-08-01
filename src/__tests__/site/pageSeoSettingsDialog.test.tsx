import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PageSeoSettingsDialog } from '@admin/shared/dialogs/PageSeoSettingsDialog'
import { makePage } from '../fixtures'

afterEach(cleanup)

describe('PageSeoSettingsDialog', () => {
  it('authors page search, robots and social metadata through governed fields', () => {
    const page = makePage()
    let saved: Parameters<typeof PageSeoSettingsDialog>[0]['page']['seo']

    render(
      <PageSeoSettingsDialog
        page={page}
        onCancel={() => {}}
        onSave={(seo) => { saved = seo }}
      />,
    )

    fireEvent.change(screen.getByLabelText('Search title'), { target: { value: 'Search title override' } })
    fireEvent.change(screen.getByLabelText('Search description'), { target: { value: 'Search description override' } })
    fireEvent.change(screen.getByLabelText('Canonical URL'), { target: { value: '/preferred' } })
    fireEvent.change(screen.getByLabelText('Page language'), { target: { value: 'en-AU' } })
    fireEvent.click(screen.getByLabelText('Allow indexing'))
    fireEvent.change(screen.getByLabelText('Open Graph image'), { target: { value: '/media/card.jpg' } })
    fireEvent.change(screen.getByLabelText('Open Graph image alternative'), { target: { value: 'Preview card' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(saved).toMatchObject({
      title: 'Search title override',
      description: 'Search description override',
      canonicalUrl: '/preferred',
      language: 'en-AU',
      robots: { index: false, follow: true, archive: true },
      openGraph: { type: 'website', imageUrl: '/media/card.jpg', imageAlt: 'Preview card' },
      twitter: { card: 'summary' },
    })
  })

  it('blocks save when a metadata URL uses an unsafe scheme', () => {
    render(
      <PageSeoSettingsDialog page={makePage()} onCancel={() => {}} onSave={() => {}} />,
    )

    fireEvent.change(screen.getByLabelText('Canonical URL'), {
      target: { value: 'javascript:alert(1)' },
    })

    expect(screen.getByRole('alert').textContent).toContain('HTTP(S) URL')
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('can remove every page override and return to site defaults', () => {
    const page = makePage()
    page.seo = { title: 'Override' }
    let saved = page.seo

    render(
      <PageSeoSettingsDialog
        page={page}
        onCancel={() => {}}
        onSave={(seo) => { saved = seo }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Reset to site defaults' }))

    expect(saved).toBeUndefined()
  })
})
