import { creatorSignalFoundationCss } from '../design-system/foundation-css'
import { creatorSignalProductionLookTokens } from '../design-system/production-look-tokens'

export const CREATOR_SIGNAL_RENDER_PROFILE_ID = 'creator-signal.public/v1'

/** Public responsive breakpoints shared by authoring previews and publishing. */
export const creatorSignalResponsiveQueries = Object.freeze({
  large: '(max-width: 900px)',
  medium: '(max-width: 720px)',
  small: '(max-width: 560px)',
})

/** Theme assets remain available, while the public composition preserves the production look. */
export const creatorSignalThemeContract = Object.freeze({
  preferences: ['system', 'light', 'dark'] as const,
  themeAttribute: 'data-cs-theme',
  preferenceAttribute: 'data-cs-theme-preference',
  controlSelector: '[data-cs-theme-control]',
  bootstrapAsset: 'frontend/theme-bootstrap.js',
  controlAsset: 'frontend/theme-control.js',
})

/**
 * Plain semantic HTML styling shared by isolated component previews, the page
 * canvas and published output. The values and responsive geometry match the
 * production public-site baseline captured by the parity verifier.
 */
export const creatorSignalCompositionCss = String.raw`
/* creator-signal-site-design-contract */
* { box-sizing: border-box; }
html { scroll-behavior: smooth; background: var(--cs-surface-canvas); color: var(--cs-text-primary); }
body {
  min-height: 100vh;
  margin: 0;
  background: var(--cs-surface-canvas);
  color: var(--cs-text-primary);
  font-family: var(--cs-font-family-body);
}
a { color: inherit; }
main { min-width: 0; overflow-wrap: anywhere; }
h1, h2, h3 {
  margin: 0;
  font-family: var(--cs-font-family-heading);
  font-weight: 600;
  line-height: 1.04;
  letter-spacing: -.035em;
  text-wrap: balance;
}
h1 { font-size: 7rem; }
h2 { font-size: 4rem; }
h3 { font-size: 1.45rem; }
p { line-height: 1.7; }

.site-header {
  position: relative;
  z-index: 20;
  display: flex;
  width: calc(100% - 40px);
  max-width: 1240px;
  margin: 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  padding: 22px 0;
}
.site-brand {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}
.site-brand strong, .site-brand small { display: block; }
.site-brand strong { font: 600 1.15rem var(--cs-font-family-heading); }
.site-brand small {
  max-width: 300px;
  margin-top: 2px;
  overflow: hidden;
  color: var(--cs-muted);
  font-size: .75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.brand-signal {
  display: flex;
  width: 46px;
  height: 46px;
  align-items: end;
  justify-content: center;
  gap: 3px;
  padding: 10px;
  border-radius: 15px;
  background: var(--cs-sage);
  box-shadow: var(--cs-site-shadow-brand);
}
.brand-signal i {
  display: block;
  width: 5px;
  border-radius: 99px;
  background: white;
}
.brand-signal i:nth-child(1) { height: 10px; opacity: .72; }
.brand-signal i:nth-child(2) { height: 24px; }
.brand-signal i:nth-child(3) { height: 16px; opacity: .84; }
.site-header nav, .site-footer nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
}
.site-header nav a:not(.button), .site-footer nav a {
  color: var(--cs-muted);
  font-size: .9rem;
  font-weight: 600;
  text-decoration: none;
}
.site-header nav a:hover, .site-footer nav a:hover { color: var(--cs-ink); }

.button {
  display: inline-flex;
  min-height: 46px;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  font: inherit;
  font-weight: 650;
  text-decoration: none;
  transition: transform .16s ease, box-shadow .16s ease, background .16s ease;
}
.button:hover { transform: translateY(-1px); }
.button-primary {
  background: var(--cs-sage);
  color: white;
  box-shadow: var(--cs-site-shadow-action);
}
.button-secondary {
  border-color: var(--cs-line);
  background: var(--cs-site-button-secondary-background);
  color: var(--cs-ink);
}
.button:focus-visible, a:focus-visible, summary:focus-visible {
  outline: 3px solid var(--cs-blue);
  outline-offset: 3px;
}
.actions { display: flex; flex-wrap: wrap; gap: 10px; }
.eyebrow {
  margin: 0 0 12px;
  color: var(--cs-sage);
  font-size: .76rem;
  font-weight: 750;
  letter-spacing: .13em;
  text-transform: uppercase;
}

.hero-section {
  display: grid;
  width: calc(100% - 40px);
  max-width: 1240px;
  min-height: min(760px, calc(100vh - 100px));
  margin: 0 auto;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, .9fr);
  align-items: center;
  gap: 110px;
  padding: 70px 0 110px;
}
.hero-copy { max-width: 760px; min-width: 0; }
.hero-body {
  max-width: 650px;
  margin: 28px 0;
  color: var(--cs-muted);
  font-size: 1.3rem;
}
.hero-art {
  position: relative;
  display: grid;
  min-height: 520px;
  overflow: hidden;
  place-items: center;
  border: 1px solid var(--cs-site-art-border);
  border-radius: 46% 54% 42% 58% / 56% 42% 58% 44%;
  background: var(--cs-site-art-background);
  box-shadow: var(--cs-shadow);
}
.hero-art::before, .hero-art::after {
  position: absolute;
  width: 230px;
  height: 230px;
  border: 1px solid var(--cs-site-art-ring);
  border-radius: 50%;
  content: "";
}
.hero-art::before { top: -45px; right: -30px; }
.hero-art::after {
  bottom: -80px;
  left: -30px;
  width: 310px;
  height: 310px;
}
.hero-art img {
  position: absolute;
  z-index: 2;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.signal-visual {
  position: relative;
  z-index: 1;
  display: flex;
  height: 210px;
  align-items: center;
  gap: 14px;
  transform: rotate(-7deg);
}
.signal-visual span {
  display: block;
  width: 48px;
  border-radius: 999px;
  background: var(--cs-site-art-bar);
  box-shadow: var(--cs-shadow);
}
.signal-visual span:nth-child(1) { height: 90px; }
.signal-visual span:nth-child(2) { height: 190px; background: var(--cs-sage); }
.signal-visual span:nth-child(3) { height: 135px; background: var(--cs-site-art-clay); }
.signal-visual span:nth-child(4) { height: 70px; }

.content-section {
  width: calc(100% - 40px);
  max-width: 1160px;
  margin: 0 auto;
  padding: 100px 0;
}
.section-intro { max-width: 760px; margin-bottom: 46px; }
.section-intro > p:last-child,
.content-section > div > p,
.cta-section > div > p {
  color: var(--cs-muted);
  font-size: 1.08rem;
}
.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}
.feature-card {
  min-height: 260px;
  padding: 32px;
  border: 1px solid var(--cs-line);
  border-radius: 24px;
  background: var(--cs-card);
  box-shadow: var(--cs-shadow);
}
.feature-number {
  display: grid;
  width: 48px;
  height: 48px;
  margin-bottom: 50px;
  place-items: center;
  border-radius: 15px;
  background: var(--cs-sage-pale);
  color: var(--cs-sage);
  font-weight: 750;
}
.feature-card p { color: var(--cs-muted); }
.narrow-content { max-width: 820px; }
.narrow-content h2 { margin-bottom: 30px; }
.prose-content { color: var(--cs-ink); font-size: 1.04rem; line-height: 1.75; }
.prose-content > :first-child { margin-top: 0; }
.prose-content > :last-child { margin-bottom: 0; }
.prose-content p, .prose-content li { color: var(--cs-muted); }
.prose-content h2, .prose-content h3 { margin: 1.6em 0 .65em; }
.prose-content a { color: var(--cs-sage); font-weight: 650; }
.prose-content blockquote {
  margin: 32px 0;
  padding: 8px 0 8px 24px;
  border-left: 4px solid var(--cs-clay);
  color: var(--cs-muted);
  font: 1.25rem var(--cs-font-family-heading);
}

.cta-section {
  display: flex;
  width: calc(100% - 40px);
  max-width: 1160px;
  margin: 90px auto;
  align-items: end;
  justify-content: space-between;
  gap: 40px;
  padding: 76px;
  border-radius: 32px;
  background: var(--cs-ink);
  color: white;
  box-shadow: var(--cs-shadow);
}
.cta-copy { max-width: 720px; }
.cta-section .eyebrow { color: var(--cs-site-cta-eyebrow); }
.cta-section .cta-copy > p { color: var(--cs-site-cta-copy); }
.cta-section .button-primary { background: white; color: var(--cs-ink); }

.testimonial {
  width: calc(100% - 40px);
  max-width: 900px;
  margin: 90px auto;
  padding: 80px;
  border-radius: 30px;
  background: var(--cs-clay-pale);
  text-align: center;
}
.testimonial blockquote {
  margin: 0;
  font-family: var(--cs-font-family-heading);
  font-size: 3.1rem;
  line-height: 1.25;
}
.testimonial figcaption { margin-top: 28px; color: var(--cs-muted); }
.testimonial figcaption strong, .testimonial figcaption span { display: block; }

.faq-list { margin-top: 34px; border-top: 1px solid var(--cs-line); }
.faq-list details { padding: 22px 0; border-bottom: 1px solid var(--cs-line); }
.faq-list summary { cursor: pointer; font-size: 1.08rem; font-weight: 700; }
.faq-list p { color: var(--cs-muted); }

.site-footer {
  display: grid;
  width: calc(100% - 40px);
  max-width: 1240px;
  margin: 100px auto 0;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 28px;
  padding: 42px 0;
  border-top: 1px solid var(--cs-line);
}
.site-footer p { margin: 5px 0 0; color: var(--cs-muted); }
.site-footer small { color: var(--cs-muted); }
.footer-meta { display: grid; gap: 16px; }

.consent {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 100;
  display: grid;
  width: calc(100% - 40px);
  max-width: 640px;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 22px;
  padding: 24px;
  border: 1px solid var(--cs-line);
  border-radius: 20px;
  background: white;
  box-shadow: var(--cs-site-shadow-consent);
}
.consent[hidden] { display: none; }
.consent strong { display: block; font-size: 1.02rem; line-height: 1.35; }
.consent p {
  max-width: 35rem;
  margin: 6px 0 0;
  color: var(--cs-muted);
  font-size: .88rem;
  line-height: 1.55;
}
.consent-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}
.consent .button {
  flex: 0 0 auto;
  min-height: 42px;
  padding-inline: 16px;
  font-size: .82rem;
  white-space: nowrap;
}

.public-document {
  width: calc(100% - 40px);
  max-width: 820px;
  margin: 0 auto;
  padding-top: 120px;
}
.public-document-header {
  margin-bottom: 48px;
  padding-bottom: 36px;
  border-bottom: 1px solid var(--cs-line);
}
.public-document-header h1 {
  max-width: 900px;
  font-size: 5.8rem;
}
.public-document-header > p:not(.eyebrow) {
  max-width: 720px;
  margin: 24px 0 0;
  color: var(--cs-muted);
  font-size: 1.14rem;
}
.public-document .prose-content { padding-bottom: 80px; }

@media (max-width: 900px) {
  h1 { font-size: 5.2rem; }
  h2 { font-size: 3.2rem; }
  .site-header { align-items: flex-start; }
  .site-header nav { justify-content: flex-end; gap: 10px; }
  .site-header nav a:not(.button) { display: none; }
  .hero-section {
    min-height: auto;
    grid-template-columns: minmax(0, 1fr);
    padding-top: 55px;
  }
  .hero-art { min-height: 380px; }
  .feature-grid { grid-template-columns: 1fr; }
  .feature-card { min-height: 0; }
  .feature-number { margin-bottom: 28px; }
  .cta-section {
    align-items: flex-start;
    flex-direction: column;
    padding: 56px;
  }
  .testimonial { padding: 56px; }
  .testimonial blockquote { font-size: 2.5rem; }
  .public-document { padding-top: 88px; }
  .public-document-header h1 { font-size: 4.5rem; }
  .site-footer { grid-template-columns: 1fr; }
}

@media (max-width: 720px) {
  .consent { grid-template-columns: 1fr; align-items: start; }
  .consent-actions { justify-content: flex-start; }
}

@media (max-width: 560px) {
  h1 { font-size: 3.8rem; }
  h2 { font-size: 2.6rem; }
  .site-brand small { display: none; }
  .site-header nav .button { min-height: 40px; padding-inline: 14px; }
  .hero-section, .content-section { width: calc(100% - 28px); }
  .hero-art { min-height: 310px; border-radius: 30px; }
  .cta-section {
    width: calc(100% - 28px);
    margin-block: 55px;
    padding: 36px;
    border-radius: 24px;
  }
  .testimonial {
    width: calc(100% - 28px);
    padding: 36px;
  }
  .testimonial blockquote { font-size: 2rem; }
  .public-document { width: calc(100% - 28px); padding-top: 64px; }
  .public-document-header h1 { font-size: 3.4rem; }
  .consent {
    right: 14px;
    bottom: 14px;
    width: calc(100% - 28px);
    padding: 20px;
  }
  .consent-actions { display: grid; grid-template-columns: 1fr; width: 100%; }
  .consent .button { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    scroll-behavior: auto !important;
    transition: none !important;
  }
  .button:hover { transform: none; }
}

/* Active component extensions retain the production public-site visual contract. */
.skip-link {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 200;
  padding: 12px 16px;
  transform: translateY(calc(-100% - 20px));
  border: 2px solid var(--cs-blue);
  border-radius: 10px;
  background: var(--cs-card);
  color: var(--cs-ink);
  font-weight: 650;
  transition: transform .16s ease;
}
.skip-link:focus { transform: translateY(0); }

.campaign-hero {
  display: grid;
  width: calc(100% - 40px);
  max-width: 1240px;
  min-height: min(760px, calc(100vh - 100px));
  margin: 0 auto;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, .9fr);
  align-items: center;
  gap: 110px;
  padding: 70px 0 110px;
}
.campaign-hero-copy { max-width: 760px; min-width: 0; }
.campaign-hero-body {
  max-width: 650px;
  margin: 28px 0;
  color: var(--cs-muted);
  font-size: 1.3rem;
}
.campaign-hero-footnote { margin: 14px 0 0; color: var(--cs-muted); font-size: .88rem; }
.campaign-hero-art,
.signal-comparison-art,
.founder-portrait {
  display: grid;
  min-height: 420px;
  overflow: hidden;
  place-items: center;
  border: 1px solid var(--cs-line);
  border-radius: 30px;
  background: linear-gradient(135deg, var(--cs-sage-pale), var(--cs-clay-pale));
  box-shadow: var(--cs-shadow);
}
.campaign-hero-art img,
.signal-comparison-art img,
.founder-portrait img { display: block; width: 100%; height: 100%; object-fit: cover; }

.signal-strip {
  padding: 18px 20px;
  background: var(--cs-sage);
  color: var(--cs-card);
}
.signal-strip-list {
  display: flex;
  max-width: 1240px;
  margin: 0 auto;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px 28px;
  padding: 0;
  list-style: none;
  font-weight: 700;
}
.signal-strip-list span { margin-right: 8px; color: var(--cs-clay-pale); }

.feature-section[data-feature-tone="signature"] {
  max-width: none;
  padding-inline: max(20px, calc((100% - 1160px) / 2));
  background: var(--cs-clay-pale);
}
.feature-section[data-feature-tone="signature"] .section-intro > p,
.testimonial figcaption { color: var(--cs-ink); }
.feature-grid-1 { grid-template-columns: minmax(0, 1fr); }
.feature-grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.feature-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }

.signal-comparison,
.process-section,
.pricing-plans,
.comparison-section,
.recovery-state {
  width: calc(100% - 40px);
  max-width: 1160px;
  margin: 0 auto;
  padding: 100px 0;
}
.signal-comparison-grid,
.pricing-grid,
.founder-story-inner {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}
.signal-comparison-card,
.pricing-card {
  padding: 32px;
  border: 1px solid var(--cs-line);
  border-radius: 24px;
  background: var(--cs-card);
  box-shadow: var(--cs-shadow);
}
.signal-comparison-card > p:last-child,
.pricing-card > p,
.pricing-card li,
.process-step p,
.pricing-footnote { color: var(--cs-muted); }
.comparison-label,
.pricing-badge {
  display: inline-flex;
  margin: 0 0 24px;
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--cs-sage-pale);
  color: var(--cs-sage);
  font-weight: 750;
}
.process-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
  padding: 0;
  list-style: none;
}
.process-step { text-align: center; }
.process-step-number {
  display: grid;
  width: 48px;
  height: 48px;
  margin: 0 auto 20px;
  place-items: center;
  border-radius: 50%;
  background: var(--cs-sage);
  color: var(--cs-card);
  font-weight: 750;
}
.pricing-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.pricing-card-featured { border-color: var(--cs-sage); }
.pricing-price {
  color: var(--cs-sage);
  font: 600 3rem var(--cs-font-family-heading);
}
.pricing-price span { color: var(--cs-muted); font: .88rem var(--cs-font-family-body); }
.pricing-card ul { min-height: 9rem; padding-left: 1.2rem; }
.pricing-footnote { text-align: center; }

.founder-story {
  padding: 100px 20px;
  background: var(--cs-ink);
  color: var(--cs-card);
}
.founder-story-inner { max-width: 1160px; margin: 0 auto; align-items: center; }
.founder-copy h2 { color: var(--cs-card); }
.founder-copy .eyebrow { color: var(--cs-sage-pale); }
.founder-body { color: var(--cs-clay-pale); font-size: 1.08rem; }
.founder-attribution strong,
.founder-attribution span { display: block; }
.founder-attribution strong { color: var(--cs-sage-pale); }

.comparison-table-scroll { overflow-x: auto; }
.comparison-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--cs-line);
  background: var(--cs-card);
}
.comparison-table caption { padding: 16px; color: var(--cs-muted); text-align: left; }
.comparison-table th,
.comparison-table td { padding: 18px; border: 1px solid var(--cs-line); text-align: left; }
.comparison-table th { font-family: var(--cs-font-family-heading); }

.recovery-state { max-width: 820px; min-height: 55vh; }
.recovery-state > p:not(.eyebrow) { max-width: 640px; color: var(--cs-muted); font-size: 1.08rem; }
.recovery-state .actions { margin-top: 28px; }

@media (max-width: 900px) {
  .campaign-hero { min-height: auto; grid-template-columns: minmax(0, 1fr); padding-top: 55px; }
  .campaign-hero-art { min-height: 380px; }
  .feature-grid-2,
  .feature-grid-3,
  .signal-comparison-grid,
  .pricing-grid,
  .founder-story-inner,
  .process-steps { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .campaign-hero,
  .signal-comparison,
  .process-section,
  .pricing-plans,
  .comparison-section,
  .recovery-state { width: calc(100% - 28px); }
  .campaign-hero-art,
  .signal-comparison-art,
  .founder-portrait { min-height: 310px; }
  .signal-comparison-card,
  .pricing-card { padding: 24px; }
}
@media (forced-colors: active) {
  :root,
  [data-cs-theme] {
    --cs-paper: Canvas;
    --cs-cream: Canvas;
    --cs-card: Canvas;
    --cs-ink: CanvasText;
    --cs-muted: CanvasText;
    --cs-sage: ButtonText;
    --cs-sage-pale: ButtonFace;
    --cs-clay: Highlight;
    --cs-clay-pale: Canvas;
    --cs-blue: Highlight;
    --cs-line: CanvasText;
  }
}
`

export const creatorSignalCss = `${creatorSignalFoundationCss}\n${creatorSignalProductionLookTokens}\n${creatorSignalCompositionCss}`

/** The one render profile used by component previews and published pages. */
export const creatorSignalRenderProfile = Object.freeze({
  id: CREATOR_SIGNAL_RENDER_PROFILE_ID,
  stylesheetMarker: 'creator-signal-site-design-contract',
  stylesheet: creatorSignalCss,
  responsiveQueries: creatorSignalResponsiveQueries,
  theme: creatorSignalThemeContract,
})
