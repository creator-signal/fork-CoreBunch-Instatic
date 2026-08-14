import {
  compilePackPages,
  definePack,
  escapeHtml,
  type PagePackEntry,
} from '@core/plugin-sdk'
import type { PageSeo } from '@core/page-tree'
import { creatorSignalComponentLibraryEntries } from '../component-library'
import { consentBanner, siteFooter, siteHeader } from '../modules/site-components'
import { creatorSignalCss } from './design-system'
import { heroComponent, heroParamIds } from './hero-component'

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

type PageBlock = ModuleBlock | HeroBlock

interface StarterPage {
  id: string
  slug: string
  title: string
  description: string
  blocks: PageBlock[]
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
): HeroBlock => ({
  kind: 'hero',
  entryId: 'creator-signal.site.hero',
  props: {
    [heroParamIds.eyebrow]: eyebrow,
    [heroParamIds.heading]: heading,
    [heroParamIds.body]: body,
    [heroParamIds.actionLabel]: actionLabel,
    [heroParamIds.actionUrl]: actionUrl,
    [heroParamIds.artwork]: '',
  },
})

const features = (
  eyebrow: string,
  heading: string,
  introduction: string,
  items: Array<[string, string, string]>,
  sectionId = 'features',
): ModuleBlock => moduleBlock('feature-grid', {
  eyebrow,
  heading,
  introduction,
  sectionId,
  items: items.map(([marker, itemHeading, body]) => ({
    marker,
    heading: itemHeading,
    body,
  })),
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
  blocks: [moduleBlock('public-document', {
    eyebrow: 'Creator Signal',
    heading: title,
    summary: description,
    body: paragraphHtml([...legalReleaseParagraphs(), ...paragraphs]),
    dateModified: legalRelease.version,
  })],
})

const starterPages: StarterPage[] = [
  {
    id: 'home',
    slug: 'index',
    title: 'Creator Signal',
    description: 'Calm, useful tools that help independent creators understand what is working and act with confidence.',
    blocks: [
      hero('Creator Signal', 'Turn creative business data into a clearer next move.', 'Creator Signal builds calm, useful tools that help independent creators understand what is working and act with confidence.', '/products/sales-pulse', 'Explore Sales Pulse'),
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
    blocks: [
      hero('Creator Signal products', 'Products for clearer creative-business decisions.', 'Creator Signal products turn complex business information into focused, practical experiences. Start with Sales Pulse, with more products to follow.', '/products/sales-pulse', 'Explore Sales Pulse'),
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
    blocks: [
      hero('Sales Pulse', 'See the signal in your sales.', 'Sales Pulse turns marketplace history into a calm, useful view of what is selling, what is changing and where to look next.', '/pricing', 'View pricing'),
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
    blocks: [
      hero('Features', 'Practical tools, deliberately focused.', 'Creator Signal prioritises reliable imports, readable analysis and clear controls over noisy dashboards.', '/pricing', 'See pricing'),
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
    blocks: [
      hero('Pricing', 'Choose the Sales Pulse plan that fits your work.', 'Straightforward AUD monthly plans with the access boundary shown before checkout.', 'https://salespulse.creatorsignal.me', 'Open Sales Pulse'),
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

for (const page of formPages) {
  starterPages.push({
    id: page.id,
    slug: page.slug,
    title: page.title,
    description: page.description,
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

starterPages.push(
  {
    id: 'privacy',
    slug: 'legal/privacy',
    title: 'Privacy',
    description: 'How Creator Signal uses information to operate its services and the choices available to you.',
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

function pageSeo(page: StarterPage): PageSeo {
  const pageTitle = page.slug === 'index' ? page.title : `${page.title} | Creator Signal`
  const path = page.slug === 'index' ? '' : `/${page.slug}`
  const article = page.slug.startsWith('legal/') || page.slug.startsWith('trust/')
  return {
    title: pageTitle,
    description: page.description,
    canonicalUrl: `https://creatorsignal.me${path}`,
    language: 'en-AU',
    robots: { index: true, follow: true, archive: true },
    openGraph: { title: pageTitle, description: page.description, type: article ? 'article' : 'website' },
    twitter: { card: 'summary', title: pageTitle, description: page.description },
  }
}

const placeholder = (index: number): string => `<div data-creator-signal-block="${index}"></div>`
const entries: PagePackEntry[] = starterPages.map((page) => ({
  id: page.id,
  slug: page.slug,
  title: page.title,
  html: page.blocks.map((_, index) => placeholder(index)).join(''),
}))

const sharedBlocks: PageBlock[] = [
  moduleBlock('header', { ...siteHeader.defaults, items: [...siteHeader.defaults.items as unknown[]] }),
  moduleBlock('footer', { ...siteFooter.defaults, items: [...siteFooter.defaults.items as unknown[]] }),
  moduleBlock('consent-banner', { ...consentBanner.defaults }),
]

entries.push({
  id: 'site-template',
  slug: '_templates/creator-signal-site',
  title: 'Creator Signal site template',
  html: `${placeholder(0)}<main id="main-content"><instatic-outlet></instatic-outlet></main>${placeholder(1)}${placeholder(2)}`,
})

const compiled = compilePackPages('creator-signal.site', entries, creatorSignalCss)
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

for (const page of starterPages) {
  applyBlocks(page.slug, page.blocks)
  const compiledPage = compiled.pages.find((candidate) => candidate.slug === page.slug)!
  compiledPage.seo = pageSeo(page)
}

applyBlocks('_templates/creator-signal-site', sharedBlocks)
const siteTemplate = compiled.pages.find((page) => page.slug === '_templates/creator-signal-site')!
siteTemplate.template = {
  enabled: true,
  target: { kind: 'everywhere' },
  priority: 0,
}

const pack = definePack({
  pluginId: 'creator-signal.site',
  visualComponents: [heroComponent],
  pages: compiled.pages,
  conditions: compiled.conditions,
})
pack.classes.push(...compiled.classes)

export { pack, starterPages }
