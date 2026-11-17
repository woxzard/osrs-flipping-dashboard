import { useId, useRef, useState } from 'react';
import { sameHours, type WindowHours } from '../shared/rescore.ts';
import { formatHour, formatHours, fromChoices, hoursProblem } from './hours.ts';
import { useToast } from './Toast.tsx';
import type { Settings } from '../shared/settings.ts';
import { ItemIcon } from './ItemIcon.tsx';
import { UnsavedNotice } from './Lists.tsx';
import type { SavedItem } from './personal.ts';
import { itemHref } from './route.ts';
import { RowLink } from './RowLink.tsx';

function HourSelect({
  label,
  value,
  invalid,
  onChange,
}: {
  label: string;
  value: number;
  invalid: boolean;
  onChange: (hour: number) => void;
}) {
  const id = useId();
  return (
    <div className="hour-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? 'hours-error' : undefined}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {Array.from({ length: 24 }, (_, hour) => (
          <option key={hour} value={hour}>
            {formatHour(hour)}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * My night hours: saved as soon as they're changed (with Undo), when they
 * make sense; otherwise kept as typed with the reason next to them.
 */
function NightHours({
  jobHours,
  myHours,
  unsaved,
  onHours,
}: {
  jobHours: WindowHours;
  myHours: WindowHours | null;
  /** The browser didn't keep the last change. */
  unsaved: boolean;
  onHours: (hours: WindowHours | null) => void;
}) {
  const toast = useToast();
  const current = myHours ?? jobHours;
  const [draft, setDraft] = useState(() => ({
    bed: current.buyStartHour,
    wake: current.buyEndHour,
    stop: current.sellEndHour,
  }));
  const [problem, setProblem] = useState<string | null>(null);

  const save = (next: WindowHours | null, text: string) => {
    const before = myHours;
    onHours(next);
    toast({ text, undo: () => onHours(before) });
  };

  const change = (field: 'bed' | 'wake' | 'stop', hour: number) => {
    const next = { ...draft, [field]: hour };
    setDraft(next);
    const hours = fromChoices(next.bed, next.wake, next.stop);
    const reason = hoursProblem(hours);
    setProblem(reason);
    if (reason) return;
    if (sameHours(hours, jobHours)) save(null, 'Back to the default hours');
    else save(hours, 'Night hours saved');
  };

  const custom = myHours !== null && !sameHours(myHours, jobHours);

  return (
    <section className="card" aria-labelledby="hours-title">
      <h2 id="hours-title">Night hours</h2>
      <p className="muted small">Manila time. Buying runs while you sleep, selling the next day.</p>
      <div className="hour-fields">
        <HourSelect
          label="Start buying (bedtime)"
          value={draft.bed}
          invalid={problem !== null}
          onChange={(hour) => change('bed', hour)}
        />
        <HourSelect
          label="Start selling (wake up)"
          value={draft.wake}
          invalid={problem !== null}
          onChange={(hour) => change('wake', hour)}
        />
        <HourSelect
          label="Stop selling"
          value={draft.stop}
          invalid={problem !== null}
          onChange={(hour) => change('stop', hour)}
        />
      </div>
      {problem && (
        <p className="field-error" id="hours-error" role="alert">
          {problem} Not saved yet.
        </p>
      )}
      {unsaved && <UnsavedNotice />}
      {custom ? (
        <>
          <p className="small">
            <strong>Your hours.</strong> The phone scores the picks with them after each hourly
            update: it downloads about 3.7 MB and takes a few seconds. The default is{' '}
            {formatHours(jobHours)}.
          </p>
          <button
            type="button"
            className="button secondary"
            onClick={() => save(null, 'Back to the default hours')}
          >
            Use the default hours
          </button>
        </>
      ) : (
        <p className="small muted">
          The default hours: the hourly update scores every item with these, so nothing extra is
          downloaded.
        </p>
      )}
    </section>
  );
}

/** The Settings tab (docs/spec.md §7.7): night hours and the blocklist. */
export function SettingsScreen({
  jobSettings,
  myHours,
  hoursUnsaved,
  onHours,
  blocked,
  unsaved,
  onUnblock,
  onOpen,
}: {
  /** The hours the hourly update scores with. */
  jobSettings: Settings;
  /** My own, or null for the job's. */
  myHours: WindowHours | null;
  /** The browser didn't keep the last change of hours. */
  hoursUnsaved: boolean;
  onHours: (hours: WindowHours | null) => void;
  /** Items never shown in the picks, newest first. */
  blocked: SavedItem[];
  unsaved: boolean;
  onUnblock: (id: number) => void;
  onOpen: (id: number) => void;
}) {
  // Focus stays in this section when a row goes, even the last one.
  const section = useRef<HTMLElement>(null);
  return (
    <>
      <header className="page-header">
        <h1>Settings</h1>
        <p className="muted">Your night hours and the items you never want to see.</p>
      </header>
      {unsaved && <UnsavedNotice />}

      <NightHours
        key={`${myHours ? formatHours(myHours) : 'job'}|${formatHours(jobSettings)}`}
        jobHours={jobSettings}
        myHours={myHours}
        unsaved={hoursUnsaved}
        onHours={onHours}
      />

      <section
        className="settings-section"
        aria-labelledby="block-title"
        ref={section}
        tabIndex={-1}
      >
        <h2 id="block-title">Never shown</h2>
        <p className="muted small">Kept on this phone.</p>
        {blocked.length === 0 ? (
          <p className="muted">
            Nothing blocked. Open an item and tap “Never show this item” to keep it out of the
            picks.
          </p>
        ) : (
          <ul className="list" aria-label="Blocked items">
            {blocked.map((saved) => (
              <li key={saved.id}>
                <article className="pick blocked-row" aria-label={saved.name}>
                  <header className="pick-head">
                    <ItemIcon key={saved.icon} icon={saved.icon} name={saved.name} />
                    <h3 className="pick-name">
                      <RowLink
                        href={itemHref(window.location.search, saved.id)}
                        name={saved.name}
                        onOpen={() => onOpen(saved.id)}
                      />
                    </h3>
                  </header>
                  <div className="pick-actions">
                    <button
                      type="button"
                      className="button secondary"
                      aria-label={`Show again: ${saved.name}`}
                      onClick={() => {
                        onUnblock(saved.id);
                        section.current?.focus({ preventScroll: true }); // the row is gone
                      }}
                    >
                      Show again
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
