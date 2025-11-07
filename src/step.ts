import sleep from 'sleep-promise'

import { getRunContext, getReplayContextUnsafe, execInStepContext } from './context'
import { FatalError, Retry, StepPendingError } from './errors'


export const step = <T, Fn extends ((...args: any[]) => Promise<T>)>(fn: Fn): Fn => {
  return (async (...args: Parameters<Fn>): Promise<T> => {
    const replay = getReplayContextUnsafe()

    if (!replay) {
      return fn(...args)
    }

    const run = getRunContext()
    const stepCounter = (run.stepCounter += 1)

    const state = await replay.events.getStepState(run.runId, run.stepCounter)

    if (!state || state.status === 'error' || state.status === 'interrupted') {
      replay.events.log({
        type: !state ? 'step:started' : state.status === 'interrupted' ? 'step:recovered' : 'step:started',
        runId: run.runId,
        step: stepCounter,
        timestamp: new Date()
      })

      await sleep(0)
      setImmediate(() => {
        execInStepContext(run.stepCounter, (state?.attempts.length ?? 0) + 1, () => {
          fn(...args)
            .then(result => {
              replay.events.log({
                type: 'step:completed',
                runId: run.runId,
                step: stepCounter,
                timestamp: new Date(),
                result
              })

              run.resume({ type: 'step:completed', step: run.stepCounter, result })
            })
            .catch(error => {
              if (error instanceof FatalError) {
                replay.events.log({
                  type: 'step:failed',
                  runId: run.runId,
                  step: stepCounter,
                  timestamp: new Date(),
                  error
                })

                run.resume()
              } else {
                replay.events.log({
                  type: 'step:error',
                  runId: run.runId,
                  step: stepCounter,
                  timestamp: new Date(),
                  error
                })

                // TODO: check if max attempts have reached,
                //       and fail the step if so with proper error.

                if (error instanceof Retry) {
                  // TODO: schedule retry
                } else {
                  // TODO: retry immediately, for this, this piece of code
                  //       needs to be extracted into a function recursively
                  //       calling itself and re-attempting the step. Note that
                  //       we could also just simply resume the run here and it
                  //       would automatically yield the same result, but a bit slower
                  //       as all prior steps would need to be replayed.
                }
              }
            })
        })
      })
      throw new StepPendingError(run.replayableId, run.runId, run.stepCounter)
    } else if (state.status === 'running') {
      await sleep(0)
      throw new StepPendingError(run.replayableId, run.runId, run.stepCounter)
    } else if (state.status === 'failed') {
      await run.turn(state.finishSeq!)
      throw state.error
    } else {
      await run.turn(state.finishSeq!)

      return state.result as T
    }
  }) as Fn
}
