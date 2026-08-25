import { fileURLToPath } from 'node:url'

const viteEntrypointPath = fileURLToPath(new URL('../../node_modules/vite/bin/vite.js', import.meta.url))

export function bunCommand(...args: string[]): string[] {
  return [process.execPath, ...args]
}

export function bunRunCommand(...args: string[]): string[] {
  return bunCommand('run', ...args)
}

export function viteCommand(...args: string[]): string[] {
  const configuredRuntime = process.env.INSTATIC_VITE_RUNTIME?.trim()
  return [configuredRuntime || process.execPath, viteEntrypointPath, ...args]
}
