import type { RunnerStatus } from '../runtime/runner'
import { da } from '../i18n/da'

/** Discreet notice while the room connection is down; actions are blocked meanwhile. */
export function ConnectionBanner({ status }: { status: RunnerStatus }) {
  if (status === 'ready') return null
  return (
    <div role="status" className="fade-in mx-4 mb-2 rounded-full bg-raise px-4 py-2 text-center">
      <span className="label text-paper">{da.room.reconnecting}</span>
    </div>
  )
}
