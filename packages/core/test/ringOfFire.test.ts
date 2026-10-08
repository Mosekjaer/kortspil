import { describe, expect, it } from 'vitest'
import {
  DEFAULT_OPTIONS,
  RANKS,
  createSeededRng,
  ringOfFire as game,
  type Card,
  type RingOfFireAction,
  type RingOfFireState,
} from '../src/index.js'
import { card, players } from './helpers.js'

const rng = createSeededRng(1)

function start(deck: Card[], n = 3, options = DEFAULT_OPTIONS): RingOfFireState {
  return { ...game.setup(players(n), options, rng), deck }
}

/** Validates then applies, failing loudly on rejection. */
function act(state: RingOfFireState, action: RingOfFireAction, actor: string): RingOfFireState {
  const err = game.validate(state, action, actor)
  if (err) throw new Error(`${action.type} by ${actor} rejected: ${err}`)
  return game.apply(state, action, actor, rng)
}

const filler = () => Array.from({ length: 5 }, () => card(3))

describe('setup', () => {
  it('shuffles a full deck and starts with the first player', () => {
    const s = game.setup(players(4), DEFAULT_OPTIONS, createSeededRng(9))
    expect(s.deck).toHaveLength(52)
    expect(game.view(s, 'table').turnPlayerId).toBe('p0')
    expect(s.phase).toBe('draw')
  })

  it('rejects too few or too many players', () => {
    expect(() => game.setup(players(1), DEFAULT_OPTIONS, rng)).toThrow()
    expect(() => game.setup(players(13), DEFAULT_OPTIONS, rng)).toThrow()
  })

  it('is deterministic for the same seed', () => {
    const a = game.setup(players(3), DEFAULT_OPTIONS, createSeededRng(5))
    const b = game.setup(players(3), DEFAULT_OPTIONS, createSeededRng(5))
    expect(a).toEqual(b)
  })
})

describe('every card', () => {
  for (const rank of RANKS) {
    it(`rank ${rank} logs the draw and resolves`, () => {
      let s = start([card(rank), ...filler()])
      s = act(s, { type: 'draw' }, 'p0')
      expect(s.lastCard?.rank).toBe(rank)
      expect(s.lastDrawerId).toBe('p0')
      expect(s.log[0]).toMatchObject({ type: 'draw', playerId: 'p0' })

      if (rank === 8 || rank === 11) {
        expect(s.phase).toBe('choice')
        expect(s.pending).toBe(rank === 8 ? 'mate' : 'rule')
        expect(game.view(s, 'table').turnPlayerId).toBe('p0')
        s = act(s, { type: 'skip' }, 'p0')
      }
      expect(s.phase).toBe('draw')
      expect(game.view(s, 'table').turnPlayerId).toBe('p1')
    })
  }
})

describe('masters', () => {
  it('a new thumb master replaces the old one', () => {
    let s = start([card(5), card(5), ...filler()])
    s = act(s, { type: 'draw' }, 'p0')
    expect(s.thumbMaster).toBe('p0')
    s = act(s, { type: 'draw' }, 'p1')
    expect(s.thumbMaster).toBe('p1')
  })

  it('a new question master replaces the old one', () => {
    let s = start([card(12), card(2), card(12), ...filler()])
    s = act(s, { type: 'draw' }, 'p0')
    s = act(s, { type: 'draw' }, 'p1')
    expect(s.questionMaster).toBe('p0')
    s = act(s, { type: 'draw' }, 'p2')
    expect(s.questionMaster).toBe('p2')
  })
})

describe('mate (8)', () => {
  it('blocks the turn until a mate is chosen', () => {
    let s = start([card(8), ...filler()])
    s = act(s, { type: 'draw' }, 'p0')
    expect(game.validate(s, { type: 'draw' }, 'p0')).toBe('WRONG_PHASE')
    expect(game.validate(s, { type: 'draw' }, 'p1')).toBe('NOT_YOUR_TURN')
    expect(game.validate(s, { type: 'addRule', text: 'x' }, 'p0')).toBe('WRONG_PHASE')
    s = act(s, { type: 'chooseMate', targetId: 'p2' }, 'p0')
    expect(s.mates).toEqual([['p0', 'p2']])
    expect(s.log.at(-1)).toEqual({ type: 'mate', playerId: 'p0', targetId: 'p2' })
    expect(game.view(s, 'table').turnPlayerId).toBe('p1')
  })

  it('rejects self and unknown players', () => {
    const s = act(start([card(8), ...filler()]), { type: 'draw' }, 'p0')
    expect(game.validate(s, { type: 'chooseMate', targetId: 'p0' }, 'p0')).toBe('INVALID_TARGET')
    expect(game.validate(s, { type: 'chooseMate', targetId: 'nope' }, 'p0')).toBe('INVALID_TARGET')
  })
})

describe('new rule (jack)', () => {
  it('blocks the turn until a rule is written, then keeps it', () => {
    let s = start([card(11), ...filler()])
    s = act(s, { type: 'draw' }, 'p0')
    expect(game.validate(s, { type: 'draw' }, 'p0')).toBe('WRONG_PHASE')
    expect(game.validate(s, { type: 'chooseMate', targetId: 'p1' }, 'p0')).toBe('WRONG_PHASE')
    s = act(s, { type: 'addRule', text: '  Ingen må sige "drik"  ' }, 'p0')
    expect(s.customRules).toEqual([{ text: 'Ingen må sige "drik"', by: 'p0' }])
    expect(s.phase).toBe('draw')
  })

  it('rejects empty and too long rules', () => {
    const s = act(start([card(11), ...filler()]), { type: 'draw' }, 'p0')
    expect(game.validate(s, { type: 'addRule', text: '   ' }, 'p0')).toBe('INVALID_TEXT')
    expect(game.validate(s, { type: 'addRule', text: 'x'.repeat(81) }, 'p0')).toBe('INVALID_TEXT')
    expect(game.validate(s, { type: 'addRule', text: 'x'.repeat(80) }, 'p0')).toBeNull()
  })
})

describe('end of game', () => {
  it('the 4th king ends the game', () => {
    let s = start([card(13), card(13), card(13), card(13), ...filler()])
    for (let i = 0; i < 4; i++) s = act(s, { type: 'draw' }, `p${i % 3}`)
    expect(s.kingsDrawn).toBe(4)
    expect(game.isFinished(s)).toBe(true)
    expect(s.finishReason).toBe('fourthKing')
    expect(game.validate(s, { type: 'draw' }, 'p1')).toBe('GAME_FINISHED')
  })

  it('the 4th king does not end the game when disabled', () => {
    const options = { ...DEFAULT_OPTIONS, endOnFourthKing: false }
    let s = start([card(13), card(13), card(13), card(13), ...filler()], 3, options)
    for (let i = 0; i < 4; i++) s = act(s, { type: 'draw' }, `p${i % 3}`)
    expect(game.isFinished(s)).toBe(false)
  })

  it('an empty deck ends the game', () => {
    let s = start([card(2), card(3)])
    s = act(s, { type: 'draw' }, 'p0')
    expect(game.isFinished(s)).toBe(false)
    s = act(s, { type: 'draw' }, 'p1')
    expect(game.isFinished(s)).toBe(true)
    expect(s.finishReason).toBe('deckEmpty')
  })

  it('an empty deck after an 8 ends the game once the choice is made', () => {
    let s = start([card(8)])
    s = act(s, { type: 'draw' }, 'p0')
    expect(game.isFinished(s)).toBe(false)
    s = act(s, { type: 'chooseMate', targetId: 'p1' }, 'p0')
    expect(game.isFinished(s)).toBe(true)
  })

  it('a full random game finishes within 52 draws', () => {
    let s = game.setup(players(5), DEFAULT_OPTIONS, createSeededRng(3))
    let draws = 0
    while (!game.isFinished(s)) {
      const actor = game.view(s, 'table').turnPlayerId
      s = act(s, s.phase === 'choice' ? { type: 'skip' } : { type: 'draw' }, actor)
      if (s.phase !== 'choice') draws++
      expect(draws).toBeLessThanOrEqual(52)
    }
  })
})

describe('validate', () => {
  it('rejects actions from the wrong player', () => {
    const s = start(filler())
    expect(game.validate(s, { type: 'draw' }, 'p1')).toBe('NOT_YOUR_TURN')
    expect(game.validate(s, { type: 'draw' }, 'stranger')).toBe('NOT_YOUR_TURN')
  })

  it('rejects actions in the wrong phase', () => {
    const s = start(filler())
    expect(game.validate(s, { type: 'skip' }, 'p0')).toBe('WRONG_PHASE')
    expect(game.validate(s, { type: 'chooseMate', targetId: 'p1' }, 'p0')).toBe('WRONG_PHASE')
  })

  it('rejects unknown actions', () => {
    const s = start(filler())
    expect(game.validate(s, { type: 'cheat' } as unknown as RingOfFireAction, 'p0')).toBe(
      'INVALID_ACTION',
    )
  })
})

describe('view', () => {
  it('does not leak the deck order', () => {
    const s = game.setup(players(3), DEFAULT_OPTIONS, createSeededRng(11))
    const v = game.view(s, 'table')
    expect(v).not.toHaveProperty('deck')
    expect(v.deckCount).toBe(52)
    const json = JSON.stringify(game.view(s, 'p1'))
    for (const c of s.deck) expect(json).not.toContain(`"${c.id}"`)
  })
})

describe('state', () => {
  it('is immutable and JSON-serialisable', () => {
    const s = start([card(8), ...filler()])
    const frozen = JSON.stringify(s)
    const next = act(s, { type: 'draw' }, 'p0')
    expect(JSON.stringify(s)).toBe(frozen)
    expect(JSON.parse(JSON.stringify(next))).toEqual(next)
  })
})
