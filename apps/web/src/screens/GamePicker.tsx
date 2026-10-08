import { GAMES, type GameId } from '@kortspil/core'
import { useApp } from '../app'
import { ScreenLayout } from '../components/ScreenLayout'
import { GAME_UIS } from '../games/registry'
import { da } from '../i18n/da'

const ORDER: GameId[] = ['ringOfFire', 'bussen']

export function GamePicker() {
  const { go, back } = useApp()
  return (
    <ScreenLayout title={da.picker.title} onBack={back}>
      <ul className="rise flex flex-col">
        {ORDER.map((id, i) => {
          const def = GAMES[id]
          const ready = GAME_UIS[id].ready && def
          return (
            <li
              key={id}
              className="border-b border-raise-2 first:border-t"
              style={{ '--i': i } as React.CSSProperties}
            >
              <button
                type="button"
                disabled={!ready}
                onClick={() => go({ name: 'lobby', gameId: id })}
                className="press flex w-full flex-col gap-3 py-6 text-left disabled:opacity-40"
              >
                <span className="display text-[clamp(3rem,15vw,5rem)]">{da.games[id].name}</span>
                <span className="text-lg text-muted">{da.games[id].tagline}</span>
                <span className="flex flex-wrap gap-2">
                  {ready && def ? (
                    <>
                      <Tag accent>{da.picker.players(def.minPlayers, def.maxPlayers)}</Tag>
                      {def.modes.includes('single') && <Tag>{da.picker.single}</Tag>}
                      {def.modes.includes('multi') && <Tag>{da.picker.multi}</Tag>}
                    </>
                  ) : (
                    <Tag>{da.picker.comingSoon}</Tag>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </ScreenLayout>
  )
}

function Tag({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={`label rounded-full px-3 py-1.5 ${accent ? 'bg-accent text-ink' : 'bg-raise text-paper'}`}
    >
      {children}
    </span>
  )
}
