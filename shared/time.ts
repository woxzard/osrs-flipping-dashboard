const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const manilaClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Manila',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Clock time in Manila, whatever the device's time zone: "14:37". */
export function formatManilaTime(at: Date): string {
  return manilaClock.format(at);
}

/** "just now", "23 min ago", "2 h 5 min ago", "3 days ago". */
export function formatAgo(at: Date, now: Date): string {
  const elapsed = Math.max(0, now.getTime() - at.getTime());
  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min ago`;
  if (elapsed < 24 * HOUR) {
    const hours = Math.floor(elapsed / HOUR);
    const minutes = Math.floor((elapsed % HOUR) / MINUTE);
    return minutes ? `${hours} h ${minutes} min ago` : `${hours} h ago`;
  }
  const days = Math.floor(elapsed / (24 * HOUR));
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}
