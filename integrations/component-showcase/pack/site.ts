import { definePack } from '@core/plugin-sdk'
import {
  SHOWCASE_PLUGIN_ID,
  TextShowcasePageBuilder,
} from './textPageBuilder'

function addPageIntro(
  builder: TextShowcasePageBuilder,
  eyebrow: string,
  title: string,
  summary: string,
): string {
  const intro = builder.addSection(['intro'], 'header')
  builder.addText(intro, eyebrow, {
    tag: 'small',
    classNames: ['eyebrow'],
  })
  builder.addText(intro, title, {
    tag: 'h1',
    classNames: ['display'],
  })
  builder.addText(intro, summary, {
    classNames: ['lede'],
  })
  return intro
}

function overviewPage() {
  const builder = new TextShowcasePageBuilder(
    'overview',
    'index',
    'Plain Text Component Showcase',
  )
  addPageIntro(
    builder,
    'Governed component reference',
    'One Plain Text component, exercised end to end.',
    'Every visible sentence is a base.plain-text catalogue instance backed by base.text. Select a sentence in Components view to edit its Text and Semantic element properties.',
  )
  const content = builder.addSection(['content'], 'main')
  builder.addText(content, 'What this proves', {
    tag: 'h2',
    classNames: ['section-title'],
  })
  builder.addText(
    content,
    'The Add to canvas modal inserts Plain Text from Components → Typography with retained catalogue identity.',
  )
  builder.addText(
    content,
    'Component Properties edits approved fields without exposing unrelated implementation controls.',
  )
  builder.addText(
    content,
    'Canvas preview and published HTML use the same semantic element, escaped content and hard-line-break behavior.',
  )
  builder.addText(
    content,
    'Samples: /samples/properties · /samples/semantics · /samples/composition · /samples/content-safety · /samples/accessibility',
    { tag: 'small', classNames: ['route-list'] },
  )
  return builder.finish()
}

function propertiesPage() {
  const builder = new TextShowcasePageBuilder(
    'properties',
    'samples/properties',
    'Plain Text Properties',
  )
  addPageIntro(
    builder,
    'Properties sample',
    'The two governed fields',
    'Select either example in Components view. The inspector exposes Text and Semantic element, plus usage and accessibility guidance from the catalogue definition.',
  )
  const content = builder.addSection(['content'], 'main')
  builder.addText(content, 'Edit this sentence in the Text field.', {
    classNames: ['editable-example'],
    htmlAttributes: { 'data-showcase-field': 'text' },
  })
  builder.addText(
    content,
    'Change this Semantic element between paragraph, small, strong or emphasis and inspect the DOM badge.',
    {
      tag: 'strong',
      classNames: ['editable-example'],
      htmlAttributes: { 'data-showcase-field': 'tag' },
    },
  )
  builder.addText(
    content,
    'Advanced safe HTML attributes remain available to structural authors in HTML view; they are deliberately outside the component-only contract.',
    { tag: 'small', classNames: ['note'] },
  )
  return builder.finish()
}

function semanticsPage() {
  const builder = new TextShowcasePageBuilder(
    'semantics',
    'samples/semantics',
    'Plain Text Semantics',
  )
  addPageIntro(
    builder,
    'Semantic element sample',
    'Meaning first, styling second.',
    'The same Plain Text implementation can emit several safe semantic text elements. Typography classes change presentation independently of the selected element.',
  )
  const content = builder.addSection(['content'], 'main')
  const examples: Array<[string, string, string]> = [
    ['p', 'Paragraph', 'Use for ordinary body copy.'],
    ['small', 'Small', 'Use for side comments, caveats or compact metadata.'],
    ['strong', 'Strong', 'Use when the text carries strong importance.'],
    ['em', 'Emphasis', 'Use when stress emphasis changes the meaning.'],
    ['span', 'Span', 'Use for an inline fragment when a wrapper is required.'],
    ['div', 'Div', 'Use only when no more meaningful text element applies.'],
    ['figcaption', 'Figure caption', 'Use as the caption inside a figure composition.'],
  ]
  for (const [tag, label, copy] of examples) {
    const row = builder.addContainer(content, ['semantic-row'])
    builder.addText(row, label, { tag: 'small', classNames: ['tag-label'] })
    builder.addText(row, copy, { tag, classNames: ['semantic-example'] })
  }
  builder.addText(
    content,
    'The None option emits bare escaped text with no selectable canvas element. Select it from Layers when you need to edit it again.',
    { tag: 'none', classNames: ['semantic-example'] },
  )
  return builder.finish()
}

function compositionPage() {
  const builder = new TextShowcasePageBuilder(
    'composition',
    'samples/composition',
    'Plain Text Composition',
  )
  addPageIntro(
    builder,
    'Composition sample',
    'The component stays simple inside richer layouts.',
    'These cards use Layout catalogue entries for structure while each label, value and description remains an independently selectable Plain Text component.',
  )
  const content = builder.addSection(['card-grid'], 'main')
  const cards = [
    ['01', 'Short body copy', 'One thought per paragraph keeps the editing contract predictable.'],
    ['02', 'Display text', 'Classes provide scale and colour without changing the stored semantic element.'],
    ['03', 'Reusable metadata', 'Small labels and values remain ordinary catalogue instances with the same fields.'],
  ]
  for (const [number, title, copy] of cards) {
    const card = builder.addContainer(content, ['card'], 'article')
    builder.addText(card, number, { tag: 'small', classNames: ['card-number'] })
    builder.addText(card, title, { tag: 'h2', classNames: ['card-title'] })
    builder.addText(card, copy)
  }
  return builder.finish()
}

function contentSafetyPage() {
  const builder = new TextShowcasePageBuilder(
    'content-safety',
    'samples/content-safety',
    'Plain Text Content Safety',
  )
  addPageIntro(
    builder,
    'Publisher fidelity sample',
    'Literal text stays literal.',
    'Plain Text does not accept authored markup. Special characters are escaped, while author-entered newlines become hard line breaks in both the canvas and published output.',
  )
  const content = builder.addSection(['content'], 'main')
  builder.addText(
    content,
    'First authored line\nSecond authored line\nThird authored line',
    { classNames: ['multiline'] },
  )
  builder.addText(
    content,
    '<strong>This is displayed as text</strong>, not executable or formatted markup.',
    { classNames: ['code-like'] },
  )
  builder.addText(
    content,
    'Ampersands, angle brackets and quotes remain safe: A & B < C > D “quoted”.',
  )
  return builder.finish()
}

function accessibilityPage() {
  const builder = new TextShowcasePageBuilder(
    'accessibility',
    'samples/accessibility',
    'Plain Text Accessibility',
  )
  addPageIntro(
    builder,
    'Accessibility sample',
    'Choose semantics that match the content.',
    'The catalogue guidance is shown with the component properties. Heading order, language, contrast and layout remain page-level responsibilities.',
  )
  const content = builder.addSection(['content'], 'main')
  builder.addText(content, 'A useful reading order', {
    tag: 'h2',
    classNames: ['section-title'],
  })
  builder.addText(
    content,
    'Keep related text together in source order, use concise paragraphs and avoid using an element only for its default visual appearance.',
  )
  builder.addText(content, 'Plain language', {
    tag: 'h2',
    classNames: ['section-title'],
  })
  builder.addText(
    content,
    'Write labels and instructions that identify the subject and the next action without relying on position, colour or surrounding decoration.',
  )
  builder.addText(
    content,
    'This secondary note remains readable and meets the same content contract.',
    { tag: 'small', classNames: ['note'] },
  )
  return builder.finish()
}

export const textShowcasePages = [
  overviewPage(),
  propertiesPage(),
  semanticsPage(),
  compositionPage(),
  contentSafetyPage(),
  accessibilityPage(),
]

export const pack = definePack({
  pluginId: SHOWCASE_PLUGIN_ID,
  pages: textShowcasePages,
  classes: {
    page: {
      styles: {
        margin: '0',
        backgroundColor: '#101217',
        color: '#f3f5f8',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        lineHeight: '1.65',
      },
    },
    intro: {
      styles: {
        padding: 'clamp(2rem, 7vw, 6rem)',
        backgroundColor: '#1a1d24',
        borderBottom: '1px solid #353a46',
      },
    },
    eyebrow: {
      styles: {
        color: '#8ef0ce',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      },
    },
    display: {
      styles: {
        maxWidth: '18ch',
        margin: '0.35rem 0 1rem',
        fontSize: 'clamp(2.5rem, 8vw, 6rem)',
        lineHeight: '0.98',
      },
    },
    lede: {
      styles: {
        maxWidth: '70ch',
        color: '#b9c0cd',
        fontSize: '1.1rem',
      },
    },
    content: {
      styles: {
        display: 'grid',
        gap: '1rem',
        maxWidth: '72rem',
        margin: '0 auto',
        padding: 'clamp(2rem, 6vw, 5rem)',
      },
    },
    'section-title': {
      styles: {
        margin: '2rem 0 0',
        color: '#b8a7ff',
        fontSize: '1.5rem',
      },
    },
    'route-list': {
      styles: {
        marginTop: '2rem',
        color: '#8ccfff',
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
      },
    },
    'editable-example': {
      styles: {
        padding: '1.25rem',
        border: '1px dashed #8ef0ce',
        borderRadius: '0.75rem',
        backgroundColor: '#17201f',
      },
    },
    note: {
      styles: {
        color: '#aeb5c2',
      },
    },
    'semantic-row': {
      styles: {
        display: 'grid',
        gridTemplateColumns: '10rem 1fr',
        gap: '1rem',
        padding: '1rem 0',
        borderBottom: '1px solid #353a46',
      },
    },
    'tag-label': {
      styles: {
        color: '#8ef0ce',
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
      },
    },
    'semantic-example': {
      styles: {
        margin: '0',
      },
    },
    'card-grid': {
      styles: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
        gap: '1.25rem',
        padding: 'clamp(2rem, 6vw, 5rem)',
      },
    },
    card: {
      styles: {
        padding: '1.5rem',
        border: '1px solid #353a46',
        borderRadius: '1rem',
        backgroundColor: '#1a1d24',
      },
    },
    'card-number': {
      styles: {
        color: '#ffbf8e',
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
      },
    },
    'card-title': {
      styles: {
        color: '#b8a7ff',
      },
    },
    multiline: {
      styles: {
        padding: '1.25rem',
        borderLeft: '4px solid #8ccfff',
        backgroundColor: '#171c24',
      },
    },
    'code-like': {
      styles: {
        padding: '1.25rem',
        borderRadius: '0.75rem',
        backgroundColor: '#08090c',
        color: '#ffbf8e',
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
      },
    },
  },
})
