import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { renderComponentLibrarySpecification } from '@core/component-library/specification'
import { BUILT_IN_COMPONENT_LIBRARY_ENTRIES } from '@modules/base/componentLibrary'

const outputPath = resolve(
  import.meta.dir,
  '../docs/features/component-library-specification.md',
)
const rendered = renderComponentLibrarySpecification(
  BUILT_IN_COMPONENT_LIBRARY_ENTRIES,
)

if (process.argv.includes('--check')) {
  const current = await readFile(outputPath, 'utf8').catch(() => '')
  if (current !== rendered) {
    console.error(
      'Component Library specification is stale. Run `bun run component-library:spec`.',
    )
    process.exit(1)
  }
  console.log('Component Library specification is current.')
} else {
  await writeFile(outputPath, rendered, 'utf8')
  console.log(`Wrote ${outputPath}`)
}
