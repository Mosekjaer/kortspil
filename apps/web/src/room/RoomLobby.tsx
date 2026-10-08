import { useState } from 'react'
import { GAMES, MAX_NAME_LENGTH, type PlayerId, type RoomPlayerInfo } from '@kortspil/core'
import { BottomSheet } from '../components/BottomSheet'
import { Button } from '../components/Button'
import { ConnectionBanner } from '../components/ConnectionBanner'
import { Icon } from '../components/Icon'
import { ScreenLayout } from '../components/ScreenLayout'
import { SortableList } from '../components/SortableList'
import { TextField } from '../components/TextField'
import { Toast } from '../components/Toast'
import { Toggle } from '../components/Toggle'
import { GAME_UIS } from '../games/registry'
import { da } from '../i18n/da'
import { QrCard } from './QrCard'
import { useRoom } from './roomStore'

export function RoomLobby() {
  const room = useRoom((s) => s.room)!
  const me = useRoom((s) => s.playerId)
  const status = useRoom((s) => s.status)
  const { call, leave } = useRoom.getState()
  const [error, setError] = useState<string | null>(null)
  const [guestOpen, setGuestOpen] = useState(false)
  const [guestName, setGuestName] = useState('')

  const isHost = room.hostId === me
  const game = GAMES[room.gameId]!
  const ui = GAME_UIS[room.gameId]
  const options = (room.options ?? {}) as Record<string, unknown>
  const count = room.players.length
  const countOk = count >= game.minPlayers && count <= game.maxPlayers

  const run = async (p: Promise<string | null>) => {
    const err = await p
    if (err) setError(da.errorText(err as never))
    return err
  }

  const addGuest = async () => {
    const name = guestName.trim()
    if (!name) return
    const err = await run(call('room:addGuest', { name }))
    if (!err) {
      setGuestName('')
      setGuestOpen(false)
    }
  }

  const reorder = (players: RoomPlayerInfo[]) => {
    // Optimistic: show the new order at once; the server's room:state confirms it.
    useRoom.setState({ room: { ...room, players } })
    void run(call('room:reorder', { playerIds: players.map((p) => p.id) }))
  }

  const playerRow = (p: RoomPlayerInfo) => (
    <>
      <span
        className={`size-2.5 shrink-0 rounded-full ${p.online ? 'bg-accent' : 'bg-raise-2 ring-1 ring-muted'}`}
        aria-label={p.online ? da.room.online : da.room.offline}
        role="img"
      />
      <span className="min-w-0 flex-1 truncate text-lg">
        {p.name}
        {p.id === me && <span className="text-muted"> ({da.room.you})</span>}
      </span>
      {p.id === room.hostId && <span className="label text-accent">{da.room.host}</span>}
      {p.isGuest && <span className="label text-muted">{da.room.guest}</span>}
      {isHost && p.id !== me && (
        <button
          type="button"
          aria-label={da.room.kick(p.name)}
          onClick={() => void run(call('room:kick', { playerId: p.id as PlayerId }))}
          className="press flex size-12 items-center justify-center rounded-full text-muted active:bg-raise-2"
        >
          <Icon name="x" size={22} />
        </button>
      )}
    </>
  )

  return (
    <>
      <ScreenLayout
        title={da.games[room.gameId].name}
        onBack={() => void leave()}
        footer={
          isHost ? (
            <>
              {!countOk && (
                <p className="label text-center text-muted">{da.lobby.tooFew(game.minPlayers)}</p>
              )}
              <Button
                className="min-h-18 text-xl"
                disabled={!countOk || status !== 'ready'}
                onClick={() => void run(call('game:start', {}))}
              >
                {da.room.start}
              </Button>
            </>
          ) : (
            <p className="label py-5 text-center text-muted">{da.room.waitingForHost}</p>
          )
        }
      >
        <ConnectionBanner status={status === 'ready' ? 'ready' : 'reconnecting'} />
        <div className="rise flex items-end justify-between gap-4">
          <div style={{ '--i': 0 } as React.CSSProperties}>
            <p className="label text-muted">{da.room.code}</p>
            <p className="display text-[clamp(3.5rem,18vw,7rem)] tracking-wide text-accent">
              {room.roomCode}
            </p>
          </div>
          <div style={{ '--i': 1 } as React.CSSProperties}>
            <QrCard url={room.joinUrl} label={`${da.room.scanOrType} ${room.joinUrl}`} />
          </div>
        </div>

        <h2 className="label mt-8 mb-2 text-muted">{da.room.players(count)}</h2>
        {isHost ? (
          <SortableList
            items={room.players}
            getKey={(p) => p.id}
            onReorder={reorder}
            renderItem={playerRow}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {room.players.map((p) => (
              <li key={p.id} className="flex h-14 items-center gap-3 rounded-2xl bg-raise px-4">
                {playerRow(p)}
              </li>
            ))}
          </ul>
        )}

        {isHost && (
          <>
            <Button variant="ghost" className="mt-2 w-full" onClick={() => setGuestOpen(true)}>
              {da.room.addGuest}
            </Button>
            {ui.lobbyToggles.length > 0 && (
              <>
                <h2 className="label mt-8 mb-2 text-muted">{da.lobby.options}</h2>
                <div className="flex flex-col gap-2">
                  {ui.lobbyToggles.map((t) => (
                    <Toggle
                      key={t.key}
                      label={t.label}
                      checked={(options[t.key] as boolean | undefined) ?? t.default}
                      onChange={(v) =>
                        void run(
                          call('room:configure', {
                            gameId: room.gameId,
                            options: { ...options, [t.key]: v },
                          }),
                        )
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </ScreenLayout>

      <BottomSheet open={guestOpen} title={da.room.addGuest} onClose={() => setGuestOpen(false)}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void addGuest()
          }}
        >
          <TextField
            label={da.room.guestName}
            value={guestName}
            maxLength={MAX_NAME_LENGTH}
            autoCapitalize="words"
            autoFocus
            onChange={(e) => setGuestName(e.target.value)}
          />
          <Button type="submit" disabled={!guestName.trim()}>
            {da.lobby.add}
          </Button>
        </form>
      </BottomSheet>

      <Toast message={error} onDone={() => setError(null)} />
    </>
  )
}
