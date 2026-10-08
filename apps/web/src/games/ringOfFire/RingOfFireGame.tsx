import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  MAX_CUSTOM_RULE_LENGTH,
  formatPenalty,
  isSober,
  renderRuleText,
  resolvePenalty,
  type RingOfFireAction,
  type RingOfFireView,
} from '@kortspil/core'
import type { Session } from '../../app'
import { BottomSheet } from '../../components/BottomSheet'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { EndScreen } from '../../components/EndScreen'
import { GameFrame } from '../../components/GameFrame'
import { CardBack, Deck, FlipCard } from '../../components/PlayingCard'
import { SplitWords } from '../../components/SplitWords'
import { Toast } from '../../components/Toast'
import { feedback } from '../../feedback'
import { da } from '../../i18n/da'
import type { Runner } from '../../runtime/runner'
import { ConnectionBanner } from '../../components/ConnectionBanner'
import { useRunner } from '../../runtime/useRunner'

type Sheet = 'log' | 'rules' | null

export function RingOfFireGame({ session }: { session: Session }) {
  const runner = session.runner as Runner<RingOfFireView, RingOfFireAction>
  const { view, status, dispatch } = useRunner(runner)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [error, setError] = useState<string | null>(null)
  const [kingSeen, setKingSeen] = useState(false)
  const t = da.ringOfFire

  const names = useMemo(() => {
    const map = new Map(view.players.map((p) => [p.id, p.name]))
    return (id: string) => map.get(id) ?? '?'
  }, [view.players])

  const turnId = view.turnPlayerId
  const myTurn = session.canActFor(turnId) && status === 'ready'
  const forOther = session.me !== null && turnId !== session.me

  // Single phone: the phone acts for whoever is in turn. Rooms: own seat, or
  // the host playing a guest/offline seat via actingAs.
  const act = useCallback(
    async (action: RingOfFireAction) => {
      const err = await dispatch(action, session.me === turnId ? undefined : turnId)
      if (err) setError(da.errorText(err))
    },
    [dispatch, session.me, turnId],
  )

  const wasMyTurn = useRef(false)
  useEffect(() => {
    const mine = session.me !== null && turnId === session.me
    if (mine && !wasMyTurn.current) feedback.yourTurn()
    wasMyTurn.current = mine
  }, [session.me, turnId])

  const lastCardId = view.lastCard?.id
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (lastCardId) feedback.cardFlip()
  }, [lastCardId])

  const fourthKing = view.lastCard?.rank === 13 && view.kingsDrawn === 4
  const showKing = fourthKing && !kingSeen

  if (view.phase === 'finished' && !showKing) {
    return (
      <EndScreen
        reason={da.game.finish[view.finishReason ?? 'deckEmpty']}
        stats={[
          { value: view.log.filter((e) => e.type === 'draw').length, label: t.statDraws },
          { value: view.mates.length, label: t.statMates },
          { value: view.customRules.length, label: t.statRules },
        ]}
        onPlayAgain={session.playAgain}
        onQuit={session.quit}
      />
    )
  }

  if (showKing) {
    const drawer = names(view.lastDrawerId!)
    const sober = isSober(view.options.penalty)
    return (
      <div className="flex h-dvh flex-col bg-accent px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-ink">
        <div className="rise flex flex-1 flex-col justify-end gap-6">
          <p className="label" style={{ '--i': 0 } as React.CSSProperties}>
            {t.kings(4)}
          </p>
          <h1
            className="display text-[clamp(5rem,30vw,10rem)]"
            style={{ '--i': 1 } as React.CSSProperties}
          >
            {t.fourthKingTitle}
          </h1>
          <p className="text-2xl font-semibold" style={{ '--i': 2 } as React.CSSProperties}>
            {sober
              ? t.fourthKingBodySober(
                  drawer,
                  formatPenalty(5, resolvePenalty(view.options.penalty)),
                )
              : t.fourthKingBody(drawer)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setKingSeen(true)}
          className="press mt-8 min-h-18 rounded-full bg-ink text-xl font-semibold text-paper"
        >
          {t.continue}
        </button>
      </div>
    )
  }

  const rule = view.lastCard ? view.options.rules[view.lastCard.rank] : null
  const title = session.me === turnId ? da.game.yourTurn : da.game.turn(names(turnId))

  return (
    <>
      <GameFrame
        title={title}
        onQuit={session.quit}
        banner={<ConnectionBanner status={status} />}
        menuItems={[
          { label: da.game.log, onSelect: () => setSheet('log') },
          { label: da.game.activeRules, onSelect: () => setSheet('rules') },
        ]}
        footer={
          myTurn ? (
            <>
              {forOther && (
                <p className="label text-center text-accent">{da.game.actingFor(names(turnId))}</p>
              )}
              <Actions view={view} names={names} act={act} />
            </>
          ) : (
            <p className="label py-6 text-center text-muted">{da.game.waitingFor(names(turnId))}</p>
          )
        }
      >
        <div className="flex flex-col items-center gap-5 pt-1">
          <Deck
            label={t.deckLabel}
            disabled={view.phase !== 'draw' || !myTurn}
            remaining={view.deckCount}
            onDraw={() => void act({ type: 'draw' })}
          >
            {view.lastCard ? (
              <FlipCard key={view.lastCard.id} card={view.lastCard} />
            ) : (
              <CardBack />
            )}
          </Deck>

          {rule && view.lastDrawerId ? (
            <div key={view.lastCard!.id} className="w-full" aria-live="polite">
              <p className="label text-muted">{da.game.drewCard(names(view.lastDrawerId))}</p>
              <h2 className="display mt-2 text-[clamp(2.75rem,13.5vw,5.5rem)] text-accent">
                <SplitWords text={rule.name} />
              </h2>
              <p className="mt-3 text-xl leading-snug text-pretty">
                <SplitWords text={renderRuleText(rule, view.options.penalty)} />
              </p>
            </div>
          ) : (
            <p className="label text-muted">{t.swipeHint}</p>
          )}

          <StatusChips view={view} names={names} onRules={() => setSheet('rules')} />
        </div>
      </GameFrame>

      <BottomSheet open={sheet === 'log'} title={da.game.log} onClose={() => setSheet(null)}>
        {view.log.length === 0 ? (
          <p className="text-muted">{da.game.logEmpty}</p>
        ) : (
          <ol className="flex flex-col">
            {view.log
              .map((entry, i) => (
                <li key={i} className="border-b border-raise-2 py-3 text-lg last:border-0">
                  {t.logLine(entry, names)}
                </li>
              ))
              .reverse()}
          </ol>
        )}
      </BottomSheet>

      <BottomSheet
        open={sheet === 'rules'}
        title={da.game.activeRules}
        onClose={() => setSheet(null)}
      >
        {view.customRules.length === 0 ? (
          <p className="text-muted">{da.game.noActiveRules}</p>
        ) : (
          <ol className="flex flex-col">
            {view.customRules.map((r, i) => (
              <li key={i} className="flex gap-4 border-b border-raise-2 py-3 last:border-0">
                <span className="display text-3xl text-accent">{i + 1}</span>
                <span className="text-lg">
                  {r.text}
                  <span className="label mt-1 block text-muted">{names(r.by)}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </BottomSheet>

      <Toast message={error} onDone={() => setError(null)} />
    </>
  )
}

function StatusChips({
  view,
  names,
  onRules,
}: {
  view: RingOfFireView
  names: (id: string) => string
  onRules: () => void
}) {
  const t = da.ringOfFire
  return (
    <div className="flex w-full flex-wrap gap-2">
      <Chip>{t.deckCount(view.deckCount)}</Chip>
      {view.kingsDrawn > 0 && <Chip>{t.kings(view.kingsDrawn)}</Chip>}
      {view.thumbMaster && <Chip active>{t.thumbMaster(names(view.thumbMaster))}</Chip>}
      {view.questionMaster && <Chip active>{t.questionMaster(names(view.questionMaster))}</Chip>}
      {view.mates.map(([a, b], i) => (
        <Chip key={i}>{t.mates(names(a), names(b))}</Chip>
      ))}
      {view.customRules.length > 0 && (
        <Chip onClick={onRules}>{t.customRules(view.customRules.length)}</Chip>
      )}
    </div>
  )
}

function Actions({
  view,
  names,
  act,
}: {
  view: RingOfFireView
  names: (id: string) => string
  act: (action: RingOfFireAction) => Promise<void>
}) {
  const t = da.ringOfFire
  const [text, setText] = useState('')

  if (view.pending === 'mate') {
    const others = view.players.filter((p) => p.id !== view.turnPlayerId)
    return (
      <div className="rise flex flex-col gap-3">
        <p className="label text-muted">{t.chooseMate}</p>
        <div className="grid grid-cols-2 gap-2">
          {others.map((p) => (
            <Button
              key={p.id}
              variant="secondary"
              className="truncate"
              onClick={() => act({ type: 'chooseMate', targetId: p.id })}
            >
              {names(p.id)}
            </Button>
          ))}
        </div>
        <Button variant="ghost" onClick={() => act({ type: 'skip' })}>
          {t.skip}
        </Button>
      </div>
    )
  }

  if (view.pending === 'rule') {
    const trimmed = text.trim()
    return (
      <form
        className="rise flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!trimmed) return
          void act({ type: 'addRule', text: trimmed }).then(() => setText(''))
        }}
      >
        <label className="label text-muted" htmlFor="new-rule">
          {t.writeRule}
        </label>
        <input
          id="new-rule"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_CUSTOM_RULE_LENGTH}
          placeholder={t.rulePlaceholder}
          enterKeyHint="done"
          className="min-h-14 rounded-2xl bg-raise px-4 text-lg outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
        />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => act({ type: 'skip' })}>
            {t.skip}
          </Button>
          <Button type="submit" disabled={!trimmed}>
            {t.addRule}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <Button className="min-h-18 text-xl" onClick={() => act({ type: 'draw' })}>
      {t.draw}
    </Button>
  )
}
