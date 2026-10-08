import { useState } from 'react'
import { GAMES, GAME_SCHEMAS, MAX_NAME_LENGTH, type GameId } from '@kortspil/core'
import { useApp } from '../app'
import { Button } from '../components/Button'
import { Display, ScreenLayout } from '../components/ScreenLayout'
import { TextField } from '../components/TextField'
import { GAME_UIS } from '../games/registry'
import { da } from '../i18n/da'
import { useRoom } from '../room/roomStore'
import { useSettings } from '../settings'
import { useOnline } from '../hooks/useOnline'

/** Games that have UI and a protocol schema can be played in a room. */
export const ROOM_GAMES = (Object.keys(GAME_UIS) as GameId[]).filter(
  (id) => GAME_UIS[id].ready && GAME_SCHEMAS[id] && GAMES[id]?.modes.includes('multi'),
)

export function CreateRoom() {
  const back = useApp((s) => s.back)
  const create = useRoom((s) => s.create)
  const status = useRoom((s) => s.status)
  const online = useOnline()
  const { playerName, update } = useSettings()
  const [name, setName] = useState(playerName)
  const [gameId, setGameId] = useState<GameId>(ROOM_GAMES[0] ?? 'ringOfFire')
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    update({ playerName: trimmed })
    const ui = GAME_UIS[gameId]
    const options = ui.createOptions(
      Object.fromEntries(ui.lobbyToggles.map((t) => [t.key, t.default])),
    )
    const err = await create(gameId, trimmed, options)
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
          <p className="label text-center text-muted">{da.room.offlineHint}</p>
          <Button
            className="min-h-18 text-xl"
            disabled={!online || !name.trim() || status === 'connecting'}
            onClick={() => void submit()}
          >
            {status === 'connecting' ? da.room.connecting : da.room.create}
          </Button>
        </>
      }
    >
      <Display className="mb-8">{da.room.createTitle}</Display>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <TextField
          label={da.room.yourName}
          placeholder={da.room.namePlaceholder}
          value={name}
          maxLength={MAX_NAME_LENGTH}
          autoCapitalize="words"
          enterKeyHint="go"
          onChange={(e) => setName(e.target.value)}
          error={error}
        />
      </form>
      <h2 className="label mt-8 mb-2 text-muted">{da.room.chooseGame}</h2>
      <div className="flex flex-col gap-2">
        {ROOM_GAMES.map((id) => (
          <label
            key={id}
            className={`press flex min-h-14 items-center rounded-2xl px-4 text-lg ${gameId === id ? 'bg-accent font-semibold text-ink' : 'bg-raise'}`}
          >
            <input
              type="radio"
              name="game"
              className="sr-only"
              checked={gameId === id}
              onChange={() => setGameId(id)}
            />
            {da.games[id].name}
          </label>
        ))}
      </div>
    </ScreenLayout>
  )
}
