import { useSettings } from './settings'

let audio: AudioContext | null = null

function playFlipSound(): void {
  try {
    audio ??= new AudioContext()
    const ctx = audio
    const length = Math.floor(ctx.sampleRate * 0.08)
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3
    const src = ctx.createBufferSource()
    const gain = ctx.createGain()
    gain.gain.value = 0.4
    src.buffer = buffer
    src.connect(gain).connect(ctx.destination)
    src.start()
  } catch {
    // Audio unavailable.
  }
}

function vibrate(pattern: number | number[]): void {
  // Browsers block (and log) vibration before the first user tap.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // Not supported (iOS).
  }
}

export const feedback = {
  cardFlip() {
    const { sound, vibration } = useSettings.getState()
    if (vibration) vibrate(25)
    if (sound) playFlipSound()
  },
  yourTurn() {
    if (useSettings.getState().vibration) vibrate([40, 60, 40])
  },
}
