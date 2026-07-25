import { compilePackPage, definePack, type PagePackEntry } from '@core/plugin-sdk'

const css = `
*{box-sizing:border-box}
body{margin:0;background:#f8f6ef;color:#172a2a;font-family:Inter,ui-sans-serif,system-ui,sans-serif;line-height:1.55}
.site-header,.site-footer,.section{width:min(1160px,calc(100% - 2rem));margin-inline:auto}
.site-header{display:flex;align-items:center;justify-content:space-between;padding:1.25rem 0;gap:1rem}
.brand{font-size:1.2rem;font-weight:800;color:#172a2a;text-decoration:none}
.nav{display:flex;gap:1rem;align-items:center;flex-wrap:wrap}
.nav a,.footer-links a{color:inherit;text-decoration:none}
.button{display:inline-flex;padding:.8rem 1.1rem;border-radius:999px;background:#c6ff78;color:#172a2a;text-decoration:none;font-weight:750}
.button-secondary{background:#fff;border:1px solid #9ca9a1}
.hero{padding:clamp(4rem,10vw,8rem) 0}
.eyebrow{font-size:.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.14em}
h1{font-size:clamp(3rem,7vw,6.5rem);line-height:.94;letter-spacing:-.055em;max-width:15ch;margin:.35rem 0 1.5rem}
h2{font-size:clamp(2rem,4.5vw,4rem);line-height:1.02;letter-spacing:-.04em;margin:.3rem 0 1rem}
.lede{font-size:clamp(1.1rem,2vw,1.4rem);max-width:62ch}
.feature-section,.prose-section{padding:4rem 0}
.feature-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin-top:2rem}
.feature-card{background:#fff;border:1px solid #d8ded5;border-radius:1.25rem;padding:1.5rem;min-height:13rem}
.feature-card strong{display:block;font-size:1.35rem;margin:.6rem 0}
.cta{background:#172a2a;color:#f8f6ef;border-radius:2rem;padding:clamp(2rem,6vw,5rem);margin-block:4rem}
.prose{max-width:74ch}.prose p{font-size:1.08rem;margin:0 0 1.25rem}
.site-footer{display:flex;justify-content:space-between;gap:2rem;flex-wrap:wrap;padding:4rem 0}
.footer-links{display:flex;gap:1rem;flex-wrap:wrap}
.consent{position:fixed;inset:auto 1rem 1rem 1rem;z-index:20;display:flex;justify-content:space-between;align-items:center;gap:1rem;background:#fff;border:1px solid #cdd5cc;border-radius:1rem;padding:1rem;box-shadow:0 12px 40px #172a2a22}
.consent[hidden]{display:none}.consent-actions{display:flex;gap:.5rem;flex-wrap:wrap}
@media(max-width:720px){.site-header{align-items:flex-start;flex-direction:column}.nav{font-size:.9rem}.consent{align-items:flex-start;flex-direction:column}}
`

const header = `<header class="site-header"><a class="brand" href="/">Creator Signal</a><nav class="nav" aria-label="Primary"><a href="/products">Products</a><a href="/features">Features</a><a href="/pricing">Pricing</a><a href="/contact">Contact</a><a class="button" href="https://salespulse.creatorsignal.me">Sign in</a></nav></header>`
const footer = `<footer class="site-footer"><div><a class="brand" href="/">Creator Signal</a><p>Clearer signals for independent creative businesses.</p></div><nav class="footer-links" aria-label="Footer"><a href="/products">Products</a><a href="/products/sales-pulse">Sales Pulse</a><a href="/features">Features</a><a href="/pricing">Pricing</a><a href="/contact">Contact</a><a href="/legal/privacy">Privacy</a><a href="/legal/terms">Terms</a><a href="https://status.creatorsignal.me">Status</a></nav></footer><aside class="consent" data-consent-banner aria-label="Privacy choices"><div><strong>Your privacy choices</strong><p>Aggregate traffic measurement is enabled when configured. Optional journey analytics only runs with your permission.</p></div><div class="consent-actions"><button class="button button-secondary" data-analytics-choice="denied">Essential only</button><button class="button" data-analytics-choice="granted">Allow optional analytics</button></div></aside>`
const chrome = (main: string) => `${header}<main>${main}</main>${footer}`
const hero = (label: string, title: string, body: string, href: string, action: string) => `<section class="section hero"><p class="eyebrow">${label}</p><h1>${title}</h1><p class="lede">${body}</p><a class="button" href="${href}">${action}</a></section>`
const features = (label: string, heading: string, intro: string, cards: Array<[string, string, string]>) => `<section class="section feature-section"><p class="eyebrow">${label}</p><h2>${heading}</h2><p class="lede">${intro}</p><div class="feature-grid">${cards.map(([number, title, body]) => `<article class="feature-card"><span class="eyebrow">${number}</span><strong>${title}</strong><p>${body}</p></article>`).join('')}</div></section>`
const cta = (label: string, heading: string, body: string, href: string, action: string) => `<section class="section cta"><p class="eyebrow">${label}</p><h2>${heading}</h2><p class="lede">${body}</p><a class="button" href="${href}">${action}</a></section>`
const prose = (heading: string, paragraphs: string[]) => `<section class="section prose-section"><div class="prose"><h2>${heading}</h2>${paragraphs.map((text) => `<p>${text}</p>`).join('')}</div></section>`

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
    html: chrome(hero('Contact Creator Signal', 'Tell us what you are trying to understand.', 'Send a short note about your creative business, Sales Pulse or a support question. We will use the details only to respond and follow up as requested.', '/legal/privacy', 'Read our privacy notice') + '<section class="section feature-section"><div data-creator-signal-mautic-form="true"></div></section>'),
  },
  {
    id: 'privacy', slug: 'legal/privacy', title: 'Privacy',
    html: chrome(hero('Legal', 'Privacy should be understandable.', 'This notice explains the information Creator Signal uses to operate its services and the choices available to you.', '/contact', 'Contact us') + prose('Information we use', ['We process account and authentication information to provide secure access, subscription and entitlement information to operate paid features, and data you choose to connect to provide Sales Pulse.', 'When you contact us, we use the details you submit to respond. Optional product journey analytics is disabled until you grant consent. Aggregate traffic measurement is configured to avoid advertising profiles.', 'We retain information only for operational, security, legal and support needs, apply access controls, and use service providers only for defined platform functions.', 'This launch copy must receive final jurisdiction-specific legal approval before production activation.'])),
  },
  {
    id: 'terms', slug: 'legal/terms', title: 'Terms',
    html: chrome(hero('Legal', 'Clear expectations for using Creator Signal.', 'These terms describe acceptable use, subscriptions, connected data and service responsibilities.', '/contact', 'Contact us') + prose('Service terms', ['You are responsible for your account, the authority to connect marketplace information, and the accuracy of information you provide. Do not misuse the service or attempt unauthorised access.', 'Subscription prices, included capabilities and renewal terms are shown before checkout. You retain ownership of your connected business information.', 'Services may change as they improve. Material changes and important limitations will be communicated where practical.', 'This launch copy must receive final jurisdiction-specific legal approval before production activation.'])),
  },
]

const compiled = entries.map((entry) => compilePackPage('creator-signal.site', { ...entry, css }))
const contact = compiled.find(({ page }) => page.id.endsWith('/contact'))!
const mauticNode = Object.values(contact.page.nodes).find((node) => {
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
  { id: 'hero', name: 'Creator Signal hero', html: hero('Eyebrow', 'A clear headline.', 'Add a useful, plain-language introduction for this page.', '#', 'Primary action'), css },
  { id: 'feature-grid', name: 'Creator Signal feature grid', html: features('Capabilities', 'A focused feature set.', 'Explain what this group helps the visitor do.', [['01', 'First feature', 'Describe the outcome, not only the mechanism.'], ['02', 'Second feature', 'Keep the copy short enough to scan.'], ['03', 'Third feature', 'Use another card only when it adds information.']]), css },
  { id: 'call-to-action', name: 'Creator Signal call to action', html: cta('Next step', 'Give the visitor one clear next move.', 'Explain what happens after they choose it.', '#', 'Take the next step'), css },
  { id: 'prose', name: 'Creator Signal rich text', html: prose('Section heading', ['Write the first paragraph here.', 'Add supporting detail here.']), css },
]

const pack = definePack({
  pluginId: 'creator-signal.site',
  pages: compiled.map(({ page }) => page),
  layouts: authorLayouts,
})
pack.classes.push(...compiled.flatMap(({ classes }) => classes))
export { pack }
