/**
 * localStorage wrapper. Every access is guarded: storage can be blocked
 * (private mode, disabled site data) and the app must keep working.
 */
export const keys = {
  settings: 'settings',
  lastPlayers: 'lastPlayers',
  customRules: (gameId: string) => `customRules.${gameId}`,
  roomToken: (roomCode: string) => `roomToken.${roomCode}`,
}

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(key)
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable or full; the app keeps running without persistence.
  }
}

export function remove(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key)
  } catch {
    // Ignore, see save().
  }
}
