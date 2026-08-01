import { definePlugin, permissions } from '@core/plugin-sdk'
import { pack } from './pack/site'

export default definePlugin({
  id: 'instatic.component-showcase',
  name: 'Plain Text Component Showcase',
  version: '0.1.0',
  description:
    'An end-to-end reference site for governed Plain Text authoring, semantics, composition and publishing.',
  author: { name: 'Instatic' },
  license: 'MIT',
  // The pack installer uses this permission for every site pack (pages,
  // classes, layouts and Visual Components), even though this focused starter
  // does not ship a new Visual Component definition.
  permissions: [permissions.visualComponentsRegister],
  pack,
})
