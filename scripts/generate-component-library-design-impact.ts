import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { safeParseJson } from '@core/utils/jsonValidate'
import { Type } from '@core/utils/typeboxHelpers'
import { componentLibraryPatternRegistry } from '@core/component-library'
import { registry } from '@core/module-engine'
import {
  builtInVisualComponentRegistry,
} from '@core/visual-components-schema'
import '@modules/base'
import { BUILT_IN_COMPONENT_LIBRARY_ENTRIES } from '@modules/base/componentLibrary'
import {
  creatorSignalComponentLibraryEntries,
} from '../integrations/creator-signal/component-library'
import crmIframeForm from '../integrations/creator-signal/modules/crm-iframe-form'
import mauticForm from '../integrations/creator-signal/modules/mautic-form'
import {
  creatorSignalSiteModules,
} from '../integrations/creator-signal/modules/site-components'
import { heroComponent } from '../integrations/creator-signal/pack/hero-component'
import { twoColumnComponent } from '../integrations/creator-signal/pack/two-column-component'
import { creatorSignalPluginIdentity } from '../integrations/creator-signal/plugin-contract'
import {
  CREATOR_SIGNAL_SPECIMEN_BUNDLE_REFERENCE,
  validateCreatorSignalComponentSpecimenBundle,
} from './lib/creator-signal-component-specimens'
import {
  buildDesignImpactManifest,
  validateDesignImpactManifest,
} from './lib/component-library-design-impact'

const outputPath = resolve(
  import.meta.dir,
  '../docs/features/component-library-design-impact-manifest.json',
)
const packagePath = resolve(import.meta.dir, '../package.json')
const designSystemLockPath = resolve(
  import.meta.dir,
  '../integrations/creator-signal/design-system/lock.json',
)
const creatorSignalSpecimenBundlePath = resolve(
  import.meta.dir,
  '..',
  CREATOR_SIGNAL_SPECIMEN_BUNDLE_REFERENCE,
)

const PackageSchema = Type.Object(
  { version: Type.String({ minLength: 1 }) },
  { additionalProperties: true },
)
const DesignSystemLockFileSchema = Type.Object(
  {
    schema: Type.String({ minLength: 1 }),
    source: Type.Object(
      {
        repository: Type.String({ minLength: 1 }),
        revision: Type.String({ minLength: 1 }),
        package: Type.String({ minLength: 1 }),
        packageVersion: Type.String({ minLength: 1 }),
      },
      { additionalProperties: true },
    ),
  },
  { additionalProperties: true },
)

const packageJson = await readValidatedJson(packagePath, PackageSchema)
const designSystemLock = await readValidatedJson(
  designSystemLockPath,
  DesignSystemLockFileSchema,
)
const specimenBundleRaw = await readValidatedJson(
  creatorSignalSpecimenBundlePath,
  Type.Object({}, { additionalProperties: true }),
)
const specimenBundle = validateCreatorSignalComponentSpecimenBundle(
  specimenBundleRaw,
)
const pluginModuleIds = [
  mauticForm,
  crmIframeForm,
  ...creatorSignalSiteModules,
].map((module) => module.id)
const pluginVisualComponentIds = [heroComponent.id, twoColumnComponent.id]

const manifest = buildDesignImpactManifest({
  instaticVersion: packageJson.version,
  builtInEntries: BUILT_IN_COMPONENT_LIBRARY_ENTRIES,
  plugins: [{
    ...creatorSignalPluginIdentity,
    entries: creatorSignalComponentLibraryEntries,
  }],
  designSystemLocks: [{
    ownerId: creatorSignalPluginIdentity.id,
    schema: designSystemLock.schema,
    repository: designSystemLock.source.repository,
    revision: designSystemLock.source.revision,
    packageName: designSystemLock.source.package,
    packageVersion: designSystemLock.source.packageVersion,
  }],
  resolutions: {
    moduleIds: new Set([
      ...registry.list().map((module) => module.id),
      ...pluginModuleIds,
    ]),
    visualComponentIds: new Set([
      ...builtInVisualComponentRegistry.list().map((component) => component.id),
      ...pluginVisualComponentIds,
    ]),
    patternIds: new Set(
      componentLibraryPatternRegistry.list().map((pattern) => pattern.id),
    ),
    templateRoles: new Set(['header', 'footer', 'skip-link']),
  },
  specimenArtifacts: specimenBundle.entries.map((entry) => ({
    schemaVersion: specimenBundle.schemaVersion,
    bundleReference: CREATOR_SIGNAL_SPECIMEN_BUNDLE_REFERENCE,
    entryId: entry.id,
    htmlReference: entry.htmlReference,
    contentHash: entry.htmlHash,
  })),
})
const rendered = `${JSON.stringify(manifest, null, 2)}\n`

if (process.argv.includes('--check')) {
  const current = await readFile(outputPath, 'utf8').catch(() => '')
  if (current) {
    const parsed = safeParseJson(current, Type.Unknown())
    if (!parsed.ok) throw parsed.error
    validateDesignImpactManifest(parsed.value)
  }
  if (current !== rendered) {
    console.error(
      'Component Library design-impact manifest is stale. ' +
      'Run `bun run component-library:design-impact`.',
    )
    process.exit(1)
  }
  console.log(
    `Component Library design-impact manifest is current (${manifest.summary.entryCount} entries, ${manifest.checksum.value}).`,
  )
} else {
  await writeFile(outputPath, rendered, 'utf8')
  console.log(
    `Wrote ${outputPath} (${manifest.summary.entryCount} entries, ${manifest.checksum.value}).`,
  )
}

async function readValidatedJson<T extends ReturnType<typeof Type.Object>>(
  path: string,
  schema: T,
) {
  const raw = await readFile(path, 'utf8')
  const result = safeParseJson(raw, schema)
  if (!result.ok) {
    throw new Error(`Invalid JSON contract at ${path}.`, { cause: result.error })
  }
  return result.value
}
