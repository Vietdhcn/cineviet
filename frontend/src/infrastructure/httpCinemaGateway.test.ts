import { afterEach, beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

it('establishes a demo session and sends CSRF and idempotency headers on a hold', async () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url === '/api/auth/csrf') return new Response(null, { status: 404 });
    if (url === '/api/session') return new Response(JSON.stringify({ csrfToken: 'session-token' }), { status: 200 });
    return new Response(JSON.stringify({ id: 'booking-1' }), { status: 200 });
  }));
  const { HttpCinemaGateway } = await import('./httpCinemaGateway');

  await new HttpCinemaGateway().holdSeats('show-1', ['seat-uuid-1']);

  expect(calls.map((call) => call.url)).toEqual(['/api/auth/csrf', '/api/session', '/api/bookings/hold']);
  expect(calls[2]?.init?.credentials).toBe('include');
  expect(calls[2]?.init?.headers).toMatchObject({ 'X-CSRF-Token': 'session-token', 'Idempotency-Key': expect.any(String) });
  expect(JSON.parse(String(calls[2]?.init?.body))).toEqual({ showtimeId: 'show-1', seatIds: ['seat-uuid-1'] });
});

it('uses customer CSRF without creating a demo account when customer auth is enabled', async () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url === '/api/auth/csrf') return new Response(JSON.stringify({ csrfToken: 'customer-token' }), { status: 200 });
    if (url === '/api/session') throw new Error('Demo session must not be created');
    return new Response(JSON.stringify({ id: 'booking-2' }), { status: 200 });
  }));
  const { HttpCinemaGateway } = await import('./httpCinemaGateway');

  await new HttpCinemaGateway().holdSeats('show-2', ['seat-uuid-2']);

  expect(calls.map((call) => call.url)).toEqual(['/api/auth/csrf', '/api/bookings/hold']);
  expect(calls[1]?.init?.headers).toMatchObject({ 'X-CSRF-Token': 'customer-token' });
});

it('restores a customer profile and uses the rotated CSRF after login', async () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url === '/api/auth/csrf') return new Response(JSON.stringify({ csrfToken: 'anonymous-token' }), { status: 200 });
    if (url === '/api/auth/me') return new Response(JSON.stringify({ email: 'person@example.com' }), { status: 200 });
    if (url === '/api/auth/login') return new Response(JSON.stringify({ email: 'person@example.com', csrfToken: 'signed-in-token' }), { status: 200 });
    return new Response(JSON.stringify({ id: 'booking-3' }), { status: 200 });
  }));
  const { HttpCinemaGateway, currentCustomer, loginCustomer } = await import('./httpCinemaGateway');

  expect(await currentCustomer()).toEqual({ email: 'person@example.com' });
  await loginCustomer('PERSON@example.com', 'a strong passphrase');
  await new HttpCinemaGateway().holdSeats('show-3', ['seat-uuid-3']);

  expect(calls.map((call) => call.url)).toEqual(['/api/auth/csrf', '/api/auth/me', '/api/auth/login', '/api/bookings/hold']);
  expect(calls[2]?.init?.headers).toMatchObject({ 'X-CSRF-Token': 'anonymous-token' });
  expect(calls[3]?.init?.headers).toMatchObject({ 'X-CSRF-Token': 'signed-in-token' });
});

it('drops the revoked session token and obtains a fresh anonymous token after logout everywhere', async () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  let csrfRequests = 0;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url === '/api/auth/csrf') {
      csrfRequests += 1;
      return new Response(JSON.stringify({ csrfToken: `anonymous-${csrfRequests}` }), { status: 200 });
    }
    if (url === '/api/auth/login') return new Response(JSON.stringify({ email: 'person@example.com', csrfToken: 'signed-in-token' }), { status: 200 });
    if (url === '/api/auth/logout-all') return new Response(null, { status: 204 });
    if (url === '/api/auth/me') return new Response(JSON.stringify({ code: 'SESSION_REQUIRED' }), { status: 401 });
    throw new Error(`Unexpected URL: ${url}`);
  }));
  const { currentCustomer, loginCustomer, logoutAllCustomer } = await import('./httpCinemaGateway');

  await loginCustomer('person@example.com', 'a strong passphrase');
  await logoutAllCustomer();
  expect(await currentCustomer()).toBeNull();
  expect(calls.map((call) => call.url)).toEqual(['/api/auth/csrf', '/api/auth/login', '/api/auth/logout-all', '/api/auth/csrf', '/api/auth/me']);
  expect(calls[2]?.init?.headers).toMatchObject({ 'X-CSRF-Token': 'signed-in-token' });
  expect(csrfRequests).toBe(2);
});
