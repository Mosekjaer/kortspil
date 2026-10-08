import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BUSSEN_OPTIONS,
  DEFAULT_OPTIONS,
  createSeededRng,
  type RingOfFireView,
} from '@kortspil/core'
import { HOST_HANDOVER_MS, MAX_ROOMS_PER_IP, ROOM_TTL_MS, createRoomStore } from '../src/rooms.js'

const rng = createSeededRng(1)

function setup() {
  let t = 0
  const store = createRoomStore({ now: () => t, publicUrl: 'https://kort.test' })
  const created = store.create({
    gameId: 'ringOfFire',
    hostName: 'Mads',
    options: DEFAULT_OPTIONS,
    ip: '1.1.1.1',
    socketId: 's-host',
  })
  return { store, room: created.room, host: created.player, advance: (ms: number) => (t += ms) }
}

describe('room store', () => {
  it('creates a room with a 4-character code without look-alikes', () => {
    const { room, host } = setup()
    expect(room.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{4}$/)
    expect(host.token!.length).toBeGreaterThanOrEqual(22)
    expect(room.hostId).toBe(host.id)
  })

  it('rejects invalid options and unsupported games', () => {
    const { store } = setup()
    const base = { hostName: 'X', ip: '2.2.2.2', socketId: 's' }
    expect(() => store.create({ ...base, gameId: 'ringOfFire', options: {} })).toThrow(
      'BAD_REQUEST',
    )
    expect(() => store.create({ ...base, gameId: 'bussen', options: {} })).toThrow('BAD_REQUEST')
  })

  it('limits rooms per IP', () => {
    const { store } = setup()
    for (let i = 1; i < MAX_ROOMS_PER_IP; i++) {
      store.create({
        gameId: 'ringOfFire',
        hostName: 'H',
        options: DEFAULT_OPTIONS,
        ip: '1.1.1.1',
        socketId: `s${i}`,
      })
    }
    expect(() =>
      store.create({
        gameId: 'ringOfFire',
        hostName: 'H',
        options: DEFAULT_OPTIONS,
        ip: '1.1.1.1',
        socketId: 'x',
      }),
    ).toThrow('TOO_MANY_ROOMS')
  })

  it('joins, rejects duplicate names and joins mid-game', () => {
    const { store, room, host } = setup()
    store.join({ roomCode: room.code.toLowerCase().toUpperCase(), name: 'Sara', socketId: 's2' })
    expect(() => store.join({ roomCode: room.code, name: 'sara', socketId: 's3' })).toThrow(
      'NAME_TAKEN',
    )
    store.start(room, host.id, rng)
    expect(() => store.join({ roomCode: room.code, name: 'Ole', socketId: 's4' })).toThrow(
      'GAME_IN_PROGRESS',
    )
    expect(() => store.join({ roomCode: 'ZZZZ', name: 'Ole', socketId: 's4' })).toThrow(
      'ROOM_NOT_FOUND',
    )
  })

  it('caps the room at 12 players', () => {
    const { store, room } = setup()
    for (let i = 1; i < 12; i++)
      store.join({ roomCode: room.code, name: `P${i}`, socketId: `s${i}` })
    expect(() => store.join({ roomCode: room.code, name: 'P12', socketId: 'x' })).toThrow(
      'ROOM_FULL',
    )
  })

  it('only the host manages the room', () => {
    const { store, room, host } = setup()
    const sara = store.join({ roomCode: room.code, name: 'Sara', socketId: 's2' }).player
    expect(() => store.addGuest(room, sara.id, 'Gæst')).toThrow('NOT_HOST')
    expect(() => store.start(room, sara.id, rng)).toThrow('NOT_HOST')
    expect(() => store.reorder(room, sara.id, [sara.id, host.id])).toThrow('NOT_HOST')
    store.reorder(room, host.id, [sara.id, host.id])
    expect(room.players.map((p) => p.name)).toEqual(['Sara', 'Mads'])
  })

  it('lets the host act for guests but not for online players', () => {
    const { store, room, host } = setup()
    const guest = store.addGuest(room, host.id, 'Gæst')
    const sara = store.join({ roomCode: room.code, name: 'Sara', socketId: 's2' }).player
    store.reorder(room, host.id, [guest.id, sara.id, host.id])
    store.start(room, host.id, rng)

    expect(() => store.action(room, sara.id, { type: 'draw' }, guest.id, rng)).toThrow('NOT_HOST')
    expect(() => store.action(room, host.id, { type: 'draw' }, undefined, rng)).toThrow(
      'NOT_YOUR_TURN',
    )
    store.action(room, host.id, { type: 'draw' }, guest.id, rng)
    const view = store.viewFor(room, sara.id)!.view as RingOfFireView
    expect(view.lastDrawerId).toBe(guest.id)

    // Sara is online, so the host may not play her turn...
    expect(() => store.action(room, host.id, { type: 'draw' }, sara.id, rng)).toThrow(
      'NOT_YOUR_TURN',
    )
    // ...until she drops off.
    store.disconnect('s2')
    store.action(room, host.id, { type: 'draw' }, sara.id, rng)
  })

  it('rejects malformed actions', () => {
    const { store, room, host } = setup()
    store.join({ roomCode: room.code, name: 'Sara', socketId: 's2' })
    store.start(room, host.id, rng)
    expect(() => store.action(room, host.id, { type: 'cheat' }, undefined, rng)).toThrow(
      'INVALID_ACTION',
    )
  })

  it('bumps the view version on every change and never sends the deck', () => {
    const { store, room, host } = setup()
    store.join({ roomCode: room.code, name: 'Sara', socketId: 's2' })
    store.start(room, host.id, rng)
    const v1 = store.viewFor(room, host.id)!
    store.action(room, host.id, { type: 'draw' }, undefined, rng)
    const v2 = store.viewFor(room, host.id)!
    expect(v2.version).toBe(v1.version + 1)
    expect(v2.view).not.toHaveProperty('deck')
  })

  it('rejoins with the token and rejects unknown tokens', () => {
    const { store, room, host } = setup()
    store.disconnect('s-host')
    expect(store.publicState(room, 'http://x').players[0]!.online).toBe(false)
    const again = store.rejoin({ roomCode: room.code, token: host.token!, socketId: 's-new' })
    expect(again.player.id).toBe(host.id)
    expect(store.whoIs('s-new')?.player.id).toBe(host.id)
    expect(() =>
      store.rejoin({ roomCode: room.code, token: 'x'.repeat(22), socketId: 's' }),
    ).toThrow('INVALID_TOKEN')
  })

  it('hands the host role to the next connected player on leave', () => {
    const { store, room, host } = setup()
    store.addGuest(room, host.id, 'Gæst')
    const sara = store.join({ roomCode: room.code, name: 'Sara', socketId: 's2' }).player
    store.leave(room, host.id)
    expect(room.hostId).toBe(sara.id)
  })

  it('hands over a host who stays offline', () => {
    const { store, room, host, advance } = setup()
    const sara = store.join({ roomCode: room.code, name: 'Sara', socketId: 's2' }).player
    store.disconnect('s-host')
    advance(HOST_HANDOVER_MS - 1)
    store.sweep()
    expect(room.hostId).toBe(host.id)
    advance(1)
    expect(store.sweep().changed).toContain(room)
    expect(room.hostId).toBe(sara.id)
  })

  it('deletes rooms after 30 minutes without connected players', () => {
    const { store, room, advance } = setup()
    store.disconnect('s-host')
    advance(ROOM_TTL_MS - 1)
    store.sweep()
    expect(store.rooms.has(room.code)).toBe(true)
    advance(1)
    expect(store.sweep().closed).toEqual([room.code])
    expect(store.rooms.has(room.code)).toBe(false)
  })

  it('builds join links from PUBLIC_URL', () => {
    const { store, room } = setup()
    expect(store.publicState(room, 'http://ignored').joinUrl).toBe(
      `https://kort.test/r/${room.code}`,
    )
  })

  it('restricts Bussen table actions to the host', () => {
    const { store, room, host } = setup()
    const sara = store.join({ roomCode: room.code, name: 'Sara', socketId: 's2' }).player
    store.configure(room, host.id, 'bussen', DEFAULT_BUSSEN_OPTIONS)
    store.start(room, host.id, rng)
    const guesses = ['red', 'higher', 'inside', 'hearts'] as const
    for (let round = 0; round < 4; round++) {
      store.action(room, host.id, { type: 'guess', guess: guesses[round] }, undefined, rng)
      store.action(room, sara.id, { type: 'guess', guess: guesses[round] }, undefined, rng)
    }
    expect(() => store.action(room, sara.id, { type: 'revealNext' }, undefined, rng)).toThrow(
      'NOT_HOST',
    )
    store.action(room, host.id, { type: 'revealNext' }, undefined, rng)
  })
})
