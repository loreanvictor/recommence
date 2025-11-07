import { sequencer } from '../sequencer'


describe('sequencer', () => {
  it('ensures events happen as sequenced.', async () => {
    const events = [
      { seq: 1, val: 'A' },
      { seq: 2, val: 'B' },
      { seq: 3, val: 'C' },
      { seq: 4, val: 'D' },
    ]

    const seq = sequencer(events)

    const ob1: string[] = []
    const ob2: string[] = []

    const handleSeq = async (e: { seq: number, val: string }) => {
      await seq.turn(e.seq)
      ob1.push(e.val)
    }

    const handleUnSeq = async (e: { seq: number, val: string }) => {
      ob2.push(e.val)
    }

    const o = [0, 2, 3, 2, 1]
    await Promise.all(o.map(i => handleSeq(events[i])))
    await Promise.all(o.map(i => handleUnSeq(events[i])))

    expect(ob1).toStrictEqual(['A', 'B', 'C', 'C', 'D'])
    expect(ob2).toStrictEqual(['A', 'C', 'D', 'C', 'B'])
  })
})
