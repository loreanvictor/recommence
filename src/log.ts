import { SequencedEvent } from './sequencer'

export type StepEventType =
  | 'step:started'
  | 'step:completed'
  | 'step:error'
  | 'step:retried'
  | 'step:failed'
  | 'step:interrupted'
  | 'step:recovered'

export type HookEventType =
  | 'hook:bound'
  | 'hook:triggered'

export type RunEventType =
  | 'run:started'
  | 'run:paused'
  | 'run:resumed'
  | 'run:completed'
  | 'run:failed'
  | 'run:interrupted'
  | 'run:recovered'

export type ReplayEventType = StepEventType | HookEventType | RunEventType

export type RunStatus = 'running' | 'paused' | 'completed' | 'failed' | 'interrupted'

export interface RunState {
  started: Date
  finished?: Date
  replayableId: string
  result?: any
  error?: any
  args: any[]
  status: RunStatus
  finishSeq?: number
}

export type StepStatus = 'running' | 'completed' | 'failed' | 'error' | 'interrupted'

export interface StepState {
  started: Date
  finished?: Date
  result?: any
  status: StepStatus
  attempts: {on: Date, error?: any}[]
  error?: any
  finishSeq?: number
}

export interface HookBinding {
  on: Date,
  runId: string,
}

export interface HookTrigger {
  on: Date,
  value: any,
  seq: number,
}

export interface BaseEvent {
  timestamp: Date
  type: ReplayEventType
}

export interface BaseRunEvent extends BaseEvent {
  type: RunEventType | StepEventType
  runId: string
}

export interface RunStartedEvent extends BaseRunEvent {
  type: 'run:started'
  replayableId: string
  args: any[]
}

export interface RunPauseEvent extends BaseRunEvent {
  type: 'run:paused'
}

export interface RunInterruptEvent extends BaseRunEvent {
  type: 'run:interrupted'
}

export interface RunRecoverEvent extends BaseRunEvent {
  type: 'run:recovered'
}

export interface ResumptionSource {
  type: ReplayEventType,
  [key: string]: any,
}

export interface RunResumeEvent extends BaseRunEvent {
  type: 'run:resumed',
  source?: ResumptionSource,
}

export interface RunCompleteEvent extends BaseRunEvent {
  type: 'run:completed'
  result: any
}

export interface RunFailedEvent extends BaseRunEvent {
  type: 'run:failed'
  error: any
}

export type RunEvent =
  | RunStartedEvent | RunPauseEvent | RunResumeEvent | RunRecoverEvent
  | RunCompleteEvent | RunFailedEvent | RunInterruptEvent


export const isRunEvent = (event: any): event is RunEvent => {
  return event.type === 'run:started' ||
    event.type === 'run:paused' ||
    event.type === 'run:resumed' ||
    event.type === 'run:recovered' ||
    event.type === 'run:completed' ||
    event.type === 'run:failed' ||
    event.type === 'run:interrupted'
}

export interface BaseStepEvent extends BaseRunEvent {
  type: StepEventType
  step: number
}

export interface StepStartedEvent extends BaseStepEvent {
  type: 'step:started'
}

export interface StepCompletedEvent extends BaseStepEvent {
  type: 'step:completed'
  result: any
}

export interface StepErrorEvent extends BaseStepEvent {
  type: 'step:error'
  error: any
}

export interface StepFailedEvent extends BaseStepEvent {
  type: 'step:failed'
  error: any
}

export interface StepRetriedEvent extends BaseStepEvent {
  type: 'step:retried'
}

export interface StepInterruptedEvent extends BaseStepEvent {
  type: 'step:interrupted'
}

export interface StepRecoveredEvent extends BaseStepEvent {
  type: 'step:recovered'
}

export type StepEvent =
  | StepStartedEvent | StepRetriedEvent | StepRecoveredEvent
  | StepFailedEvent | StepCompletedEvent | StepErrorEvent | StepInterruptedEvent

export const isStepEvent = (event: any): event is StepEvent => {
  return event.type === 'step:started' ||
    event.type === 'step:retried' ||
    event.type === 'step:recovered' ||
    event.type === 'step:failed' ||
    event.type === 'step:completed' ||
    event.type === 'step:error' ||
    event.type === 'step:interrupted'
}

export interface BaseHookEvent extends BaseEvent {
  type: HookEventType
  token: string
  runId: string
}

export interface HookBoundEvent extends BaseHookEvent {
  type: 'hook:bound'
  hookId: string
}

export interface HookTriggeredEvent extends BaseHookEvent {
  type: 'hook:triggered'
  value: any
}

export type HookEvent = HookBoundEvent | HookTriggeredEvent

export const isHookEvent = (event: BaseEvent): event is HookEvent => {
  return event.type === 'hook:bound' || event.type === 'hook:triggered'
}

export type ReplayEvent = RunEvent | StepEvent | HookEvent
export type FinishedWorkEvent = StepCompletedEvent | StepFailedEvent | HookTriggeredEvent
export type SequencedReplayEvent = ReplayEvent & SequencedEvent

export const isFinishedWorkEvent = (event: BaseEvent): event is FinishedWorkEvent => {
  return event.type === 'step:completed' || event.type === 'step:failed' || event.type === 'hook:triggered'
}

export interface EventLog {
  log(...events: ReplayEvent[]): Promise<void>

  getRunState(runId: string): Promise<RunState | undefined>
  getStepState(runId: string, step: number): Promise<StepState | undefined>

  isHookBound(token: string, runId: string): Promise<boolean>
  getHookBindings(token: string): Promise<HookBinding[]>
  getHookTriggers(runId: string, token: string): Promise<HookTrigger[]>

  getPendingRuns(): Promise<RunState[]>
  getPendingSteps(runId: string): Promise<StepState[]>
  getFinishedWorkEvents(runId: string): Promise<(FinishedWorkEvent & SequencedEvent)[]>
}
