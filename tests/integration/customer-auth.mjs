// Run only against an isolated PostgreSQL-backed stack with cineviet.customer-auth-enabled=true.
const origin = (process.env.CINEVIET_API_URL ?? 'http://127.0.0.1:18080').replace(/\/$/, '');
const target = new URL(origin);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) && process.env.CINEVIET_ALLOW_REMOTE_TEST !== 'true')
  throw new Error('Refusing to register test accounts on a remote host without CINEVIET_ALLOW_REMOTE_TEST=true');

const read = async (response) => ({
  status: response.status,
  cookie: response.headers.get('set-cookie')?.split(';', 1)[0],
  body: await response.json().catch(() => ({})),
});
const csrf = async () => {
  const result = await read(await fetch(`${origin}/api/auth/csrf`));
  if (result.status !== 200 || !result.cookie || !result.body.csrfToken)
    throw new Error(`CSRF bootstrap failed: ${result.status}`);
  return result;
};
const post = (path, session, body) => fetch(`${origin}${path}`, {
  method: 'POST',
  headers: { Cookie: session.cookie, 'X-CSRF-Token': session.body.csrfToken, 'Idempotency-Key': crypto.randomUUID(), 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}).then(read);

const email = `test-${crypto.randomUUID()}@cineviet.local`;
const password = 'a strong test passphrase';
const anonymous = await csrf();
const anonymousBookings = await read(await fetch(`${origin}/api/bookings`, { headers: { Cookie: anonymous.cookie } }));
if (anonymousBookings.status !== 401 || anonymousBookings.body.code !== 'SESSION_REQUIRED' ||
    !anonymousBookings.body.message?.includes('đăng nhập'))
  throw new Error(`Customer mode must ask unauthenticated users to log in: ${anonymousBookings.status} ${JSON.stringify(anonymousBookings.body)}`);
const anonymousProfile = await read(await fetch(`${origin}/api/auth/me`, { headers: { Cookie: anonymous.cookie } }));
if (anonymousProfile.status !== 401)
  throw new Error(`Anonymous profile request must be rejected: ${anonymousProfile.status}`);
const demoSession = await read(await fetch(`${origin}/api/session`, { headers: { Cookie: anonymous.cookie } }));
if (demoSession.status !== 404)
  throw new Error(`Customer-auth mode must not create a demo account: ${demoSession.status}`);
const rejectedCsrf = await read(await fetch(`${origin}/api/auth/register`, {
  method: 'POST', headers: { Cookie: anonymous.cookie, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
}));
if (rejectedCsrf.status !== 403) throw new Error(`Registration without CSRF must fail, got ${rejectedCsrf.status}`);

const registered = await post('/api/auth/register', anonymous, { email: email.toUpperCase(), password });
if (registered.status !== 200 || registered.body.email !== email || !registered.body.csrfToken ||
    !registered.cookie || registered.cookie === anonymous.cookie || registered.body.csrfToken === anonymous.body.csrfToken)
  throw new Error(`Registration or session rotation failed: ${registered.status} ${JSON.stringify(registered.body)}`);
const profile = await read(await fetch(`${origin}/api/auth/me`, { headers: { Cookie: registered.cookie } }));
if (profile.status !== 200 || profile.body.email !== email)
  throw new Error(`Authenticated profile could not be restored: ${profile.status}`);
const bookings = await read(await fetch(`${origin}/api/bookings`, { headers: { Cookie: registered.cookie } }));
if (bookings.status !== 200 || !Array.isArray(bookings.body) || bookings.body.length !== 0)
  throw new Error(`Registered account cannot read its empty booking list: ${bookings.status}`);

const shows = await read(await fetch(`${origin}/api/showtimes`));
const show = shows.body.find((item) => new Date(item.startsAt).getTime() > Date.now() + 10 * 60_000);
if (!show) throw new Error('No future showtime for customer-auth mode check');
const seatList = await read(await fetch(`${origin}/api/showtimes/${show.id}/seats`));
const seat = seatList.body.find((item) => item.status === 'AVAILABLE');
if (!seat) throw new Error('No available seat for customer-auth mode check');
const held = await post('/api/bookings/hold', registered, { showtimeId: show.id, seatIds: [seat.id] });
if (held.status !== 200 || held.body.status !== 'HELD')
  throw new Error(`Customer account could not hold a seat: ${held.status}`);
let paymentError;
try {
  const demoPayment = await post(`/api/bookings/${held.body.id}/demo-payment`, registered, { outcome: 'FAILED' });
  if (demoPayment.status !== 404)
    throw new Error(`Customer-auth mode must not expose demo payment: ${demoPayment.status}`);
  const afterPayment = await read(await fetch(`${origin}/api/bookings/${held.body.id}`, { headers: { Cookie: registered.cookie } }));
  if (afterPayment.status !== 200 || afterPayment.body.status !== 'HELD')
    throw new Error('Disabled demo payment changed the held booking');
} catch (error) { paymentError = error; }
finally {
  const cancelled = await post(`/api/bookings/${held.body.id}/cancel`, registered, {});
  if (cancelled.status !== 200 || cancelled.body.status !== 'CANCELLED')
    throw new Error(`Customer booking cleanup failed: ${cancelled.status}`);
}
if (paymentError) throw paymentError;

const duplicateSession = await csrf();
const duplicate = await post('/api/auth/register', duplicateSession, { email, password });
if (duplicate.status !== 409 || duplicate.body.code !== 'EMAIL_UNAVAILABLE')
  throw new Error(`Case-insensitive duplicate email was not rejected: ${duplicate.status}`);

const loggedOut = await post('/api/auth/logout', registered, {});
if (![200, 204].includes(loggedOut.status)) throw new Error(`Logout failed: ${loggedOut.status}`);
const afterLogout = await read(await fetch(`${origin}/api/bookings`, { headers: { Cookie: registered.cookie } }));
if (afterLogout.status !== 401 || afterLogout.body.code !== 'SESSION_REQUIRED')
  throw new Error(`Invalidated session still accesses bookings: ${afterLogout.status}`);
const profileAfterLogout = await read(await fetch(`${origin}/api/auth/me`, { headers: { Cookie: registered.cookie } }));
if (profileAfterLogout.status !== 401)
  throw new Error(`Invalidated session still accesses profile: ${profileAfterLogout.status}`);

const loginSession = await csrf();
const wrong = await post('/api/auth/login', loginSession, { email, password: 'an incorrect passphrase' });
if (wrong.status !== 401 || wrong.body.code !== 'INVALID_CREDENTIALS')
  throw new Error(`Wrong password was not rejected: ${wrong.status}`);
const loggedIn = await post('/api/auth/login', loginSession, { email: email.toUpperCase(), password });
if (loggedIn.status !== 200 || loggedIn.body.email !== email || !loggedIn.cookie ||
    loggedIn.cookie === loginSession.cookie || !loggedIn.body.csrfToken)
  throw new Error(`Login or session rotation failed: ${loggedIn.status} ${JSON.stringify(loggedIn.body)}`);
console.log('CUSTOMER_AUTH_OK: no demo bypass/payment, CSRF, registration, normalized uniqueness, session rotation, logout and login');
