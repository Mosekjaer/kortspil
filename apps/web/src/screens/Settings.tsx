import { PENALTY_PRESETS, formatPenalty, type PenaltyPreset } from '@kortspil/core'
import { useApp } from '../app'
import { Button } from '../components/Button'
import { Display, ScreenLayout } from '../components/ScreenLayout'
import { Toggle } from '../components/Toggle'
import { da } from '../i18n/da'
import { useSettings } from '../settings'

const PRESETS = Object.keys(PENALTY_PRESETS) as PenaltyPreset[]

export function Settings() {
  const { back, go } = useApp()
  const { penalty, sound, vibration, update } = useSettings()
  const t = da.settings
  const custom = 'custom' in penalty ? penalty.custom : null

  const option = (selected: boolean, label: string, onSelect: () => void) => (
    <label
      key={label}
      className={`press flex min-h-14 items-center gap-3 rounded-2xl px-4 text-lg ${selected ? 'bg-accent font-semibold text-ink' : 'bg-raise'}`}
    >
      <input
        type="radio"
        name="penalty"
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      {label}
    </label>
  )

  return (
    <ScreenLayout onBack={back}>
      <Display className="mb-8">{t.title}</Display>
      <section className="flex flex-col gap-2">
        <h2 className="label text-muted">{t.penalty}</h2>
        <p className="mb-1 text-muted">{t.penaltyHelp}</p>
        {PRESETS.map((preset) =>
          option(
            'preset' in penalty && penalty.preset === preset,
            `${t.penaltyPresets[preset]} · ${formatPenalty(2, PENALTY_PRESETS[preset])}`,
            () => update({ penalty: { preset } }),
          ),
        )}
        {option(!!custom, t.custom, () =>
          update({ penalty: { custom: custom ?? { singular: 'kram', plural: 'kram' } } }),
        )}
        {custom && (
          <div className="grid grid-cols-2 gap-2">
            {(['singular', 'plural'] as const).map((field) => (
              <label key={field} className="flex min-w-0 flex-col gap-1.5">
                <span className="label text-muted">{t[field]}</span>
                <input
                  value={custom[field]}
                  maxLength={20}
                  onChange={(e) =>
                    update({ penalty: { custom: { ...custom, [field]: e.target.value } } })
                  }
                  className="min-h-14 min-w-0 rounded-2xl bg-raise px-4 text-lg outline-none focus:ring-2 focus:ring-accent"
                />
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 flex flex-col gap-2">
        <h2 className="label text-muted">{t.feedback}</h2>
        <Toggle label={t.sound} checked={sound} onChange={(v) => update({ sound: v })} />
        <Toggle
          label={t.vibration}
          checked={vibration}
          onChange={(v) => update({ vibration: v })}
        />
      </section>

      <section className="mt-8">
        <Button variant="secondary" className="w-full" onClick={() => go({ name: 'rules' })}>
          {t.customRules}
        </Button>
      </section>

      <p className="mt-8 border-t border-raise-2 pt-6 text-muted">{t.responsible}</p>
    </ScreenLayout>
  )
}
