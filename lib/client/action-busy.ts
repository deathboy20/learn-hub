type Listener = (busy: boolean, label: string | null) => void

let pending = 0
let currentLabel: string | null = null
const listeners = new Set<Listener>()

function emit() {
  const busy = pending > 0
  for (const listener of listeners) listener(busy, currentLabel)
}

export function subscribeActionBusy(listener: Listener) {
  listeners.add(listener)
  listener(pending > 0, currentLabel)
  return () => {
    listeners.delete(listener)
  }
}

export async function withActionBusy<T>(label: string, run: () => Promise<T>): Promise<T> {
  pending += 1
  currentLabel = label
  emit()
  try {
    return await run()
  } finally {
    pending -= 1
    if (pending <= 0) {
      pending = 0
      currentLabel = null
    }
    emit()
  }
}
