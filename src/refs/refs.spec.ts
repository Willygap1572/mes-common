import { catalogKey, PLANT_LEVELS } from './refs.js';

describe('refs', () => {
  it('builds a stable catalog key', () => {
    expect(catalogKey({ catalogId: 'BAT-46', version: 3 })).toBe('BAT-46@3');
  });

  it('orders plant levels from top to bottom', () => {
    expect(PLANT_LEVELS[0]).toBe('enterprise');
    expect(PLANT_LEVELS.at(-1)).toBe('machine');
  });
});
