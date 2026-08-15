import { defineComponent, h } from '@core/plugin-sdk'

const componentId = 'creator-signal.site/component/hero'
const siteClass = (name: string) => `creator-signal.site/site/${name}`

export const heroParamIds = {
  eyebrow: 'creator-signal.site.hero.eyebrow',
  heading: 'creator-signal.site.hero.heading',
  body: 'creator-signal.site.hero.body',
  actionLabel: 'creator-signal.site.hero.action-label',
  actionUrl: 'creator-signal.site.hero.action-url',
  artwork: 'creator-signal.site.hero.artwork',
} as const

const heroComponent = defineComponent(
  componentId,
  'Creator Signal Hero',
  () => h.custom('base.body', {}, {
    children: [
      h.container({ tag: 'section', classIds: [siteClass('hero-section')] }, [
        h.container({ classIds: [siteClass('hero-copy')] }, [
          h.text({
            tag: 'p',
            text: 'Creator Signal',
            classIds: [siteClass('eyebrow')],
          }),
          h.text({
            tag: 'h1',
            text: 'A clear headline for creative businesses.',
          }),
          h.text({
            tag: 'p',
            text: 'Add a useful, plain-language introduction that helps the visitor understand the next step.',
            classIds: [siteClass('hero-body')],
          }),
          h.container({ classIds: [siteClass('actions')] }, [
            h.button({
              label: 'Take the next step',
              href: '#',
              classIds: [
                siteClass('button'),
                siteClass('button-primary'),
              ],
            }),
          ]),
        ]),
        h.container({ classIds: [siteClass('hero-art')] }, [
          h.custom('base.image', {
            src: '',
            loading: 'eager',
            fetchPriority: 'high',
            decoding: 'async',
          }),
        ]),
      ]),
    ],
  }),
)

heroComponent.params = [
  {
    id: heroParamIds.eyebrow,
    name: 'Eyebrow',
    type: 'string',
    description: 'Short context label above the headline.',
    defaultValue: 'Creator Signal',
    required: true,
  },
  {
    id: heroParamIds.heading,
    name: 'Heading',
    type: 'string',
    description: 'Primary page promise.',
    defaultValue: 'A clear headline for creative businesses.',
    required: true,
  },
  {
    id: heroParamIds.body,
    name: 'Introduction',
    type: 'string',
    description: 'Plain-language supporting copy.',
    defaultValue: 'Add a useful, plain-language introduction that helps the visitor understand the next step.',
    required: true,
  },
  {
    id: heroParamIds.actionLabel,
    name: 'Action label',
    type: 'string',
    description: 'Label for the primary action.',
    defaultValue: 'Take the next step',
    required: true,
  },
  {
    id: heroParamIds.actionUrl,
    name: 'Action URL',
    type: 'url',
    description: 'Destination for the primary action.',
    defaultValue: '#',
    required: true,
  },
  {
    id: heroParamIds.artwork,
    name: 'Artwork',
    type: 'image',
    description: 'Optional MinIO-backed media image. The governed Creator Signal mark remains as the fallback.',
    defaultValue: '',
    required: false,
  },
]

function bindProp(
  propName: string,
  paramId: string,
  predicate: (props: Record<string, unknown>) => boolean,
): void {
  const node = Object.values(heroComponent.tree.nodes).find((candidate) =>
    predicate(candidate.props))
  if (!node) {
    throw new Error(`[creator-signal] Hero component is missing the node for parameter "${paramId}".`)
  }
  node.propBindings = {
    ...node.propBindings,
    [propName]: { paramId },
  }
}

bindProp('text', heroParamIds.eyebrow, (props) => props.text === 'Creator Signal')
bindProp('text', heroParamIds.heading, (props) =>
  props.text === 'A clear headline for creative businesses.')
bindProp('text', heroParamIds.body, (props) =>
  props.text === 'Add a useful, plain-language introduction that helps the visitor understand the next step.')
bindProp('label', heroParamIds.actionLabel, (props) => props.label === 'Take the next step')
bindProp('href', heroParamIds.actionUrl, (props) => props.label === 'Take the next step')
bindProp('src', heroParamIds.artwork, (props) =>
  props.src === '' && props.fetchPriority === 'high')

export { heroComponent }
