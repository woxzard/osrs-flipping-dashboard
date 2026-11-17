import { useId, useState, type FormEvent } from 'react';
import { formatGp, parseGp } from '../shared/format.ts';
import type { Choice, VolumeTab } from '../shared/rank.ts';
import { CASH_MAX, CASH_MIN, CASH_PRESETS, isValidCash, SLOTS_MAX, SLOTS_MIN } from './choice.ts';

const TABS: { value: VolumeTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'high', label: 'High' },
  { value: 'low', label: 'Low' },
];

/** One line for the chosen volume tab: what it means. */
export function volumeExplainer(volume: VolumeTab, sharePercent: number): string {
  switch (volume) {
    case 'high':
      return `High: your order is at most ${sharePercent}% of what trades in your night hours. Fills more reliably, thinner margin.`;
    case 'low':
      return `Low: your order is more than ${sharePercent}% of what trades in your night hours. Fatter margin, may not fill.`;
    default:
      return `All volumes. High means your order is at most ${sharePercent}% of what trades in your night hours.`;
  }
}

/** Shown under the custom field when the amount can't be used. */
const CASH_ERROR = `Enter an amount from ${formatGp(CASH_MIN)} to ${formatGp(CASH_MAX)}, in millions (25 = 25m).`;

/** The amount in the custom field, in millions: 25000000 → "25", 750000 → "0.75". */
const asMillions = (cash: number) => String(cash / 1e6);

function CashControl({ cash, onChange }: { cash: number; onChange: (cash: number) => void }) {
  const isPreset = (CASH_PRESETS as readonly number[]).includes(cash);
  const [customOpen, setCustomOpen] = useState(!isPreset);
  const [text, setText] = useState(isPreset ? '' : asMillions(cash));
  const [error, setError] = useState(false);
  const [shownCash, setShownCash] = useState(cash);
  const fieldId = useId();
  const errorId = useId();

  // Cash changed from outside (back, forward): show it, without remounting
  // anything, so a tap or the keyboard focus is never lost.
  if (cash !== shownCash) {
    setShownCash(cash);
    if (!isPreset) {
      setCustomOpen(true);
      setText(asMillions(cash));
      setError(false);
    }
  }

  const apply = (event?: FormEvent) => {
    event?.preventDefault();
    if (text.trim() === '') return; // nothing typed yet: keep the last amount
    const amount = parseGp(text, 1e6);
    if (!isValidCash(amount)) {
      setError(true);
      return;
    }
    setError(false);
    if (amount !== cash) onChange(amount);
  };

  const custom = customOpen || !isPreset;
  return (
    <fieldset className="control">
      <legend>Cash to spend</legend>
      <div className="chips">
        {CASH_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className="chip"
            aria-pressed={!custom && cash === preset}
            onClick={() => {
              // The custom draft is kept for when Custom is tapped again.
              setCustomOpen(false);
              onChange(preset);
            }}
          >
            {formatGp(preset)}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          aria-pressed={custom}
          onClick={() => {
            setCustomOpen(true);
            if (!text) setText(asMillions(cash));
          }}
        >
          Custom
        </button>
      </div>
      {custom && (
        <form className="custom-cash" onSubmit={apply}>
          <label htmlFor={fieldId}>Custom amount</label>
          <div className="with-unit">
            <input
              id={fieldId}
              type="text"
              inputMode="decimal"
              enterKeyHint="done"
              autoComplete="off"
              value={text}
              aria-invalid={error}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) => {
                setText(event.target.value);
                if (error && isValidCash(parseGp(event.target.value, 1e6))) setError(false);
              }}
              onBlur={() => apply()}
            />
            <span className="unit">m</span>
          </div>
          {error && (
            <p id={errorId} className="field-error" role="alert">
              {CASH_ERROR}
            </p>
          )}
        </form>
      )}
    </fieldset>
  );
}

function SlotsControl({ slots, onChange }: { slots: number; onChange: (slots: number) => void }) {
  const labelId = useId();
  return (
    <div className="control inline" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="control-label">
        Free slots
      </span>
      <div className="stepper">
        <button
          type="button"
          className="step"
          aria-label="Fewer free slots"
          disabled={slots <= SLOTS_MIN}
          onClick={() => onChange(slots - 1)}
        >
          −
        </button>
        <output aria-live="polite" aria-label={`${slots} free ${slots === 1 ? 'slot' : 'slots'}`}>
          {slots}
        </output>
        <button
          type="button"
          className="step"
          aria-label="More free slots"
          disabled={slots >= SLOTS_MAX}
          onClick={() => onChange(slots + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function Controls({
  choice,
  cashPerSlot,
  highVolumeShare,
  onChange,
}: {
  choice: Choice;
  cashPerSlot: number;
  highVolumeShare: number;
  onChange: (choice: Choice) => void;
}) {
  const sharePercent = Math.round(highVolumeShare * 1000) / 10;
  return (
    <section className="controls" aria-label="Controls">
      <CashControl cash={choice.cash} onChange={(cash) => onChange({ ...choice, cash })} />
      <SlotsControl
        slots={choice.freeSlots}
        onChange={(freeSlots) => onChange({ ...choice, freeSlots })}
      />
      {choice.freeSlots > 1 && (
        <p className="muted small">Each pick is sized for {formatGp(cashPerSlot)} per slot.</p>
      )}
      <fieldset className="control">
        <legend>Volume</legend>
        <div className="tabs">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className="tab"
              aria-pressed={choice.volume === tab.value}
              onClick={() => onChange({ ...choice, volume: tab.value })}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="muted small">{volumeExplainer(choice.volume, sharePercent)}</p>
      </fieldset>
    </section>
  );
}
