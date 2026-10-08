import { SUITS, colorOf, createDeck, type Card } from '../../cards/card.js'
import { randomInt, type Rng } from '../../cards/rng.js'
import { shuffle } from '../../cards/shuffle.js'
import { SetupError, type GameDefinition, type PlayerId } from '../../engine/types.js'
import type {
  BusGuess,
  BussenAction,
  BussenOptions,
  BussenState,
  BussenView,
  DealGuess,
  DealRound,
  DriverReason,
  Give,
} from './types.js'

const MIN_PLAYERS = 2
const MAX_PLAYERS = 12
export const PYRAMID_SIZE = 10
export const BUS_LENGTH = 5

/** Row worth of each pyramid slot, bottom row first. */
export const PYRAMID_VALUES = [1, 1, 1, 1, 2, 2, 2, 3, 3, 4] as const

export const decksFor = (players: number): 1 | 2 => (players >= 11 ? 2 : 1)

const DEAL_GUESSES: Record<DealRound, readonly DealGuess[]> = {
  1: ['red', 'black'],
  2: ['higher', 'lower'],
  3: ['inside', 'outside'],
  4: SUITS,
}

/** Whether a deal-round guess is right. Equal ranks always count as wrong. */
export function isDealGuessCorrect(guess: DealGuess, card: Card, hand: Card[]): boolean {
  switch (guess) {
    case 'red':
    case 'black':
      return colorOf(card.suit) === guess
    case 'higher':
    case 'lower': {
      const first = hand[0]!.rank
      if (card.rank === first) return false
      return guess === 'higher' ? card.rank > first : card.rank < first
    }
    case 'inside':
    case 'outside': {
      const low = Math.min(hand[0]!.rank, hand[1]!.rank)
      const high = Math.max(hand[0]!.rank, hand[1]!.rank)
      if (card.rank === low || card.rank === high) return false
      const inside = card.rank > low && card.rank < high
      return guess === 'inside' ? inside : !inside
    }
    default:
      return card.suit === guess
  }
}

function isBusGuessCorrect(guess: BusGuess, card: Card, previous: Card | null): boolean {
  if (guess === 'red' || guess === 'black') return colorOf(card.suit) === guess
  if (!previous || card.rank === previous.rank) return false
  return guess === 'higher' ? card.rank > previous.rank : card.rank < previous.rank
}

const turnPlayerId = (s: BussenState): PlayerId | null => {
  if (s.phase === 'deal') return s.players[s.turn]!.id
  if (s.phase === 'bus') return s.driverId
  return null
}

const isPlayer = (s: BussenState, id: PlayerId) => s.players.some((p) => p.id === id)

function addGive(
  state: BussenState,
  playerId: PlayerId,
  amount: number,
  source: Give['source'],
  targetId: PlayerId | null = null,
): BussenState {
  const give: Give = { id: `g${state.nextGiveId}`, playerId, amount, targetId, source }
  return {
    ...state,
    gives: [...state.gives, give],
    nextGiveId: state.nextGiveId + 1,
    log: targetId ? [...state.log, { type: 'give', playerId, targetId, amount }] : state.log,
  }
}

/** Most cards left, then highest rank sum, then chance. */
export function chooseDriver(
  state: BussenState,
  rng: Rng,
): { driverId: PlayerId; reason: DriverReason } {
  const scored = state.players.map((p) => {
    const hand = state.hands[p.id] ?? []
    return { id: p.id, count: hand.length, sum: hand.reduce((a, c) => a + c.rank, 0) }
  })
  const maxCount = Math.max(...scored.map((s) => s.count))
  const byCount = scored.filter((s) => s.count === maxCount)
  if (byCount.length === 1) return { driverId: byCount[0]!.id, reason: 'cards' }
  const maxSum = Math.max(...byCount.map((s) => s.sum))
  const bySum = byCount.filter((s) => s.sum === maxSum)
  if (bySum.length === 1) return { driverId: bySum[0]!.id, reason: 'rank' }
  return { driverId: bySum[randomInt(rng, bySum.length)]!.id, reason: 'random' }
}

/** Lays out five fresh bus cards, reshuffling the full deck(s) when the bus deck runs low. */
function layBus(state: BussenState, rng: Rng): BussenState {
  let busDeck = state.busDeck
  if (busDeck.length < BUS_LENGTH) busDeck = shuffle(createDeck(state.decks), rng)
  return {
    ...state,
    bus: { cards: busDeck.slice(0, BUS_LENGTH), position: 0 },
    busDeck: busDeck.slice(BUS_LENGTH),
  }
}

function startBus(state: BussenState, rng: Rng): BussenState {
  const { driverId, reason } = chooseDriver(state, rng)
  return layBus(
    {
      ...state,
      phase: 'bus',
      driverId,
      driverReason: reason,
      attempts: 1,
      // Interpretation: every card goes back into the bus deck (stock, pyramid, hands).
      busDeck: shuffle(createDeck(state.decks), rng),
      log: [...state.log, { type: 'driver', playerId: driverId, reason }],
    },
    rng,
  )
}

export const bussen: GameDefinition<BussenState, BussenAction, BussenView, BussenOptions> = {
  id: 'bussen',
  name: 'Bussen',
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
  modes: ['single', 'multi'],

  setup(players, options, rng) {
    if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
      throw new SetupError(`Bussen needs ${MIN_PLAYERS}-${MAX_PLAYERS} players`)
    }
    const decks = decksFor(players.length)
    const deck = shuffle(createDeck(decks), rng)
    return {
      players,
      options,
      decks,
      phase: 'deal',
      // The pyramid is set aside up front so it never runs short.
      pyramid: deck.slice(0, PYRAMID_SIZE),
      deck: deck.slice(PYRAMID_SIZE),
      hands: Object.fromEntries(players.map((p) => [p.id, []])),
      round: 1,
      turn: 0,
      gives: [],
      revealed: 0,
      played: [],
      driverId: null,
      driverReason: null,
      busDeck: [],
      bus: null,
      lastBusCard: null,
      attempts: 0,
      nextGiveId: 1,
      log: [],
    }
  },

  validate(state, action, actorId) {
    if (state.phase === 'finished') return 'GAME_FINISHED'
    if (!isPlayer(state, actorId)) return 'NOT_YOUR_TURN'

    switch (action.type) {
      case 'guess':
        if (state.phase !== 'deal') return 'WRONG_PHASE'
        if (actorId !== turnPlayerId(state)) return 'NOT_YOUR_TURN'
        return DEAL_GUESSES[state.round].includes(action.guess) ? null : 'INVALID_ACTION'

      case 'give': {
        const give = state.gives.find((g) => g.id === action.giveId)
        if (!give || give.targetId !== null) return 'INVALID_ACTION'
        if (give.playerId !== actorId) return 'NOT_YOUR_TURN'
        return action.targetId !== actorId && isPlayer(state, action.targetId)
          ? null
          : 'INVALID_TARGET'
      }

      case 'revealNext':
        if (state.phase !== 'pyramid') return 'WRONG_PHASE'
        return state.revealed < PYRAMID_SIZE ? null : 'WRONG_PHASE'

      case 'playMatch': {
        if (state.phase !== 'pyramid' || state.revealed === 0) return 'WRONG_PHASE'
        const target = state.pyramid[state.revealed - 1]!
        const card = state.hands[actorId]?.find((c) => c.id === action.cardId)
        if (!card || card.rank !== target.rank) return 'INVALID_ACTION'
        if (action.targetId !== undefined) {
          if (action.targetId === actorId || !isPlayer(state, action.targetId)) {
            return 'INVALID_TARGET'
          }
        }
        return null
      }

      case 'startBus':
        if (state.phase !== 'pyramid') return 'WRONG_PHASE'
        return state.revealed === PYRAMID_SIZE ? null : 'WRONG_PHASE'

      case 'busGuess': {
        if (state.phase !== 'bus' || !state.bus) return 'WRONG_PHASE'
        if (actorId !== state.driverId) return 'NOT_YOUR_TURN'
        const allowed = state.bus.position === 0 ? ['red', 'black'] : ['higher', 'lower']
        return allowed.includes(action.guess) ? null : 'INVALID_ACTION'
      }

      default:
        return 'INVALID_ACTION'
    }
  },

  apply(state, action, actorId, rng) {
    switch (action.type) {
      case 'guess': {
        const [card, ...deck] = state.deck
        const hand = state.hands[actorId]!
        const correct = isDealGuessCorrect(action.guess, card!, hand)
        const amount = state.round
        let next: BussenState = {
          ...state,
          deck,
          hands: { ...state.hands, [actorId]: [...hand, card!] },
          log: [
            ...state.log,
            {
              type: 'guess',
              playerId: actorId,
              round: state.round,
              guess: action.guess,
              card: card!,
              correct,
              amount,
            },
          ],
        }
        if (correct) next = addGive(next, actorId, amount, 'deal')

        const lastInRound = state.turn === state.players.length - 1
        if (!lastInRound) return { ...next, turn: state.turn + 1 }
        if (state.round < 4) return { ...next, turn: 0, round: (state.round + 1) as DealRound }
        return { ...next, phase: 'pyramid', turn: 0 }
      }

      case 'give':
        return {
          ...state,
          gives: state.gives.map((g) =>
            g.id === action.giveId ? { ...g, targetId: action.targetId } : g,
          ),
          log: [
            ...state.log,
            {
              type: 'give',
              playerId: actorId,
              targetId: action.targetId,
              amount: state.gives.find((g) => g.id === action.giveId)!.amount,
            },
          ],
        }

      case 'revealNext': {
        const index = state.revealed
        return {
          ...state,
          revealed: index + 1,
          log: [
            ...state.log,
            { type: 'reveal', index, card: state.pyramid[index]!, value: PYRAMID_VALUES[index]! },
          ],
        }
      }

      case 'playMatch': {
        const index = state.revealed - 1
        const value = PYRAMID_VALUES[index]!
        const hand = state.hands[actorId]!
        const card = hand.find((c) => c.id === action.cardId)!
        const next: BussenState = {
          ...state,
          hands: { ...state.hands, [actorId]: hand.filter((c) => c.id !== card.id) },
          played: [...state.played, { playerId: actorId, cardId: card.id, pyramidIndex: index }],
          log: [...state.log, { type: 'match', playerId: actorId, card, value }],
        }
        return addGive(next, actorId, value, 'pyramid', action.targetId ?? null)
      }

      case 'startBus':
        return startBus(state, rng)

      case 'busGuess': {
        const bus = state.bus!
        const card = bus.cards[bus.position]!
        const previous = bus.position > 0 ? bus.cards[bus.position - 1]! : null
        const correct = isBusGuessCorrect(action.guess, card, previous)
        const position = bus.position + 1
        const next: BussenState = {
          ...state,
          lastBusCard: { position, card, correct },
          log: [...state.log, { type: 'busGuess', position, guess: action.guess, card, correct }],
        }
        if (!correct) return layBus({ ...next, attempts: state.attempts + 1 }, rng)
        if (position < BUS_LENGTH) return { ...next, bus: { ...bus, position } }
        return {
          ...next,
          bus: { ...bus, position },
          phase: 'finished',
          log: [...next.log, { type: 'finished', attempts: state.attempts }],
        }
      }
    }
  },

  view(state) {
    const current = state.revealed > 0 ? state.pyramid[state.revealed - 1]! : null
    const matches =
      state.phase === 'pyramid' && current
        ? state.players.flatMap((p) =>
            (state.hands[p.id] ?? [])
              .filter((c) => c.rank === current.rank)
              .map((c) => ({ playerId: p.id, cardId: c.id })),
          )
        : []
    const bus = state.bus
    return {
      players: state.players,
      options: state.options,
      phase: state.phase,
      hands: state.hands,
      round: state.round,
      turnPlayerId: turnPlayerId(state),
      gives: state.gives,
      pyramid: state.pyramid.map((c, i) => (i < state.revealed ? c : null)),
      revealed: state.revealed,
      currentValue: state.revealed > 0 ? PYRAMID_VALUES[state.revealed - 1]! : null,
      matches,
      played: state.played,
      driverId: state.driverId,
      driverReason: state.driverReason,
      bus: bus ? bus.cards.map((c, i) => (i < bus.position ? c : null)) : [],
      busPosition: bus?.position ?? 0,
      lastBusCard: state.lastBusCard,
      attempts: state.attempts,
      deckCount: state.deck.length,
      log: state.log,
    }
  },

  isFinished(state) {
    return state.phase === 'finished'
  },
}
