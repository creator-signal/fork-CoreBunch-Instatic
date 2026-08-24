import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { safeParseJson } from '@core/utils/jsonValidate'
import { Type } from '@core/utils/typeboxHelpers'
import '@modules/base'
import { BUILT_IN_COMPONENT_LIBRARY_ENTRIES } from '@modules/base/componentLibrary'
import {
  validateDesignImpactManifest,
} from './lib/component-library-design-impact'
import {
  buildNonFormSpecimenBundle,
  validateNonFormSpecimenBundle,
} from './lib/component-library-non-form-specimens'

const repositoryRoot = resolve(import.meta.dir, '..')
const outputPath = resolve(
  repositoryRoot,
  'docs/features/component-library-non-form-specimens.json',
)
const designImpactPath = resolve(
  repositoryRoot,
  'docs/features/component-library-design-impact-manifest.json',
)
const designSystemLockPath = resolve(
  repositoryRoot,
  'integrations/creator-signal/design-system/lock.json',
)

const DesignSystemLockSchema = Type.Object(
  {
    source: Type.Object(
      {
        repository: Type.String({ minLength: 1 }),
        revision: Type.String({ minLength: 1 }),
        package: Type.String({ minLength: 1 }),
        packageVersion: Type.String({ minLength: 1 }),
      },
      { additionalProperties: true },
    ),
    files: Type.Array(Type.Object(
      {
        source: Type.String({ minLength: 1 }),
        target: Type.String({ minLength: 1 }),
        sha256: Type.String({ pattern: '^[a-f0-9]{64}$' }),
      },
      { additionalProperties: true },
    )),
  },
  { additionalProperties: true },
)

const designImpactRaw = await readFile(designImpactPath, 'utf8')
const designImpactJson = safeParseJson(designImpactRaw, Type.Unknown())
if (!designImpactJson.ok) {
  throw new Error(`Invalid JSON contract at ${designImpactPath}.`, {
    cause: designImpactJson.error,
  })
}
const designImpactManifest = validateDesignImpactManifest(designImpactJson.value)

const lockRaw = await readFile(designSystemLockPath, 'utf8')
const lockJson = safeParseJson(lockRaw, DesignSystemLockSchema)
if (!lockJson.ok) {
  throw new Error(`Invalid JSON contract at ${designSystemLockPath}.`, {
    cause: lockJson.error,
  })
}

const bundle = buildNonFormSpecimenBundle(
  BUILT_IN_COMPONENT_LIBRARY_ENTRIES,
  designImpactManifest,
  lockJson.value,
)
const rendered = `${JSON.stringify(bundle, null, 2)}\n`

if (process.argv.includes('--check')) {
  const current = await readFile(outputPath, 'utf8').catch(() => '')
  if (current) {
    const parsed = safeParseJson(current, Type.Unknown())
    if (!parsed.ok) throw parsed.error
    validateNonFormSpecimenBundle(parsed.value)
  }
  if (current !== rendered) {
    console.error(
      'Component Library non-form specimen bundle is stale. ' +
      'Run `bun run component-library:non-form-specimens`.',
    )
    process.exit(1)
  }
  console.log(
    `Component Library non-form specimen bundle is current ` +
    `(${bundle.summary.entryCount} entries, ${bundle.summary.scenarioCount} scenarios, ${bundle.checksum.value}).`,
  )
} else {
  await writeFile(outputPath, rendered, 'utf8')
  console.log(
    `Wrote ${outputPath} (${bundle.summary.entryCount} entries, ` +
    `${bundle.summary.scenarioCount} scenarios, ${bundle.checksum.value}).`,
  )
}
