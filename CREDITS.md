# Ghi Công & Bản Quyền Tài Nguyên (Credits & Attribution)

## 1. Bộ Giao Diện Sách Cổ ("Cuốn Sổ Hội Làng")

- **Tên gói:** Complete UI Book Styles Pack Free v1.0 ("TravelBook Lite")
- **Tác giả:** Crusenho Agus Hennihuno
- **Trang tác giả:** https://crusenho.itch.io
- **Trang sản phẩm:** https://crusenho.itch.io/complete-ui-book-styles-pack
- **Nguồn kho lưu trữ kiểm kê:** `https://github.com/levantuannnn/codejs.git` (commit `468289d`)
- **Thay đổi đã thực hiện (Indicated Modifications):**
  - Giữ nguyên bản gốc không chỉnh sửa tại `/third_party/codejs/`.
  - Tạo các bản biến thể điều chỉnh bảng màu theo mỹ thuật dân gian Việt Nam (bìa son đỏ `#B3261E`, nền giấy dó `#F3E8CF`, thanh tre xanh `#4F6F3A`, gỗ sẫm `#362116`, vàng nghệ `#E0A526`) lưu riêng tại `/public/assets/ui/variants/`.
  - Vẽ bổ sung các biểu tượng kỹ năng, buff/debuff, thí sinh nón lá, cá sấu, ấn triện đỏ, cờ hội ngũ sắc và họa tiết Đông Hồ cùng mật độ pixel (`16×16`, `24×24`, `32×32`) tại `/public/assets/ui/custom/`.
- **Lưu ý bản quyền quan trọng (License Restriction):**
  - Theo giấy phép của Crusenho: được phép sử dụng và chỉnh sửa trong dự án cá nhân hoặc thương mại, **KHÔNG được bán lại hoặc xuất bản lại chính tệp tài nguyên gốc hay bản chỉnh sửa như một gói tài nguyên độc lập**, và không dùng cho NFT. Trước khi công khai mã nguồn repository lên mạng, cần xác nhận việc tách hoặc giữ tài nguyên trong thư mục phân phối theo đúng điều khoản này.

## 2. Bộ Kiểm Soát Tham Chiếu (Không Đưa Vào Giao Diện Game)

- **Tên gói:** Pixel UI HUD: Fantasy RPG Kit – FREE Demo
- **Tác giả:** indigolay (https://indigolay.itch.io/pixel-hud-ui)
- **Giấy phép:** Miễn phí cho mục đích cá nhân & thương mại (`ReadMe.txt`).
- **Trạng thái sử dụng:** Chỉ dùng đối chiếu mật độ pixel trong `/tools/ui-preview.html`; không dùng trong giao diện chính do khác tỉ lệ điểm ảnh với bộ TravelBook Lite.

## 3. Tài Nguyên 3D & Phông Chữ

- **Phông chữ Việt hóa:** `@fontsource/vt323` (kiểm thử bảng ký tự), `@fontsource/be-vietnam-pro` & `@fontsource/noto-serif` (OFL).
- **Âm thanh:** Tổng hợp thời gian thực bằng Web Audio API (`src/game/AudioManager.ts`).
- **Mô hình cây cỏ 3D:** Quaternius CC0 1.0 (qua kho `codejeam`).

## 4. Texture PBR & Vòm Trời (Poly Haven CC0 / Procedural Stylized)

- **Nguồn chuẩn bị tích hợp:** Poly Haven (`https://polyhaven.com`), giấy phép **CC0 1.0** (tự do sử dụng thương mại, chỉnh sửa, phân phối lại; ghi công như một nghĩa cử đẹp).
- **Tác giả ứng viên đã xác minh trang:** Sergej Majboroda (`evening_field`), Greg Zaal (`kloofendal_48d_partly_cloudy`), cùng các tác giả tương ứng trong `SOURCE.txt` khi nạp vào `polyhaven/`.
- **Trạng thái hiện tại:** Đang dùng hệ thống **Procedural Stylized PBR (`MaterialLibrary.ts`) + Terrain Splat Shader + Sky Dome & PMREM IBL (`SkyAtmosphereManager.ts`)** đồng bộ màu dân gian Việt Nam (mái ngói, tre làng, nước ao, đêm lễ hội); sẵn sàng nâng cấp trực tiếp qua `tools/process_polyhaven.mjs`.

