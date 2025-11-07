import sleep from 'sleep-promise'

import { replayable } from '../replayable'
import { step } from '../step'
import { using } from '../context'
import { inMemContext } from '../adapters/mem'


describe('race handling', () => {
  test('result of step races are stable across replays.', async () => {
    await using(inMemContext(), async () => {
      const stepA = step(async () => 'A')
      const stepB = step(async () => (await sleep(5), 'B'))
      const stepC = step(async () => { await sleep(50) })

      const ress: string[] = []

      const repl = replayable('race-1', async () => {
        const res = await Promise.race([stepB(), stepA()])
        ress.push(res)
        await stepC()
      })

      await repl()
      expect(ress.includes('B')).toBe(false)
    })
  })

  test('result of hook races are stable across replays.', async () => {
    // TODO: ...
  })

  test('result of combination of step/hook races are stable across replays.', async () => {
    // TODO: ...
  })
})
