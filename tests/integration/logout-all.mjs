// Run only against an isolated PostgreSQL-backed stack with customer auth enabled.
const origin = (process.env.CINEVIET_API_URL ?? 'http://127.0.0.1:18080').replace(/\/$/, '');
const target = new URL(origin);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) && process.env.CINEVIET_ALLOW_REMOTE_TEST !== 'true')
  throw new Error('Refusing to create test accounts on a remote host without CINEVIET_ALLOW_REMOTE_TEST=true');

const read = async (response) => ({
  status: response.status,
  cookie: response.headers.get('set-cookie')?.split(';', 1)[0],
  body: await response.json().catch(() => ({})),
});
const csrf = async () => {
  const session = await read(await fetch(`${origin}/api/auth/csrf`));
  if (session.status !== 200 || !session.cookie || !session.body.csrfToken) throw new Error('CSRF bootstrap failed');
  return session;
};
const post = (path, session, body = {}) => fetch(`${origin}${path}`, {
  method: 'POST',
  headers: { Cookie: session.cookie, 'X-CSRF-Token': session.body.csrfToken, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}).then(read);
const get = (path, session) => fetch(`${origin}${path}`, { headers: { Cookie: session.cookie } }).then(read);
const expectStatus = (result, status, label) => {
  if (result.status !== status) throw new Error(`${label}: expected ${status}, got ${result.status} ${JSON.stringify(result.body)}`);
};

const email = `revoke-${crypto.randomUUID()}@cineviet.local`;
const password = 'a strong test passphrase';
const firstAnonymous = await csrf();
const first = await post('/api/auth/register', firstAnonymous, { email, password });
expectStatus(first, 200, 'register');
if (!first.cookie || !first.body.csrfToken) throw new Error('Registration did not create an authenticated session');

const secondAnonymous = await csrf();
const second = await post('/api/auth/login', secondAnonymous, { email, password });
expectStatus(second, 200, 'second device login');
if (!second.cookie || second.cookie === first.cookie) throw new Error('Second device did not receive its own session');
expectStatus(await get('/api/auth/me', first), 200, 'first device before revocation');
expectStatus(await get('/api/auth/me', second), 200, 'second device before revocation');
const anonymousRevoke = await post('/api/auth/logout-all', await csrf());
expectStatus(anonymousRevoke, 401, 'anonymous revocation denied');
const withoutCsrf = await read(await fetch(`${origin}/api/auth/logout-all`, {
  method: 'POST', headers: { Cookie: first.cookie },
}));
expectStatus(withoutCsrf, 403, 'revocation without CSRF denied');

const otherAnonymous = await csrf();
const other = await post('/api/auth/register', otherAnonymous, {
  email: `other-${crypto.randomUUID()}@cineviet.local`, password,
});
expectStatus(other, 200, 'unrelated account registration');

const revoked = await post('/api/auth/logout-all', first);
expectStatus(revoked, 204, 'logout everywhere');
for (const [label, session] of [['first', first], ['second', second]]) {
  const profile = await get('/api/auth/me', session);
  if (profile.status !== 401 || profile.body.code !== 'SESSION_REQUIRED')
    throw new Error(`${label} device still accesses profile after revocation: ${profile.status}`);
  const bookings = await get('/api/bookings', session);
  if (bookings.status !== 401 || bookings.body.code !== 'SESSION_REQUIRED')
    throw new Error(`${label} device still accesses bookings after revocation: ${bookings.status}`);
}
expectStatus(await post('/api/auth/logout-all', second), 401, 'revoked device cannot revoke again');
expectStatus(await get('/api/auth/me', other), 200, 'unrelated account remains signed in');

const newAnonymous = await csrf();
const signedInAgain = await post('/api/auth/login', newAnonymous, { email, password });
expectStatus(signedInAgain, 200, 'login after revocation');
expectStatus(await get('/api/auth/me', signedInAgain), 200, 'new session after revocation');
console.log('LOGOUT_ALL_OK: both old devices rejected, unrelated account unaffected, new login works');
