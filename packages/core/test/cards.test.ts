import { describe, expect, it } from 'vitest'
import { colorOf, createDeck, createCryptoRng, createSeededRng, shuffle } from '../src/index.js'

describe('deck', () => {
  it('has 52 unique cards', () => {
    const deck = shuffle(createDeck(), createSeededRng(1))
    expect(deck).toHaveLength(52)
    expect(new Set(deck.map((c) => c.id)).size).toBe(52)
    expect(new Set(deck.map((c) => `${c.suit}${c.rank}`)).size).toBe(52)
  })

  it('two decks give 104 unique ids', () => {
    const deck = shuffle(createDeck(2), createSeededRng(1))
    expect(deck).toHaveLength(104)
    expect(new Set(deck.map((c) => c.id)).size).toBe(104)
  })

  it('has aces high and no jokers', () => {
    const ranks = new Set(createDeck().map((c) => c.rank))
    expect(Math.min(...ranks)).toBe(2)
    expect(Math.max(...ranks)).toBe(14)
    expect(ranks.size).toBe(13)
  })

  it('maps suits to colors', () => {
    expect(colorOf('hearts')).toBe('red')
    expect(colorOf('diamonds')).toBe('red')
    expect(colorOf('spades')).toBe('black')
    expect(colorOf('clubs')).toBe('black')
  })
})

describe('shuffle', () => {
  it('is deterministic with a seeded rng', () => {
    const a = shuffle(createDeck(), createSeededRng(42))
    const b = shuffle(createDeck(), createSeededRng(42))
    expect(a).toEqual(b)
  })

  it('differs between seeds and leaves input untouched', () => {
    const input = createDeck()
    const copy = input.slice()
    const a = shuffle(input, createSeededRng(1))
    const b = shuffle(input, createSeededRng(2))
    expect(a).not.toEqual(b)
    expect(input).toEqual(copy)
  })

  it('is roughly uniform', () => {
    const rng = createSeededRng(7)
    const counts = [0, 0, 0, 0]
    for (let i = 0; i < 40_000; i++) counts[shuffle([0, 1, 2, 3], rng)[0]!]!++
    for (const c of counts) expect(c).toBeGreaterThan(9_500)
  })
})

describe('crypto rng', () => {
  it('returns values in [0, 1)', () => {
    const rng = createCryptoRng()
    for (let i = 0; i < 1000; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})
