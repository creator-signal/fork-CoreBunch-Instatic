import { useId, useRef, useState, type FormEvent } from 'react'
import type { Page, PageSeo } from '@core/page-tree'
import { Button } from '@ui/components/Button'
import { Checkbox } from '@ui/components/Checkbox'
import { Dialog } from '@ui/components/Dialog'
import { Input, Textarea } from '@ui/components/Input'
import { Select } from '@ui/components/Select'
import styles from './PageSeoSettingsDialog.module.css'

interface PageSeoSettingsDialogProps {
  page: Page
  onCancel: () => void
  onSave: (seo: PageSeo | undefined) => void
}

const FORM_ID = 'page-seo-settings-form'

const OPEN_GRAPH_TYPES = [
  { value: 'website', label: 'Website' },
  { value: 'article', label: 'Article' },
  { value: 'profile', label: 'Profile' },
]

const TWITTER_CARDS = [
  { value: 'summary', label: 'Summary' },
  { value: 'summary_large_image', label: 'Summary with large image' },
]

function clean(value: string): string | undefined {
  return value.trim() || undefined
}

function metadataUrlError(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith('/')) return null
  try {
    const parsed = new URL(trimmed)
    return ['http:', 'https:'].includes(parsed.protocol)
      ? null
      : 'Use an HTTP(S) URL or a root-relative path.'
  } catch {
    return 'Use an HTTP(S) URL or a root-relative path.'
  }
}

export function PageSeoSettingsDialog({
  page,
  onCancel,
  onSave,
}: PageSeoSettingsDialogProps) {
  const seo = page.seo
  const [title, setTitle] = useState(seo?.title ?? '')
  const [description, setDescription] = useState(seo?.description ?? '')
  const [canonicalUrl, setCanonicalUrl] = useState(seo?.canonicalUrl ?? '')
  const [language, setLanguage] = useState(seo?.language ?? '')
  const [robotsIndex, setRobotsIndex] = useState(seo?.robots?.index ?? true)
  const [robotsFollow, setRobotsFollow] = useState(seo?.robots?.follow ?? true)
  const [robotsArchive, setRobotsArchive] = useState(seo?.robots?.archive ?? true)
  const [alternates, setAlternates] = useState(
    () => seo?.alternates?.map((alternate) => ({ ...alternate })) ?? [],
  )
  const [openGraphTitle, setOpenGraphTitle] = useState(seo?.openGraph?.title ?? '')
  const [openGraphDescription, setOpenGraphDescription] = useState(seo?.openGraph?.description ?? '')
  const [openGraphImageUrl, setOpenGraphImageUrl] = useState(seo?.openGraph?.imageUrl ?? '')
  const [openGraphImageAlt, setOpenGraphImageAlt] = useState(seo?.openGraph?.imageAlt ?? '')
  const [openGraphType, setOpenGraphType] = useState(seo?.openGraph?.type ?? 'website')
  const [twitterTitle, setTwitterTitle] = useState(seo?.twitter?.title ?? '')
  const [twitterDescription, setTwitterDescription] = useState(seo?.twitter?.description ?? '')
  const [twitterImageUrl, setTwitterImageUrl] = useState(seo?.twitter?.imageUrl ?? '')
  const [twitterImageAlt, setTwitterImageAlt] = useState(seo?.twitter?.imageAlt ?? '')
  const [twitterCard, setTwitterCard] = useState(seo?.twitter?.card ?? 'summary')
  const titleRef = useRef<HTMLInputElement>(null)
  const idPrefix = useId()

  const canonicalError = metadataUrlError(canonicalUrl)
  const openGraphImageError = metadataUrlError(openGraphImageUrl)
  const twitterImageError = metadataUrlError(twitterImageUrl)
  const alternateErrors = alternates.map((alternate) => ({
    language: alternate.url.trim() && !alternate.language.trim()
      ? 'Add a language code.'
      : null,
    url: alternate.language.trim() && !alternate.url.trim()
      ? 'Add a URL or path.'
      : metadataUrlError(alternate.url),
  }))
  const invalid = Boolean(
    canonicalError
    || openGraphImageError
    || twitterImageError
    || alternateErrors.some((error) => error.language || error.url),
  )

  function updateAlternate(index: number, patch: Partial<{ language: string; url: string }>) {
    setAlternates((current) => current.map((alternate, alternateIndex) =>
      alternateIndex === index ? { ...alternate, ...patch } : alternate,
    ))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (invalid) return

    onSave({
      ...(clean(title) ? { title: clean(title) } : {}),
      ...(clean(description) ? { description: clean(description) } : {}),
      ...(clean(canonicalUrl) ? { canonicalUrl: clean(canonicalUrl) } : {}),
      ...(clean(language) ? { language: clean(language) } : {}),
      robots: {
        index: robotsIndex,
        follow: robotsFollow,
        archive: robotsArchive,
      },
      ...(alternates.length > 0
        ? {
            alternates: alternates.map((alternate) => ({
              language: alternate.language.trim(),
              url: alternate.url.trim(),
            })),
          }
        : {}),
      openGraph: {
        type: openGraphType,
        ...(clean(openGraphTitle) ? { title: clean(openGraphTitle) } : {}),
        ...(clean(openGraphDescription) ? { description: clean(openGraphDescription) } : {}),
        ...(clean(openGraphImageUrl) ? { imageUrl: clean(openGraphImageUrl) } : {}),
        ...(clean(openGraphImageAlt) ? { imageAlt: clean(openGraphImageAlt) } : {}),
      },
      twitter: {
        card: twitterCard,
        ...(clean(twitterTitle) ? { title: clean(twitterTitle) } : {}),
        ...(clean(twitterDescription) ? { description: clean(twitterDescription) } : {}),
        ...(clean(twitterImageUrl) ? { imageUrl: clean(twitterImageUrl) } : {}),
        ...(clean(twitterImageAlt) ? { imageAlt: clean(twitterImageAlt) } : {}),
      },
    })
  }

  return (
    <Dialog
      open
      onClose={onCancel}
      title={`SEO settings · ${page.title}`}
      size="lg"
      initialFocusRef={titleRef}
      footer={
        <>
          <Button variant="ghost" size="sm" type="button" onClick={() => onSave(undefined)}>
            Reset to site defaults
          </Button>
          <span className={styles.footerSpacer} />
          <Button variant="secondary" size="sm" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" form={FORM_ID} disabled={invalid}>
            Save
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className={styles.form} onSubmit={handleSubmit}>
        <section className={styles.section} aria-labelledby={`${idPrefix}-search`}>
          <div className={styles.sectionHeading}>
            <h3 id={`${idPrefix}-search`}>Search and language</h3>
            <p>Blank fields inherit the site defaults.</p>
          </div>
          <div className={styles.field}>
            <label htmlFor={`${idPrefix}-title`} className={styles.label}>Search title</label>
            <Input
              id={`${idPrefix}-title`}
              ref={titleRef}
              fieldSize="sm"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor={`${idPrefix}-description`} className={styles.label}>Search description</label>
            <Textarea
              id={`${idPrefix}-description`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>
          <div className={styles.twoColumn}>
            <div className={styles.field}>
              <label htmlFor={`${idPrefix}-canonical`} className={styles.label}>Canonical URL</label>
              <Input
                id={`${idPrefix}-canonical`}
                fieldSize="sm"
                value={canonicalUrl}
                onChange={(event) => setCanonicalUrl(event.target.value)}
                placeholder="/preferred-path"
                invalid={Boolean(canonicalError)}
              />
              {canonicalError && <p role="alert" className={styles.error}>{canonicalError}</p>}
            </div>
            <div className={styles.field}>
              <label htmlFor={`${idPrefix}-language`} className={styles.label}>Page language</label>
              <Input
                id={`${idPrefix}-language`}
                fieldSize="sm"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                placeholder="en-AU"
              />
            </div>
          </div>
          <div className={styles.checkboxGroup} aria-label="Search engine directives">
            <label className={styles.checkboxRow}>
              <Checkbox checked={robotsIndex} onCheckedChange={setRobotsIndex} />
              Allow indexing
            </label>
            <label className={styles.checkboxRow}>
              <Checkbox checked={robotsFollow} onCheckedChange={setRobotsFollow} />
              Follow links
            </label>
            <label className={styles.checkboxRow}>
              <Checkbox checked={robotsArchive} onCheckedChange={setRobotsArchive} />
              Allow cached copies
            </label>
          </div>
        </section>

        <section className={styles.section} aria-labelledby={`${idPrefix}-alternates`}>
          <div className={styles.sectionHeadingRow}>
            <div className={styles.sectionHeading}>
              <h3 id={`${idPrefix}-alternates`}>Language alternates</h3>
              <p>Use a language code such as en-AU, fr, or x-default.</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setAlternates((current) => [...current, { language: '', url: '' }])}
            >
              Add alternate
            </Button>
          </div>
          {alternates.length === 0 ? (
            <p className={styles.emptyState}>No language alternates configured.</p>
          ) : (
            <div className={styles.alternateList}>
              {alternates.map((alternate, index) => (
                <div className={styles.alternateRow} key={`${idPrefix}-alternate-${index}`}>
                  <div className={styles.field}>
                    <label htmlFor={`${idPrefix}-alternate-language-${index}`} className={styles.label}>
                      Language
                    </label>
                    <Input
                      id={`${idPrefix}-alternate-language-${index}`}
                      fieldSize="sm"
                      value={alternate.language}
                      onChange={(event) => updateAlternate(index, { language: event.target.value })}
                      invalid={Boolean(alternateErrors[index]?.language)}
                    />
                    {alternateErrors[index]?.language && (
                      <p role="alert" className={styles.error}>{alternateErrors[index].language}</p>
                    )}
                  </div>
                  <div className={styles.field}>
                    <label htmlFor={`${idPrefix}-alternate-url-${index}`} className={styles.label}>URL or path</label>
                    <Input
                      id={`${idPrefix}-alternate-url-${index}`}
                      fieldSize="sm"
                      value={alternate.url}
                      onChange={(event) => updateAlternate(index, { url: event.target.value })}
                      invalid={Boolean(alternateErrors[index]?.url)}
                    />
                    {alternateErrors[index]?.url && (
                      <p role="alert" className={styles.error}>{alternateErrors[index].url}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setAlternates((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    aria-label={`Remove alternate ${index + 1}`}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={styles.section} aria-labelledby={`${idPrefix}-social`}>
          <div className={styles.sectionHeading}>
            <h3 id={`${idPrefix}-social`}>Social previews</h3>
            <p>Blank copy inherits the search title and description. Images may use a media path or absolute URL.</p>
          </div>
          <div className={styles.twoColumn}>
            <div className={styles.field}>
              <label htmlFor={`${idPrefix}-og-type`} className={styles.label}>Open Graph type</label>
              <Select
                id={`${idPrefix}-og-type`}
                fieldSize="sm"
                value={openGraphType}
                onChange={(event) => setOpenGraphType(event.target.value as typeof openGraphType)}
                options={OPEN_GRAPH_TYPES}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`${idPrefix}-twitter-card`} className={styles.label}>Twitter card</label>
              <Select
                id={`${idPrefix}-twitter-card`}
                fieldSize="sm"
                value={twitterCard}
                onChange={(event) => setTwitterCard(event.target.value as typeof twitterCard)}
                options={TWITTER_CARDS}
              />
            </div>
          </div>
          <div className={styles.twoColumn}>
            <div className={styles.field}>
              <label htmlFor={`${idPrefix}-og-title`} className={styles.label}>Open Graph title</label>
              <Input id={`${idPrefix}-og-title`} fieldSize="sm" value={openGraphTitle} onChange={(event) => setOpenGraphTitle(event.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor={`${idPrefix}-twitter-title`} className={styles.label}>Twitter title</label>
              <Input id={`${idPrefix}-twitter-title`} fieldSize="sm" value={twitterTitle} onChange={(event) => setTwitterTitle(event.target.value)} />
            </div>
          </div>
          <div className={styles.twoColumn}>
            <div className={styles.field}>
              <label htmlFor={`${idPrefix}-og-description`} className={styles.label}>Open Graph description</label>
              <Textarea id={`${idPrefix}-og-description`} rows={3} value={openGraphDescription} onChange={(event) => setOpenGraphDescription(event.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor={`${idPrefix}-twitter-description`} className={styles.label}>Twitter description</label>
              <Textarea id={`${idPrefix}-twitter-description`} rows={3} value={twitterDescription} onChange={(event) => setTwitterDescription(event.target.value)} />
            </div>
          </div>
          <div className={styles.twoColumn}>
            <div className={styles.field}>
              <label htmlFor={`${idPrefix}-og-image`} className={styles.label}>Open Graph image</label>
              <Input
                id={`${idPrefix}-og-image`}
                fieldSize="sm"
                value={openGraphImageUrl}
                onChange={(event) => setOpenGraphImageUrl(event.target.value)}
                invalid={Boolean(openGraphImageError)}
              />
              {openGraphImageError && <p role="alert" className={styles.error}>{openGraphImageError}</p>}
            </div>
            <div className={styles.field}>
              <label htmlFor={`${idPrefix}-twitter-image`} className={styles.label}>Twitter image</label>
              <Input
                id={`${idPrefix}-twitter-image`}
                fieldSize="sm"
                value={twitterImageUrl}
                onChange={(event) => setTwitterImageUrl(event.target.value)}
                invalid={Boolean(twitterImageError)}
              />
              {twitterImageError && <p role="alert" className={styles.error}>{twitterImageError}</p>}
            </div>
          </div>
          <div className={styles.twoColumn}>
            <div className={styles.field}>
              <label htmlFor={`${idPrefix}-og-image-alt`} className={styles.label}>Open Graph image alternative</label>
              <Input
                id={`${idPrefix}-og-image-alt`}
                fieldSize="sm"
                value={openGraphImageAlt}
                onChange={(event) => setOpenGraphImageAlt(event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`${idPrefix}-twitter-image-alt`} className={styles.label}>Twitter image alternative</label>
              <Input
                id={`${idPrefix}-twitter-image-alt`}
                fieldSize="sm"
                value={twitterImageAlt}
                onChange={(event) => setTwitterImageAlt(event.target.value)}
              />
            </div>
          </div>
        </section>
      </form>
    </Dialog>
  )
}
