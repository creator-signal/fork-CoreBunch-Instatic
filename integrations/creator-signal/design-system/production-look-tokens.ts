/**
 * Public-site semantic aliases captured from the production acceptance
 * baseline. Composition CSS consumes only these variables; keeping the raw
 * values in one adapter makes the page and component preview contracts match.
 */
export const creatorSignalProductionLookTokens = String.raw`
:root,
[data-cs-theme] {
  --cs-paper: #fbf7f2;
  --cs-cream: #f7f4ee;
  --cs-card: #ffffff;
  --cs-ink: #3a3733;
  --cs-muted: #746d64;
  --cs-sage: #5e6f57;
  --cs-sage-pale: #eef1ea;
  --cs-clay: #bb8f78;
  --cs-clay-pale: #f3e7df;
  --cs-blue: #93a9b3;
  --cs-line: #e7e1d6;
  --cs-shadow: 0 18px 44px rgba(58, 55, 51, .08);
  --cs-site-shadow-brand: 0 10px 24px rgba(94, 111, 87, .2);
  --cs-site-shadow-action: 0 10px 24px rgba(94, 111, 87, .18);
  --cs-site-shadow-consent: 0 20px 60px rgba(58, 55, 51, .18);
  --cs-site-button-secondary-background: rgba(255, 255, 255, .78);
  --cs-site-art-border: rgba(255, 255, 255, .8);
  --cs-site-art-ring: rgba(255, 255, 255, .75);
  --cs-site-art-bar: rgba(255, 255, 255, .78);
  --cs-site-art-clay: rgba(187, 143, 120, .82);
  --cs-site-art-background: linear-gradient(135deg, #dae4d5, #efdbd2 52%, #dce7eb);
  --cs-site-cta-eyebrow: #b9cbb2;
  --cs-site-cta-copy: #cbc5bc;
  --cs-site-font-body: "Avenir Next", Avenir, "Segoe UI", system-ui, sans-serif;
  --cs-site-font-heading: Georgia, "Times New Roman", serif;

  --cs-action-link: var(--cs-sage);
  --cs-action-primary-background: var(--cs-sage);
  --cs-action-primary-foreground: var(--cs-card);
  --cs-action-primary-hover: var(--cs-ink);
  --cs-action-secondary-background: var(--cs-card);
  --cs-action-secondary-foreground: var(--cs-ink);
  --cs-border-default: var(--cs-line);
  --cs-border-strong: var(--cs-muted);
  --cs-component-button-primary-background: var(--cs-sage);
  --cs-component-button-primary-foreground: var(--cs-card);
  --cs-component-button-primary-hover: var(--cs-ink);
  --cs-component-button-secondary-background: var(--cs-card);
  --cs-component-button-secondary-foreground: var(--cs-ink);
  --cs-component-card-background: var(--cs-card);
  --cs-component-card-border: var(--cs-line);
  --cs-component-card-foreground: var(--cs-ink);
  --cs-component-field-background: var(--cs-card);
  --cs-component-field-border: var(--cs-line);
  --cs-component-field-border-focus: var(--cs-blue);
  --cs-component-field-foreground: var(--cs-ink);
  --cs-focus-ring: var(--cs-blue);
  --cs-product-creator-signal-accent: var(--cs-clay);
  --cs-product-creator-signal-signature: var(--cs-sage);
  --cs-selection-background: var(--cs-sage-pale);
  --cs-selection-foreground: var(--cs-ink);
  --cs-surface-base: var(--cs-card);
  --cs-surface-canvas: var(--cs-paper);
  --cs-surface-inverse: var(--cs-ink);
  --cs-surface-raised: var(--cs-card);
  --cs-surface-subtle: var(--cs-cream);
  --cs-text-inverse: var(--cs-card);
  --cs-text-muted: var(--cs-muted);
  --cs-text-primary: var(--cs-ink);
  --cs-text-secondary: var(--cs-muted);
  --cs-font-family-body: var(--cs-site-font-body);
  --cs-font-family-ui: var(--cs-site-font-body);
  --cs-font-family-heading: var(--cs-site-font-heading);
}
`
