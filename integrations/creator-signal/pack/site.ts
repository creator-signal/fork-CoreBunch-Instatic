import {
  compilePackPages,
  definePack,
  escapeHtml,
  type PagePackEntry,
} from '@core/plugin-sdk'
import { componentLibraryPatternRegistry } from '@core/component-library'
import type { Page, PageSeo } from '@core/page-tree'
import { creatorSignalComponentLibraryEntries } from '../component-library'
import { creatorSignalBrandAssets } from '../design-system/contract'
import crmIframeForm from '../modules/crm-iframe-form'
import { consentBanner, sectionIntro, siteFooter, siteHeader } from '../modules/site-components'
import {
  creatorSignalPatternForRole,
  creatorSignalPublicAuthoringPolicy,
} from '../public-authoring-contract'
import { creatorSignalRenderProfile } from './design-system'
import { heroComponent, heroParamIds } from './hero-component'
import { twoColumnComponent, twoColumnSlotIds } from './two-column-component'

interface ModuleBlock {
  kind: 'module'
  entryId: string
  moduleId: string
  props: Record<string, unknown>
}

interface HeroBlock {
  kind: 'hero'
  entryId: 'creator-signal.site.hero'
  props: Record<string, unknown>
}

type LeafBlock = ModuleBlock | HeroBlock

interface TwoColumnBlock {
  kind: 'two-column'
  entryId: 'creator-signal.site.two-column-layout'
  componentId: typeof twoColumnComponent.id
  slots: Record<(typeof twoColumnSlotIds)[keyof typeof twoColumnSlotIds], LeafBlock[]>
}

type PageBlock = LeafBlock | TwoColumnBlock

interface StarterPage {
  id: string
  slug: string
  title: string
  description: string
  patternId: string
  blocks: PageBlock[]
}

type OwnedPagePatternRole =
  | 'home-v2'
  | 'early-access'
  | 'content-page'
  | 'product-page'
  | 'pricing'
  | 'features'
  | 'contact'
  | 'feedback'
  | 'legal-trust'
  | 'article-content'
  | 'not-found-state'

function pagePatternId(role: OwnedPagePatternRole): string {
  const mapping = creatorSignalPatternForRole(role)
  if (mapping.ownership !== 'pattern') {
    throw new Error(`[creator-signal] Page pattern role "${role}" is not pattern-owned.`)
  }
  return mapping.patternId
}

const legalRelease = {
  version: '2026-08-02',
  effectiveDate: '2 August 2026',
  operator: 'Creator Signal is operated by INSIGHT VISION PTY LTD (ACN 601 335 460), Australia.',
}

const paragraphHtml = (paragraphs: readonly string[]): string =>
  paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')

const legalReleaseParagraphs = (): string[] => [
  `Version ${legalRelease.version}. Effective ${legalRelease.effectiveDate}.`,
  legalRelease.operator,
]

const moduleBlock = (
  name: string,
  props: Record<string, unknown>,
): ModuleBlock => ({
  kind: 'module',
  entryId: `creator-signal.site.${name}`,
  moduleId: `creator-signal.site.${name}`,
  props,
})

const hero = (
  eyebrow: string,
  heading: string,
  body: string,
  actionUrl: string,
  actionLabel: string,
  artwork = '',
): HeroBlock => ({
  kind: 'hero',
  entryId: 'creator-signal.site.hero',
  props: {
    [heroParamIds.eyebrow]: eyebrow,
    [heroParamIds.heading]: heading,
    [heroParamIds.body]: body,
    [heroParamIds.actionLabel]: actionLabel,
    [heroParamIds.actionUrl]: actionUrl,
    [heroParamIds.artwork]: artwork,
  },
})

const features = (
  eyebrow: string,
  heading: string,
  introduction: string,
  items: Array<[string, string, string]>,
  sectionId = 'features',
  tone: 'default' | 'signature' = 'default',
): ModuleBlock => moduleBlock('feature-grid', {
  eyebrow,
  heading,
  introduction,
  sectionId,
  tone,
  items: items.map(([marker, itemHeading, body]) => ({
    marker,
    heading: itemHeading,
    body,
  })),
})

const campaignHero = (props: Record<string, unknown>): ModuleBlock =>
  moduleBlock('campaign-hero', props)

const signalStrip = (): ModuleBlock => moduleBlock('signal-strip', {
  label: 'Creator Signal promises',
  items: [
    { text: "You've got this" },
    { text: 'Skip the maths' },
    { text: 'No spreadsheets, no stress' },
    { text: 'Grow with confidence' },
    { text: 'Every sale sends a signal' },
    { text: 'Zero data-nerd required' },
  ],
})

const callToAction = (
  eyebrow: string,
  heading: string,
  body: string,
  actionUrl: string,
  actionLabel: string,
  sectionId = 'next-step',
): ModuleBlock => moduleBlock('call-to-action', {
  eyebrow,
  heading,
  body,
  actionUrl,
  actionLabel,
  sectionId,
})

const richText = (
  heading: string,
  paragraphs: string[],
  sectionId: string,
): ModuleBlock => moduleBlock('rich-text-section', {
  heading,
  body: paragraphHtml(paragraphs),
  sectionId,
})

const managedForm = (props: Record<string, unknown>): ModuleBlock => ({
  kind: 'module',
  entryId: 'creator-signal.site.mautic-form',
  moduleId: 'creator-signal.site.mautic-form',
  props: {
    mauticBaseUrl: 'https://marketing.creatorsignal.me',
    registryPath: '/media/creator-signal/forms-v1.js',
    ...props,
  },
})

const sectionIntroduction = (props: Record<string, unknown>): ModuleBlock => ({
  kind: 'module',
  entryId: 'creator-signal.site.section-intro',
  moduleId: sectionIntro.id,
  props,
})

const embeddedCrmForm = (props: Record<string, unknown>): ModuleBlock => ({
  kind: 'module',
  entryId: 'creator-signal.site.crm-iframe-form',
  moduleId: crmIframeForm.id,
  props: { ...crmIframeForm.defaults, ...props },
})

const twoColumn = (left: LeafBlock[], right: LeafBlock[]): TwoColumnBlock => ({
  kind: 'two-column',
  entryId: 'creator-signal.site.two-column-layout',
  componentId: twoColumnComponent.id,
  slots: { left, right },
})

const publicDocument = (
  id: string,
  slug: string,
  title: string,
  description: string,
  paragraphs: string[],
): StarterPage => ({
  id,
  slug,
  title,
  description,
  patternId: pagePatternId('legal-trust'),
  blocks: [moduleBlock('public-document', {
    eyebrow: 'Creator Signal',
    heading: title,
    summary: description,
    body: paragraphHtml([...legalReleaseParagraphs(), ...paragraphs]),
    dateModified: legalRelease.version,
  })],
})

/**
 * Exact 0.1.11 starter specification used only by the retained migration
 * reconstruction. Apply current catalogue changes to the cloned starterPages
 * below so the historical classifier cannot drift with the active pack.
 */
export const legacyCreatorSignalStarterPages0111: StarterPage[] = [
  {
    id: 'home',
    slug: 'index',
    title: 'Creator Signal',
    description: 'Calm, useful tools that help independent creators understand what is working and act with confidence.',
    patternId: pagePatternId('product-page'),
    blocks: [
      hero('Creator Signal', 'Turn creative business data into a clearer next move.', 'Creator Signal builds calm, useful tools that help independent creators understand what is working and act with confidence.', '/products/sales-pulse', 'Explore Sales Pulse', creatorSignalBrandAssets.creatorSignalSocial),
      features('Built for working creators', 'Less spreadsheet archaeology. More useful signals.', 'Bring scattered marketplace activity into focused experiences without giving up control of your work or data.', [
        ['01', 'See the whole picture', 'Bring sales history and current activity into one considered view.'],
        ['02', 'Keep your data yours', 'Use private, exportable records with straightforward controls.'],
        ['03', 'Act with context', 'Use trends and catalogue signals to decide what deserves attention next.'],
      ]),
      callToAction('One useful signal at a time', 'Start with Sales Pulse.', 'Connect your sales history and build a clearer business record over time.', '/products/sales-pulse', 'See Sales Pulse'),
    ],
  },
  {
    id: 'products',
    slug: 'products',
    title: 'Products',
    description: 'Focused products for clearer creative-business decisions.',
    patternId: pagePatternId('product-page'),
    blocks: [
      hero('Creator Signal products', 'Products for clearer creative-business decisions.', 'Creator Signal products turn complex business information into focused, practical experiences. Start with Sales Pulse, with more products to follow.', '/products/sales-pulse', 'Explore Sales Pulse', creatorSignalBrandAssets.creatorSignalSocial),
      features('Products', 'Available now.', 'Our product catalogue will grow as we build more focused tools for independent creators.', [
        ['SP', 'Sales Pulse', 'Understand what is selling, what is changing and where to focus next.'],
      ]),
      callToAction('Sales Pulse', 'See the signal in your sales.', 'Explore Sales Pulse features, plans and the supported creator-sales workflow.', '/products/sales-pulse', 'View Sales Pulse'),
    ],
  },
  {
    id: 'sales-pulse',
    slug: 'products/sales-pulse',
    title: 'Sales Pulse',
    description: 'Turn marketplace history into a calm view of what is selling, what is changing and where to look next.',
    patternId: pagePatternId('product-page'),
    blocks: [
      hero('Sales Pulse', 'See the signal in your sales.', 'Sales Pulse turns marketplace history into a calm, useful view of what is selling, what is changing and where to look next.', '/pricing', 'View pricing', creatorSignalBrandAssets.salesPulseSocial),
      features('What it does', 'A dashboard made for creative work.', 'Understand performance without rebuilding the same spreadsheet every week.', [
        ['01', 'Connected history', 'Import supported marketplace sales and keep a durable record.'],
        ['02', 'Useful comparisons', 'See products, periods and patterns in a consistent view.'],
        ['03', 'Private by design', 'Your operational data is not an advertising product.'],
      ]),
      callToAction('Ready when you are', 'Bring your sales history into focus.', 'Review the plans or ask a question before you connect.', '/pricing', 'Compare plans'),
    ],
  },
  {
    id: 'features',
    slug: 'features',
    title: 'Features',
    description: 'Reliable imports, readable analysis and clear controls for independent creators.',
    patternId: pagePatternId('features'),
    blocks: [
      hero('Features', 'Practical tools, deliberately focused.', 'Creator Signal prioritises reliable imports, readable analysis and clear controls over noisy dashboards.', '/pricing', 'See pricing', creatorSignalBrandAssets.salesPulseSocial),
      features('Capabilities', 'Built around the work you already do.', 'Each capability is designed to reduce repeated administration and make the next decision easier.', [
        ['01', 'Sales imports', 'Bring supported marketplace history into a consistent ledger.'],
        ['02', 'Performance views', 'Compare products and time periods without manual cleanup.'],
        ['03', 'Exportable records', 'Keep access to the information you have connected.'],
        ['04', 'Guided signals', 'Surface useful changes without pretending every fluctuation is a trend.'],
        ['05', 'Secure access', 'Use central identity, protected sessions and explicit entitlements.'],
        ['06', 'Operational transparency', 'See service health and receive clear failure states.'],
      ]),
    ],
  },
  {
    id: 'pricing',
    slug: 'pricing',
    title: 'Pricing',
    description: 'Straightforward AUD monthly Sales Pulse plans with access boundaries shown before checkout.',
    patternId: pagePatternId('pricing'),
    blocks: [
      hero('Pricing', 'Choose the Sales Pulse plan that fits your work.', 'Straightforward AUD monthly plans with the access boundary shown before checkout.', 'https://salespulse.creatorsignal.me', 'Open Sales Pulse', creatorSignalBrandAssets.salesPulseSocial),
      features('Sales Pulse plans', 'Free, Starter and Pro.', 'Product access is funded by subscriptions, not advertising profiles.', [
        ['01', 'Free — $0', 'Start with the core workflow and understand whether Sales Pulse fits.'],
        ['02', 'Starter — $5 AUD monthly', 'Build a durable sales record and unlock the supported starter capabilities.'],
        ['03', 'Pro — $10 AUD monthly', 'Use the full analysis experience and broader product comparisons.'],
      ], 'plans'),
      callToAction('Talk to us', 'Have a question before subscribing?', 'Tell us what you sell and what you need to understand.', '/contact', 'Contact Creator Signal'),
    ],
  },
]

const formPages = [
  { id: 'contact', slug: 'contact', title: 'Contact', description: 'Contact Creator Signal about a creative business, Sales Pulse or support question.', hero: ['Contact Creator Signal', 'Tell us what you are trying to understand.', 'Send a short note about your creative business, Sales Pulse or a support question. We will use the details only to respond and follow up as requested.', '/legal/privacy', 'Read our privacy notice'], form: ['Contact', 'Send a message', 'Required fields are identified in the form.', 'Thanks — your message has been received.', 'creator_signal_contact', 'contact'] },
  { id: 'feedback', slug: 'feedback', title: 'Feedback', description: 'Share feedback that can make Creator Signal more useful.', hero: ['Feedback', 'Help us make Creator Signal more useful.', 'Tell us what worked, what felt unclear and what would improve your experience. You can choose whether we may follow up about your feedback.', '/legal/privacy', 'Read our privacy notice'], form: ['Feedback', 'Share your feedback', 'Required fields are identified in the form. Choose the follow-up option only if we may contact you about this feedback.', 'Thanks — your feedback helps us improve Creator Signal.', 'creator_signal_feedback', 'feedback'] },
  { id: 'wishlist', slug: 'wishlist', title: 'Join the wishlist', description: 'Join a Creator Signal product wishlist for availability and early-access updates.', hero: ['Join the wishlist', 'Tell us what you want to use next.', 'Join a product wishlist and give purpose-specific permission for availability and early-access updates. This does not subscribe you to general marketing.', '/legal/privacy', 'Read our privacy notice'], form: ['Wishlist', 'Join the wishlist', 'Required fields are identified in the form. Your permission covers availability and early-access updates for this request, not general marketing.', 'You are on the wishlist — thanks for your interest.', 'creator_signal_wishlist', 'wishlist'] },
  { id: 'ask-a-question', slug: 'ask-a-question', title: 'Ask a question', description: 'Ask about Sales Pulse, an account, Creator Signal or working with us.', hero: ['Ask a question', 'What would you like to know?', 'Ask about Sales Pulse, your account, Creator Signal or working with us. We will use your details to answer your question.', '/legal/privacy', 'Read our privacy notice'], form: ['Question', 'Ask a question', 'Required fields are identified in the form.', 'Thanks — we have received your question.', 'creator_signal_question', 'question'] },
  { id: 'feature-request', slug: 'feature-request', title: 'Feature request', description: 'Describe the problem, workflow and outcome behind a product idea.', hero: ['Feature request', 'Describe the outcome you need.', 'Tell us about the problem, workflow and outcome behind your idea so we can evaluate it in context.', '/legal/privacy', 'Read our privacy notice'], form: ['Feature request', 'Request a feature', 'Required fields are identified in the form. Describe the problem and the outcome you need.', 'Thanks — your feature request has been recorded.', 'creator_signal_feature_request', 'feature_request'] },
  { id: 'report-an-error', slug: 'report-an-error', title: 'Report an error', description: 'Report a reproducible Creator Signal product error without sharing sensitive data.', hero: ['Error report', 'Tell us what went wrong.', 'Share steps we can use to reproduce the problem. Do not include passwords, access keys, payment details or customer data.', 'https://status.creatorsignal.me', 'Check service status'], form: ['Error report', 'Report an error', 'Required fields are identified in the form. Do not include passwords, access keys, payment details or customer data.', 'Thanks — your error report has been recorded.', 'creator_signal_error_report', 'error_report'] },
] as const

// These pages are additive to the current pack. Keep them out of the retained
// 0.1.11 starter specification so upgrade classification never mistakes an
// authored historical page for source-owned intake content.
const intakeFormPages = [
  { id: 'waitlist', slug: 'waitlist', title: 'Join the waitlist', description: 'Get a purpose-specific launch update and help Creator Signal understand what would be most useful for your Spoonflower shop.', hero: ['Waitlist', 'Be the first to know when Creator Signal is ready.', 'Join the waitlist for launch availability updates. Optional answers help us understand who we are building for. This is not a general marketing subscription.', '/legal/privacy', 'Read our privacy notice'], form: ['Waitlist', 'Join the waitlist', 'Required fields are identified in the form. Your permission covers Creator Signal launch availability and this waitlist request, not general marketing.', 'You are on the waitlist — thanks for your interest.', 'creator_signal_waitlist', 'waitlist'] },
  { id: 'beta', slug: 'beta', title: 'Try it early', description: 'Apply to test Creator Signal early and share what would make it more useful for Spoonflower designers.', hero: ['Early testing', 'Help us test Creator Signal before anyone else.', 'Apply to test the product early and tell us what you think. Optional answers help us balance the beta cohort. This is not a general marketing subscription.', '/legal/privacy', 'Read our privacy notice'], form: ['Early testing', 'Apply to test it early', 'Required fields are identified in the form. Your permission covers this beta application and early testing, not general marketing.', 'Thanks — your early-access application has been received.', 'creator_signal_beta_application', 'beta_application'] },
] as const

for (const page of formPages) {
  legacyCreatorSignalStarterPages0111.push({
    id: page.id,
    slug: page.slug,
    title: page.title,
    description: page.description,
    patternId: pagePatternId('contact'),
    blocks: [
      hero(...page.hero),
      managedForm({
        eyebrow: page.form[0],
        heading: page.form[1],
        introduction: page.form[2],
        successMessage: page.form[3],
        formAlias: page.form[4],
        formCode: page.form[4],
        campaignCode: page.form[5],
      }),
    ],
  })
}

legacyCreatorSignalStarterPages0111.push(
  {
    id: 'privacy',
    slug: 'legal/privacy',
    title: 'Privacy',
    description: 'How Creator Signal uses information to operate its services and the choices available to you.',
    patternId: pagePatternId('article-content'),
    blocks: [
      hero('Legal', 'Privacy should be understandable.', 'This notice explains the information Creator Signal uses to operate its services and the choices available to you.', '/contact', 'Contact us'),
      richText('Information we use', [
        ...legalReleaseParagraphs(),
        'We process account and authentication information to provide secure access, subscription and entitlement information to operate paid features, and data you choose to connect to provide Sales Pulse.',
        'When you contact us, we use the details you submit to respond. Optional product journey analytics is disabled until you grant consent. Aggregate traffic measurement is configured to avoid advertising profiles.',
        'We retain information only for operational, security, legal and support needs, apply access controls, and use service providers only for defined platform functions.',
      ], 'information-we-use'),
    ],
  },
  {
    id: 'terms',
    slug: 'legal/terms',
    title: 'Terms',
    description: 'Acceptable use, subscriptions, connected data and service responsibilities for Creator Signal.',
    patternId: pagePatternId('article-content'),
    blocks: [
      hero('Legal', 'Clear expectations for using Creator Signal.', 'These terms describe acceptable use, subscriptions, connected data and service responsibilities.', '/contact', 'Contact us'),
      richText('Service terms', [
        ...legalReleaseParagraphs(),
        'You are responsible for your account, the authority to connect marketplace information, and the accuracy of information you provide. Do not misuse the service or attempt unauthorised access.',
        'Subscription prices, included capabilities and renewal terms are shown before checkout. You retain ownership of your connected business information.',
        'Services may change as they improve. Material changes and important limitations will be communicated where practical.',
      ], 'service-terms'),
    ],
  },
  publicDocument('billing', 'legal/billing', 'Subscriptions, Cancellation and Refunds', 'How Sales Pulse plans renew, change, cancel and qualify for refunds.', [
    'Current plan prices, billing frequency and included capabilities are shown before checkout. Paid plans renew until they are cancelled.',
    'You can cancel future renewal from the product account area. Access continues until the end of the paid billing period unless a refund or legal requirement changes that outcome.',
    'Refund requests are assessed under applicable Australian Consumer Law and any additional commitment shown at checkout. Contact support with the account email and relevant charge details.',
  ]),
  publicDocument('acceptable-use', 'legal/acceptable-use', 'Acceptable Use Policy', 'The rules that protect customers, connected services and Creator Signal.', [
    'Do not use Creator Signal to break the law, infringe another person’s rights, distribute harmful material, interfere with the service, probe security controls or access information without authority.',
    'Connected marketplace and platform access must comply with the relevant provider terms. Automated use must stay within the documented product capabilities and reasonable operational limits.',
    'We may restrict or suspend access where necessary to protect customers, providers or the service, and will provide notice where it is safe and practical.',
  ]),
  publicDocument('browser-extension', 'legal/browser-extension', 'Browser Extension Privacy and Permissions', 'What the Sales Pulse Helper can access, collect and send.', [
    'The helper uses browser permissions only on supported marketplace pages and Creator Signal product surfaces. It collects the records you explicitly choose to import and operational diagnostics needed to complete that work.',
    'Extension analytics is independently controlled and is not enabled merely because website analytics was accepted. Sensitive page content and credentials are not an advertising product.',
    'You can remove the extension, revoke site access and request deletion or export through the account-data process.',
  ]),
  publicDocument('cookies', 'legal/cookies', 'Cookie Policy', 'The essential and optional browser storage used by Creator Signal.', [
    'Essential storage supports sign-in, security, consent choices and reliable product operation. It cannot be disabled while using authenticated features.',
    'Aggregate traffic measurement is configured without advertising profiles. Optional journey analytics runs only after the relevant consent choice and can be withdrawn.',
    'Browser settings can remove stored values, although doing so may sign you out or reset preferences.',
  ]),
  publicDocument('dpa', 'legal/dpa', 'Data Processing Addendum', 'The data-processing terms available to eligible business customers.', [
    'Creator Signal processes customer-provided personal information only to deliver, secure and support the contracted services and on documented customer instructions.',
    'Appropriate technical and organisational controls, confidentiality commitments, incident procedures and subprocessor governance apply to that processing.',
    'Eligible business customers can contact us to execute the current addendum and any required international-transfer terms.',
  ]),
  publicDocument('security', 'trust/security', 'Security and Data Handling', 'How Creator Signal protects customer data and operates its security controls.', [
    'Access is role-based, credentials and secrets are separated from application images, and production services use encrypted transport and restricted provider identities.',
    'Customer data is backed up under defined retention and restore procedures. Security events are logged and investigated through the operational incident process.',
    'No system can be guaranteed risk-free. Report a suspected vulnerability privately through the contact route so it can be assessed without exposing customers.',
  ]),
  publicDocument('subprocessors', 'trust/subprocessors', 'Subprocessors and Service Providers', 'The service providers used to operate Creator Signal.', [
    'Creator Signal uses carefully scoped infrastructure, identity, payment, email, monitoring and support providers to operate the service.',
    'Each provider receives only the information needed for its function and is reviewed for contractual and security obligations.',
    'Material changes to providers that process customer personal information will be reflected here and communicated where required.',
  ]),
  publicDocument('support', 'support', 'Support and Complaints', 'How to request help, raise a complaint and escalate an unresolved matter.', [
    'Use the contact form with your account email, the affected product and enough detail to reproduce the problem. Do not include passwords, recovery codes or full payment credentials.',
    'Complaints are acknowledged, investigated and answered as promptly as practical. Complex security, billing or provider matters may require additional verification.',
    'If a complaint remains unresolved, we will explain available escalation or external dispute options that apply to the matter.',
  ]),
  publicDocument('account-data', 'help/account-data', 'Account Export and Deletion', 'How to export workspace information and request account deletion.', [
    'Use the product account controls or contact support to request an export of supported workspace records. Identity verification may be required before delivery.',
    'Deletion requests remove or de-identify information that is no longer required, subject to security, financial, legal and dispute-retention obligations.',
    'Deleting an account may be irreversible. We will explain material consequences and any information that must be retained before completing the request.',
  ]),
  publicDocument('status', 'status', 'Service Status', 'How Creator Signal communicates availability, maintenance and incidents.', [
    'Current availability, active incidents and planned maintenance are published on the Creator Signal status service.',
    'Incident updates describe customer impact, mitigation progress and restoration. A follow-up is provided for material events when the investigation is complete.',
    'Visit status.creatorsignal.me for the operational view or contact support if your experience is not reflected there.',
  ]),
)

const currentFormPages = [...formPages, ...intakeFormPages]

const formSectionIdByPageId = new Map(
  currentFormPages.map((page) => [page.id, `${page.form[5]}-form`] as const),
)

const starterPages: StarterPage[] = legacyCreatorSignalStarterPages0111.map((page) => ({
  ...page,
  blocks: page.blocks.map((block) => ({
    ...block,
    props: block.kind === 'hero'
      ? { ...block.props, [heroParamIds.artwork]: '' }
      : block.moduleId === 'creator-signal.site.mautic-form'
        ? { ...block.props, sectionId: formSectionIdByPageId.get(page.id) }
        : { ...block.props },
  })),
}))

const feedbackPage = starterPages.find((page) => page.slug === 'feedback')
if (!feedbackPage) throw new Error('[creator-signal] Missing Feedback starter page.')
feedbackPage.patternId = pagePatternId('feedback')
feedbackPage.blocks = [
  hero(
    'Feedback',
    'Help us make Creator Signal more useful.',
    'Tell us what worked, what felt unclear and what would improve your experience. You can choose whether we may follow up about your feedback.',
    '/legal/privacy',
    'Read our privacy notice',
  ),
  twoColumn(
    [sectionIntroduction({
      eyebrow: 'Feedback',
      heading: 'Share your feedback',
      introduction: 'Required fields are identified in the form. Choose the follow-up option only if we may contact you about this feedback.',
      sectionId: 'feedback-introduction',
    })],
    [embeddedCrmForm({
      sectionId: 'feedback-form',
      formUrl: 'https://marketing.creatorsignal.me/form/creator-signal-feedback',
      iframeTitle: 'Creator Signal feedback form',
      fallbackLabel: 'Open the feedback form in a new tab',
      loadingMessage: 'Loading the feedback form…',
      unavailableMessage: 'The feedback form cannot be displayed here right now.',
      initialHeight: 640,
      minimumHeight: 320,
      maximumHeight: 2400,
    })],
  ),
]

const intakeStarterPages: StarterPage[] = intakeFormPages.map((page) => (
  {
    id: page.id,
    slug: page.slug,
    title: page.title,
    description: page.description,
    patternId: pagePatternId('contact'),
    blocks: [
      hero(...page.hero),
      managedForm({
        eyebrow: page.form[0],
        heading: page.form[1],
        introduction: page.form[2],
        successMessage: page.form[3],
        sectionId: formSectionIdByPageId.get(page.id),
        formAlias: page.form[4],
        formCode: page.form[4],
        campaignCode: page.form[5],
      }),
    ],
  }
))

const homeV2Page = starterPages.find((page) => page.slug === 'index')
if (!homeV2Page) throw new Error('[creator-signal] Missing Home starter page.')
homeV2Page.patternId = pagePatternId('home-v2')
homeV2Page.title = 'Creator Signal — Stop guessing, design what sells'
homeV2Page.description = "Creator Signal turns Spoonflower sales into a clear, visual picture of what's actually selling, using your own design thumbnails instead of spreadsheets."
homeV2Page.blocks = [
  campaignHero({
    eyebrow: 'Every sale sends a signal',
    heading: 'Stop guessing. Design what sells.',
    body: "Creator Signal turns your Spoonflower sales data into a clear, visual picture of what's actually selling, using your own design thumbnails, not spreadsheets.",
    primaryActionLabel: 'Get started free',
    primaryActionUrl: 'https://salespulse.creatorsignal.me/sign-up',
    secondaryActionLabel: 'See how it works',
    secondaryActionUrl: '#how-it-works',
    footnote: 'Free forever plan. No spreadsheets, no stress.',
    artwork: creatorSignalBrandAssets.salesPulseSocial,
    artworkAlt: 'A preview of the Sales Pulse visual sales dashboard.',
  }),
  signalStrip(),
  moduleBlock('signal-comparison', {
    eyebrow: "Let's see what's working",
    heading: 'From this, to this.',
    introduction: 'Compare the limited marketplace view with the clearer Creator Signal experience.',
    beforeLabel: 'From',
    beforeBody: 'Thirty days, sales counts only and one bare-bones chart.',
    afterLabel: 'To',
    afterBody: "Your own design thumbnails, sorted by what's working.",
    artwork: creatorSignalBrandAssets.salesPulseSocial,
    artworkAlt: 'Sales Pulse showing sales through visual design thumbnails.',
    sectionId: 'signal-comparison',
  }),
  features("Let's take a look", "Right now, you've got three options.", 'None of these approaches was really built for independent designers.', [
    ['01', 'Design blind', 'Upload, cross your fingers and hope something sells. It is the spaghetti-at-the-wall approach, and it is exhausting.'],
    ['02', "Squint at Spoonflower's own stats", 'A useful starting point, but only thirty days, sales counts and one bare-bones chart — no trends, categories or repeat customers.'],
    ['03', 'Wrangle it yourself', 'Copy and paste into a spreadsheet or a generic AI tool, then try to make sense of it alone.'],
  ], 'market-gap', 'signature'),
  moduleBlock('process-steps', {
    eyebrow: "Here's the good news",
    heading: 'How it works: connect, see, grow.',
    introduction: 'Real-time, visual insight into your own sales data — no spreadsheets or scary graphs — so you can design with confidence instead of guesswork.',
    sectionId: 'how-it-works',
    items: [
      { marker: '1', heading: 'Connect your shop', body: 'Link your Spoonflower store in a few easy steps. Your data stays yours, always.' },
      { marker: '2', heading: 'See your signal', body: "Your sales come to life as your own design thumbnails, sorted by what's working." },
      { marker: '3', heading: 'Grow with confidence', body: 'Make more of what is selling and design with a plan instead of a guess.' },
    ],
  }),
  features('See it for yourself', 'What Creator Signal actually shows you.', 'Start with the essentials and reveal more of your signal when you are ready.', [
    ['Free', "See what's selling", 'Revenue and sales overview, growth over time and your top-selling designs.'],
    ['Starter', 'Slice it your way', 'Filter by time and product type, then see sales broken down by category.'],
    ['Pro', 'Know your shop inside out', 'Explore collection-level sales, repeat customers, trends and what to design next.'],
  ], 'features'),
  features('Why designers trust us', 'The values behind the signal.', 'Useful, respectful and honest by design.', [
    ['01', 'Your data stays yours', 'We never sell or share your operational data. It stays protected and used for your own signal.'],
    ['02', 'We build what you need', 'Features follow what designers ask for and where the evidence shows real value.'],
    ['03', 'We keep it real', 'Honest numbers, clear limits, no hype and no pressure.'],
    ['04', 'By a designer, for designers', 'Every decision is tested against whether it would actually help an independent designer.'],
    ['05', "We're human too", 'Built by a designer and her techy best friend, with support from actual people.'],
    ['06', 'Wherever you design', 'Mobile, tablet and desktop are included on every plan.'],
  ], 'values', 'signature'),
  moduleBlock('pricing-plans', {
    eyebrow: 'Skip the maths',
    heading: 'Pricing: find your fit.',
    introduction: "Start free. Upgrade whenever you're ready to see more of your signal.",
    footnote: 'Mobile, tablet and desktop are included on every plan. Plus support from an actual human.',
    sectionId: 'pricing',
    items: [
      { name: 'Free', price: '$0', cadence: '', description: 'Start with the core workflow.', features: 'Revenue and sales overview\nSales growth over time\nYour top 3 selling designs', actionLabel: 'Start free', actionUrl: 'https://salespulse.creatorsignal.me/sign-up', emphasis: 'default' },
      { name: 'Starter', price: '$5 AUD', cadence: 'per month', description: 'Build a durable sales record.', features: 'Everything in Free\nFilter by time and product type\nYour top 6 selling designs\nSales broken down by category', actionLabel: 'Start Starter', actionUrl: 'https://salespulse.creatorsignal.me/sign-up', emphasis: 'featured' },
      { name: 'Pro', price: '$10 AUD', cadence: 'per month', description: 'Use the complete analysis experience.', features: "Everything in Starter\nCollection-level sales\nRepeat-customer insight\nWhat's trending and what to design next", actionLabel: 'Start Pro', actionUrl: 'https://salespulse.creatorsignal.me/sign-up', emphasis: 'default' },
    ],
  }),
  moduleBlock('founder-story', {
    eyebrow: 'By a designer, for designers',
    heading: 'About the founder: meet the maker.',
    body: "<p>I'm a Spoonflower designer myself. I got tired of guessing what to design next with almost nothing to go on — just thirty days of history and a bare-bones chart, with no dollar figures or real story behind the numbers.</p><p>So I built the tool I wished existed: something that turns your own sales history into a clear signal you can actually see through your own thumbnails. I built it for myself, and for every designer who has wasted hours exporting to spreadsheets and still felt stuck guessing.</p>",
    attribution: 'Lahni',
    role: 'Founder, Creator Signal',
    portrait: '',
    portraitAlt: '',
    sectionId: 'about',
  }),
  moduleBlock('faq', {
    heading: 'FAQ: good to know.',
    sectionId: 'faq',
    items: [
      { question: 'Is my Spoonflower data safe with you?', answer: 'Yes. We never sell or share your data. It is used only to show you your own sales clearly.' },
      { question: 'Do I need to be good with spreadsheets or numbers?', answer: 'Not even a little. Creator Signal shows your sales as your own design thumbnails — no spreadsheets or scary graphs.' },
      { question: 'Will this replace my Spoonflower dashboard?', answer: 'It works alongside it. Spoonflower still runs your shop; Creator Signal gives you the fuller picture.' },
      { question: 'Can I cancel anytime?', answer: 'Anytime. There is no lock-in and no awkward email needed.' },
      { question: "I'm just getting started and do not have many sales yet. Is this still for me?", answer: 'Yes. The Free plan is built for exactly that. Start there and upgrade whenever you are ready.' },
      { question: 'Does this work on my phone?', answer: 'Yes. Mobile, tablet and desktop are all included.' },
    ],
  }),
  callToAction('You have got this', 'Grow your Spoonflower shop with confidence.', 'Real signal, zero data-nerd required.', 'https://salespulse.creatorsignal.me/sign-up', 'Get started free', 'get-started'),
]

const earlyAccessPage: StarterPage = {
  id: 'early-access',
  slug: 'early-access',
  title: 'Creator Signal Early Access',
  description: 'Join the Creator Signal launch list or volunteer to help test Sales Pulse early.',
  patternId: pagePatternId('early-access'),
  blocks: [
    campaignHero({
      eyebrow: 'Coming soon',
      heading: 'Stop guessing. Design what sells.',
      body: "Creator Signal turns your Spoonflower sales into a clear, visual picture of what's actually selling. We are putting the finishing touches on it now.",
      primaryActionLabel: 'Choose your update',
      primaryActionUrl: '#early-access-form',
      secondaryActionLabel: 'See what is coming',
      secondaryActionUrl: '#early-access-features',
      footnote: 'Free to join. No spam and no pressure.',
      artwork: creatorSignalBrandAssets.salesPulseSocial,
      artworkAlt: 'A preview of the Sales Pulse visual sales dashboard.',
    }),
    signalStrip(),
    features('Choose what suits you', 'Launch news or early testing.', 'Use the one form below to tell us how you would like to hear from Creator Signal.', [
      ['01', 'Be the first to know', 'Choose launch notification if you want one useful update when Creator Signal is ready.'],
      ['02', 'Help us test it first', 'Choose early testing if you are happy to try the product and share honest feedback before launch.'],
    ], 'early-access-options'),
    managedForm({
      eyebrow: 'Join the list',
      heading: 'Choose your early-access update',
      introduction: 'Required fields are identified in the form. Choose launch notification, early testing or both. This permission is specific to this request and is not general marketing consent.',
      successMessage: 'You are on the Creator Signal early-access list — thank you.',
      sectionId: 'early-access-form',
      formAlias: 'creator_signal_wishlist',
      formCode: 'creator_signal_wishlist',
      campaignCode: 'early_access',
    }),
    features('In case you are wondering', 'What is Creator Signal?', 'A clearer view of your own Spoonflower sales, built around the way designers work.', [
      ['01', "See what's selling", 'See real sales through your own design thumbnails without rebuilding a spreadsheet.'],
      ['02', 'Filter it your way', 'Explore the time periods, product types and categories that matter to your work.'],
      ['03', 'Know your shop inside out', 'Understand repeat customers, trends and the context behind what to design next.'],
    ], 'early-access-features'),
    features('What guides us', 'The values behind the signal.', 'The product should stay useful, respectful and honest as it grows.', [
      ['01', 'Your data stays yours', 'We never sell your operational data or turn it into an advertising profile.'],
      ['02', 'We keep it real', 'Honest numbers, clear limits and no pressure.'],
      ['03', 'By a designer, for designers', 'Built by someone who understands the questions behind the data.'],
    ], 'early-access-values', 'signature'),
    moduleBlock('testimonial', {
      quote: 'I built the tool I wished existed: something that turns your own sales history into a clear signal you can actually see.',
      attribution: 'Lahni',
      role: 'Founder, Creator Signal',
    }),
  ],
}
const wishlistIndex = starterPages.findIndex((page) => page.slug === 'wishlist')
if (wishlistIndex < 0) throw new Error('[creator-signal] Missing Wishlist starter page.')
starterPages.splice(wishlistIndex + 1, 0, earlyAccessPage)
starterPages.splice(wishlistIndex + 2, 0, ...intakeStarterPages)

const notFoundPage: StarterPage = {
  id: 'not-found',
  slug: 'creator-signal-not-found',
  title: 'Page not found',
  description: 'The requested Creator Signal page could not be found.',
  patternId: pagePatternId('not-found-state'),
  blocks: [moduleBlock('recovery-state', {
    state: 'not-found',
    heading: 'We cannot find that page',
    body: 'The address may have changed or the page may no longer exist.',
    actionLabel: 'Return home',
    actionUrl: '/',
    sectionId: 'not-found-state',
  })],
}
const governedPages = [...starterPages, notFoundPage]

function pageSeo(page: StarterPage): PageSeo {
  const pageTitle = page.slug === 'index' ? page.title : `${page.title} | Creator Signal`
  const path = page.slug === 'index' ? '' : `/${page.slug}`
  const article = page.slug.startsWith('legal/') || page.slug.startsWith('trust/')
  return {
    title: pageTitle,
    description: page.description,
    canonicalUrl: `https://creatorsignal.me${path}`,
    language: 'en-AU',
    robots: page.slug === 'early-access'
      ? { index: false, follow: true, archive: false }
      : { index: true, follow: true, archive: true },
    openGraph: { title: pageTitle, description: page.description, type: article ? 'article' : 'website' },
    twitter: { card: 'summary', title: pageTitle, description: page.description },
  }
}

const placeholder = (index: number): string => `<div data-creator-signal-block="${index}"></div>`
const entries: PagePackEntry[] = governedPages.map((page) => ({
  id: page.id,
  slug: page.slug,
  title: page.title,
  html: placeholder(0),
}))

const sharedBlocks: PageBlock[] = [
  moduleBlock('header', { ...siteHeader.defaults, items: [...siteHeader.defaults.items as unknown[]] }),
  moduleBlock('footer', { ...siteFooter.defaults, items: [...siteFooter.defaults.items as unknown[]] }),
  moduleBlock('consent-banner', { ...consentBanner.defaults }),
]

export interface CreatorSignalPageAuthoringReference {
  route: string
  title: string
  description: string
  patternId: string
  componentEntryIds: string[]
}

/** Durable route-to-component contract consumed by tests and parity reports. */
export const creatorSignalPageAuthoringReference: readonly CreatorSignalPageAuthoringReference[] =
  starterPages.map((page) => ({
    route: page.slug === 'index' ? '/' : `/${page.slug}`,
    title: page.title,
    description: page.description,
    patternId: page.patternId,
    componentEntryIds: page.blocks.map((block) => block.entryId),
  }))

export const creatorSignalNotFoundAuthoringReference: CreatorSignalPageAuthoringReference = {
  route: '/404',
  title: notFoundPage.title,
  description: notFoundPage.description,
  patternId: notFoundPage.patternId,
  componentEntryIds: notFoundPage.blocks.map((block) => block.entryId),
}

export const creatorSignalSharedTemplateEntryIds = sharedBlocks.map(
  (block) => block.entryId,
)

entries.push({
  id: 'site-template',
  slug: 'creator-signal-site-template',
  title: 'Creator Signal site template',
  html: `${placeholder(0)}<main id="main-content" tabindex="-1"><instatic-outlet></instatic-outlet></main>${placeholder(1)}${placeholder(2)}`,
})

const compiled = compilePackPages(
  'creator-signal.site',
  entries,
  creatorSignalRenderProfile.stylesheet,
)
// The compiler needs the shared CSS to resolve authored class names to stable
// class IDs, especially inside the Hero Visual Component. Governed modules
// emit the render-profile stylesheet through the publisher's deduplicated
// framework bundle, so the technical pack retains empty class references.
// Re-emitting desktop declarations in a later style bundle would override the
// module stylesheet's responsive cascade.
const compiledClassReferences = compiled.classes
  .filter((rule) => rule.kind === 'class')
  .map((rule) => ({
    ...rule,
    styles: {},
    contextStyles: {},
  }))
const entryVersion = new Map(
  creatorSignalComponentLibraryEntries.map((entry) => [entry.id, entry.version]),
)

function applyBlocks(pageSlug: string, blocks: PageBlock[]): void {
  const page = compiled.pages.find((candidate) => candidate.slug === pageSlug)
  if (!page) throw new Error(`[creator-signal] Missing compiled page "${pageSlug}".`)

  const matched = new Set<number>()
  for (const node of Object.values(page.nodes)) {
    const attributes = node.props.htmlAttributes
    if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) continue
    const rawIndex = (attributes as Record<string, unknown>)['data-creator-signal-block']
    if (typeof rawIndex !== 'string' || !/^\d+$/.test(rawIndex)) continue
    const index = Number(rawIndex)
    const block = blocks[index]
    if (!block) throw new Error(`[creator-signal] Page "${pageSlug}" has an unknown block ${index}.`)
    if (block.kind === 'two-column') {
      throw new Error(`[creator-signal] Page "${pageSlug}" cannot compile a two-column layout from a flat placeholder.`)
    }

    const version = entryVersion.get(block.entryId)
    if (!version) throw new Error(`[creator-signal] Missing Component Library entry "${block.entryId}".`)
    node.moduleId = block.kind === 'hero' ? 'base.visual-component-ref' : block.moduleId
    node.props = block.kind === 'hero'
      ? { componentId: heroComponent.id, propOverrides: block.props }
      : { ...block.props }
    node.children = []
    node.classIds = []
    node.catalogueInstance = {
      entryId: block.entryId,
      entryVersion: version,
      variantId: 'default',
    }
    matched.add(index)
  }
  if (matched.size !== blocks.length) {
    throw new Error(`[creator-signal] Page "${pageSlug}" compiled ${matched.size}/${blocks.length} governed blocks.`)
  }
}

function applyLeafBlock(
  patternId: string,
  node: Page['nodes'][string],
  block: LeafBlock,
  label: string,
): void {
  if (node.catalogueInstance?.entryId !== block.entryId) {
    throw new Error(
      `[creator-signal] Pattern "${patternId}" ${label} does not map to "${block.entryId}".`,
    )
  }
  const expectedModuleId = block.kind === 'hero' ? 'base.visual-component-ref' : block.moduleId
  if (node.moduleId !== expectedModuleId) {
    throw new Error(
      `[creator-signal] Pattern "${patternId}" ${label} uses "${node.moduleId}", expected "${expectedModuleId}".`,
    )
  }
  node.props = block.kind === 'hero'
    ? { componentId: heroComponent.id, propOverrides: block.props }
    : { ...block.props }
  node.children = []
  node.classIds = []
}

function applyTwoColumnBlock(
  patternId: string,
  nodes: Page['nodes'],
  node: Page['nodes'][string],
  block: TwoColumnBlock,
  label: string,
): void {
  if (
    node.catalogueInstance?.entryId !== block.entryId ||
    node.moduleId !== 'base.visual-component-ref'
  ) {
    throw new Error(
      `[creator-signal] Pattern "${patternId}" ${label} is not the governed Two Column Layout.`,
    )
  }
  node.props = { componentId: block.componentId, propOverrides: {} }
  node.classIds = []

  for (const slotName of [twoColumnSlotIds.left, twoColumnSlotIds.right] as const) {
    const slotNode = node.children
      .map((childId) => nodes[childId])
      .find((child) => child?.moduleId === 'base.slot-instance' && child.props.slotName === slotName)
    if (!slotNode) {
      throw new Error(
        `[creator-signal] Pattern "${patternId}" ${label} has no "${slotName}" slot.`,
      )
    }
    const slotBlocks = block.slots[slotName]
    if (slotNode.children.length !== slotBlocks.length) {
      throw new Error(
        `[creator-signal] Pattern "${patternId}" ${label} exposes ${slotNode.children.length}/${slotBlocks.length} "${slotName}" slot components.`,
      )
    }
    for (const [slotIndex, slotBlock] of slotBlocks.entries()) {
      const slotChild = nodes[slotNode.children[slotIndex]!]
      if (!slotChild) {
        throw new Error(
          `[creator-signal] Pattern "${patternId}" ${label} has a missing "${slotName}" slot child.`,
        )
      }
      applyLeafBlock(patternId, slotChild, slotBlock, `${label} ${slotName} component ${slotIndex}`)
    }
  }
}

function applyPagePattern(page: StarterPage): void {
  const compiledPage = compiled.pages.find((candidate) => candidate.slug === page.slug)
  if (!compiledPage) throw new Error(`[creator-signal] Missing compiled page "${page.slug}".`)

  const placeholderNode = Object.values(compiledPage.nodes).find((node) => {
    const attributes = node.props.htmlAttributes
    return Boolean(
      attributes &&
      typeof attributes === 'object' &&
      !Array.isArray(attributes) &&
      (attributes as Record<string, unknown>)['data-creator-signal-block'] === '0',
    )
  })
  if (!placeholderNode) {
    throw new Error(`[creator-signal] Page "${page.slug}" has no governed pattern placeholder.`)
  }

  const version = entryVersion.get(page.patternId)
  if (!version) throw new Error(`[creator-signal] Missing pattern entry "${page.patternId}".`)
  const fragment = componentLibraryPatternRegistry.materialize(page.patternId, {
    entryId: page.patternId,
    entryVersion: version,
    variantId: 'default',
  })
  const rootId = fragment?.rootIds[0]
  const root = rootId ? fragment?.nodes[rootId] : undefined
  if (!fragment || !rootId || !root) {
    throw new Error(`[creator-signal] Pattern "${page.patternId}" could not materialize.`)
  }
  const authorableNodeIds = root.catalogueInstance?.pattern?.authorableNodeIds ?? []
  if (authorableNodeIds.length !== page.blocks.length) {
    throw new Error(
      `[creator-signal] Pattern "${page.patternId}" exposes ${authorableNodeIds.length}/${page.blocks.length} route blocks.`,
    )
  }

  for (const [index, block] of page.blocks.entries()) {
    const nodeId = authorableNodeIds[index]!
    const node = fragment.nodes[nodeId]
    if (!node) {
      throw new Error(
        `[creator-signal] Pattern "${page.patternId}" block ${index} is missing.`,
      )
    }
    if (block.kind === 'two-column') {
      applyTwoColumnBlock(page.patternId, fragment.nodes, node, block, `block ${index}`)
    } else {
      applyLeafBlock(page.patternId, node, block, `block ${index}`)
    }
  }

  for (const [nodeId, node] of Object.entries(fragment.nodes)) {
    if (nodeId === rootId) continue
    compiledPage.nodes[nodeId] = node
  }
  compiledPage.nodes[placeholderNode.id] = {
    ...root,
    id: placeholderNode.id,
  }
}

for (const page of governedPages) {
  applyPagePattern(page)
  const compiledPage = compiled.pages.find((candidate) => candidate.slug === page.slug)!
  compiledPage.seo = page === notFoundPage
    ? {
        ...pageSeo(page),
        canonicalUrl: 'https://creatorsignal.me/404',
        robots: { index: false, follow: true, archive: false },
      }
    : pageSeo(page)
}

applyBlocks('creator-signal-site-template', sharedBlocks)
const siteTemplate = compiled.pages.find((page) => page.slug === 'creator-signal-site-template')!
siteTemplate.template = {
  enabled: true,
  target: { kind: 'everywhere' },
  priority: 0,
}
const notFoundTemplate = compiled.pages.find((page) => page.slug === notFoundPage.slug)!
notFoundTemplate.template = {
  enabled: true,
  target: { kind: 'notFound' },
  priority: 0,
}

/**
 * Pack compilation and ordinary catalogue insertion use generated node IDs.
 * Starter and migration pages instead need reproducible IDs so two builds of
 * the same source produce the same page-cell hashes. Authored page IDs are
 * never rewritten by this helper because it runs only on the bundled pack.
 */
function stabilisePackPageNodeIds(page: Page): void {
  const orderedIds: string[] = []
  const parentById = new Map<string, string | null>()
  const visited = new Set<string>()

  const visit = (nodeId: string, parentId: string | null): void => {
    if (visited.has(nodeId)) return
    const node = page.nodes[nodeId]
    if (!node) throw new Error(`[creator-signal] Page "${page.slug}" references missing node "${nodeId}".`)
    visited.add(nodeId)
    orderedIds.push(nodeId)
    parentById.set(nodeId, parentId)
    for (const childId of node.children) visit(childId, nodeId)
  }

  visit(page.rootNodeId, null)
  for (const nodeId of Object.keys(page.nodes).sort()) visit(nodeId, null)

  const prefix = page.id.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
  const nextIdByCurrentId = new Map(orderedIds.map((nodeId, index) => [
    nodeId,
    `${prefix}--node-${String(index).padStart(3, '0')}`,
  ]))
  const remap = (nodeId: string): string => {
    const nextId = nextIdByCurrentId.get(nodeId)
    if (!nextId) throw new Error(`[creator-signal] Page "${page.slug}" could not stabilise node "${nodeId}".`)
    return nextId
  }

  const nextNodes: Page['nodes'] = {}
  for (const currentId of orderedIds) {
    const node = page.nodes[currentId]!
    const pattern = node.catalogueInstance?.pattern
    const nextId = remap(currentId)
    nextNodes[nextId] = {
      ...node,
      id: nextId,
      children: node.children.map(remap),
      parentId: parentById.get(currentId) === null
        ? null
        : remap(parentById.get(currentId)!),
      ...(node.catalogueInstance
        ? {
            catalogueInstance: {
              ...node.catalogueInstance,
              ...(pattern
                ? {
                    pattern: {
                      ...pattern,
                      authorableNodeIds: pattern.authorableNodeIds.map(remap),
                    },
                  }
                : {}),
            },
          }
        : {}),
    }
  }

  page.nodes = nextNodes
  page.rootNodeId = remap(page.rootNodeId)
}

for (const page of compiled.pages) stabilisePackPageNodeIds(page)

const pack = definePack({
  pluginId: 'creator-signal.site',
  publicAuthoring: creatorSignalPublicAuthoringPolicy,
  visualComponents: [heroComponent, twoColumnComponent],
  pages: compiled.pages,
  conditions: [],
})
pack.classes.push(...compiledClassReferences)

export { pack, starterPages }
