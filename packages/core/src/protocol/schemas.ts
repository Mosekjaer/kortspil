import { z } from 'zod'
import { RANKS, type Rank } from '../cards/card.js'
import type { GameId } from '../engine/types.js'
import { MAX_CUSTOM_RULE_LENGTH } from '../games/ringOfFire/defaultRules.js'

export const MAX_NAME_LENGTH = 20
export const MAX_ROOM_PLAYERS = 12
/** No look-alikes: O/0, I/1/L are left out. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const ROOM_CODE_LENGTH = 4

export const gameIdSchema = z.enum(['ringOfFire', 'bussen']) satisfies z.ZodType<GameId>

export const playerIdSchema = z.string().min(1).max(64)

/** Trimmed, 1–20 characters. */
export const nameSchema = z
  .string()
  .transform((s) => s.trim().slice(0, MAX_NAME_LENGTH))
  .pipe(z.string().min(1))

export const roomCodeSchema = z
  .string()
  .transform((s) => s.trim().toUpperCase())
  .pipe(
    z
      .string()
      .length(ROOM_CODE_LENGTH)
      .regex(new RegExp(`^[${ROOM_CODE_ALPHABET}]+$`)),
  )

const penaltyTextSchema = z.string().trim().min(1).max(20)

export const penaltySettingSchema = z.union([
  z.object({ preset: z.enum(['sip', 'points', 'pushups']) }),
  z.object({ custom: z.object({ singular: penaltyTextSchema, plural: penaltyTextSchema }) }),
])

const cardRuleSchema = z.object({
  name: z.string().trim().min(1).max(30),
  text: z.string().trim().min(1).max(200),
  soberText: z.string().trim().min(1).max(200).optional(),
})

const ruleSetSchema = z.object(
  Object.fromEntries(RANKS.map((r) => [r, cardRuleSchema])) as Record<
    `${Rank}`,
    typeof cardRuleSchema
  >,
)

export const ringOfFireOptionsSchema = z.object({
  rules: ruleSetSchema,
  penalty: penaltySettingSchema,
  endOnFourthKing: z.boolean(),
})

export const ringOfFireActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('draw') }),
  z.object({ type: z.literal('chooseMate'), targetId: playerIdSchema }),
  z.object({ type: z.literal('addRule'), text: z.string().max(MAX_CUSTOM_RULE_LENGTH * 2) }),
  z.object({ type: z.literal('skip') }),
])

const suitSchema = z.enum(['spades', 'hearts', 'diamonds', 'clubs'])

export const bussenOptionsSchema = z.object({ penalty: penaltySettingSchema })

export const bussenActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('guess'),
    guess: z.union([z.enum(['red', 'black', 'higher', 'lower', 'inside', 'outside']), suitSchema]),
  }),
  z.object({ type: z.literal('give'), giveId: z.string().max(16), targetId: playerIdSchema }),
  z.object({ type: z.literal('revealNext') }),
  z.object({
    type: z.literal('playMatch'),
    cardId: z.string().max(16),
    targetId: playerIdSchema.optional(),
  }),
  z.object({ type: z.literal('startBus') }),
  z.object({ type: z.literal('busGuess'), guess: z.enum(['red', 'black', 'higher', 'lower']) }),
])

export interface GameSchemas {
  options: z.ZodType
  action: z.ZodType
  /** Table actions only the host may take in a room (anyone on a single phone). */
  hostOnly?: readonly string[]
}

/** Per-game schemas; a game without an entry cannot be played in a room. */
export const GAME_SCHEMAS: Partial<Record<GameId, GameSchemas>> = {
  ringOfFire: { options: ringOfFireOptionsSchema, action: ringOfFireActionSchema },
  bussen: {
    options: bussenOptionsSchema,
    action: bussenActionSchema,
    hostOnly: ['revealNext', 'startBus'],
  },
}

// Client -> server payloads

export const roomCreateSchema = z.object({
  gameId: gameIdSchema,
  hostName: nameSchema,
  options: z.unknown(),
})
export const roomJoinSchema = z.object({ roomCode: roomCodeSchema, name: nameSchema })
export const roomRejoinSchema = z.object({
  roomCode: roomCodeSchema,
  token: z.string().min(16).max(64),
})
export const roomAddGuestSchema = z.object({ name: nameSchema })
export const roomKickSchema = z.object({ playerId: playerIdSchema })
export const roomReorderSchema = z.object({
  playerIds: z.array(playerIdSchema).min(1).max(MAX_ROOM_PLAYERS),
})
export const roomConfigureSchema = z.object({ gameId: gameIdSchema, options: z.unknown() })
export const gameStartSchema = z.object({}).strict().or(z.undefined())
export const gameActionSchema = z.object({
  action: z.unknown(),
  actingAs: playerIdSchema.optional(),
})
export const emptySchema = z.object({}).or(z.undefined())
