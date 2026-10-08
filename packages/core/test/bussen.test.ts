import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BUSSEN_OPTIONS,
  PYRAMID_VALUES,
  bussen as game,
  chooseDriver,
  createSeededRng,
  isDealGuessCorrect,
  type BussenAction,
  type BussenState,
  type Card,
} from '../src/index.js'
import { card, players } from './helpers.js'

const rng = createSeededRng(1)

function start(n = 2): BussenState {
  return game.setup(players(n), DEFAULT_BUSSEN_OPTIONS, rng)
}

function act(state: BussenState, action: BussenAction, actor: string): BussenState {
  const err = game.validate(state, action, actor)
  if (err) throw new Error(`${action.type} by ${actor} rejected: ${err}`)
  return game.apply(state, action, actor, rng)
}

/** Plays the whole deal phase with fixed guesses; returns the state at the pyramid. */
function dealAll(state: BussenState): BussenState {
  const guesses = { 1: 'red', 2: 'higher', 3: 'inside', 4: 'hearts' } as const
  let s = state
  while (s.phase === 'deal') {
    s = act(s, { type: 'guess', guess: guesses[s.round] }, s.players[s.turn]!.id)
  }
  return s
}

describe('setup', () => {
  it('uses one deck up to 10 players and two from 11', () => {
    expect(start(10).decks).toBe(1)
    expect(start(10).deck.length + start(10).pyramid.length).toBe(52)
    const big = start(11)
    expect(big.decks).toBe(2)
    expect(big.deck.length + big.pyramid.length).toBe(104)
    expect(new Set([...big.deck, ...big.pyramid].map((c) => c.id)).size).toBe(104)
  })

  it('has enough cards for 12 players', () => {
    const s = dealAll(start(12))
    expect(s.phase).toBe('pyramid')
    for (const p of s.players) expect(s.hands[p.id]).toHaveLength(4)
  })

  it('rejects too few or too many players', () => {
    expect(() => start(1)).toThrow()
    expect(() => start(13)).toThrow()
  })
})

describe('deal rounds', () => {
  const hand = (...cards: Card[]) => cards

  it('round 1: colour', () => {
    expect(isDealGuessCorrect('red', card(5, 'hearts'), [])).toBe(true)
    expect(isDealGuessCorrect('red', card(5, 'diamonds'), [])).toBe(true)
    expect(isDealGuessCorrect('red', card(5, 'spades'), [])).toBe(false)
    expect(isDealGuessCorrect('black', card(5, 'clubs'), [])).toBe(true)
  })

  it('round 2: higher or lower, same rank is wrong', () => {
    const h = hand(card(8))
    expect(isDealGuessCorrect('higher', card(9), h)).toBe(true)
    expect(isDealGuessCorrect('lower', card(9), h)).toBe(false)
    expect(isDealGuessCorrect('lower', card(2), h)).toBe(true)
    expect(isDealGuessCorrect('higher', card(8), h)).toBe(false)
    expect(isDealGuessCorrect('lower', card(8), h)).toBe(false)
  })

  it('round 3: inside or outside, touching a boundary is wrong', () => {
    const h = hand(card(10), card(4))
    expect(isDealGuessCorrect('inside', card(7), h)).toBe(true)
    expect(isDealGuessCorrect('outside', card(7), h)).toBe(false)
    expect(isDealGuessCorrect('outside', card(14), h)).toBe(true)
    expect(isDealGuessCorrect('outside', card(2), h)).toBe(true)
    expect(isDealGuessCorrect('inside', card(4), h)).toBe(false)
    expect(isDealGuessCorrect('outside', card(10), h)).toBe(false)
  })

  it('round 3 with card 1 equal to card 2: inside never wins', () => {
    const h = hand(card(9), card(9, 'hearts'))
    expect(isDealGuessCorrect('inside', card(5), h)).toBe(false)
    expect(isDealGuessCorrect('inside', card(9, 'clubs'), h)).toBe(false)
    expect(isDealGuessCorrect('outside', card(5), h)).toBe(true)
    expect(isDealGuessCorrect('outside', card(9, 'clubs'), h)).toBe(false)
  })

  it('round 4: suit', () => {
    expect(isDealGuessCorrect('clubs', card(3, 'clubs'), [])).toBe(true)
    expect(isDealGuessCorrect('spades', card(3, 'clubs'), [])).toBe(false)
  })

  it('wrong guess takes the round number, right guess gives it out', () => {
    let s = start(2)
    s = { ...s, deck: [card(5, 'hearts'), card(5, 'spades'), ...s.deck] }
    s = act(s, { type: 'guess', guess: 'red' }, 'p0')
    s = act(s, { type: 'guess', guess: 'red' }, 'p1')
    expect(s.log[0]).toMatchObject({ type: 'guess', correct: true, amount: 1 })
    expect(s.log[1]).toMatchObject({ type: 'guess', correct: false, amount: 1 })
    expect(s.gives).toEqual([
      { id: 'g1', playerId: 'p0', amount: 1, targetId: null, source: 'deal' },
    ])
    expect(s.hands.p0).toHaveLength(1)
    expect(s.round).toBe(2)
    expect(s.turn).toBe(0)
  })

  it('handing out is optional and never blocks the game', () => {
    let s = start(2)
    s = { ...s, deck: [card(5, 'hearts'), ...s.deck] }
    s = act(s, { type: 'guess', guess: 'red' }, 'p0')
    // p1 plays on although p0 has not picked a recipient.
    s = act(s, { type: 'guess', guess: 'red' }, 'p1')
    expect(game.validate(s, { type: 'give', giveId: 'g1', targetId: 'p0' }, 'p0')).toBe(
      'INVALID_TARGET',
    )
    expect(game.validate(s, { type: 'give', giveId: 'g1', targetId: 'p1' }, 'p1')).toBe(
      'NOT_YOUR_TURN',
    )
    s = act(s, { type: 'give', giveId: 'g1', targetId: 'p1' }, 'p0')
    expect(s.gives[0]!.targetId).toBe('p1')
    expect(s.log.at(-1)).toEqual({ type: 'give', playerId: 'p0', targetId: 'p1', amount: 1 })
    expect(game.validate(s, { type: 'give', giveId: 'g1', targetId: 'p1' }, 'p0')).toBe(
      'INVALID_ACTION',
    )
  })

  it('only accepts the guesses of the current round', () => {
    const s = start(2)
    expect(game.validate(s, { type: 'guess', guess: 'higher' }, 'p0')).toBe('INVALID_ACTION')
    expect(game.validate(s, { type: 'guess', guess: 'hearts' }, 'p0')).toBe('INVALID_ACTION')
  })

  it('moves to the pyramid after four rounds', () => {
    const s = dealAll(start(3))
    expect(s.phase).toBe('pyramid')
    expect(s.log.filter((e) => e.type === 'guess')).toHaveLength(12)
  })
})

describe('pyramid', () => {
  function pyramidWith(pyramidCards: Card[], hands: Record<string, Card[]>): BussenState {
    const s = dealAll(start(2))
    return { ...s, pyramid: pyramidCards, hands }
  }

  it('rows are worth 1, 2, 3 and 4 from the bottom', () => {
    expect([...PYRAMID_VALUES]).toEqual([1, 1, 1, 1, 2, 2, 2, 3, 3, 4])
  })

  it('a match removes the card from the hand and hands out the row value', () => {
    const pyramid = [card(7), ...Array.from({ length: 9 }, () => card(2))]
    const seven = card(7, 'hearts')
    let s = pyramidWith(pyramid, { p0: [seven, card(9)], p1: [card(3)] })
    expect(game.validate(s, { type: 'playMatch', cardId: seven.id }, 'p0')).toBe('WRONG_PHASE')
    s = act(s, { type: 'revealNext' }, 'p0')
    expect(game.view(s, 'table').matches).toEqual([{ playerId: 'p0', cardId: seven.id }])
    s = act(s, { type: 'playMatch', cardId: seven.id, targetId: 'p1' }, 'p0')
    expect(s.hands.p0!.map((c) => c.id)).not.toContain(seven.id)
    expect(s.gives.at(-1)).toMatchObject({ playerId: 'p0', amount: 1, targetId: 'p1' })
    expect(game.view(s, 'table').matches).toEqual([])
  })

  it('rejects cards that do not match or that the player does not hold', () => {
    const pyramid = [card(7), ...Array.from({ length: 9 }, () => card(2))]
    const nine = card(9)
    let s = pyramidWith(pyramid, { p0: [nine], p1: [card(7, 'clubs')] })
    s = act(s, { type: 'revealNext' }, 'p1')
    expect(game.validate(s, { type: 'playMatch', cardId: nine.id }, 'p0')).toBe('INVALID_ACTION')
    const p1Card = s.hands.p1![0]!
    expect(game.validate(s, { type: 'playMatch', cardId: p1Card.id }, 'p0')).toBe('INVALID_ACTION')
  })

  it('unused matches lapse when the next card is turned', () => {
    const pyramid = [card(7), card(8), ...Array.from({ length: 8 }, () => card(2))]
    const seven = card(7, 'hearts')
    let s = pyramidWith(pyramid, { p0: [seven], p1: [] })
    s = act(s, { type: 'revealNext' }, 'p0')
    s = act(s, { type: 'revealNext' }, 'p0')
    expect(game.validate(s, { type: 'playMatch', cardId: seven.id }, 'p0')).toBe('INVALID_ACTION')
  })

  it('the bus starts only when all ten cards are turned', () => {
    let s = dealAll(start(2))
    expect(game.validate(s, { type: 'startBus' }, 'p0')).toBe('WRONG_PHASE')
    for (let i = 0; i < 10; i++) s = act(s, { type: 'revealNext' }, 'p0')
    expect(game.validate(s, { type: 'revealNext' }, 'p0')).toBe('WRONG_PHASE')
    s = act(s, { type: 'startBus' }, 'p0')
    expect(s.phase).toBe('bus')
    expect(s.bus!.cards).toHaveLength(5)
    expect(s.attempts).toBe(1)
  })
})

describe('choosing the driver', () => {
  const base = () => dealAll(start(3))

  it('most cards left drives', () => {
    const s = { ...base(), hands: { p0: [card(2)], p1: [card(2), card(3)], p2: [] } }
    expect(chooseDriver(s, rng)).toEqual({ driverId: 'p1', reason: 'cards' })
  })

  it('a tie on cards goes to the highest rank sum', () => {
    const s = { ...base(), hands: { p0: [card(14)], p1: [card(13)], p2: [] } }
    expect(chooseDriver(s, rng)).toEqual({ driverId: 'p0', reason: 'rank' })
  })

  it('a full tie is settled by the rng', () => {
    const s = { ...base(), hands: { p0: [card(5)], p1: [card(5, 'hearts')], p2: [] } }
    const picks = new Set(
      Array.from({ length: 30 }, (_, i) => chooseDriver(s, createSeededRng(i)).driverId),
    )
    expect([...picks].sort()).toEqual(['p0', 'p1'])
    expect(chooseDriver(s, rng).reason).toBe('random')
  })
})

describe('the bus', () => {
  function onBus(cards: Card[]): BussenState {
    let s = dealAll(start(2))
    for (let i = 0; i < 10; i++) s = act(s, { type: 'revealNext' }, 'p0')
    s = act(s, { type: 'startBus' }, 'p0')
    return { ...s, bus: { cards, position: 0 } }
  }

  it('only the driver may guess, with colour first and then higher/lower', () => {
    const s = onBus([card(5, 'hearts'), card(7), card(9), card(11), card(13)])
    const other = s.players.find((p) => p.id !== s.driverId)!.id
    expect(game.validate(s, { type: 'busGuess', guess: 'red' }, other)).toBe('NOT_YOUR_TURN')
    expect(game.validate(s, { type: 'busGuess', guess: 'higher' }, s.driverId!)).toBe(
      'INVALID_ACTION',
    )
    expect(game.validate(s, { type: 'guess', guess: 'red' }, s.driverId!)).toBe('WRONG_PHASE')
  })

  it('five right guesses finish the game', () => {
    let s = onBus([card(5, 'hearts'), card(7), card(9), card(4), card(13)])
    const d = s.driverId!
    s = act(s, { type: 'busGuess', guess: 'red' }, d)
    s = act(s, { type: 'busGuess', guess: 'higher' }, d)
    s = act(s, { type: 'busGuess', guess: 'higher' }, d)
    s = act(s, { type: 'busGuess', guess: 'lower' }, d)
    expect(game.isFinished(s)).toBe(false)
    s = act(s, { type: 'busGuess', guess: 'higher' }, d)
    expect(game.isFinished(s)).toBe(true)
    expect(s.log.at(-1)).toEqual({ type: 'finished', attempts: 1 })
  })

  it('a wrong guess lays five new cards and counts an attempt; same rank is wrong', () => {
    let s = onBus([card(5, 'hearts'), card(5, 'spades'), card(9), card(4), card(13)])
    const d = s.driverId!
    s = act(s, { type: 'busGuess', guess: 'red' }, d)
    s = act(s, { type: 'busGuess', guess: 'higher' }, d)
    expect(s.attempts).toBe(2)
    expect(s.bus!.position).toBe(0)
    expect(s.lastBusCard).toMatchObject({ position: 2, correct: false })
    expect(s.log.at(-1)).toMatchObject({ type: 'busGuess', position: 2, correct: false })
  })

  it('reshuffles when the bus deck runs low', () => {
    let s = onBus([card(5, 'spades'), card(7), card(9), card(4), card(13)])
    s = { ...s, busDeck: [card(2)] }
    s = act(s, { type: 'busGuess', guess: 'red' }, s.driverId!)
    expect(s.bus!.cards).toHaveLength(5)
    expect(s.busDeck.length).toBe(52 - 5)
  })
})

describe('view', () => {
  it('hides the stock, unturned pyramid cards and unturned bus cards', () => {
    let s = dealAll(start(2))
    s = act(s, { type: 'revealNext' }, 'p0')
    const v = game.view(s, 'p1')
    expect(v).not.toHaveProperty('deck')
    expect(v.pyramid.filter(Boolean)).toHaveLength(1)
    const json = JSON.stringify(v)
    for (const c of s.pyramid.slice(1)) expect(json).not.toContain(`"${c.id}"`)
    for (const c of s.deck) expect(json).not.toContain(`"${c.id}"`)

    for (let i = 1; i < 10; i++) s = act(s, { type: 'revealNext' }, 'p0')
    s = act(s, { type: 'startBus' }, 'p0')
    // Bus cards come from a fresh deck, so ids repeat elsewhere; check the slots instead.
    expect(game.view(s, 'table').bus).toEqual([null, null, null, null, null])
    expect(game.view(s, 'table')).not.toHaveProperty('busDeck')
  })
})

describe('validate', () => {
  it('rejects strangers, wrong turns and finished games', () => {
    const s = start(2)
    expect(game.validate(s, { type: 'guess', guess: 'red' }, 'p1')).toBe('NOT_YOUR_TURN')
    expect(game.validate(s, { type: 'guess', guess: 'red' }, 'x')).toBe('NOT_YOUR_TURN')
    expect(game.validate(s, { type: 'revealNext' }, 'p0')).toBe('WRONG_PHASE')
    expect(game.validate({ ...s, phase: 'finished' }, { type: 'guess', guess: 'red' }, 'p0')).toBe(
      'GAME_FINISHED',
    )
  })

  it('a full random game finishes', () => {
    const r = createSeededRng(99)
    let s = game.setup(players(4), DEFAULT_BUSSEN_OPTIONS, r)
    let steps = 0
    while (!game.isFinished(s) && steps < 5000) {
      steps++
      const v = game.view(s, 'table')
      let action: BussenAction
      let actor = s.players[0]!.id
      if (s.phase === 'deal') {
        actor = v.turnPlayerId!
        action = {
          type: 'guess',
          guess: (['red', 'higher', 'inside', 'hearts'] as const)[s.round - 1]!,
        }
      } else if (s.phase === 'pyramid') {
        action = s.revealed < 10 ? { type: 'revealNext' } : { type: 'startBus' }
      } else {
        actor = s.driverId!
        action = {
          type: 'busGuess',
          guess: s.bus!.position === 0 ? 'red' : r.next() < 0.5 ? 'higher' : 'lower',
        }
      }
      expect(game.validate(s, action, actor)).toBeNull()
      s = game.apply(s, action, actor, r)
      expect(JSON.parse(JSON.stringify(s))).toEqual(s)
    }
    expect(game.isFinished(s)).toBe(true)
  })
})
