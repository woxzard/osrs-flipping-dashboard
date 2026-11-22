/**
 * An item's name as a real link (new tab, copy link) that opens the item in
 * place on a plain tap. Stretched over the whole card (see .row-link in styles.css).
 */
export function RowLink({
  href,
  name,
  onOpen,
}: {
  href: string;
  name: string;
  onOpen: () => void;
}) {
  return (
    <a
      className="row-link"
      href={href}
      onClick={(event) => {
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }
        event.preventDefault();
        onOpen();
      }}
    >
      {name}
    </a>
  );
}
