import { CalendarCheck, CheckCircle2, Download, MapPin, Ticket as TicketIcon } from 'lucide-react';
import encodeQR from 'qr';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cinemaGateway } from '../../app/gateway';
import type { Booking, Cinema, Movie, Showtime } from '../../domain/cinema';
import { formatDateTime, formatMoney } from '../../domain/cinema';
import { EmptyState, ErrorState, Loading } from '../../ui/Loading';
import { BookingSteps } from './BookingSteps';

export function TicketPage() {
  const { bookingId = '' } = useParams(); const [data, setData] = useState<{ booking: Booking | null; show: Showtime | undefined; movie: Movie | undefined; cinema: Cinema | undefined }>(); const [error, setError] = useState('');
  useEffect(() => { cinemaGateway.getBooking(bookingId).then(async (booking) => { if (!booking) { setData({ booking, show: undefined, movie: undefined, cinema: undefined }); return; } const [show, movies, cinemas] = await Promise.all([cinemaGateway.getShowtime(booking.showtimeId, booking.id), cinemaGateway.listMovies(), cinemaGateway.listCinemas()]); setData({ booking, show: show ?? undefined, movie: movies.find((item) => item.id === show?.movieId), cinema: cinemas.find((item) => item.id === show?.cinemaId) }); }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Không tải được vé.')); }, [bookingId]);
  if (!data) return <div className="page">{error ? <ErrorState message={error} retry={() => window.location.reload()} /> : <Loading label="Đang phát hành vé…" />}</div>;
  if (!data.booking || data.booking.status !== 'CONFIRMED' || !data.show || !data.movie) return <div className="page"><EmptyState title="Vé chưa sẵn sàng" body="Đơn chưa được xác nhận hoặc không thuộc phiên demo này." action={<Link className="button button--primary" to="/don-ve">Xem đơn vé</Link>} /></div>;
  const { booking, show, movie, cinema } = data;
  return <div className="page ticket-page"><BookingSteps current={3} /><section className="success-intro"><CheckCircle2 aria-hidden="true" /><div><h1>Vé đã sẵn sàng.</h1><p>Đơn <strong>{booking.reference}</strong> đã được xác nhận bằng thanh toán mô phỏng.</p></div></section><div className="ticket-grid">{booking.items.map((item) => <article className="cinema-ticket" key={item.seatId}><div className="cinema-ticket__main"><div className="ticket-brand"><TicketIcon aria-hidden="true" /> CineViet</div><p>VÉ DEMO · KHÔNG DÙNG CHECK-IN</p><h2>{movie.title}</h2><dl><div><dt>Thời gian</dt><dd>{formatDateTime(show.startsAt)}</dd></div><div><dt>Rạp</dt><dd>{cinema?.name}</dd></div><div><dt>Phòng / Ghế</dt><dd>{show.room} · <strong>{item.seatLabel}</strong></dd></div></dl></div><div className="cinema-ticket__stub">{item.ticketToken ? <img className="ticket-qr" src={encodeQR(item.ticketToken, 'data-url', { scale: 5, border: 4 })} alt={`Mã QR vé demo ghế ${item.seatLabel}`} /> : <span>Mã vé chưa khả dụng</span>}<strong>{item.seatLabel}</strong><span>{formatMoney(item.price)}</span><small>{item.ticketToken?.slice(0, 8).toUpperCase()}</small></div></article>)}</div><div className="ticket-actions"><button className="button button--primary" onClick={() => window.print()}><Download aria-hidden="true" /> In hoặc lưu PDF</button><Link className="button button--ghost" to="/don-ve"><CalendarCheck aria-hidden="true" /> Xem mọi đơn</Link></div><p className="location-note"><MapPin aria-hidden="true" /> {cinema?.address}. Có mặt trước giờ chiếu 15 phút.</p></div>;
}
