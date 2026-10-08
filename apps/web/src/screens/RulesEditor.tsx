import { useState } from 'react'
import { DEFAULT_RULES, RANKS, renderRuleText, type CardRule, type Rank } from '@kortspil/core'
import { useApp } from '../app'
import { Button } from '../components/Button'
import { Display, ScreenLayout } from '../components/ScreenLayout'
import {
  effectiveRules,
  loadRuleOverrides,
  saveRuleOverrides,
  type RuleOverrides,
} from '../games/ringOfFire/customRules'
import { da } from '../i18n/da'
import { useSettings } from '../settings'

// Ace first, as players know the list.
const ORDER: Rank[] = [14, ...RANKS.filter((r) => r !== 14)]

const same = (a: CardRule, b: CardRule) =>
  a.name === b.name && a.text === b.text && (a.soberText ?? '') === (b.soberText ?? '')

/** Edit Ring of Fire rule texts per card. Saved locally on every change. */
export function RulesEditor() {
  const back = useApp((s) => s.back)
  const penalty = useSettings((s) => s.penalty)
  const [rules, setRules] = useState(() => effectiveRules(loadRuleOverrides()))
  const t = da.rulesEditor

  const persist = (next: typeof rules) => {
    setRules(next)
    const overrides: RuleOverrides = {}
    for (const rank of RANKS) {
      const rule = next[rank]
      if (!same(rule, DEFAULT_RULES[rank])) overrides[rank] = rule
    }
    saveRuleOverrides(overrides)
  }

  const edit = (rank: Rank, patch: Partial<CardRule>) => {
    const rule = { ...rules[rank], ...patch }
    if (rule.soberText === '') delete rule.soberText
    persist({ ...rules, [rank]: rule })
  }

  const field =
    'min-h-14 w-full rounded-2xl bg-raise px-4 py-3 text-lg outline-none placeholder:text-muted focus:ring-2 focus:ring-accent'

  return (
    <ScreenLayout
      title={da.games.ringOfFire.name}
      onBack={back}
      right={
        <Button variant="ghost" onClick={() => persist({ ...DEFAULT_RULES })}>
          {t.resetAll}
        </Button>
      }
    >
      <Display className="mb-4">{t.title}</Display>
      <p className="mb-6 text-muted">{t.help}</p>
      <ul className="flex flex-col gap-4">
        {ORDER.map((rank) => {
          const rule = rules[rank]
          const invalid = !rule.name.trim() || !rule.text.trim()
          return (
            <li key={rank} className="flex flex-col gap-2 border-t border-raise-2 pt-4">
              <div className="flex items-center justify-between">
                <span className="display text-5xl text-accent">
                  {da.ringOfFire.rankLabel(rank)}
                </span>
                {!same(rule, DEFAULT_RULES[rank]) && (
                  <Button variant="ghost" onClick={() => edit(rank, DEFAULT_RULES[rank])}>
                    {t.reset}
                  </Button>
                )}
              </div>
              <Field label={t.name}>
                <input
                  value={rule.name}
                  maxLength={30}
                  onChange={(e) => edit(rank, { name: e.target.value })}
                  className={field}
                />
              </Field>
              <Field label={t.text}>
                <textarea
                  value={rule.text}
                  rows={3}
                  maxLength={200}
                  onChange={(e) => edit(rank, { text: e.target.value })}
                  className={field}
                />
              </Field>
              <Field label={t.soberText}>
                <textarea
                  value={rule.soberText ?? ''}
                  rows={2}
                  maxLength={200}
                  onChange={(e) => edit(rank, { soberText: e.target.value })}
                  className={field}
                />
              </Field>
              {invalid ? (
                <p className="text-paper font-semibold">{t.empty}</p>
              ) : (
                <p className="text-muted">
                  {t.preview}: <span className="text-paper">{renderRuleText(rule, penalty)}</span>
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </ScreenLayout>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label text-muted">{label}</span>
      {children}
    </label>
  )
}
