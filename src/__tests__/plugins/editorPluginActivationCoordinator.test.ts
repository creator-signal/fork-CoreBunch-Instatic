import { describe, expect, it } from 'bun:test'
import { createEditorPluginActivationCoordinator } from '@plugins/hooks/editorPluginActivationCoordinator'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('editor plugin activation coordinator', () => {
  it('shares an initial activation across route transitions', async () => {
    const pending = deferred<string>()
    const accepted: string[] = []
    let activationCount = 0
    const coordinator = createEditorPluginActivationCoordinator(() => {
      activationCount += 1
      return pending.promise
    }, (result) => accepted.push(result))

    const firstLayout = coordinator.activateInitial()
    const nextLayout = coordinator.activateInitial()
    const concurrentRefresh = coordinator.refresh()

    expect(activationCount).toBe(1)
    pending.resolve('ready')
    await Promise.all([firstLayout, nextLayout, concurrentRefresh])
    expect(accepted).toEqual(['ready'])

    await coordinator.activateInitial()
    expect(activationCount).toBe(1)
  })

  it('coalesces concurrent refreshes after initial activation', async () => {
    const first = deferred<number>()
    const second = deferred<number>()
    const pending = [first, second]
    const accepted: number[] = []
    let activationCount = 0
    const coordinator = createEditorPluginActivationCoordinator(() => {
      const activation = pending[activationCount]
      activationCount += 1
      if (!activation) throw new Error('unexpected activation')
      return activation.promise
    }, (result) => accepted.push(result))

    const initial = coordinator.activateInitial()
    first.resolve(1)
    await initial

    const refreshA = coordinator.refresh()
    const refreshB = coordinator.refresh()
    expect(activationCount).toBe(2)
    second.resolve(2)
    await Promise.all([refreshA, refreshB])
    expect(accepted).toEqual([1, 2])
  })

  it('retries an initial activation that rejects', async () => {
    const accepted: string[] = []
    let activationCount = 0
    const coordinator = createEditorPluginActivationCoordinator(async () => {
      activationCount += 1
      if (activationCount === 1) throw new Error('temporary failure')
      return 'recovered'
    }, (result) => accepted.push(result))

    await expect(coordinator.activateInitial()).rejects.toThrow('temporary failure')
    await coordinator.activateInitial()

    expect(activationCount).toBe(2)
    expect(accepted).toEqual(['recovered'])
  })
})
