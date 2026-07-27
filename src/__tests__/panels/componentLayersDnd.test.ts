import { describe, expect, it } from 'bun:test'
import { registry } from '@core/module-engine'
import { makeNode, makePage } from '../fixtures'
import { resolveComponentLayerDrop } from '@site/panels/LayersPanel/componentLayersDnd'
import '@modules/base/index'

function governedText(id: string) {
  return makeNode({
    id,
    moduleId: 'base.text',
    props: {
      ...registry.get('base.text')!.defaults,
      text: 'Add your text here.',
      tag: 'p',
    },
    catalogueInstance: {
      entryId: 'base.plain-text',
      entryVersion: '1.0.0',
      presetId: 'paragraph',
    },
  })
}

function governedEmail(id = 'email') {
  return makeNode({
    id,
    moduleId: 'base.input',
    props: {
      ...registry.get('base.input')!.defaults,
      inputType: 'email',
    },
    catalogueInstance: {
      entryId: 'base.email-input',
      entryVersion: '1.0.0',
      presetId: 'email',
    },
  })
}

describe('Components Layers drag and drop', () => {
  it('moves a complete governed boundary using ordinary page-tree targets', () => {
    const page = makePage({
      nodes: {
        root: makeNode({
          id: 'root',
          moduleId: 'base.body',
          children: ['first', 'second'],
        }),
        first: governedText('first'),
        second: governedText('second'),
      },
    })

    expect(resolveComponentLayerDrop({
      page,
      draggedId: 'second',
      overId: 'first',
      position: 'before',
    })).toMatchObject({
      allowed: true,
      target: { parentId: 'root', index: 0 },
    })
  })

  it('rejects freeform boundaries and invalid catalogue parents with reasons', () => {
    const page = makePage({
      nodes: {
        root: makeNode({
          id: 'root',
          moduleId: 'base.body',
          children: ['freeform', 'email'],
        }),
        freeform: makeNode({
          id: 'freeform',
          moduleId: 'base.container',
        }),
        email: governedEmail(),
      },
    })

    expect(resolveComponentLayerDrop({
      page,
      draggedId: 'freeform',
      overId: 'email',
      position: 'before',
    })).toMatchObject({ allowed: false })
    expect(resolveComponentLayerDrop({
      page,
      draggedId: 'email',
      overId: 'freeform',
      position: 'inside',
    })).toMatchObject({
      allowed: false,
      reason: expect.stringContaining('base.form-container'),
    })
  })

  it('allows a constrained field inside its governed form parent', () => {
    const page = makePage({
      nodes: {
        root: makeNode({
          id: 'root',
          moduleId: 'base.body',
          children: ['email', 'form'],
        }),
        email: governedEmail(),
        form: makeNode({
          id: 'form',
          moduleId: 'base.form',
          props: { ...registry.get('base.form')!.defaults },
          catalogueInstance: {
            entryId: 'base.form-container',
            entryVersion: '1.0.0',
          },
        }),
      },
    })

    expect(resolveComponentLayerDrop({
      page,
      draggedId: 'email',
      overId: 'form',
      position: 'inside',
    })).toMatchObject({
      allowed: true,
      target: { parentId: 'form', index: 0 },
    })
  })
})
