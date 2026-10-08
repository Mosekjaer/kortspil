/** How a penalty is phrased in rule texts, e.g. "2 tår" or "1 armbøjning". */
export interface Penalty {
  singular: string
  plural: string
}

export type PenaltyPreset = 'sip' | 'points' | 'pushups'

export const PENALTY_PRESETS: Record<PenaltyPreset, Penalty> = {
  sip: { singular: 'tår', plural: 'tår' },
  points: { singular: 'strafpoint', plural: 'strafpoint' },
  pushups: { singular: 'armbøjning', plural: 'armbøjninger' },
}

export type PenaltySetting = { preset: PenaltyPreset } | { custom: Penalty }

export const DEFAULT_PENALTY: PenaltySetting = { preset: 'sip' }

export function resolvePenalty(setting: PenaltySetting): Penalty {
  return 'preset' in setting ? PENALTY_PRESETS[setting.preset] : setting.custom
}

/** Drinking is only implied by the default "tår" penalty. */
export function isSober(setting: PenaltySetting): boolean {
  return !('preset' in setting && setting.preset === 'sip')
}

export function formatPenalty(amount: number, penalty: Penalty): string {
  return `${amount} ${amount === 1 ? penalty.singular : penalty.plural}`
}

export interface RuleText {
  text: string
  /** Used instead of `text` when the penalty is not "tår". */
  soberText?: string
}

const TEMPLATE = /\{straf:(\d+)\}/g

/** Fills `{straf:N}` placeholders and picks the sober variant when relevant. */
export function renderRuleText(rule: RuleText, setting: PenaltySetting): string {
  const penalty = resolvePenalty(setting)
  const source = isSober(setting) && rule.soberText ? rule.soberText : rule.text
  return source.replace(TEMPLATE, (_, n: string) => formatPenalty(Number(n), penalty))
}
