import { CalendarClock, CircleCheck, Film, MapPin, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cinemaGateway, operationsGateway } from '../../app/gateway';
import type { Cinema, Movie } from '../../domain/cinema';
import { formatDateTime, formatMoney } from '../../domain/cinema';
import { EmptyState, ErrorState, Loading } from '../../ui/Loading';
import type { ManagedShowtime } from './domain';

type PageData = { movies: Movie[]; cinemas: Cinema[]; shows: ManagedShowtime[] };
type ViewState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: PageData };
type FormState = { movieId: string; cinemaId: string; room: string; startsAt: string; format: '2D' | '3D'; basePrice: string };

const suggestedTime = () => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date(Date.now() + 3 * 60 * 60_000)).replace(' ', 'T');

export function OperationsPage() {
  const [view, setView] = useState<ViewState>({ status: 'loading' });
  const [reload, setReload] = useState(0);
  const [roomState, setRoomState] = useState<{ status: 'loading' | 'ready' | 'error'; items: string[] }>({ status: 'loading', items: [] });
  const [form, setForm] = useState<FormState>({ movieId: '', cinemaId: '', room: '', startsAt: suggestedTime(), format: '2D', basePrice: '85000' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleNotice, setScheduleNotice] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!operationsGateway) return;
    let current = true;
    Promise.all([cinemaGateway.listMovies(), cinemaGateway.listCinemas(), operationsGateway.listManagedShowtimes()])
      .then(([movies, cinemas, shows]) => {
        if (!current) return;
        setView({ status: 'ready', data: { movies, cinemas, shows } });
        setForm((previous) => ({ ...previous, movieId: previous.movieId || movies[0]?.id || '', cinemaId: previous.cinemaId || cinemas[0]?.id || '' }));
      })
      .catch((reason: unknown) => { if (current) setView({ status: 'error', message: reason instanceof Error ? reason.message : 'Không tải được dữ liệu điều hành.' }); });
    return () => { current = false; };
  }, [reload]);

  useEffect(() => {
    if (!operationsGateway || !form.cinemaId) return;
    let current = true;
    operationsGateway.listRooms(form.cinemaId).then((items) => {
      if (!current) return;
      setRoomState({ status: 'ready', items });
      setForm((previous) => ({ ...previous, room: items.includes(previous.room) ? previous.room : (items[0] ?? '') }));
    }).catch((reason: unknown) => {
      if (!current) return;
      setRoomState({ status: 'error', items: [] });
      setFormError(reason instanceof Error ? reason.message : 'Không tải được danh sách phòng.');
    });
    return () => { current = false; };
  }, [form.cinemaId]);

  const filteredShows = useMemo(() => view.status === 'ready' ? view.data.shows.filter((item) => item.showtime.cinemaId === form.cinemaId) : [], [view, form.cinemaId]);
  const nextShow = filteredShows.find((entry) => entry.status === 'ACTIVE' && new Date(entry.showtime.startsAt).getTime() > now);
  const activeCount = filteredShows.filter((entry) => entry.status === 'ACTIVE').length;
  const movieName = (id: string) => view.status === 'ready' ? view.data.movies.find((item) => item.id === id)?.title ?? 'Phim không còn trong danh mục' : '';

  const gateway = operationsGateway;
  if (!gateway) return <div className="page"><EmptyState title="Quản trị production chưa mở" body="Chế độ máy chủ hiện chưa có đăng nhập, phân quyền và nhật ký quản trị. Để tránh thay đổi lịch bán vé không an toàn, trang điều hành demo chỉ hoạt động ở bản chạy trình duyệt." action={<Link className="button button--primary" to="/">Về lịch chiếu</Link>} /></div>;

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(''); setNotice(''); setSaving(true);
    try {
      const startsAt = new Date(`${form.startsAt}:00+07:00`).toISOString();
      const showtime = await gateway.createShowtime({ movieId: form.movieId, cinemaId: form.cinemaId, room: form.room, startsAt, format: form.format, basePrice: Number(form.basePrice) });
      setNotice(`Đã thêm suất ${formatDateTime(showtime.startsAt)}. Lịch công khai demo đã cập nhật.`);
      setForm((previous) => ({ ...previous, startsAt: suggestedTime() }));
      setReload((value) => value + 1);
    } catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Không thể thêm suất chiếu.'); }
    finally { setSaving(false); }
  };

  const cancel = async (show: ManagedShowtime) => {
    if (!window.confirm(`Hủy suất ${movieName(show.showtime.movieId)} lúc ${formatDateTime(show.showtime.startsAt)}?`)) return;
    setScheduleError(''); setScheduleNotice('');
    try {
      await gateway.cancelShowtime(show.showtime.id);
      setScheduleNotice('Đã hủy suất. Suất này không còn hiển thị cho khách đặt vé demo.');
      setReload((value) => value + 1);
    } catch (reason) { setScheduleError(reason instanceof Error ? reason.message : 'Không thể hủy suất chiếu.'); }
  };

  return <div className="page operations-page">
    <div className="page-title"><CalendarClock aria-hidden="true" /><div><h1>Điều hành suất chiếu</h1><p>Tạo lịch demo cho từng rạp, nhìn thấy xung đột phòng trước khi công bố. Đây không phải cổng quản trị production.</p></div></div>
    <div className="operations-banner" role="note"><CircleCheck aria-hidden="true" /><p><strong>Chỉ trong trình duyệt này.</strong> Thay đổi được lưu cục bộ và xuất hiện ở lịch chiếu công khai demo; không có phân quyền hay thanh toán thật.</p></div>
    {view.status === 'ready' && <a className="operations-peek" href="#operations-schedule-title"><span>Suất sắp tới</span><strong>{nextShow ? `${movieName(nextShow.showtime.movieId)} · ${formatDateTime(nextShow.showtime.startsAt)}` : 'Chưa có suất mở bán tại rạp này'}</strong><span>Xem lịch và quản lý suất ↓</span></a>}
    {view.status === 'loading' && <Loading label="Đang chuẩn bị lịch điều hành…" />}
    {view.status === 'error' && <ErrorState message={view.message} retry={() => { setView({ status: 'loading' }); setReload((value) => value + 1); }} />}
    {view.status === 'ready' && <div className="operations-layout">
      <section className="operations-editor" aria-labelledby="operations-create-title">
        <h2 id="operations-create-title">Thêm suất chiếu</h2>
        <p>Chọn một phòng có sẵn. Hệ thống kiểm tra thời lượng phim và thêm 20 phút dọn phòng giữa hai suất.</p>
        <form onSubmit={create}>
          <label><span><MapPin aria-hidden="true" /> Rạp</span><select value={form.cinemaId} onChange={(event) => { setRoomState({ status: 'loading', items: [] }); setForm({ ...form, cinemaId: event.target.value, room: '' }); }} required>{view.data.cinemas.map((cinema) => <option key={cinema.id} value={cinema.id}>{cinema.name}</option>)}</select></label>
          <label><span><Film aria-hidden="true" /> Phim</span><select value={form.movieId} onChange={(event) => setForm({ ...form, movieId: event.target.value })} required>{view.data.movies.map((movie) => <option key={movie.id} value={movie.id}>{movie.title} · {movie.durationMinutes} phút</option>)}</select></label>
          <div className="operations-form-pair">
            <label><span>Phòng chiếu</span><select value={form.room} onChange={(event) => setForm({ ...form, room: event.target.value })} disabled={roomState.status !== 'ready' || roomState.items.length === 0} required>{roomState.status !== 'ready' && <option value="">{roomState.status === 'error' ? 'Không tải được phòng' : 'Đang tải phòng…'}</option>}{roomState.status === 'ready' && roomState.items.length === 0 && <option value="">Rạp chưa có phòng</option>}{roomState.items.map((room) => <option key={room} value={room}>{room}</option>)}</select></label>
            <label><span>Định dạng</span><select value={form.format} onChange={(event) => setForm({ ...form, format: event.target.value as '2D' | '3D' })}><option value="2D">2D</option><option value="3D">3D</option></select></label>
          </div>
          <div className="operations-form-pair">
            <label><span>Bắt đầu · giờ Việt Nam</span><input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} required /></label>
            <label><span>Giá cơ bản · VND</span><input type="number" min="10000" max="500000" step="1000" value={form.basePrice} onChange={(event) => setForm({ ...form, basePrice: event.target.value })} required /></label>
          </div>
          {formError && <div className="message message--error" role="alert"><strong>Chưa lưu được.</strong><span>{formError}</span></div>}
          {notice && <div className="operations-success" role="status"><CircleCheck aria-hidden="true" />{notice}</div>}
          <button className="button button--primary" type="submit" disabled={saving || roomState.status !== 'ready' || !form.room || !form.movieId}><Plus aria-hidden="true" />{saving ? 'Đang thêm suất…' : 'Thêm suất demo'}</button>
        </form>
      </section>
      <section className="operations-schedule" aria-labelledby="operations-schedule-title">
        <div className="operations-schedule__heading"><div><h2 id="operations-schedule-title">Lịch sắp tới</h2><p>{view.data.cinemas.find((cinema) => cinema.id === form.cinemaId)?.name ?? 'Chọn rạp'} · {activeCount} suất mở bán{filteredShows.length > activeCount ? ` · ${filteredShows.length - activeCount} đã hủy` : ''}</p></div><Link to="/" className="button button--ghost">Xem như khách</Link></div>
        {scheduleError && <div className="message message--error" role="alert"><strong>Chưa hủy được suất.</strong><span>{scheduleError}</span></div>}
        {scheduleNotice && <div className="operations-success" role="status"><CircleCheck aria-hidden="true" />{scheduleNotice}</div>}
        {filteredShows.length === 0 ? <EmptyState title="Chưa có suất nào" body="Hãy tạo suất đầu tiên cho rạp này bằng biểu mẫu bên cạnh." /> : <div className="operations-list">{filteredShows.map((entry) => {
          const blocked = entry.status === 'CANCELLED' ? 'Đã hủy' : entry.bookingCount > 0 ? `${entry.bookingCount} đơn đang giữ hoặc đã xác nhận` : new Date(entry.showtime.startsAt).getTime() <= now ? 'Suất đã bắt đầu' : null;
          const reasonId = `operations-reason-${entry.showtime.id}`;
          return <article key={`${entry.showtime.id}-${entry.showtime.startsAt}`} data-showtime-id={entry.showtime.id} className={entry.status === 'CANCELLED' ? 'is-cancelled' : ''}>
            <div className="operations-list__when"><strong>{new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }).format(new Date(entry.showtime.startsAt))}</strong><span>{new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' }).format(new Date(entry.showtime.startsAt))}</span></div>
            <div className="operations-list__film"><h3>{movieName(entry.showtime.movieId)}</h3><p>{entry.showtime.room} · {entry.showtime.format} · từ {formatMoney(entry.showtime.basePrice)}</p><small id={reasonId}>{blocked ?? 'Chưa có đơn · có thể hủy'}</small></div>
            <button type="button" className="operations-list__cancel" aria-label={`${blocked ? 'Không thể hủy' : 'Hủy'} suất ${movieName(entry.showtime.movieId)} lúc ${formatDateTime(entry.showtime.startsAt)}`} aria-describedby={reasonId} title={blocked ?? 'Hủy suất demo'} disabled={Boolean(blocked)} onClick={() => void cancel(entry)}><Trash2 aria-hidden="true" /></button>
          </article>;
        })}</div>}
      </section>
    </div>}
  </div>;
}
