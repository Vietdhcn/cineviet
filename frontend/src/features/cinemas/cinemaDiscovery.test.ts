import { describe, expect, it } from 'vitest';
import type { Cinema, Movie, Showtime } from '../../domain/cinema';
import { cinemaCities, filterCinemas, groupCinemaShowtimes, nextDates } from './cinemaDiscovery';

const cinemas: Cinema[] = [
  { id: 'a', name: 'Hồ Gươm', address: 'Tràng Tiền', city: 'Hà Nội' },
  { id: 'b', name: 'Bến Thành', address: 'Lê Lợi', city: 'TP. Hồ Chí Minh' },
];
const movie: Movie = { id: 'film', title: 'Phim', tagline: '', synopsis: '', genres: ['Hài'], durationMinutes: 90, ageRating: 'P', origin: 'Việt Nam', year: 2026, palette: ['#000', '#111', '#222'], artworkLabel: '' };
const show = (id: string, startsAt: string, movieId = 'film'): Showtime => ({ id, movieId, cinemaId: 'a', startsAt, room: '01', format: '2D', basePrice: 80_000 });

describe('cinema discovery', () => {
  it('filters by city and Vietnamese query text', () => {
    expect(filterCinemas(cinemas, 'Hà Nội', 'Tràng')).toEqual([cinemas[0]]);
    expect(filterCinemas(cinemas, '', '  bẾn  ')).toEqual([cinemas[1]]);
    expect(cinemaCities([...cinemas, { id: 'c', name: 'Rạp khác', address: 'Phố khác', city: 'Hà Nội' }])).toHaveLength(2);
  });
  it('groups only known movies and sorts their times', () => {
    expect(groupCinemaShowtimes([movie], [show('late', '2026-10-01T20:00:00+07:00'), show('unknown', '2026-10-01T10:00:00+07:00', 'missing'), show('early', '2026-10-01T18:00:00+07:00')])[0]?.showtimes.map(({ id }) => id)).toEqual(['early', 'late']);
  });
  it('returns Vietnam-local date keys', () => {
    expect(nextDates(2, new Date('2026-09-24T18:00:00Z'))).toEqual(['2026-09-25', '2026-09-26']);
  });
});
