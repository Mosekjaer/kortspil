import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_OPTIONS, createSeededRng, ringOfFire } from '@kortspil/core'
import { createLocalRunner } from '../src/runtime/localRunner'

const players = [
  { id: 'a', name: 'Mads' },
  { id: 'b', name: 'Sara' },
]

describe('localRunner', () => {
  it('applies valid actions and notifies subscribers', async () => {
    const runner = createLocalRunner(ringOfFire, players, DEFAULT_OPTIONS, createSeededRng(1))
    const listener = vi.fn()
    runner.subscribe(listener)
    expect(runner.getView().deckCount).toBe(52)
    expect(await runner.dispatch({ type: 'draw' }, 'a')).toBeNull()
    expect(runner.getView().deckCount).toBe(51)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('rejects invalid actions without changing the view', async () => {
    const runner = createLocalRunner(ringOfFire, players, DEFAULT_OPTIONS, createSeededRng(1))
    const before = runner.getView()
    expect(await runner.dispatch({ type: 'draw' }, 'b')).toBe('NOT_YOUR_TURN')
    expect(await runner.dispatch({ type: 'draw' })).toBe('NOT_YOUR_TURN')
    expect(runner.getView()).toBe(before)
  })

  it('exposes the public table view only', () => {
    const runner = createLocalRunner(ringOfFire, players, DEFAULT_OPTIONS, createSeededRng(1))
    expect(runner.getView()).not.toHaveProperty('deck')
    expect(runner.getStatus()).toBe('ready')
  })
})
