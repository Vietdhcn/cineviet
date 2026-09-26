export type Genre = 'Hành động' | 'Hài' | 'Tình cảm' | 'Hoạt hình' | 'Phiêu lưu' | 'Tâm lý';
export type SeatKind = 'STANDARD' | 'VIP';
export type SeatStatus = 'AVAILABLE' | 'HELD' | 'SOLD';
export type BookingStatus = 'HELD' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';

export interface Cinema { id: string; name: string; address: string; city: string }
export interface Movie {
  id: string; title: string; tagline: string; synopsis: string; genres: Genre[];
  durationMinutes: number; ageRating: string; origin: string; year: number;
  palette: [string, string, string]; artworkLabel: string; featured?: boolean;
}
export interface Showtime { id: string; movieId: string; cinemaId: string; startsAt: string; room: string; format: '2D' | '3D'; basePrice: number }
export interface Seat { id: string; row: string; number: number; kind: SeatKind; status: SeatStatus; price: number }
export interface BookingItem { seatId: string; seatLabel: string; price: number; ticketToken?: string }
export interface Booking { id: string; reference: string; showtimeId: string; items: BookingItem[]; status: BookingStatus; expiresAt: string; total: number; createdAt: string }
export type RecommendationReason = 'PREFERRED_GENRE' | 'HISTORY_GENRE' | 'POPULAR' | 'AVAILABLE_SHOWTIME';
export interface Recommendation { movie: Movie; score: number; reasons: RecommendationReason[]; earliestShowtime: string }

export interface CinemaGateway {
  listMovies(): Promise<Movie[]>;
  listCinemas(): Promise<Cinema[]>;
  listShowtimes(cinemaId?: string, date?: string): Promise<Showtime[]>;
  getShowtime(showtimeId: string, bookingId?: string): Promise<Showtime | null>;
  listSeats(showtimeId: string): Promise<Seat[]>;
  holdSeats(showtimeId: string, seatIds: string[]): Promise<Booking>;
  confirmDemoPayment(bookingId: string, outcome: 'SUCCESS' | 'FAILED'): Promise<Booking>;
  cancelBooking(bookingId: string): Promise<Booking>;
  getBooking(bookingId: string): Promise<Booking | null>;
  listBookings(): Promise<Booking[]>;
  recommend(cinemaId: string, date: string, preferredGenres: Genre[]): Promise<Recommendation[]>;
}

export const formatMoney = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
export const formatDateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }).format(new Date(value));
export const localDateKey = (value: string | Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
export const seatLabel = (seat: Seat) => `${seat.row}${seat.number}`;
export const isActiveHold = (booking: Booking) => booking.status === 'HELD' && Date.now() < new Date(booking.expiresAt).getTime();
