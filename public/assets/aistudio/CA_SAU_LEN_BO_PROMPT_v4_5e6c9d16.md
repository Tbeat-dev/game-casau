# GAME DEVELOPMENT PROMPT (v4 – repo codejeam + hệ thống kỹ năng người chơi)
# CÁ SẤU LÊN BỜ – SURVIVAL ARENA

## 0. BỐI CẢNH THỰC TẾ (ĐỌC TRƯỚC KHI LÀM)

- Toàn bộ tài nguyên (model, texture, animation, audio, font, icon) chỉ lấy từ **MỘT repository GitHub duy nhất**:
  `REPO_URL = https://github.com/Tbeat-dev/codejeam.git` (nhánh mặc định, commit đã kiểm kê: `39b3cf7`).
- Không tải tài nguyên từ trang web khác. Không giả định có mạng ngoài GitHub và package registry (npm).
- Không bịa tên file, đường dẫn hay license. Mọi thứ phải dựa trên nội dung thật của repo.
- Nếu một yêu cầu không thể thực hiện bằng tài nguyên trong repo, phải nói rõ, đưa phương án thay thế và ghi vào báo cáo. Không im lặng bỏ qua.

### 0.1 Kết quả kiểm kê thực tế của repo (đã xác minh, không được giả định khác)
- Repo là **Quaternius Stylized Nature MegaKit bản FREE (68/116 model), license CC0 1.0** (theo `License_Standard.txt`), cộng thêm 2 file `Imp.glb` và `Puglin.glb`. README chỉ có tiêu đề.
- **Có:** 68 model môi trường (CommonTree_1–5, TwistedTree_1–5, DeadTree_1–5, Pine_1–5, Bush_Common(+Flowers), Fern_1, Plant_1/7 (+Big), Clover_1–2, Grass_Common/Wispy Short/Tall, Flower_3/4 Group/Single, Petal_1–5, Mushroom_Common/Laetiporus, Rock_Medium_1–3, Pebble_Round_1–5, Pebble_Square_1–6, RockPath_* ) ở 4 định dạng (glTF, FBX, FBX Unity, OBJ), 20 texture PNG (28/38 MB là bark 2048²).
- **Imp.glb (~15.2k tam giác, cao ~1.68 m) và Puglin.glb (~7.5k tam giác, cao ~0.93 m):** nhân vật quái vật có skeleton 55 xương chuẩn (root, pelvis, spine_01–03, neck_01, Head, clavicle/upperarm/lowerarm/hand + ngón, thigh/calf/foot/ball). **Cả hai không chứa animation clip nào.** License của hai file này **chưa xác minh** (không nằm trong file license).
- **Không có:** nhân vật người, cá sấu, bất kỳ animation nào, nước, tre, cầu gỗ, bục gỗ, đình làng, đèn lồng, biển hiệu, khán đài, audio, font, UI.
- Chi tiết: `docs/REPO_INVENTORY.md`, `docs/ASSET_MAPPING.md`, `docs/CREDITS.md`. Phase 0 mục 3.1–3.4 coi như đã làm một phần; phần còn lại là bước kỹ thuật (3.3 preview/convert) và AssetRegistry.

## 1. VAI TRÒ

Bạn là Senior Game Developer, Game Designer, 3D Technical Artist và UI Engineer.

Xây dựng game 3D lấy cảm hứng từ trò chơi dân gian "Cá Sấu Lên Bờ", kết hợp cơ chế sinh tồn loại trực tiếp. Đây là game độc lập, không sao chép Squid Game.

Tên dự án: CÁ SẤU LÊN BỜ – SURVIVAL ARENA.

## 2. THỂ LOẠI VÀ PHONG CÁCH

- 3D Survival Party Game, góc nhìn First-person.
- Đồ họa Anime 3D Stylized, bối cảnh làng quê Việt Nam.
- Không khí lễ hội dân gian pha chút bí ẩn, căng thẳng. Ánh sáng điện ảnh.
- Multiplayer chưa làm ở bản đầu: dùng AI contestants.
- Không biến phong cách thành Nhật Bản hoặc Hàn Quốc.
- Cảnh bị loại chỉ dùng hiệu ứng cách điệu, không máu me.

## 3. QUY TRÌNH TÀI NGUYÊN TỪ MỘT REPO GITHUB (PHASE 0 – BẮT BUỘC)

Không code gameplay cho đến khi hoàn thành Phase 0.

### 3.1 Kiểm kê repo
1. `git clone --depth 1` repo vào `/third_party/<tên-repo>/` (không sửa file gốc).
2. Đọc README, LICENSE, CREDITS/NOTICE, cấu trúc thư mục (`tree`, kích thước file).
3. Xuất `docs/REPO_INVENTORY.md`: liệt kê mọi file model (.glb/.gltf/.fbx/.obj), texture, animation, audio, font, icon, kèm dung lượng và vị trí.

### 3.2 License
- Ghi license của repo và của từng thư mục con nếu khác nhau.
- Nếu không có license rõ ràng hoặc license cấm dùng thương mại/chỉnh sửa: dừng, báo người dùng, không tích hợp phần đó.
- Tạo `CREDITS.md` ghi đủ tác giả, nguồn, license.

### 3.3 Kiểm tra kỹ thuật từng asset
- Mở bằng Three.js (GLTFLoader) hoặc Blender, kiểm tra: load được không, scale, pivot, hướng trục, số tam giác, texture có đủ không, animation clip có tên gì, có skeleton không.
- Tạo trang preview `/tools/asset-preview.html` (xoay model, phát từng animation).
- Chuyển file về định dạng chung (ưu tiên .glb), nén texture hợp lý, đặt tên theo chuẩn `snake_case`.

### 3.4 Bảng ánh xạ (Asset Mapping)
Tạo `docs/ASSET_MAPPING.md` với từng yêu cầu của game và trạng thái:

| Yêu cầu | File trong repo | Trạng thái | Ghi chú |
|---|---|---|---|
| Contestant ×12 | ... | FOUND / PARTIAL / MISSING | ... |

Trạng thái:
- FOUND: dùng trực tiếp.
- PARTIAL: dùng được nhưng cần chỉnh (retarget animation, đổi màu/material, tái sử dụng model với skin khác).
- MISSING: repo không có.

### 3.5 Xử lý khi thiếu tài nguyên (quy tắc thực tế)
- Contestant ít hơn 12 model: dùng lại model, tạo biến thể bằng đổi màu áo, phụ kiện, tỉ lệ cơ thể, tên và AI riêng.
- Thiếu animation: retarget từ clip có sẵn, hoặc blend/procedural (nghiêng người, bob, IK đơn giản). Ghi rõ phần nào là procedural.
- Thiếu model cá sấu: dựng bằng code từ nhiều phần (thân, đuôi, hàm, chân có xương đơn giản), có texture/material procedural, có animation bơi/đi/há miệng bằng bone hoặc vertex. Không dùng một khối hộp.
- Thiếu môi trường (bục gỗ, tre, đình, đèn lồng, cầu): dựng bằng geometry kết hợp, material stylized, có chi tiết. Ghi rõ "asset tạm do mã tạo".
- Thiếu audio: tổng hợp bằng WebAudio (nước, chuông, đếm ngược, cảnh báo). Phải có AudioManager dễ thay file thật sau này.
- Thiếu font hỗ trợ tiếng Việt: dùng font hệ thống an toàn (xem mục 9).
- Tất cả asset tạm phải được đánh dấu trong `ASSET_MAPPING.md` và nằm sau một lớp trừu tượng (AssetRegistry) để thay thế sau mà không sửa gameplay.
- Không báo "hoàn thành asset" nếu còn mục MISSING chưa xử lý. Báo cáo trung thực tỉ lệ asset thật so với asset tạm.

### 3.5.1 Quy tắc cụ thể cho repo codejeam
- **Chỉ dùng bản glTF** của 68 model; bỏ qua FBX, FBX (Unity), OBJ (trùng lặp). Nén/giảm texture: bark 2048² → 1024² hoặc KTX2/WebP, mục tiêu tổng asset ban đầu ≤ 80 MB.
- **Cây:** ưu tiên CommonTree, TwistedTree, DeadTree. Hạn chế Pine_1–5 (cây ôn đới, lệch bối cảnh Việt Nam); chỉ dùng ở xa/nền nếu cần.
- **Cỏ, bụi, hoa, nấm, cánh hoa:** dùng trực tiếp; cỏ và bụi dùng instancing. Petal_1–5 dùng cho particle cánh hoa rơi.
- **Lau sậy:** tạm dùng Grass_Wispy_Tall và Plant_7(_Big), đổi màu/tỉ lệ cho giống lau sậy.
- **Đá (Rock_*, Pebble_*, RockPath_*):** viền bờ, đảo nhỏ, lối đi. Mặt đất/đảo/địa hình do mã dựng.
- **Phải tự dựng bằng mã** (đánh dấu "asset tạm do mã tạo"): nước, tre, cầu gỗ, bục nổi/bục gỗ, đình làng, đèn lồng, biển hiệu, khán đài, cá sấu, nhân vật người (nếu chọn phương án B), toàn bộ animation, âm thanh (WebAudio), UI.
- **Nhân vật thí sinh – quyết định mặc định (có thể đổi khi người dùng chọn khác):** Imp.glb/Puglin.glb **chỉ dùng cho prototype nội bộ** cho đến khi người dùng xác nhận nguồn và license. Bản chính thức: dựng nhân vật người stylized bằng mã, dùng **cùng cấu trúc 55 xương chuẩn** (tên xương như trên) để animation procedural chạy chung cho mọi nhân vật. Nếu người dùng xác nhận license của Imp/Puglin và muốn dùng, tạo 12 biến thể bằng màu/phụ kiện/tỉ lệ.
- **Animation:** repo không có clip nào, nên viết thư viện animation procedural trên rig 55 xương: idle, walk, run, jump, hoảng, bị loại. Ghi rõ trong `ASSET_MAPPING.md`.
- **Cá sấu:** dựng bằng mã (thân, đuôi nhiều đốt, hàm trên/dưới, 4 chân) với animation bơi, đi, há miệng, quay đầu procedural. Không dùng khối hộp.
- Nếu người dùng bổ sung repo thứ hai (ví dụ model người/cá sấu CC0), làm lại bước 3.1–3.4 cho repo đó và cập nhật bảng ánh xạ.

### 3.6 Tổ chức thư mục
```
/third_party/<repo>/      # bản gốc, chỉ đọc
/public/assets/
  models/ textures/ animations/ audio/ fonts/ ui/
/src/assets/AssetRegistry.ts   # ánh xạ ID logic -> file thật
/docs/REPO_INVENTORY.md  ASSET_MAPPING.md  CREDITS.md
```
Code gameplay chỉ gọi asset qua ID logic (`croc.main`, `npc.01`, `prop.bamboo`), không hard-code đường dẫn.

### 3.7 Ngân sách hiệu năng
- Mục tiêu 60 FPS trên laptop phổ thông.
- Tổng dung lượng asset tải ban đầu ≤ 80 MB (có loading screen và thanh tiến trình).
- Dùng instancing cho tre, cỏ, lau sậy. LOD hoặc giảm chi tiết cho vật ở xa. Đặt giới hạn số particle.

## 4. Ý TƯỞNG VÀ LUẬT CHƠI CỐT LÕI

- 12 thí sinh (1 người chơi + 11 NPC). Đấu trường có VÙNG NƯỚC (cá sấu tuần tra) và VÙNG ĐẤT (an toàn có giới hạn, thay đổi theo vòng).
- Luật: mọi thí sinh xuất phát ở khu xuất phát, nghe hiệu lệnh, di chuyển đến vùng an toàn đúng hiệu lệnh trong thời gian quy định. Bị cá sấu bắt, đến sai khu vực, quá giờ hoặc vi phạm luật thì bị loại. Người sống sót tiến vào vòng sau. Người cuối cùng còn sống chiến thắng.
- Cơ chế remix (mỗi cơ chế phải gắn với vòng cụ thể, có luật rõ, không kích hoạt ngẫu nhiên thiếu logic): Safe Zone thay đổi, Moving Platforms, Temporary Safe Zone, Fake Signal, Limited Capacity, Team Decision, Final Survivor.

## 5. CÁC VÒNG CHƠI

- ROUND 1 – CÁ SẤU TỈNH GIẤC: học điều khiển; một hiệu lệnh, một vùng an toàn; cá sấu có thể đổi hướng bất ngờ.
- ROUND 2 – BỜ ĐẤT BIẾN MẤT: vùng đất thu hẹp, xuất hiện bục nổi có giới hạn sức chứa; NPC tranh vị trí.
- ROUND 3 – TÍN HIỆU GIẢ: nhiều loại tín hiệu, chỉ một số có nghĩa phải chạy; di chuyển sai bị loại; cá sấu khó đoán hơn.
- FINAL – VÙNG ĐẤT CUỐI CÙNG: còn ít thí sinh; vùng an toàn đổi liên tục; đấu trường thu hẹp; sống sót đến hết giờ.

Mỗi vòng được mô tả trong một file cấu hình (JSON/TS): thời gian, số vùng an toàn, sức chứa, danh sách tín hiệu hợp lệ/giả, tốc độ cá sấu, điều kiện loại, điều kiện kết thúc.

## 6. AI CONTESTANTS

Mỗi NPC có: tên, ngoại hình riêng (theo khả năng asset), tốc độ, độ phản ứng, mức thông minh, hành vi sợ hãi, khả năng tranh vị trí.
Kiểu AI: Aggressive, Cautious, Strategic, Panicked, Cooperative.
AI phải dùng navigation (navmesh hoặc waypoint graph) và kiểm tra thật vùng an toàn/sức chứa, không chạy ngẫu nhiên.

## 7. CÁ SẤU AI

State machine: IDLE → PATROL → DETECT → CHASE → ATTACK → RETURN.
Tuần tra vùng nước, phát hiện trong phạm vi/góc nhìn, chọn và đổi mục tiêu, không xuyên địa hình, quay về tuần tra khi mất mục tiêu. Không đi theo đường thẳng đơn giản.
Animation: bơi, di chuyển trên bờ, tấn công, phát hiện, quay đầu; hiệu ứng nước khi di chuyển (dùng animation sẵn có hoặc procedural theo mục 3.5).

## 8. MAP

Một đấu trường nhiều khu: xuất phát, hồ trung tâm, vùng đất an toàn, bục nổi, cầu gỗ, đảo nhỏ, bờ cỏ, khu quan sát, khán đài.
Phong cách làng quê Việt Nam: ao hồ, tre, cầu gỗ, lau sậy, đình làng cách điệu, đèn lồng, họa tiết Việt.

## 9. QUY TẮC GIAO DIỆN (UI) – KHÔNG CHỒNG LẤN

### 9.1 Kiến trúc layout
1. Toàn bộ HUD nằm trong MỘT root `#ui-root` phủ toàn màn hình, `pointer-events: none`; chỉ phần tử tương tác mới bật `pointer-events: auto`.
2. Dùng **CSS Grid 3×3 với vùng cố định** thay vì `position: absolute` rải rác:
   - Trên-trái: số thí sinh còn lại.
   - Trên-giữa: tên vòng + bộ đếm thời gian.
   - Trên-phải: trạng thái cá sấu.
   - Giữa-trên (dưới thanh trên): hiệu lệnh/tín hiệu.
   - Dưới-trái: stamina.
   - Dưới-giữa: trạng thái vùng an toàn.
   - Dưới-phải: thanh kỹ năng (Q/R + bị động); gợi ý phím chỉ hiện ngắn đầu vòng.
   - Chính giữa: **chỉ dành cho crosshair nhỏ và thông báo ngắn ưu tiên cao**.
3. Mỗi ô grid chỉ có đúng một "slot". Mỗi phần tử HUD được gán cố định một slot, không tự ý di chuyển.
4. Dùng `clamp()`, `rem`, `vw/vh` và `env(safe-area-inset-*)`; chừa lề an toàn tối thiểu 3–5% mỗi cạnh.

### 9.2 Phân tầng (z-index) cố định
```
0  Canvas 3D
10 HUD thường
20 Hiệu lệnh/thông báo tạm (toast)
30 Panel trạng thái (spectator, elimination)
40 Menu Pause / Settings / How to Play
50 Loading / Màn hình chuyển cảnh
60 Cảnh báo lỗi hệ thống
```
Không dùng z-index tùy ý ngoài bảng này (định nghĩa bằng biến CSS `--z-*`).

### 9.3 Quản lý thông báo
- Chỉ **một modal/màn hình toàn cảnh tại một thời điểm** (UIManager giữ stack; mở cái mới thì đóng hoặc ẩn cái cũ).
- Toast đi qua hàng đợi (queue): tối đa 3 toast cùng lúc, xếp dọc có khoảng cách cố định, có độ ưu tiên (loại/chiến thắng > hiệu lệnh > thông tin). Toast ưu tiên thấp bị hoãn khi có toast ưu tiên cao.
- Hiệu lệnh quan trọng và đếm ngược không bao giờ bị phần tử khác che.
- Văn bản dài: giới hạn độ rộng (`max-width`), `text-overflow`/xuống dòng hợp lý, không tràn khỏi ô.
- Pointer lock: khi mở menu thì nhả chuột; khi đóng thì khóa lại; trạng thái này do UIManager quản lý tập trung.

### 9.4 Kiểm thử bố cục (bắt buộc)
- Viết script kiểm tra (Playwright hoặc test DOM): với mỗi màn hình/trạng thái, lấy `getBoundingClientRect()` của mọi phần tử HUD đang hiển thị và **báo lỗi nếu hai phần tử không cùng nhóm giao nhau** hoặc nằm ngoài viewport.
- Chạy ở các độ phân giải: 1280×720, 1366×768, 1920×1080, 2560×1440, và tỉ lệ 21:9. Nếu hỗ trợ trình duyệt di động thì thêm 390×844.
- Kiểm tra tình huống xấu nhất: tên dài, số 2 chữ số, tiếng Việt có dấu nhiều tầng, 3 toast cùng lúc, hiệu lệnh + cảnh báo cá sấu + đếm ngược cùng lúc.
- Sau mỗi thay đổi UI: chạy lại bộ test và chụp ảnh màn hình để kiểm tra bằng mắt.

### 9.5 Phong cách giao diện cổ điển dân gian Việt Nam
Tinh thần: tranh Đông Hồ, giấy dó, khung gỗ, hội làng. Dễ đọc là ưu tiên số một, trang trí không được làm khó đọc.

- Bảng màu (dùng biến CSS):
  - Đỏ son `#B3261E`, vàng nghệ `#E0A526`, nâu gỗ `#5B3A24`, xanh lá tre `#4F6F3A`, xanh chàm `#2B3A67`, nền giấy dó `#F3E8CF`, mực đen `#1E1A16`.
  - Chỉ dùng 1–2 màu nhấn mỗi màn hình; chữ trên nền sáng dùng mực đen/nâu, chữ trên nền tối dùng giấy dó/vàng. Độ tương phản chữ/nền tối thiểu 4.5:1.
- Họa tiết (vẽ bằng SVG/CSS hoặc dùng asset từ repo nếu phù hợp): hoa văn trống đồng, sóng nước, mây cuộn, hoa sen, tre, lồng đèn, nét viền ngói/rồng cách điệu. Dùng làm viền/góc, không đặt sau chữ.
- Thành phần UI:
  - Khung panel: viền gỗ nâu, góc có họa tiết, nền giấy dó hơi trong suốt (hoặc nền chàm đậm).
  - Nút bấm: dạng nhãn/biển gỗ hoặc tem đỏ son; hover sáng lên và có viền vàng; trạng thái focus rõ ràng.
  - Thanh stamina: dạng tre/ống tre, thanh đếm ngược dạng nén hương hoặc cuộn giấy.
  - Thông báo bị loại: đóng dấu đỏ son kiểu ấn triện kèm lý do; Victory: băng-rôn/cờ hội kèm pháo giấy cách điệu.
  - Tiêu đề màn hình chính: kiểu thư pháp/chữ biển hiệu làng; menu Play / How to Play / Settings / Exit dạng các tấm biển treo.
- Font: bắt buộc hỗ trợ đầy đủ dấu tiếng Việt. Đề xuất: font tiêu đề trang trí kiểu thư pháp/biển hiệu có hỗ trợ tiếng Việt (nếu có trong repo thì dùng, không thì dùng Be Vietnam Pro hoặc Noto Serif); chữ nội dung dùng font sans/serif dễ đọc. Kiểm tra bằng chuỗi "Ắ Ằ Ẳ Ẵ Ặ ễ ộ ự Ừ Ữ Ỵ" trước khi chốt.
- Chuyển động: nhẹ nhàng (fade, trượt, đóng dấu). Hỗ trợ `prefers-reduced-motion`.
- Không dùng họa tiết hoặc chữ viết mang phong cách Nhật/Hàn. Dùng văn bản tiếng Việt cho toàn bộ UI (có thể thêm bản tiếng Anh trong Settings).

### 9.6 Nội dung UI cần có
- Màn hình chính: Play, How to Play, Settings (sensitivity, âm lượng, chất lượng đồ họa), Exit.
- Trong game: số thí sinh còn lại, bộ đếm, tên vòng, hiệu lệnh, trạng thái vùng an toàn, trạng thái cá sấu, thanh kỹ năng và Khí lực, thông báo loại/chiến thắng.
- Giữa các vòng: màn hình chọn 1 trong 3 thẻ kỹ năng.
- Elimination: lý do bị loại + spectator camera.
- Victory: tên người thắng, thống kê, thời gian sống sót.

## 10. PLAYER SYSTEM

First-person: WASD, chuột, Shift chạy, Space nhảy, E tương tác, Esc pause. Camera mượt, head bob nhẹ, stamina, va chạm chính xác, không xuyên địa hình, sensitivity tùy chỉnh.

### 10.1 HỆ THỐNG KỸ NĂNG ĐỘT PHÁ (PLAYER SKILLS)

Mục tiêu: người chơi có công cụ chủ động để **xử lý tình huống khó của từng vòng**, thắng nhờ phán đoán và kỹ năng, không thắng nhờ phép "bỏ qua luật". Mọi kỹ năng là hành động có thể quan sát được (có hiệu ứng, âm thanh, hồi chiêu), và NPC cũng có thể dùng cùng bộ kỹ năng để công bằng.

**Tài nguyên:** thanh **Khí lực** riêng với stamina chạy (hồi dần, không hồi khi đang dùng kỹ năng). Mỗi kỹ năng có chi phí Khí lực + thời gian hồi (cooldown) + thời gian tác dụng, tất cả cấu hình trong `config/skills.json`.

**Bộ kỹ năng (tên Việt, ngắn gọn dễ nhớ):**

| Kỹ năng | Loại | Tác dụng | Giới hạn / đối trọng | Dùng tốt ở |
|---|---|---|---|---|
| Nước Rút | Chủ động | Tăng tốc mạnh trong ~1,5 s theo hướng đang chạy | Tốn nhiều Khí lực, hồi chiêu dài; không đổi hướng khi đang lướt | R1, Final (chạy thoát cá sấu) |
| Nhảy Sen | Chủ động | Nhảy xa/cao, vượt khoảng nước hẹp giữa hai bục | Cần chạm đất mới dùng lại; hạ cánh sai vẫn rơi nước | R2 (bục nổi) |
| Thăng Bằng Tre | Bị động | Giảm trượt, không bị đẩy khi đứng trên bục di chuyển hoặc cầu gỗ hẹp | Chỉ có tác dụng trên bục/cầu, không giúp chạy nhanh hơn | R2, Final |
| Mắt Cú | Chủ động | Hiện tầm phát hiện và hướng nhìn của cá sấu + vùng an toàn còn trống trong ~4 s | **Không** tiết lộ tín hiệu thật/giả; cá sấu đổi mục tiêu vẫn có thể bất ngờ | R1–Final |
| Tiếng Trống | Chủ động | Ném vật gây tiếng động/gõ trống nhử cá sấu quay sang điểm đó ~2–3 s | Tầm ném hữu hạn, cá sấu "quen tiếng" nên lần sau hiệu quả giảm | R1, R3 |
| Giữ Chỗ | Chủ động | Giữ chỗ trong vùng an toàn có Limited Capacity trong vài giây | Phải đứng sát vùng, bị hủy nếu rời đi hoặc bị NPC đẩy; không giữ được quá một chỗ | R2, Final |
| Kéo Bạn | Chủ động | Kéo một đồng đội (NPC Cooperative) lên bục hoặc cùng mở đường | Chỉ dùng trong vòng Team Decision, tốn Khí lực cả hai | Vòng Team Decision |
| Phao Tre | Bị động / dùng một lần | Cứu một lần khi bị cá sấu đớp (bị đẩy ra, mất Khí lực, cá sấu choáng ngắn) | Một lần mỗi vòng; không cứu nếu sai luật/hết giờ | Final |

**Quy tắc không phá luật chơi:**
1. Kỹ năng **không** bao giờ bỏ qua điều kiện loại do sai tín hiệu, sai vùng hoặc hết giờ. Vòng 3 (Tín Hiệu Giả) không có kỹ năng nào cho biết tín hiệu nào là thật.
2. Vùng an toàn có sức chứa vẫn bị khóa khi đủ người; Giữ Chỗ chỉ ưu tiên trong thời gian ngắn.
3. Mỗi vòng quy định **kỹ năng nào được phép dùng** (cấu hình trong file vòng chơi) để đảm bảo luật rõ ràng, ví dụ R1 không có Kéo Bạn, R3 không có Mắt Cú.
4. Mọi kỹ năng được kích hoạt qua `SkillManager` bằng sự kiện có cấu trúc (`skill:activated`, `skill:cooldown`, `skill:blocked`), không viết trực tiếp trong PlayerController.

**Tiến trình (mở khóa / đột phá):**
- Bắt đầu game với 1 kỹ năng cơ bản (Nước Rút).
- Sau mỗi vòng sống sót, người chơi nhận **điểm Đột Phá** theo kết quả (vào vùng an toàn sớm, thoát khỏi cá sấu, giúp đồng đội) và **chọn 1 trong 3 thẻ kỹ năng** (ngẫu nhiên có kiểm soát: luôn có ít nhất một kỹ năng phù hợp vòng kế tiếp).
- Loadout tối đa: **2 kỹ năng chủ động (phím Q và R) + 1 bị động**. Có thể nâng cấp một kỹ năng (giảm hồi chiêu/tăng thời gian tác dụng) thay vì lấy kỹ năng mới.
- Bị loại thì kết thúc lượt chơi; kỹ năng không giữ lại sang lần chơi sau (bản đầu không lưu tiến trình).

**NPC và kỹ năng:** mỗi NPC có tối đa 1–2 kỹ năng phù hợp tính cách (Aggressive: Nước Rút; Cautious: Mắt Cú; Strategic: Giữ Chỗ; Panicked: Phao Tre; Cooperative: Kéo Bạn). NPC dùng kỹ năng bằng cùng `SkillManager` và cùng cooldown.

**Giao diện kỹ năng (tuân thủ mục 9):**
- Thanh kỹ năng nằm ở slot **dưới-phải** của lưới HUD (thay chỗ gợi ý phím; gợi ý phím chuyển sang How to Play và hiện ngắn ở đầu vòng).
- Mỗi ô kỹ năng: icon họa tiết dân gian, phím (Q/R), vòng hồi chiêu, trạng thái khóa/không dùng được trong vòng này (mờ + chú thích ngắn).
- Màn hình chọn kỹ năng giữa các vòng là **một modal duy nhất** (z-index 40), 3 thẻ dạng tranh Đông Hồ/thẻ gỗ, mỗi thẻ có tên, icon, mô tả ≤ 2 dòng, chi phí/hồi chiêu; có chọn bằng chuột và bàn phím; không chồng lên thông báo vòng.
- Thông báo kỹ năng dùng hàng đợi toast chung, ưu tiên thấp.

## 11. KỸ THUẬT

- Three.js + TypeScript + Vite. Kiến trúc module, event system tập trung, luật chơi cấu hình được.
- Tách riêng: PlayerController, NPCController, CrocodileAI, ArenaManager, RoundManager, SafeZoneManager, EliminationManager, SkillManager, UIManager, AudioManager, AssetRegistry.
- Không viết toàn bộ game trong một file lớn.
- Multiplayer-ready (không cài networking): tách input khỏi logic, sự kiện có cấu trúc, trạng thái có thể đồng bộ sau.

## 12. CÁC PHASE

- PHASE 0: Kiểm kê repo, license, mapping, preview asset, AssetRegistry (mục 3).
- PHASE 1: Thiết kế đấu trường, môi trường cơ bản, First-person controller, camera.
- PHASE 2: Crocodile AI, NPC AI, safe zones, collision.
- PHASE 3: Round manager, rule system, elimination, 3 vòng đầu, SkillManager (kỹ năng, cooldown, quy tắc cho phép theo vòng).
- PHASE 4: UI theo mục 9 (gồm thanh kỹ năng và màn hình chọn kỹ năng), audio, VFX kỹ năng, Victory/Defeat.
- PHASE 5: Cân bằng AI, tối ưu, kiểm thử, hoàn thiện.

Sau mỗi phase: chạy game thật, kiểm tra gameplay, lỗi, asset, hiệu năng, và (từ Phase 4) chạy bộ test bố cục UI. Chỉ qua phase tiếp theo khi phase trước chạy ổn. Nếu không thể chạy trình duyệt trong môi trường hiện tại, nói rõ và cung cấp lệnh để người dùng tự chạy, không khẳng định "đã test" khi chưa test.

## 13. TIÊU CHÍ CHẤT LƯỢNG

1. Gameplay vui, dễ hiểu. 2. Luật nhất quán, kỹ năng không phá luật (mục 10.1). 3. Cá sấu tạo cảm giác nguy hiểm. 4. NPC hành vi tự nhiên. 5. Đấu trường có chiều sâu. 6. Model và animation đồng bộ. 7. UI dễ đọc, không chồng lấn. 8. Chạy ổn định.

## 14. NHIỆM VỤ ĐẦU TIÊN

Chưa code gameplay. Hãy:
1. Đọc `docs/REPO_INVENTORY.md`, `ASSET_MAPPING.md`, `CREDITS.md` đã có; hoàn thiện phần còn lại của Phase 0: trang preview asset (`/tools/asset-preview.html`), chuyển/nén glTF, `AssetRegistry`. Không làm lại bước kiểm kê nếu repo không đổi.
2. Trình bày: game architecture (gồm `SkillManager` và `config/skills.json`), gameplay state machine, luật chi tiết từng vòng, danh sách asset đầy đủ (thật/tạm), kế hoạch tích hợp AI.
3. Đề xuất layout UI (sơ đồ lưới HUD theo mục 9.1) và bảng mẫu màu/họa tiết/font theo mục 9.5.
4. Nêu rủi ro và hỏi người dùng 3 điểm: (a) dùng Imp/Puglin hay nhân vật người tự dựng, (b) chấp nhận cá sấu dựng bằng mã hay bổ sung repo model, (c) nguồn/license của Imp.glb và Puglin.glb. Nếu chưa có trả lời, theo quyết định mặc định ở mục 3.5.1.

Mục tiêu cuối: game 3D chơi được từ đầu đến cuối, nhiều NPC, cá sấu AI thông minh, các vòng có luật rõ, giao diện dân gian Việt Nam không chồng lấn, và một người chiến thắng thực sự.
