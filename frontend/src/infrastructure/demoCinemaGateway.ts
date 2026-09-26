import type { Booking, Cinema, CinemaGateway, Genre, Movie, Recommendation, Seat, Showtime } from '../domain/cinema';
import { isActiveHold } from '../domain/cinema';
import { rankRecommendations } from '../domain/recommendation';
import type { CreateShowtimeInput, ManagedShowtime, OperationsGateway } from '../features/operations';
import { canCancelShowtime, validateNewShowtime } from '../features/operations';

const STORAGE_KEY = 'cineviet-demo-bookings-v1';
const SHOW_SNAPSHOTS_KEY = 'cineviet-demo-showtime-snapshots-v1';
const OPERATIONS_KEY = 'cineviet-demo-operations-v1';
const delay = (ms = 180) => new Promise((resolve) => window.setTimeout(resolve, ms));
const localDateKey = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const dateAfter = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); return localDateKey(date); };
const atTime = (date: string, time: string) => `${date}T${time}:00+07:00`;
const upcomingDate = (date: string, time: string) => new Date(atTime(date, time)).getTime() > Date.now() ? date : dateAfter(1);

export const cinemas: Cinema[] = [
  { id: 'hn-ho-guom', name: 'CineViet Hồ Gươm', address: '25 Tràng Tiền, Hoàn Kiếm', city: 'Hà Nội' },
  { id: 'hcm-ben-thanh', name: 'CineViet Bến Thành', address: '42 Lê Lợi, Quận 1', city: 'TP. Hồ Chí Minh' },
  { id: 'dn-song-han', name: 'CineViet Sông Hàn', address: '18 Bạch Đằng, Hải Châu', city: 'Đà Nẵng' },
];

export const movies: Movie[] = [
  { id: 'mot-dem-o-ha-noi', title: 'Một Đêm Ở Hà Nội', tagline: 'Thành phố giữ bí mật. Đêm nay, nó kể lại.', synopsis: 'Một nữ kiến trúc sư đi qua những con phố quen để tìm bản vẽ cuối cùng cha cô để lại, và gặp một người xa lạ đang theo đuổi cùng một ký ức.', genres: ['Tâm lý', 'Tình cảm'], durationMinutes: 112, ageRating: 'T13', origin: 'Việt Nam', year: 2026, palette: ['#111A3D', '#D84D5E', '#F2CB83'], artworkLabel: 'Đêm xanh · mái ngói · ánh cửa sổ', featured: true },
  { id: 'duong-dua-tren-may', title: 'Đường Đua Trên Mây', tagline: 'Không có đường tắt ở độ cao 3.000 mét.', synopsis: 'Một đội cứu hộ nghiệp dư băng qua đèo mây trong cuộc đua với thời tiết để đưa thuốc tới bản làng trước bình minh.', genres: ['Hành động', 'Phiêu lưu'], durationMinutes: 126, ageRating: 'T16', origin: 'Việt Nam', year: 2026, palette: ['#0A3447', '#4E92A3', '#F0C77A'], artworkLabel: 'Đèo mây · đèn xe · bình minh' },
  { id: 'tiem-banh-ben-song', title: 'Tiệm Bánh Bên Sông', tagline: 'Công thức cũ. Một gia đình mới.', synopsis: 'Ba chị em trở về quê để bán tiệm bánh của mẹ, nhưng một cuốn sổ công thức khiến họ thử mở cửa thêm đúng bảy ngày.', genres: ['Hài', 'Tình cảm'], durationMinutes: 98, ageRating: 'P', origin: 'Việt Nam', year: 2026, palette: ['#70423C', '#E7A262', '#F5E4C6'], artworkLabel: 'Lò bánh · mặt sông · nắng sớm' },
  { id: 'hanh-tinh-giay', title: 'Hành Tinh Giấy', tagline: 'Gấp một cánh cửa. Mở cả vũ trụ.', synopsis: 'Cậu bé An phát hiện những mô hình giấy của bà có thể mở lối tới một hành tinh đang mất dần màu sắc.', genres: ['Hoạt hình', 'Phiêu lưu'], durationMinutes: 91, ageRating: 'P', origin: 'Việt Nam', year: 2026, palette: ['#402A72', '#E05C85', '#FFD986'], artworkLabel: 'Origami · chòm sao · giấy màu' },
  { id: 'mat-ma-bien-xanh', title: 'Mật Mã Biển Xanh', tagline: 'Dưới đáy biển, mọi tín hiệu đều có giá.', synopsis: 'Một kỹ sư âm thanh nhận được chuỗi tín hiệu lạ từ trạm nghiên cứu đã bỏ hoang và buộc phải lặn xuống trước khi cơn bão tới.', genres: ['Hành động', 'Tâm lý'], durationMinutes: 119, ageRating: 'T16', origin: 'Việt Nam', year: 2026, palette: ['#071C30', '#147E92', '#E0BB6A'], artworkLabel: 'Đại dương · sonar · trạm chìm' },
  { id: 'chuyen-tau-suong-ma', title: 'Chuyến Tàu Sương Mai', tagline: 'Một chuyến đi. Hai lá thư chưa gửi.', synopsis: 'Một phụ nữ trở lại quê trên chuyến tàu đầu ngày và gặp người giữ chiếc hộp thư thất lạc.', genres: ['Tình cảm', 'Tâm lý'], durationMinutes: 104, ageRating: 'T13', origin: 'Việt Nam', year: 2026, palette: ['#26354B', '#A97972', '#EAD4B0'], artworkLabel: 'Ga tàu · sương sớm · lá thư' },
  { id: 'dao-nguoc-thoi-gian', title: 'Đảo Ngược Thời Gian', tagline: 'Ngày hôm qua đang đợi ở phía trước.', synopsis: 'Ba người bạn tìm thấy chiếc đồng hồ chỉ chạy khi họ nói thật.', genres: ['Phiêu lưu', 'Hài'], durationMinutes: 107, ageRating: 'P', origin: 'Việt Nam', year: 2026, palette: ['#214A62', '#E5A853', '#F4E2B4'], artworkLabel: 'Đồng hồ · con hẻm · ánh chiều' },
  { id: 'khu-vuon-tren-mai', title: 'Khu Vườn Trên Mái', tagline: 'Hạt giống nhỏ kể chuyện thành phố lớn.', synopsis: 'Một cô bé và người hàng xóm trồng khu vườn trên mái nhà giữa mùa khô.', genres: ['Hoạt hình', 'Tình cảm'], durationMinutes: 89, ageRating: 'P', origin: 'Việt Nam', year: 2026, palette: ['#254D4A', '#78AA7D', '#F0D994'], artworkLabel: 'Mái nhà · lá non · bầu trời' },
  { id: 'dem-cuoi-o-hai-dang', title: 'Đêm Cuối Ở Hải Đăng', tagline: 'Ánh đèn tắt rồi ai sẽ tìm đường.', synopsis: 'Người gác đèn phải sửa hệ thống báo hiệu trước khi đoàn tàu vượt qua cơn bão.', genres: ['Tâm lý', 'Hành động'], durationMinutes: 116, ageRating: 'T16', origin: 'Việt Nam', year: 2026, palette: ['#102B45', '#C35758', '#F2D090'], artworkLabel: 'Hải đăng · mưa đêm · tín hiệu' },
  { id: 'phong-thu-nghiem-mat-trang', title: 'Phòng Thử Nghiệm Mặt Trăng', tagline: 'Mỗi phát minh cần một người tin.', synopsis: 'Nhóm học sinh dựng phòng thí nghiệm nhỏ để giải mã tín hiệu từ mô hình vệ tinh.', genres: ['Phiêu lưu', 'Hoạt hình'], durationMinutes: 95, ageRating: 'P', origin: 'Việt Nam', year: 2026, palette: ['#242B63', '#7775BC', '#E8D99F'], artworkLabel: 'Vệ tinh · sân trường · trăng sáng' },
  { id: 'bep-lua-cuoi-pho', title: 'Bếp Lửa Cuối Phố', tagline: 'Một bữa tối có thể đổi cả khu phố.', synopsis: 'Chủ quán cơm quyết định mở cửa miễn phí một đêm và nhận lại những câu chuyện bất ngờ.', genres: ['Hài', 'Tình cảm'], durationMinutes: 101, ageRating: 'P', origin: 'Việt Nam', year: 2026, palette: ['#5E352F', '#C88056', '#F5D9A7'], artworkLabel: 'Quán cơm · phố nhỏ · ánh bếp' },
  { id: 'vet-muc-tren-ban-do', title: 'Vết Mực Trên Bản Đồ', tagline: 'Bản đồ sai lại dẫn đúng đường.', synopsis: 'Một họa viên tìm thấy mật mã trong bản đồ cũ và cùng em trai truy dấu kho lưu trữ bị quên.', genres: ['Hành động', 'Phiêu lưu'], durationMinutes: 122, ageRating: 'T13', origin: 'Việt Nam', year: 2026, palette: ['#173B48', '#577F72', '#EAC78E'], artworkLabel: 'Bản đồ · mực xanh · kho sách' },
];

const buildShowtimes = (): Showtime[] => {
  const today = dateAfter(0); const tomorrow = dateAfter(1); const next = dateAfter(2);
  const specs: Array<[string, string, string, string, string, string, '2D' | '3D', number]> = [
    ['s1', 'mot-dem-o-ha-noi', 'hn-ho-guom', upcomingDate(today, '19:15'), '19:15', 'Lacquer 01', '2D', 85000],
    ['s2', 'duong-dua-tren-may', 'hn-ho-guom', upcomingDate(today, '20:10'), '20:10', 'Cobalt 02', '2D', 90000],
    ['s3', 'hanh-tinh-giay', 'hn-ho-guom', tomorrow, '10:00', 'Rose 03', '3D', 95000],
    ['s4', 'tiem-banh-ben-song', 'hn-ho-guom', tomorrow, '16:20', 'Lacquer 01', '2D', 75000],
    ['s5', 'mat-ma-bien-xanh', 'hn-ho-guom', next, '21:00', 'Cobalt 02', '2D', 90000],
    ['s6', 'mot-dem-o-ha-noi', 'hcm-ben-thanh', upcomingDate(today, '18:45'), '18:45', 'Saigon 01', '2D', 90000],
    ['s7', 'tiem-banh-ben-song', 'hcm-ben-thanh', tomorrow, '16:20', 'Saigon 02', '2D', 80000],
    ['s8', 'duong-dua-tren-may', 'hcm-ben-thanh', next, '20:30', 'Saigon 01', '3D', 110000],
    ['s9', 'hanh-tinh-giay', 'dn-song-han', upcomingDate(today, '18:10'), '18:10', 'Han River 01', '2D', 70000],
    ['s10', 'mat-ma-bien-xanh', 'dn-song-han', tomorrow, '20:40', 'Han River 02', '2D', 80000],
    ['s11', 'chuyen-tau-suong-ma', 'hn-ho-guom', dateAfter(3), '18:20', 'Lacquer 01', '2D', 85000],
    ['s12', 'dao-nguoc-thoi-gian', 'hn-ho-guom', dateAfter(3), '20:30', 'Cobalt 02', '2D', 85000],
    ['s13', 'khu-vuon-tren-mai', 'hcm-ben-thanh', dateAfter(4), '10:00', 'Saigon 01', '2D', 75000],
    ['s14', 'dem-cuoi-o-hai-dang', 'hcm-ben-thanh', dateAfter(4), '20:00', 'Saigon 02', '2D', 90000],
    ['s15', 'phong-thu-nghiem-mat-trang', 'dn-song-han', dateAfter(5), '10:00', 'Han River 01', '2D', 70000],
    ['s16', 'bep-lua-cuoi-pho', 'dn-song-han', dateAfter(5), '18:10', 'Han River 02', '2D', 75000],
    ['s17', 'vet-muc-tren-ban-do', 'hn-ho-guom', dateAfter(6), '20:10', 'Cobalt 02', '2D', 90000],
  ];
  return specs.map(([id, movieId, cinemaId, date, time, room, format, basePrice]) => ({ id, movieId, cinemaId, startsAt: atTime(date, time), room, format, basePrice }));
};

interface StoredOperations { added: Showtime[]; cancelled: Array<{ id: string; startsAt: string }> }
const readOperations = (): StoredOperations => {
  try {
    const value = JSON.parse(window.localStorage.getItem(OPERATIONS_KEY) ?? '{}') as Partial<StoredOperations>;
    return { added: Array.isArray(value.added) ? value.added : [], cancelled: Array.isArray(value.cancelled) ? value.cancelled : [] };
  } catch { return { added: [], cancelled: [] }; }
};
const writeOperations = (value: StoredOperations) => window.localStorage.setItem(OPERATIONS_KEY, JSON.stringify(value));
const allDemoShowtimes = () => [...buildShowtimes(), ...readOperations().added];
const activeDemoShowtimes = () => {
  const { cancelled } = readOperations();
  return allDemoShowtimes().filter((showtime) => !cancelled.some((item) => item.id === showtime.id && item.startsAt === showtime.startsAt));
};

const readBookings = (): Booking[] => {
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as Booking[]; } catch { return []; }
};
const writeBookings = (bookings: Booking[]) => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
const readShowSnapshots = (): Record<string, Showtime> => {
  try { return JSON.parse(window.localStorage.getItem(SHOW_SNAPSHOTS_KEY) ?? '{}') as Record<string, Showtime>; } catch { return {}; }
};
const bookingMatchesShowtime = (booking: Booking, showtime: Showtime, snapshots = readShowSnapshots()) => {
  const snapshot = snapshots[booking.id];
  return booking.showtimeId === showtime.id && (!snapshot || snapshot.startsAt === showtime.startsAt);
};
const expireBookings = (bookings: Booking[]) => bookings.map((booking) => booking.status === 'HELD' && !isActiveHold(booking) ? { ...booking, status: 'EXPIRED' as const } : booking);
const updateBooking = (id: string, update: (booking: Booking) => Booking) => {
  const bookings = expireBookings(readBookings());
  const index = bookings.findIndex((booking) => booking.id === id);
  if (index < 0 || !bookings[index]) throw new Error('Không tìm thấy đơn đặt vé.');
  bookings[index] = update(bookings[index]); writeBookings(bookings); return bookings[index];
};

export class DemoCinemaGateway implements CinemaGateway, OperationsGateway {
  async listMovies() { await delay(); return movies; }
  async listCinemas() { await delay(80); return cinemas; }
  async listShowtimes(cinemaId?: string, date?: string) {
    await delay(120); return activeDemoShowtimes().filter((showtime) => new Date(showtime.startsAt).getTime() > Date.now() && (!cinemaId || showtime.cinemaId === cinemaId) && (!date || localDateKey(new Date(showtime.startsAt)) === date));
  }
  async getShowtime(showtimeId: string, bookingId?: string) { await delay(80); const snapshot = bookingId ? readShowSnapshots()[bookingId] : undefined; return (snapshot?.id === showtimeId ? snapshot : undefined) ?? activeDemoShowtimes().find((item) => item.id === showtimeId) ?? null; }
  async listSeats(showtimeId: string) {
    await delay();
    const showtime = activeDemoShowtimes().find((item) => item.id === showtimeId);
    if (!showtime) throw new Error('Suất chiếu demo không còn mở bán. Vui lòng chọn suất khác.');
    const snapshots = readShowSnapshots();
    const active = expireBookings(readBookings()).filter((booking) => bookingMatchesShowtime(booking, showtime, snapshots) && (booking.status === 'HELD' || booking.status === 'CONFIRMED'));
    const held = new Map(active.flatMap((booking) => booking.items.map((item) => [item.seatId, booking.status === 'CONFIRMED' ? 'SOLD' : 'HELD'] as const)));
    return Array.from({ length: 56 }, (_, index): Seat => {
      const rowIndex = Math.floor(index / 8); const row = String.fromCharCode(65 + rowIndex); const number = index % 8 + 1;
      const kind = rowIndex >= 4 ? 'VIP' : 'STANDARD';
      return { id: `${row}${number}`, row, number, kind, status: held.get(`${row}${number}`) ?? ((index === 10 || index === 37) ? 'SOLD' : 'AVAILABLE'), price: showtime.basePrice + (kind === 'VIP' ? 25_000 : 0) };
    });
  }
  async holdSeats(showtimeId: string, seatIds: string[]) {
    await delay(320);
    if (seatIds.length < 1 || seatIds.length > 8) throw new Error('Vui lòng chọn từ 1 đến 8 ghế.');
    const bookings = expireBookings(readBookings());
    if (bookings.some((booking) => isActiveHold(booking))) throw new Error('Tài khoản demo đang có một đơn giữ chỗ. Hãy hoàn tất hoặc hủy đơn đó trước.');
    const seats = await this.listSeats(showtimeId);
    const selected = seatIds.map((id) => seats.find((seat) => seat.id === id));
    if (selected.some((seat) => !seat || seat.status !== 'AVAILABLE')) throw new Error('Một hoặc nhiều ghế vừa được người khác chọn. Sơ đồ đã được cập nhật.');
    const now = new Date(); const showtime = activeDemoShowtimes().find((item) => item.id === showtimeId);
    if (!showtime) throw new Error('Suất chiếu không tồn tại.');
    const expiresAt = new Date(Math.min(now.getTime() + 5 * 60_000, new Date(showtime.startsAt).getTime()));
    const id = crypto.randomUUID();
    const booking: Booking = { id, reference: `CV${now.getFullYear()}${Math.random().toString(36).slice(2, 7).toUpperCase()}`, showtimeId, items: selected.map((seat) => ({ seatId: seat!.id, seatLabel: seat!.id, price: seat!.price })), status: 'HELD', expiresAt: expiresAt.toISOString(), total: selected.reduce((sum, seat) => sum + seat!.price, 0), createdAt: now.toISOString() };
    writeBookings([...bookings, booking]); window.localStorage.setItem(SHOW_SNAPSHOTS_KEY, JSON.stringify({ ...readShowSnapshots(), [booking.id]: showtime })); return booking;
  }
  async confirmDemoPayment(bookingId: string, outcome: 'SUCCESS' | 'FAILED') {
    await delay(650);
    return updateBooking(bookingId, (booking) => {
      if (!isActiveHold(booking)) throw new Error('Thời gian giữ ghế đã hết. Không có khoản thanh toán nào được thực hiện.');
      if (outcome === 'FAILED') throw new Error('Thanh toán mô phỏng thất bại. Ghế vẫn được giữ nếu đồng hồ còn thời gian.');
      return { ...booking, status: 'CONFIRMED', items: booking.items.map((item) => ({ ...item, ticketToken: crypto.randomUUID() })) };
    });
  }
  async cancelBooking(bookingId: string) { await delay(); return updateBooking(bookingId, (booking) => booking.status === 'HELD' ? { ...booking, status: 'CANCELLED' } : booking); }
  async getBooking(bookingId: string) { await delay(); const bookings = expireBookings(readBookings()); writeBookings(bookings); return bookings.find((booking) => booking.id === bookingId) ?? null; }
  async listBookings() { await delay(); const bookings = expireBookings(readBookings()); writeBookings(bookings); return bookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  async recommend(cinemaId: string, date: string, preferredGenres: Genre[]): Promise<Recommendation[]> {
    await delay(300); const shows = await this.listShowtimes(cinemaId, date);
    const seatMaps = await Promise.all(shows.map((show) => this.listSeats(show.id)));
    const availableShows = shows.filter((_, index) => seatMaps[index]?.some((seat) => seat.status === 'AVAILABLE'));
    const confirmed = expireBookings(readBookings()).filter((booking) => booking.status === 'CONFIRMED');
    const snapshots = readShowSnapshots();
    const distinctMovieIds = [...new Set(confirmed.map((booking) => (snapshots[booking.id] ?? allDemoShowtimes().find((show) => show.id === booking.showtimeId))?.movieId).filter((id): id is string => Boolean(id)))];
    const historyMovies = distinctMovieIds.map((id) => movies.find((movie) => movie.id === id)?.genres).filter((genres): genres is Genre[] => Boolean(genres));
    return rankRecommendations(movies, availableShows, preferredGenres, { 'mot-dem-o-ha-noi': 38, 'duong-dua-tren-may': 44, 'tiem-banh-ben-song': 26, 'hanh-tinh-giay': 51, 'mat-ma-bien-xanh': 31 }, historyMovies);
  }

  async listManagedShowtimes(): Promise<ManagedShowtime[]> {
    await delay(100);
    const { cancelled } = readOperations();
    const bookings = expireBookings(readBookings());
    const snapshots = readShowSnapshots();
    return allDemoShowtimes()
      .filter((showtime) => new Date(showtime.startsAt).getTime() > Date.now())
      .map((showtime) => ({
        showtime,
        status: cancelled.some((item) => item.id === showtime.id && item.startsAt === showtime.startsAt) ? 'CANCELLED' as const : 'ACTIVE' as const,
        bookingCount: bookings.filter((booking) => bookingMatchesShowtime(booking, showtime, snapshots) && (booking.status === 'HELD' || booking.status === 'CONFIRMED')).length,
      }))
      .sort((a, b) => a.showtime.startsAt.localeCompare(b.showtime.startsAt));
  }

  async listRooms(cinemaId: string): Promise<string[]> {
    await delay(60);
    return [...new Set(allDemoShowtimes().filter((showtime) => showtime.cinemaId === cinemaId).map((showtime) => showtime.room))].sort();
  }

  async createShowtime(input: CreateShowtimeInput): Promise<Showtime> {
    await delay(180);
    if (!cinemas.some((cinema) => cinema.id === input.cinemaId)) throw new Error('Rạp chiếu không tồn tại.');
    const rooms = await this.listRooms(input.cinemaId);
    const problem = validateNewShowtime(input, movies, rooms, activeDemoShowtimes());
    if (problem) throw new Error(problem);
    const showtime: Showtime = { ...input, id: crypto.randomUUID() };
    const state = readOperations();
    writeOperations({ ...state, added: [...state.added, showtime] });
    return showtime;
  }

  async cancelShowtime(showtimeId: string): Promise<void> {
    await delay(150);
    const showtime = allDemoShowtimes().find((item) => item.id === showtimeId);
    if (!showtime) throw new Error('Suất chiếu không tồn tại.');
    const state = readOperations();
    const status = state.cancelled.some((item) => item.id === showtime.id && item.startsAt === showtime.startsAt) ? 'CANCELLED' : 'ACTIVE';
    const snapshots = readShowSnapshots();
    const problem = canCancelShowtime(showtime, status, expireBookings(readBookings()).filter((booking) => bookingMatchesShowtime(booking, showtime, snapshots)));
    if (problem) throw new Error(problem);
    writeOperations({ ...state, cancelled: [...state.cancelled, { id: showtime.id, startsAt: showtime.startsAt }] });
  }
}
