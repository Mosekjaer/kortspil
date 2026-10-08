import { useState } from 'react'
import { nanoid } from 'nanoid'
import { GAMES, type GameId, type Player } from '@kortspil/core'
import { useApp } from '../app'
import { Button } from '../components/Button'
import { Display, ScreenLayout } from '../components/ScreenLayout'
import { Icon } from '../components/Icon'
import { SortableList } from '../components/SortableList'
import { Toggle } from '../components/Toggle'
import { GAME_UIS } from '../games/registry'
import { da } from '../i18n/da'
import { createLocalRunner } from '../runtime/localRunner'
import { keys, load, save } from '../storage'

const MAX_NAME = 20

/** Single-phone lobby: names as chips, drag to set seating order. */
export function Lobby({ gameId }: { gameId: GameId }) {
  const { back, startSession } = useApp()
  const game = GAMES[gameId]!
  const ui = GAME_UIS[gameId]

  const [players, setPlayers] = useState<Player[]>(() =>
    load<string[]>(keys.lastPlayers, [])
      .slice(0, game.maxPlayers)
      .map((name) => ({ id: nanoid(), name })),
  )
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ui.lobbyToggles.map((t) => [t.key, t.default])),
  )

  const add = () => {
    const trimmed = name.trim().slice(0, MAX_NAME)
    if (!trimmed) return
    if (players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(da.lobby.duplicate)
      return
    }
    if (players.length >= game.maxPlayers) {
      setError(da.lobby.tooMany(game.maxPlayers))
      return
    }
    setPlayers([...players, { id: nanoid(), name: trimmed }])
    setName('')
    setError(null)
  }

  const start = () => {
    save(
      keys.lastPlayers,
      players.map((p) => p.name),
    )
    const options = ui.createOptions(toggles)
    startSession({
      gameId,
      players,
      options,
      runner: createLocalRunner(game, players, options),
    })
  }

  const tooFew = players.length < game.minPlayers

  return (
    <ScreenLayout
      title={da.lobby.subtitle}
      onBack={back}
      footer={
        <>
          {tooFew && (
            <p className="label text-center text-muted">{da.lobby.tooFew(game.minPlayers)}</p>
          )}
          <Button className="min-h-18 text-xl" disabled={tooFew} onClick={start}>
            {da.lobby.start}
          </Button>
        </>
      }
    >
      <Display className="mb-6">{da.games[gameId].name}</Display>
      <label htmlFor="player-name" className="label mb-2 block text-muted">
        {da.lobby.title}
      </label>
      <form
        className="mb-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <input
          id="player-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_NAME}
          placeholder={da.lobby.namePlaceholder}
          enterKeyHint="done"
          autoCapitalize="words"
          className="min-h-14 min-w-0 flex-1 rounded-2xl bg-raise px-4 text-lg outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
        />
        <Button type="submit" variant="secondary" disabled={!name.trim()}>
          {da.lobby.add}
        </Button>
      </form>
      {error && (
        <p role="alert" className="mb-2 font-semibold text-paper">
          {error}
        </p>
      )}
      {players.length > 1 && <p className="mb-3 text-sm text-muted">{da.lobby.dragHint}</p>}

      <SortableList
        items={players}
        getKey={(p) => p.id}
        onReorder={setPlayers}
        renderItem={(p) => (
          <>
            <span className="flex-1 truncate text-lg">{p.name}</span>
            <button
              type="button"
              aria-label={da.lobby.remove(p.name)}
              onClick={() => setPlayers(players.filter((x) => x.id !== p.id))}
              className="press flex size-12 items-center justify-center rounded-full text-muted active:bg-raise-2"
            >
              <Icon name="x" size={22} />
            </button>
          </>
        )}
      />

      {ui.lobbyToggles.length > 0 && (
        <>
          <h2 className="label mt-8 mb-2 text-muted">{da.lobby.options}</h2>
          <div className="flex flex-col gap-2">
            {ui.lobbyToggles.map((t) => (
              <Toggle
                key={t.key}
                label={t.label}
                checked={toggles[t.key] ?? t.default}
                onChange={(v) => setToggles({ ...toggles, [t.key]: v })}
              />
            ))}
          </div>
        </>
      )}
    </ScreenLayout>
  )
}
