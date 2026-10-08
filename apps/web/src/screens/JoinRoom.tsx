import { useEffect, useRef, useState } from 'react'
import { MAX_NAME_LENGTH, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@kortspil/core'
import { useApp } from '../app'
import { Button } from '../components/Button'
import { Display, ScreenLayout } from '../components/ScreenLayout'
import { TextField } from '../components/TextField'
import { da } from '../i18n/da'
import { useRoom } from '../room/roomStore'
import { useSettings } from '../settings'
import { useOnline } from '../hooks/useOnline'

const clean = (s: string) =>
  s
    .toUpperCase()
    .split('')
    .filter((c) => ROOM_CODE_ALPHABET.includes(c))
    .join('')

/** Four big code boxes (or /r/CODE), then a name. */
export function JoinRoom({ code: initial = '' }: { code?: string }) {
  const back = useApp((s) => s.back)
  const join = useRoom((s) => s.join)
  const status = useRoom((s) => s.status)
  const online = useOnline()
  const { playerName, update } = useSettings()
  const [code, setCode] = useState(clean(initial).slice(0, ROOM_CODE_LENGTH))
  const [name, setName] = useState(playerName)
  const [error, setError] = useState<string | null>(null)
  const boxes = useRef<Array<HTMLInputElement | null>>([])
  const nameRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (code.length < ROOM_CODE_LENGTH) boxes.current[code.length]?.focus()
    else if (!initial) nameRef.current?.focus()
    // Only on mount: later focus follows typing.
  }, [])

  const setAt = (i: number, value: string) => {
    const chars = clean(value)
    const next = (code.slice(0, i) + chars + code.slice(i + chars.length)).slice(
      0,
      ROOM_CODE_LENGTH,
    )
    setCode(next)
    setError(null)
    const focus = Math.min(i + chars.length, ROOM_CODE_LENGTH)
    if (focus < ROOM_CODE_LENGTH) boxes.current[focus]?.focus()
    else nameRef.current?.focus()
  }

  const ready = code.length === ROOM_CODE_LENGTH && name.trim().length > 0

  const submit = async () => {
    if (!ready) return
    update({ playerName: name.trim() })
    const err = await join(code, name.trim())
    if (err) setError(da.errorText(err))
  }

  return (
    <ScreenLayout
      onBack={back}
      footer={
        <>
          {!online && (
            <p role="status" className="text-center font-semibold">
              {da.offline}
            </p>
          )}
          <Button
            className="min-h-18 text-xl"
            disabled={!online || !ready || status === 'connecting'}
            onClick={() => void submit()}
          >
            {status === 'connecting' ? da.room.connecting : da.room.join}
          </Button>
        </>
      }
    >
      <Display className="mb-8">{da.room.joinTitle}</Display>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <fieldset>
          <legend className="label mb-2 text-muted">{da.room.code}</legend>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: ROOM_CODE_LENGTH }, (_, i) => (
              <input
                key={i}
                ref={(el) => {
                  boxes.current[i] = el
                }}
                aria-label={`${da.room.code} ${i + 1}`}
                value={code[i] ?? ''}
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => setAt(i, e.target.value.slice(-ROOM_CODE_LENGTH))}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !code[i] && i > 0) {
                    setCode(code.slice(0, i - 1))
                    boxes.current[i - 1]?.focus()
                  }
                }}
                className="display aspect-square w-full rounded-2xl bg-raise pt-0 text-center text-5xl outline-none focus:ring-2 focus:ring-accent"
              />
            ))}
          </div>
        </fieldset>
        <TextField
          ref={nameRef}
          className="mt-6"
          label={da.room.yourName}
          placeholder={da.room.namePlaceholder}
          value={name}
          maxLength={MAX_NAME_LENGTH}
          autoCapitalize="words"
          enterKeyHint="go"
          onChange={(e) => setName(e.target.value)}
          error={error}
        />
        <button type="submit" hidden />
      </form>
    </ScreenLayout>
  )
}
