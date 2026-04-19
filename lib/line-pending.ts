import { EventEmitter } from 'node:events'

export const pendingEmitter = new EventEmitter()
pendingEmitter.setMaxListeners(100)

let pendingCount = 0

export function incrementPending() {
  pendingCount++
  pendingEmitter.emit('update', pendingCount)
}
export function getPending() { return pendingCount }
export function clearPending() { pendingCount = 0 }
