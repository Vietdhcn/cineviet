import assert from 'node:assert/strict';
import test from 'node:test';

const origin = (process.env.CINEVIET_API_URL ?? 'http://127.0.0.1:18080').replace(/\/$/, '');
const host = new URL(origin).hostname;
if (!['localhost', '127.0.0.1', '[::1]'].includes(host))
  throw new Error('This test only runs against a local backend.');

test('the server never creates anonymous demo accounts', async () => {
  const response = await fetch(`${origin}/api/session`);
  assert.equal(response.status, 404);
});

test('the server never exposes simulated payment', async () => {
  const csrf = await fetch(`${origin}/api/auth/csrf`);
  assert.equal(csrf.status, 200);
  const cookie = csrf.headers.get('set-cookie')?.split(';', 1)[0];
  const { csrfToken } = await csrf.json();
  assert.ok(cookie && csrfToken);
  const payment = await fetch(`${origin}/api/bookings/00000000-0000-0000-0000-000000000001/demo-payment`, {
    method: 'POST',
    headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({ outcome: 'UNRECOGNIZED' }),
  });
  assert.equal(payment.status, 404);
});
