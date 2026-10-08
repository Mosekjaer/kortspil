import { createDeck } from '../../cards/card.js'
import { shuffle } from '../../cards/shuffle.js'
import { SetupError, type GameDefinition, type PlayerId } from '../../engine/types.js'
import { MAX_CUSTOM_RULE_LENGTH } from './defaultRules.js'
import type {
  PendingChoice,
  RingOfFireAction,
  RingOfFireOptions,
  RingOfFireState,
  RingOfFireView,
} from './types.js'

const MIN_PLAYERS = 2
const MAX_PLAYERS = 12

/** Ranks whose rule requires a choice before the turn passes on. */
const CHOICE_BY_RANK: Partial<Record<number, PendingChoice>> = { 8: 'mate', 11: 'rule' }

function turnPlayerId(state: RingOfFireState): PlayerId {
  return state.players[state.turn]!.id
}

/** Passes the turn, or finishes the game when the deck is exhausted. */
function endTurn(state: RingOfFireState): RingOfFireState {
  if (state.deck.length === 0) {
    return {
      ...state,
      phase: 'finished',
      pending: null,
      finishReason: 'deckEmpty',
      log: [...state.log, { type: 'finished', reason: 'deckEmpty' }],
    }
  }
  return {
    ...state,
    phase: 'draw',
    pending: null,
    turn: (state.turn + 1) % state.players.length,
  }
}

function draw(state: RingOfFireState, actorId: PlayerId): RingOfFireState {
  const [card, ...deck] = state.deck
  if (!card) return state
  let next: RingOfFireState = {
    ...state,
    deck,
    lastCard: card,
    lastDrawerId: actorId,
    log: [...state.log, { type: 'draw', playerId: actorId, card }],
  }

  switch (card.rank) {
    case 5:
      next = { ...next, thumbMaster: actorId }
      break
    case 12:
      next = { ...next, questionMaster: actorId }
      break
    case 13: {
      const kingsDrawn = next.kingsDrawn + 1
      next = { ...next, kingsDrawn }
      if (kingsDrawn === 4 && next.options.endOnFourthKing) {
        return {
          ...next,
          phase: 'finished',
          pending: null,
          finishReason: 'fourthKing',
          log: [...next.log, { type: 'finished', reason: 'fourthKing' }],
        }
      }
      break
    }
  }

  const choice = CHOICE_BY_RANK[card.rank]
  if (choice) return { ...next, phase: 'choice', pending: choice }
  return endTurn(next)
}

export const ringOfFire: GameDefinition<
  RingOfFireState,
  RingOfFireAction,
  RingOfFireView,
  RingOfFireOptions
> = {
  id: 'ringOfFire',
  name: 'Ring of Fire',
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
  modes: ['single', 'multi'],

  setup(players, options, rng) {
    if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
      throw new SetupError(`Ring of Fire needs ${MIN_PLAYERS}-${MAX_PLAYERS} players`)
    }
    return {
      players,
      options,
      deck: shuffle(createDeck(1), rng),
      turn: 0,
      phase: 'draw',
      pending: null,
      lastCard: null,
      lastDrawerId: null,
      thumbMaster: null,
      questionMaster: null,
      mates: [],
      customRules: [],
      kingsDrawn: 0,
      finishReason: null,
      log: [],
    }
  },

  validate(state, action, actorId) {
    if (state.phase === 'finished') return 'GAME_FINISHED'
    if (actorId !== turnPlayerId(state)) return 'NOT_YOUR_TURN'

    switch (action.type) {
      case 'draw':
        return state.phase === 'draw' ? null : 'WRONG_PHASE'
      case 'skip':
        return state.phase === 'choice' ? null : 'WRONG_PHASE'
      case 'chooseMate': {
        if (state.pending !== 'mate') return 'WRONG_PHASE'
        const valid =
          action.targetId !== actorId && state.players.some((p) => p.id === action.targetId)
        return valid ? null : 'INVALID_TARGET'
      }
      case 'addRule': {
        if (state.pending !== 'rule') return 'WRONG_PHASE'
        const text = typeof action.text === 'string' ? action.text.trim() : ''
        return text.length > 0 && text.length <= MAX_CUSTOM_RULE_LENGTH ? null : 'INVALID_TEXT'
      }
      default:
        return 'INVALID_ACTION'
    }
  },

  apply(state, action, actorId) {
    switch (action.type) {
      case 'draw':
        return draw(state, actorId)
      case 'chooseMate':
        return endTurn({
          ...state,
          mates: [...state.mates, [actorId, action.targetId]],
          log: [...state.log, { type: 'mate', playerId: actorId, targetId: action.targetId }],
        })
      case 'addRule': {
        const text = action.text.trim()
        return endTurn({
          ...state,
          customRules: [...state.customRules, { text, by: actorId }],
          log: [...state.log, { type: 'rule', playerId: actorId, text }],
        })
      }
      case 'skip':
        return endTurn({
          ...state,
          log: [...state.log, { type: 'skip', playerId: actorId, choice: state.pending! }],
        })
    }
  },

  view(state) {
    const { deck, ...rest } = state
    return { ...rest, deckCount: deck.length, turnPlayerId: turnPlayerId(state) }
  },

  isFinished(state) {
    return state.phase === 'finished'
  },
}
