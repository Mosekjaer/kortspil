import type { ErrorCode, PlayerId } from '@kortspil/core'
import { useRoom } from '../room/roomStore'
import type { Runner, RunnerStatus } from './runner'

/**
 * Talks to the authoritative server. Views arrive as full snapshots through the
 * room store; actions go out as game:action with an ack.
 */
export function createRemoteRunner<View, Action>(): Runner<View, Action> {
  const getView = () => useRoom.getState().game?.view as View
  const getStatus = (): RunnerStatus => {
    const s = useRoom.getState().status
    return s === 'ready' ? 'ready' : s === 'reconnecting' ? 'reconnecting' : 'connecting'
  }
  return {
    getView,
    getStatus,
    subscribe: (listener) => useRoom.subscribe(listener),
    async dispatch(action: Action, actingAs?: PlayerId): Promise<ErrorCode | null> {
      if (getStatus() !== 'ready') return 'WRONG_PHASE'
      const payload = actingAs ? { action, actingAs } : { action }
      return (await useRoom.getState().call('game:action', payload)) as ErrorCode | null
    },
    dispose() {},
  }
}
