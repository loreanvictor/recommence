import { EventEmitter } from 'node:events'


export interface Notifier {
  onRunCompleted: (runId: string, listener: (result: any) => void) => () => void
  onRunFailed: (runId: string, listener: (err: any) => void) => () => void

  notifyComplete: (runId: string, result: any) => void
  notifyFailed: (runId: string, err: any) => void
}


export class EventEmitterNotifier {
  private emitter = new EventEmitter()

  constructor() {
    this.emitter.setMaxListeners(0)
  }

  onRunCompleted(runId: string, listener: (result: any) => void) {
    this.emitter.on(`run:complete:${runId}`, listener)

    return () => this.emitter.off(`run:complete:${runId}`, listener)
  }

  onRunFailed(runId: string, listener: (err: any) => void) {
    this.emitter.on(`run:failed:${runId}`, listener)

    return () => this.emitter.off(`run:failed:${runId}`, listener)
  }

  notifyComplete(runId: string, result: any) {
    this.emitter.emit(`run:complete:${runId}`, result)
  }

  notifyFailed(runId: string, err: any) {
    this.emitter.emit(`run:failed:${runId}`, err)
  }
}
