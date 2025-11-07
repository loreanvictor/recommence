import sleep from 'sleep-promise'

import { hook, trigger, step, replayable, use, once } from '../src'
import { inMemContext } from '../src/adapters/mem'

use(inMemContext())

const stepA = step(async () => (console.log('A'), 'A'))
const stepB = step(async () => (await sleep(100), console.log('B'), 'B'))
const stepC = step(async () => (await sleep(150), 42))

const sample = replayable('sample', async () => {
  await stepA()
  await stepA()

  await Promise.all([
    stepA(),
    stepA(),
  ])

  console.log('DONE!')
})

sample()

// setTimeout(() => trigger({ id: 'confirm' }, 64), 200)

// ---- DEBUG ----

import { getReplayContext } from '../src'

const context = getReplayContext()
setTimeout(() => {
  console.log(context.events)
}, 500)
