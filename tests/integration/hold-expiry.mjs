// Deliberately moves a test booking's deadline into the past on an isolated local PostgreSQL database.
import { spawnSync } from 'node:child_process';

const origin = (process.env.CINEVIET_API_URL ?? 'http://127.0.0.1:18080').replace(/\/$/, '');
const target = new URL(origin);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || process.env.CINEVIET_TEST_DB_EXPIRE !== 'true')
  throw new Error('Expiry test requires a local API and CINEVIET_TEST_DB_EXPIRE=true');
const psql = process.env.CINEVIET_PSQL;
if (!psql) throw new Error('Set CINEVIET_PSQL to the psql executable for the isolated test DB');
const pgHost = process.env.PGHOST ?? '127.0.0.1';
if (!['localhost', '127.0.0.1', '::1'].includes(pgHost)) throw new Error('Expiry test requires a local PostgreSQL host');
const pgPort = process.env.PGPORT ?? '55432';
const pgUser = process.env.PGUSER ?? 'cineviet';
const pgDatabase = process.env.PGDATABASE ?? 'cineviet';

const read = async (response) => ({ status: response.status, body: await response.json().catch(() => ({})) });
const bootstrap = await fetch(`${origin}/api/session`);
const cookie = bootstrap.headers.get('set-cookie')?.split(';', 1)[0];
const csrfToken = (await bootstrap.json()).csrfToken;
if (bootstrap.status !== 200 || !cookie || !csrfToken) throw new Error('Session bootstrap failed');
const headers = { Cookie: cookie, 'X-CSRF-Token': csrfToken, 'Idempotency-Key': crypto.randomUUID(), 'Content-Type': 'application/json' };
const cinemas = await fetch(`${origin}/api/cinemas`).then(read);
const shows = await fetch(`${origin}/api/showtimes?cinemaId=${cinemas.body[0].id}`).then(read);
const showtime = shows.body.find((show) => new Date(show.startsAt).getTime() > Date.now() + 10 * 60_000);
if (!showtime) throw new Error('No future test showtime');
const seats = await fetch(`${origin}/api/showtimes/${showtime.id}/seats`).then(read);
const seat = seats.body.find((item) => item.status === 'AVAILABLE');
if (!seat) throw new Error('No available test seat');

const held = await fetch(`${origin}/api/bookings/hold`, {
  method: 'POST', headers, body: JSON.stringify({ showtimeId: showtime.id, seatIds: [seat.id] }),
}).then(read);
if (held.status !== 200 || held.body.status !== 'HELD' || !/^[0-9a-f-]{36}$/i.test(held.body.id ?? ''))
  throw new Error(`Hold failed: ${held.status} ${JSON.stringify(held.body)}`);
const bookingId = held.body.id;
const sql = `update bookings set expires_at=clock_timestamp()-interval '1 second' where id='${bookingId}' and status='HELD' returning id`;
const changed = spawnSync(psql, ['-h', pgHost, '-p', pgPort, '-U', pgUser, '-d', pgDatabase, '-v', 'ON_ERROR_STOP=1', '-Atc', sql], { encoding: 'utf8' });
if (changed.status !== 0 || !changed.stdout.includes(bookingId))
  throw new Error(`Could not age the isolated hold: ${changed.stderr || changed.stdout}`);

let expired = false;
for (let attempt = 0; attempt < 30; attempt++) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const booking = await fetch(`${origin}/api/bookings/${bookingId}`, { headers: { Cookie: cookie } }).then(read);
  const after = await fetch(`${origin}/api/showtimes/${showtime.id}/seats`).then(read);
  if (booking.body.status === 'EXPIRED' && after.body.find((item) => item.id === seat.id)?.status === 'AVAILABLE') {
    expired = true;
    break;
  }
}
if (!expired) throw new Error(`Expired hold ${bookingId} was not released within 15 seconds`);
console.log('HOLD_EXPIRY_OK: worker expired the booking and released its seat');
