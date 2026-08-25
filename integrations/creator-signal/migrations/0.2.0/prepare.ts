#!/usr/bin/env bun
import { mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { basename, join, resolve } from 'node:path'
import { installPackCompileEnvironment } from '@core/plugin-sdk/cli/packCompileEnvironment'
import {
  BUNDLE_ARCHIVE_MANIFEST_PATH,
  SiteBundleArchiveManifestSchema,
} from '@core/data/bundleArchive'
import { parseValue } from '@core/utils/typeboxHelpers'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'

installPackCompileEnvironment()

interface Arguments {
  command: 'preview' | 'prepare'
  input: string
  outputDir?: string
}

function parseArguments(argv: string[]): Arguments {
  const command = argv[0]
  if (command !== 'preview' && command !== 'prepare') {
    throw new Error('Usage: prepare.ts <preview|prepare> --input <site-export.zip> [--output-dir <directory>]')
  }
  const inputIndex = argv.indexOf('--input')
  const outputIndex = argv.indexOf('--output-dir')
  const input = inputIndex >= 0 ? argv[inputIndex + 1] : undefined
  const outputDir = outputIndex >= 0 ? argv[outputIndex + 1] : undefined
  if (!input) throw new Error('--input is required.')
  if (command === 'prepare' && !outputDir) throw new Error('--output-dir is required for prepare.')
  return { command, input: resolve(input), ...(outputDir ? { outputDir: resolve(outputDir) } : {}) }
}

async function refuseExisting(path: string): Promise<void> {
  if (await Bun.file(path).exists()) throw new Error(`Refusing to overwrite existing file: ${path}`)
}

const args = parseArguments(Bun.argv.slice(2))
const inputBytes = new Uint8Array(await Bun.file(args.input).arrayBuffer())
const archive = unzipSync(inputBytes)
const manifestBytes = archive[BUNDLE_ARCHIVE_MANIFEST_PATH]
if (!manifestBytes) throw new Error(`${basename(args.input)} is missing ${BUNDLE_ARCHIVE_MANIFEST_PATH}.`)
const source = parseValue(
  SiteBundleArchiveManifestSchema,
  JSON.parse(strFromU8(manifestBytes)),
)
const { prepareCreatorSignalContentMigration } = await import('./migration')
const prepared = prepareCreatorSignalContentMigration(source)
const evidence = {
  ...prepared.report,
  evidence: {
    sourceArchive: basename(args.input),
    sourceSha256: createHash('sha256').update(inputBytes).digest('hex'),
    generatedAt: new Date().toISOString(),
  },
}

if (args.command === 'preview') {
  console.log(JSON.stringify(evidence, null, 2))
  if (!prepared.report.ready) process.exitCode = 2
} else {
  const outputDir = args.outputDir!
  await mkdir(outputDir, { recursive: true })
  const backupPath = join(outputDir, 'creator-signal-content-0.2.0-backup.zip')
  const reportPath = join(outputDir, 'creator-signal-content-0.2.0-report.json')
  const migrationPath = join(outputDir, 'creator-signal-content-0.2.0-migration.zip')
  const manifestPath = join(outputDir, 'creator-signal-content-0.2.0-migration.json')
  await Promise.all([
    backupPath,
    reportPath,
    migrationPath,
    manifestPath,
  ].map(refuseExisting))
  await Bun.write(backupPath, inputBytes)
  await Bun.write(reportPath, `${JSON.stringify(evidence, null, 2)}\n`)

  if (!prepared.manifest) {
    console.error(`Migration is blocked. Backup and report written to ${outputDir}; no migration archive was created.`)
    process.exitCode = 2
  } else {
    const outputArchive = zipSync({
      [BUNDLE_ARCHIVE_MANIFEST_PATH]: strToU8(JSON.stringify(prepared.manifest)),
    }, { level: 0 })
    await Bun.write(manifestPath, `${JSON.stringify(prepared.manifest, null, 2)}\n`)
    await Bun.write(migrationPath, outputArchive)
    console.log(JSON.stringify({
      ready: true,
      backupPath,
      reportPath,
      migrationPath,
      manifestPath,
      rows: prepared.manifest.rows.length,
      importStrategy: prepared.report.apply.strategy,
      publishesAutomatically: false,
    }, null, 2))
  }
}
