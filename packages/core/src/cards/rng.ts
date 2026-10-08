/** Source of randomness. `next()` returns a float in [0, 1). */
export interface Rng {
  next(): number
}

/** Cryptographically secure RNG backed by Web Crypto (browser and Node). */
export function createCryptoRng(): Rng {
  const buf = new Uint32Array(1)
  return {
    next() {
      globalThis.crypto.getRandomValues(buf)
      return buf[0]! / 0x1_0000_0000
    },
  }
}

/** Deterministic RNG (mulberry32) for tests and replays. */
export function createSeededRng(seed: number): Rng {
  let a = seed >>> 0
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0
      let t = a
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 0x1_0000_0000
    },
  }
}

/** Uniform integer in [0, max). */
export function randomInt(rng: Rng, max: number): number {
  return Math.floor(rng.next() * max)
}
