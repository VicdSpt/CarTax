import { withMinDuration } from '@/lib/delay'

describe('withMinDuration', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('attend la durée minimale si la tâche est plus rapide', async () => {
    let settled = false
    const p = withMinDuration(Promise.resolve(42), 400).then(v => { settled = true; return v })

    await jest.advanceTimersByTimeAsync(399)
    expect(settled).toBe(false)

    await jest.advanceTimersByTimeAsync(1)
    await expect(p).resolves.toBe(42)
  })

  it('propage l’erreur après la durée minimale', async () => {
    let settled = false
    const p = withMinDuration(Promise.reject(new Error('boom')), 400)
    p.catch(() => { settled = true })

    await jest.advanceTimersByTimeAsync(399)
    expect(settled).toBe(false)

    await jest.advanceTimersByTimeAsync(1)
    await expect(p).rejects.toThrow('boom')
  })

  it('ne rajoute pas de délai si la tâche est plus lente', async () => {
    const slow = new Promise(resolve => setTimeout(() => resolve('ok'), 1000))
    const p = withMinDuration(slow, 400)

    await jest.advanceTimersByTimeAsync(1000)
    await expect(p).resolves.toBe('ok')
  })
})
