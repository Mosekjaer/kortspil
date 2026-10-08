import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  SUITS,
  formatPenalty,
  resolvePenalty,
  type BusGuess,
  type BussenAction,
  type BussenView,
  type Card,
  type DealGuess,
  type Give,
  type PlayerId,
} from '@kortspil/core'
import type { Session } from '../../app'
import { BottomSheet } from '../../components/BottomSheet'
import { Button } from '../../components/Button'
import { ConnectionBanner } from '../../components/ConnectionBanner'
import { EndScreen } from '../../components/EndScreen'
import { GameFrame } from '../../components/GameFrame'
import { CardBack, CardFace, FlipCard } from '../../components/PlayingCard'
import { SplitWords } from '../../components/SplitWords'
import { Toast } from '../../components/Toast'
import { feedback } from '../../feedback'
import { da } from '../../i18n/da'
import type { Runner } from '../../runtime/runner'
import { useRunner } from '../../runtime/useRunner'

type Act = (action: BussenAction, actor: PlayerId) => Promise<void>

const DEAL_CHOICES: Record<1 | 2 | 3 | 4, readonly DealGuess[]> = {
  1: ['red', 'black'],
  2: ['higher', 'lower'],
  3: ['inside', 'outside'],
  4: SUITS,
}

/** A card at a fixed width; the face scales with its container. */
function SizedCard({ card, className }: { card: Card | null; className: string }) {
  return (
    <div className={className} style={{ containerType: 'inline-size' }}>
      {card ? <CardFace card={card} /> : <CardBack />}
    </div>
  )
}

export function BussenGame({ session }: { session: Session }) {
  const runner = session.runner as Runner<BussenView, BussenAction>
  const { view, status, dispatch } = useRunner(runner)
  const [error, setError] = useState<string | null>(null)
  const [logOpen, setLogOpen] = useState(false)
  const [giving, setGiving] = useState<Give | null>(null)
  const [givesOpen, setGivesOpen] = useState(false)
  const b = da.bussen

  const names = useMemo(() => {
    const map = new Map(view.players.map((p) => [p.id, p.name]))
    return (id: string) => map.get(id) ?? '?'
  }, [view.players])

  const penaltyText = useCallback(
    (n: number) => formatPenalty(n, resolvePenalty(view.options.penalty)),
    [view.options.penalty],
  )

  const ready = status === 'ready'
  const can = (id: PlayerId) => ready && session.canActFor(id)
  /** Host (or the shared phone) handles the table: turning pyramid cards. */
  const tableActor = session.me ?? view.players[0]!.id
  const canRunTable = ready && session.isHost

  const act: Act = useCallback(
    async (action, actor) => {
      const err = await dispatch(action, actor === session.me ? undefined : actor)
      if (err) setError(da.errorText(err))
    },
    [dispatch, session.me],
  )

  // Feedback when a card is turned anywhere on the table.
  const turned = view.log.length
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    feedback.cardFlip()
  }, [turned])

  const turnId = view.turnPlayerId
  const wasMine = useRef(false)
  useEffect(() => {
    const mine = session.me !== null && turnId === session.me
    if (mine && !wasMine.current) feedback.yourTurn()
    wasMine.current = mine
  }, [session.me, turnId])

  if (view.phase === 'finished') {
    return (
      <EndScreen
        reason={b.finished(names(view.driverId!))}
        stats={[
          { value: view.attempts, label: b.statAttempts },
          { value: view.played.length, label: b.statPlayed },
          { value: view.players.length, label: b.statPlayers },
        ]}
        onPlayAgain={session.playAgain}
        onQuit={session.quit}
      />
    )
  }

  const openGives = view.gives.filter((g) => g.targetId === null && can(g.playerId))

  const title =
    view.phase === 'deal'
      ? turnId === session.me
        ? da.game.yourTurn
        : b.turnTitle(names(turnId!))
      : view.phase === 'pyramid'
        ? b.pyramid
        : view.driverId === session.me
          ? b.youDrive
          : b.driverTitle(names(view.driverId!))

  let body: React.ReactNode
  let footer: React.ReactNode
  if (view.phase === 'deal') {
    ;({ body, footer } = dealPhase(view, names, penaltyText, can, act))
  } else if (view.phase === 'pyramid') {
    ;({ body, footer } = pyramidPhase(view, names, penaltyText, can, canRunTable, tableActor, act))
  } else {
    ;({ body, footer } = busPhase(view, names, penaltyText, can, act))
  }

  return (
    <>
      <GameFrame
        title={title}
        onQuit={session.quit}
        banner={<ConnectionBanner status={status} />}
        menuItems={[{ label: da.game.log, onSelect: () => setLogOpen(true) }]}
        footer={
          <>
            {openGives.length > 0 && (
              <button
                type="button"
                onClick={() => setGivesOpen(true)}
                className="press label self-center rounded-full px-5 py-3 text-accent ring-2 ring-accent"
              >
                {b.giveOutCount(openGives.length)}
              </button>
            )}
            {footer}
          </>
        }
      >
        {body}
      </GameFrame>

      <BottomSheet
        open={givesOpen && giving === null}
        title={b.giveOut}
        onClose={() => setGivesOpen(false)}
      >
        <ul className="flex flex-col">
          {openGives.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => setGiving(g)}
                className="press flex w-full items-center justify-between gap-3 border-b border-raise-2 py-4 text-left text-lg last:border-0"
              >
                <span>{b.givePending(names(g.playerId), penaltyText(g.amount))}</span>
                <span className="label text-accent">{b.chooseShort}</span>
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>

      <BottomSheet
        open={giving !== null}
        title={giving ? b.chooseRecipient(penaltyText(giving.amount)) : ''}
        onClose={() => setGiving(null)}
      >
        {giving && (
          <div className="grid grid-cols-2 gap-2">
            {view.players
              .filter((p) => p.id !== giving.playerId)
              .map((p) => (
                <Button
                  key={p.id}
                  variant="secondary"
                  className="truncate"
                  onClick={() => {
                    void act({ type: 'give', giveId: giving.id, targetId: p.id }, giving.playerId)
                    setGiving(null)
                    if (openGives.length <= 1) setGivesOpen(false)
                  }}
                >
                  {p.name}
                </Button>
              ))}
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={logOpen} title={da.game.log} onClose={() => setLogOpen(false)}>
        {view.log.length === 0 ? (
          <p className="text-muted">{da.game.logEmpty}</p>
        ) : (
          <ol className="flex flex-col">
            {view.log
              .map((e, i) => (
                <li key={i} className="border-b border-raise-2 py-3 text-lg last:border-0">
                  {b.logLine(e, names, penaltyText)}
                </li>
              ))
              .reverse()}
          </ol>
        )}
      </BottomSheet>

      <Toast message={error} onDone={() => setError(null)} />
    </>
  )
}

type Names = (id: string) => string
type Penalty = (n: number) => string
type Can = (id: PlayerId) => boolean

function dealPhase(view: BussenView, names: Names, penalty: Penalty, can: Can, act: Act) {
  const b = da.bussen
  const turnId = view.turnPlayerId!
  const hand = view.hands[turnId] ?? []
  const last = [...view.log].reverse().find((e) => e.type === 'guess')
  const lastCard = last?.type === 'guess' ? last : null

  const body = (
    <div className="flex flex-col gap-6 pt-2">
      <div>
        <p className="label text-muted">{b.roundOf(view.round)}</p>
        <h2
          key={view.round}
          className="display mt-1 text-[clamp(2.75rem,13.5vw,5.5rem)] text-accent"
        >
          <SplitWords text={b.questions[view.round]} />
        </h2>
      </div>

      <div>
        <p className="label mb-2 text-muted">{names(turnId)}</p>
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) =>
            hand[i] ? (
              <SizedCard key={hand[i].id} card={hand[i]} className="w-full" />
            ) : (
              <div
                key={i}
                className={`card-shape rounded-[6cqw] border-2 border-dashed ${i === hand.length ? 'border-accent' : 'border-raise-2'}`}
                style={{ boxShadow: 'none' }}
              />
            ),
          )}
        </div>
      </div>

      {lastCard && (
        <div key={view.log.length} className="flex items-center gap-4">
          <FlipCard card={lastCard.card} className="!w-20 shrink-0" />
          <p className="text-lg leading-snug">
            {lastCard.correct
              ? b.right(names(lastCard.playerId), penalty(lastCard.amount))
              : b.wrong(names(lastCard.playerId), penalty(lastCard.amount))}
          </p>
        </div>
      )}
    </div>
  )

  const choices = DEAL_CHOICES[view.round]
  const footer = can(turnId) ? (
    <div className={`grid gap-2 ${choices.length === 4 ? 'grid-cols-2' : 'grid-cols-2'}`}>
      {choices.map((g) => (
        <Button
          key={g}
          className={choices.length === 2 ? 'min-h-18 text-xl' : ''}
          onClick={() => void act({ type: 'guess', guess: g }, turnId)}
        >
          {b.guesses[g]}
        </Button>
      ))}
    </div>
  ) : (
    <p className="label py-6 text-center text-muted">{da.game.waitingFor(names(turnId))}</p>
  )
  return { body, footer }
}

const ROWS = [[9], [7, 8], [4, 5, 6], [0, 1, 2, 3]] as const

function pyramidPhase(
  view: BussenView,
  names: Names,
  penalty: Penalty,
  can: Can,
  canRunTable: boolean,
  tableActor: PlayerId,
  act: Act,
) {
  const b = da.bussen
  const current = view.revealed - 1

  const body = (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex flex-col items-center gap-1.5">
        {ROWS.map((row, r) => (
          <div key={r} className="flex gap-1.5">
            {row.map((i) => (
              <div
                key={i}
                className={`w-[17vw] max-w-20 rounded-[1.1rem] transition-transform duration-500 ease-[var(--ease-house)] ${i === current ? 'scale-110 ring-4 ring-accent' : ''}`}
              >
                {view.pyramid[i] ? (
                  <div key={view.pyramid[i]!.id}>
                    <FlipCard card={view.pyramid[i]!} className="!w-full" />
                  </div>
                ) : (
                  <SizedCard card={null} className="w-full" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {view.currentValue !== null && (
        <p className="text-center text-xl font-semibold text-accent">
          {b.rowValue(penalty(view.currentValue))}
        </p>
      )}

      {view.revealed > 0 && (
        <section>
          <h2 className="label mb-2 text-muted">{b.matches}</h2>
          {view.matches.length === 0 ? (
            <p className="text-muted">{b.noMatches}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {view.matches.map((m) => {
                const card = view.hands[m.playerId]!.find((c) => c.id === m.cardId)!
                return (
                  <li
                    key={m.cardId}
                    className="flex items-center gap-3 rounded-2xl bg-raise p-2 pl-3"
                  >
                    <SizedCard card={card} className="w-10 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-lg">
                      {b.hasMatch(names(m.playerId))}
                    </span>
                    {can(m.playerId) && (
                      <Button
                        className="min-h-12 px-4 text-base"
                        onClick={() =>
                          void act({ type: 'playMatch', cardId: m.cardId }, m.playerId)
                        }
                      >
                        {b.playCard(da.card.short(card.rank))}
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      <section>
        <h2 className="label mb-2 text-muted">{b.hands}</h2>
        <ul className="flex flex-col gap-2">
          {view.players.map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              <span className="w-24 shrink-0 truncate">{p.name}</span>
              <span className="flex gap-1">
                {(view.hands[p.id] ?? []).map((c) => (
                  <SizedCard key={c.id} card={c} className="w-8" />
                ))}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )

  const done = view.revealed === 10
  const footer = canRunTable ? (
    <Button
      className="min-h-18 text-xl"
      onClick={() => void act({ type: done ? 'startBus' : 'revealNext' }, tableActor)}
    >
      {done ? b.findDriver : b.revealNext}
    </Button>
  ) : (
    <p className="label py-6 text-center text-muted">{b.waitForHost}</p>
  )
  return { body, footer }
}

function busPhase(view: BussenView, names: Names, penalty: Penalty, can: Can, act: Act) {
  const b = da.bussen
  const driver = view.driverId!
  const miss = view.lastBusCard && !view.lastBusCard.correct ? view.lastBusCard : null

  const body = (
    <div className="flex flex-col gap-6 pt-2">
      <div>
        <p className="label text-muted">
          {b.attempts(view.attempts)} · {b.driverReason[view.driverReason ?? 'cards']}
        </p>
        <h2
          key={`${view.attempts}-${view.busPosition}`}
          className="display mt-1 text-[clamp(2.75rem,13.5vw,5.5rem)] text-accent"
        >
          <SplitWords text={b.busQuestion(view.busPosition)} />
        </h2>
      </div>

      <div key={`bus-${view.attempts}`} className="grid grid-cols-5 gap-1.5">
        {view.bus.map((c, i) => (
          <div
            key={i}
            className={`rounded-[0.9rem] ${i === view.busPosition ? 'ring-4 ring-accent' : ''}`}
          >
            {c ? (
              <FlipCard card={c} className="!w-full" />
            ) : (
              <SizedCard card={null} className="deal w-full" />
            )}
          </div>
        ))}
      </div>

      {miss && (
        <div key={`miss-${view.attempts}`} className="flex items-center gap-4">
          <FlipCard card={miss.card} className="!w-20 shrink-0" />
          <p className="text-lg leading-snug">{b.busMiss(miss.position, penalty(miss.position))}</p>
        </div>
      )}
    </div>
  )

  const choices: BusGuess[] = view.busPosition === 0 ? ['red', 'black'] : ['higher', 'lower']
  const footer = can(driver) ? (
    <div className="grid grid-cols-2 gap-2">
      {choices.map((g) => (
        <Button
          key={g}
          className="min-h-18 text-xl"
          onClick={() => void act({ type: 'busGuess', guess: g }, driver)}
        >
          {b.guesses[g]}
        </Button>
      ))}
    </div>
  ) : (
    <p className="label py-6 text-center text-muted">{da.game.waitingFor(names(driver))}</p>
  )
  return { body, footer }
}
