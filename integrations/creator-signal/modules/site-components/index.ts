import { control, defineModule, html, raw, safeUrl } from '@core/plugin-sdk'
import { creatorSignalBrandAssets } from '../../design-system/contract'
import { creatorSignalSiteCss } from '../mautic-form'

export interface NavigationItem {
  label: string
  url: string
  emphasis?: 'default' | 'primary'
}

export interface FeatureItem {
  marker: string
  heading: string
  body: string
}

export interface FaqItem {
  question: string
  answer: string
}

export interface ComparisonItem {
  label: string
  firstValue: string
  secondValue: string
  thirdValue: string
}

export type RecoveryStateKind = 'empty' | 'error' | 'offline' | 'not-found'

const text = (value: unknown): string => typeof value === 'string' ? value : ''
const records = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : []
const recoveryStateKind = (value: unknown): RecoveryStateKind =>
  value === 'error' || value === 'offline' || value === 'not-found' ? value : 'empty'

/**
 * Every Creator Signal leaf module carries the same public design contract.
 * The publisher deduplicates byte-identical module CSS before writing the
 * site-wide bundle, so a page gets the complete contract once regardless of
 * which governed components it contains. Keeping the CSS on each module also
 * makes isolated Component Library previews faithful instead of depending on
 * a header or template side effect.
 */
const withCreatorSignalCss = (markup: string) => ({
  html: markup,
  css: creatorSignalSiteCss,
})

function navigationItems(value: unknown, primaryClass = false): ReturnType<typeof raw>[] {
  return records(value).map((item) => {
    const label = text(item.label)
    const href = safeUrl(item.url)
    const primary = primaryClass && item.emphasis === 'primary'
    return raw(html`<a${primary ? raw(' class="button button-primary"') : ''} href="${href}" itemprop="url"><span itemprop="name">${label}</span></a>`)
  })
}

export const siteHeader = defineModule({
  id: 'creator-signal.site.header',
  name: 'Site header',
  description: 'Shared Creator Signal brand and primary navigation.',
  category: 'Creator Signal',
  htmlTag: 'header',
  defaults: {
    brandName: 'Creator Signal',
    tagline: 'Clearer signals for independent creative businesses.',
    homeUrl: '/',
    items: [
      { label: 'Products', url: '/products', emphasis: 'default' },
      { label: 'Features', url: '/features', emphasis: 'default' },
      { label: 'Pricing', url: '/pricing', emphasis: 'default' },
      { label: 'Contact', url: '/contact', emphasis: 'default' },
      { label: 'Sign in', url: 'https://salespulse.creatorsignal.me', emphasis: 'primary' },
    ] as NavigationItem[],
  },
  schema: {
    brandName: control.text('Brand name'),
    tagline: control.text('Tagline'),
    homeUrl: control.url('Home URL'),
    items: control.textarea('Navigation items'),
  },
  render: ({ props }) => withCreatorSignalCss(html`<header class="site-header">
      <a class="skip-link" href="#main-content">Skip to main content</a>
      <a class="site-brand" href="${safeUrl(props.homeUrl)}" aria-label="${props.brandName} home">
        <span class="brand-mark" aria-hidden="true">
          <img class="brand-mark-light" src="${safeUrl(creatorSignalBrandAssets.markLight)}" alt="" width="1024" height="688" decoding="async">
          <img class="brand-mark-reversed" src="${safeUrl(creatorSignalBrandAssets.markReversed)}" alt="" width="1024" height="688" decoding="async">
        </span>
        <span><strong>${props.brandName}</strong><small>${props.tagline}</small></span>
      </a>
      <div class="site-header-tools">
        <label>
          <span class="sr-only">Appearance</span>
          <select class="theme-control" data-cs-theme-control aria-label="Appearance">
            <option value="system" selected>System theme</option>
            <option value="light">Light theme</option>
            <option value="dark">Dark theme</option>
          </select>
        </label>
        <nav aria-label="Main navigation" itemscope itemtype="https://schema.org/SiteNavigationElement">
          ${navigationItems(props.items, true)}
        </nav>
      </div>
    </header>`),
})

export const siteFooter = defineModule({
  id: 'creator-signal.site.footer',
  name: 'Site footer',
  description: 'Shared Creator Signal footer and service navigation.',
  category: 'Creator Signal',
  htmlTag: 'footer',
  defaults: {
    brandName: 'Creator Signal',
    tagline: 'Clearer signals for independent creative businesses.',
    copyright: '© 2026 Creator Signal',
    privacyLabel: 'Privacy choices',
    items: [
      { label: 'Products', url: '/products' },
      { label: 'Sales Pulse', url: '/products/sales-pulse' },
      { label: 'Features', url: '/features' },
      { label: 'Pricing', url: '/pricing' },
      { label: 'Contact', url: '/contact' },
      { label: 'Feedback', url: '/feedback' },
      { label: 'Join wishlist', url: '/wishlist' },
      { label: 'Ask a question', url: '/ask-a-question' },
      { label: 'Feature request', url: '/feature-request' },
      { label: 'Report an error', url: '/report-an-error' },
      { label: 'Privacy', url: '/legal/privacy' },
      { label: 'Terms', url: '/legal/terms' },
      { label: 'Status', url: 'https://status.creatorsignal.me' },
    ] as NavigationItem[],
  },
  schema: {
    brandName: control.text('Brand name'),
    tagline: control.text('Tagline'),
    copyright: control.text('Copyright'),
    privacyLabel: control.text('Privacy choices label'),
    items: control.textarea('Footer links'),
  },
  render: ({ props }) => withCreatorSignalCss(html`<footer class="site-footer">
      <div class="footer-meta">
        <div><strong>${props.brandName}</strong><p>${props.tagline}</p></div>
        <small>${props.copyright}</small>
        <button class="footer-privacy-choice" type="button" data-privacy-choices>${props.privacyLabel}</button>
      </div>
      <nav aria-label="Footer navigation" itemscope itemtype="https://schema.org/SiteNavigationElement">
        ${navigationItems(props.items)}
      </nav>
    </footer>`),
})

export const consentBanner = defineModule({
  id: 'creator-signal.site.consent-banner',
  name: 'Privacy choices',
  description: 'Shared consent notice with the analytics runtime contract.',
  category: 'Creator Signal',
  htmlTag: 'aside',
  defaults: {
    heading: 'Your privacy choices',
    body: 'Aggregate traffic measurement is enabled when configured. Optional journey analytics only runs with your permission.',
    essentialLabel: 'Essential only',
    optionalLabel: 'Allow optional analytics',
  },
  schema: {
    heading: control.text('Heading'),
    body: control.textarea('Explanation', { rows: 3 }),
    essentialLabel: control.text('Essential choice label'),
    optionalLabel: control.text('Optional choice label'),
  },
  render: ({ props }) => withCreatorSignalCss(html`<aside class="consent" data-consent-banner aria-label="Privacy choices">
      <div><strong>${props.heading}</strong><p>${props.body}</p></div>
      <div class="consent-actions">
        <button class="button button-secondary" type="button" data-analytics-choice="denied">${props.essentialLabel}</button>
        <button class="button button-primary" type="button" data-analytics-choice="granted">${props.optionalLabel}</button>
      </div>
    </aside>`),
})

export const featureGrid = defineModule({
  id: 'creator-signal.site.feature-grid',
  name: 'Feature grid',
  description: 'A labelled set of outcome-focused feature cards.',
  category: 'Creator Signal',
  htmlTag: 'section',
  defaults: {
    eyebrow: 'Capabilities',
    heading: 'A focused feature set.',
    introduction: 'Explain what this group helps the visitor do.',
    sectionId: 'features',
    items: [
      { marker: '01', heading: 'First feature', body: 'Describe the outcome, not only the mechanism.' },
      { marker: '02', heading: 'Second feature', body: 'Keep the copy short enough to scan.' },
      { marker: '03', heading: 'Third feature', body: 'Use another card only when it adds information.' },
    ] as FeatureItem[],
  },
  schema: {
    eyebrow: control.text('Eyebrow'),
    heading: control.text('Heading'),
    introduction: control.textarea('Introduction', { rows: 3 }),
    sectionId: control.text('Section anchor'),
    items: control.textarea('Feature cards'),
  },
  render: ({ props }) => {
    const items = records(props.items).map((item) => raw(html`
      <article class="feature-card">
        <span class="feature-number">${text(item.marker)}</span>
        <h3>${text(item.heading)}</h3>
        <p>${text(item.body)}</p>
      </article>`))
    return withCreatorSignalCss(html`<section class="content-section" aria-labelledby="${props.sectionId}">
        <div class="section-intro"><p class="eyebrow">${props.eyebrow}</p><h2 id="${props.sectionId}">${props.heading}</h2><p>${props.introduction}</p></div>
        <div class="feature-grid">${items}</div>
      </section>`)
  },
})

export const callToAction = defineModule({
  id: 'creator-signal.site.call-to-action',
  name: 'Call to action',
  description: 'One clear next step with supporting context.',
  category: 'Creator Signal',
  htmlTag: 'section',
  defaults: {
    eyebrow: 'Next step',
    heading: 'Give the visitor one clear next move.',
    body: 'Explain what happens after they choose it.',
    actionLabel: 'Take the next step',
    actionUrl: '#',
    sectionId: 'next-step',
  },
  schema: {
    eyebrow: control.text('Eyebrow'),
    heading: control.text('Heading'),
    body: control.textarea('Explanation', { rows: 3 }),
    actionLabel: control.text('Action label'),
    actionUrl: control.url('Action URL'),
    sectionId: control.text('Section anchor'),
  },
  render: ({ props }) => withCreatorSignalCss(html`<section class="cta-section" aria-labelledby="${props.sectionId}">
      <div class="cta-copy"><p class="eyebrow">${props.eyebrow}</p><h2 id="${props.sectionId}">${props.heading}</h2><p>${props.body}</p></div>
      <div class="actions"><a class="button button-primary" href="${safeUrl(props.actionUrl)}">${props.actionLabel}</a></div>
    </section>`),
})

export const richTextSection = defineModule({
  id: 'creator-signal.site.rich-text-section',
  name: 'Rich text section',
  description: 'A coherent block of sanitised rich text under one heading.',
  category: 'Creator Signal',
  htmlTag: 'section',
  defaults: {
    heading: 'Section heading',
    body: '<p>Write the complete text block here.</p>',
    sectionId: 'content',
  },
  schema: {
    heading: control.text('Heading'),
    body: control.richtext('Content'),
    sectionId: control.text('Section anchor'),
  },
  render: ({ props }) => withCreatorSignalCss(html`<section class="content-section narrow-content" aria-labelledby="${props.sectionId}">
      <h2 id="${props.sectionId}">${props.heading}</h2>
      <div class="prose-content">${raw(text(props.body))}</div>
    </section>`),
})

export const testimonial = defineModule({
  id: 'creator-signal.site.testimonial',
  name: 'Testimonial',
  description: 'A semantic quotation with attribution.',
  category: 'Creator Signal',
  htmlTag: 'figure',
  defaults: {
    quote: 'Add a short customer quotation that supports the page promise.',
    attribution: 'Customer name',
    role: 'Role or business',
  },
  schema: {
    quote: control.textarea('Quotation', { rows: 3 }),
    attribution: control.text('Attribution'),
    role: control.text('Role or business'),
  },
  render: ({ props }) => withCreatorSignalCss(html`<figure class="testimonial">
      <blockquote><p>“${props.quote}”</p></blockquote>
      <figcaption><strong>${props.attribution}</strong><span>${props.role}</span></figcaption>
    </figure>`),
})

export const faq = defineModule({
  id: 'creator-signal.site.faq',
  name: 'FAQ',
  description: 'A native disclosure list with FAQ structured data.',
  category: 'Creator Signal',
  htmlTag: 'section',
  defaults: {
    heading: 'Frequently asked questions',
    sectionId: 'frequently-asked-questions',
    items: [
      { question: 'What should visitors know first?', answer: 'Write a direct answer that helps the visitor decide what to do next.' },
      { question: 'Where can they get more help?', answer: 'Link to the relevant product, policy or contact route.' },
    ] as FaqItem[],
  },
  schema: {
    heading: control.text('Heading'),
    sectionId: control.text('Section anchor'),
    items: control.textarea('Questions and answers'),
  },
  render: ({ props }) => {
    const items = records(props.items).map((item) => raw(html`
      <details itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
        <summary itemprop="name">${text(item.question)}</summary>
        <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer"><p itemprop="text">${text(item.answer)}</p></div>
      </details>`))
    return withCreatorSignalCss(html`<section class="content-section narrow-content" aria-labelledby="${props.sectionId}" itemscope itemtype="https://schema.org/FAQPage">
        <h2 id="${props.sectionId}">${props.heading}</h2>
        <div class="faq-list">${items}</div>
      </section>`)
  },
})

export const comparisonSection = defineModule({
  id: 'creator-signal.site.comparison-section',
  name: 'Comparison section',
  description: 'A captioned, row-and-column comparison for plans, products or capabilities.',
  category: 'Creator Signal',
  htmlTag: 'section',
  defaults: {
    eyebrow: 'Comparison',
    heading: 'Compare the options.',
    introduction: 'Use the same criteria for every option so the differences are clear.',
    sectionId: 'comparison',
    caption: 'Creator Signal option comparison',
    firstLabel: 'First option',
    secondLabel: 'Second option',
    thirdLabel: 'Third option',
    items: [
      { label: 'Primary use', firstValue: 'Describe the first option.', secondValue: 'Describe the second option.', thirdValue: 'Describe the third option.' },
      { label: 'Availability', firstValue: 'Available', secondValue: 'Available', thirdValue: 'Available' },
    ] as ComparisonItem[],
  },
  schema: {
    eyebrow: control.text('Eyebrow'),
    heading: control.text('Heading'),
    introduction: control.textarea('Introduction', { rows: 3 }),
    sectionId: control.text('Section anchor'),
    caption: control.text('Table caption'),
    firstLabel: control.text('First option'),
    secondLabel: control.text('Second option'),
    thirdLabel: control.text('Third option'),
    items: control.textarea('Comparison rows'),
  },
  render: ({ props }) => {
    const rows = records(props.items).map((item) => raw(html`
      <tr>
        <th scope="row">${text(item.label)}</th>
        <td>${text(item.firstValue)}</td>
        <td>${text(item.secondValue)}</td>
        <td>${text(item.thirdValue)}</td>
      </tr>`))
    return withCreatorSignalCss(html`<section class="content-section comparison-section" aria-labelledby="${props.sectionId}">
        <div class="section-intro"><p class="eyebrow">${props.eyebrow}</p><h2 id="${props.sectionId}">${props.heading}</h2><p>${props.introduction}</p></div>
        <div class="comparison-table-scroll" tabindex="0" role="region" aria-label="${props.caption}">
          <table class="comparison-table">
            <caption>${props.caption}</caption>
            <thead><tr><th scope="col">Criteria</th><th scope="col">${props.firstLabel}</th><th scope="col">${props.secondLabel}</th><th scope="col">${props.thirdLabel}</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>`)
  },
})

export const recoveryState = defineModule({
  id: 'creator-signal.site.recovery-state',
  name: 'Recovery state',
  description: 'A meaningful empty, error or offline state with one recovery action.',
  category: 'Creator Signal',
  htmlTag: 'section',
  defaults: {
    state: 'empty' as RecoveryStateKind,
    heading: 'Nothing here yet',
    body: 'There is no content to show here yet.',
    actionLabel: 'Return home',
    actionUrl: '/',
    sectionId: 'recovery-state',
  },
  schema: {
    state: control.select('State', [
      { label: 'Empty', value: 'empty' },
      { label: 'Error', value: 'error' },
      { label: 'Offline', value: 'offline' },
      { label: 'Not found', value: 'not-found' },
    ]),
    heading: control.text('Heading'),
    body: control.textarea('Explanation', { rows: 3 }),
    actionLabel: control.text('Recovery action label'),
    actionUrl: control.url('Recovery action URL'),
    sectionId: control.text('Section anchor'),
  },
  render: ({ props }) => {
    const state = recoveryStateKind(props.state)
    const stateLabel = state === 'not-found'
      ? 'Page not found'
      : state === 'error'
      ? 'Something went wrong'
      : state === 'offline'
        ? 'Connection unavailable'
        : 'No content yet'
    return withCreatorSignalCss(html`<section class="recovery-state" data-recovery-state="${state}" aria-labelledby="${props.sectionId}">
        <p class="eyebrow">${stateLabel}</p>
        <h1 id="${props.sectionId}">${props.heading}</h1>
        <p>${props.body}</p>
        <div class="actions"><a class="button button-primary" href="${safeUrl(props.actionUrl)}">${props.actionLabel}</a></div>
      </section>`)
  },
})

export const publicDocument = defineModule({
  id: 'creator-signal.site.public-document',
  name: 'Public document',
  description: 'A versioned legal, trust, support or status document.',
  category: 'Creator Signal',
  htmlTag: 'article',
  defaults: {
    eyebrow: 'Creator Signal',
    heading: 'Public document',
    summary: 'A clear summary of this document.',
    body: '<p>Version and approved document content.</p>',
    dateModified: '2026-08-02',
  },
  schema: {
    eyebrow: control.text('Eyebrow'),
    heading: control.text('Document heading'),
    summary: control.textarea('Summary', { rows: 2 }),
    body: control.richtext('Document content'),
    dateModified: control.text('Date modified'),
  },
  render: ({ props }) => withCreatorSignalCss(html`<article class="public-document" itemscope itemtype="https://schema.org/Article">
      <meta itemprop="dateModified" content="${props.dateModified}">
      <header class="public-document-header"><p class="eyebrow">${props.eyebrow}</p><h1 itemprop="headline">${props.heading}</h1><p itemprop="description">${props.summary}</p></header>
      <div class="prose-content" itemprop="articleBody">${raw(text(props.body))}</div>
    </article>`),
})

export const creatorSignalSiteModules = [
  siteHeader,
  siteFooter,
  consentBanner,
  featureGrid,
  callToAction,
  richTextSection,
  testimonial,
  faq,
  comparisonSection,
  recoveryState,
  publicDocument,
] as const
