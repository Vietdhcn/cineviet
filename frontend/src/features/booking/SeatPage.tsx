import { ArrowLeft, ArrowRight, Clock3, Info, LockKeyhole, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cinemaGateway } from '../../app/gateway';
import { HttpRequestError } from '../../infrastructure/httpCinemaGateway';
import type { Movie, Seat, Showtime } from '../../domain/cinema';
import { formatDateTime, formatMoney, seatLabel } from '../../domain/cinema';
import { ErrorState, Loading } from '../../ui/Loading';
import { BookingSteps } from './BookingSteps';

export function SeatPage() {
  const { showtimeId = '' } = useParams(); const navigate = useNavigate(); const [seats, setSeats] = useState<Seat[]>([]); const [showtime, setShowtime] = useState<Showtime>(); const [movie, setMovie] = useState<Movie>();
  const [selected, setSelected] = useState<string[]>([]); const [state, setState] = useState<'loading' | 'ready' | 'holding' | 'error'>('loading'); const [error, setError] = useState(''); const [reloadKey, setReloadKey] = useState(0);
  const [needsLogin, setNeedsLogin] = useState(false);
  const load = () => { setState('loading'); setError(''); setNeedsLogin(false); setReloadKey((value) => value + 1); };
  useEffect(() => {
    let active = true;
    Promise.all([cinemaGateway.listSeats(showtimeId), cinemaGateway.getShowtime(showtimeId), cinemaGateway.listMovies()]).then(([seatData, show, movies]) => {
      if (!active) return;
      setSeats(seatData); setShowtime(show ?? undefined); setMovie(movies.find((item) => item.id === show?.movieId)); setSelected([]); setState('ready');
    }).catch((reason: unknown) => { if (active) { setError(reason instanceof Error ? reason.message : 'Không tải được sơ đồ ghế.'); setState('error'); } });
    return () => { active = false; };
  }, [showtimeId, reloadKey]);
  const selectedSeats = useMemo(() => seats.filter((seat) => selected.includes(seat.id)), [seats, selected]); const total = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const toggle = (seat: Seat) => { if (seat.status !== 'AVAILABLE') return; setSelected((items) => items.includes(seat.id) ? items.filter((id) => id !== seat.id) : items.length < 8 ? [...items, seat.id] : items); };
  const hold = async () => { setState('holding'); setError(''); setNeedsLogin(false); try { const booking = await cinemaGateway.holdSeats(showtimeId, selected); navigate(`/thanh-toan/${booking.id}`); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể giữ ghế.'); setNeedsLogin(reason instanceof HttpRequestError && reason.status === 401); setState('ready'); cinemaGateway.listSeats(showtimeId).then(setSeats).catch(() => setError('Không tải lại được sơ đồ ghế. Vui lòng bấm “Tải lại sơ đồ”.')); } };
  if (state === 'loading') return <div className="page"><Loading label="Đang bật sơ đồ phòng chiếu…" /></div>;
  if (state === 'error' || !showtime || !movie) return <div className="page"><ErrorState message={error || 'Suất chiếu không tồn tại.'} retry={load} /></div>;
  return <div className="page booking-page">
    <Link className="back-link" to={`/phim/${movie.id}`}><ArrowLeft aria-hidden="true" /> Đổi suất chiếu</Link>
    <BookingSteps current={1} />
    <div className="booking-heading"><div><h1>Chọn chỗ ngồi</h1><p>{movie.title} · {formatDateTime(showtime.startsAt)} · {showtime.room}</p></div><div className="hold-note"><LockKeyhole aria-hidden="true" /><span>Ghế chỉ được giữ sau khi bạn bấm tiếp tục.</span></div></div>
    {error && <div className="message message--error" role="alert"><strong>Ghế chưa được giữ.</strong><span>{error}</span>{needsLogin ? <Link className="button button--quiet" to={`/tai-khoan?returnTo=${encodeURIComponent(`/dat-ghe/${showtimeId}`)}`}>Đăng nhập để giữ ghế</Link> : <button className="button button--quiet" onClick={load}><RotateCcw aria-hidden="true" /> Tải lại sơ đồ</button>}</div>}
    <div className="seat-layout">
      <section className="auditorium" aria-label="Sơ đồ ghế phòng chiếu">
        <div className="screen"><span>Màn hình</span></div>
        <div className="seat-grid">{seats.map((seat) => <button key={seat.id} type="button" className={`seat seat--${seat.kind.toLowerCase()} ${selected.includes(seat.id) ? 'is-selected' : ''}`} disabled={seat.status !== 'AVAILABLE'} aria-label={`Ghế ${seatLabel(seat)}, ${seat.kind === 'VIP' ? 'VIP' : 'thường'}, ${formatMoney(seat.price)}${seat.status !== 'AVAILABLE' ? ', không khả dụng' : ''}`} aria-pressed={selected.includes(seat.id)} onClick={() => toggle(seat)}><span>{seatLabel(seat)}</span></button>)}</div>
        <div className="seat-legend"><span><i className="seat-sample" /> Còn trống</span><span><i className="seat-sample is-selected" /> Đang chọn</span><span><i className="seat-sample is-vip" /> VIP</span><span><i className="seat-sample is-unavailable" /> Đã giữ / đã bán</span></div>
      </section>
      <aside className="booking-summary">
        <div className="summary-cue"><Clock3 aria-hidden="true" /><span>Suất đã chọn</span><strong>{formatDateTime(showtime.startsAt)}</strong></div>
        <h2>{movie.title}</h2><p>{showtime.room} · {showtime.format}</p>
        <div className="summary-line"><span>Ghế</span><strong>{selected.length ? selectedSeats.map(seatLabel).join(', ') : 'Chưa chọn'}</strong></div>
        <div className="summary-line"><span>Số lượng</span><strong>{selected.length}/8</strong></div>
        <div className="summary-total"><span>Tạm tính</span><strong>{formatMoney(total)}</strong></div>
        <button className="button button--primary button--wide" disabled={!selected.length || state === 'holding'} onClick={hold}>{state === 'holding' ? 'Đang giữ ghế…' : <>Giữ ghế & tiếp tục <ArrowRight aria-hidden="true" /></>}</button>
        <p className="summary-help"><Info aria-hidden="true" /> Giá được xác nhận bởi hệ thống; không lấy từ trình duyệt.</p>
      </aside>
    </div>
  </div>;
}
