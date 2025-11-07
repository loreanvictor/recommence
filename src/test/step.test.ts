import { inMemContext } from '../adapters/mem'
import { using } from '../context'
import { replayable } from '../replayable'
import { step } from '../step'


describe('step', () => {
  it('should be the same function with same signature in other contexts.', () => {
    const fn = step(async (x: number) => x * 2)
    expect(fn(2)).resolves.toBe(4)
  })

  it('should execute steps in replayable context.', async () => {
    const stepA = step(async (n: number) => n * 2)
    const stepB = step(async (n: number, m: number) => n + m)
    const stepC = step(async () => 2)

    const repl = replayable('step-1', async (n: number) => {
      const a = await stepA(n)
      const b = await stepB(n, await stepC())

      return a + b
    })

    await using(inMemContext(), async () => {
      await expect(repl(3)).resolves.toBe(11)
    })
  })

  it('should ensure each step executes only once.', async () => {
    const counts = [0, 0, 0, 0]
    let actual = 0

    const stepA = step(async () => counts[0]++)
    const stepB = step(async () => counts[1]++)
    const stepC = step(async () => counts[2]++)
    const stepD = step(async () => counts[3]++)

    const repl = replayable('step-2', async () => {
      actual++
      await stepA()
      await stepB()
      await Promise.all([
        stepC(),
        stepD(),
      ])
    })

    await using(inMemContext(), async () => {
      await repl()
      expect(counts).toEqual([1, 1, 1, 1])
      expect(actual).toBe(4)
    })
  })
})
