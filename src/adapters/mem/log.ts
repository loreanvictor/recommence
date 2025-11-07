import {
  ReplayEvent, EventLog, RunStatus, isRunEvent, isStepEvent, StepStatus, HookBoundEvent, HookTriggeredEvent, RunEvent,
  StepEvent, RunState, StepState, isFinishedWorkEvent, SequencedReplayEvent, FinishedWorkEvent
} from '../../log'
import { SequencedEvent } from '../../sequencer'


export class InMemLog implements EventLog {
  events: SequencedReplayEvent[] = []
  seq = 0

  async log(...events: ReplayEvent[]): Promise<void> {
    this.events.push(...events.map(e => ({ ...e, seq: ++this.seq })))
  }

  async getRunState(runId: string): Promise<RunState | undefined> {
    const events = this.events.filter(e => isRunEvent(e) && e.runId === runId)
    const started = events.find(e => e.type === 'run:started')
    const completed = events.find(e => e.type === 'run:completed')
    const failed = events.find(e => e.type === 'run:failed')
    const interruptions = events.filter(e => e.type === 'run:interrupted' || e.type === 'run:recovered')
    const pauses = events.filter(e => e.type === 'run:paused' || e.type === 'run:resumed')

    if (!started) {
      return undefined
    }

    const status: RunStatus = completed ? 'completed'
      : failed ? 'failed'
        : interruptions[interruptions.length - 1]?.type === 'run:interrupted' ? 'interrupted'
          : pauses[pauses.length - 1]?.type === 'run:paused' ? 'paused'
            : 'running'

    return {
      started: started.timestamp,
      finished: completed?.timestamp ?? failed?.timestamp,
      replayableId: started.replayableId,
      args: started.args,
      status,
      result: completed?.result,
      finishSeq: completed?.seq ?? failed?.seq,
    }
  }

  async getStepState(runId: string, step: number): Promise<StepState | undefined> {
    const events = this.events.filter(e => isStepEvent(e) && e.runId === runId && e.step === step)
    const started = events.find(e => e.type === 'step:started')
    const completed = events.find(e => e.type === 'step:completed')
    const failed = events.find(e => e.type === 'step:failed')
    const interruptions = events.filter(e => e.type === 'step:interrupted' || e.type === 'step:recovered')
    const attempts = events.filter(e =>
      e.type === 'step:started'
      || e.type === 'step:error'
      || e.type === 'step:retried'
    ).reduce(
      (acc, e, i) => (i % 2 === 1 ? acc[acc.length - 1]!.push(e) : acc.push([e]), acc),
      [] as [ReplayEvent, ReplayEvent?][]
    )

    if (!started) {
      return undefined
    }

    const status: StepStatus = completed ? 'completed'
      : failed ? 'failed'
        : interruptions[interruptions.length - 1]?.type === 'step:interrupted' ? 'interrupted'
          : attempts[attempts.length - 1]?.[1] ? 'error'
            : 'running'

    return {
      started: started.timestamp,
      finished: completed?.timestamp ?? failed?.timestamp,
      status,
      attempts: attempts.map(([start, error]) => ({on: start.timestamp, error})),
      result: completed?.result,
      finishSeq: completed?.seq ?? failed?.seq,
    }
  }

  async getHookBindings(token: string) {
    return this.events
      .filter(e => e.type === 'hook:bound' && e.token === token)
      .map(e => ({ runId: (e as HookBoundEvent).runId, on: e.timestamp }))
  }

  async getHookTriggers(runId: string, token: string) {
    return this.events
      .filter(e => e.type === 'hook:triggered' && e.token === token && e.runId === runId)
      .map(e => ({ value: (e as HookTriggeredEvent).value, on: e.timestamp, seq: e.seq }))
  }

  async isHookBound(token: string, runId: string) {
    return this.events.some(e => e.type === 'hook:bound' && e.token === token && e.runId === runId)
  }

  async getPendingRuns() {
    return await Promise.all(
      this.events.filter(
        e => e.type === 'run:started' &&
        !this.events.some(ee =>
          (ee.type === 'run:completed' || ee.type === 'run:failed')
          && ee.runId === e.runId)
      ).map(async e => (await this.getRunState((e as RunEvent).runId!))!)
    )
  }

  async getPendingSteps(runId: string) {
    return await Promise.all(
      this.events.filter(
        e => e.type === 'step:started' && e.runId === runId &&
        !this.events.some(ee =>
          (ee.type === 'step:completed' || ee.type === 'step:failed')
          && ee.step === e.step)
      ).map(async e => (await this.getStepState((e as StepEvent).runId!, (e as StepEvent).step!))!)
    )
  }

  async getFinishedWorkEvents(runId: string) {
    return this.events.filter(
      e => e.runId === runId && isFinishedWorkEvent(e)
    ) as (FinishedWorkEvent & SequencedEvent)[]
  }
}
