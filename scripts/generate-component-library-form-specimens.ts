import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import {
  buildFormSpecimenBundle,
  formSpecimenManifestReference,
} from './lib/component-library-form-specimens'

const repositoryRoot = resolve(import.meta.dir, '..')
const checkOnly = Bun.argv.includes('--check')
const bundle = buildFormSpecimenBundle()
const expected = new Map<string, string>([
  [
    formSpecimenManifestReference(),
    `${JSON.stringify(bundle.manifest, null, 2)}\n`,
  ],
  ...bundle.documents,
])

if (checkOnly) {
  const errors: string[] = []
  for (const [reference, content] of expected) {
    const path = resolve(repositoryRoot, reference)
    try {
      const current = await readFile(path, 'utf8')
      if (current !== content) errors.push(`${reference} has drifted`)
    } catch (error) {
      errors.push(
        `${reference} is missing: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
  const outputDirectory = dirname(
    resolve(repositoryRoot, formSpecimenManifestReference()),
  )
  try {
    const expectedNames = new Set(
      [...expected.keys()].map((reference) => reference.split('/').at(-1)),
    )
    for (const name of await readdir(outputDirectory)) {
      if ((name.endsWith('.html') || name === 'manifest.json') && !expectedNames.has(name)) {
        errors.push(`docs/features/component-library-form-specimens/${name} is obsolete`)
      }
    }
  } catch (error) {
    errors.push(
      `specimen output directory is missing: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  if (errors.length > 0) {
    throw new Error(`[form-specimens] ${errors.join('; ')}`)
  }
  console.log(
    `Component Library form specimens are current: ${bundle.manifest.summary.entryCount} entries, ${bundle.manifest.summary.scenarioCount} scenarios.`,
  )
} else {
  const outputDirectory = dirname(
    resolve(repositoryRoot, formSpecimenManifestReference()),
  )
  await mkdir(outputDirectory, { recursive: true })
  const expectedNames = new Set(
    [...expected.keys()].map((reference) => reference.split('/').at(-1)),
  )
  for (const name of await readdir(outputDirectory)) {
    if ((name.endsWith('.html') || name === 'manifest.json') && !expectedNames.has(name)) {
      await rm(resolve(outputDirectory, name))
    }
  }
  for (const [reference, content] of expected) {
    const path = resolve(repositoryRoot, reference)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, content, 'utf8')
  }
  console.log(
    `Generated ${bundle.manifest.summary.entryCount} Component Library form specimens with ${bundle.manifest.summary.scenarioCount} scenarios.`,
  )
}
