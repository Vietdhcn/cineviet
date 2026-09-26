import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, CreditCard, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cinemaGateway, isDemoMode } from '../../app/gateway';
import { customerAuthMode } from '../../infrastructure/httpCinemaGateway';
import type { Booking, Movie, Showtime } from '../../domain/cinema';
import { formatDateTime, formatMoney, isActiveHold } from '../../domain/cinema';
import { EmptyState, ErrorState, Loading } from '../../ui/Loading';
import { BookingSteps } from './BookingSteps';

function HoldTimer({ expiresAt }: { expiresAt: string }) {
  const calculate = () => Math.max(0, new Date(expiresAt).getTime() - Date.now()); const [left, setLeft] = useState(calculate);
  useEffect(() => { const interval = window.setInterval(() => setLeft(Math.max(0, new Date(expiresAt).getTime() - Date.now())), 1000); return () => window.clearInterval(interval); }, [expiresAt]);
  const minutes = Math.floor(left / 60_000); const seconds = Math.floor((left % 60_000) / 1000);
  return <div className={`timer ${left < 60_000 ? 'is-urgent' : ''}`} role="timer" aria-live="polite"><Clock3 aria-hidden="true" /><span>Còn lại</span><strong>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</strong></div>;
}

export function CheckoutPage() {
  const { bookingId = '' } = useParams(); const navigate = useNavigate(); const [booking, setBooking] = useState<Booking | null>(); const [movie, setMovie] = useState<Movie>(); const [showtime, setShowtime] = useState<Showtime>(); const [paying, setPaying] = useState(false); const [error, setError] = useState(''); const [consent, setConsent] = useState(false); const [now, setNow] = useState(0);
  const [customerMode, setCustomerMode] = useState<boolean | null>(isDemoMode ? false : null);
  useEffect(() => { if (!isDemoMode) customerAuthMode().then(setCustomerMode).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Không kiểm tra được chế độ tài khoản.')); }, []);
  useEffect(() => { const interval = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(interval); }, []);
  useEffect(() => { cinemaGateway.getBooking(bookingId).then(async (item) => { setBooking(item); if (!item) return; const [show, movies] = await Promise.all([cinemaGateway.getShowtime(item.showtimeId, item.id), cinemaGateway.listMovies()]); setShowtime(show ?? undefined); setMovie(movies.find((value) => value.id === show?.movieId)); }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Không tải được đơn đặt vé.')); }, [bookingId]);
  const pay = async (outcome: 'SUCCESS' | 'FAILED') => { setPaying(true); setError(''); try { await cinemaGateway.confirmDemoPayment(bookingId, outcome); navigate(`/ve/${bookingId}`); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Thanh toán mô phỏng thất bại.'); setPaying(false); } };
  const cancel = async () => { setPaying(true); setError(''); try { await cinemaGateway.cancelBooking(bookingId); navigate('/don-ve'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể hủy giữ chỗ.'); setPaying(false); } };
  if (customerMode === null) return <div className="page">{error ? <ErrorState message={error} retry={() => window.location.reload()} /> : <Loading label="Đang kiểm tra chế độ đặt chỗ…" />}</div>;
  if (booking === undefined) return <div className="page">{error ? <ErrorState message={error} retry={() => window.location.reload()} /> : <Loading label="Đang xác minh quyền giữ ghế…" />}</div>;
  if (booking === null) return <div className="page"><EmptyState title="Không tìm thấy đơn" body="Mã đơn không tồn tại trong phiên demo này." action={<Link className="button button--primary" to="/">Chọn phim</Link>} /></div>;
  if (!showtime || !movie) return <div className="page"><ErrorState message="Không tải được thông tin suất chiếu." /></div>;
  if (!isActiveHold(booking) || now >= new Date(booking.expiresAt).getTime()) return <div className="page"><EmptyState title="Đơn giữ chỗ đã hết hạn" body="Ghế đã được trả lại sơ đồ. Không có khoản thanh toán nào được thực hiện." action={<Link className="button button--primary" to={`/dat-ghe/${booking.showtimeId}`}>Chọn lại ghế</Link>} /></div>;
  return <div className="page checkout-page">
    <Link className="back-link" to={`/dat-ghe/${booking.showtimeId}`}><ArrowLeft aria-hidden="true" /> Quay lại sơ đồ ghế</Link><BookingSteps current={2} />
    <div className="checkout-heading"><div><h1>Xác nhận trước khi đèn tắt</h1><p>Kiểm tra ghế và tổng tiền do máy chủ xác nhận.</p></div><HoldTimer expiresAt={booking.expiresAt} /></div>
    {error && <div className="message message--error" role="alert"><AlertTriangle aria-hidden="true" /><strong>Chưa xác nhận thanh toán.</strong><span>{error}</span></div>}
    <div className="checkout-grid">
      {customerMode ? <section className="payment-panel"><div className="payment-panel__title"><LockKeyhole aria-hidden="true" /><div><h2>Thanh toán chưa khả dụng</h2><p>Ghế đang được giữ tạm thời trên máy chủ. Chưa có giao dịch hay vé nào được tạo.</p></div></div><p className="account-panel__notice">Phần thanh toán sẽ được triển khai sau. Bạn có thể hủy giữ chỗ ngay để trả ghế về sơ đồ, hoặc để phiên tự hết hạn.</p><button className="button button--quiet button--wide" type="button" disabled={paying} onClick={cancel}>{paying ? 'Đang hủy…' : 'Hủy giữ chỗ'}</button></section> : <section className="payment-panel"><div className="payment-panel__title"><CreditCard aria-hidden="true" /><div><h2>Thanh toán mô phỏng</h2><p>Không nhập số thẻ hoặc dữ liệu tài chính thật.</p></div></div><div className="demo-card"><span>CINEVIET · DEMO ONLY</span><strong>•••• &nbsp; •••• &nbsp; •••• &nbsp; 2026</strong><small>KHÔNG CÓ GIAO DỊCH THẬT</small></div><label className="consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Tôi hiểu đây là thao tác mô phỏng phục vụ đồ án.</span></label><button className="button button--primary button--wide" disabled={paying || !consent} onClick={() => pay('SUCCESS')}>{paying ? 'Đang xác nhận…' : <><ShieldCheck aria-hidden="true" /> Xác nhận mô phỏng</>}</button><button className="simulate-fail" disabled={paying || !consent} onClick={() => pay('FAILED')}>Thử tình huống thất bại</button></section>}
      <aside className="order-receipt"><span className="receipt-notch" /><p className="receipt-label">PHIẾU GIỮ CHỖ · {booking.reference}</p><h2>{movie.title}</h2><p>{formatDateTime(showtime.startsAt)}<br />{showtime.room} · {showtime.format}</p><div className="receipt-items">{booking.items.map((item) => <div key={item.seatId}><span>Ghế {item.seatLabel}</span><strong>{formatMoney(item.price)}</strong></div>)}</div><div className="receipt-total"><span>Tổng cộng</span><strong>{formatMoney(booking.total)}</strong></div><p className="receipt-note"><CheckCircle2 aria-hidden="true" /> Giá và thời hạn do backend quản lý.</p></aside>
    </div>
  </div>;
}
