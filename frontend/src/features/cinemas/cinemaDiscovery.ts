import type { Cinema, Movie, Showtime } from '../../domain/cinema';

export function filterCinemas(cinemas: Cinema[], city: string, query: string): Cinema[] {
  const term = query.trim().toLocaleLowerCase('vi-VN');
  return cinemas.filter((cinema) =>
    (!city || cinema.city === city) &&
    (!term || `${cinema.name} ${cinema.address} ${cinema.city}`.toLocaleLowerCase('vi-VN').includes(term)),
  );
}

export function cinemaCities(cinemas: Cinema[]): string[] {
  return [...new Set(cinemas.map((cinema) => cinema.city))].sort((a, b) => a.localeCompare(b, 'vi-VN'));
}

export interface MovieShowtimes { movie: Movie; showtimes: Showtime[] }

export function groupCinemaShowtimes(movies: Movie[], showtimes: Showtime[]): MovieShowtimes[] {
  const movieById = new Map(movies.map((movie) => [movie.id, movie]));
  const grouped = new Map<string, Showtime[]>();
  for (const showtime of [...showtimes].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())) {
    if (!movieById.has(showtime.movieId)) continue;
    grouped.set(showtime.movieId, [...(grouped.get(showtime.movieId) ?? []), showtime]);
  }
  return [...grouped].map(([movieId, items]) => ({ movie: movieById.get(movieId)!, showtimes: items }));
}

export function nextDates(count: number, now = new Date()): string[] {
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(now.getTime() + offset * 86_400_000);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  });
}
