/** Finding an item by name (the watchlist's search). */

/** Lower case, letters and digits only, so "Ahrim's" finds "ahrims". */
const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Items whose name has every word typed, in any order. */
export function searchItems<T extends { name: string }>(items: readonly T[], query: string): T[] {
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length === 0) return [];
  return items.filter((item) => {
    const name = normalize(item.name);
    return words.every((word) => name.includes(word));
  });
}
