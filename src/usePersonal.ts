import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from './Toast.tsx';
import {
  isPersonalKey,
  loadPersonal,
  storePersonal,
  withEntry,
  withoutEntry,
  type Flip,
  type ListName,
  type Offer,
  type Personal,
  type SavedItem,
} from './personal.ts';

/** The item fields every list keeps. */
export type ItemRef = Pick<SavedItem, 'id' | 'name' | 'icon'>;

/**
 * My lists, saved on this phone as they change. Every change says what it
 * did in a toast with Undo, instead of asking first.
 */
export function usePersonal() {
  const [personal, setPersonal] = useState<Personal>(loadPersonal);
  const toast = useToast();

  // Saved after each change; what another tab saved is only read.
  const [unsaved, setUnsaved] = useState(false);
  const stored = useRef(personal);
  useEffect(() => {
    if (personal === stored.current) return;
    stored.current = personal;
    setUnsaved(!storePersonal(personal));
  }, [personal]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!isPersonalKey(event.key)) return;
      const loaded = loadPersonal();
      stored.current = loaded;
      setPersonal(loaded);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const change = setPersonal;

  const startFlip = useCallback(
    ({ id, name, icon }: ItemRef, offer: Offer) => {
      const flip: Flip = { id, name, icon, ...offer, at: new Date().toISOString() };
      change((current) => withEntry(current, 'flips', flip));
      toast({
        text: 'Hidden',
        undo: () => change((current) => withoutEntry(current, 'flips', id)),
      });
    },
    [change, toast],
  );

  /** Takes an item off a list; Undo puts the same entry back in its place. */
  const remove = useCallback(
    (list: ListName, id: number, text: string) => {
      const entry = (personal[list] as SavedItem[]).find((saved) => saved.id === id);
      if (!entry) return;
      change((current) => withoutEntry(current, list, id));
      toast({
        text,
        undo: () => change((current) => withEntry(current, list, entry as Flip)),
      });
    },
    [personal, change, toast],
  );

  const sold = useCallback((id: number) => remove('flips', id, 'Marked sold'), [remove]);

  const watch = useCallback(
    /** `announce` when the change isn't visible where it was made (the search). */
    ({ id, name, icon }: ItemRef, announce = false) => {
      change((current) =>
        withEntry(current, 'watch', { id, name, icon, at: new Date().toISOString() }),
      );
      if (announce) toast({ text: 'Added to your watchlist' });
    },
    [change, toast],
  );

  const unwatch = useCallback(
    (id: number) => remove('watch', id, 'Removed from your watchlist'),
    [remove],
  );

  const block = useCallback(
    ({ id, name, icon }: ItemRef) => {
      change((current) =>
        withEntry(current, 'block', { id, name, icon, at: new Date().toISOString() }),
      );
      toast({
        text: 'Blocked',
        undo: () => change((current) => withoutEntry(current, 'block', id)),
      });
    },
    [change, toast],
  );

  const unblock = useCallback(
    (id: number) => remove('block', id, 'Shows in the picks again'),
    [remove],
  );

  return useMemo(
    () => ({ personal, unsaved, startFlip, sold, watch, unwatch, block, unblock }),
    [personal, unsaved, startFlip, sold, watch, unwatch, block, unblock],
  );
}
