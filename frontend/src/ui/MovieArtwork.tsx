import type { Movie } from '../domain/cinema';

export function MovieArtwork({ movie, compact = false }: { movie: Movie; compact?: boolean }) {
  return (
    <div className={`movie-art ${compact ? 'movie-art--compact' : ''}`} style={{ '--ink': movie.palette[0], '--glow': movie.palette[1], '--light': movie.palette[2] } as React.CSSProperties} aria-label={`Minh họa demo cho phim ${movie.title}`} role="img">
      <span className="movie-art__beam" />
      <span className="movie-art__disc" />
      {!compact && <span className="movie-art__title">{movie.title}</span>}
      <span className="movie-art__note">DEMO · {movie.artworkLabel}</span>
    </div>
  );
}
