import {
  componentLibraryPatternRegistry,
  type ComponentLibraryEntry,
  type ComponentLibraryField,
  type ComponentLibraryPatternDefinition,
  type ComponentLibraryPatternNode,
} from '@core/component-library'
import { VisualComponentRefModule } from '@modules/base/visualComponentRef'
import { heroComponent, heroParamIds } from './pack/hero-component'
import mauticForm from './modules/mautic-form'
import {
  campaignHero,
  callToAction,
  comparisonSection,
  faq,
  featureGrid,
  founderStory,
  pricingPlans,
  processSteps,
  publicDocument,
  recoveryState,
  richTextSection,
  signalComparison,
  signalStrip,
  testimonial,
} from './modules/site-components'
import {
  creatorSignalPublicAuthoringContract,
  creatorSignalPublicPatternCatalogue,
  creatorSignalPublicPatternRootModuleId,
  creatorSignalPublicPatternRootProps,
  isCreatorSignalComponentPermitted,
  isCreatorSignalPatternPermitted,
} from './public-authoring-contract'
import { creatorSignalAccessibilityContract } from './accessibility-contract'

const pluginRequirement = {
  capabilities: [],
  providerAdapters: [],
  plugins: ['creator-signal.site'],
}

const defaultVariant = [{
  id: 'default',
  name: 'Default',
  description: 'The governed Creator Signal treatment.',
  values: {},
}]

function siteEntry(input: {
  id: string
  version?: string
  name: string
  description: string
  tags: string[]
  moduleId: string
  fields: ComponentLibraryField[]
  constraints?: ComponentLibraryEntry['constraints']
  usage?: string
  accessibilityGuidance?: string
}): ComponentLibraryEntry {
  return {
    id: input.id,
    version: input.version ?? '1.0.0',
    name: input.name,
    description: input.description,
    category: 'Creator Signal',
    tags: input.tags,
    icon: 'layout-solid',
    source: {
      type: 'plugin',
      pluginId: 'creator-signal.site',
      name: 'Creator Signal',
    },
    status: 'stable',
    composition: 'leaf',
    implementation: { type: 'primitive', moduleId: input.moduleId },
    fields: input.fields,
    variants: defaultVariant,
    presets: [],
    slots: [],
    constraints: input.constraints ?? { allowedDocumentKinds: ['page', 'template'] },
    requirements: pluginRequirement,
    documentation: {
      usage: input.usage ?? `Edit the typed content fields; the component owns its semantic HTML and uses ${creatorSignalPublicAuthoringContract.designSystem.packageName}.`,
      accessibility: input.accessibilityGuidance ?? 'Keep labels descriptive and preserve the component heading hierarchy.',
    },
    accessibility: creatorSignalAccessibilityContract(input.id),
  }
}

export const creatorSignalHeroEntry: ComponentLibraryEntry = {
  id: 'creator-signal.site.hero',
  version: '1.2.0',
  name: 'Creator Signal Hero',
  description: 'The governed Creator Signal page introduction with one primary action and optional artwork.',
  category: 'Creator Signal',
  tags: ['creator signal', 'hero', 'introduction', 'landing page', 'call to action'],
  icon: 'layout-solid',
  source: {
    type: 'plugin',
    pluginId: 'creator-signal.site',
    name: 'Creator Signal',
  },
  status: 'stable',
  composition: 'leaf',
  implementation: {
    type: 'visual-component',
    componentId: heroComponent.id,
  },
  fields: [
    { key: heroParamIds.eyebrow, label: 'Eyebrow', description: 'Short context label above the headline.', type: 'text', required: true },
    { key: heroParamIds.heading, label: 'Heading', description: 'Primary page promise.', type: 'text', required: true },
    { key: heroParamIds.body, label: 'Introduction', description: 'Plain-language supporting copy.', type: 'text', required: true },
    { key: heroParamIds.actionLabel, label: 'Action label', description: 'Visible label for the primary action.', type: 'text', required: true },
    { key: heroParamIds.actionUrl, label: 'Action URL', description: 'Destination for the primary action.', type: 'url', required: true },
    { key: heroParamIds.artwork, label: 'Artwork', description: 'Optional image selected from the Media workspace.', type: 'image', required: false },
  ],
  variants: defaultVariant,
  presets: [],
  slots: [],
  constraints: { allowedDocumentKinds: ['page', 'template'] },
  requirements: pluginRequirement,
  documentation: {
    usage: `Use once near the start of a landing page. Styling is governed by ${creatorSignalPublicAuthoringContract.designSystem.packageName}.`,
    accessibility: 'Use the Hero as the page-level H1 and keep later heading levels logical.',
  },
  accessibility: creatorSignalAccessibilityContract('creator-signal.site.hero'),
}

export const creatorSignalHeaderEntry = siteEntry({
  id: 'creator-signal.site.header',
  version: '1.2.0',
  name: 'Site Header',
  description: 'Pack-owned brand identity and primary navigation inherited from the site template.',
  tags: ['header', 'navigation', 'brand', 'shared'],
  moduleId: 'creator-signal.site.header',
  constraints: { allowedDocumentKinds: ['page', 'template'] },
  usage: 'Edit once in the shared template; every ordinary page inherits the updated brand identity and navigation.',
  accessibilityGuidance: 'Use short navigation labels, one primary action, and a Home URL that returns to the site root.',
  fields: [
    { key: 'brandName', label: 'Brand name', description: 'Visible site name and home-link accessible name.', type: 'text', required: true },
    { key: 'tagline', label: 'Tagline', description: 'Short supporting line displayed with the brand.', type: 'text', required: true },
    { key: 'homeUrl', label: 'Home URL', description: 'Destination used by the shared brand link.', type: 'url', required: true },
    {
      key: 'items', label: 'Navigation links', description: 'Ordered primary navigation shared by every page.', type: 'repeater', required: true,
      itemLabel: 'Link', minItems: 1, maxItems: 12,
      itemFields: [
        { key: 'label', label: 'Label', description: 'Concise visible link text.', type: 'text', required: true },
        { key: 'url', label: 'URL', description: 'Internal path or approved external destination.', type: 'url', required: true },
        { key: 'emphasis', label: 'Treatment', description: 'Use the primary treatment for one principal action only.', type: 'select', required: true, options: [
          { label: 'Standard', value: 'default' },
          { label: 'Primary action', value: 'primary' },
        ] },
      ],
    },
  ],
})

export const creatorSignalFooterEntry = siteEntry({
  id: 'creator-signal.site.footer',
  version: '1.1.0',
  name: 'Site Footer',
  description: 'Shared footer identity, legal routes and service links.',
  tags: ['footer', 'navigation', 'legal', 'shared'],
  moduleId: 'creator-signal.site.footer',
  constraints: { allowedDocumentKinds: ['page', 'template'] },
  usage: 'Edit once in the shared template; every ordinary page inherits the updated footer links and legal routes.',
  accessibilityGuidance: 'Keep link labels unique enough to make sense when read out of context.',
  fields: [
    { key: 'brandName', label: 'Brand name', description: 'Visible site name in the shared footer.', type: 'text', required: true },
    { key: 'tagline', label: 'Tagline', description: 'Short supporting brand line.', type: 'text', required: true },
    { key: 'copyright', label: 'Copyright', description: 'Current copyright notice displayed on every page.', type: 'text', required: true },
    {
      key: 'items', label: 'Footer links', description: 'Ordered product, help, legal and service destinations shared by every page.', type: 'repeater', required: true,
      itemLabel: 'Link', minItems: 1, maxItems: 24,
      itemFields: [
        { key: 'label', label: 'Label', description: 'Concise visible link text.', type: 'text', required: true },
        { key: 'url', label: 'URL', description: 'Internal path or approved external destination.', type: 'url', required: true },
      ],
    },
  ],
})

export const creatorSignalConsentEntry = siteEntry({
  id: 'creator-signal.site.consent-banner',
  name: 'Privacy Choices',
  description: 'Shared privacy notice and analytics choices.',
  tags: ['privacy', 'consent', 'analytics', 'shared'],
  moduleId: 'creator-signal.site.consent-banner',
  constraints: { allowedDocumentKinds: ['page', 'template'] },
  usage: 'Edit once in the shared template; every ordinary page inherits the same privacy choices.',
  accessibilityGuidance: 'Describe the optional purpose plainly and keep both choices equally understandable.',
  fields: [
    { key: 'heading', label: 'Heading', description: 'Short name for the privacy choice.', type: 'text', required: true },
    { key: 'body', label: 'Explanation', description: 'Plain-language explanation of essential and optional processing.', type: 'text', required: true },
    { key: 'essentialLabel', label: 'Essential choice label', description: 'Button label for declining optional analytics.', type: 'text', required: true },
    { key: 'optionalLabel', label: 'Optional choice label', description: 'Button label for granting optional analytics.', type: 'text', required: true },
  ],
})

export const creatorSignalFeatureGridEntry = siteEntry({
  id: 'creator-signal.site.feature-grid',
  version: '1.1.0',
  name: 'Feature Grid',
  description: 'A section introduction and repeatable list of opinionated feature cards.',
  tags: ['features', 'cards', 'list', 'marketing'],
  moduleId: 'creator-signal.site.feature-grid',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', description: 'Short context label above the section heading.', type: 'text', required: true },
    { key: 'heading', label: 'Heading', description: 'Outcome-focused heading for the complete card group.', type: 'text', required: true },
    { key: 'introduction', label: 'Introduction', description: 'One concise explanation of what the group contains.', type: 'text', required: true },
    { key: 'sectionId', label: 'Section anchor', description: 'Unique page anchor used by the section heading.', type: 'text', required: true, advanced: true },
    { key: 'tone', label: 'Tone', description: 'Use Signature only for a short brand-values section.', type: 'select', required: true },
    {
      key: 'items', label: 'Feature cards', description: 'Ordered cards; each card is data, not a nested component slot.', type: 'repeater', required: true,
      itemLabel: 'Feature', minItems: 1, maxItems: 12,
      itemFields: [
        { key: 'marker', label: 'Marker', description: 'Short sequence number or product code.', type: 'text', required: true },
        { key: 'heading', label: 'Heading', description: 'Scannable card outcome.', type: 'text', required: true },
        { key: 'body', label: 'Description', description: 'Supporting explanation for this card.', type: 'text', required: true },
      ],
    },
  ],
})

export const creatorSignalCampaignHeroEntry = siteEntry({
  id: 'creator-signal.site.campaign-hero',
  version: '1.0.0',
  name: 'Campaign Hero',
  description: 'The governed public-site introduction with one primary action, an optional secondary action and approved artwork.',
  tags: ['hero', 'campaign', 'landing page', 'call to action', 'media'],
  moduleId: campaignHero.id,
  constraints: { allowedDocumentKinds: ['page', 'template'] },
  usage: 'Use once at the start of an approved campaign or launch page; keep signup and login destinations application-owned.',
  accessibilityGuidance: 'Keep one H1, name both actions by outcome, and provide alternative text when the artwork conveys information.',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', description: 'Short context label above the page promise.', type: 'text', required: true },
    { key: 'heading', label: 'Heading', description: 'The single public page title.', type: 'text', required: true },
    { key: 'body', label: 'Introduction', description: 'Plain-language supporting copy.', type: 'text', required: true },
    { key: 'primaryActionLabel', label: 'Primary action label', description: 'Specific label for the one primary journey.', type: 'text', required: true },
    { key: 'primaryActionUrl', label: 'Primary action URL', description: 'Approved internal or application-owned destination.', type: 'url', required: true },
    { key: 'secondaryActionLabel', label: 'Secondary action label', description: 'Optional label for a supporting page-local or explanatory route.', type: 'text', required: false },
    { key: 'secondaryActionUrl', label: 'Secondary action URL', description: 'Optional destination paired with the secondary action.', type: 'url', required: false },
    { key: 'footnote', label: 'Action footnote', description: 'Short qualification below the actions.', type: 'text', required: true },
    { key: 'artwork', label: 'Artwork', description: 'Approved media selected from the Instatic Media workspace.', type: 'image', required: false },
    { key: 'artworkAlt', label: 'Artwork alternative text', description: 'Describe informative artwork; leave blank only when it is decorative.', type: 'text', required: false },
  ],
})

export const creatorSignalSignalStripEntry = siteEntry({
  id: 'creator-signal.site.signal-strip',
  name: 'Signal Strip',
  description: 'A static, wrapping band of short Creator Signal promises.',
  tags: ['brand', 'promises', 'campaign', 'list'],
  moduleId: signalStrip.id,
  usage: 'Use once between the campaign hero and the supporting page story. The strip is intentionally static and must not become essential moving content.',
  accessibilityGuidance: 'Keep each message short and preserve the list semantics; decorative separators remain hidden from assistive technology.',
  fields: [
    { key: 'label', label: 'Accessible label', description: 'Purpose of the complete message list.', type: 'text', required: true },
    { key: 'items', label: 'Messages', description: 'Short, non-duplicative brand promises.', type: 'repeater', required: true, itemLabel: 'Message', minItems: 1, maxItems: 8, itemFields: [
      { key: 'text', label: 'Text', description: 'Short promise that remains meaningful without animation.', type: 'text', required: true },
    ] },
  ],
})

export const creatorSignalSignalComparisonEntry = siteEntry({
  id: 'creator-signal.site.signal-comparison',
  name: 'Signal Comparison',
  description: 'A before-and-after explanation of limited reporting and a visual sales signal.',
  tags: ['comparison', 'before and after', 'sales', 'media'],
  moduleId: signalComparison.id,
  usage: 'Use for a two-sided narrative comparison; use Comparison Section when visitors need a row-and-column data table.',
  accessibilityGuidance: 'State both sides in text and provide alternative text for informative artwork so the comparison never relies on imagery alone.',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', description: 'Short context label above the comparison.', type: 'text', required: true },
    { key: 'heading', label: 'Heading', description: 'Outcome-focused heading for the complete comparison.', type: 'text', required: true },
    { key: 'introduction', label: 'Introduction', description: 'Why the before-and-after distinction matters.', type: 'text', required: true },
    { key: 'beforeLabel', label: 'Before label', description: 'Short name for the limited starting point.', type: 'text', required: true },
    { key: 'beforeBody', label: 'Before description', description: 'Text description of the existing limitation.', type: 'text', required: true },
    { key: 'afterLabel', label: 'After label', description: 'Short name for the improved view.', type: 'text', required: true },
    { key: 'afterBody', label: 'After description', description: 'Text description of the improved experience.', type: 'text', required: true },
    { key: 'artwork', label: 'After artwork', description: 'Optional approved product artwork.', type: 'image', required: false },
    { key: 'artworkAlt', label: 'Artwork alternative text', description: 'Describe informative artwork; leave blank only when it repeats adjacent copy.', type: 'text', required: false },
    { key: 'sectionId', label: 'Section anchor', description: 'Unique page anchor used by the comparison heading.', type: 'text', required: true, advanced: true },
  ],
})

export const creatorSignalProcessStepsEntry = siteEntry({
  id: 'creator-signal.site.process-steps',
  name: 'Process Steps',
  description: 'A short ordered journey with a marker, heading and outcome for every step.',
  tags: ['process', 'steps', 'how it works', 'ordered list'],
  moduleId: processSteps.id,
  usage: 'Use for a short ordered journey. Keep implementation detail in the application and describe only the public handoff.',
  accessibilityGuidance: 'Preserve ordered-list semantics and write markers that do not carry meaning without the step heading.',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', description: 'Short context label above the process.', type: 'text', required: true },
    { key: 'heading', label: 'Heading', description: 'Heading for the complete ordered journey.', type: 'text', required: true },
    { key: 'introduction', label: 'Introduction', description: 'One concise explanation of the journey.', type: 'text', required: true },
    { key: 'sectionId', label: 'Section anchor', description: 'Unique page anchor used by the process heading.', type: 'text', required: true, advanced: true },
    { key: 'items', label: 'Steps', description: 'Ordered public journey steps.', type: 'repeater', required: true, itemLabel: 'Step', minItems: 2, maxItems: 6, itemFields: [
      { key: 'marker', label: 'Marker', description: 'Short sequence number.', type: 'text', required: true },
      { key: 'heading', label: 'Heading', description: 'Outcome-focused step heading.', type: 'text', required: true },
      { key: 'body', label: 'Description', description: 'What happens at this public step.', type: 'text', required: true },
    ] },
  ],
})

export const creatorSignalPricingPlansEntry = siteEntry({
  id: 'creator-signal.site.pricing-plans',
  name: 'Pricing Plans',
  description: 'Three clear public plan cards with explicit prices, included features and signup handoffs.',
  tags: ['pricing', 'plans', 'subscriptions', 'call to action'],
  moduleId: pricingPlans.id,
  usage: 'Use for the concise Home plan summary. Keep the detailed Pricing route as the semantic comparison authority.',
  accessibilityGuidance: 'Write price cadence in text, include a descriptive feature list, and never communicate the featured plan through colour alone.',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', description: 'Short context label above the plans.', type: 'text', required: true },
    { key: 'heading', label: 'Heading', description: 'Heading for the complete plan group.', type: 'text', required: true },
    { key: 'introduction', label: 'Introduction', description: 'Short explanation of how to choose.', type: 'text', required: true },
    { key: 'footnote', label: 'Footnote', description: 'A qualification shared by every plan.', type: 'text', required: true },
    { key: 'sectionId', label: 'Section anchor', description: 'Unique page anchor used by the pricing heading.', type: 'text', required: true, advanced: true },
    { key: 'items', label: 'Plans', description: 'Ordered public plans; separate feature lines with line breaks.', type: 'repeater', required: true, itemLabel: 'Plan', minItems: 1, maxItems: 3, itemFields: [
      { key: 'name', label: 'Name', description: 'Public plan name.', type: 'text', required: true },
      { key: 'price', label: 'Price', description: 'Visible price including currency where required.', type: 'text', required: true },
      { key: 'cadence', label: 'Cadence', description: 'Billing cadence such as per month; leave blank for Free.', type: 'text', required: false },
      { key: 'description', label: 'Description', description: 'Who the plan is for.', type: 'text', required: true },
      { key: 'features', label: 'Features', description: 'One feature per line.', type: 'text', required: true },
      { key: 'actionLabel', label: 'Action label', description: 'Specific signup action.', type: 'text', required: true },
      { key: 'actionUrl', label: 'Action URL', description: 'Sales Pulse application-owned signup destination.', type: 'url', required: true },
      { key: 'emphasis', label: 'Emphasis', description: 'Use Featured for at most one plan.', type: 'select', required: true, options: [
        { label: 'Default', value: 'default' },
        { label: 'Featured', value: 'featured' },
      ] },
    ] },
  ],
})

export const creatorSignalFounderStoryEntry = siteEntry({
  id: 'creator-signal.site.founder-story',
  name: 'Founder Story',
  description: 'A first-person founder narrative with attribution and optional approved portrait.',
  tags: ['founder', 'story', 'about', 'media'],
  moduleId: founderStory.id,
  usage: 'Use once on the Home page for the approved founder narrative; use Testimonial for a short quotation.',
  accessibilityGuidance: 'Keep a logical section heading and provide portrait alternative text when the image conveys identity.',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', description: 'Short context label above the story.', type: 'text', required: true },
    { key: 'heading', label: 'Heading', description: 'Heading for the founder narrative.', type: 'text', required: true },
    { key: 'body', label: 'Story', description: 'Approved first-person rich text.', type: 'rich-text', required: true },
    { key: 'attribution', label: 'Attribution', description: 'Founder name.', type: 'text', required: true },
    { key: 'role', label: 'Role', description: 'Founder role or business context.', type: 'text', required: true },
    { key: 'portrait', label: 'Portrait', description: 'Optional approved portrait from Instatic Media.', type: 'image', required: false },
    { key: 'portraitAlt', label: 'Portrait alternative text', description: 'Name or describe an informative portrait; leave blank only if decorative.', type: 'text', required: false },
    { key: 'sectionId', label: 'Section anchor', description: 'Unique page anchor used by the founder heading.', type: 'text', required: true, advanced: true },
  ],
})

export const creatorSignalCallToActionEntry = siteEntry({
  id: 'creator-signal.site.call-to-action',
  name: 'Call to Action',
  description: 'A focused next step with one primary action.',
  tags: ['call to action', 'link', 'marketing'],
  moduleId: 'creator-signal.site.call-to-action',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', description: 'Short context label above the call to action.', type: 'text', required: true },
    { key: 'heading', label: 'Heading', description: 'The single next step offered to the visitor.', type: 'text', required: true },
    { key: 'body', label: 'Explanation', description: 'What happens after the visitor takes the action.', type: 'text', required: true },
    { key: 'actionLabel', label: 'Action label', description: 'Specific visible link text.', type: 'text', required: true },
    { key: 'actionUrl', label: 'Action URL', description: 'Internal path or approved external destination.', type: 'url', required: true },
    { key: 'sectionId', label: 'Section anchor', description: 'Unique page anchor used by the section heading.', type: 'text', required: true, advanced: true },
  ],
})

export const creatorSignalRichTextEntry = siteEntry({
  id: 'creator-signal.site.rich-text-section',
  name: 'Rich Text Section',
  description: 'One coherent rich-text value instead of a stack of paragraph components.',
  tags: ['rich text', 'prose', 'editorial'],
  moduleId: 'creator-signal.site.rich-text-section',
  fields: [
    { key: 'heading', label: 'Heading', description: 'Heading for this complete prose section.', type: 'text', required: true },
    { key: 'body', label: 'Content', description: 'Author the coherent formatted text here instead of stacking paragraph components.', type: 'rich-text', required: true },
    { key: 'sectionId', label: 'Section anchor', description: 'Unique page anchor used by the section heading.', type: 'text', required: true, advanced: true },
    { key: 'headingLanguage', label: 'Heading language', description: 'Optional language declaration preserved on the section heading.', type: 'text', required: false, advanced: true },
  ],
})

export const creatorSignalTestimonialEntry = siteEntry({
  id: 'creator-signal.site.testimonial',
  name: 'Testimonial',
  description: 'A semantic quotation and attribution.',
  tags: ['quote', 'testimonial', 'editorial'],
  moduleId: 'creator-signal.site.testimonial',
  fields: [
    { key: 'quote', label: 'Quotation', description: 'Exact approved quotation without decorative quote marks.', type: 'text', required: true },
    { key: 'attribution', label: 'Attribution', description: 'Person or organisation credited for the quotation.', type: 'text', required: true },
    { key: 'role', label: 'Role or business', description: 'Context that makes the attribution meaningful.', type: 'text', required: true },
  ],
})

export const creatorSignalFaqEntry = siteEntry({
  id: 'creator-signal.site.faq',
  name: 'FAQ',
  description: 'Repeatable questions rendered as native disclosures with FAQ structured data.',
  tags: ['faq', 'disclosure', 'structured data'],
  moduleId: 'creator-signal.site.faq',
  fields: [
    { key: 'heading', label: 'Heading', description: 'Heading for the complete question list.', type: 'text', required: true },
    { key: 'sectionId', label: 'Section anchor', description: 'Unique page anchor used by the section heading.', type: 'text', required: true, advanced: true },
    {
      key: 'items', label: 'Questions and answers', description: 'Ordered native disclosures with FAQ structured data.', type: 'repeater', required: true,
      itemLabel: 'Question', minItems: 1, maxItems: 20,
      itemFields: [
        { key: 'question', label: 'Question', description: 'The visitor question in natural language.', type: 'text', required: true },
        { key: 'answer', label: 'Answer', description: 'Direct plain-language answer.', type: 'text', required: true },
      ],
    },
  ],
})

export const creatorSignalComparisonEntry = siteEntry({
  id: 'creator-signal.site.comparison-section',
  name: 'Comparison Section',
  description: 'A captioned comparison table with consistent criteria across three options.',
  tags: ['comparison', 'pricing', 'products', 'table'],
  moduleId: comparisonSection.id,
  accessibilityGuidance: 'Keep the caption specific and write row labels that make sense independently of visual position.',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', description: 'Short context label above the comparison.', type: 'text', required: true },
    { key: 'heading', label: 'Heading', description: 'Outcome-focused heading for the complete comparison.', type: 'text', required: true },
    { key: 'introduction', label: 'Introduction', description: 'Explain what is being compared and why.', type: 'text', required: true },
    { key: 'sectionId', label: 'Section anchor', description: 'Unique page anchor used by the section heading.', type: 'text', required: true, advanced: true },
    { key: 'caption', label: 'Table caption', description: 'Accessible name describing the comparison.', type: 'text', required: true },
    { key: 'firstLabel', label: 'First option', description: 'Column heading for the first option.', type: 'text', required: true },
    { key: 'secondLabel', label: 'Second option', description: 'Column heading for the second option.', type: 'text', required: true },
    { key: 'thirdLabel', label: 'Third option', description: 'Column heading for the third option.', type: 'text', required: true },
    {
      key: 'items', label: 'Comparison rows', description: 'Ordered criteria with one value for each option.', type: 'repeater', required: true,
      itemLabel: 'Criterion', minItems: 1, maxItems: 24,
      itemFields: [
        { key: 'label', label: 'Criterion', description: 'Row heading shared by all three values.', type: 'text', required: true },
        { key: 'firstValue', label: 'First value', description: 'Value for the first option.', type: 'text', required: true },
        { key: 'secondValue', label: 'Second value', description: 'Value for the second option.', type: 'text', required: true },
        { key: 'thirdValue', label: 'Third value', description: 'Value for the third option.', type: 'text', required: true },
      ],
    },
  ],
})

export const creatorSignalRecoveryStateEntry = siteEntry({
  id: 'creator-signal.site.recovery-state',
  name: 'Recovery State',
  description: 'A textual empty, error, offline or not-found state with one clear recovery action.',
  tags: ['empty state', 'error', 'offline', 'not found', 'recovery'],
  moduleId: recoveryState.id,
  constraints: { allowedDocumentKinds: ['page', 'template'] },
  accessibilityGuidance: 'Name the state in text, explain what happened, and offer an action that works without relying on colour.',
  fields: [
    { key: 'state', label: 'State', description: 'Governed empty, error, offline or not-found semantic treatment.', type: 'select', required: true },
    { key: 'heading', label: 'Heading', description: 'Plain-language page heading.', type: 'text', required: true },
    { key: 'body', label: 'Explanation', description: 'Explain the state and any safe next step.', type: 'text', required: true },
    { key: 'actionLabel', label: 'Recovery action', description: 'Specific visible action label.', type: 'text', required: true },
    { key: 'actionUrl', label: 'Recovery URL', description: 'Safe destination for recovery.', type: 'url', required: true },
    { key: 'sectionId', label: 'Heading anchor', description: 'Unique ID used by the page heading.', type: 'text', required: true, advanced: true },
  ],
})

export const creatorSignalPublicDocumentEntry = siteEntry({
  id: 'creator-signal.site.public-document',
  name: 'Public Document',
  description: 'A complete versioned legal, trust, support or status document.',
  tags: ['legal', 'trust', 'support', 'document', 'structured data'],
  moduleId: 'creator-signal.site.public-document',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', description: 'Document family such as Legal, Trust or Support.', type: 'text', required: true },
    { key: 'heading', label: 'Document heading', description: 'Public H1 and structured-data headline.', type: 'text', required: true },
    { key: 'summary', label: 'Summary', description: 'Short description shown below the document heading.', type: 'text', required: true },
    { key: 'body', label: 'Document content', description: 'Complete approved formatted document in one authorable field.', type: 'rich-text', required: true },
    { key: 'dateModified', label: 'Date modified', description: 'ISO date exposed through Article structured data.', type: 'text', required: true },
  ],
})

export const creatorSignalMauticFormEntry = siteEntry({
  id: 'creator-signal.site.mautic-form',
  version: '1.1.0',
  name: 'Managed Form',
  description: 'A governed public form resolved from the generated Mautic registry.',
  tags: ['form', 'contact', 'mautic', 'integration'],
  moduleId: 'creator-signal.site.mautic-form',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', description: 'Short context label above the form heading.', type: 'text', required: true },
    { key: 'heading', label: 'Heading', description: 'Purpose of this complete managed form.', type: 'text', required: true },
    { key: 'introduction', label: 'Introduction', description: 'Instructions and privacy context shown before the fields.', type: 'text', required: true },
    { key: 'successMessage', label: 'Success message', description: 'Confirmation announced after a successful submission.', type: 'text', required: true },
    { key: 'sectionId', label: 'Section anchor', description: 'Unique page anchor used by the form section.', type: 'text', required: true, advanced: true },
    { key: 'mauticBaseUrl', label: 'Mautic public URL', description: 'Approved public form-provider origin.', type: 'url', required: true, advanced: true },
    { key: 'formAlias', label: 'Governed form alias', description: 'Stable alias resolved through the generated registry; never use a numeric form ID.', type: 'text', required: true, advanced: true },
    { key: 'registryPath', label: 'Registry path', description: 'Published path for the generated form registry.', type: 'text', required: true, advanced: true },
    { key: 'formCode', label: 'Analytics form code', description: 'Stable analytics identifier for this form.', type: 'text', required: true, advanced: true },
    { key: 'campaignCode', label: 'Analytics campaign code', description: 'Stable analytics identifier for this journey.', type: 'text', required: true, advanced: true },
  ],
})

export const creatorSignalCrmIframeFormEntry = siteEntry({
  id: 'creator-signal.site.crm-iframe-form',
  version: '1.0.0',
  name: 'Embedded CRM Form',
  description: 'An authorable Mautic iframe form with a validated seamless-resize protocol.',
  tags: ['form', 'crm', 'mautic', 'iframe', 'embed'],
  moduleId: 'creator-signal.site.crm-iframe-form',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', description: 'Short context label above the form heading.', type: 'text', required: true },
    { key: 'heading', label: 'Heading', description: 'Purpose of this embedded CRM form.', type: 'text', required: true },
    { key: 'introduction', label: 'Introduction', description: 'Instructions and privacy context shown before the embedded form.', type: 'text', required: true },
    { key: 'sectionId', label: 'Section anchor', description: 'Unique identifier used to match resize messages from this CRM form.', type: 'text', required: true, advanced: true },
    { key: 'formUrl', label: 'CRM form URL', description: 'HTTPS Mautic form page hosted at the approved public CRM origin.', type: 'url', required: true },
    { key: 'iframeTitle', label: 'Accessible iframe title', description: 'Concise name announced before visitors enter the embedded form.', type: 'text', required: true },
    { key: 'fallbackLabel', label: 'Fallback link label', description: 'Visible link that opens the CRM form outside the iframe.', type: 'text', required: true },
    { key: 'loadingMessage', label: 'Loading message', description: 'Status announced while the iframe form loads.', type: 'text', required: true },
    { key: 'unavailableMessage', label: 'Unavailable message', description: 'Status announced when the provider cannot be framed.', type: 'text', required: true },
    { key: 'initialHeight', label: 'Initial height', description: 'Starting iframe height before same-origin or CRM resize updates arrive.', type: 'number', required: true, advanced: true },
    { key: 'minimumHeight', label: 'Minimum height', description: 'Smallest accepted iframe height.', type: 'number', required: true, advanced: true },
    { key: 'maximumHeight', label: 'Maximum height', description: 'Largest accepted iframe height.', type: 'number', required: true, advanced: true },
  ],
  usage: 'Paste an approved Mautic form page URL. Same-origin forms resize automatically; cross-origin forms must send the documented resize message.',
  accessibilityGuidance: 'Provide a concise iframe title and fallback link. Verify keyboard flow in the hosted form before publishing.',
})

export const creatorSignalComponentEntries: readonly ComponentLibraryEntry[] = [
  creatorSignalHeroEntry,
  creatorSignalHeaderEntry,
  creatorSignalFooterEntry,
  creatorSignalConsentEntry,
  creatorSignalCampaignHeroEntry,
  creatorSignalSignalStripEntry,
  creatorSignalSignalComparisonEntry,
  creatorSignalFeatureGridEntry,
  creatorSignalProcessStepsEntry,
  creatorSignalPricingPlansEntry,
  creatorSignalFounderStoryEntry,
  creatorSignalCallToActionEntry,
  creatorSignalRichTextEntry,
  creatorSignalTestimonialEntry,
  creatorSignalFaqEntry,
  creatorSignalComparisonEntry,
  creatorSignalRecoveryStateEntry,
  creatorSignalPublicDocumentEntry,
  creatorSignalMauticFormEntry,
  creatorSignalCrmIframeFormEntry,
]

const componentEntryById = new Map(
  creatorSignalComponentEntries.map((entry) => [entry.id, entry]),
)

function componentEntry(id: string): ComponentLibraryEntry {
  const entry = componentEntryById.get(id)
  if (!entry) throw new Error(`[creator-signal] Missing pattern component entry "${id}".`)
  return entry
}

function componentNode(
  key: string,
  entryId: string,
  moduleId: string,
  props: Record<string, unknown>,
): ComponentLibraryPatternNode {
  const entry = componentEntry(entryId)
  return {
    key,
    moduleId,
    props,
    children: [],
    catalogueInstance: {
      entryId: entry.id,
      entryVersion: entry.version,
      variantId: 'default',
    },
  }
}

const heroDefaults = Object.fromEntries(
  heroComponent.params.map((parameter) => [parameter.id, parameter.defaultValue]),
)

const patternBlocks = {
  hero: () => componentNode(
    'hero',
    creatorSignalHeroEntry.id,
    VisualComponentRefModule.id,
    { componentId: heroComponent.id, propOverrides: heroDefaults },
  ),
  features: () => componentNode(
    'features',
    creatorSignalFeatureGridEntry.id,
    featureGrid.id,
    { ...featureGrid.defaults },
  ),
  campaignHero: () => componentNode(
    'campaign-hero',
    creatorSignalCampaignHeroEntry.id,
    campaignHero.id,
    { ...campaignHero.defaults },
  ),
  signalStrip: () => componentNode(
    'signal-strip',
    creatorSignalSignalStripEntry.id,
    signalStrip.id,
    { ...signalStrip.defaults },
  ),
  signalComparison: () => componentNode(
    'signal-comparison',
    creatorSignalSignalComparisonEntry.id,
    signalComparison.id,
    { ...signalComparison.defaults },
  ),
  process: () => componentNode(
    'process',
    creatorSignalProcessStepsEntry.id,
    processSteps.id,
    { ...processSteps.defaults },
  ),
  pricingPlans: () => componentNode(
    'pricing-plans',
    creatorSignalPricingPlansEntry.id,
    pricingPlans.id,
    { ...pricingPlans.defaults },
  ),
  founder: () => componentNode(
    'founder',
    creatorSignalFounderStoryEntry.id,
    founderStory.id,
    { ...founderStory.defaults },
  ),
  content: () => componentNode(
    'content',
    creatorSignalRichTextEntry.id,
    richTextSection.id,
    { ...richTextSection.defaults },
  ),
  comparison: () => componentNode(
    'comparison',
    creatorSignalComparisonEntry.id,
    comparisonSection.id,
    { ...comparisonSection.defaults },
  ),
  faq: () => componentNode(
    'faq',
    creatorSignalFaqEntry.id,
    faq.id,
    { ...faq.defaults },
  ),
  testimonial: () => componentNode(
    'testimonial',
    creatorSignalTestimonialEntry.id,
    testimonial.id,
    { ...testimonial.defaults },
  ),
  action: () => componentNode(
    'action',
    creatorSignalCallToActionEntry.id,
    callToAction.id,
    { ...callToAction.defaults },
  ),
  form: () => componentNode(
    'form',
    creatorSignalMauticFormEntry.id,
    mauticForm.id,
    { ...mauticForm.defaults },
  ),
  document: () => componentNode(
    'document',
    creatorSignalPublicDocumentEntry.id,
    publicDocument.id,
    { ...publicDocument.defaults },
  ),
} satisfies Record<string, () => ComponentLibraryPatternNode>

const patternBlockByEntryId: Readonly<Record<
  string,
  () => ComponentLibraryPatternNode
>> = {
  [creatorSignalHeroEntry.id]: patternBlocks.hero,
  [creatorSignalCampaignHeroEntry.id]: patternBlocks.campaignHero,
  [creatorSignalSignalStripEntry.id]: patternBlocks.signalStrip,
  [creatorSignalSignalComparisonEntry.id]: patternBlocks.signalComparison,
  [creatorSignalFeatureGridEntry.id]: patternBlocks.features,
  [creatorSignalProcessStepsEntry.id]: patternBlocks.process,
  [creatorSignalPricingPlansEntry.id]: patternBlocks.pricingPlans,
  [creatorSignalFounderStoryEntry.id]: patternBlocks.founder,
  [creatorSignalRichTextEntry.id]: patternBlocks.content,
  [creatorSignalComparisonEntry.id]: patternBlocks.comparison,
  [creatorSignalFaqEntry.id]: patternBlocks.faq,
  [creatorSignalTestimonialEntry.id]: patternBlocks.testimonial,
  [creatorSignalCallToActionEntry.id]: patternBlocks.action,
  [creatorSignalMauticFormEntry.id]: patternBlocks.form,
  [creatorSignalPublicDocumentEntry.id]: patternBlocks.document,
}

function pagePattern(
  id: string,
  childEntryIds: readonly string[],
): ComponentLibraryPatternDefinition {
  const keyOccurrences = new Map<string, number>()
  const children = childEntryIds.map((entryId) => {
    const createBlock = patternBlockByEntryId[entryId]
    if (!createBlock) {
      throw new Error(
        `[creator-signal] Pattern "${id}" references unsupported component "${entryId}".`,
      )
    }
    const block = createBlock()
    const occurrence = (keyOccurrences.get(block.key) ?? 0) + 1
    keyOccurrences.set(block.key, occurrence)
    return occurrence === 1
      ? block
      : { ...block, key: `${block.key}-${occurrence}` }
  })
  return {
    id,
    rootKey: 'root',
    nodes: [
      {
        key: 'root',
        moduleId: creatorSignalPublicPatternRootModuleId,
        props: creatorSignalPublicPatternRootProps(id),
        children: children.map((child) => child.key),
      },
      ...children,
    ],
    authorableNodeKeys: children.map((child) => child.key),
  }
}

function recoveryPattern(
  id: string,
  state: 'empty' | 'error' | 'offline' | 'not-found',
  childEntryIds: readonly string[],
): ComponentLibraryPatternDefinition {
  const defaults = state === 'not-found'
    ? {
        heading: 'We cannot find that page',
        body: 'The address may have changed or the page may no longer exist.',
        actionLabel: 'Return home',
        actionUrl: '/',
      }
    : state === 'error'
    ? {
        heading: 'We could not complete that request',
        body: 'Try again, or return to a safe page if the problem continues.',
        actionLabel: 'Return home',
        actionUrl: '/',
      }
    : state === 'offline'
      ? {
          heading: 'You appear to be offline',
          body: 'Check your connection, then retry when the service is reachable.',
          actionLabel: 'Check service status',
          actionUrl: 'https://status.creatorsignal.me',
        }
      : {
          heading: 'Nothing here yet',
          body: 'There is no content to show here yet. Return to the main site to keep exploring.',
          actionLabel: 'Return home',
          actionUrl: '/',
        }
  if (
    childEntryIds.length !== 1 ||
    childEntryIds[0] !== creatorSignalRecoveryStateEntry.id
  ) {
    throw new Error(
      `[creator-signal] Recovery pattern "${id}" must contain one Recovery State component.`,
    )
  }
  const definition = pagePattern(id, [])
  const stateNode = componentNode(
    'state',
    creatorSignalRecoveryStateEntry.id,
    recoveryState.id,
    { ...recoveryState.defaults, ...defaults, state, sectionId: `${state}-state` },
  )
  return {
    ...definition,
    nodes: [
      { ...definition.nodes[0]!, children: [stateNode.key] },
      stateNode,
    ],
    authorableNodeKeys: [stateNode.key],
  }
}

const recoveryPatternStates: Readonly<Record<
  string,
  'empty' | 'error' | 'offline' | 'not-found'
>> = {
  'creator-signal.site.pattern.empty-state': 'empty',
  'creator-signal.site.pattern.error-state': 'error',
  'creator-signal.site.pattern.offline-state': 'offline',
  'creator-signal.site.pattern.not-found-state': 'not-found',
}

export const creatorSignalPatternDefinitions: readonly ComponentLibraryPatternDefinition[] = [
  ...creatorSignalPublicPatternCatalogue
    .filter((entry) => entry.ownership === 'pattern')
    .map((entry) => {
      const state = recoveryPatternStates[entry.patternId]
      return state
        ? recoveryPattern(entry.patternId, state, entry.childEntryIds)
        : pagePattern(entry.patternId, entry.childEntryIds)
    }),
]

for (const definition of creatorSignalPatternDefinitions) {
  componentLibraryPatternRegistry.registerOrReplace(definition)
}

function patternEntry(input: {
  id: string
  name: string
  description: string
  tags: string[]
  usage: string
  accessibility: string
  version?: string
  allowedDocumentKinds?: Array<'page' | 'template'>
}): ComponentLibraryEntry {
  const definition = creatorSignalPatternDefinitions.find(
    (candidate) => candidate.id === input.id,
  )
  if (!definition) throw new Error(`[creator-signal] Missing pattern definition "${input.id}".`)
  return {
    id: input.id,
    version: input.version ?? '1.0.0',
    name: input.name,
    description: input.description,
    category: 'Creator Signal patterns',
    tags: input.tags,
    icon: 'layout-solid',
    source: {
      type: 'plugin',
      pluginId: 'creator-signal.site',
      name: 'Creator Signal',
    },
    status: 'stable',
    composition: 'container',
    implementation: { type: 'pattern', patternId: definition.id },
    fields: [],
    variants: defaultVariant,
    presets: [],
    slots: [],
    constraints: {
      allowedDocumentKinds: input.allowedDocumentKinds ?? ['page', 'template'],
    },
    requirements: pluginRequirement,
    documentation: {
      usage: input.usage,
      accessibility: input.accessibility,
    },
    accessibility: creatorSignalAccessibilityContract(input.id),
  }
}

export const creatorSignalPatternEntries: readonly ComponentLibraryEntry[] = [
  patternEntry({ id: 'creator-signal.site.pattern.home-v2-page', version: '2.0.0', name: 'Home Page', description: 'The governed Creator Signal reference flow from the campaign promise through proof, product detail, pricing, founder context and one final next step.', tags: ['home', 'landing page', 'sales pulse'], usage: 'Use as the reference-design starting composition for the Creator Signal Home route, then freely edit its child components.', accessibility: 'Keep heading order and action labels clear as the composition changes, and keep signup actions pointed at the Sales Pulse application.' }),
  patternEntry({ id: 'creator-signal.site.pattern.early-access-page', name: 'Early Access Page', description: 'A launch-preview composition with one governed wishlist form and supporting product context.', tags: ['early access', 'wishlist', 'launch', 'form'], usage: 'Use as a starting composition for an Early Access route; add, remove or configure components as needed.', accessibility: 'Preserve labelled forms, explicit permission copy and readable provider states.' }),
  patternEntry({ id: 'creator-signal.site.pattern.content-page', name: 'Content Page', description: 'Hero, long-form content and one next action.', tags: ['content page', 'editorial', 'cta'], usage: 'Use as a starting composition for an explanatory page, then adjust its sections freely.', accessibility: 'Keep headings logical inside the rich-text section.' }),
  patternEntry({ id: 'creator-signal.site.pattern.product-page', name: 'Product Page', description: 'Hero, governed feature grid and one product action.', tags: ['product', 'features', 'cta'], usage: 'Use as a starting composition for a product overview, then adjust its components freely.', accessibility: 'Keep card content scannable and action labels specific.' }),
  patternEntry({ id: 'creator-signal.site.pattern.pricing-page', version: '1.1.0', name: 'Pricing Page', description: 'Hero, a concise plan-card repeater and one next action.', tags: ['pricing', 'plans', 'cards'], usage: 'Use as a starting composition for the public plan overview and edit plan data or sections as needed.', accessibility: 'Keep plan names, prices and access boundaries understandable without relying on colour.' }),
  patternEntry({ id: 'creator-signal.site.pattern.features-page', name: 'Features Page', description: 'Hero and governed feature collection.', tags: ['features', 'capabilities', 'landing page'], usage: 'Use as a starting composition for a focused capability overview, then adjust it freely.', accessibility: 'Keep feature headings short and outcome focused.' }),
  patternEntry({ id: 'creator-signal.site.pattern.contact-page', name: 'Contact Page', description: 'Hero and capability-backed managed Mautic form.', tags: ['contact', 'form', 'mautic'], usage: 'Use as a starting composition for contact and intake routes; choose a governed form alias rather than custom HTML.', accessibility: 'Preserve managed-form labels, status announcements and privacy context.' }),
  patternEntry({ id: 'creator-signal.site.pattern.legal-trust-page', name: 'Legal or Trust Page', description: 'One versioned semantic public document.', tags: ['legal', 'trust', 'document'], usage: 'Use as a starting composition for legal, trust, support and status documents, then adjust its sections freely.', accessibility: 'Use coherent rich text, meaningful headings and readable link labels.' }),
  patternEntry({ id: 'creator-signal.site.pattern.article-content-page', name: 'Article or Content Page', description: 'Hero and one coherent long-form content section.', tags: ['article', 'content', 'long form'], usage: 'Use as a starting composition for editorial content, then adjust its components freely.', accessibility: 'Keep heading hierarchy logical inside the authored body.' }),
  patternEntry({ id: 'creator-signal.site.pattern.comparison-section', name: 'Comparison Section', description: 'A semantic three-option comparison section.', tags: ['comparison', 'table', 'section'], usage: 'Use inside a page for genuine row-and-column comparisons.', accessibility: 'Retain the visible caption and complete row and column headings.' }),
  patternEntry({ id: 'creator-signal.site.pattern.empty-state', name: 'Empty State Page', description: 'Explains an empty result and offers a recovery route.', tags: ['empty', 'recovery', 'status'], usage: 'Use when a valid view has no content yet.', accessibility: 'Name the empty state in text and provide a useful action.' }),
  patternEntry({ id: 'creator-signal.site.pattern.error-state', name: 'Error State Page', description: 'Explains a recoverable failure and offers a safe route.', tags: ['error', 'recovery', 'status'], usage: 'Use for a failed request that the visitor can safely recover from.', accessibility: 'Describe the failure without relying on colour and keep the recovery action specific.' }),
  patternEntry({ id: 'creator-signal.site.pattern.offline-state', name: 'Offline State Page', description: 'Explains loss of connectivity and links to service status.', tags: ['offline', 'recovery', 'status'], usage: 'Use when the requested experience cannot continue without connectivity.', accessibility: 'State the connectivity problem in text and link to a reachable status or retry route.' }),
  patternEntry({ id: 'creator-signal.site.pattern.not-found-state', name: 'Not Found Page', description: 'Explains that a public route does not exist and offers a safe route home.', tags: ['404', 'not found', 'recovery'], usage: 'Use as a starting composition wherever a not-found recovery state is appropriate.', accessibility: 'State that the page was not found in text and provide a useful recovery action.' }),
]

export const creatorSignalComponentLibraryEntries: readonly ComponentLibraryEntry[] = [
  ...creatorSignalComponentEntries,
  ...creatorSignalPatternEntries,
]

for (const entry of creatorSignalComponentLibraryEntries) {
  const implementation = entry.implementation.type === 'capability-backed'
    ? entry.implementation.backing
    : entry.implementation
  const permitted = implementation.type === 'pattern'
    ? isCreatorSignalPatternPermitted(entry.id)
    : isCreatorSignalComponentPermitted(entry.id)
  if (!permitted) {
    throw new Error(
      `[creator-signal] Component Library entry "${entry.id}" is not permitted by the public authoring contract.`,
    )
  }
}
