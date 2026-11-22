# CREDITS & LICENSE — CÁ SẤU LÊN BỜ – SURVIVAL ARENA

## 1. Tài nguyên môi trường 3D (Repo nguồn duy nhất)
- **Nguồn:** `https://github.com/Tbeat-dev/codejeam.git` (commit `39b3cf7`)
- **Bộ tài nguyên gốc:** Quaternius — *Stylized Nature MegaKit* (Phiên bản FREE: 68/116 models)
- **Tác giả:** [@Quaternius](https://quaternius.com)
- **License:** CC0 1.0 Universal (Public Domain Dedication) — `https://creativecommons.org/publicdomain/zero/1.0/`
- **Tệp license gốc:** `/third_party/codejeam/License_Standard.txt`
- **Ghi chú xử lý:** Chỉ trích xuất 68 model từ thư mục `glTF/`, đóng gói `.gltf + .bin` thành `.glb` đặt tên `snake_case` tại `/public/assets/models/nature/`, và nén/giảm kích thước texture vỏ cây (`Bark_*`) từ `2048×2048` xuống `1024×1024` tại `/public/assets/textures/nature/`.

## 2. Tài nguyên chưa xác minh bản quyền (KHÔNG tích hợp bản chính thức)
- **Tệp:** `Imp.glb` (9.0 MB), `Puglin.glb` (7.5 MB) nằm ở thư mục gốc của repo `codejeam`.
- **Trạng thái license:** **CHƯA XÁC MINH** — Không nằm trong `License_Standard.txt` của Quaternius và không có README/CREDITS riêng.
- **Quyết định theo mục 3.2 & 3.5.1:** Không đưa vào bản build chính thức của game; giữ nguyên chỉ đọc trong `/third_party/codejeam/` làm tham chiếu rig 55 xương chuẩn cho đến khi người dùng xác nhận nguồn và license hợp lệ.

## 3. Tài nguyên tự dựng bằng mã (Procedural / Code-Authored)
- **Nhân vật thí sinh (12 biến thể):** Dựng bằng Three.js procedural composite geometry với rig 55 xương chuẩn (tên xương tương thích `root`, `pelvis`, `spine_01..03`, `neck_01`, `Head`, `clavicle/upperarm/lowerarm/hand`, `thigh/calf/foot/ball`) và hoạt ảnh procedural.
- **Cá sấu (`croc.main`):** Dựng bằng mã đa bộ phận (đầu + hàm trên/dưới, thân có vảy lưng, đuôi 4 đốt, 4 chân khớp) + texture da cá sấu procedural (`CanvasTexture`) + hoạt ảnh bơi/đi/đớp procedural.
- **Kiến trúc & Đạo cụ làng quê Việt Nam:** Đình làng cách điệu, cổng làng, cầu gỗ bắc qua ao, bục nổi/bục gỗ, lũy tre (instancing), đèn lồng hội làng, bảng hiệu, khán đài, mặt nước shader/procedural.
- **Âm thanh (AudioManager):** Tổng hợp 100% bằng Web Audio API (tiếng trống hội, chiêng, nước bắn, bước chân, đếm ngược, hiệu lệnh, âm thanh kỹ năng).
- **Giao diện & Font:** Hệ thống UI phong cách tranh Đông Hồ / giấy dó / khung gỗ (CSS + SVG inline). Font chữ: `Be Vietnam Pro` & `Noto Serif` (hỗ trợ đầy đủ dấu tiếng Việt) với fallback hệ thống an toàn.
