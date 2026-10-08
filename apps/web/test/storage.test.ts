import { afterEach, describe, expect, it, vi } from 'vitest'
import { load, remove, save } from '../src/storage'

afterEach(() => vi.unstubAllGlobals())

describe('storage', () => {
  it('round-trips JSON', () => {
    const map = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => map.set(k, v),
      removeItem: (k: string) => map.delete(k),
    })
    save('x', { a: 1 })
    expect(load('x', null)).toEqual({ a: 1 })
    remove('x')
    expect(load('x', 'fallback')).toBe('fallback')
  })

  it('survives blocked storage', () => {
    const boom = () => {
      throw new Error('SecurityError')
    }
    vi.stubGlobal('localStorage', { getItem: boom, setItem: boom, removeItem: boom })
    expect(() => save('x', 1)).not.toThrow()
    expect(() => remove('x')).not.toThrow()
    expect(load('x', 42)).toBe(42)
  })

  it('falls back on corrupt JSON', () => {
    vi.stubGlobal('localStorage', { getItem: () => '{nope' })
    expect(load('x', 'ok')).toBe('ok')
  })
})
