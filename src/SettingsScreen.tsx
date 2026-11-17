import type { Settings } from '../shared/settings.ts';

const hour = (h: number) => `${String(h).padStart(2, '0')}:00`;

/** The Settings tab (docs/spec.md §7.7). */
export function SettingsScreen({ settings }: { settings: Settings }) {
  return (
    <>
      <header className="page-header">
        <h1>Settings</h1>
        <p className="muted">What the picks are scored with.</p>
      </header>
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
    </>
  );
}
