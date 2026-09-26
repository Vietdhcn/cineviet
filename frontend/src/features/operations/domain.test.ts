import { describe, expect, it } from 'vitest';
import { canCancelShowtime, validateNewShowtime } from './domain';
import type { Booking, Movie, Showtime } from '../../domain/cinema';

const now = Date.parse('2026-09-24T10:00:00Z');
const movies = [{ id: 'film-a', durationMinutes: 100 }, { id: 'film-b', durationMinutes: 90 }] as Movie[];
const existing: Showtime = { id: 'show-1', movieId: 'film-a', cinemaId: 'cinema-1', room: 'Phòng 1', startsAt: '2026-09-24T12:00:00Z', format: '2D', basePrice: 80_000 };
const input = { movieId: 'film-b', cinemaId: 'cinema-1', room: 'Phòng 1', startsAt: '2026-09-24T14:00:00Z', format: '2D' as const, basePrice: 80_000 };

describe('demo operations rules', () => {
  it('prevents overlapping showtimes including turnover', () => {
    expect(validateNewShowtime({ ...input, startsAt: '2026-09-24T13:59:00Z' }, movies, ['Phòng 1'], [existing], now)).toMatch(/trùng giờ/);
    expect(validateNewShowtime(input, movies, ['Phòng 1'], [existing], now)).toBeNull();
  });

  it('rejects invalid room, past time and price', () => {
    expect(validateNewShowtime({ ...input, room: 'Phòng 2' }, movies, ['Phòng 1'], [], now)).toMatch(/không thuộc/);
    expect(validateNewShowtime({ ...input, startsAt: '2026-09-24T09:00:00Z' }, movies, ['Phòng 1'], [], now)).toMatch(/tương lai/);
    expect(validateNewShowtime({ ...input, basePrice: 0 }, movies, ['Phòng 1'], [], now)).toMatch(/Giá vé/);
  });

  it('protects active bookings when cancelling', () => {
    const held = { showtimeId: existing.id, status: 'HELD', expiresAt: '2026-09-24T12:00:00Z' } as Booking;
    const confirmed = { showtimeId: existing.id, status: 'CONFIRMED' } as Booking;
    expect(canCancelShowtime(existing, 'ACTIVE', [held], now)).toMatch(/đơn giữ ghế/);
    expect(canCancelShowtime(existing, 'ACTIVE', [confirmed], now)).toMatch(/vé xác nhận/);
    expect(canCancelShowtime(existing, 'ACTIVE', [{ ...held, expiresAt: '2026-09-24T09:00:00Z' }], now)).toBeNull();
  });
});
