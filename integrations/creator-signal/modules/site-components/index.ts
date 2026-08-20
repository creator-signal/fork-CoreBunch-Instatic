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

export interface SignalStripItem {
  text: string
}

export interface PricingPlan {
  name: string
  price: string
  cadence: string
  description: string
  features: string
  actionLabel: string
  actionUrl: string
  emphasis?: 'default' | 'featured'
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
// The publisher escapes scalar text controls before render(). Emit that
// already-safe value without asking the SDK template tag to escape it again.
// Repeater/object values are not recursively escaped and must still use text().
const escapedProp = (value: unknown): ReturnType<typeof raw> => raw(text(value))
const records = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : []
const recoveryStateKind = (value: unknown): RecoveryStateKind =>
  value === 'error' || value === 'offline' || value === 'not-found' ? value : 'empty'
const lines = (value: unknown): string[] => text(value)
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)

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
      { label: 'How it works', url: '/#how-it-works', emphasis: 'default' },
      { label: 'Features', url: '/#features', emphasis: 'default' },
      { label: 'Pricing', url: '/#pricing', emphasis: 'default' },
      { label: 'About', url: '/#about', emphasis: 'default' },
      { label: 'FAQ', url: '/#faq', emphasis: 'default' },
      { label: 'Log in', url: 'https://salespulse.creatorsignal.me/api/auth/login?returnTo=/sales-pulse', emphasis: 'default' },
      { label: 'Get started free', url: 'https://salespulse.creatorsignal.me/sign-up', emphasis: 'primary' },
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
      <a class="site-brand" href="${safeUrl(props.homeUrl)}" aria-label="${escapedProp(props.brandName)} home">
        <span class="brand-mark" aria-hidden="true">
          <img class="brand-mark-light" src="${safeUrl(creatorSignalBrandAssets.markLight)}" alt="" width="1024" height="688" decoding="async">
          <img class="brand-mark-reversed" src="${safeUrl(creatorSignalBrandAssets.markReversed)}" alt="" width="1024" height="688" decoding="async">
        </span>
        <span><strong>${escapedProp(props.brandName)}</strong><small>${escapedProp(props.tagline)}</small></span>
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
      { label: 'Early access', url: '/early-access' },
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
        <div><strong>${escapedProp(props.brandName)}</strong><p>${escapedProp(props.tagline)}</p></div>
        <small>${escapedProp(props.copyright)}</small>
        <button class="footer-privacy-choice" type="button" data-privacy-choices>${escapedProp(props.privacyLabel)}</button>
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
      <div><strong>${escapedProp(props.heading)}</strong><p>${escapedProp(props.body)}</p></div>
      <div class="consent-actions">
        <button class="button button-secondary" type="button" data-analytics-choice="denied">${escapedProp(props.essentialLabel)}</button>
        <button class="button button-primary" type="button" data-analytics-choice="granted">${escapedProp(props.optionalLabel)}</button>
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
    tone: 'default',
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
    tone: control.select('Tone', [
      { label: 'Default', value: 'default' },
      { label: 'Signature', value: 'signature' },
    ]),
    items: control.textarea('Feature cards'),
  },
  render: ({ props }) => {
    const recordsValue = records(props.items)
    const items = recordsValue.map((item) => raw(html`
      <article class="feature-card">
        <span class="feature-number">${text(item.marker)}</span>
        <h3>${text(item.heading)}</h3>
        <p>${text(item.body)}</p>
      </article>`))
    const count = Math.min(Math.max(recordsValue.length, 1), 3)
    const tone = props.tone === 'signature' ? 'signature' : 'default'
    return withCreatorSignalCss(html`<section class="content-section feature-section" data-feature-tone="${tone}" aria-labelledby="${escapedProp(props.sectionId)}">
        <div class="section-intro"><p class="eyebrow">${escapedProp(props.eyebrow)}</p><h2 id="${escapedProp(props.sectionId)}">${escapedProp(props.heading)}</h2><p>${escapedProp(props.introduction)}</p></div>
        <div class="feature-grid feature-grid-${count}">${items}</div>
      </section>`)
  },
})

export const campaignHero = defineModule({
  id: 'creator-signal.site.campaign-hero',
  name: 'Campaign hero',
  description: 'A public-site introduction with one primary action, an optional secondary action and governed artwork.',
  category: 'Creator Signal',
  htmlTag: 'section',
  defaults: {
    eyebrow: 'Every sale sends a signal',
    heading: 'Stop guessing. Design what sells.',
    body: 'Turn your sales history into a clear picture of what is working.',
    primaryActionLabel: 'Get started free',
    primaryActionUrl: 'https://salespulse.creatorsignal.me/sign-up',
    secondaryActionLabel: 'See how it works',
    secondaryActionUrl: '#how-it-works',
    footnote: 'Free forever plan. No spreadsheets, no stress.',
    artwork: '',
    artworkAlt: '',
  },
  schema: {
    eyebrow: control.text('Eyebrow'),
    heading: control.text('Heading'),
    body: control.textarea('Introduction', { rows: 3 }),
    primaryActionLabel: control.text('Primary action label'),
    primaryActionUrl: control.url('Primary action URL'),
    secondaryActionLabel: control.text('Secondary action label'),
    secondaryActionUrl: control.url('Secondary action URL'),
    footnote: control.text('Action footnote'),
    artwork: control.image('Artwork'),
    artworkAlt: control.text('Artwork alternative text'),
  },
  render: ({ props }) => {
    const secondary = text(props.secondaryActionLabel) && text(props.secondaryActionUrl)
      ? raw(html`<a class="button button-secondary" href="${safeUrl(props.secondaryActionUrl)}">${escapedProp(props.secondaryActionLabel)}</a>`)
      : raw('')
    const artwork = text(props.artwork)
      ? raw(html`<img src="${safeUrl(props.artwork)}" alt="${escapedProp(props.artworkAlt)}" loading="eager" fetchpriority="high" decoding="async">`)
      : raw(html`<img src="${safeUrl(creatorSignalBrandAssets.markLight)}" alt="" width="1024" height="688" loading="eager" fetchpriority="high" decoding="async">`)
    return withCreatorSignalCss(html`<section class="campaign-hero">
        <div class="campaign-hero-copy">
          <p class="eyebrow">${escapedProp(props.eyebrow)}</p>
          <h1>${escapedProp(props.heading)}</h1>
          <p class="campaign-hero-body">${escapedProp(props.body)}</p>
          <div class="actions">
            <a class="button button-primary" href="${safeUrl(props.primaryActionUrl)}">${escapedProp(props.primaryActionLabel)}</a>
            ${secondary}
          </div>
          <p class="campaign-hero-footnote">${escapedProp(props.footnote)}</p>
        </div>
        <div class="campaign-hero-art">${artwork}</div>
      </section>`)
  },
})

export const signalStrip = defineModule({
  id: 'creator-signal.site.signal-strip',
  name: 'Signal strip',
  description: 'A static, wrapping band of short brand promises that remains readable without motion.',
  category: 'Creator Signal',
  htmlTag: 'aside',
  defaults: {
    label: 'Creator Signal promises',
    items: [
      { text: "You've got this" },
      { text: 'Skip the maths' },
      { text: 'No spreadsheets, no stress' },
      { text: 'Grow with confidence' },
      { text: 'Every sale sends a signal' },
      { text: 'Zero data-nerd required' },
    ] as SignalStripItem[],
  },
  schema: {
    label: control.text('Accessible label'),
    items: control.textarea('Signal messages'),
  },
  render: ({ props }) => {
    const items = records(props.items).map((item) => raw(html`
      <li><span aria-hidden="true">✦</span>${text(item.text)}</li>`))
    return withCreatorSignalCss(html`<aside class="signal-strip" aria-label="${escapedProp(props.label)}">
      <ul class="signal-strip-list">${items}</ul>
    </aside>`)
  },
})

export const signalComparison = defineModule({
  id: 'creator-signal.site.signal-comparison',
  name: 'Signal comparison',
  description: 'A before-and-after explanation that contrasts limited marketplace reporting with a visual sales signal.',
  category: 'Creator Signal',
  htmlTag: 'section',
  defaults: {
    eyebrow: "Let's see what's working",
    heading: 'From this, to this.',
    introduction: 'Compare the limited view with the clearer Creator Signal experience.',
    beforeLabel: 'From',
    beforeBody: 'Thirty days, sales counts only and one bare-bones chart.',
    afterLabel: 'To',
    afterBody: "Your own design thumbnails, sorted by what's working.",
    artwork: '',
    artworkAlt: '',
    sectionId: 'signal-comparison',
  },
  schema: {
    eyebrow: control.text('Eyebrow'),
    heading: control.text('Heading'),
    introduction: control.textarea('Introduction', { rows: 2 }),
    beforeLabel: control.text('Before label'),
    beforeBody: control.textarea('Before description', { rows: 2 }),
    afterLabel: control.text('After label'),
    afterBody: control.textarea('After description', { rows: 2 }),
    artwork: control.image('After artwork'),
    artworkAlt: control.text('Artwork alternative text'),
    sectionId: control.text('Section anchor'),
  },
  render: ({ props }) => {
    const artwork = text(props.artwork)
      ? raw(html`<img src="${safeUrl(props.artwork)}" alt="${escapedProp(props.artworkAlt)}" loading="lazy" decoding="async">`)
      : raw(html`<img src="${safeUrl(creatorSignalBrandAssets.salesPulseSocial)}" alt="" loading="lazy" decoding="async">`)
    return withCreatorSignalCss(html`<section class="content-section signal-comparison" aria-labelledby="${escapedProp(props.sectionId)}">
      <div class="section-intro"><p class="eyebrow">${escapedProp(props.eyebrow)}</p><h2 id="${escapedProp(props.sectionId)}">${escapedProp(props.heading)}</h2><p>${escapedProp(props.introduction)}</p></div>
      <div class="signal-comparison-grid">
        <article class="signal-comparison-card signal-comparison-before">
          <p class="comparison-label">${escapedProp(props.beforeLabel)}</p>
          <div class="comparison-bars" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
          <h3>Limited reporting</h3><p>${escapedProp(props.beforeBody)}</p>
        </article>
        <article class="signal-comparison-card signal-comparison-after">
          <p class="comparison-label">${escapedProp(props.afterLabel)}</p>
          <div class="signal-comparison-art">${artwork}</div>
          <h3>A visual sales signal</h3><p>${escapedProp(props.afterBody)}</p>
        </article>
      </div>
    </section>`)
  },
})

export const processSteps = defineModule({
  id: 'creator-signal.site.process-steps',
  name: 'Process steps',
  description: 'An ordered, outcome-focused explanation of a short public journey.',
  category: 'Creator Signal',
  htmlTag: 'section',
  defaults: {
    eyebrow: 'How it works',
    heading: 'Connect, see, grow.',
    introduction: 'Three clear steps from your existing shop to a more useful sales picture.',
    sectionId: 'how-it-works',
    items: [
      { marker: '1', heading: 'Connect your shop', body: 'Link your supported marketplace in a few clear steps.' },
      { marker: '2', heading: 'See your signal', body: 'See sales through your own design thumbnails.' },
      { marker: '3', heading: 'Grow with confidence', body: 'Use the evidence to decide what deserves attention next.' },
    ] as FeatureItem[],
  },
  schema: {
    eyebrow: control.text('Eyebrow'),
    heading: control.text('Heading'),
    introduction: control.textarea('Introduction', { rows: 3 }),
    sectionId: control.text('Section anchor'),
    items: control.textarea('Steps'),
  },
  render: ({ props }) => {
    const items = records(props.items).map((item) => raw(html`
      <li class="process-step">
        <span class="process-step-number">${text(item.marker)}</span>
        <div><h3>${text(item.heading)}</h3><p>${text(item.body)}</p></div>
      </li>`))
    return withCreatorSignalCss(html`<section class="content-section process-section" aria-labelledby="${escapedProp(props.sectionId)}">
      <div class="section-intro"><p class="eyebrow">${escapedProp(props.eyebrow)}</p><h2 id="${escapedProp(props.sectionId)}">${escapedProp(props.heading)}</h2><p>${escapedProp(props.introduction)}</p></div>
      <ol class="process-steps">${items}</ol>
    </section>`)
  },
})

export const pricingPlans = defineModule({
  id: 'creator-signal.site.pricing-plans',
  name: 'Pricing plans',
  description: 'Three accessible plan cards with explicit prices, features and application-owned signup destinations.',
  category: 'Creator Signal',
  htmlTag: 'section',
  defaults: {
    eyebrow: 'Skip the maths',
    heading: 'Find your fit.',
    introduction: "Start free. Upgrade whenever you're ready to see more of your signal.",
    footnote: 'Mobile, tablet and desktop are included on every plan.',
    sectionId: 'pricing',
    items: [
      { name: 'Free', price: '$0', cadence: '', description: 'Start with the core workflow.', features: 'Revenue and sales overview\nSales growth over time\nTop selling designs', actionLabel: 'Start free', actionUrl: 'https://salespulse.creatorsignal.me/sign-up', emphasis: 'default' },
      { name: 'Starter', price: '$5 AUD', cadence: 'per month', description: 'Build a durable sales record.', features: 'Everything in Free\nFilter by time and product type\nSales by category', actionLabel: 'Start Starter', actionUrl: 'https://salespulse.creatorsignal.me/sign-up', emphasis: 'featured' },
      { name: 'Pro', price: '$10 AUD', cadence: 'per month', description: 'Use the complete analysis experience.', features: 'Everything in Starter\nCollection-level sales\nRepeat-customer insight', actionLabel: 'Start Pro', actionUrl: 'https://salespulse.creatorsignal.me/sign-up', emphasis: 'default' },
    ] as PricingPlan[],
  },
  schema: {
    eyebrow: control.text('Eyebrow'),
    heading: control.text('Heading'),
    introduction: control.textarea('Introduction', { rows: 2 }),
    footnote: control.text('Plan footnote'),
    sectionId: control.text('Section anchor'),
    items: control.textarea('Plans'),
  },
  render: ({ props }) => {
    const items = records(props.items).map((item) => {
      const features = lines(item.features).map((feature) => raw(html`<li>${feature}</li>`))
      const featured = item.emphasis === 'featured'
      return raw(html`<article class="pricing-card${featured ? ' pricing-card-featured' : ''}">
        ${featured ? raw('<p class="pricing-badge">Most popular</p>') : raw('')}
        <h3>${text(item.name)}</h3>
        <p class="pricing-price">${text(item.price)}${text(item.cadence) ? raw(html` <span>${text(item.cadence)}</span>`) : raw('')}</p>
        <p>${text(item.description)}</p>
        <ul>${features}</ul>
        <a class="button ${featured ? 'button-primary' : 'button-secondary'}" href="${safeUrl(item.actionUrl)}">${text(item.actionLabel)}</a>
      </article>`)
    })
    return withCreatorSignalCss(html`<section class="content-section pricing-plans" aria-labelledby="${escapedProp(props.sectionId)}">
      <div class="section-intro"><p class="eyebrow">${escapedProp(props.eyebrow)}</p><h2 id="${escapedProp(props.sectionId)}">${escapedProp(props.heading)}</h2><p>${escapedProp(props.introduction)}</p></div>
      <div class="pricing-grid">${items}</div>
      <p class="pricing-footnote">${escapedProp(props.footnote)}</p>
    </section>`)
  },
})

export const founderStory = defineModule({
  id: 'creator-signal.site.founder-story',
  name: 'Founder story',
  description: 'A first-person founder story with an optional governed portrait.',
  category: 'Creator Signal',
  htmlTag: 'section',
  defaults: {
    eyebrow: 'By a designer, for designers',
    heading: 'Meet the maker.',
    body: '<p>Share why Creator Signal exists and how that experience shapes the product.</p>',
    attribution: 'Lahni',
    role: 'Founder, Creator Signal',
    portrait: '',
    portraitAlt: '',
    sectionId: 'about',
  },
  schema: {
    eyebrow: control.text('Eyebrow'),
    heading: control.text('Heading'),
    body: control.richtext('Story'),
    attribution: control.text('Attribution'),
    role: control.text('Role'),
    portrait: control.image('Portrait'),
    portraitAlt: control.text('Portrait alternative text'),
    sectionId: control.text('Section anchor'),
  },
  render: ({ props }) => {
    const portrait = text(props.portrait)
      ? raw(html`<img src="${safeUrl(props.portrait)}" alt="${escapedProp(props.portraitAlt)}" loading="lazy" decoding="async">`)
      : raw(html`<img src="${safeUrl(creatorSignalBrandAssets.markReversed)}" alt="" width="1024" height="688" loading="lazy" decoding="async">`)
    return withCreatorSignalCss(html`<section class="founder-story" aria-labelledby="${escapedProp(props.sectionId)}">
      <div class="founder-story-inner">
        <div class="founder-portrait">${portrait}</div>
        <div class="founder-copy">
          <p class="eyebrow">${escapedProp(props.eyebrow)}</p><h2 id="${escapedProp(props.sectionId)}">${escapedProp(props.heading)}</h2>
          <div class="founder-body">${raw(text(props.body))}</div>
          <p class="founder-attribution"><strong>${escapedProp(props.attribution)}</strong><span>${escapedProp(props.role)}</span></p>
        </div>
      </div>
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
  render: ({ props }) => withCreatorSignalCss(html`<section class="cta-section" aria-labelledby="${escapedProp(props.sectionId)}">
      <div class="cta-copy"><p class="eyebrow">${escapedProp(props.eyebrow)}</p><h2 id="${escapedProp(props.sectionId)}">${escapedProp(props.heading)}</h2><p>${escapedProp(props.body)}</p></div>
      <div class="actions"><a class="button button-secondary" href="${safeUrl(props.actionUrl)}">${escapedProp(props.actionLabel)}</a></div>
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
  render: ({ props }) => withCreatorSignalCss(html`<section class="content-section narrow-content" aria-labelledby="${escapedProp(props.sectionId)}">
      <h2 id="${escapedProp(props.sectionId)}">${escapedProp(props.heading)}</h2>
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
      <blockquote><p>“${escapedProp(props.quote)}”</p></blockquote>
      <figcaption><strong>${escapedProp(props.attribution)}</strong><span>${escapedProp(props.role)}</span></figcaption>
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
    return withCreatorSignalCss(html`<section class="content-section narrow-content" aria-labelledby="${escapedProp(props.sectionId)}" itemscope itemtype="https://schema.org/FAQPage">
        <h2 id="${escapedProp(props.sectionId)}">${escapedProp(props.heading)}</h2>
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
    return withCreatorSignalCss(html`<section class="content-section comparison-section" aria-labelledby="${escapedProp(props.sectionId)}">
        <div class="section-intro"><p class="eyebrow">${escapedProp(props.eyebrow)}</p><h2 id="${escapedProp(props.sectionId)}">${escapedProp(props.heading)}</h2><p>${escapedProp(props.introduction)}</p></div>
        <div class="comparison-table-scroll" tabindex="0" role="region" aria-label="${escapedProp(props.caption)}">
          <table class="comparison-table">
            <caption>${escapedProp(props.caption)}</caption>
            <thead><tr><th scope="col">Criteria</th><th scope="col">${escapedProp(props.firstLabel)}</th><th scope="col">${escapedProp(props.secondLabel)}</th><th scope="col">${escapedProp(props.thirdLabel)}</th></tr></thead>
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
    return withCreatorSignalCss(html`<section class="recovery-state" data-recovery-state="${state}" aria-labelledby="${escapedProp(props.sectionId)}">
        <p class="eyebrow">${stateLabel}</p>
        <h1 id="${escapedProp(props.sectionId)}">${escapedProp(props.heading)}</h1>
        <p>${escapedProp(props.body)}</p>
        <div class="actions"><a class="button button-primary" href="${safeUrl(props.actionUrl)}">${escapedProp(props.actionLabel)}</a></div>
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
      <meta itemprop="dateModified" content="${escapedProp(props.dateModified)}">
      <header class="public-document-header"><p class="eyebrow">${escapedProp(props.eyebrow)}</p><h1 itemprop="headline">${escapedProp(props.heading)}</h1><p itemprop="description">${escapedProp(props.summary)}</p></header>
      <div class="prose-content" itemprop="articleBody">${raw(text(props.body))}</div>
    </article>`),
})

export const creatorSignalSiteModules = [
  siteHeader,
  siteFooter,
  consentBanner,
  campaignHero,
  signalStrip,
  signalComparison,
  featureGrid,
  processSteps,
  pricingPlans,
  founderStory,
  callToAction,
  richTextSection,
  testimonial,
  faq,
  comparisonSection,
  recoveryState,
  publicDocument,
] as const
