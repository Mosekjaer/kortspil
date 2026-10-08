import { describe, expect, it } from 'vitest'
import { DEFAULT_RULES, renderRuleText } from '../src/index.js'

describe('renderRuleText', () => {
  it('uses singular and plural', () => {
    const rule = { text: 'Tag {straf:1}, så {straf:3}.' }
    expect(renderRuleText(rule, { preset: 'pushups' })).toBe('Tag 1 armbøjning, så 3 armbøjninger.')
    expect(renderRuleText(rule, { preset: 'sip' })).toBe('Tag 1 tår, så 3 tår.')
    expect(renderRuleText(rule, { preset: 'points' })).toBe('Tag 1 strafpoint, så 3 strafpoint.')
  })

  it('supports a custom penalty', () => {
    const setting = { custom: { singular: 'kram', plural: 'kram' } }
    expect(renderRuleText({ text: '{straf:2}' }, setting)).toBe('2 kram')
  })

  it('uses soberText only when the penalty is not sips', () => {
    const ace = DEFAULT_RULES[14]
    expect(renderRuleText(ace, { preset: 'sip' })).toBe(ace.text)
    expect(renderRuleText(ace, { preset: 'points' })).toBe('Alle tager 1 strafpoint.')
    expect(renderRuleText(DEFAULT_RULES[13], { preset: 'pushups' })).toBe(
      'Den, der trækker 4. konge, tager 5 armbøjninger.',
    )
  })

  it('falls back to text when there is no soberText', () => {
    expect(renderRuleText(DEFAULT_RULES[3], { preset: 'pushups' })).toBe('Du tager 3 armbøjninger.')
  })
})
