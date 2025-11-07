import { getReplayContext, getRunContext } from './context'


export const once = async <T>(fn: () => T | Promise<T>) => {
  const replay = getReplayContext()
  const run = getRunContext()
  const step = (run.stepCounter += 1)

  const state = await replay.events.getStepState(run.runId, step)
  if (!state || state.status === 'interrupted') {
    replay.events.log({
      type: state ? 'step:recovered' : 'step:started',
      runId: run.runId,
      step,
      timestamp: new Date()
    })
    try {
      const res = await fn()

      replay.events.log({
        type: 'step:completed',
        runId: run.runId,
        step,
        timestamp: new Date(),
        result: res
      })

      return res as T
    } catch (error) {
      replay.events.log({
        type: 'step:failed',
        runId: run.runId,
        step,
        timestamp: new Date(),
        error
      })

      throw error
    }
  } else if (state.status === 'failed') {
    await run.turn(state.finishSeq!)
    throw state.error
  } else {
    await run.turn(state.finishSeq!)

    return state.result as T
  }
}
