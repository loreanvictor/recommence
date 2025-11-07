import { createHash } from 'node:crypto'
import sleep from 'sleep-promise'

import { getReplayContext, getRunContext } from './context'
import { resume } from './replayable'
import { HookPendingError } from './errors'


export const hookIdToToken = (id: string) => createHash('sha256').update(id).digest('base64url').slice(0, 24)

export interface Hook<T> {
  id: string
  token: string
  [Symbol.asyncIterator]: () => this
  next: () => Promise<{done: true, value: undefined} | { done: false, value: T}>
  once: () => Promise<T>
}

export const hook = async <T>(hookId?: string): Promise<Hook<T>> => {
  const { events } = getReplayContext()
  const run = getRunContext()
  const counter = (run.hookCounter += 1)
  hookId ??= `hook:${run.runId}:${counter}`
  const token = hookIdToToken(hookId)

  if (!await events.isHookBound(token, run.runId)) {
    events.log({ type: 'hook:bound', hookId, token, runId: run.runId, timestamp: new Date() })
  }

  const triggers = (await events.getHookTriggers(run.runId, token))[Symbol.iterator]()

  const ref = {
    id: hookId,
    token,
    [Symbol.asyncIterator]: () => ref,
    next: async () => {
      const { done, value: trigger } = triggers.next()
      if (done) {
        await sleep(0)
        throw new HookPendingError(hookId)
      } else {
        await run.turn(trigger.seq)

        return { done: false, value: trigger.value as T } as { done: false, value: T }
      }
    },
    once: async () => {
      return (await ref.next()).value
    },
  }

  return ref
}

type HookByToken = { token: string }
type HookById = { id: string }
export type HookIdentifier = HookByToken | HookById

export const trigger = async (hid: HookIdentifier, value?) => {
  const token = (hid as HookByToken).token ?? hookIdToToken((hid as HookById).id)
  const { events } = getReplayContext()

  const bindings = await events.getHookBindings(token)
  bindings.forEach(binding => {
    events.log({ type: 'hook:triggered', runId: binding.runId, token, timestamp: new Date(), value })
    resume(binding.runId, { type: 'hook:triggered', token, value })
  })
}
