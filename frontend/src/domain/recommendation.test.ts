import { describe, expect, it } from 'vitest';
import type { Movie, Showtime } from './cinema';
import { rankRecommendations } from './recommendation';

const movie = (id: string, genres: Movie['genres']): Movie => ({ id, title: id, tagline: '', synopsis: '', genres, durationMinutes: 90, ageRating: 'P', origin: 'Việt Nam', year: 2026, palette: ['#000', '#111', '#fff'], artworkLabel: id });
const show = (movieId: string, hour: string): Showtime => ({ id: movieId, movieId, cinemaId: 'hn', startsAt: `2026-09-24T${hour}:00+07:00`, room: '01', format: '2D', basePrice: 80000 });

describe('rankRecommendations', () => {
  it('orders the hand-calculated cosine example A, C, B when alpha is effectively one', () => {
    const result = rankRecommendations(
      [movie('A', ['Hành động']), movie('B', ['Hài']), movie('C', ['Hành động', 'Hài'])],
      [show('A', '18:00'), show('B', '18:00'), show('C', '18:00')],
      ['Hành động'], { A: 0, B: 0, C: 0 },
    );
    expect(result.map((item) => item.movie.id)).toEqual(['A', 'C', 'B']);
  });

  it('excludes films without an available showtime', () => {
    const result = rankRecommendations([movie('A', ['Hành động']), movie('B', ['Hài'])], [show('A', '18:00')], [], { A: 3, B: 9 });
    expect(result.map((item) => item.movie.id)).toEqual(['A']);
  });

  it('averages distinct history-movie vectors before blending the preference vector', () => {
    const result = rankRecommendations(
      [movie('A', ['Hành động']), movie('B', ['Hài'])],
      [show('A', '18:00'), show('B', '19:00')],
      ['Hành động'], { A: 0, B: 0 }, [['Hành động', 'Hài'], ['Hài']],
    );
    expect(result.map((item) => item.movie.id)).toEqual(['A', 'B']);
    expect(result[0]?.score).toBeCloseTo(0.8 * 0.75 / Math.sqrt(0.75 ** 2 + 0.5 ** 2));
    expect(result[1]?.score).toBeCloseTo(0.8 * 0.5 / Math.sqrt(0.75 ** 2 + 0.5 ** 2));
  });

  it('uses popularity for a cold start and breaks equal scores by earliest showtime', () => {
    const result = rankRecommendations(
      [movie('A', ['Hành động']), movie('B', ['Hài']), movie('C', ['Tâm lý'])],
      [show('A', '20:00'), show('B', '18:00'), show('C', '19:00')], [], { A: 5, B: 5, C: 1 },
    );
    expect(result.map((item) => item.movie.id)).toEqual(['B', 'A', 'C']);
    expect(result[0]?.reasons).not.toContain('PREFERRED_GENRE');
  });

  it('returns at most ten unique films and an empty list without showtimes', () => {
    const films = Array.from({ length: 12 }, (_, index) => movie(`film-${index}`, ['Hài']));
    expect(rankRecommendations(films, films.map((film) => show(film.id, '18:00')), [], {})).toHaveLength(10);
    expect(rankRecommendations(films, [], [], {})).toEqual([]);
  });
});
