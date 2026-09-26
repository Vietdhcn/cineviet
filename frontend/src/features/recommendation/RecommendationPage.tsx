import { ArrowRight, BrainCircuit, CalendarDays, Check, Clock3, MapPin, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cinemaGateway } from '../../app/gateway';
import type { Cinema, Genre, Recommendation, Showtime } from '../../domain/cinema';
import { formatDateTime, localDateKey } from '../../domain/cinema';
import { EmptyState, ErrorState, Loading } from '../../ui/Loading';
import { MovieArtwork } from '../../ui/MovieArtwork';

const genres: Genre[] = ['Hành động', 'Hài', 'Tình cảm', 'Hoạt hình', 'Phiêu lưu', 'Tâm lý'];
const reasonCopy = { PREFERRED_GENRE: 'Hợp thể loại bạn chọn', HISTORY_GENRE: 'Gần với lịch sử đã xem', POPULAR: 'Được đặt nhiều gần đây', AVAILABLE_SHOWTIME: 'Có suất phù hợp' } as const;
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

export function RecommendationPage() {
  const [cinemas, setCinemas] = useState<Cinema[]>([]); const [shows, setShows] = useState<Showtime[]>([]); const [cinemaId, setCinemaId] = useState(''); const [date, setDate] = useState(today()); const [selected, setSelected] = useState<Genre[]>(['Tâm lý', 'Phiêu lưu']);
  const [results, setResults] = useState<Recommendation[]>(); const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  useEffect(() => { cinemaGateway.listCinemas().then((data) => { setCinemas(data); setCinemaId((current) => current || data[0]?.id || ''); }).catch(() => setState('error')); }, []);
  const toggle = (genre: Genre) => setSelected((items) => items.includes(genre) ? items.filter((item) => item !== genre) : [...items, genre]);
  const submit = async () => { if (!cinemaId) { setState('error'); return; } setState('loading'); try { const [recommendations, availableShows] = await Promise.all([cinemaGateway.recommend(cinemaId, date, selected), cinemaGateway.listShowtimes(cinemaId, date)]); setResults(recommendations); setShows(availableShows); setState('ready'); } catch { setState('error'); } };
  return <div className="page recommendation-page">
    <section className="recommendation-hero"><div><BrainCircuit aria-hidden="true" /><h1>Ít lướt hơn.<br />Chọn đúng hơn.</h1><p>CineViet chỉ gợi ý phim còn suất tại rạp và ngày bạn chọn — kèm lý do có thể kiểm tra.</p></div><div className="recommendation-method"><span>Điểm gợi ý</span><strong>0,8 × hợp gu</strong><strong>0,2 × phổ biến</strong><small>DEMO · Không dùng mô hình ngôn ngữ</small></div></section>
    <section className="preference-panel" aria-labelledby="preference-title"><div><h2 id="preference-title">Bạn muốn xem gì hôm nay?</h2><p>Chọn một hoặc nhiều thể loại. Để trống để xem phim phổ biến.</p></div><div className="genre-options">{genres.map((genre) => <button type="button" key={genre} className={selected.includes(genre) ? 'is-selected' : ''} aria-pressed={selected.includes(genre)} onClick={() => toggle(genre)}>{selected.includes(genre) && <Check aria-hidden="true" />}{genre}</button>)}</div><div className="recommend-filters"><label><MapPin aria-hidden="true" /><span>Rạp</span><select value={cinemaId} onChange={(event) => setCinemaId(event.target.value)}>{cinemas.map((cinema) => <option key={cinema.id} value={cinema.id}>{cinema.name}</option>)}</select></label><label><CalendarDays aria-hidden="true" /><span>Ngày</span><input type="date" min={today()} value={date} onChange={(event) => setDate(event.target.value)} /></label><button className="button button--primary" onClick={submit} disabled={state === 'loading'}><Sparkles aria-hidden="true" /> {state === 'loading' ? 'Đang tính điểm…' : 'Gợi ý cho tôi'}</button></div></section>
    <section className="recommendation-results" aria-live="polite">
      {state === 'idle' && <div className="recommend-placeholder"><Sparkles aria-hidden="true" /><h2>Danh sách của bạn sẽ sáng lên ở đây.</h2><p>Thuật toán lọc theo suất còn hiệu lực trước khi xếp hạng.</p></div>}
      {state === 'loading' && <Loading label="Đang lọc suất và tính độ tương đồng…" />}
      {state === 'error' && <ErrorState message="Không thể tính gợi ý lúc này. Dữ liệu không được bịa thay thế." retry={submit} />}
      {state === 'ready' && results?.length === 0 && <EmptyState title="Chưa tìm thấy phim còn suất" body="Thử đổi rạp, ngày hoặc nới rộng thể loại bạn chọn." />}
      {state === 'ready' && results && results.length > 0 && <><div className="section-heading"><div><h2>{results.length} phim dành cho bạn</h2><p>Xếp theo điểm giảm dần, sau đó theo suất sớm nhất.</p></div><span className="data-label"><Sparkles aria-hidden="true" /> PERSONALIZED</span></div><div className="recommend-list">{results.map((item, index) => {
        const show = shows.find((value) => value.movieId === item.movie.id && value.cinemaId === cinemaId && localDateKey(value.startsAt) === date && new Date(value.startsAt).getTime() === new Date(item.earliestShowtime).getTime());
        return <article key={item.movie.id}><span className="recommend-rank">{String(index + 1).padStart(2, '0')}</span><MovieArtwork movie={item.movie} compact /><div className="recommend-copy"><div className="movie-row__meta"><span>{item.movie.ageRating}</span><span>{item.movie.genres.join(' · ')}</span></div><h3>{item.movie.title}</h3><p>{item.movie.tagline}</p><div className="reason-list">{item.reasons.slice(0, 3).map((reason) => <span key={reason}><Check aria-hidden="true" /> {reasonCopy[reason]}</span>)}</div></div><div className="recommend-action"><span>Điểm {item.score.toFixed(2)}</span><strong><Clock3 aria-hidden="true" /> {formatDateTime(item.earliestShowtime)}</strong>{show && <Link className="button button--primary" to={`/dat-ghe/${show.id}`}>Chọn ghế <ArrowRight aria-hidden="true" /></Link>}</div></article>;
      })}</div></>}
    </section>
  </div>;
}
