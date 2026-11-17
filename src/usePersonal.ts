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

  return useMemo(
    () => ({ personal, unsaved, startFlip, sold }),
    [personal, unsaved, startFlip, sold],
  );
}
