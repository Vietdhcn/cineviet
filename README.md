# CineViet

CineViet đang được phát triển trên máy cá nhân, **chưa mở bán và không nhận thanh toán**. GitHub Pages đã được hủy xuất bản; repository [Vietdhcn/cineviet](https://github.com/Vietdhcn/cineviet) chỉ lưu mã nguồn. Xem [plan.html](plan.html) để biết phần đã kiểm và phần còn thiếu.

## Trạng thái hiện tại

- Frontend chỉ gọi Java API; không có dữ liệu đặt vé trong localStorage, phiên khách ẩn danh, thanh toán giả hoặc vé QR giả.
- Backend dùng phiên tài khoản và PostgreSQL. Có đăng ký/đăng nhập/đăng xuất, thu hồi mọi phiên, giữ và hủy chỗ. Chưa xác minh email/khôi phục mật khẩu; không đưa backend ra Internet.
- Flyway V1/V2 là migration lịch sử không thể sửa checksum. V5 ẩn dữ liệu hư cấu; V6 xóa các hàng seed không có đơn hoặc ghế bị chiếm tham chiếu, giữ các hàng còn liên quan lịch sử. Đường nhập lại CSV hư cấu đã bị xóa. Danh mục hiện trống cho tới khi có dữ liệu được cấp quyền.
- Thanh toán để sau. Không có khoản thu hoặc vé hợp lệ được tạo từ bản này.

## Chạy cục bộ

Cần Docker Compose v2, hoặc Java 21, PostgreSQL và Node.js 22.12+ cài riêng. Cách dự kiến với Compose (chưa nghiệm thu trên máy này):

```powershell
Copy-Item infra/.env.example infra/.env
# Đặt mật khẩu PostgreSQL riêng, mạnh, trong infra/.env.
docker compose --env-file infra/.env -f infra/compose.yaml up --build
```

Mở `http://127.0.0.1:8088`. Compose chỉ bind cổng vào `127.0.0.1`; không chuyển tiếp cổng ra Internet. Dừng mà không xóa dữ liệu:

```powershell
docker compose --env-file infra/.env -f infra/compose.yaml down
```

Nếu chạy frontend riêng, vào `frontend/`, dùng `npm ci` rồi `npm run dev`. Proxy `/api` cần backend đang chạy ở cổng 8080. Không có backend, giao diện hiển thị lỗi kết nối; không tự tạo dữ liệu.

## Kiểm thử

```powershell
cd frontend
npm ci
npm run lint
npm test
npm run build
cd ../backend
mvn clean package
```

Các bài `tests/integration/no-demo-endpoints.test.mjs` cần backend cục bộ ở `127.0.0.1:18080` (hoặc `CINEVIET_API_URL`). Bài `tests/integration/no-seed-data.test.mjs` chỉ được chạy với PostgreSQL **cách ly**, tên database dạng `cineviet_*_check`, và `CINEVIET_PSQL_BIN` trỏ tới `psql`. Không chạy migration dọn seed trên dữ liệu thật khi chưa sao lưu/xem xét tham chiếu lịch sử.

## Cần cung cấp để làm phần thật tiếp theo

Đơn vị vận hành/rạp, người có quyền cấp phép, phim/rạp/phòng/sơ đồ ghế/lịch/giá có nguồn xác minh và quyền dùng hình ảnh, người duyệt công bố, cùng chính sách giữ/hủy chỗ. Máy cá nhân dùng được cho phát triển và kiểm thử nội bộ; dịch vụ Internet cần hạ tầng an toàn và vận hành liên tục. **Chưa cần tài khoản thanh toán.**
