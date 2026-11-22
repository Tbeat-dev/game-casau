# ASSET MAPPING — CÁ SẤU LÊN BỜ – SURVIVAL ARENA

Quy tắc trạng thái:
- **FOUND**: Dùng trực tiếp từ repo `codejeam` (CC0 1.0).
- **PARTIAL**: Dùng được từ repo nhưng cần tối ưu texture, đổi màu/material hoặc tái sử dụng có biến thể.
- **MISSING**: Repo không có → xử lý bằng `asset tạm do mã tạo` sau lớp trừu tượng `src/assets/AssetRegistry.ts`.

| Yêu cầu game | ID Logic (`AssetRegistry`) | File trong repo | Trạng thái | Ghi chú & Phương án xử lý |
|---|---|---|---|---|
| Cây xanh làng quê (×5 dáng) | `env.tree.common_1..5` | `glTF/CommonTree_1..5.gltf` | PARTIAL | Đóng gói `.glb`, giảm `Bark_NormalTree.png` 2048² → 1024²; biến thể scale/góc xoay |
| Cây cổ thụ uốn lượn (×5) | `env.tree.twisted_1..5` | `glTF/TwistedTree_1..5.gltf` | PARTIAL | Đóng gói `.glb`, giảm `Bark_TwistedTree.png` 2048² → 1024² |
| Cây khô rìa đầm (×5) | `env.tree.dead_1..5` | `glTF/DeadTree_1..5.gltf` | PARTIAL | Đóng gói `.glb`, giảm `Bark_DeadTree.png` 2048² → 1024² |
| Cây thông (nền xa) | `env.tree.pine_1..5` | `glTF/Pine_1..5.gltf` | PARTIAL | Hạn chế dùng vì lệch bối cảnh Việt Nam; chỉ giữ trong registry/preview hoặc rìa núi xa |
| Bụi cây & bụi hoa | `env.bush.common`, `env.bush.flowers` | `glTF/Bush_Common*.gltf` | FOUND | Dùng trực tiếp qua `.glb`, hỗ trợ instancing quanh bờ ao |
| Cỏ ngắn / cỏ cao | `env.grass.common_*`, `env.grass.wispy_*` | `glTF/Grass_*.gltf` | FOUND | Dùng trực tiếp, render bằng `InstancedMesh` tối ưu 60 FPS |
| Lau sậy ven ao | `env.reed.tall`, `env.reed.plant` | `glTF/Grass_Wispy_Tall.gltf`, `glTF/Plant_7*.gltf` | PARTIAL | Đổi tint màu vàng úa/xanh sậy và scale cao hơn làm lau sậy |
| Dương xỉ, cỏ ba lá, hoa, nấm | `env.fern.1`, `env.clover.1..2`, `env.flower.*`, `env.mushroom.*` | `glTF/Fern_1`, `Clover_1..2`, `Flower_3..4*`, `Mushroom_*` | FOUND | Dùng trang trí bờ cỏ, đảo nhỏ, xung quanh đình |
| Cánh hoa rơi (VFX) | `vfx.petal.1..5` | `glTF/Petal_1..5.gltf` | PARTIAL | Dùng làm hạt/cánh hoa bay nhẹ không khí lễ hội |
| Đá tảng, sỏi, lối đá | `env.rock.1..3`, `env.pebble.*`, `env.rock_path.*` | `glTF/Rock_Medium_*`, `Pebble_*`, `RockPath_*` | FOUND | Viền bờ ao, đảo an toàn và lối đi vào đình |
| Thí sinh ×12 (1 Player + 11 NPC) | `npc.01` .. `npc.12`, `player.body` | `Imp.glb`, `Puglin.glb` (license chưa xác minh) | MISSING | **Asset tạm do mã tạo** (quyết định mặc định 3.5.1): nhân vật người stylized Việt Nam (áo bà ba/nón lá/khăn rằn/yếm/áo hội) dựng bằng Three.js Group có rig 55 xương chuẩn; `Imp`/`Puglin` không đưa vào bản build chính thức |
| Hoạt ảnh nhân vật (Idle/Walk/Run/Jump/Panic/Eliminated) | `anim.procedural.*` | *(không có clip nào trong repo)* | MISSING | **Asset tạm do mã tạo**: thư viện kinematic procedural chạy trên rig 55 xương chuẩn |
| Cá sấu (`croc.main`) | `croc.main` | *(không có)* | MISSING | **Asset tạm do mã tạo**: mô hình đa khớp 10+ bộ phận (mõm, hàm dưới tách khớp, thân vảy lưng, 4 chân khớp, đuôi 4 đốt) + da procedural `CanvasTexture` + anim bơi/bò/đớp |
| Mặt nước ao làng | `arena.water` | *(không có)* | MISSING | **Asset tạm do mã tạo**: `MeshStandardMaterial` mở rộng `onBeforeCompile` / sóng gợn + bọt nước procedural |
| Tre Việt Nam (lũy tre) | `prop.bamboo` | *(không có)* | MISSING | **Asset tạm do mã tạo**: cụm thân tre đốt + tán lá tre bằng `InstancedMesh` |
| Cầu gỗ, bục gỗ / bục nổi | `prop.bridge`, `prop.platform`, `prop.dock` | *(không có)* | MISSING | **Asset tạm do mã tạo**: ghép ván gỗ, cọc tre, dây thừng buộc |
| Đình làng, cổng làng, khán đài | `prop.temple`, `prop.gate`, `prop.stands` | *(không có)* | MISSING | **Asset tạm do mã tạo**: mái ngói cong mũi hài, cột gỗ lim, hoành phi, khán đài bao quanh |
| Đèn lồng, cờ hội, biển hiệu | `prop.lantern`, `prop.flag`, `prop.sign` | *(không có)* | MISSING | **Asset tạm do mã tạo**: đèn lồng đỏ vàng phát sáng ấm, cờ ngũ sắc lễ hội |
| Âm thanh (SFX + Nhạc nền trống hội) | `audio.*` | *(không có)* | MISSING | **Asset tạm do mã tạo**: `AudioManager` tổng hợp bằng Web Audio API (thay file thật qua registry được) |
| Font tiếng Việt & UI Đông Hồ | `ui.theme`, `font.vn` | *(không có)* | MISSING | **Asset tạm do mã tạo**: SVG họa tiết trống đồng/hoa sen/mây cuộn + `Be Vietnam Pro` & `Noto Serif` |

## Tổng kết tỉ lệ tài nguyên
- **Tài nguyên thật từ repo (`FOUND` + `PARTIAL`):** 68 model môi trường glTF (chuyển `.glb`) + 20 texture PNG tối ưu (~14–18 MB tổng cộng, đạt ngân sách ≤ 80 MB).
- **Tài nguyên tạm do mã tạo (`MISSING`):** Nhân vật thí sinh (rig 55 xương), toàn bộ animation procedural, cá sấu 3D đa khớp, nước, kiến trúc đình/cầu/tre/đèn lồng, âm thanh WebAudio, UI Đông Hồ.
- Toàn bộ asset được truy cập qua `src/assets/AssetRegistry.ts` để thay thế từng mục bằng `.glb`/`.mp3` thật sau này mà không sửa logic gameplay.
