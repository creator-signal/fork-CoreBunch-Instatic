import {
  COMPONENT_LIBRARY_ACCESSIBILITY_RULES,
  type ComponentLibraryAccessibilityCheck,
  type ComponentLibraryAccessibilityContract,
  type ComponentLibraryAccessibilityRule,
} from '@core/component-library'
import { heroParamIds } from './pack/hero-component'

type CheckInput = Omit<ComponentLibraryAccessibilityCheck, 'fields'> & {
  fields?: readonly string[]
}

function check(input: CheckInput): ComponentLibraryAccessibilityCheck {
  return {
    ...input,
    ...(input.fields ? { fields: [...input.fields] } : {}),
  }
}

function automatedName(fields: readonly string[], summary: string): ComponentLibraryAccessibilityCheck {
  return check({
    rule: 'a11y.accessible-name',
    category: 'naming',
    enforcement: 'automated',
    severity: 'error',
    fields,
    summary,
    remediation: 'Provide concise, outcome-focused text in the named field.',
  })
}

function behavior(
  rule: ComponentLibraryAccessibilityRule,
  category: ComponentLibraryAccessibilityCheck['category'],
  summary: string,
  remediation: string,
  fields?: readonly string[],
): ComponentLibraryAccessibilityCheck {
  return check({
    rule,
    category,
    enforcement: 'behavior-test',
    severity: 'warning',
    summary,
    remediation,
    ...(fields ? { fields } : {}),
  })
}

function manual(
  rule: ComponentLibraryAccessibilityRule,
  category: ComponentLibraryAccessibilityCheck['category'],
  summary: string,
  remediation: string,
  fields?: readonly string[],
): ComponentLibraryAccessibilityCheck {
  return check({
    rule,
    category,
    enforcement: 'manual',
    severity: 'warning',
    summary,
    remediation,
    ...(fields ? { fields } : {}),
  })
}

function semanticStructure(): ComponentLibraryAccessibilityCheck {
  return manual(
    'a11y.semantic-structure',
    'semantic',
    'The governed component must retain its documented semantic HTML structure.',
    'Review the published semantic structure; do not replace the governed component with raw markup.',
  )
}

function contract(checks: readonly ComponentLibraryAccessibilityCheck[]): ComponentLibraryAccessibilityContract {
  const completeChecks = checks.some((item) => item.rule === 'a11y.semantic-structure')
    ? [...checks]
    : [semanticStructure(), ...checks]
  const applicable = new Set(completeChecks.map((item) => item.rule))
  return {
    checks: completeChecks,
    notApplicable: COMPONENT_LIBRARY_ACCESSIBILITY_RULES
      .filter((rule) => !applicable.has(rule))
      .map((rule) => ({
        rule,
        rationale: 'This governed entry has no author-configurable behavior for this requirement.',
      })),
  }
}

const heading = (field: string | null = 'heading') => manual(
  'a11y.heading-order',
  'heading',
  'The component heading must remain in the page outline.',
  'Keep the supplied heading at the documented level and preserve the surrounding page hierarchy.',
  field ? [field] : undefined,
)

const contrast = () => manual(
  'a11y.contrast',
  'contrast',
  'The governed treatment must remain readable in normal and forced-colors modes.',
  'Review the published component in normal, high-contrast and forced-colors modes; do not override its governed treatment.',
)

const touch = () => behavior(
  'a11y.touch-target',
  'touch',
  'Every visible action must remain comfortably operable at touch sizes and 200% zoom.',
  'Check the published action at 200% zoom and on a narrow touch viewport before publishing.',
)

const informativeImage = (imageField: string, alternativeField: string) => check({
  rule: 'a11y.image-alternative',
  category: 'media',
  enforcement: 'automated',
  severity: 'error',
  fields: [imageField, alternativeField],
  summary: 'Informative selected media needs an alternative text value.',
  remediation: `Describe the selected media in ${alternativeField}, or remove the media when it repeats adjacent text.`,
})

/**
 * The Creator Signal catalogue owns its accessibility applicability decision.
 * Every rule is either an actionable check or an explicit not-applicable row;
 * behavior/manual rows document coverage without pretending a static scan can
 * prove keyboard, focus, motion, contrast or runtime fallback behavior.
 */
export const creatorSignalAccessibilityContracts: Readonly<Record<string, ComponentLibraryAccessibilityContract>> = {
  'creator-signal.site.hero': contract([
    automatedName([heroParamIds.heading, heroParamIds.actionLabel], 'The Hero needs a page title and a named primary action.'),
    heading(heroParamIds.heading), contrast(), touch(),
  ]),
  'creator-signal.site.header': contract([
    automatedName(['brandName'], 'The shared header needs a named brand link.'),
    behavior('a11y.keyboard-contract', 'keyboard', 'Primary navigation must be usable with keyboard navigation.', 'Verify link order, mobile navigation activation and Escape behavior in the published header.', ['items']),
    behavior('a11y.focus-contract', 'focus', 'Primary navigation must expose a visible, logical focus order.', 'Verify the skip link and focus movement through desktop and mobile navigation.', ['items']),
    manual('a11y.no-javascript-fallback', 'no-javascript', 'Primary navigation must remain usable before enhancement.', 'Verify the semantic navigation links without JavaScript.'),
    contrast(), touch(),
  ]),
  'creator-signal.site.footer': contract([
    automatedName(['brandName'], 'The shared footer needs a named brand link.'),
    behavior('a11y.keyboard-contract', 'keyboard', 'Footer links must remain keyboard reachable in document order.', 'Verify the footer links by keyboard after the page content.' , ['items']),
    contrast(), touch(),
  ]),
  'creator-signal.site.consent-banner': contract([
    automatedName(['heading', 'essentialLabel', 'optionalLabel'], 'Privacy choices need a clear heading and named actions.'),
    behavior('a11y.keyboard-contract', 'keyboard', 'Privacy choices must be operable with keyboard controls.', 'Verify both choices can be reached and activated with the keyboard.'),
    behavior('a11y.focus-contract', 'focus', 'The privacy banner must not trap or lose focus.', 'Verify focus remains predictable when the banner appears and after a choice is made.'),
    behavior('a11y.dismissal-contract', 'dismissal', 'Privacy choices must close only after a deliberate choice.', 'Verify either explicit choice dismisses the banner and no accidental outside dismissal occurs.'),
    behavior('a11y.announcement-contract', 'focus', 'Privacy-choice status must be announced to assistive technology.', 'Verify the choice result is exposed through the documented status message.'),
    behavior('a11y.no-javascript-fallback', 'no-javascript', 'The privacy notice must remain understandable when enhancement is unavailable.', 'Verify essential processing remains described without JavaScript.'),
    contrast(), touch(),
  ]),
  'creator-signal.site.feature-grid': contract([automatedName(['heading'], 'The feature group needs a section heading.'), heading(), contrast()]),
  'creator-signal.site.campaign-hero': contract([
    automatedName(['heading', 'primaryActionLabel'], 'The Campaign Hero needs a page title and named primary action.'),
    heading(), informativeImage('artwork', 'artworkAlt'), contrast(), touch(),
  ]),
  'creator-signal.site.signal-strip': contract([
    automatedName(['label'], 'The message list needs an accessible purpose.'),
    manual('a11y.no-javascript-fallback', 'no-javascript', 'The message list must remain understandable without animation or JavaScript.', 'Keep every promise in the authored list text; do not put essential meaning in separators or motion.'),
    contrast(),
  ]),
  'creator-signal.site.signal-comparison': contract([
    automatedName(['heading', 'beforeLabel', 'afterLabel'], 'The comparison needs a heading and named sides.'),
    heading(), informativeImage('artwork', 'artworkAlt'), contrast(),
  ]),
  'creator-signal.site.process-steps': contract([automatedName(['heading'], 'The process needs a section heading.'), heading(), contrast()]),
  'creator-signal.site.pricing-plans': contract([
    automatedName(['heading'], 'The plan group needs a section heading.'), heading(), contrast(), touch(),
  ]),
  'creator-signal.site.founder-story': contract([
    automatedName(['heading', 'attribution'], 'The founder story needs a heading and attribution.'), heading(), informativeImage('portrait', 'portraitAlt'), contrast(),
  ]),
  'creator-signal.site.call-to-action': contract([
    automatedName(['heading', 'actionLabel'], 'The call to action needs a heading and named action.'), heading(), contrast(), touch(),
  ]),
  'creator-signal.site.rich-text-section': contract([automatedName(['heading'], 'The prose section needs a heading.'), heading(), contrast()]),
  'creator-signal.site.testimonial': contract([automatedName(['quote', 'attribution'], 'The quotation needs content and attribution.'), contrast()]),
  'creator-signal.site.faq': contract([
    automatedName(['heading'], 'The FAQ needs a section heading.'), heading(),
    behavior('a11y.keyboard-contract', 'keyboard', 'FAQ disclosures must be operable with their native keyboard behavior.', 'Verify every question can be opened and closed with keyboard controls.', ['items']),
    behavior('a11y.focus-contract', 'focus', 'FAQ disclosures must retain visible focus while toggled.', 'Verify focus stays on the disclosure summary after it opens or closes.', ['items']),
    behavior('a11y.announcement-contract', 'focus', 'Disclosure expanded state must be conveyed semantically.', 'Verify the native disclosure state is exposed to assistive technology.', ['items']),
    manual('a11y.no-javascript-fallback', 'no-javascript', 'FAQ answers must remain available without JavaScript.', 'Verify native disclosure content is present in the published HTML.'),
    contrast(), touch(),
  ]),
  'creator-signal.site.comparison-section': contract([
    automatedName(['heading', 'caption', 'firstLabel', 'secondLabel', 'thirdLabel'], 'The comparison table needs a heading, caption and named columns.'),
    heading(), contrast(),
  ]),
  'creator-signal.site.recovery-state': contract([
    automatedName(['heading', 'body', 'actionLabel'], 'The recovery state needs a textual explanation and named action.'),
    behavior('a11y.announcement-contract', 'focus', 'A changed recovery state must be announced to assistive technology.', 'Verify the runtime state uses the documented status semantics.'),
    manual('a11y.no-javascript-fallback', 'no-javascript', 'Recovery text and its link must remain usable without JavaScript.', 'Keep the explanation and recovery URL in the authored fields.'),
    contrast(), touch(),
  ]),
  'creator-signal.site.public-document': contract([automatedName(['heading', 'summary'], 'The public document needs a heading and summary.'), heading(), contrast()]),
  'creator-signal.site.mautic-form': contract([
    automatedName(['heading', 'successMessage'], 'The managed form needs a heading and success message.'), heading(),
    behavior('a11y.form-control-label', 'form', 'Every generated provider control must have an associated visible label.', 'Verify the generated form labels after the provider markup loads.'),
    behavior('a11y.keyboard-contract', 'keyboard', 'Generated provider controls must be keyboard operable.', 'Verify tab order, validation and submission in the published form.'),
    behavior('a11y.focus-contract', 'focus', 'Validation and submission must move focus predictably.', 'Verify invalid fields and result feedback receive the documented focus treatment.'),
    behavior('a11y.announcement-contract', 'focus', 'Validation, success and unavailable states must be announced.', 'Verify provider success, failure and unavailable messages through assistive technology.'),
    check({ rule: 'a11y.provider-fallback', category: 'provider', enforcement: 'automated', severity: 'error', fields: ['mauticBaseUrl', 'formAlias'], summary: 'Managed Form requires a configured provider origin and governed alias.', remediation: 'Select a valid generated form alias and preserve the approved provider origin.' }),
    manual('a11y.no-javascript-fallback', 'no-javascript', 'The unavailable form state must provide a non-destructive alternative.', 'Verify the published fallback explains the unavailable provider without hiding contact context.'),
    contrast(), touch(),
  ]),
  'creator-signal.site.pattern.home-v2-page': contract([heading(null)]),
  'creator-signal.site.pattern.early-access-page': contract([heading(null)]),
  'creator-signal.site.pattern.content-page': contract([heading(null)]),
  'creator-signal.site.pattern.product-page': contract([heading(null)]),
  'creator-signal.site.pattern.pricing-page': contract([heading(null)]),
  'creator-signal.site.pattern.features-page': contract([heading(null)]),
  'creator-signal.site.pattern.contact-page': contract([heading(null)]),
  'creator-signal.site.pattern.legal-trust-page': contract([heading(null)]),
  'creator-signal.site.pattern.article-content-page': contract([heading(null)]),
  'creator-signal.site.pattern.comparison-section': contract([heading(null)]),
  'creator-signal.site.pattern.empty-state': contract([heading(null)]),
  'creator-signal.site.pattern.error-state': contract([heading(null)]),
  'creator-signal.site.pattern.offline-state': contract([heading(null)]),
  'creator-signal.site.pattern.not-found-state': contract([heading(null)]),
}

export function creatorSignalAccessibilityContract(entryId: string): ComponentLibraryAccessibilityContract {
  const value = creatorSignalAccessibilityContracts[entryId]
  if (!value) throw new Error(`[creator-signal] Missing accessibility contract for ${entryId}.`)
  return value
}
