import type { Booking, Cinema, CinemaGateway, Genre, Movie, Recommendation, Seat, Showtime } from '../domain/cinema';

type ServerSession = { csrfToken: string };
let sessionPromise: Promise<ServerSession> | undefined;
const serverSession = () => {
  sessionPromise ??= fetch('/api/auth/csrf', { credentials: 'include' }).then(async (authResponse) => {
    if (authResponse.ok) {
      const data = await authResponse.json() as { csrfToken: string };
      return { csrfToken: data.csrfToken };
    }
    throw new Error('Không thể kết nối dịch vụ tài khoản trên máy chủ.');
  }).catch((error: unknown) => { sessionPromise = undefined; throw error; });
  return sessionPromise;
};

export const customerAuthMode = async () => { await serverSession(); return true; };

export class HttpRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) { super(message); }
}

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const session = await serverSession();
  const response = await fetch(url, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init?.method && init.method !== 'GET' ? { 'X-CSRF-Token': session.csrfToken } : {}), ...init?.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Không thể kết nối máy chủ.' })) as { message?: string; code?: string };
    throw new HttpRequestError(body.message ?? 'Yêu cầu không thành công.', response.status, body.code);
  }
  const body = await response.text();
  return (body ? JSON.parse(body) : undefined) as T;
};

export type CustomerProfile = { email: string };
type CustomerAuthResult = CustomerProfile & { csrfToken: string };

export async function currentCustomer(): Promise<CustomerProfile | null> {
  if (!(await customerAuthMode())) return null;
  try { return await request<CustomerProfile>('/api/auth/me'); }
  catch (error) {
    if (error instanceof HttpRequestError && error.status === 401) return null;
    throw error;
  }
}

export async function loginCustomer(email: string, password: string): Promise<CustomerProfile> {
  const result = await request<CustomerAuthResult>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  sessionPromise = Promise.resolve({ csrfToken: result.csrfToken });
  return { email: result.email };
}

export async function registerCustomer(email: string, password: string): Promise<CustomerProfile> {
  const result = await request<CustomerAuthResult>('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
  sessionPromise = Promise.resolve({ csrfToken: result.csrfToken });
  return { email: result.email };
}

export async function logoutCustomer(): Promise<void> {
  await request<void>('/api/auth/logout', { method: 'POST' });
  sessionPromise = undefined;
}

export async function logoutAllCustomer(): Promise<void> {
  await request<void>('/api/auth/logout-all', { method: 'POST' });
  sessionPromise = undefined;
}

export class HttpCinemaGateway implements CinemaGateway {
  listMovies() { return request<Movie[]>('/api/movies'); }
  listCinemas() { return request<Cinema[]>('/api/cinemas'); }
  listShowtimes(cinemaId?: string, date?: string) { const query = new URLSearchParams(); if (cinemaId) query.set('cinemaId', cinemaId); if (date) query.set('date', date); return request<Showtime[]>(`/api/showtimes?${query}`); }
  getShowtime(showtimeId: string) { return request<Showtime | null>(`/api/showtimes/${showtimeId}`); }
  listSeats(showtimeId: string) { return request<Seat[]>(`/api/showtimes/${showtimeId}/seats`); }
  holdSeats(showtimeId: string, seatIds: string[]) { return request<Booking>('/api/bookings/hold', { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ showtimeId, seatIds }) }); }
  cancelBooking(bookingId: string) { return request<Booking>(`/api/bookings/${bookingId}/cancel`, { method: 'POST' }); }
  getBooking(bookingId: string) { return request<Booking | null>(`/api/bookings/${bookingId}`); }
  listBookings() { return request<Booking[]>('/api/bookings'); }
  recommend(cinemaId: string, date: string, preferredGenres: Genre[]) { return request<Recommendation[]>(`/api/recommendations?${new URLSearchParams({ cinemaId, date, preferredGenres: preferredGenres.join(',') })}`); }
}
