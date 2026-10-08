export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const
export type Suit = (typeof SUITS)[number]

/** 2–10, 11 = jack, 12 = queen, 13 = king, 14 = ace (aces high). */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14
export const RANKS: readonly Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

export type Color = 'red' | 'black'

export interface Card {
  /** Unique within a game, also when several decks are used. */
  id: string
  suit: Suit
  rank: Rank
}

export function colorOf(suit: Suit): Color {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black'
}

const SUIT_CODE: Record<Suit, string> = { spades: 'S', hearts: 'H', diamonds: 'D', clubs: 'C' }

/** Unshuffled deck(s) of 52 cards each, no jokers. */
export function createDeck(decks = 1): Card[] {
  const cards: Card[] = []
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ id: `${d}${SUIT_CODE[suit]}${rank}`, suit, rank })
      }
    }
  }
  return cards
}
