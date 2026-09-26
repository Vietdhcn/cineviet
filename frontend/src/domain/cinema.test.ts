import { describe, expect, it } from 'vitest';
import { localDateKey, seatLabel } from './cinema';

describe('server representation boundaries', () => {
  it('shows a seat label instead of leaking its database UUID', () => {
    expect(seatLabel({ id: '123e4567-e89b-12d3-a456-426614174000', row: 'A', number: 1, kind: 'STANDARD', status: 'AVAILABLE', price: 85_000 })).toBe('A1');
  });

  it('groups UTC timestamps by the cinema date in Vietnam', () => {
    expect(localDateKey('2026-09-24T17:15:00Z')).toBe('2026-09-25');
  });
});
