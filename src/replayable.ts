import { randomUUID } from 'node:crypto'

import { register, getReplayable } from './registry'
import { execInRunContext, getReplayContext } from './context'
import { isPendingError, StepPendingError } from './errors'
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
    (src?) => setImmediate(() => resume(runId, src)),
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
      .catch(async error => {
        if (isPendingError(error)) {
          events.log({
            type: 'run:paused',
            runId,
            timestamp: new Date()
          })

          if (error instanceof StepPendingError) {
            //
            // TODO: further analyse this. this is needed because sometimes
            //       steps are executed in parallel, and so immediately when the first
            //       one resumes the second may also finish, but it can't resume
            //       and the run might consider throwing a pending error again.
            //       That said, this feels a bit hacky to me, and I'm not sure
            //       whether we could do something neater or not. For example the same
            //       issue might happen with hooks as well (though not as commonly),
            //       and there is not an equally easy way to fix that (since hooks can
            //       be triggered multiple times).
            //
            const state = await events.getStepState(runId, error.step)
            if (state && (state.status === 'completed' || state.status === 'failed')) {
              resume(runId, { type: 'step:completed', step: error.step, result: state.result })
            }
          }
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
