import { describe, expect, it } from 'vitest';
import { searchItems } from './search.ts';

const items = [
  { name: "Ahrim's robetop" },
  { name: 'Masori mask (f)' },
  { name: 'Masori body' },
  { name: 'Uncut dragonstone' },
];
const names = (query: string) => searchItems(items, query).map((item) => item.name);

describe('searchItems', () => {
  it('finds every word typed, in any order, any case', () => {
    expect(names('masori')).toEqual(['Masori mask (f)', 'Masori body']);
    expect(names('MASK masori')).toEqual(['Masori mask (f)']);
    expect(names('drag')).toEqual(['Uncut dragonstone']);
  });

  it('ignores apostrophes and punctuation', () => {
    expect(names('ahrims')).toEqual(["Ahrim's robetop"]);
    expect(names("ahrim's")).toEqual(["Ahrim's robetop"]);
    expect(names('mask (f)')).toEqual(['Masori mask (f)']);
  });

  it('finds nothing for an empty search or an unknown name', () => {
    expect(names('   ')).toEqual([]);
    expect(names('dragon scimitar')).toEqual([]);
  });
});
