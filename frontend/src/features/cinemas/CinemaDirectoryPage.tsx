import { ArrowRight, MapPin, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cinemaGateway } from '../../app/gateway';
import type { Cinema, Showtime } from '../../domain/cinema';
import { ErrorState, Loading } from '../../ui/Loading';
import { cinemaCities, filterCinemas, nextDates } from './cinemaDiscovery';

type DirectoryState = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; cinemas: Cinema[]; showtimes: Showtime[] };

export function CinemaDirectoryPage() {
  const [state, setState] = useState<DirectoryState>({ kind: 'loading' });
  const [city, setCity] = useState('');
  const [query, setQuery] = useState('');
  const [reload, setReload] = useState(0);
  const today = nextDates(1)[0];

  useEffect(() => {
    let active = true;
    Promise.all([cinemaGateway.listCinemas(), cinemaGateway.listShowtimes(undefined, today)]).then(([cinemas, showtimes]) => {
      if (active) setState({ kind: 'ready', cinemas, showtimes });
    }).catch(() => { if (active) setState({ kind: 'error' }); });
    return () => { active = false; };
  }, [reload, today]);

  const cinemas = state.kind === 'ready' ? state.cinemas : [];
  const visible = filterCinemas(cinemas, city, query);
  const cities = cinemaCities(cinemas);

  return <div className="page cinema-directory">
    <section className="cinema-directory__intro" aria-labelledby="cinema-directory-title">
      <div>
        <h1 id="cinema-directory-title">Tìm rạp.<br /><span>Chọn buổi chiếu.</span></h1>
        <p>Khám phá các địa điểm CineViet trong dữ liệu demo, xem lịch chiếu theo ngày và đi thẳng tới sơ đồ ghế.</p>
      </div>
      <div className="cinema-directory__aside" aria-hidden="true"><MapPin /><span>Rạp gần câu chuyện tiếp theo của bạn</span></div>
    </section>

    <section className="cinema-directory__browser" aria-labelledby="cinema-list-title">
      <div className="cinema-directory__toolbar">
        <div><h2 id="cinema-list-title">Danh sách rạp</h2><p>Địa điểm và địa chỉ minh họa · DEMO</p></div>
        <div className="cinema-directory__filters">
          <label><span>Thành phố</span><select value={city} onChange={(event) => setCity(event.target.value)}><option value="">Tất cả thành phố</option>{cities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Tìm rạp hoặc địa chỉ</span><span className="cinema-directory__search"><Search aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ví dụ: Hồ Gươm" /></span></label>
        </div>
      </div>
      {state.kind === 'loading' && <Loading label="Đang tải danh sách rạp…" />}
      {state.kind === 'error' && <ErrorState message="Không tải được danh sách rạp. Hãy kiểm tra kết nối rồi thử lại." retry={() => { setState({ kind: 'loading' }); setReload((value) => value + 1); }} />}
      {state.kind === 'ready' && cinemas.length === 0 && <div className="message"><strong>Chưa có rạp nào.</strong><span>Danh sách địa điểm sẽ xuất hiện khi dữ liệu được cập nhật.</span></div>}
      {state.kind === 'ready' && cinemas.length > 0 && visible.length === 0 && <div className="message"><strong>Không tìm thấy rạp phù hợp.</strong><span>Thử thành phố hoặc từ khóa khác.</span><button className="button button--quiet" onClick={() => { setCity(''); setQuery(''); }}>Xóa bộ lọc</button></div>}
      {state.kind === 'ready' && visible.length > 0 && <div className="cinema-directory__list" aria-live="polite">{visible.map((cinema, index) => {
        const count = state.showtimes.filter((showtime) => showtime.cinemaId === cinema.id).length;
        return <article className="cinema-directory__item" key={cinema.id}>
          <span className="cinema-directory__number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <div><span className="cinema-directory__city">{cinema.city}</span><h3><Link to={`/rap/${cinema.id}`}>{cinema.name}</Link></h3><p><MapPin aria-hidden="true" />{cinema.address}</p></div>
          <span className="cinema-directory__count">{count ? `${count} suất hôm nay` : 'Chưa có suất hôm nay'}</span>
          <Link className="cinema-directory__go" to={`/rap/${cinema.id}`} aria-label={`Xem lịch chiếu tại ${cinema.name}`}><ArrowRight aria-hidden="true" /></Link>
        </article>;
      })}</div>}
    </section>
  </div>;
}
