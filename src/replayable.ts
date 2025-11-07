import { randomUUID } from 'node:crypto'

import { register, getReplayable } from './registry'
import { execInRunContext, getReplayContext } from './context'
import { isPendingError } from './errors'
import { ResumptionSource, RunStatus } from './log'
import { sequencer } from './sequencer'


const play = async (
  replayableId: string,
  runId: string,
  args: any[],
  status: RunStatus | undefined,
  source?: ResumptionSource,
) => {
  const fn = getReplayable(replayableId)
  const { events, notifier } = getReplayContext()
  const seq = sequencer(await events.getFinishedWorkEvents(runId))

  events.log({
    type: !status ? 'run:started' : status === 'paused' ? 'run:resumed' : 'run:recovered',
    runId,
    timestamp: new Date(),
    replayableId,
    args,
    source,
  })

  execInRunContext(
    runId,
    replayableId,
    (src?) => resume(runId, src),
    seq.turn,
    () => fn(...args)
      .then(result => {
        events.log({
          type: 'run:completed',
          runId,
          timestamp: new Date(),
          result
        })

        notifier.notifyComplete(runId, result)
      })
      .catch(error => {
        if (isPendingError(error)) {
          events.log({
            type: 'run:paused',
            runId,
            timestamp: new Date()
          })
        } else {
          events.log({
            type: 'run:failed',
            runId,
            timestamp: new Date(),
            error
          })

          notifier.notifyFailed(runId, error)
        }
      })
  )
}

export const resume = async (runId: string, source?: ResumptionSource) => {
  const { events, notifier } = getReplayContext()
  const state = await events.getRunState(runId)

  if (state && state.status === 'paused') {
    play(state.replayableId, runId, state.args, state.status, source)
  }

  return new Promise((resolve, reject) => {
    notifier.onRunCompleted(runId, resolve)
    notifier.onRunFailed(runId, reject)
  })
}

export const replayable = <T, Fn extends ((...args: any[]) => Promise<T>)>(
  name: string,
  fn: Fn
): Fn => {
  register(name, fn)

  return (async (...args: Parameters<Fn>): Promise<T> => {
    const { notifier } = getReplayContext()

    const runId = randomUUID()
    play(name, runId, args, undefined)

    return new Promise<T>((resolve, reject) => {
      notifier.onRunCompleted(runId, resolve)
      notifier.onRunFailed(runId, reject)
    })
  }) as Fn
}
