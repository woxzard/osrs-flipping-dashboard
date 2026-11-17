import { describe, expect, it } from 'vitest';
import { fromChoices, parseHours } from './hours.ts';

describe('night hours', () => {
  it('read back only stored hours that still make sense', () => {
    expect(parseHours(JSON.stringify(fromChoices(23, 6, 21)))).toEqual(fromChoices(23, 6, 21));
    expect(parseHours(JSON.stringify(fromChoices(22, 22, 7)))).toBeNull();
    expect(parseHours('{oops')).toBeNull();
    expect(parseHours('null')).toBeNull();
    expect(parseHours(null)).toBeNull();
  });
});
