import { ArrowLeft, Clock3, MapPin, Ticket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cinemaGateway } from '../../app/gateway';
import type { Cinema, Movie, Showtime } from '../../domain/cinema';
import { formatDateTime, formatMoney } from '../../domain/cinema';
import { EmptyState, Loading } from '../../ui/Loading';
import { MovieArtwork } from '../../ui/MovieArtwork';

export function MoviePage() {
  const { movieId = '' } = useParams(); const [movie, setMovie] = useState<Movie>(); const [shows, setShows] = useState<Showtime[]>([]); const [cinemas, setCinemas] = useState<Cinema[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.all([cinemaGateway.listMovies(), cinemaGateway.listShowtimes(), cinemaGateway.listCinemas()]).then(([items, showData, cinemaData]) => { setMovie(items.find((item) => item.id === movieId)); setShows(showData.filter((show) => show.movieId === movieId)); setCinemas(cinemaData); setLoading(false); }); }, [movieId]);
  if (loading) return <div className="page"><Loading /></div>;
  if (!movie) return <div className="page"><EmptyState title="Không tìm thấy phim" body="Bộ phim có thể đã rời lịch chiếu." action={<Link className="button button--primary" to="/">Về trang phim</Link>} /></div>;
  return <div className="page movie-detail">
    <Link className="back-link" to="/"><ArrowLeft aria-hidden="true" /> Tất cả phim</Link>
    <section className="movie-detail__stage">
      <MovieArtwork movie={movie} />
      <div className="movie-detail__copy"><div className="movie-row__meta"><span>{movie.ageRating}</span><span>{movie.year}</span></div><h1>{movie.title}</h1><p className="movie-detail__tagline">{movie.tagline}</p><p>{movie.synopsis}</p><dl><div><dt>Thể loại</dt><dd>{movie.genres.join(', ')}</dd></div><div><dt>Thời lượng</dt><dd>{movie.durationMinutes} phút</dd></div><div><dt>Xuất xứ</dt><dd>{movie.origin}</dd></div></dl></div>
    </section>
    <section className="detail-shows"><div className="section-heading"><div><h2>Suất chiếu tiếp theo</h2><p>Giá cuối cùng được tính trên máy chủ khi giữ ghế.</p></div></div>
      <div className="detail-shows__list">{shows.map((show) => <article key={show.id}><div><Clock3 aria-hidden="true" /><strong>{formatDateTime(show.startsAt)}</strong><span><MapPin aria-hidden="true" /> {cinemas.find((cinema) => cinema.id === show.cinemaId)?.name}</span></div><p>{show.room} · {show.format} · từ {formatMoney(show.basePrice)}</p><Link className="button button--primary" to={`/dat-ghe/${show.id}`}><Ticket aria-hidden="true" /> Chọn ghế</Link></article>)}</div>
    </section>
  </div>;
}
