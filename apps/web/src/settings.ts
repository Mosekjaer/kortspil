import { create } from 'zustand'
import { DEFAULT_PENALTY, type PenaltySetting } from '@kortspil/core'
import { keys, load, save } from './storage'

export interface Settings {
  penalty: PenaltySetting
  sound: boolean
  vibration: boolean
  ageConfirmed: boolean
  /** Last name used to create or join a room. */
  playerName: string
}

const DEFAULTS: Settings = {
  penalty: DEFAULT_PENALTY,
  sound: false,
  vibration: true,
  ageConfirmed: false,
  playerName: '',
}

interface SettingsStore extends Settings {
  update(patch: Partial<Settings>): void
}

export const useSettings = create<SettingsStore>((set, get) => ({
  ...DEFAULTS,
  ...load<Partial<Settings>>(keys.settings, {}),
  update(patch) {
    set(patch)
    const { penalty, sound, vibration, ageConfirmed, playerName } = get()
    save(keys.settings, { penalty, sound, vibration, ageConfirmed, playerName })
  },
}))
