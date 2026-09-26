import { ArrowRight, CalendarDays, Clock3, MapPin, ShieldCheck, Sparkles, Ticket } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cinemaGateway } from '../../app/gateway';
import type { Cinema, Movie, Showtime } from '../../domain/cinema';
import { formatDateTime, formatMoney } from '../../domain/cinema';
import { ErrorState, Loading } from '../../ui/Loading';
import { MovieArtwork } from '../../ui/MovieArtwork';

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

export function CatalogPage() {
  const [movies, setMovies] = useState<Movie[]>([]); const [cinemas, setCinemas] = useState<Cinema[]>([]); const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [cinemaId, setCinemaId] = useState(''); const [date, setDate] = useState(today()); const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading'); const [reloadKey, setReloadKey] = useState(0);
  const load = () => { setState('loading'); setReloadKey((value) => value + 1); };
  useEffect(() => {
    let active = true;
    Promise.all([cinemaGateway.listMovies(), cinemaGateway.listCinemas(), cinemaGateway.listShowtimes(cinemaId, date)]).then(([movieData, cinemaData, showtimeData]) => {
      if (!active) return;
      setCinemas(cinemaData);
      if (!cinemaId && cinemaData[0]) { setCinemaId(cinemaData[0].id); return; }
      setMovies(movieData); setShowtimes(showtimeData); setState('ready');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [cinemaId, date, reloadKey]);
  const featured = movies.find((movie) => movie.featured) ?? movies[0];
  const featuredShow = featured && showtimes.find((showtime) => showtime.movieId === featured.id);
  const visibleMovies = useMemo(() => movies.filter((movie) => showtimes.some((showtime) => showtime.movieId === movie.id)), [movies, showtimes]);

  return <>
    <section className="hero" aria-labelledby="hero-title">
      <img className="hero__image" src={`${import.meta.env.BASE_URL}assets/cineviet-hero.png`} alt="Ba khán giả bước qua hành lang sơn mài vào phòng chiếu sáng" />
      <div className="hero__shade" />
      <div className="hero__copy">
        <h1 id="hero-title">Bộ phim tiếp theo<br />đang chờ bạn.</h1>
        <p>Lịch chiếu và giá vé chỉ xuất hiện khi được đối tác rạp xác thực. Thanh toán sẽ được triển khai sau.</p>
        <div className="hero__actions"><a className="button button--primary" href="#lich-chieu"><Ticket aria-hidden="true" /> Chọn suất chiếu</a><Link className="button button--ghost" to="/goi-y"><Sparkles aria-hidden="true" /> Gợi ý cho tôi</Link></div>
      </div>
      {featured && <div className="hero__feature"><span className="hero__feature-tag">Phim nổi bật</span><strong>{featured.title}</strong><span>{featured.genres.join(' · ')} · {featured.durationMinutes} phút</span>{featuredShow && <Link to={`/dat-ghe/${featuredShow.id}`}>Suất {formatDateTime(featuredShow.startsAt)} <ArrowRight aria-hidden="true" /></Link>}</div>}
      <div className="cue-line" aria-hidden="true"><span /><span /><span className="is-lit" /><span /></div>
    </section>

    <section className="booking-dock" id="lich-chieu" aria-labelledby="schedule-title">
      <div><h2 id="schedule-title">Chọn nơi ánh đèn bật lên</h2><p>Cập nhật theo rạp và ngày bạn muốn xem.</p></div>
      <label><MapPin aria-hidden="true" /><span>Rạp phim</span><select value={cinemaId} disabled={state === 'ready' && cinemas.length === 0} onChange={(event) => { setState('loading'); setCinemaId(event.target.value); }}>{cinemas.length === 0 && <option value="">Chưa có rạp</option>}{cinemas.map((cinema) => <option key={cinema.id} value={cinema.id}>{cinema.name}</option>)}</select></label>
      <label><CalendarDays aria-hidden="true" /><span>Ngày xem</span><input type="date" min={today()} value={date} onChange={(event) => { setState('loading'); setDate(event.target.value); }} /></label>
    </section>

    <section className="catalog-section" aria-labelledby="now-showing-title">
      <div className="section-heading"><div><h2 id="now-showing-title">Đang có suất</h2><p>Chỉ hiển thị lịch chiếu đã được xác thực.</p></div><span className="data-label"><ShieldCheck aria-hidden="true" /> Dữ liệu cần xác thực</span></div>
      {state === 'loading' && <Loading />}
      {state === 'error' && <ErrorState message="Không tải được lịch chiếu. Kiểm tra kết nối rồi thử lại." retry={load} />}
      {state === 'ready' && visibleMovies.length === 0 && <div className="message"><strong>Chưa có lịch chiếu được xác thực.</strong><span>Vui lòng quay lại sau khi đối tác rạp cung cấp dữ liệu.</span></div>}
      {state === 'ready' && <div className="movie-list">{visibleMovies.map((movie, index) => {
        const movieShows = showtimes.filter((showtime) => showtime.movieId === movie.id);
        return <article className="movie-row" key={movie.id} style={{ '--delay': `${index * 70}ms` } as React.CSSProperties}>
          <Link to={`/phim/${movie.id}`} className="movie-row__art"><MovieArtwork movie={movie} compact /></Link>
          <div className="movie-row__body"><div className="movie-row__meta"><span>{movie.ageRating}</span><span>{movie.genres.join(' · ')}</span><span>{movie.durationMinutes} phút</span></div><h3><Link to={`/phim/${movie.id}`}>{movie.title}</Link></h3><p>{movie.tagline}</p></div>
          <div className="showtime-stack" aria-label={`Suất chiếu ${movie.title}`}>{movieShows.map((showtime) => <Link key={showtime.id} to={`/dat-ghe/${showtime.id}`}><Clock3 aria-hidden="true" /><strong>{new Date(showtime.startsAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}</strong><span>{showtime.format} · từ {formatMoney(showtime.basePrice)}</span></Link>)}</div>
        </article>;
      })}</div>}
    </section>

    <section className="recommend-invite"><div><Sparkles aria-hidden="true" /><h2>Không muốn lướt mãi?</h2><p>Chọn vài thể loại. CineViet sẽ xếp hạng phim còn suất và nói rõ vì sao phim đó xuất hiện.</p></div><Link className="button button--light" to="/goi-y">Tìm phim hợp gu <ArrowRight aria-hidden="true" /></Link></section>
  </>;
}
