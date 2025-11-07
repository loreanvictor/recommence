import sleep from 'sleep-promise'

import { hook, trigger, step, replayable, use, once } from '../src'
import { inMemContext } from '../src/adapters/mem'

use(inMemContext())

const stepA = step(async () => (console.log('A'), 'A'))
const stepB = step(async () => (await sleep(100), console.log('B'), 'B'))
const stepC = step(async () => (await sleep(150), 42))

const res: string[] = []

const sample = replayable('sample', async () => {
  // const confirm = await hook('confirm')
  await once(() => console.log('O'))
  // await stepA()
  // await stepB()

  const val = await Promise.race([stepB(), stepA()])
  res.push(val)
  await stepC()
  // const value = await Promise.race([
  //   confirm.once(),
  //   stepC(),
  // ])

  // console.log('D', value)
})

// sample()
sample().then(() => console.log(res))

setTimeout(() => trigger({ id: 'confirm' }, 64), 200)

// ---- DEBUG ----

// import { getReplayContext } from '../src'

// const context = getReplayContext()
// setTimeout(() => {
//   console.log(context.events)
// }, 500)
