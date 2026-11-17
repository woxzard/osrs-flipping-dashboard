import { useState } from 'react';
import { wikiIconUrl } from './labels.ts';

/**
 * The item's icon from the OSRS Wiki in a fixed tile, so nothing moves while
 * it loads. If it can't load, the tile shows the item's first letter. The
 * name is always written next to it, so the picture is decorative.
 */
export function ItemIcon({ icon, name }: { icon: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="icon-tile" aria-hidden="true">
      {failed ? (
        <span className="icon-letter">{name.trim().charAt(0).toUpperCase()}</span>
      ) : (
        <img
          src={wikiIconUrl(icon)}
          alt=""
          width={36}
          height={36}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
