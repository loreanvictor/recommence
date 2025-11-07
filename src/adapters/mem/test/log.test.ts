import { InMemLog } from '../log'


describe(InMemLog, () => {
  it('deduces correct paused / resumed status from events.', async () => {
    const events = new InMemLog()

    expect((events.getRunState('b'))).resolves.toBeUndefined()

    events.log(
      { type: 'run:started', replayableId: 'a', runId: 'b', timestamp: new Date(1), args: []},
      { type: 'run:paused', runId: 'b', timestamp: new Date(2) },
      { type: 'run:resumed', runId: 'b', timestamp: new Date(3) },
      { type: 'run:paused', runId: 'b', timestamp: new Date(4) },
    )

    expect((events.getRunState('b'))).resolves.toBeDefined()
    let state = await events.getRunState('b')
    expect(state).toBeDefined()
    expect(state!.started.getTime()).toBe(1)
    expect(state!.status).toBe('paused')

    events.log(
      { type: 'run:resumed', runId: 'b', timestamp: new Date(5) },
      { type: 'run:paused', runId: 'b', timestamp: new Date(6) },
      { type: 'run:paused', runId: 'b', timestamp: new Date(7) },
      { type: 'run:resumed', runId: 'b', timestamp: new Date(8) },
    )

    state = await events.getRunState('b')
    expect(state!.status).toBe('running')
  })
})
