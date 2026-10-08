import type { Card, Player, Rank, Suit } from '../src/index.js'

export const players = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Spiller ${i}` }))

let seq = 0
export const card = (rank: Rank, suit: Suit = 'spades'): Card => ({
  id: `t${seq++}`,
  suit,
  rank,
})
