import { ArrowLeft, ArrowRight, Clock3, MapPin } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cinemaGateway } from '../../app/gateway';
import type { Cinema, Movie, Showtime } from '../../domain/cinema';
import { formatMoney } from '../../domain/cinema';
import { EmptyState, ErrorState, Loading } from '../../ui/Loading';
import { MovieArtwork } from '../../ui/MovieArtwork';
import { groupCinemaShowtimes, nextDates } from './cinemaDiscovery';

type CinemaState = { kind: 'loading' } | { kind: 'error'; cinemaId: string } | { kind: 'ready'; cinemaId: string; cinema: Cinema | null; movies: Movie[] };
type ShowsState = { kind: 'loading' } | { kind: 'error'; cinemaId: string; date: string } | { kind: 'ready'; cinemaId: string; date: string; showtimes: Showtime[] };
const timeLabel = (value: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const dateLabel = (value: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(`${value}T12:00:00+07:00`));

export function CinemaDetailPage() {
  const { cinemaId = '' } = useParams();
  const dates = useMemo(() => nextDates(7), []);
  const [date, setDate] = useState(dates[0] ?? '');
  const [cinemaState, setCinemaState] = useState<CinemaState>({ kind: 'loading' });
  const [showsState, setShowsState] = useState<ShowsState>({ kind: 'loading' });
  const [reloadCinema, setReloadCinema] = useState(0);
  const [reloadShows, setReloadShows] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([cinemaGateway.listCinemas(), cinemaGateway.listMovies()]).then(([cinemas, movies]) => {
      if (active) setCinemaState({ kind: 'ready', cinemaId, cinema: cinemas.find((item) => item.id === cinemaId) ?? null, movies });
    }).catch(() => { if (active) setCinemaState({ kind: 'error', cinemaId }); });
    return () => { active = false; };
  }, [cinemaId, reloadCinema]);

  useEffect(() => {
    let active = true;
    cinemaGateway.listShowtimes(cinemaId, date).then((showtimes) => {
      if (active) setShowsState({ kind: 'ready', cinemaId, date, showtimes });
    }).catch(() => { if (active) setShowsState({ kind: 'error', cinemaId, date }); });
    return () => { active = false; };
  }, [cinemaId, date, reloadShows]);

  const grouped = cinemaState.kind === 'ready' && cinemaState.cinemaId === cinemaId && showsState.kind === 'ready' && showsState.cinemaId === cinemaId && showsState.date === date
    ? groupCinemaShowtimes(cinemaState.movies, showsState.showtimes) : [];
  if (cinemaState.kind === 'loading' || cinemaState.cinemaId !== cinemaId) return <div className="page"><Loading label="Đang tải thông tin rạp…" /></div>;
  if (cinemaState.kind === 'error') return <div className="page"><ErrorState message="Không tải được thông tin rạp. Hãy kiểm tra kết nối rồi thử lại." retry={() => { setCinemaState({ kind: 'loading' }); setReloadCinema((value) => value + 1); }} /></div>;
  if (!cinemaState.cinema) return <div className="page"><EmptyState title="Không tìm thấy rạp" body="Địa điểm này không có trong danh sách rạp CineViet demo." action={<Link className="button button--primary" to="/rap">Xem tất cả rạp</Link>} /></div>;
  const cinema = cinemaState.cinema;

  return <div className="page cinema-detail">
    <Link className="back-link" to="/rap"><ArrowLeft aria-hidden="true" /> Tất cả rạp</Link>
    <header className="cinema-detail__header">
      <div><span className="cinema-detail__city">{cinema.city} · Rạp DEMO</span><h1>{cinema.name}</h1><p><MapPin aria-hidden="true" />{cinema.address}, {cinema.city}</p></div>
      <div className="cinema-detail__cue" aria-hidden="true"><span /><span /><span /></div>
    </header>
    <section className="cinema-detail__schedule" aria-labelledby="cinema-schedule-title">
      <div className="section-heading"><div><h2 id="cinema-schedule-title">Lịch chiếu tại rạp</h2><p>Chọn ngày và suất phù hợp, sau đó chọn ghế.</p></div></div>
      <div className="cinema-detail__dates" role="group" aria-label="Ngày xem phim">{dates.map((item) => <button key={item} type="button" className={date === item ? 'is-selected' : ''} aria-pressed={date === item} onClick={() => { if (date !== item) { setDate(item); setShowsState({ kind: 'loading' }); } }}><span>{item === dates[0] ? 'Hôm nay' : dateLabel(item).split(',')[0]}</span><strong>{dateLabel(item).split(',').at(-1)?.trim()}</strong></button>)}</div>
      <p className="cinema-detail__date-hint">Còn ngày khác ở bên phải. Vuốt hoặc dùng phím Tab để xem tiếp. <ArrowRight aria-hidden="true" /></p>
      {(showsState.kind === 'loading' || showsState.cinemaId !== cinemaId || ('date' in showsState && showsState.date !== date)) && <Loading label="Đang tải lịch chiếu…" />}
      {showsState.kind === 'error' && showsState.cinemaId === cinemaId && showsState.date === date && <ErrorState message="Không tải được suất chiếu ngày này. Hãy thử lại hoặc chọn ngày khác." retry={() => { setShowsState({ kind: 'loading' }); setReloadShows((value) => value + 1); }} />}
      {showsState.kind === 'ready' && showsState.cinemaId === cinemaId && showsState.date === date && grouped.length === 0 && <div className="cinema-detail__empty"><Clock3 aria-hidden="true" /><h3>Chưa có suất ngày này</h3><p>Hãy thử một ngày khác trong lịch chiếu, hoặc xem phim ở rạp khác.</p><Link to="/rap">Xem các rạp khác <ArrowRight aria-hidden="true" /></Link></div>}
      {showsState.kind === 'ready' && showsState.cinemaId === cinemaId && showsState.date === date && grouped.length > 0 && <div className="cinema-detail__films" aria-live="polite">{grouped.map(({ movie, showtimes }) => <article className="cinema-detail__film" key={movie.id}>
        <Link className="cinema-detail__art" to={`/phim/${movie.id}`} aria-label={`Thông tin phim ${movie.title}`}><MovieArtwork movie={movie} compact /></Link>
        <div className="cinema-detail__film-main"><div className="movie-row__meta"><span>{movie.ageRating}</span><span>{movie.genres.join(' · ')}</span><span>{movie.durationMinutes} phút</span></div><h3><Link to={`/phim/${movie.id}`}>{movie.title}</Link></h3><p>{movie.tagline}</p><div className="cinema-detail__times" aria-label={`Suất chiếu ${movie.title}`}>{showtimes.map((showtime) => <Link key={showtime.id} to={`/dat-ghe/${showtime.id}`} aria-label={`${movie.title}, ${timeLabel(showtime.startsAt)}, ${showtime.format}, ${showtime.room}, từ ${formatMoney(showtime.basePrice)}. Chọn ghế`}><strong>{timeLabel(showtime.startsAt)}</strong><span>{showtime.format} · {showtime.room}</span><small>từ {formatMoney(showtime.basePrice)}</small></Link>)}</div></div>
      </article>)}</div>}
    </section>
  </div>;
}
