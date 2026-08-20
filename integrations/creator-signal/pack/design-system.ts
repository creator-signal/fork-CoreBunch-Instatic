import { creatorSignalBrandAssets } from '../design-system/contract'
import { creatorSignalFoundationCss } from '../design-system/foundation-css'

export const CREATOR_SIGNAL_RENDER_PROFILE_ID = 'creator-signal.public/v1'

/**
 * Public responsive semantics shared by compiled pack classes, module
 * previews, the full-page preview and published output. These values mirror
 * the locked Design System breakpoint tokens; media queries cannot reference
 * CSS custom properties, so the adapter owns this single executable mapping.
 */
export const creatorSignalResponsiveQueries = Object.freeze({
  large: '(max-width: 64rem)',
  medium: '(max-width: 48rem)',
  small: '(max-width: 36rem)',
})

/** Theme selectors and public runtime assets; the algorithm stays vendored. */
export const creatorSignalThemeContract = Object.freeze({
  preferences: ['system', 'light', 'dark'] as const,
  themeAttribute: 'data-cs-theme',
  preferenceAttribute: 'data-cs-theme-preference',
  controlSelector: '[data-cs-theme-control]',
  bootstrapAsset: 'frontend/theme-bootstrap.js',
  controlAsset: 'frontend/theme-control.js',
})

/**
 * Instatic's plain-HTML Creator Signal adapter. Tokens, typography and theme
 * declarations come from the locked @creator-signal/design-system snapshot.
 */
export const creatorSignalCompositionCss = String.raw`
/* creator-signal-site-design-contract */
* { box-sizing: border-box; }
html {
  scroll-behavior: smooth;
  background: var(--cs-surface-canvas);
  color: var(--cs-text-primary);
}
body {
  min-height: 100vh;
  margin: 0;
  background: var(--cs-surface-canvas);
  color: var(--cs-text-primary);
  font-family: var(--cs-font-family-body);
  font-size: var(--cs-type-body-size);
  line-height: var(--cs-type-body-line-height);
}
a { color: var(--cs-action-link); }
h1, h2, h3 {
  margin: 0;
  color: var(--cs-text-primary);
  font-family: var(--cs-font-family-heading);
  text-wrap: balance;
}
h1 {
  font-size: var(--cs-type-heading1-size);
  font-weight: var(--cs-type-heading1-weight);
  line-height: var(--cs-type-heading1-line-height);
  letter-spacing: var(--cs-type-heading1-tracking);
}
h2 {
  font-size: var(--cs-type-heading2-size);
  font-weight: var(--cs-type-heading2-weight);
  line-height: var(--cs-type-heading2-line-height);
  letter-spacing: var(--cs-type-heading2-tracking);
}
h3 {
  font-size: var(--cs-type-heading3-size);
  font-weight: var(--cs-type-heading3-weight);
  line-height: var(--cs-type-heading3-line-height);
  letter-spacing: var(--cs-type-heading3-tracking);
}
p { line-height: var(--cs-type-body-line-height); }
:where(h1, h2, h3, p, li, th, td, a) { overflow-wrap: anywhere; }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
}
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
  position: relative;
  z-index: var(--cs-z-sticky);
  display: flex;
  width: min(calc(100% - (var(--cs-spacing-5) * 2)), var(--cs-size-content-max));
  margin: 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: var(--cs-spacing-6);
  padding: var(--cs-spacing-5) 0;
  border-bottom: 1px solid var(--cs-border-default);
}
.site-brand {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: var(--cs-spacing-3);
  color: var(--cs-text-primary);
  text-decoration: none;
}
.brand-mark {
  position: relative;
  display: block;
  width: var(--cs-size-control-min-target);
  height: var(--cs-size-control-min-target);
  flex: 0 0 auto;
}
.brand-mark img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.brand-mark-reversed { display: none; }
[data-cs-theme="dark"] .brand-mark-light { display: none; }
[data-cs-theme="dark"] .brand-mark-reversed { display: block; }
.site-brand strong, .site-brand small { display: block; }
.site-brand strong {
  font-family: var(--cs-font-family-heading);
  font-size: var(--cs-type-body-large-size);
  font-weight: var(--cs-type-heading3-weight);
  line-height: var(--cs-type-heading3-line-height);
}
.site-brand small {
  max-width: 24rem;
  margin-top: var(--cs-spacing-1);
  overflow: hidden;
  color: var(--cs-text-muted);
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
  font-size: var(--cs-type-body-small-size);
  font-weight: var(--cs-type-label-weight);
  text-decoration: none;
}
.site-header nav a:hover, .site-footer nav a:hover { color: var(--cs-text-primary); }
.footer-privacy-choice {
  width: fit-content;
  min-height: var(--cs-size-control-min-target);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--cs-action-link);
  cursor: pointer;
  font: inherit;
  font-size: var(--cs-type-body-small-size);
  font-weight: var(--cs-type-label-weight);
  text-align: left;
  text-decoration: underline;
  text-underline-offset: var(--cs-spacing-1);
}
.site-header-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--cs-spacing-3);
}
.theme-control {
  min-height: var(--cs-size-control-min-target);
  padding: 0 var(--cs-spacing-8) 0 var(--cs-spacing-3);
  border: 1px solid var(--cs-component-field-border);
  border-radius: var(--cs-radius-pill);
  background-color: var(--cs-component-field-background);
  color: var(--cs-component-field-foreground);
  font-family: var(--cs-font-family-ui);
  font-size: var(--cs-type-body-small-size);
  font-weight: var(--cs-type-label-weight);
}

.button {
  display: inline-flex;
  min-height: var(--cs-size-control-min-target);
  align-items: center;
  justify-content: center;
  padding: 0 var(--cs-spacing-5);
  border: 1px solid transparent;
  border-radius: var(--cs-radius-pill);
  cursor: pointer;
  font-family: var(--cs-font-family-ui);
  font-size: var(--cs-type-control-size);
  font-weight: var(--cs-type-control-weight);
  line-height: var(--cs-type-control-line-height);
  text-decoration: none;
  transition:
    transform var(--cs-motion-duration-fast) var(--cs-motion-easing-standard),
    box-shadow var(--cs-motion-duration-fast) var(--cs-motion-easing-standard),
    background var(--cs-motion-duration-fast) var(--cs-motion-easing-standard);
}
.button:hover { transform: translateY(-1px); }
.button-primary {
  background: var(--cs-component-button-primary-background);
  color: var(--cs-component-button-primary-foreground);
  box-shadow: var(--cs-shadow-sm);
}
.button-primary:hover { background: var(--cs-component-button-primary-hover); }
.button-secondary {
  border-color: var(--cs-border-default);
  background: var(--cs-component-button-secondary-background);
  color: var(--cs-component-button-secondary-foreground);
}
:is(.button, a, button, input, select, textarea, summary):focus-visible {
  outline: 3px solid var(--cs-focus-ring);
  outline-offset: 3px;
}
.actions { display: flex; flex-wrap: wrap; gap: var(--cs-spacing-3); }
.eyebrow, .cs-eyebrow {
  margin: 0 0 var(--cs-spacing-3);
  color: var(--cs-product-creator-signal-accent);
  font-family: var(--cs-font-family-decorative);
  font-size: var(--cs-type-decorative-size);
  font-weight: var(--cs-type-decorative-weight);
  line-height: var(--cs-type-decorative-line-height);
}

.hero-section {
  display: grid;
  width: min(calc(100% - (var(--cs-spacing-5) * 2)), var(--cs-size-content-max));
  min-height: min(47.5rem, calc(100vh - 6.25rem));
  margin: 0 auto;
  grid-template-columns: minmax(0, 1.08fr) minmax(20rem, .92fr);
  align-items: center;
  gap: clamp(var(--cs-spacing-10), 8vw, 7rem);
  padding: clamp(var(--cs-spacing-12), 7vw, 6rem) 0;
}
.hero-copy { max-width: 47rem; }
.hero-section h1 {
  font-size: var(--cs-type-display-size);
  font-weight: var(--cs-type-display-weight);
  line-height: var(--cs-type-display-line-height);
  letter-spacing: var(--cs-type-display-tracking);
}
.hero-body {
  max-width: 41rem;
  margin: var(--cs-spacing-6) 0;
  color: var(--cs-text-secondary);
  font-size: var(--cs-type-body-large-size);
  line-height: var(--cs-type-body-large-line-height);
}
.hero-art {
  position: relative;
  display: grid;
  min-height: 32rem;
  overflow: hidden;
  place-items: center;
  border: 1px solid var(--cs-border-default);
  border-radius: var(--cs-radius-lg);
  background-color: var(--cs-surface-subtle);
  background-image: url("${creatorSignalBrandAssets.markLight}");
  background-position: center;
  background-repeat: no-repeat;
  background-size: min(56%, 18rem) auto;
  box-shadow: var(--cs-shadow-lg);
}
[data-cs-theme="dark"] .hero-art {
  background-image: url("${creatorSignalBrandAssets.markReversed}");
}
.hero-art img {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  background: var(--cs-surface-subtle);
  object-fit: cover;
}

.campaign-hero {
  display: grid;
  width: min(calc(100% - (var(--cs-spacing-5) * 2)), var(--cs-size-content-max));
  min-height: min(47.5rem, calc(100vh - 6.25rem));
  margin: 0 auto;
  grid-template-columns: minmax(0, 1.08fr) minmax(20rem, .92fr);
  align-items: center;
  gap: clamp(var(--cs-spacing-10), 8vw, 7rem);
  padding: clamp(var(--cs-spacing-12), 7vw, 6rem) 0;
}
.campaign-hero-copy { max-width: 47rem; }
.campaign-hero h1 {
  font-size: var(--cs-type-display-size);
  font-weight: var(--cs-type-display-weight);
  line-height: var(--cs-type-display-line-height);
  letter-spacing: var(--cs-type-display-tracking);
}
.campaign-hero-body {
  max-width: 41rem;
  margin: var(--cs-spacing-6) 0;
  color: var(--cs-text-secondary);
  font-size: var(--cs-type-body-large-size);
  line-height: var(--cs-type-body-large-line-height);
}
.campaign-hero-footnote {
  margin: var(--cs-spacing-4) 0 0;
  color: var(--cs-text-muted);
  font-size: var(--cs-type-body-small-size);
}
.campaign-hero-art {
  display: grid;
  min-height: 32rem;
  overflow: hidden;
  place-items: center;
  border: 1px solid var(--cs-border-default);
  border-radius: var(--cs-radius-lg);
  background: var(--cs-surface-subtle);
  box-shadow: var(--cs-shadow-lg);
}
.campaign-hero-art img {
  width: 100%;
  height: 100%;
  max-height: 34rem;
  object-fit: cover;
}

.signal-strip {
  margin-block: var(--cs-spacing-4);
  padding: var(--cs-spacing-4) max(var(--cs-spacing-5), calc((100vw - var(--cs-size-content-max)) / 2));
  background: var(--cs-surface-inverse);
  color: var(--cs-text-inverse);
}
.signal-strip-list {
  display: flex;
  margin: 0;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--cs-spacing-3) var(--cs-spacing-6);
  padding: 0;
  list-style: none;
  font-family: var(--cs-font-family-heading);
  font-weight: var(--cs-type-label-weight);
}
.signal-strip-list li { display: inline-flex; align-items: center; gap: var(--cs-spacing-2); }
.signal-strip-list span { color: var(--cs-product-creator-signal-signature); }

.content-section {
  width: min(calc(100% - (var(--cs-spacing-5) * 2)), var(--cs-size-content-max));
  margin: 0 auto;
  padding: clamp(var(--cs-spacing-16), 9vw, 6.5rem) 0;
}
.section-intro { max-width: 47rem; margin-bottom: var(--cs-spacing-12); }
.section-intro > p:last-child,
.content-section > div > p,
.cta-section > div > p {
  color: var(--cs-text-secondary);
  font-size: var(--cs-type-body-large-size);
}
.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--cs-spacing-5);
}
.feature-grid-1 { grid-template-columns: minmax(0, 1fr); }
.feature-grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.feature-card {
  min-height: 16rem;
  padding: var(--cs-spacing-8);
  border: 1px solid var(--cs-component-card-border);
  border-radius: var(--cs-radius-lg);
  background: var(--cs-component-card-background);
  color: var(--cs-component-card-foreground);
  box-shadow: var(--cs-shadow-md);
}
.feature-number {
  display: grid;
  width: var(--cs-size-control-min-target);
  height: var(--cs-size-control-min-target);
  margin-bottom: var(--cs-spacing-10);
  place-items: center;
  border-radius: var(--cs-radius-md);
  background: var(--cs-product-creator-signal-signature);
  color: var(--cs-brand-maroon);
  font-family: var(--cs-font-family-data);
  font-weight: var(--cs-type-data-weight);
}
.feature-card p { color: var(--cs-text-secondary); }
.feature-section[data-feature-tone="signature"] {
  background: var(--cs-product-creator-signal-signature);
  box-shadow: 0 0 0 100vmax var(--cs-product-creator-signal-signature);
  clip-path: inset(0 -100vmax);
}
.feature-section[data-feature-tone="signature"] :is(h2, h3, p, .eyebrow) {
  color: var(--cs-brand-maroon);
}
.feature-section[data-feature-tone="signature"] .feature-card {
  border-color: var(--cs-brand-maroon);
  background: var(--cs-surface-canvas);
}

.signal-comparison-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--cs-spacing-6);
}
.signal-comparison-card {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: var(--cs-spacing-4);
  padding: var(--cs-spacing-8);
  border: 1px solid var(--cs-component-card-border);
  border-radius: var(--cs-radius-lg);
  background: var(--cs-component-card-background);
  color: var(--cs-component-card-foreground);
  box-shadow: var(--cs-shadow-md);
}
.signal-comparison-card > :is(h3, p) { margin: 0; }
.signal-comparison-card > p:last-child { color: var(--cs-text-secondary); }
.comparison-label {
  width: fit-content;
  padding: var(--cs-spacing-1) var(--cs-spacing-3);
  border-radius: var(--cs-radius-pill);
  background: var(--cs-product-creator-signal-signature);
  color: var(--cs-brand-maroon);
  font-weight: var(--cs-type-label-weight);
}
.comparison-bars {
  display: flex;
  min-height: 16rem;
  align-items: end;
  justify-content: center;
  gap: var(--cs-spacing-4);
  padding: var(--cs-spacing-8);
  border-radius: var(--cs-radius-md);
  background: var(--cs-surface-subtle);
}
.comparison-bars span {
  width: var(--cs-spacing-8);
  border-radius: var(--cs-radius-sm) var(--cs-radius-sm) 0 0;
  background: var(--cs-border-strong);
}
.comparison-bars span:nth-child(1) { height: 35%; }
.comparison-bars span:nth-child(2) { height: 62%; }
.comparison-bars span:nth-child(3) { height: 48%; }
.comparison-bars span:nth-child(4) { height: 78%; }
.signal-comparison-art {
  display: grid;
  min-height: 16rem;
  overflow: hidden;
  place-items: center;
  border-radius: var(--cs-radius-md);
  background: var(--cs-surface-subtle);
}
.signal-comparison-art img { width: 100%; height: 100%; max-height: 20rem; object-fit: cover; }

.process-steps {
  position: relative;
  display: grid;
  margin: 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--cs-spacing-8);
  padding: 0;
  list-style: none;
}
.process-steps::before {
  position: absolute;
  top: calc(var(--cs-size-control-min-target) / 2);
  right: 8%;
  left: 8%;
  height: 1px;
  background: var(--cs-border-strong);
  content: "";
}
.process-step { position: relative; display: grid; justify-items: center; gap: var(--cs-spacing-5); text-align: center; }
.process-step-number {
  z-index: 1;
  display: grid;
  width: var(--cs-size-control-min-target);
  height: var(--cs-size-control-min-target);
  place-items: center;
  border-radius: var(--cs-radius-pill);
  background: var(--cs-action-primary-background);
  color: var(--cs-action-primary-foreground);
  font-family: var(--cs-font-family-data);
  font-weight: var(--cs-type-data-weight);
  box-shadow: 0 0 0 var(--cs-spacing-3) var(--cs-surface-canvas);
}
.process-step :is(h3, p) { margin: 0; }
.process-step p { margin-top: var(--cs-spacing-2); color: var(--cs-text-secondary); }

.pricing-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--cs-spacing-5); }
.pricing-card {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  padding: var(--cs-spacing-8);
  border: 1px solid var(--cs-component-card-border);
  border-radius: var(--cs-radius-lg);
  background: var(--cs-component-card-background);
  color: var(--cs-component-card-foreground);
  box-shadow: var(--cs-shadow-md);
}
.pricing-card-featured { border-color: var(--cs-action-primary-background); box-shadow: var(--cs-shadow-lg); }
.pricing-badge {
  width: fit-content;
  margin: 0 0 var(--cs-spacing-5);
  padding: var(--cs-spacing-1) var(--cs-spacing-3);
  border-radius: var(--cs-radius-pill);
  background: var(--cs-product-creator-signal-signature);
  color: var(--cs-brand-maroon);
  font-size: var(--cs-type-body-small-size);
  font-weight: var(--cs-type-label-weight);
}
.pricing-card h3 { margin: 0; }
.pricing-price {
  margin: var(--cs-spacing-3) 0;
  color: var(--cs-product-creator-signal-accent);
  font-family: var(--cs-font-family-heading);
  font-size: var(--cs-type-heading1-size);
  font-weight: var(--cs-type-heading1-weight);
}
.pricing-price span { color: var(--cs-text-muted); font-family: var(--cs-font-family-ui); font-size: var(--cs-type-body-small-size); }
.pricing-card > p:not(.pricing-badge, .pricing-price), .pricing-card li { color: var(--cs-text-secondary); }
.pricing-card ul { display: grid; margin: var(--cs-spacing-5) 0 var(--cs-spacing-8); gap: var(--cs-spacing-3); padding-inline-start: var(--cs-spacing-5); }
.pricing-card .button { margin-top: auto; }
.pricing-footnote { margin: var(--cs-spacing-6) 0 0; color: var(--cs-text-muted); text-align: center; }

.founder-story {
  padding: clamp(var(--cs-spacing-12), 8vw, var(--cs-spacing-16)) max(var(--cs-spacing-5), calc((100vw - var(--cs-size-content-max)) / 2));
  background: var(--cs-surface-inverse);
  color: var(--cs-text-inverse);
}
.founder-story-inner {
  display: grid;
  max-width: var(--cs-size-content-max);
  margin: 0 auto;
  grid-template-columns: minmax(16rem, .8fr) minmax(0, 1.2fr);
  align-items: center;
  gap: clamp(var(--cs-spacing-8), 6vw, var(--cs-spacing-16));
}
.founder-portrait {
  display: grid;
  min-height: 24rem;
  overflow: hidden;
  place-items: center;
  border: 1px solid var(--cs-border-strong);
  border-radius: var(--cs-radius-lg);
  background: var(--cs-brand-maroon);
}
.founder-portrait img { width: 100%; height: 100%; max-height: 31rem; object-fit: cover; }
.founder-copy h2 { color: var(--cs-text-inverse); }
.founder-copy .eyebrow { color: var(--cs-product-creator-signal-signature); }
.founder-body { color: var(--cs-text-inverse); font-size: var(--cs-type-body-large-size); }
.founder-body > :first-child { margin-top: 0; }
.founder-body > :last-child { margin-bottom: 0; }
.founder-attribution { display: grid; margin: var(--cs-spacing-6) 0 0; }
.founder-attribution strong { color: var(--cs-product-creator-signal-signature); font-family: var(--cs-font-family-heading); }
.founder-attribution span { color: var(--cs-text-inverse); font-size: var(--cs-type-body-small-size); }
.narrow-content { max-width: 51rem; }
.narrow-content h2 { margin-bottom: var(--cs-spacing-8); }
.prose-content {
  color: var(--cs-text-primary);
  font-size: var(--cs-type-body-size);
  line-height: var(--cs-type-body-line-height);
}
.prose-content > :first-child { margin-top: 0; }
.prose-content > :last-child { margin-bottom: 0; }
.prose-content p, .prose-content li { color: var(--cs-text-secondary); }
.prose-content h2, .prose-content h3 { margin: 1.6em 0 .65em; }
.prose-content a { color: var(--cs-action-link); font-weight: var(--cs-type-label-weight); }
.prose-content blockquote {
  margin: var(--cs-spacing-8) 0;
  padding: var(--cs-spacing-2) 0 var(--cs-spacing-2) var(--cs-spacing-6);
  border-left: var(--cs-spacing-1) solid var(--cs-product-creator-signal-accent);
  color: var(--cs-text-secondary);
  font-family: var(--cs-font-family-decorative);
  font-size: var(--cs-type-decorative-size);
}

.cta-section {
  display: flex;
  width: min(calc(100% - (var(--cs-spacing-5) * 2)), var(--cs-size-content-max));
  margin: var(--cs-spacing-16) auto;
  align-items: end;
  justify-content: space-between;
  gap: var(--cs-spacing-10);
  padding: clamp(var(--cs-spacing-8), 7vw, var(--cs-spacing-16));
  border-radius: var(--cs-radius-lg);
  background: var(--cs-surface-inverse);
  color: var(--cs-text-inverse);
  box-shadow: var(--cs-shadow-lg);
}
.cta-copy { max-width: 45rem; }
.cta-section h2 { color: var(--cs-text-inverse); }
.cta-section .eyebrow { color: var(--cs-product-creator-signal-signature); }
.cta-section .cta-copy > p { color: var(--cs-text-inverse); }
.cta-section .button-primary { background: var(--cs-surface-canvas); color: var(--cs-text-primary); }

.testimonial {
  width: min(calc(100% - (var(--cs-spacing-5) * 2)), 56rem);
  margin: var(--cs-spacing-16) auto;
  padding: clamp(var(--cs-spacing-8), 7vw, var(--cs-spacing-16));
  border: 1px solid var(--cs-border-default);
  border-radius: var(--cs-radius-lg);
  background: var(--cs-surface-subtle);
  text-align: center;
}
.testimonial blockquote {
  margin: 0;
  font-family: var(--cs-font-family-heading);
  font-size: var(--cs-type-heading1-size);
  line-height: var(--cs-type-heading1-line-height);
}
.testimonial figcaption { margin-top: var(--cs-spacing-6); color: var(--cs-text-muted); }
.testimonial figcaption strong, .testimonial figcaption span { display: block; }
.faq-list { margin-top: var(--cs-spacing-8); border-top: 1px solid var(--cs-border-default); }
.faq-list details { padding: var(--cs-spacing-5) 0; border-bottom: 1px solid var(--cs-border-default); }
.faq-list summary { cursor: pointer; font-size: var(--cs-type-body-large-size); font-weight: var(--cs-type-label-weight); }
.faq-list p { color: var(--cs-text-secondary); }

.comparison-table-scroll {
  overflow-x: auto;
  border: 1px solid var(--cs-border-default);
  border-radius: var(--cs-radius-lg);
  background: var(--cs-surface-raised);
  box-shadow: var(--cs-shadow-sm);
}
.comparison-table-scroll:focus-visible { outline: var(--cs-spacing-1) solid var(--cs-focus-ring); outline-offset: var(--cs-spacing-1); }
.comparison-table {
  width: 100%;
  min-width: var(--cs-breakpoint-md);
  border-collapse: collapse;
  color: var(--cs-text-primary);
}
.comparison-table caption {
  padding: var(--cs-spacing-5);
  color: var(--cs-text-secondary);
  font-weight: var(--cs-type-label-weight);
  text-align: left;
}
.comparison-table th,
.comparison-table td {
  padding: var(--cs-spacing-4) var(--cs-spacing-5);
  border-top: 1px solid var(--cs-border-default);
  text-align: left;
  vertical-align: top;
}
.comparison-table thead { background: var(--cs-surface-subtle); }
.comparison-table tbody th { font-weight: var(--cs-type-label-weight); }
.comparison-table tbody td { color: var(--cs-text-secondary); }

.recovery-state {
  display: grid;
  width: min(calc(100% - (var(--cs-spacing-5) * 2)), 51rem);
  margin: var(--cs-spacing-16) auto;
  justify-items: start;
  gap: var(--cs-spacing-5);
  padding: clamp(var(--cs-spacing-8), 8vw, var(--cs-spacing-16));
  border: 1px solid var(--cs-border-default);
  border-radius: var(--cs-radius-lg);
  background: var(--cs-surface-raised);
  box-shadow: var(--cs-shadow-lg);
}
.recovery-state h1,
.recovery-state p { margin: 0; }
.recovery-state > p:not(.eyebrow) { color: var(--cs-text-secondary); font-size: var(--cs-type-body-large-size); }
.recovery-state[data-recovery-state="error"] { border-inline-start: var(--cs-spacing-2) solid var(--cs-status-error-foreground); }
.recovery-state[data-recovery-state="not-found"] { border-inline-start: var(--cs-spacing-2) solid var(--cs-status-info-foreground); }
.recovery-state[data-recovery-state="offline"] { border-inline-start: var(--cs-spacing-2) solid var(--cs-status-warning-foreground); }

.site-footer {
  display: grid;
  width: min(calc(100% - (var(--cs-spacing-5) * 2)), var(--cs-size-content-max));
  margin: var(--cs-spacing-16) auto 0;
  grid-template-columns: minmax(16rem, .7fr) minmax(0, 1.3fr);
  align-items: center;
  gap: var(--cs-spacing-8);
  padding: var(--cs-spacing-10) 0;
  border-top: 1px solid var(--cs-border-default);
}
.site-footer p { margin: var(--cs-spacing-1) 0 0; color: var(--cs-text-muted); }
.site-footer small { color: var(--cs-text-muted); }
.footer-meta { display: grid; gap: var(--cs-spacing-4); }
.consent {
  position: fixed;
  right: var(--cs-spacing-5);
  bottom: var(--cs-spacing-5);
  z-index: var(--cs-z-toast);
  display: grid;
  width: min(calc(100% - (var(--cs-spacing-5) * 2)), 40rem);
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--cs-spacing-5);
  padding: var(--cs-spacing-6);
  border: 1px solid var(--cs-border-default);
  border-radius: var(--cs-radius-lg);
  background: var(--cs-surface-raised);
  box-shadow: var(--cs-shadow-lg);
}
.consent[hidden] { display: none; }
.consent strong { display: block; font-size: var(--cs-type-body-size); }
.consent p {
  max-width: 35rem;
  margin: var(--cs-spacing-2) 0 0;
  color: var(--cs-text-secondary);
  font-size: var(--cs-type-body-small-size);
}
.consent-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--cs-spacing-2);
}
.consent .button { flex: 0 0 auto; font-size: var(--cs-type-body-small-size); white-space: nowrap; }
.public-document {
  width: min(calc(100% - (var(--cs-spacing-5) * 2)), 51rem);
  margin: 0 auto;
  padding-top: clamp(var(--cs-spacing-16), 10vw, 7.5rem);
}
.public-document-header {
  margin-bottom: var(--cs-spacing-12);
  padding-bottom: var(--cs-spacing-8);
  border-bottom: 1px solid var(--cs-border-default);
}
.public-document-header h1 { max-width: 56rem; }
.public-document-header > p:not(.eyebrow) {
  max-width: 45rem;
  margin: var(--cs-spacing-6) 0 0;
  color: var(--cs-text-secondary);
  font-size: var(--cs-type-body-large-size);
}
.public-document .prose-content { padding-bottom: var(--cs-spacing-16); }

/* --cs-breakpoint-lg is 64rem; custom properties are invalid in media queries. */
@media ${creatorSignalResponsiveQueries.large} {
  .site-header { align-items: flex-start; flex-wrap: wrap; }
  .site-header-tools { width: 100%; flex-wrap: wrap; justify-content: space-between; }
  .site-header nav { width: 100%; justify-content: flex-start; gap: var(--cs-spacing-3); }
  .site-header nav a {
    min-height: var(--cs-size-control-min-target);
    align-items: center;
    padding: var(--cs-spacing-2) var(--cs-spacing-3);
  }
  /* !important keeps responsive overrides above late Visual Component class emission. */
  .hero-section { min-height: auto !important; grid-template-columns: 1fr !important; }
  .campaign-hero { min-height: auto; grid-template-columns: 1fr; }
  .hero-art { min-height: 24rem !important; }
  .campaign-hero-art { min-height: 24rem; }
  .feature-grid { grid-template-columns: 1fr; }
  .feature-card { min-height: 0; }
  .feature-number { margin-bottom: var(--cs-spacing-6); }
  .cta-section { align-items: flex-start; flex-direction: column; }
  .signal-comparison-grid, .pricing-grid, .founder-story-inner { grid-template-columns: 1fr; }
  .process-steps { grid-template-columns: 1fr; }
  .process-steps::before { display: none; }
  .process-step { grid-template-columns: var(--cs-size-control-min-target) minmax(0, 1fr); align-items: start; justify-items: start; text-align: left; }
  .process-step-number { box-shadow: none; }
  .founder-portrait { min-height: 19rem; }
  .site-footer { grid-template-columns: 1fr; }
}
/* --cs-breakpoint-md is 48rem. */
@media ${creatorSignalResponsiveQueries.medium} {
  .site-header { flex-wrap: wrap; }
  .site-header-tools { width: 100%; justify-content: space-between; }
  .site-header nav { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .site-header nav a { justify-content: center; text-align: center; }
  .site-header nav .button { width: 100%; }
  .consent { grid-template-columns: 1fr; align-items: start; }
  .consent-actions { justify-content: flex-start; }
}
/* --cs-breakpoint-sm is 36rem. */
@media ${creatorSignalResponsiveQueries.small} {
  .site-brand small { display: none; }
  .site-header nav .button { min-height: var(--cs-size-control-min-target); padding-inline: var(--cs-spacing-4); }
  .theme-control { max-width: 8.5rem; }
  .hero-section, .campaign-hero, .content-section, .cta-section, .testimonial, .public-document, .recovery-state {
    width: calc(100% - (var(--cs-spacing-4) * 2)) !important;
  }
  .hero-art { min-height: 19rem !important; }
  .campaign-hero-art, .comparison-bars, .signal-comparison-art { min-height: 16rem; }
  .signal-comparison-card, .pricing-card { padding: var(--cs-spacing-5); }
  .consent {
    right: var(--cs-spacing-4);
    bottom: var(--cs-spacing-4);
    width: calc(100% - (var(--cs-spacing-4) * 2));
    padding: var(--cs-spacing-5);
  }
  .consent-actions { display: grid; grid-template-columns: 1fr; width: 100%; }
  .consent .button { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .skip-link, .button, .feature-card, .hero-art, .campaign-hero-art, .cs-mautic .mauticform-button {
    transition: none !important;
    animation: none !important;
  }
  .button:hover, .cs-mautic .mauticform-button:hover { transform: none !important; }
}
@media (forced-colors: active) {
  .button, .feature-card, .hero-art, .campaign-hero-art, .signal-comparison-card, .pricing-card, .founder-portrait, .comparison-table, .cs-mautic-form-shell, .consent {
    border: 1px solid ButtonText;
    box-shadow: none;
  }
  .eyebrow, .cs-eyebrow, .feature-number { color: CanvasText; }
}
`

export const creatorSignalCss = `${creatorSignalFoundationCss}\n${creatorSignalCompositionCss}`

/**
 * The one public rendering profile consumed by both authoring and publishing.
 * Component-specific extensions (currently the managed-form rules) append to
 * `stylesheet`; they never replace or fork this governed foundation.
 */
export const creatorSignalRenderProfile = Object.freeze({
  id: CREATOR_SIGNAL_RENDER_PROFILE_ID,
  stylesheetMarker: 'creator-signal-site-design-contract',
  stylesheet: creatorSignalCss,
  responsiveQueries: creatorSignalResponsiveQueries,
  theme: creatorSignalThemeContract,
})
