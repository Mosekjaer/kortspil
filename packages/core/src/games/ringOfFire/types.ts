import type { Card, Rank } from '../../cards/card.js'
import type { Player, PlayerId } from '../../engine/types.js'
import type { PenaltySetting, RuleText } from '../../text/penalty.js'

export interface CardRule extends RuleText {
  name: string
}

/** One editable rule per rank. Effects are fixed per rank; only texts are editable. */
export type RuleSet = Record<Rank, CardRule>

export interface RingOfFireOptions {
  rules: RuleSet
  penalty: PenaltySetting
  /** End the game as soon as the 4th king is drawn. */
  endOnFourthKing: boolean
}

export type PendingChoice = 'mate' | 'rule'

export type Phase = 'draw' | 'choice' | 'finished'

export type FinishReason = 'deckEmpty' | 'fourthKing'

export interface CustomRule {
  text: string
  by: PlayerId
}

export type LogEntry =
  | { type: 'draw'; playerId: PlayerId; card: Card }
  | { type: 'mate'; playerId: PlayerId; targetId: PlayerId }
  | { type: 'rule'; playerId: PlayerId; text: string }
  | { type: 'skip'; playerId: PlayerId; choice: PendingChoice }
  | { type: 'finished'; reason: FinishReason }

export interface RingOfFireState {
  players: Player[]
  options: RingOfFireOptions
  /** Remaining cards; the next draw takes index 0. */
  deck: Card[]
  turn: number
  phase: Phase
  pending: PendingChoice | null
  lastCard: Card | null
  lastDrawerId: PlayerId | null
  thumbMaster: PlayerId | null
  questionMaster: PlayerId | null
  mates: Array<[PlayerId, PlayerId]>
  customRules: CustomRule[]
  kingsDrawn: number
  finishReason: FinishReason | null
  log: LogEntry[]
}

export type RingOfFireAction =
  | { type: 'draw' }
  | { type: 'chooseMate'; targetId: PlayerId }
  | { type: 'addRule'; text: string }
  | { type: 'skip' }

/** Everything is public in Ring of Fire except the order of the deck. */
export interface RingOfFireView extends Omit<RingOfFireState, 'deck'> {
  deckCount: number
  turnPlayerId: PlayerId
}
