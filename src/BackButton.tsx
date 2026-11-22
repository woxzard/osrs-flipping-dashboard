/** Back to the list an item was opened from ("‹ Picks", "‹ My flips"). */
export function BackButton({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button type="button" className="back" onClick={onBack}>
      <span aria-hidden="true">‹</span> {label}
    </button>
  );
}
