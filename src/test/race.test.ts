import sleep from 'sleep-promise'

import { replayable } from '../replayable'
import { step } from '../step'
import { once } from '../once'
import { using } from '../context'
import { hook, trigger } from '../hook'
import { inMemContext } from '../adapters/mem'


describe('race handling', () => {
  test('result of step races are stable across replays.', async () => {
    const ress: string[] = []
    const delay = step(async () => await sleep(50))

    const stepA = step(async () => 'A')
    const stepB = step(async () => (await sleep(5), 'B'))

    const repl = replayable('race-1', async () => {
      const res = await Promise.race([stepB(), stepA()])
      ress.push(res)
      await delay()
    })

    await using(inMemContext(), async () => {
      await repl()
      expect(ress.includes('B')).toBe(false)
    })
  })

  test('result of hook races are stable across replays.', async () => {
    const ress: string[] = []
    const delay = step(async () => await sleep(50))

    let aToken: string, bToken: string

    const repl = replayable('race-2', async () => {
      const hookA = await hook<string>(); aToken = hookA.token
      const hookB = await hook<string>(); bToken = hookB.token

      const res = await Promise.race([hookB.once(), hookA.once()])
      ress.push(res)

      await delay()
    })

    await using(inMemContext(), async () => {
      const prom = repl()

      sleep(1).then(() => trigger({ token: aToken }, 'A'))
      sleep(5).then(() => trigger({ token: bToken }, 'B'))

      await prom
      expect(ress.includes('B')).toBe(false)
    })
  })

  test('results of once races are stable across replays.', async () => {
    const ress: string[] = []
    const delay = step(async () => await sleep(50))

    const repl = replayable('race-3', async () => {
      const res = await Promise.race([
        once(async () => (await sleep(5), 'B')),
        once(async () => 'A'),
      ])
      ress.push(res)
      await delay()
    })

    await using(inMemContext(), async () => {
      await repl()
      expect(ress.includes('B')).toBe(false)
    })
  })

  test('result of combination of step/hook races are stable across replays.', async () => {
    const ress: string[] = []
    const delay = step(async () => await sleep(50))

    const stepA = step(async () => 'A')
    let bToken: string

    const repl = replayable('race-4', async () => {
      const hookB = await hook<string>(); bToken = hookB.token

      const res = await Promise.race([ hookB.once(), stepA() ])
      ress.push(res)
      await delay()
    })

    await using(inMemContext(), async () => {
      const prom = repl()

      sleep(5).then(() => trigger({ token: bToken }, 'B'))
      await prom
      expect(ress.includes('B')).toBe(false)
    })
  })
})
