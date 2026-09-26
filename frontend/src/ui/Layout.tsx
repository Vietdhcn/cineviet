import { CalendarClock, Clapperboard, History, MapPin, Menu, Sparkles, Ticket, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { isDemoMode } from '../app/gateway';
import { customerAuthMode } from '../infrastructure/httpCinemaGateway';

const navItems = [
  { to: '/', label: 'Phim & suất chiếu', icon: Clapperboard },
  { to: '/rap', label: 'Rạp chiếu', icon: MapPin },
  { to: '/goi-y', label: 'Gợi ý cho bạn', icon: Sparkles },
  { to: '/don-ve', label: 'Đơn vé', icon: History },
  ...(!isDemoMode ? [{ to: '/tai-khoan', label: 'Tài khoản', icon: UserRound }] : []),
  ...(isDemoMode ? [{ to: '/dieu-hanh', label: 'Điều hành demo', icon: CalendarClock }] : []),
];

export function Layout() {
  const [open, setOpen] = useState(false);
  const [customerMode, setCustomerMode] = useState<boolean | null>(isDemoMode ? false : null);
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => { if (!isDemoMode) customerAuthMode().then(setCustomerMode).catch(() => setCustomerMode(null)); }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
    <div className="demo-ribbon"><span>{customerMode ? 'Dữ liệu mẫu' : 'Chế độ demo'}</span> {customerMode ? 'Dữ liệu phim/rạp là mẫu — thanh toán chưa khả dụng.' : customerMode === null ? 'Dữ liệu phim/rạp là mẫu — không thu tiền thật.' : 'Dữ liệu và thanh toán đều là mô phỏng — không thu tiền thật.'}</div>
    <header className="site-header">
      <Link className="brand" to="/" aria-label="CineViet — trang chủ"><span className="brand__mark"><span /></span><span>Cine<strong>Viet</strong></span></Link>
      <button className="menu-button" aria-label={open ? 'Đóng trình đơn' : 'Mở trình đơn'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? <X /> : <Menu />}</button>
      <nav className={open ? 'site-nav is-open' : 'site-nav'} aria-label="Điều hướng chính">
        {navItems.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'is-active' : ''}><Icon aria-hidden="true" />{label}</NavLink>)}
      </nav>
      <Link className="header-ticket" to="/don-ve"><Ticket aria-hidden="true" /><span>Vé của tôi</span></Link>
    </header>
    <main id="main-content" ref={mainRef} tabIndex={-1}><Outlet /></main>
    <footer className="site-footer">
      <div><Link className="brand brand--footer" to="/"><span className="brand__mark"><span /></span><span>Cine<strong>Viet</strong></span></Link><p>Đồ án đặt vé và gợi ý phim có giải thích. Không liên kết với Beta Cinemas.</p></div>
      <div><strong>Từ lịch chiếu đến vé.</strong><p>Đặt vé · Gợi ý phim · {isDemoMode ? 'Điều hành suất demo' : 'Quản trị đang phát triển'}</p></div>
      <p className="site-footer__meta">Dữ liệu synthetic được gắn nhãn DEMO · Asia/Ho_Chi_Minh</p>
    </footer>
  </div>;
}
