import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { safeParseJson } from '@core/utils/jsonValidate'
import { Type } from '@core/utils/typeboxHelpers'
import {
  buildCreatorSignalComponentSpecimens,
  CREATOR_SIGNAL_SPECIMEN_BUNDLE_REFERENCE,
  sha256Text,
  validateCreatorSignalComponentSpecimenBundle,
} from './lib/creator-signal-component-specimens'

const repositoryRoot = resolve(import.meta.dir, '..')
const checkOnly = process.argv.includes('--check')
const rendered = await buildCreatorSignalComponentSpecimens()
const bundlePath = resolve(repositoryRoot, CREATOR_SIGNAL_SPECIMEN_BUNDLE_REFERENCE)
const expectedHtmlReferences = [...rendered.htmlByReference.keys()].sort()

if (checkOnly) {
  const currentBundleText = await readFile(bundlePath, 'utf8').catch(() => '')
  if (currentBundleText) {
    const parsed = safeParseJson(currentBundleText, Type.Unknown())
    if (!parsed.ok) throw parsed.error
    validateCreatorSignalComponentSpecimenBundle(parsed.value)
  }
  const expectedBundleText = `${JSON.stringify(rendered.bundle, null, 2)}\n`
  const stale: string[] = []
  if (currentBundleText !== expectedBundleText) stale.push(CREATOR_SIGNAL_SPECIMEN_BUNDLE_REFERENCE)

  for (const reference of expectedHtmlReferences) {
    const current = await readFile(resolve(repositoryRoot, reference), 'utf8').catch(() => '')
    const expected = rendered.htmlByReference.get(reference)!
    if (current !== expected || sha256Text(current) !== rendered.bundle.entries.find(
      (entry) => entry.htmlReference === reference,
    )?.htmlHash) {
      stale.push(reference)
    }
  }
  const htmlDirectory = resolve(repositoryRoot, 'integrations/creator-signal/specimens/html')
  const existing = await readdir(htmlDirectory).catch(() => [])
  const unexpected = existing
    .filter((name) => name.endsWith('.html'))
    .map((name) => relative(repositoryRoot, resolve(htmlDirectory, name)).replaceAll('\\', '/'))
    .filter((reference) => !expectedHtmlReferences.includes(reference))
  stale.push(...unexpected)

  if (stale.length > 0) {
    throw new Error(
      `Creator Signal component specimens are stale: ${stale.sort().join(', ')}. ` +
      'Run `bun run component-library:creator-signal-specimens`.',
    )
  }
  console.log(
    `Creator Signal component specimens are current (${rendered.bundle.summary.entryCount} entries, ${rendered.bundle.checksum.value}).`,
  )
} else {
  await mkdir(dirname(bundlePath), { recursive: true })
  for (const [reference, html] of rendered.htmlByReference) {
    const path = resolve(repositoryRoot, reference)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, html, 'utf8')
  }
  await writeFile(bundlePath, `${JSON.stringify(rendered.bundle, null, 2)}\n`, 'utf8')
  console.log(
    `Wrote ${bundlePath} and ${rendered.bundle.summary.entryCount} published HTML specimens.`,
  )
}
