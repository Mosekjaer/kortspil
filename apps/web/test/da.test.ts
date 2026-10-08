import { describe, expect, it } from 'vitest'
import { da, genitive } from '../src/i18n/da'

const names = (id: string) => ({ a: 'Mads', b: 'Sara' })[id] ?? '?'

describe('da', () => {
  it('uses the Danish genitive', () => {
    expect(genitive('Mads')).toBe("Mads'")
    expect(genitive('Sara')).toBe('Saras')
    expect(da.game.turn('Mads')).toBe("Det er Mads' tur")
  })

  it('formats log lines', () => {
    const line = da.ringOfFire.logLine
    expect(
      line({ type: 'draw', playerId: 'a', card: { id: 'x', suit: 'clubs', rank: 8 } }, names),
    ).toBe("Mads trak en 8'er")
    expect(
      line({ type: 'draw', playerId: 'a', card: { id: 'x', suit: 'clubs', rank: 14 } }, names),
    ).toBe('Mads trak et es')
    expect(line({ type: 'mate', playerId: 'a', targetId: 'b' }, names)).toBe(
      'Mads valgte Sara som makker',
    )
  })

  it('has a message for every error code', () => {
    for (const msg of Object.values(da.game.errors)) expect(msg.length).toBeGreaterThan(0)
  })
})
