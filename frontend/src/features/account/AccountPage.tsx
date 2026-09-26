import { ArrowRight, LockKeyhole, LogOut, UserRound } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { currentCustomer, customerAuthMode, loginCustomer, logoutAllCustomer, logoutCustomer, registerCustomer, type CustomerProfile } from '../../infrastructure/httpCinemaGateway';
import { ErrorState, Loading } from '../../ui/Loading';

export function AccountPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'loading' | 'customer' | 'error'>('loading');
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [form, setForm] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const returnTo = searchParams.get('returnTo');
  const safeReturnTo = returnTo?.startsWith('/') && !returnTo.startsWith('//') && !returnTo.includes('\\') ? returnTo : null;

  useEffect(() => {
    let active = true;
    customerAuthMode().then(async () => {
      if (!active) return;
      const account = await currentCustomer();
      if (active) { setProfile(account); setMode('customer'); }
    }).catch((reason: unknown) => {
      if (active) { setError(reason instanceof Error ? reason.message : 'Không kết nối được máy chủ.'); setMode('error'); }
    });
    return () => { active = false; };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const account = form === 'login' ? await loginCustomer(email, password) : await registerCustomer(email, password);
      setProfile(account); setPassword('');
      if (safeReturnTo) navigate(safeReturnTo);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể xác thực tài khoản.'); }
    finally { setBusy(false); }
  };

  const logout = async () => {
    setBusy(true); setError(''); setNotice('');
    try { await logoutCustomer(); setProfile(null); setPassword(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể đăng xuất.'); }
    finally { setBusy(false); }
  };

  const logoutEverywhere = async () => {
    if (!window.confirm('Đăng xuất khỏi tất cả thiết bị? Bạn sẽ cần đăng nhập lại trên từng thiết bị.')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await logoutAllCustomer();
      setProfile(null); setPassword('');
      setNotice('Đã đăng xuất khỏi tất cả thiết bị.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể đăng xuất khỏi tất cả thiết bị.'); }
    finally { setBusy(false); }
  };

  if (mode === 'loading') return <div className="page"><Loading label="Đang kiểm tra phiên tài khoản…" /></div>;
  if (mode === 'error') return <div className="page"><ErrorState message={error} retry={() => window.location.reload()} /></div>;

  return <div className="page account-page">
    <div className="account-page__intro"><span className="data-label"><UserRound aria-hidden="true" /> TÀI KHOẢN KHÁCH</span><h1>Tài khoản của bạn</h1><p>Phiên đăng nhập được quản lý trên máy chủ. Lịch chiếu chỉ xuất hiện khi dữ liệu được xác thực; chưa nhận thanh toán.</p></div>
    {profile ? <section className="account-panel" aria-label="Thông tin tài khoản">
      <div className="account-panel__heading"><UserRound aria-hidden="true" /><div><h2>Đã đăng nhập</h2><p>{profile.email}</p></div></div>
      {error && <p className="message message--error" role="alert">{error}</p>}
      <div className="account-panel__actions"><Link className="button button--primary" to={safeReturnTo ?? '/don-ve'}>{safeReturnTo ? 'Tiếp tục chọn ghế' : 'Xem đơn của tôi'} <ArrowRight aria-hidden="true" /></Link><button className="button button--quiet" type="button" disabled={busy} onClick={logout}><LogOut aria-hidden="true" />{busy ? 'Đang đăng xuất…' : 'Đăng xuất'}</button></div>
      <div className="account-panel__security"><h3>Bảo vệ tài khoản</h3><p>Nếu bạn nghi ngờ có thiết bị khác đang dùng tài khoản, hãy thu hồi mọi phiên đăng nhập. Các chỗ đã giữ vẫn hết hạn hoặc được hủy theo quy tắc hiện tại.</p><button className="button button--danger-quiet" type="button" disabled={busy} onClick={logoutEverywhere}><LogOut aria-hidden="true" />{busy ? 'Đang thu hồi phiên…' : 'Đăng xuất mọi thiết bị'}</button></div>
    </section> : <section className="account-panel" aria-label="Đăng nhập hoặc đăng ký"><div className="account-tabs" role="group" aria-label="Chọn thao tác tài khoản"><button type="button" className={form === 'login' ? 'is-active' : ''} aria-pressed={form === 'login'} onClick={() => { setForm('login'); setError(''); }}>Đăng nhập</button><button type="button" className={form === 'register' ? 'is-active' : ''} aria-pressed={form === 'register'} onClick={() => { setForm('register'); setError(''); }}>Tạo tài khoản</button></div><h2>{form === 'login' ? 'Chào mừng trở lại' : 'Bắt đầu với CineViet'}</h2><p className="account-panel__hint">{form === 'login' ? 'Đăng nhập để xem và quản lý chỗ đã giữ.' : 'Dùng email của bạn và mật khẩu ít nhất 12 ký tự.'}</p>{notice && <p className="message message--success" role="status">{notice}</p>}{error && <p className="message message--error" role="alert">{error}</p>}<form onSubmit={submit} aria-busy={busy}><label htmlFor="account-email">Email</label><input id="account-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /><label htmlFor="account-password">Mật khẩu</label><input id="account-password" type="password" autoComplete={form === 'login' ? 'current-password' : 'new-password'} required minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /><button className="button button--primary button--wide" type="submit" disabled={busy}><LockKeyhole aria-hidden="true" />{busy ? 'Đang xử lý…' : form === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</button></form><p className="account-panel__notice">Email chưa được xác minh tự động. Không dùng thông tin nhạy cảm; hệ thống chưa mở bán.</p></section>}
  </div>;
}
