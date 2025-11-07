import { AsyncLocalStorage } from 'node:async_hooks'

import { EventLog, ResumptionSource } from './log'
import { Notifier } from './notifier'


export interface ReplayContext {
  events: EventLog
  notifier: Notifier
}

export interface RunContext {
  runId: string
  replayableId: string
  stepCounter: number
  hookCounter: number
  resume: (source?: ResumptionSource) => void
  turn: (step: number) => Promise<void>
}

export interface StepContext {
  step: number
  attempt: number
}

const replayCtx = new AsyncLocalStorage<ReplayContext>()
const runCtx = new AsyncLocalStorage<RunContext>()
const stepCtx = new AsyncLocalStorage<StepContext>()

export const execInReplayContext = (
  events: EventLog,
  notifier: Notifier,
  fn: () => void
) =>
  replayCtx.run({ events, notifier }, fn)

export const execInRunContext = (
  runId: string,
  replayableId: string,
  resume: () => void,
  turn: (step: number) => Promise<void>,
  fn: () => void
) =>
  runCtx.run({ runId, replayableId, resume, turn, stepCounter: 0, hookCounter: 0 }, fn)

export const execInStepContext = (step: number, attempt: number, fn: () => void) =>
  stepCtx.run({ step, attempt }, fn)


export class OutOfContextExecution extends Error {
  constructor(message: string) {
    super(`Out of context execution: ${message}`)
    this.name = 'OutOfContextExecution'
  }
}

const getContextSafe = <T>(ctx: AsyncLocalStorage<T>, message: string) => {
  const store = ctx.getStore()
  if (!store) {
    throw new OutOfContextExecution(message)
  }

  return store
}

export const getReplayContext = () => getContextSafe(replayCtx, 'must start replayables in a replay context.')
export const getReplayContextUnsafe = () => replayCtx.getStore()
export const getRunContext = () => getContextSafe(runCtx, 'run context not found.')
export const getStepContext = () => stepCtx.getStore()


export const using = (context: ReplayContext, fn: () => void | Promise<void>) => {
  return execInReplayContext(context.events, context.notifier, fn)
}

export const use = (context: ReplayContext) => {
  replayCtx.enterWith(context)
}
