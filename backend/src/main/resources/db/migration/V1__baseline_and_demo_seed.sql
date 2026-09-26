create extension if not exists pgcrypto;

create table accounts (
  id uuid primary key,
  email text not null unique,
  password_hash text not null,
  preferred_genres text[] not null default '{}',
  created_at timestamptz not null default clock_timestamp()
);

create table movies (
  id uuid primary key,
  slug text not null unique,
  source_key text unique,
  title text not null,
  tagline text not null,
  synopsis text not null,
  genres text[] not null check (cardinality(genres)>0),
  duration_minutes int not null check (duration_minutes between 1 and 600),
  release_date date not null,
  age_rating text not null,
  origin text not null,
  visibility text not null check (visibility in ('DRAFT','PUBLISHED','HIDDEN')),
  source_url text,
  source_checked_at timestamptz,
  rights_note text not null,
  palette text[] not null check (cardinality(palette)=3),
  artwork_label text not null,
  featured boolean not null default false
);

create table cinemas (id uuid primary key, name text not null, address text not null, city text not null, active boolean not null default true);
create table seats (id uuid primary key, cinema_id uuid not null references cinemas, room_name text not null, row_label text not null, seat_number int not null, kind text not null check(kind in ('STANDARD','VIP')), unique(cinema_id,room_name,row_label,seat_number));
create table showtimes (id uuid primary key, movie_id uuid not null references movies, cinema_id uuid not null references cinemas, starts_at timestamptz not null, room_name text not null, format text not null check(format in ('2D','3D')), base_price numeric(12,2) not null check(base_price>=0));
create table bookings (id uuid primary key, account_id uuid not null references accounts, showtime_id uuid not null references showtimes, reference text not null unique, status text not null check(status in ('HELD','CONFIRMED','CANCELLED','EXPIRED')), expires_at timestamptz not null, created_at timestamptz not null, confirmed_at timestamptz);
create unique index one_active_held_per_account on bookings(account_id) where status='HELD';
create table showtime_seats (showtime_id uuid not null references showtimes, seat_id uuid not null references seats, status text not null check(status in ('AVAILABLE','HELD','SOLD')), owner_booking_id uuid references bookings, price numeric(12,2) not null check(price>=0), primary key(showtime_id,seat_id), check((status='AVAILABLE' and owner_booking_id is null) or (status in ('HELD','SOLD') and owner_booking_id is not null)));
create table booking_items (id uuid primary key, booking_id uuid not null references bookings, seat_id uuid not null references seats, unit_price numeric(12,2) not null check(unit_price>=0), unique(booking_id,seat_id));
create table payment_attempts (id uuid primary key, booking_id uuid not null references bookings, provider text not null, provider_txn_id text not null unique, outcome text not null check(outcome in ('PENDING','SUCCESS','FAILED')), resolution text not null check(resolution in ('NONE','REFUND_REQUIRED','REFUNDED')), amount numeric(12,2) not null check(amount>=0), created_at timestamptz not null);
create table tickets (id uuid primary key, booking_item_id uuid not null unique references booking_items, token uuid not null unique, issued_at timestamptz not null);
create table idempotency_records (account_id uuid not null references accounts, endpoint text not null, idempotency_key text not null, request_hash text not null, booking_id uuid not null references bookings, created_at timestamptz not null, primary key(account_id,endpoint,idempotency_key));

insert into accounts(id,email,password_hash,preferred_genres) values ('00000000-0000-0000-0000-000000000001','demo@cineviet.local','DEMO-NOT-A-REAL-PASSWORD',array['Tâm lý','Phiêu lưu']);
insert into cinemas(id,name,address,city) values
('10000000-0000-0000-0000-000000000001','CineViet Hồ Gươm','25 Tràng Tiền, Hoàn Kiếm','Hà Nội'),
('10000000-0000-0000-0000-000000000002','CineViet Bến Thành','42 Lê Lợi, Quận 1','TP. Hồ Chí Minh'),
('10000000-0000-0000-0000-000000000003','CineViet Sông Hàn','18 Bạch Đằng, Hải Châu','Đà Nẵng');

insert into movies(id,slug,title,tagline,synopsis,genres,duration_minutes,release_date,age_rating,origin,visibility,rights_note,palette,artwork_label,featured) values
('20000000-0000-0000-0000-000000000001','mot-dem-o-ha-noi','Một Đêm Ở Hà Nội','Thành phố giữ bí mật. Đêm nay, nó kể lại.','Một nữ kiến trúc sư đi qua những con phố quen để tìm bản vẽ cuối cùng cha cô để lại.',array['Tâm lý','Tình cảm'],112,'2026-09-01','T13','Việt Nam','PUBLISHED','DEMO synthetic; no external poster rights claimed',array['#111A3D','#D84D5E','#F2CB83'],'Đêm xanh · mái ngói · ánh cửa sổ',true),
('20000000-0000-0000-0000-000000000002','duong-dua-tren-may','Đường Đua Trên Mây','Không có đường tắt ở độ cao 3.000 mét.','Một đội cứu hộ nghiệp dư băng qua đèo mây trong cuộc đua với thời tiết.',array['Hành động','Phiêu lưu'],126,'2026-09-02','T16','Việt Nam','PUBLISHED','DEMO synthetic; no external poster rights claimed',array['#0A3447','#4E92A3','#F0C77A'],'Đèo mây · đèn xe · bình minh',false),
('20000000-0000-0000-0000-000000000003','tiem-banh-ben-song','Tiệm Bánh Bên Sông','Công thức cũ. Một gia đình mới.','Ba chị em trở về quê để bán tiệm bánh của mẹ và thử mở cửa thêm đúng bảy ngày.',array['Hài','Tình cảm'],98,'2026-09-03','P','Việt Nam','PUBLISHED','DEMO synthetic; no external poster rights claimed',array['#70423C','#E7A262','#F5E4C6'],'Lò bánh · mặt sông · nắng sớm',false),
('20000000-0000-0000-0000-000000000004','hanh-tinh-giay','Hành Tinh Giấy','Gấp một cánh cửa. Mở cả vũ trụ.','Cậu bé An phát hiện những mô hình giấy của bà có thể mở lối tới một hành tinh.',array['Hoạt hình','Phiêu lưu'],91,'2026-09-04','P','Việt Nam','PUBLISHED','DEMO synthetic; no external poster rights claimed',array['#402A72','#E05C85','#FFD986'],'Origami · chòm sao · giấy màu',false),
('20000000-0000-0000-0000-000000000005','mat-ma-bien-xanh','Mật Mã Biển Xanh','Dưới đáy biển, mọi tín hiệu đều có giá.','Một kỹ sư âm thanh nhận chuỗi tín hiệu lạ từ trạm nghiên cứu đã bỏ hoang.',array['Hành động','Tâm lý'],119,'2026-09-05','T16','Việt Nam','PUBLISHED','DEMO synthetic; no external poster rights claimed',array['#071C30','#147E92','#E0BB6A'],'Đại dương · sonar · trạm chìm',false);

insert into seats(id,cinema_id,room_name,row_label,seat_number,kind)
select gen_random_uuid(), c.id, r.room_name, chr(64+row_no), seat_no, case when row_no>=5 then 'VIP' else 'STANDARD' end
from cinemas c cross join (values ('Lacquer 01'),('Cobalt 02')) r(room_name) cross join generate_series(1,7) row_no cross join generate_series(1,8) seat_no;

insert into showtimes(id,movie_id,cinema_id,starts_at,room_name,format,base_price) values
('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',clock_timestamp()+interval '2 hours','Lacquer 01','2D',85000),
('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001',clock_timestamp()+interval '4 hours','Cobalt 02','2D',90000),
('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001',clock_timestamp()+interval '1 day 2 hours','Lacquer 01','3D',95000),
('30000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002',clock_timestamp()+interval '3 hours','Lacquer 01','2D',80000),
('30000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000003',clock_timestamp()+interval '1 day 4 hours','Cobalt 02','2D',80000);

insert into showtime_seats(showtime_id,seat_id,status,price)
select sh.id,se.id,'AVAILABLE',sh.base_price + case when se.kind='VIP' then 25000 else 0 end
from showtimes sh join seats se on se.cinema_id=sh.cinema_id and se.room_name=sh.room_name;
