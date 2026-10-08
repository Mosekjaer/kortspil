import { DEFAULT_RULES, type CardRule, type Rank, type RuleSet } from '@kortspil/core'
import { keys, load, save } from '../../storage'

export type RuleOverrides = Partial<Record<Rank, CardRule>>

const KEY = keys.customRules('ringOfFire')

export function loadRuleOverrides(): RuleOverrides {
  return load<RuleOverrides>(KEY, {})
}

export function saveRuleOverrides(overrides: RuleOverrides): void {
  save(KEY, overrides)
}

/** Defaults with the user's own texts on top. */
export function effectiveRules(overrides = loadRuleOverrides()): RuleSet {
  const rules = { ...DEFAULT_RULES }
  for (const [rank, rule] of Object.entries(overrides)) {
    const r = Number(rank) as Rank
    if (rule && r in rules && rule.name.trim() && rule.text.trim()) rules[r] = rule
  }
  return rules
}
