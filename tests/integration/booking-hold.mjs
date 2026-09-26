// Run against an isolated PostgreSQL-backed CineViet stack; no payment endpoint is called.
const origin = (process.env.CINEVIET_API_URL ?? 'http://127.0.0.1:18080').replace(/\/$/, '');
const target = new URL(origin);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) && process.env.CINEVIET_ALLOW_REMOTE_TEST !== 'true')
  throw new Error('Refusing to create test bookings on a remote host without CINEVIET_ALLOW_REMOTE_TEST=true');

const read = async (response) => ({ status: response.status, body: await response.json().catch(() => ({})) });
const session = async () => {
  const response = await fetch(`${origin}/api/session`);
  const cookie = response.headers.get('set-cookie')?.split(';', 1)[0];
  const body = await response.json();
  if (response.status !== 200 || !cookie || !body.csrfToken) throw new Error('Demo session bootstrap failed');
  return { cookie, csrfToken: body.csrfToken };
};
const post = (path, account, body, key = crypto.randomUUID()) => fetch(`${origin}${path}`, {
  method: 'POST',
  headers: { Cookie: account.cookie, 'X-CSRF-Token': account.csrfToken, 'Idempotency-Key': key, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}).then(read);
const get = (path, account) => fetch(`${origin}${path}`, { headers: { Cookie: account.cookie } }).then(read);

const cinemas = await fetch(`${origin}/api/cinemas`).then(read);
if (cinemas.status !== 200 || !cinemas.body[0]) throw new Error('No test cinema');
const shows = await fetch(`${origin}/api/showtimes?cinemaId=${cinemas.body[0].id}`).then(read);
const showtime = shows.body.find((show) => new Date(show.startsAt).getTime() > Date.now() + 10 * 60_000);
if (!showtime) throw new Error('No future test showtime');
const seats = await fetch(`${origin}/api/showtimes/${showtime.id}/seats`).then(read);
const [seat, otherSeat] = seats.body.filter((item) => item.status === 'AVAILABLE');
if (!seat || !otherSeat) throw new Error('Need two available seats');
const owner = await session();
const stranger = await session();
if (owner.cookie === stranger.cookie) throw new Error('Sessions were not isolated');
const key = crypto.randomUUID();
let bookingId;
let testError;
const cleanupErrors = [];
try {
  const held = await post('/api/bookings/hold', owner,
    { showtimeId: showtime.id, seatIds: [seat.id], price: 1, total: 1 }, key);
  if (held.status !== 200 || held.body.status !== 'HELD' || !held.body.id)
    throw new Error(`Hold failed: ${held.status} ${JSON.stringify(held.body)}`);
  bookingId = held.body.id;
  if (Number(held.body.total) !== Number(seat.price))
    throw new Error(`Client price affected server total: ${held.body.total} versus ${seat.price}`);
  const repeated = await post('/api/bookings/hold', owner,
    { showtimeId: showtime.id, seatIds: [seat.id], price: 1, total: 1 }, key);
  if (repeated.status !== 200 || repeated.body.id !== bookingId)
    throw new Error(`Identical idempotency request did not return the same booking: ${repeated.status}`);
  const reused = await post('/api/bookings/hold', owner,
    { showtimeId: showtime.id, seatIds: [otherSeat.id] }, key);
  if (reused.status !== 409 || reused.body.code !== 'IDEMPOTENCY_REUSED')
    throw new Error(`Reused key with a different request was not rejected: ${reused.status}`);
  const owned = await get(`/api/bookings/${bookingId}`, owner);
  const foreign = await get(`/api/bookings/${bookingId}`, stranger);
  if (owned.status !== 200 || foreign.status !== 404)
    throw new Error(`Booking ownership failed: owner ${owned.status}, stranger ${foreign.status}`);
} catch (error) { testError = error; }
finally {
  if (bookingId) {
    try {
      const cancelled = await post(`/api/bookings/${bookingId}/cancel`, owner, {});
      if (cancelled.status !== 200 || cancelled.body.status !== 'CANCELLED')
        cleanupErrors.push(new Error(`Booking cleanup failed: ${cancelled.status}`));
      const after = await fetch(`${origin}/api/showtimes/${showtime.id}/seats`).then(read);
      if (after.body.find((item) => item.id === seat.id)?.status !== 'AVAILABLE')
        cleanupErrors.push(new Error('Seat was not released after cancellation'));
    } catch (error) { cleanupErrors.push(error); }
  }
}
if (testError || cleanupErrors.length)
  throw new AggregateError([...(testError ? [testError] : []), ...cleanupErrors], 'Booking hold verification failed');
console.log('BOOKING_HOLD_OK: server price, idempotency, ownership and cancellation');
