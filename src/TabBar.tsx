import { useEffect, useRef, type ReactNode } from 'react';
import { VIEW_NAME, VIEWS, viewHref, type View } from './route.ts';

/** Simple line icons, drawn in the text colour. */
const ICONS: Record<View, ReactNode> = {
  picks: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1.25" />
      <circle cx="4.5" cy="12" r="1.25" />
      <circle cx="4.5" cy="18" r="1.25" />
    </>
  ),
  flips: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8 12.5 2.75 2.75L16.5 9.5" />
    </>
  ),
  watch: <path d="m12 3.5 2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9Z" />,
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
};

/**
 * The bottom bar: every tab one tap away, in thumb reach. Real links (the
 * address holds the tab), with the shown tab marked by more than colour.
 */
export function TabBar({
  current,
  counts,
  search,
  onSelect,
}: {
  current: View;
  /** A number shown on a tab, such as how many flips are open. */
  counts: Partial<Record<View, number>>;
  /** The address's query as it should be now, for the links. */
  search: string;
  onSelect: (view: View) => void;
}) {
  // Messages sit just above the bar, however tall large text makes it.
  const bar = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = bar.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() =>
      document.documentElement.style.setProperty('--tabbar-height', `${element.offsetHeight}px`),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="tabbar" aria-label="Sections" ref={bar}>
      <ul>
        {VIEWS.map((view) => (
          <li key={view}>
            <a
              href={viewHref(search, view)}
              aria-current={view === current ? 'page' : undefined}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                event.preventDefault();
                onSelect(view);
              }}
            >
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                {ICONS[view]}
              </svg>
              <span>
                {VIEW_NAME[view]}
                {(counts[view] ?? 0) > 0 && <span className="count"> {counts[view]}</span>}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
