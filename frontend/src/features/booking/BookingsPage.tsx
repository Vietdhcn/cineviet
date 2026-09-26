import { ArrowRight, Clock3, History } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cinemaGateway } from '../../app/gateway';
import type { Booking, Movie, Showtime } from '../../domain/cinema';
import { formatDateTime, formatMoney } from '../../domain/cinema';
import { EmptyState, ErrorState, Loading } from '../../ui/Loading';

const statusLabel = { HELD: 'Đang giữ ghế', CONFIRMED: 'Đã xác nhận', CANCELLED: 'Đã hủy', EXPIRED: 'Đã hết hạn' } as const;
export function BookingsPage() {
  const [data, setData] = useState<{ bookings: Booking[]; showsByBooking: Record<string, Showtime | null>; movies: Movie[] }>(); const [error, setError] = useState('');
  useEffect(() => { Promise.all([cinemaGateway.listBookings(), cinemaGateway.listMovies()]).then(async ([bookings, movies]) => { const pairs = await Promise.all(bookings.map(async (booking) => [booking.id, await cinemaGateway.getShowtime(booking.showtimeId, booking.id)] as const)); setData({ bookings, showsByBooking: Object.fromEntries(pairs), movies }); }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Không tải được lịch sử đơn vé.')); }, []);
  if (!data) return <div className="page">{error ? <ErrorState message={error} retry={() => window.location.reload()} /> : <Loading label="Đang lấy lịch sử đơn vé…" />}</div>;
  return <div className="page bookings-page"><div className="page-title"><History aria-hidden="true" /><div><h1>Đơn vé của tôi</h1><p>Đơn được lưu trên máy chủ và chỉ hiển thị theo tài khoản hiện tại.</p></div></div>{data.bookings.length === 0 ? <EmptyState title="Chưa có đơn vé" body="Sau khi giữ ghế, đơn đang chờ sẽ xuất hiện ở đây. Thanh toán và phát hành vé sẽ triển khai sau." action={<Link className="button button--primary" to="/">Về trang phim</Link>} /> : <div className="booking-list">{data.bookings.map((booking) => { const show = data.showsByBooking[booking.id]; const movie = data.movies.find((item) => item.id === show?.movieId); const target = booking.status === 'HELD' ? `/thanh-toan/${booking.id}` : booking.status === 'CONFIRMED' ? null : `/dat-ghe/${booking.showtimeId}`; return <article key={booking.id}><div className={`booking-status booking-status--${booking.status.toLowerCase()}`}><span />{statusLabel[booking.status]}</div><div><small>{booking.reference}</small><h2>{movie?.title ?? 'Phim không còn hiển thị'}</h2><p><Clock3 aria-hidden="true" /> {show ? formatDateTime(show.startsAt) : 'Suất không còn trong danh mục'} · Ghế {booking.items.map((item) => item.seatLabel).join(', ')}</p></div><strong>{formatMoney(booking.total)}</strong>{target && <Link to={target} aria-label={`Mở đơn ${booking.reference}`}><ArrowRight aria-hidden="true" /></Link>}</article>; })}</div>}</div>;
}
