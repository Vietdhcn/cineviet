import { expect, it } from 'vitest';
import { movies } from './demoCinemaGateway';

it('ships twelve distinct, fully labeled fictional films', () => {
  expect(movies).toHaveLength(12);
  expect(new Set(movies.map((movie) => movie.id)).size).toBe(12);
  expect(new Set(movies.flatMap((movie) => movie.genres)).size).toBeGreaterThanOrEqual(4);
  expect(movies.every((movie) => movie.title && movie.synopsis && movie.ageRating && movie.palette.length === 3)).toBe(true);
});
