/**
 * Retained 0.1.11 page-shape reconstruction used by tests to prove the frozen
 * source-commit hashes in legacy-0.1.11-hashes.ts. Runtime classification uses
 * only those reviewed constants. This fixture is never installed or synced.
 */
import { compilePackPages, type PagePackEntry } from '@core/plugin-sdk'
import { creatorSignalCss } from '../pack/design-system'
import { heroParamIds } from '../pack/hero-component'
import { starterPages } from '../pack/site'

const header = `<header class="site-header">
  <a class="site-brand" href="/" aria-label="Creator Signal home">
    <span class="brand-signal" aria-hidden="true"><i></i><i></i><i></i></span>
    <span><strong>Creator Signal</strong><small>Clearer signals for independent creative businesses.</small></span>
  </a>
  <nav aria-label="Main navigation">
    <a href="/products">Products</a>
    <a href="/features">Features</a>
    <a href="/pricing">Pricing</a>
    <a href="/contact">Contact</a>
    <a class="button button-primary" href="https://salespulse.creatorsignal.me">Sign in</a>
  </nav>
</header>`

const footer = `<footer class="site-footer">
  <div class="footer-meta">
    <div><strong>Creator Signal</strong><p>Clearer signals for independent creative businesses.</p></div>
    <small>© 2026 Creator Signal</small>
  </div>
  <nav aria-label="Footer navigation">
    <a href="/products">Products</a>
    <a href="/products/sales-pulse">Sales Pulse</a>
    <a href="/features">Features</a>
    <a href="/pricing">Pricing</a>
    <a href="/contact">Contact</a>
    <a href="/feedback">Feedback</a>
    <a href="/wishlist">Join wishlist</a>
    <a href="/ask-a-question">Ask a question</a>
    <a href="/feature-request">Feature request</a>
    <a href="/report-an-error">Report an error</a>
    <a href="/legal/privacy">Privacy</a>
    <a href="/legal/terms">Terms</a>
    <a href="https://status.creatorsignal.me">Status</a>
  </nav>
</footer>
<aside class="consent" data-consent-banner aria-label="Privacy choices">
  <div><strong>Your privacy choices</strong><p>Aggregate traffic measurement is enabled when configured. Optional journey analytics only runs with your permission.</p></div>
  <div class="consent-actions">
    <button class="button button-secondary" data-analytics-choice="denied">Essential only</button>
    <button class="button button-primary" data-analytics-choice="granted">Allow optional analytics</button>
  </div>
</aside>`

const value = (props: Record<string, unknown>, key: string): string =>
  typeof props[key] === 'string' ? props[key] : ''

function renderLegacyBlock(block: (typeof starterPages)[number]['blocks'][number]): string {
  if (block.kind === 'hero') {
    const eyebrow = value(block.props, heroParamIds.eyebrow)
    const heading = value(block.props, heroParamIds.heading)
    const body = value(block.props, heroParamIds.body)
    const url = value(block.props, heroParamIds.actionUrl)
    const label = value(block.props, heroParamIds.actionLabel)
    return `<section class="hero-section">
      <div class="hero-copy">
        <p class="eyebrow">${eyebrow}</p>
        <h1>${heading}</h1>
        <p class="hero-body">${body}</p>
        <div class="actions"><a class="button button-primary" href="${url}">${label}</a></div>
      </div>
      <div class="hero-art" aria-label="Creator Signal visual"><div class="signal-visual" aria-hidden="true"><span></span><span></span><span></span><span></span></div></div>
    </section>`
  }

  const props = block.props
  switch (block.moduleId) {
    case 'creator-signal.site.feature-grid': {
      const items = Array.isArray(props.items) ? props.items as Array<Record<string, unknown>> : []
      return `<section class="content-section">
        <div class="section-intro"><p class="eyebrow">${value(props, 'eyebrow')}</p><h2>${value(props, 'heading')}</h2><p>${value(props, 'introduction')}</p></div>
        <div class="feature-grid">${items.map((item) =>
          `<article class="feature-card"><span class="feature-number">${value(item, 'marker')}</span><h3>${value(item, 'heading')}</h3><p>${value(item, 'body')}</p></article>`,
        ).join('')}</div>
      </section>`
    }
    case 'creator-signal.site.call-to-action':
      return `<section class="cta-section">
        <div class="cta-copy"><p class="eyebrow">${value(props, 'eyebrow')}</p><h2>${value(props, 'heading')}</h2><p>${value(props, 'body')}</p></div>
        <div class="actions"><a class="button button-primary" href="${value(props, 'actionUrl')}">${value(props, 'actionLabel')}</a></div>
      </section>`
    case 'creator-signal.site.rich-text-section':
      return `<section class="content-section narrow-content">
        <h2>${value(props, 'heading')}</h2>
        <div class="prose-content">${value(props, 'body')}</div>
      </section>`
    case 'creator-signal.site.public-document':
      return `<article class="public-document">
        <header class="public-document-header"><p class="eyebrow">${value(props, 'eyebrow')}</p><h1>${value(props, 'heading')}</h1><p>${value(props, 'summary')}</p></header>
        <div class="prose-content">${value(props, 'body')}</div>
      </article>`
    case 'creator-signal.site.mautic-form':
      return `<section class="content-section"><div data-creator-signal-mautic-form="${value(props, 'formAlias')}"></div></section>`
    default:
      throw new Error(`[creator-signal migration] Unsupported legacy block "${block.moduleId}".`)
  }
}

const entries: PagePackEntry[] = starterPages.map((page) => ({
  id: page.id,
  slug: page.slug,
  title: page.title,
  html: `${header}<main>${page.blocks.map(renderLegacyBlock).join('')}</main>${footer}`,
}))

const compiled = compilePackPages('creator-signal.site', entries, creatorSignalCss)

for (const pageSpec of starterPages) {
  const form = pageSpec.blocks.find((block) =>
    block.kind === 'module' && block.moduleId === 'creator-signal.site.mautic-form')
  if (!form || form.kind !== 'module') continue
  const page = compiled.pages.find((candidate) => candidate.slug === pageSpec.slug)
  const placeholder = Object.values(page?.nodes ?? {}).find((node) => {
    const attributes = node.props.htmlAttributes
    return Boolean(attributes) && typeof attributes === 'object' && !Array.isArray(attributes) &&
      (attributes as Record<string, unknown>)['data-creator-signal-mautic-form'] === form.props.formAlias
  })
  if (!placeholder) throw new Error(`[creator-signal migration] Missing legacy form on "${pageSpec.slug}".`)
  placeholder.moduleId = 'creator-signal.site.mautic-form'
  placeholder.props = { ...form.props }
  placeholder.classIds = []
}

export const legacyCreatorSignalPages0111 = compiled.pages
