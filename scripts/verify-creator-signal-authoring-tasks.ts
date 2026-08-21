import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  creatorSignalAuthoringTaskMatrix,
  renderCreatorSignalAuthoringTaskMatrix,
  validateCreatorSignalAuthoringTaskMatrix,
} from '../integrations/creator-signal/authoring-tasks'

const issues = validateCreatorSignalAuthoringTaskMatrix()
if (issues.length > 0) {
  throw new Error(`Creator Signal authoring task matrix is invalid:\n${issues.map((issue) => `- ${issue}`).join('\n')}`)
}

const outputDirectory = resolve(import.meta.dir, '..', '.tmp', 'creator-signal-authoring-tasks')
await mkdir(outputDirectory, { recursive: true })
await writeFile(
  resolve(outputDirectory, 'matrix.json'),
  `${JSON.stringify({ schema: 'creator-signal-authoring-task-matrix/v1', entries: creatorSignalAuthoringTaskMatrix }, null, 2)}\n`,
)
await writeFile(
  resolve(outputDirectory, 'matrix.md'),
  `# Creator Signal authoring task matrix\n\n${renderCreatorSignalAuthoringTaskMatrix()}\n`,
)

console.info(`Verified ${creatorSignalAuthoringTaskMatrix.length} Creator Signal catalogue entries.`)
