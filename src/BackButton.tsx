/** Back to the picks list, from an item. */
export function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" className="back" onClick={onBack}>
      <span aria-hidden="true">‹</span> Picks
    </button>
  );
}
