import type { Card, Suit } from '../../cards/card.js'
import type { Player, PlayerId } from '../../engine/types.js'
import type { PenaltySetting } from '../../text/penalty.js'

export interface BussenOptions {
  penalty: PenaltySetting
}

export type BussenPhase = 'deal' | 'pyramid' | 'bus' | 'finished'

/** Round 1: colour, 2: vs card 1, 3: vs cards 1 and 2, 4: suit. */
export type DealRound = 1 | 2 | 3 | 4
export type DealGuess = 'red' | 'black' | 'higher' | 'lower' | 'inside' | 'outside' | Suit
export type BusGuess = 'red' | 'black' | 'higher' | 'lower'

/** Penalty a player may hand out. Choosing a recipient is optional and never blocks play. */
export interface Give {
  id: string
  playerId: PlayerId
  amount: number
  targetId: PlayerId | null
  source: 'deal' | 'pyramid'
}

export type DriverReason = 'cards' | 'rank' | 'random'

export type BussenLogEntry =
  | {
      type: 'guess'
      playerId: PlayerId
      round: DealRound
      guess: DealGuess
      card: Card
      correct: boolean
      amount: number
    }
  | { type: 'give'; playerId: PlayerId; targetId: PlayerId; amount: number }
  | { type: 'reveal'; index: number; card: Card; value: number }
  | { type: 'match'; playerId: PlayerId; card: Card; value: number }
  | { type: 'driver'; playerId: PlayerId; reason: DriverReason }
  | { type: 'busGuess'; position: number; guess: BusGuess; card: Card; correct: boolean }
  | { type: 'finished'; attempts: number }

export interface BusAttempt {
  /** Cards laid out for this attempt; hidden until reached. */
  cards: Card[]
  /** How many of them are turned (all correct so far). */
  position: number
}

export interface BussenState {
  players: Player[]
  options: BussenOptions
  decks: 1 | 2
  phase: BussenPhase
  /** Stock; the next card is index 0. */
  deck: Card[]
  hands: Record<PlayerId, Card[]>
  round: DealRound
  turn: number
  gives: Give[]
  /** Ten cards: indexes 0-3 bottom row (worth 1), 4-6 (2), 7-8 (3), 9 top (4). */
  pyramid: Card[]
  revealed: number
  /** Card ids played onto pyramid cards. */
  played: Array<{ playerId: PlayerId; cardId: string; pyramidIndex: number }>
  driverId: PlayerId | null
  driverReason: DriverReason | null
  busDeck: Card[]
  bus: BusAttempt | null
  /** The last turned bus card, kept visible after a miss. */
  lastBusCard: { position: number; card: Card; correct: boolean } | null
  attempts: number
  nextGiveId: number
  log: BussenLogEntry[]
}

export type BussenAction =
  | { type: 'guess'; guess: DealGuess }
  | { type: 'give'; giveId: string; targetId: PlayerId }
  | { type: 'revealNext' }
  | { type: 'playMatch'; cardId: string; targetId?: PlayerId }
  | { type: 'startBus' }
  | { type: 'busGuess'; guess: BusGuess }

export interface BussenMatch {
  playerId: PlayerId
  cardId: string
}

/** Everything public; hidden: stock order, unturned pyramid and bus cards. */
export interface BussenView {
  players: Player[]
  options: BussenOptions
  phase: BussenPhase
  hands: Record<PlayerId, Card[]>
  round: DealRound
  turnPlayerId: PlayerId | null
  gives: Give[]
  /** Turned pyramid cards; null where still face down. */
  pyramid: Array<Card | null>
  revealed: number
  currentValue: number | null
  matches: BussenMatch[]
  played: BussenState['played']
  driverId: PlayerId | null
  driverReason: DriverReason | null
  /** Bus cards; null while face down. */
  bus: Array<Card | null>
  busPosition: number
  lastBusCard: BussenState['lastBusCard']
  attempts: number
  deckCount: number
  log: BussenLogEntry[]
}
