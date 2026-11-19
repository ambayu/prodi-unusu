import { describe, expect, it } from 'vitest';
import { pickCurrentCurriculum } from '../src/shared/utils/curriculum';

describe('pickCurrentCurriculum', () => {
  it('returns null when list is empty', () => {
    expect(pickCurrentCurriculum([], 2026)).toBeNull();
  });

  it('picks the curriculum matching the current year when available', () => {
    const list = [
      { id: 1, year: 2022 },
      { id: 2, year: 2024 },
      { id: 3, year: 2026 },
    ];
    expect(pickCurrentCurriculum(list, 2026)).toEqual({ id: 3, year: 2026 });
  });

  it('picks the latest curriculum with year <= currentYear when currentYear is not yet created', () => {
    const list = [
      { id: 1, year: 2020 },
      { id: 2, year: 2024 },
      { id: 3, year: 2027 },
    ];
    expect(pickCurrentCurriculum(list, 2026)).toEqual({ id: 2, year: 2024 });
  });

  it('falls back to the latest available curriculum when all years are in the future', () => {
    const list = [
      { id: 1, year: 2027 },
      { id: 2, year: 2028 },
    ];
    expect(pickCurrentCurriculum(list, 2026)).toEqual({ id: 2, year: 2028 });
  });

  it('breaks ties on the same year by highest id', () => {
    const list = [
      { id: 4, year: 2024 },
      { id: 9, year: 2024 },
    ];
    expect(pickCurrentCurriculum(list, 2026)).toEqual({ id: 9, year: 2024 });
  });
});
