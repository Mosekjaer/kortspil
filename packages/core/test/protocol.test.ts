import { describe, expect, it } from 'vitest'
import {
  DEFAULT_OPTIONS,
  nameSchema,
  ringOfFireActionSchema,
  ringOfFireOptionsSchema,
  roomCodeSchema,
} from '../src/index.js'

describe('protocol schemas', () => {
  it('trims names and caps them at 20 characters', () => {
    expect(nameSchema.parse('  Mads  ')).toBe('Mads')
    expect(nameSchema.parse('x'.repeat(30))).toHaveLength(20)
    expect(nameSchema.safeParse('   ').success).toBe(false)
  })

  it('normalises room codes and rejects look-alike characters', () => {
    expect(roomCodeSchema.parse(' q2wx ')).toBe('Q2WX')
    for (const bad of ['O0AB', 'I1AB', 'LABC', 'ABC', 'ABCDE']) {
      expect(roomCodeSchema.safeParse(bad).success).toBe(false)
    }
  })

  it('accepts the default Ring of Fire options, also after a JSON round trip', () => {
    expect(ringOfFireOptionsSchema.safeParse(DEFAULT_OPTIONS).success).toBe(true)
    const wire = JSON.parse(JSON.stringify(DEFAULT_OPTIONS))
    const parsed = ringOfFireOptionsSchema.parse(wire)
    expect(parsed.rules['14'].name).toBe('Vandfald')
  })

  it('rejects options with a missing rule or an empty custom penalty', () => {
    const { 14: _ace, ...rest } = DEFAULT_OPTIONS.rules
    expect(ringOfFireOptionsSchema.safeParse({ ...DEFAULT_OPTIONS, rules: rest }).success).toBe(
      false,
    )
    expect(
      ringOfFireOptionsSchema.safeParse({
        ...DEFAULT_OPTIONS,
        penalty: { custom: { singular: '', plural: 'x' } },
      }).success,
    ).toBe(false)
  })

  it('validates action shapes', () => {
    expect(ringOfFireActionSchema.safeParse({ type: 'draw' }).success).toBe(true)
    expect(ringOfFireActionSchema.safeParse({ type: 'chooseMate' }).success).toBe(false)
    expect(ringOfFireActionSchema.safeParse({ type: 'nuke' }).success).toBe(false)
  })
})
