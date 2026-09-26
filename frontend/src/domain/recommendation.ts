import type { Genre, Movie, Recommendation, RecommendationReason, Showtime } from './cinema';

const ALL_GENRES: Genre[] = ['Hành động', 'Hài', 'Tình cảm', 'Hoạt hình', 'Phiêu lưu', 'Tâm lý'];
const vector = (genres: Genre[]) => ALL_GENRES.map((genre) => genres.includes(genre) ? 1 : 0);
const cosine = (left: number[], right: number[]) => {
  const dot = left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
  const leftNorm = Math.sqrt(left.reduce((sum, value) => sum + value * value, 0));
  const rightNorm = Math.sqrt(right.reduce((sum, value) => sum + value * value, 0));
  return leftNorm && rightNorm ? dot / (leftNorm * rightNorm) : 0;
};

export function rankRecommendations(
  movies: Movie[], showtimes: Showtime[], preferred: Genre[], popularity: Record<string, number>, historyMovies: Genre[][] = [],
): Recommendation[] {
  const preferenceVector = vector(preferred);
  const historyVector = ALL_GENRES.map((genre) => historyMovies.length ? historyMovies.filter((genres) => genres.includes(genre)).length / historyMovies.length : 0);
  const hasPreference = preferenceVector.some((value) => value > 0);
  const hasHistory = historyVector.some((value) => value > 0);
  const profile = ALL_GENRES.map((_, index) => hasPreference && hasHistory ? ((preferenceVector[index] ?? 0) + (historyVector[index] ?? 0)) / 2 : hasPreference ? preferenceVector[index] ?? 0 : historyVector[index] ?? 0);
  const maxPopularity = Math.max(0, ...Object.values(popularity));
  return movies.flatMap((movie) => {
    const available = showtimes.filter((showtime) => showtime.movieId === movie.id).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    if (!available[0]) return [];
    const similarity = cosine(profile, vector(movie.genres));
    const pop = maxPopularity ? Math.log1p(popularity[movie.id] ?? 0) / Math.log1p(maxPopularity) : 0;
    const score = hasPreference || hasHistory ? 0.8 * similarity + 0.2 * pop : pop;
    const reasons: RecommendationReason[] = [];
    if (movie.genres.some((genre) => preferred.includes(genre))) reasons.push('PREFERRED_GENRE');
    if (movie.genres.some((genre) => historyMovies.some((genres) => genres.includes(genre)))) reasons.push('HISTORY_GENRE');
    if (pop > 0.5) reasons.push('POPULAR');
    reasons.push('AVAILABLE_SHOWTIME');
    return [{ movie, score, reasons, earliestShowtime: available[0].startsAt }];
  }).sort((a, b) => b.score - a.score || a.earliestShowtime.localeCompare(b.earliestShowtime) || a.movie.id.localeCompare(b.movie.id)).slice(0, 10);
}
