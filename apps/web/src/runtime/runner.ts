import type { ErrorCode, PlayerId } from '@kortspil/core'

export type RunnerStatus = 'ready' | 'connecting' | 'reconnecting' | 'offline'

/**
 * What the UI talks to. Implemented locally (one phone) and over the network
 * (several phones); screens never know which one they have.
 */
export interface Runner<View, Action> {
  getView(): View
  getStatus(): RunnerStatus
  subscribe(listener: () => void): () => void
  /** `actingAs` plays on behalf of another player (single phone, guests). */
  dispatch(action: Action, actingAs?: PlayerId): Promise<ErrorCode | null>
  dispose(): void
}
