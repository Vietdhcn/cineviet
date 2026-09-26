alter table movies add column source_classification text not null default 'SYNTHETIC'
  check (source_classification in ('SYNTHETIC', 'BETA_REFERENCE'));
alter table movies add column verified_at timestamptz;
alter table movies add column poster_path text;

update movies set source_key = 'demo-' || slug
where source_key is null and id in (
  '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000005'
);

alter table movies add constraint reference_movies_stay_draft
  check (source_classification <> 'BETA_REFERENCE' or visibility <> 'PUBLISHED');

insert into movies(id,source_key,slug,title,tagline,synopsis,genres,duration_minutes,release_date,age_rating,origin,visibility,rights_note,palette,artwork_label) values
('20000000-0000-0000-0000-000000000006','demo-chuyen-tau-suong-ma','chuyen-tau-suong-ma','Chuyến Tàu Sương Mai','Một chuyến đi. Hai lá thư chưa gửi.','Một phụ nữ trở lại quê trên chuyến tàu đầu ngày và gặp người giữ chiếc hộp thư thất lạc.',array['Tình cảm','Tâm lý'],104,'2026-09-06','T13','Việt Nam','PUBLISHED','Synthetic DEMO; authored for CineViet',array['#26354B','#A97972','#EAD4B0'],'Ga tàu · sương sớm · lá thư'),
('20000000-0000-0000-0000-000000000007','demo-dao-nguoc-thoi-gian','dao-nguoc-thoi-gian','Đảo Ngược Thời Gian','Ngày hôm qua đang đợi ở phía trước.','Ba người bạn tìm thấy chiếc đồng hồ chỉ chạy khi họ nói thật.',array['Phiêu lưu','Hài'],107,'2026-09-07','P','Việt Nam','PUBLISHED','Synthetic DEMO; authored for CineViet',array['#214A62','#E5A853','#F4E2B4'],'Đồng hồ · con hẻm · ánh chiều'),
('20000000-0000-0000-0000-000000000008','demo-khu-vuon-tren-mai','khu-vuon-tren-mai','Khu Vườn Trên Mái','Hạt giống nhỏ kể chuyện thành phố lớn.','Một cô bé và người hàng xóm trồng khu vườn trên mái nhà giữa mùa khô.',array['Hoạt hình','Tình cảm'],89,'2026-09-08','P','Việt Nam','PUBLISHED','Synthetic DEMO; authored for CineViet',array['#254D4A','#78AA7D','#F0D994'],'Mái nhà · lá non · bầu trời'),
('20000000-0000-0000-0000-000000000009','demo-dem-cuoi-o-hai-dang','dem-cuoi-o-hai-dang','Đêm Cuối Ở Hải Đăng','Ánh đèn tắt rồi ai sẽ tìm đường.','Người gác đèn phải sửa hệ thống báo hiệu trước khi đoàn tàu vượt qua cơn bão.',array['Tâm lý','Hành động'],116,'2026-09-09','T16','Việt Nam','PUBLISHED','Synthetic DEMO; authored for CineViet',array['#102B45','#C35758','#F2D090'],'Hải đăng · mưa đêm · tín hiệu'),
('20000000-0000-0000-0000-000000000010','demo-phong-thu-nghiem-mat-trang','phong-thu-nghiem-mat-trang','Phòng Thử Nghiệm Mặt Trăng','Mỗi phát minh cần một người tin.','Nhóm học sinh dựng phòng thí nghiệm nhỏ để giải mã tín hiệu từ mô hình vệ tinh.',array['Phiêu lưu','Hoạt hình'],95,'2026-09-10','P','Việt Nam','PUBLISHED','Synthetic DEMO; authored for CineViet',array['#242B63','#7775BC','#E8D99F'],'Vệ tinh · sân trường · trăng sáng'),
('20000000-0000-0000-0000-000000000011','demo-bep-lua-cuoi-pho','bep-lua-cuoi-pho','Bếp Lửa Cuối Phố','Một bữa tối có thể đổi cả khu phố.','Chủ quán cơm quyết định mở cửa miễn phí một đêm và nhận lại những câu chuyện bất ngờ.',array['Hài','Tình cảm'],101,'2026-09-11','P','Việt Nam','PUBLISHED','Synthetic DEMO; authored for CineViet',array['#5E352F','#C88056','#F5D9A7'],'Quán cơm · phố nhỏ · ánh bếp'),
('20000000-0000-0000-0000-000000000012','demo-vet-muc-tren-ban-do','vet-muc-tren-ban-do','Vết Mực Trên Bản Đồ','Bản đồ sai lại dẫn đúng đường.','Một họa viên tìm thấy mật mã trong bản đồ cũ và cùng em trai truy dấu kho lưu trữ bị quên.',array['Hành động','Phiêu lưu'],122,'2026-09-12','T13','Việt Nam','PUBLISHED','Synthetic DEMO; authored for CineViet',array['#173B48','#577F72','#EAC78E'],'Bản đồ · mực xanh · kho sách');
