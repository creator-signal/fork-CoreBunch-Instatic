import { creatorSignalFoundationCss } from '../design-system/foundation-css'

export const CREATOR_SIGNAL_RENDER_PROFILE_ID = 'creator-signal.public/v1'

/** Public responsive breakpoints shared by authoring previews and publishing. */
export const creatorSignalResponsiveQueries = Object.freeze({
  large: '(max-width: 900px)',
  medium: '(max-width: 720px)',
  small: '(max-width: 560px)',
})

/** Theme behaviour is supplied by the generated Creator Signal adapter. */
export const creatorSignalThemeContract = Object.freeze({
  preferences: ['system', 'light', 'dark'] as const,
  themeAttribute: 'data-cs-theme',
  preferenceAttribute: 'data-cs-theme-preference',
  controlSelector: '[data-cs-theme-control]',
  bootstrapAsset: 'frontend/theme-bootstrap.js',
  controlAsset: 'frontend/theme-control.js',
})

/**
 * Instatic-owned page composition. Colours, typography, spacing, radii,
 * shadows, controls and theme states resolve through the generated semantic
 * design-system adapter above this layer; this file owns layout only.
 */
export const creatorSignalCompositionCss = String.raw`
/* creator-signal-site-design-contract */
* { box-sizing: border-box; }
html {
  scroll-behavior: smooth;
  background: var(--cs-surface-canvas);
  color: var(--cs-text-primary);
  scroll-padding-top: 5.5rem;
}
body {
  min-height: 100vh;
  margin: 0;
  background: var(--cs-surface-canvas);
  color: var(--cs-text-primary);
  font-family: var(--cs-type-body-family);
  font-size: var(--cs-type-body-size);
  font-weight: var(--cs-type-body-weight);
  letter-spacing: var(--cs-type-body-tracking);
  line-height: var(--cs-type-body-line-height);
}
img, svg { display: block; max-width: 100%; }
a { color: inherit; }
main { min-width: 0; overflow-wrap: anywhere; }
h1, h2, h3 {
  margin: 0;
  color: var(--cs-text-primary);
  text-wrap: balance;
}
h1 {
  font-family: var(--cs-type-heading1-family);
  font-size: var(--cs-type-heading1-size);
  font-weight: var(--cs-type-heading1-weight);
  letter-spacing: var(--cs-type-heading1-tracking);
  line-height: var(--cs-type-heading1-line-height);
}
h2 {
  font-family: var(--cs-type-heading2-family);
  font-size: var(--cs-type-heading2-size);
  font-weight: var(--cs-type-heading2-weight);
  letter-spacing: var(--cs-type-heading2-tracking);
  line-height: var(--cs-type-heading2-line-height);
}
h3 {
  font-family: var(--cs-type-heading3-family);
  font-size: var(--cs-type-heading3-size);
  font-weight: var(--cs-type-heading3-weight);
  letter-spacing: var(--cs-type-heading3-tracking);
  line-height: var(--cs-type-heading3-line-height);
}
p { line-height: var(--cs-type-body-large-line-height); }

.skip-link {
  position: fixed;
  top: var(--cs-spacing-3);
  left: var(--cs-spacing-3);
  z-index: var(--cs-z-toast);
  padding: var(--cs-spacing-3) var(--cs-spacing-4);
  transform: translateY(calc(-100% - var(--cs-spacing-5)));
  border: 2px solid var(--cs-focus-ring);
  border-radius: var(--cs-radius-md);
  background: var(--cs-surface-raised);
  color: var(--cs-text-primary);
  font-weight: var(--cs-type-control-weight);
  transition: transform var(--cs-motion-duration-fast) var(--cs-motion-easing-standard);
}
.skip-link:focus { transform: translateY(0); }

.site-header {
  position: sticky;
  top: 0;
  z-index: var(--cs-z-sticky);
  display: flex;
  width: 100%;
  min-height: 5rem;
  margin: 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: var(--cs-spacing-6);
  padding: var(--cs-spacing-2) max(var(--cs-spacing-5), calc((100% - var(--cs-size-content-max)) / 2));
  border-bottom: 1px solid var(--cs-border-default);
  background: color-mix(in srgb, var(--cs-surface-canvas) 94%, transparent);
  backdrop-filter: blur(6px);
}
.site-brand {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: var(--cs-spacing-3);
  text-decoration: none;
}
.site-brand-mark { width: 3.5rem; height: 2.4rem; object-fit: contain; }
.site-brand strong, .site-brand small { display: block; }
.site-brand strong { font: var(--cs-type-heading3-weight) 1.1rem var(--cs-type-heading3-family); }
.site-brand small {
  max-width: 19rem;
  margin-top: 2px;
  overflow: hidden;
  color: var(--cs-text-secondary);
  font-size: var(--cs-type-body-small-size);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.site-header nav, .site-footer nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--cs-spacing-5);
}
.site-header nav a:not(.button), .site-footer nav a {
  color: var(--cs-text-secondary);
  font-family: var(--cs-type-control-family);
  font-size: var(--cs-type-label-size);
  font-weight: var(--cs-type-control-weight);
  text-decoration: none;
}
.site-header nav a:hover, .site-footer nav a:hover { color: var(--cs-text-primary); }

.button {
  display: inline-flex;
  min-height: var(--cs-size-control-min-target);
  align-items: center;
  justify-content: center;
  padding: var(--cs-spacing-3) var(--cs-spacing-6);
  border: 2px solid transparent;
  border-radius: var(--cs-radius-pill);
  cursor: pointer;
  font-family: var(--cs-type-control-family);
  font-size: var(--cs-type-control-size);
  font-weight: var(--cs-type-control-weight);
  line-height: var(--cs-type-control-line-height);
  text-decoration: none;
  transition: transform var(--cs-motion-duration-fast) var(--cs-motion-easing-standard), box-shadow var(--cs-motion-duration-fast) var(--cs-motion-easing-standard), background var(--cs-motion-duration-fast) var(--cs-motion-easing-standard);
}
.button:hover { transform: translateY(-2px); }
.button-primary {
  background: var(--cs-product-creator-signal-signature);
  color: var(--cs-brand-maroon);
  box-shadow: var(--cs-shadow-sm);
}
.button-primary:hover { background: var(--cs-action-primary-hover); color: var(--cs-action-primary-foreground); box-shadow: var(--cs-shadow-md); }
.button-secondary {
  border-color: var(--cs-border-strong);
  background: transparent;
  color: var(--cs-text-primary);
}
.button-secondary:hover { background: var(--cs-action-primary-background); color: var(--cs-action-primary-foreground); }
.button:focus-visible, a:focus-visible, summary:focus-visible {
  outline: 3px solid var(--cs-focus-ring);
  outline-offset: 3px;
}
.actions { display: flex; flex-wrap: wrap; gap: var(--cs-spacing-3); }
.eyebrow, .cs-eyebrow {
  margin: 0 0 var(--cs-spacing-3);
  padding-inline-start: var(--cs-spacing-2);
  border-inline-start: 3px solid var(--cs-product-creator-signal-accent);
  color: var(--cs-text-primary);
  font-family: var(--cs-type-label-family);
  font-size: var(--cs-type-label-size);
  font-weight: var(--cs-type-label-weight);
  letter-spacing: .14em;
  line-height: var(--cs-type-label-line-height);
  text-transform: uppercase;
}

.hero-section, .campaign-hero {
  display: grid;
  width: calc(100% - (2 * var(--cs-spacing-8)));
  max-width: var(--cs-size-content-max);
  margin: 0 auto;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: center;
  gap: var(--cs-spacing-12);
  padding: var(--cs-spacing-16) 0;
}
.hero-copy, .campaign-hero-copy { min-width: 0; max-width: 36rem; }
.hero-body, .campaign-hero-body {
  max-width: 34rem;
  margin: var(--cs-spacing-5) 0 var(--cs-spacing-8);
  color: var(--cs-text-secondary);
  font-family: var(--cs-type-body-large-family);
  font-size: var(--cs-type-body-large-size);
  line-height: var(--cs-type-body-large-line-height);
}
.campaign-hero-footnote { margin: var(--cs-spacing-4) 0 0; color: var(--cs-text-muted); font-size: var(--cs-type-body-small-size); }
.hero-art, .campaign-hero-art {
  position: relative;
  display: grid;
  min-height: 24rem;
  overflow: hidden;
  place-items: center;
  border: 1px solid var(--cs-border-default);
  border-radius: calc(var(--cs-radius-lg) + var(--cs-spacing-2));
  background: linear-gradient(135deg, var(--cs-product-sales-pulse-supporting), var(--cs-product-creator-signal-signature));
  box-shadow: var(--cs-shadow-md);
}
.hero-art img, .campaign-hero-art img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.hero-art img[src=""], .hero-art img:not([src]) { display: none; }
.signal-visual {
  display: flex;
  width: min(74%, 22rem);
  height: 15rem;
  align-items: end;
  justify-content: center;
  gap: var(--cs-spacing-4);
}
.signal-visual span { width: 2.8rem; border-radius: var(--cs-radius-pill); background: var(--cs-brand-cream); }
.signal-visual span:nth-child(1) { height: 5rem; }
.signal-visual span:nth-child(2) { height: 12rem; background: var(--cs-brand-pink); }
.signal-visual span:nth-child(3) { height: 8rem; background: var(--cs-brand-orange); }
.signal-visual span:nth-child(4) { height: 6rem; }

.signal-strip { padding: var(--cs-spacing-3) var(--cs-spacing-5); background: var(--cs-surface-inverse); color: var(--cs-text-inverse); }
.signal-strip-list {
  display: flex;
  max-width: var(--cs-size-content-max);
  margin: 0 auto;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--cs-spacing-3) var(--cs-spacing-8);
  padding: 0;
  list-style: none;
  font-family: var(--cs-type-heading3-family);
  font-weight: var(--cs-type-heading3-weight);
}
.signal-strip-list span { margin-right: var(--cs-spacing-2); color: var(--cs-product-creator-signal-signature); }

.content-section, .signal-comparison, .process-section, .pricing-plans, .comparison-section, .recovery-state {
  width: calc(100% - (2 * var(--cs-spacing-8)));
  max-width: var(--cs-size-content-max);
  margin: 0 auto;
  padding: var(--cs-spacing-16) 0;
}
.section-intro { max-width: 40rem; margin: 0 0 var(--cs-spacing-10); }
.section-intro > p:not(.eyebrow) { margin: var(--cs-spacing-3) 0 0; color: var(--cs-text-secondary); font-size: var(--cs-type-body-large-size); }
.feature-section[data-feature-tone="signature"] {
  width: 100%;
  max-width: none;
  padding-inline: max(var(--cs-spacing-8), calc((100% - var(--cs-size-content-max)) / 2));
  background: color-mix(in srgb, var(--cs-product-creator-signal-signature) 28%, var(--cs-surface-canvas));
}
.feature-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--cs-spacing-5); }
.feature-grid-1 { grid-template-columns: 1fr; }
.feature-grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.feature-card {
  min-width: 0;
  padding: var(--cs-spacing-6);
  border: 1px solid var(--cs-component-card-border);
  border-radius: var(--cs-radius-lg);
  background: var(--cs-component-card-background);
  color: var(--cs-component-card-foreground);
  box-shadow: var(--cs-shadow-sm);
}
.feature-number {
  display: block;
  margin-bottom: var(--cs-spacing-5);
  color: var(--cs-text-primary);
  font-family: var(--cs-type-label-family);
  font-size: var(--cs-type-label-size);
  font-weight: var(--cs-type-label-weight);
  letter-spacing: .05em;
  text-transform: uppercase;
}
.feature-card p { margin-bottom: 0; color: var(--cs-text-secondary); }

.signal-comparison-grid, .founder-story-inner { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--cs-spacing-8); }
.signal-comparison-card, .pricing-card {
  min-width: 0;
  padding: var(--cs-spacing-8);
  border: 1px solid var(--cs-component-card-border);
  border-radius: var(--cs-radius-lg);
  background: var(--cs-component-card-background);
  color: var(--cs-component-card-foreground);
  box-shadow: var(--cs-shadow-sm);
}
.comparison-label, .pricing-badge {
  display: inline-flex;
  margin: 0 0 var(--cs-spacing-5);
  padding: var(--cs-spacing-2) var(--cs-spacing-3);
  border-radius: var(--cs-radius-pill);
  background: var(--cs-product-creator-signal-signature);
  color: var(--cs-brand-maroon);
  font-weight: var(--cs-type-label-weight);
}
.comparison-bars {
  display: flex;
  min-height: 14rem;
  align-items: end;
  justify-content: center;
  gap: var(--cs-spacing-3);
  margin-bottom: var(--cs-spacing-5);
  padding: var(--cs-spacing-6);
  border-radius: var(--cs-radius-lg);
  background: var(--cs-surface-subtle);
}
.comparison-bars span { width: 2.6rem; border-radius: var(--cs-radius-pill) var(--cs-radius-pill) 0 0; background: var(--cs-border-strong); }
.comparison-bars span:nth-child(1) { height: 40%; }
.comparison-bars span:nth-child(2) { height: 72%; }
.comparison-bars span:nth-child(3) { height: 55%; }
.comparison-bars span:nth-child(4) { height: 88%; }
.signal-comparison-art, .founder-portrait {
  display: grid;
  min-height: 14rem;
  overflow: hidden;
  place-items: center;
  border-radius: var(--cs-radius-lg);
  background: linear-gradient(135deg, var(--cs-product-sales-pulse-supporting), var(--cs-product-creator-signal-signature));
}
.signal-comparison-art img, .founder-portrait img { width: 100%; height: 100%; object-fit: cover; }
.signal-comparison-card > p:last-child, .pricing-card > p, .pricing-card li, .process-step p, .pricing-footnote { color: var(--cs-text-secondary); }

.process-steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--cs-spacing-8); padding: 0; list-style: none; }
.process-step { min-width: 0; }
.process-step-number {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  margin-bottom: var(--cs-spacing-5);
  place-items: center;
  border: 4px solid var(--cs-surface-canvas);
  border-radius: 50%;
  background: var(--cs-product-creator-signal-signature);
  color: var(--cs-brand-maroon);
  font-family: var(--cs-type-heading3-family);
  font-weight: var(--cs-type-heading3-weight);
}

.pricing-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--cs-spacing-5); align-items: stretch; }
.pricing-card { position: relative; display: flex; flex-direction: column; }
.pricing-card-featured { border: 2px solid var(--cs-product-creator-signal-signature); }
.pricing-price { color: var(--cs-product-creator-signal-accent); font: var(--cs-type-heading2-weight) var(--cs-type-heading2-size) var(--cs-type-heading2-family); }
.pricing-price span { color: var(--cs-text-secondary); font: var(--cs-type-body-small-size) var(--cs-type-body-family); }
.pricing-card ul { min-height: 9rem; padding-left: 1.2rem; }
.pricing-card li::marker { color: var(--cs-product-sales-pulse-supporting); }
.pricing-card > .pricing-badge { color: var(--cs-brand-maroon); }
.pricing-card .button { margin-top: auto; }
.pricing-footnote { text-align: center; }

.founder-story { padding: var(--cs-spacing-16) var(--cs-spacing-8); background: var(--cs-surface-inverse); color: var(--cs-text-inverse); }
.founder-story-inner { max-width: var(--cs-size-content-max); margin: 0 auto; align-items: center; }
.founder-copy h2 { color: var(--cs-text-inverse); }
.founder-copy .eyebrow, .founder-attribution strong { color: var(--cs-product-creator-signal-signature); }
.founder-copy .eyebrow { border-inline-start-color: var(--cs-product-creator-signal-signature); }
.founder-body { color: var(--cs-text-inverse); font-size: var(--cs-type-body-large-size); }
.founder-attribution strong, .founder-attribution span { display: block; }
.founder-portrait { min-height: 22rem; }

.cta-section {
  display: flex;
  width: calc(100% - (2 * var(--cs-spacing-8)));
  max-width: var(--cs-size-content-max);
  margin: var(--cs-spacing-16) auto;
  align-items: center;
  justify-content: space-between;
  gap: var(--cs-spacing-8);
  padding: var(--cs-spacing-12);
  border-radius: calc(var(--cs-radius-lg) + var(--cs-spacing-2));
  background: linear-gradient(135deg, var(--cs-product-sales-pulse-supporting), var(--cs-product-creator-signal-signature));
  color: var(--cs-brand-maroon);
  box-shadow: var(--cs-shadow-md);
}
.cta-copy { max-width: 44rem; }
.cta-copy h2, .cta-copy p { color: var(--cs-brand-maroon); }
.cta-section .button-secondary { border-color: var(--cs-brand-maroon); color: var(--cs-brand-maroon); }

.narrow-content { max-width: 50rem; }
.prose-content { color: var(--cs-text-secondary); }
.prose-content > * + * { margin-top: var(--cs-spacing-4); }
.prose-content a { color: var(--cs-action-link); font-weight: var(--cs-type-control-weight); }
.testimonial {
  max-width: var(--cs-size-content-max);
  margin: var(--cs-spacing-16) auto;
  padding: var(--cs-spacing-10);
  border-radius: var(--cs-radius-lg);
  background: var(--cs-surface-subtle);
  color: var(--cs-text-primary);
  text-align: center;
}
.testimonial blockquote { margin: 0; font: var(--cs-type-heading2-weight) var(--cs-type-heading2-size)/var(--cs-type-heading2-line-height) var(--cs-type-heading2-family); }
.testimonial figcaption strong, .testimonial figcaption span { display: block; }
.testimonial figcaption span { color: var(--cs-text-secondary); }
.faq-list { border-top: 1px solid var(--cs-border-default); }
.faq-list details { padding: var(--cs-spacing-5) 0; border-bottom: 1px solid var(--cs-border-default); }
.faq-list summary { cursor: pointer; font-family: var(--cs-type-heading3-family); font-size: var(--cs-type-heading3-size); font-weight: var(--cs-type-heading3-weight); }
.faq-list details p { color: var(--cs-text-secondary); }

.comparison-table-scroll { overflow-x: auto; }
.comparison-table { width: 100%; border-collapse: collapse; border: 1px solid var(--cs-border-default); background: var(--cs-component-card-background); }
.comparison-table caption { padding: var(--cs-spacing-4); color: var(--cs-text-secondary); text-align: left; }
.comparison-table th, .comparison-table td { padding: var(--cs-spacing-4); border: 1px solid var(--cs-border-default); text-align: left; }
.comparison-table th { font-family: var(--cs-type-heading3-family); }

.recovery-state { max-width: 50rem; min-height: 55vh; }
.recovery-state > p:not(.eyebrow) { max-width: 40rem; color: var(--cs-text-secondary); font-size: var(--cs-type-body-large-size); }
.recovery-state .actions { margin-top: var(--cs-spacing-8); }

.public-document { width: calc(100% - (2 * var(--cs-spacing-8))); max-width: 50rem; margin: 0 auto; padding-top: var(--cs-spacing-16); }
.public-document-header { margin-bottom: var(--cs-spacing-12); padding-bottom: var(--cs-spacing-8); border-bottom: 1px solid var(--cs-border-default); }
.public-document-header > p:not(.eyebrow) { margin: var(--cs-spacing-5) 0 0; color: var(--cs-text-secondary); font-size: var(--cs-type-body-large-size); }
.public-document .prose-content { padding-bottom: var(--cs-spacing-16); }

.site-footer {
  display: grid;
  width: calc(100% - (2 * var(--cs-spacing-8)));
  max-width: var(--cs-size-content-max);
  margin: 0 auto;
  grid-template-columns: minmax(14rem, .8fr) minmax(0, 1.2fr);
  align-items: start;
  gap: var(--cs-spacing-8);
  padding: var(--cs-spacing-12) 0;
  border-top: 1px solid var(--cs-border-default);
}
.site-footer p { margin: var(--cs-spacing-1) 0 0; color: var(--cs-text-secondary); }
.site-footer small { color: var(--cs-text-muted); }
.footer-meta { display: grid; gap: var(--cs-spacing-4); }

.consent {
  position: fixed;
  right: var(--cs-spacing-5);
  bottom: var(--cs-spacing-5);
  z-index: var(--cs-z-toast);
  display: grid;
  width: calc(100% - (2 * var(--cs-spacing-5)));
  max-width: 40rem;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--cs-spacing-5);
  padding: var(--cs-spacing-6);
  border: 1px solid var(--cs-component-card-border);
  border-radius: var(--cs-radius-lg);
  background: var(--cs-component-card-background);
  color: var(--cs-component-card-foreground);
  box-shadow: var(--cs-shadow-lg);
}
.consent[hidden] { display: none; }
.consent strong { display: block; font-size: var(--cs-type-body-large-size); }
.consent p { max-width: 35rem; margin: var(--cs-spacing-2) 0 0; color: var(--cs-text-secondary); font-size: var(--cs-type-body-small-size); }
.consent-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--cs-spacing-2); }
.consent .button { min-height: var(--cs-size-control-min-target); padding-inline: var(--cs-spacing-4); font-size: var(--cs-type-body-small-size); white-space: nowrap; }

@media (max-width: 900px) {
  .site-header { align-items: flex-start; }
  .site-header nav { justify-content: flex-end; gap: var(--cs-spacing-3); }
  .site-header nav a:not(.button) { display: none; }
  .hero-section, .campaign-hero { grid-template-columns: minmax(0, 1fr); }
  .hero-art, .campaign-hero-art { min-height: 20rem; }
  .feature-grid, .feature-grid-1, .feature-grid-2, .feature-grid-3, .signal-comparison-grid, .pricing-grid, .founder-story-inner, .process-steps { grid-template-columns: 1fr; }
  .pricing-card ul { min-height: 0; }
  .cta-section { align-items: flex-start; flex-direction: column; }
  .site-footer { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .consent { grid-template-columns: 1fr; align-items: start; }
  .consent-actions { justify-content: flex-start; }
}
@media (max-width: 560px) {
  .site-brand small { display: none; }
  .site-header { padding-inline: var(--cs-spacing-4); }
  .site-header nav .button { padding-inline: var(--cs-spacing-4); font-size: var(--cs-type-body-small-size); }
  .hero-section, .campaign-hero, .content-section, .signal-comparison, .process-section, .pricing-plans, .comparison-section, .recovery-state, .public-document { width: calc(100% - (2 * var(--cs-spacing-5))); }
  .hero-art, .campaign-hero-art, .founder-portrait { min-height: 17rem; }
  .feature-section[data-feature-tone="signature"] { width: 100%; padding-inline: var(--cs-spacing-5); }
  .signal-comparison-card, .pricing-card { padding: var(--cs-spacing-6); }
  .cta-section { width: calc(100% - (2 * var(--cs-spacing-5))); margin-block: var(--cs-spacing-12); padding: var(--cs-spacing-8) var(--cs-spacing-5); }
  .testimonial { width: calc(100% - (2 * var(--cs-spacing-5))); padding: var(--cs-spacing-8) var(--cs-spacing-5); }
  .site-footer { width: calc(100% - (2 * var(--cs-spacing-5))); }
  .consent { right: var(--cs-spacing-3); bottom: var(--cs-spacing-3); width: calc(100% - (2 * var(--cs-spacing-3))); padding: var(--cs-spacing-5); }
  .consent-actions { display: grid; grid-template-columns: 1fr; width: 100%; }
  .consent .button { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; }
  .button:hover { transform: none; }
}
`

export const creatorSignalCss = `${creatorSignalFoundationCss}\n${creatorSignalCompositionCss}`

/** The one render profile used by component previews and published pages. */
export const creatorSignalRenderProfile = Object.freeze({
  id: CREATOR_SIGNAL_RENDER_PROFILE_ID,
  stylesheetMarker: 'creator-signal-site-design-contract',
  stylesheet: creatorSignalCss,
  responsiveQueries: creatorSignalResponsiveQueries,
  theme: creatorSignalThemeContract,
})
