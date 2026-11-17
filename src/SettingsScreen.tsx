import { useRef } from 'react';
import type { Settings } from '../shared/settings.ts';
import { ItemIcon } from './ItemIcon.tsx';
import { UnsavedNotice } from './Lists.tsx';
import type { SavedItem } from './personal.ts';
import { itemHref } from './route.ts';
import { RowLink } from './RowLink.tsx';

const hour = (h: number) => `${String(h).padStart(2, '0')}:00`;

/** The Settings tab (docs/spec.md §7.7): night hours and the blocklist. */
export function SettingsScreen({
  settings,
  blocked,
  unsaved,
  onUnblock,
  onOpen,
}: {
  settings: Settings;
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

      <section className="card" aria-labelledby="hours-title">
        <h2 id="hours-title">Night hours</h2>
        <dl className="facts">
          <div>
            <dt>Buy while you sleep</dt>
            <dd>
              {hour(settings.buyStartHour)} to {hour(settings.buyEndHour)}
            </dd>
          </div>
          <div>
            <dt>Sell the next day</dt>
            <dd>
              {hour(settings.sellStartHour)} to {hour(settings.sellEndHour)}
            </dd>
          </div>
        </dl>
        <p className="muted small">Manila time. The hourly update scores every item with these.</p>
      </section>

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
