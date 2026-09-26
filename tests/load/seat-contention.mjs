// Run against an isolated CineViet stack backed by PostgreSQL: node tests/load/seat-contention.mjs
// Creates 50 anonymous sessions, races for one seat, verifies atomic rollback, then cancels the winner.
const origin = (process.env.CINEVIET_API_URL ?? 'http://localhost:8088').replace(/\/$/, '');
const contenders = Number(process.env.CINEVIET_CONTENDERS ?? 50);
if (!Number.isInteger(contenders) || contenders < 2 || contenders > 200) throw new Error('CINEVIET_CONTENDERS must be an integer from 2 to 200');
const target = new URL(origin);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) && process.env.CINEVIET_ALLOW_REMOTE_TEST !== 'true')
  throw new Error('Refusing to create test bookings on a remote host without CINEVIET_ALLOW_REMOTE_TEST=true');

const json = async (response) => {
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
};
const session = async () => {
  const response = await fetch(`${origin}/api/session`);
  if (!response.ok) throw new Error(`Session bootstrap failed: ${response.status}`);
  const cookie = response.headers.get('set-cookie')?.split(';', 1)[0];
  const { csrfToken } = await response.json();
  if (!cookie || !csrfToken) throw new Error('Session cookie or CSRF token missing');
  return { cookie, csrfToken };
};
const post = (path, account, body, idempotencyKey = crypto.randomUUID()) => fetch(`${origin}${path}`, {
  method: 'POST',
  headers: { Cookie: account.cookie, 'X-CSRF-Token': account.csrfToken, 'Idempotency-Key': idempotencyKey, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}).then(json);

const cinemas = await fetch(`${origin}/api/cinemas`).then(json);
if (cinemas.status !== 200 || !Array.isArray(cinemas.body) || !cinemas.body[0]) throw new Error('No demo cinemas are available');
const shows = await fetch(`${origin}/api/showtimes?cinemaId=${cinemas.body[0].id}`).then(json);
if (shows.status !== 200 || !Array.isArray(shows.body)) throw new Error('No future demo showtimes are available');
const showtime = shows.body.find((item) => new Date(item.startsAt).getTime() > Date.now() + 10 * 60_000);
if (!showtime) throw new Error('No demo showtime starts at least ten minutes from now');
const seatResponse = await fetch(`${origin}/api/showtimes/${showtime.id}/seats`).then(json);
const freeSeats = seatResponse.body.filter?.((seat) => seat.status === 'AVAILABLE') ?? [];
if (freeSeats.length < 2) throw new Error('Need two available seats for contention and rollback checks');
const [contested, control] = freeSeats;
const accounts = await Promise.all(Array.from({ length: contenders }, session));
if (new Set(accounts.map((account) => account.cookie)).size !== contenders)
  throw new Error(`Expected ${contenders} distinct session cookies`);
const responses = await Promise.all(accounts.map((account) => post('/api/bookings/hold', account, { showtimeId: showtime.id, seatIds: [contested.id] })));
const winners = responses.map((result, index) => ({ ...result, index })).filter((result) => result.status === 200);
const conflicts = responses.filter((result) => result.status === 409 && result.body.code === 'SEAT_CONFLICT');

let testError;
const cleanupErrors = [];
try {
  if (winners.length !== 1 || conflicts.length !== contenders - 1)
    throw new Error(`Expected one hold and ${contenders - 1} seat conflicts; received ${winners.length} holds, ${conflicts.length} seat conflicts, ${responses.length - winners.length - conflicts.length} other responses`);
  if (!winners[0].body.id || winners[0].body.status !== 'HELD') throw new Error('Winner has no HELD booking ID');
  const heldSeats = await fetch(`${origin}/api/showtimes/${showtime.id}/seats`).then(json);
  if (heldSeats.body.find((seat) => seat.id === contested.id)?.status !== 'HELD')
    throw new Error('Contested seat is not HELD after the race');
  const challenger = accounts[winners[0].index === 0 ? 1 : 0];
  const partial = await post('/api/bookings/hold', challenger, { showtimeId: showtime.id, seatIds: [contested.id, control.id] });
  if (partial.status !== 409 || partial.body.code !== 'SEAT_CONFLICT')
    throw new Error(`Expected partial hold to roll back with SEAT_CONFLICT, received ${partial.status} ${partial.body.code}`);
  const after = await fetch(`${origin}/api/showtimes/${showtime.id}/seats`).then(json);
  if (after.body.find((seat) => seat.id === control.id)?.status !== 'AVAILABLE') throw new Error('The uncontested seat was not rolled back');
} catch (error) {
  testError = error;
} finally {
  for (const winner of winners) {
    if (!winner.body.id) { cleanupErrors.push(new Error('Winner has no booking ID to cancel')); continue; }
    try {
      const cancelled = await post(`/api/bookings/${winner.body.id}/cancel`, accounts[winner.index], {});
      if (cancelled.status !== 200 || cancelled.body.status !== 'CANCELLED')
        cleanupErrors.push(new Error(`Cleanup failed for booking ${winner.body.id}: ${cancelled.status} ${cancelled.body.status}`));
    } catch (error) { cleanupErrors.push(error); }
  }
  if (winners.length > 0 && cleanupErrors.length === 0) {
    try {
      const released = await fetch(`${origin}/api/showtimes/${showtime.id}/seats`).then(json);
      if (released.body.find((seat) => seat.id === contested.id)?.status !== 'AVAILABLE')
        cleanupErrors.push(new Error('Contested seat was not released after cancellation'));
    } catch (error) { cleanupErrors.push(error); }
  }
}
if (testError || cleanupErrors.length) throw new AggregateError([...(testError ? [testError] : []), ...cleanupErrors], 'Seat contention verification failed');
console.log(`SEAT_CONTENTION_OK: ${contenders} distinct sessions, one hold, ${conflicts.length} seat conflicts, atomic rollback and cleanup`);
