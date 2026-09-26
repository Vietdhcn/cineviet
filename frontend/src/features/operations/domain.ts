import type { Booking, Movie, Showtime } from '../../domain/cinema';

export interface CreateShowtimeInput {
  movieId: string;
  cinemaId: string;
  room: string;
  startsAt: string;
  format: '2D' | '3D';
  basePrice: number;
}

export interface ManagedShowtime {
  showtime: Showtime;
  status: 'ACTIVE' | 'CANCELLED';
  bookingCount: number;
}

export interface OperationsGateway {
  listManagedShowtimes(): Promise<ManagedShowtime[]>;
  listRooms(cinemaId: string): Promise<string[]>;
  createShowtime(input: CreateShowtimeInput): Promise<Showtime>;
  cancelShowtime(showtimeId: string): Promise<void>;
}

const TURNOVER_MS = 20 * 60_000;

export function validateNewShowtime(
  input: CreateShowtimeInput,
  movies: Movie[],
  rooms: string[],
  activeShowtimes: Showtime[],
  now = Date.now(),
): string | null {
  const movie = movies.find((item) => item.id === input.movieId);
  if (!movie) return 'Hãy chọn một phim có trong danh mục demo.';
  if (!rooms.includes(input.room)) return 'Phòng chiếu không thuộc rạp đã chọn.';
  const start = new Date(input.startsAt).getTime();
  if (!Number.isFinite(start) || start <= now) return 'Giờ chiếu phải ở trong tương lai.';
  if (!Number.isInteger(input.basePrice) || input.basePrice < 10_000 || input.basePrice > 500_000)
    return 'Giá vé cơ bản phải từ 10.000 đến 500.000 ₫.';
  const end = start + (movie.durationMinutes + 20) * 60_000;
  const conflict = activeShowtimes.some((showtime) => {
    if (showtime.cinemaId !== input.cinemaId || showtime.room !== input.room) return false;
    const otherMovie = movies.find((item) => item.id === showtime.movieId);
    const otherStart = new Date(showtime.startsAt).getTime();
    const otherEnd = otherStart + ((otherMovie?.durationMinutes ?? 120) * 60_000) + TURNOVER_MS;
    return start < otherEnd && otherStart < end;
  });
  return conflict ? 'Phòng đã có suất chiếu trùng giờ hoặc chưa đủ 20 phút dọn phòng.' : null;
}

export function canCancelShowtime(showtime: Showtime, status: ManagedShowtime['status'], bookings: Booking[], now = Date.now()) {
  if (status === 'CANCELLED') return 'Suất chiếu đã được hủy.';
  if (new Date(showtime.startsAt).getTime() <= now) return 'Không thể hủy suất đã bắt đầu.';
  if (bookings.some((booking) => booking.showtimeId === showtime.id &&
      (booking.status === 'CONFIRMED' || (booking.status === 'HELD' && new Date(booking.expiresAt).getTime() > now))))
    return 'Suất đã có đơn giữ ghế hoặc vé xác nhận; cần xử lý đơn trước.';
  return null;
}
