export interface SequencedEvent { seq: number }


export const sequencer = (events: SequencedEvent[]) => {
  const iterator = events[Symbol.iterator]()
  let cursor = iterator.next()
  const queue = new Map<number, (() => void)[]>()

  const enqueue = (seq: number, fn: () => void) => {
    const fns = queue.get(seq)
    if (fns) {
      fns.push(fn)
    } else {
      queue.set(seq, [fn])
    }
  }

  const dequeue = (seq: number, fn: () => void) => {
    if (queue.has(seq)) {
      const fns = queue.get(seq)!
      const index = fns.indexOf(fn)
      if (index > -1) {
        fns.splice(index, 1)
        if (fns.length === 0) {
          queue.delete(seq)
        }
      }
    }
  }

  const next = (seq: number) => {
    if (cursor.done) { return }
    if (cursor.value.seq !== seq) {
      return
    }
    if (queue.has(cursor.value.seq)) {
      const fns = queue.get(cursor.value.seq)!
      fns[0]!()

      return
    }

    setImmediate(() => {
      cursor = iterator.next()
      if (!cursor.done) {
        const fns = queue.get(cursor.value.seq)
        fns && fns[0]!()
      }
    })
  }

  return {
    turn: (seq: number) => new Promise<void>((resolve, reject) => {
      const check = () => {
        if (cursor.done) {
          reject()

          return false
        } else if (seq === cursor.value.seq) {
          dequeue(seq, check)
          next(seq)
          resolve()

          return false
        }

        return true
      }

      if (check()) {
        enqueue(seq, check)
      }
    })
  }
}
