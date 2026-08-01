import { compilePackPages, definePack, type PagePackEntry } from '@core/plugin-sdk'
import { creatorSignalCss } from './design-system'
import { heroComponent } from './hero-component'

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

const chrome = (main: string) => `${header}<main>${main}</main>${footer}`

const legalRelease = {
  version: '2026-08-02',
  effectiveDate: '2 August 2026',
  operator: 'Creator Signal is operated by INSIGHT VISION PTY LTD (ACN 601 335 460), Australia.',
}

const legalReleaseParagraphs = () => [
  `Version ${legalRelease.version}. Effective ${legalRelease.effectiveDate}.`,
  legalRelease.operator,
]

const signalVisual = `<div class="signal-visual" aria-hidden="true"><span></span><span></span><span></span><span></span></div>`

const hero = (
  label: string,
  title: string,
  body: string,
  href: string,
  action: string,
) => `<section class="hero-section">
  <div class="hero-copy">
    <p class="eyebrow">${label}</p>
    <h1>${title}</h1>
    <p class="hero-body">${body}</p>
    <div class="actions"><a class="button button-primary" href="${href}">${action}</a></div>
  </div>
  <div class="hero-art" aria-label="Creator Signal visual">${signalVisual}</div>
</section>`

const features = (
  label: string,
  heading: string,
  intro: string,
  cards: Array<[string, string, string]>,
) => `<section class="content-section">
  <div class="section-intro"><p class="eyebrow">${label}</p><h2>${heading}</h2><p>${intro}</p></div>
  <div class="feature-grid">${cards.map(([number, title, body]) =>
    `<article class="feature-card"><span class="feature-number">${number}</span><h3>${title}</h3><p>${body}</p></article>`,
  ).join('')}</div>
</section>`

const cta = (
  label: string,
  heading: string,
  body: string,
  href: string,
  action: string,
) => `<section class="cta-section">
  <div class="cta-copy"><p class="eyebrow">${label}</p><h2>${heading}</h2><p>${body}</p></div>
  <div class="actions"><a class="button button-primary" href="${href}">${action}</a></div>
</section>`

const prose = (heading: string, paragraphs: string[]) => `<section class="content-section narrow-content">
  <h2>${heading}</h2>
  <div class="prose-content">${paragraphs.map((text) => `<p>${text}</p>`).join('')}</div>
</section>`

const testimonial = (
  quote: string,
  attribution: string,
  role: string,
) => `<figure class="testimonial">
  <blockquote>“${quote}”</blockquote>
  <figcaption><strong>${attribution}</strong><span>${role}</span></figcaption>
</figure>`

const faq = (
  heading: string,
  items: Array<[string, string]>,
) => `<section class="content-section narrow-content">
  <h2>${heading}</h2>
  <div class="faq-list">${items.map(([question, answer]) =>
    `<details><summary>${question}</summary><p>${answer}</p></details>`,
  ).join('')}</div>
</section>`

const publicDocument = (
  id: string,
  slug: string,
  title: string,
  summary: string,
  paragraphs: string[],
): PagePackEntry => ({
  id,
  slug,
  title,
  html: chrome(`<article class="public-document">
    <header class="public-document-header"><p class="eyebrow">Creator Signal</p><h1>${title}</h1><p>${summary}</p></header>
    <div class="prose-content">${[...legalReleaseParagraphs(), ...paragraphs].map((text) => `<p>${text}</p>`).join('')}</div>
  </article>`),
})

const publicDocuments: PagePackEntry[] = [
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
]

const entries: PagePackEntry[] = [
  {
    id: 'home', slug: 'index', title: 'Creator Signal',
    html: chrome(hero('Creator Signal', 'Turn creative business data into a clearer next move.', 'Creator Signal builds calm, useful tools that help independent creators understand what is working and act with confidence.', '/products/sales-pulse', 'Explore Sales Pulse') + features('Built for working creators', 'Less spreadsheet archaeology. More useful signals.', 'Bring scattered marketplace activity into focused experiences without giving up control of your work or data.', [['01', 'See the whole picture', 'Bring sales history and current activity into one considered view.'], ['02', 'Keep your data yours', 'Use private, exportable records with straightforward controls.'], ['03', 'Act with context', 'Use trends and catalogue signals to decide what deserves attention next.']]) + cta('One useful signal at a time', 'Start with Sales Pulse.', 'Connect your sales history and build a clearer business record over time.', '/products/sales-pulse', 'See Sales Pulse')),
  },
  {
    id: 'products', slug: 'products', title: 'Products',
    html: chrome(hero('Creator Signal products', 'Products for clearer creative-business decisions.', 'Creator Signal products turn complex business information into focused, practical experiences. Start with Sales Pulse, with more products to follow.', '/products/sales-pulse', 'Explore Sales Pulse') + features('Products', 'Available now.', 'Our product catalogue will grow as we build more focused tools for independent creators.', [['SP', 'Sales Pulse', 'Understand what is selling, what is changing and where to focus next.']]) + cta('Sales Pulse', 'See the signal in your sales.', 'Explore Sales Pulse features, plans and the supported creator-sales workflow.', '/products/sales-pulse', 'View Sales Pulse')),
  },
  {
    id: 'sales-pulse', slug: 'products/sales-pulse', title: 'Sales Pulse',
    html: chrome(hero('Sales Pulse', 'See the signal in your sales.', 'Sales Pulse turns marketplace history into a calm, useful view of what is selling, what is changing and where to look next.', '/pricing', 'View pricing') + features('What it does', 'A dashboard made for creative work.', 'Understand performance without rebuilding the same spreadsheet every week.', [['01', 'Connected history', 'Import supported marketplace sales and keep a durable record.'], ['02', 'Useful comparisons', 'See products, periods and patterns in a consistent view.'], ['03', 'Private by design', 'Your operational data is not an advertising product.']]) + cta('Ready when you are', 'Bring your sales history into focus.', 'Review the plans or ask a question before you connect.', '/pricing', 'Compare plans')),
  },
  {
    id: 'features', slug: 'features', title: 'Features',
    html: chrome(hero('Features', 'Practical tools, deliberately focused.', 'Creator Signal prioritises reliable imports, readable analysis and clear controls over noisy dashboards.', '/pricing', 'See pricing') + features('Capabilities', 'Built around the work you already do.', 'Each capability is designed to reduce repeated administration and make the next decision easier.', [['01', 'Sales imports', 'Bring supported marketplace history into a consistent ledger.'], ['02', 'Performance views', 'Compare products and time periods without manual cleanup.'], ['03', 'Exportable records', 'Keep access to the information you have connected.'], ['04', 'Guided signals', 'Surface useful changes without pretending every fluctuation is a trend.'], ['05', 'Secure access', 'Use central identity, protected sessions and explicit entitlements.'], ['06', 'Operational transparency', 'See service health and receive clear failure states.']])),
  },
  {
    id: 'pricing', slug: 'pricing', title: 'Pricing',
    html: chrome(hero('Pricing', 'Choose the Sales Pulse plan that fits your work.', 'Straightforward AUD monthly plans with the access boundary shown before checkout.', 'https://salespulse.creatorsignal.me', 'Open Sales Pulse') + features('Sales Pulse plans', 'Free, Starter and Pro.', 'Product access is funded by subscriptions, not advertising profiles.', [['01', 'Free — $0', 'Start with the core workflow and understand whether Sales Pulse fits.'], ['02', 'Starter — $5 AUD monthly', 'Build a durable sales record and unlock the supported starter capabilities.'], ['03', 'Pro — $10 AUD monthly', 'Use the full analysis experience and broader product comparisons.']]) + cta('Talk to us', 'Have a question before subscribing?', 'Tell us what you sell and what you need to understand.', '/contact', 'Contact Creator Signal')),
  },
  {
    id: 'contact', slug: 'contact', title: 'Contact',
    html: chrome(hero('Contact Creator Signal', 'Tell us what you are trying to understand.', 'Send a short note about your creative business, Sales Pulse or a support question. We will use the details only to respond and follow up as requested.', '/legal/privacy', 'Read our privacy notice') + '<section class="content-section"><div data-creator-signal-mautic-form="true"></div></section>'),
  },
  {
    id: 'privacy', slug: 'legal/privacy', title: 'Privacy',
    html: chrome(hero('Legal', 'Privacy should be understandable.', 'This notice explains the information Creator Signal uses to operate its services and the choices available to you.', '/contact', 'Contact us') + prose('Information we use', [...legalReleaseParagraphs(), 'We process account and authentication information to provide secure access, subscription and entitlement information to operate paid features, and data you choose to connect to provide Sales Pulse.', 'When you contact us, we use the details you submit to respond. Optional product journey analytics is disabled until you grant consent. Aggregate traffic measurement is configured to avoid advertising profiles.', 'We retain information only for operational, security, legal and support needs, apply access controls, and use service providers only for defined platform functions.'])),
  },
  {
    id: 'terms', slug: 'legal/terms', title: 'Terms',
    html: chrome(hero('Legal', 'Clear expectations for using Creator Signal.', 'These terms describe acceptable use, subscriptions, connected data and service responsibilities.', '/contact', 'Contact us') + prose('Service terms', [...legalReleaseParagraphs(), 'You are responsible for your account, the authority to connect marketplace information, and the accuracy of information you provide. Do not misuse the service or attempt unauthorised access.', 'Subscription prices, included capabilities and renewal terms are shown before checkout. You retain ownership of your connected business information.', 'Services may change as they improve. Material changes and important limitations will be communicated where practical.'])),
  },
  ...publicDocuments,
]

const compiled = compilePackPages('creator-signal.site', entries, creatorSignalCss)
const contact = compiled.pages.find((page) => page.id.endsWith('/contact'))!
const mauticNode = Object.values(contact.nodes).find((node) => {
  const attributes = node.props.htmlAttributes
  return typeof attributes === 'object' && attributes !== null &&
    (attributes as Record<string, unknown>)['data-creator-signal-mautic-form'] === 'true'
})
if (!mauticNode) {
  throw new Error('Creator Signal contact page is missing its Mautic form placeholder.')
}
mauticNode.moduleId = 'creator-signal.site.mautic-form'
mauticNode.props = {
  heading: 'Send a message',
  introduction: 'Required fields are identified in the form.',
  successMessage: 'Thanks — your message has been received.',
  mauticBaseUrl: 'https://marketing.creatorsignal.me',
  formId: '3',
  formApiName: 'creatorsignalcontactenquiry',
  formCode: 'creator_signal_contact',
  campaignCode: 'contact',
}
mauticNode.classIds = []

const authorLayouts = [
  { id: 'hero', name: 'Creator Signal hero', html: hero('Eyebrow', 'A clear headline.', 'Add a useful, plain-language introduction for this page.', '#', 'Primary action'), css: creatorSignalCss },
  { id: 'feature-grid', name: 'Creator Signal feature grid', html: features('Capabilities', 'A focused feature set.', 'Explain what this group helps the visitor do.', [['01', 'First feature', 'Describe the outcome, not only the mechanism.'], ['02', 'Second feature', 'Keep the copy short enough to scan.'], ['03', 'Third feature', 'Use another card only when it adds information.']]), css: creatorSignalCss },
  { id: 'call-to-action', name: 'Creator Signal call to action', html: cta('Next step', 'Give the visitor one clear next move.', 'Explain what happens after they choose it.', '#', 'Take the next step'), css: creatorSignalCss },
  { id: 'prose', name: 'Creator Signal rich text', html: prose('Section heading', ['Write the first paragraph here.', 'Add supporting detail here.']), css: creatorSignalCss },
  { id: 'testimonial', name: 'Creator Signal testimonial', html: testimonial('Add a short customer quotation that supports the page promise.', 'Customer name', 'Role or business'), css: creatorSignalCss },
  { id: 'faq', name: 'Creator Signal FAQ', html: faq('Frequently asked questions', [['What should visitors know first?', 'Write a direct answer that helps the visitor decide what to do next.'], ['Where can they get more help?', 'Link to the relevant product, policy or contact route.']]), css: creatorSignalCss },
]

const pack = definePack({
  pluginId: 'creator-signal.site',
  visualComponents: [heroComponent],
  pages: compiled.pages,
  conditions: compiled.conditions,
  layouts: authorLayouts,
})
pack.classes.push(...compiled.classes)
export { pack }
