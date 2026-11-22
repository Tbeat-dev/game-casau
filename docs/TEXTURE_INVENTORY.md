# Kiểm Kê Texture PBR & Vòm Trời (Phase TEX-0 Inventory)

> **Trạng thái nguồn Poly Haven hiện tại:** **Chưa nhập tệp Poly Haven từ bên ngoài.**  
> Theo ràng buộc môi trường (không truy cập trực tiếp `polyhaven.com` / `dl.polyhaven.org`, không giả định hay tạo giả tệp), các ô tài nguyên dưới đây hiện đang vận hành bằng **texture PBR procedural stylized & vòm trời shader procedural** đồng bộ màu dân gian Việt Nam, và sẽ tự động chuyển sang bản Poly Haven đã xử lý khi người dùng cung cấp kho `polyhaven/` và chạy `node tools/process_polyhaven.mjs`.

## 1. Bảng Kiểm Kê Texture Môi Trường 3D

| ID logic (`AssetRegistry`) | Ứng viên Poly Haven | URL Tham Chiếu | Tác giả | License | Độ phân giải | Map / Định dạng | Dung lượng | Đã chỉnh sửa? |
|---|---|---|---|---|---|---|---|---|
| `tex.wood.plank_new` | `wood_planks` (đã xác minh trang) / fallback procedural | `https://polyhaven.com/a/wood_planks` | Chờ `SOURCE.txt` | CC0 / Procedural Stylized | 256px (proc) / 512px (TEX-0) | Diffuse (sRGB) + `nor_gl` (Linear) + ARM (Linear) | 0 KB đĩa (RAM procedural) | Đang dùng bản procedural stylized |
| `tex.wood.plank_old` | `weathered_brown_planks` (ứng viên) / fallback procedural | Chờ xác nhận trang | Chờ `SOURCE.txt` | CC0 / Procedural Stylized | 256px (proc) / 512px (TEX-0) | Diffuse + `nor_gl` + ARM | 0 KB đĩa (RAM procedural) | Đang dùng bản procedural stylized |
| `tex.wood.plank_mossy` | Biến thể rêu trơn (`Rêu Trơn`) | — | Nội bộ dự án | Project Code | 256px | Diffuse + `nor_gl` + ARM (Roughness 0.28–0.42) | 0 KB đĩa | Procedural stylized |
| `tex.ground.mud` | `brown_mud_leaves_01` (ứng viên) / fallback procedural | Chờ xác nhận trang | Chờ `SOURCE.txt` | CC0 / Procedural Stylized | 256px (proc) / 512px (TEX-0) | Diffuse + `nor_gl` + ARM (Roughness 0.20–0.75) | 0 KB đĩa | Đang dùng bản procedural stylized |
| `tex.ground.dirt` | `dirt_floor` (ứng viên) / fallback procedural | Chờ xác nhận trang | Chờ `SOURCE.txt` | CC0 / Procedural Stylized | 256px (proc) / 512px (TEX-0) | Diffuse + `nor_gl` + ARM | 0 KB đĩa | Đang dùng bản procedural stylized |
| `tex.ground.grass` | `forest_ground_04` (ứng viên) / fallback procedural | Chờ xác nhận trang | Chờ `SOURCE.txt` | CC0 / Procedural Stylized | 256px (proc) / 512px (TEX-0) | Diffuse + `nor_gl` + ARM (dùng trong Splat Shader 4 lớp) | 0 KB đĩa | Đang dùng bản procedural stylized |
| `tex.rock.shore` | `rocks_ground_02` (ứng viên) / fallback procedural | Chờ xác nhận trang | Chờ `SOURCE.txt` | CC0 / Procedural Stylized | 256px (proc) / 512px (TEX-0) | Diffuse + `nor_gl` + ARM | 0 KB đĩa | Đang dùng bản procedural stylized |
| `tex.brick.red` | `red_bricks_04` (ứng viên) / fallback procedural | Chờ xác nhận trang | Chờ `SOURCE.txt` | CC0 / Procedural Stylized | 256px (proc) / 512px (TEX-0) | Diffuse + `nor_gl` + ARM | 0 KB đĩa | Đang dùng bản procedural stylized |
| `tex.roof.tile` | Không có trên Poly Haven → Procedural | — | Nội bộ dự án | Project Code | 256px | Diffuse + `nor_gl` + ARM | 0 KB đĩa | Procedural mái ngói âm dương |
| `tex.bamboo.stalk` | Không có trên Poly Haven → Procedural | — | Nội bộ dự án | Project Code | 256px | Diffuse + `nor_gl` + ARM | 0 KB đĩa | Procedural đốt tre xanh |
| `tex.water.pond` | Không có trên Poly Haven → Procedural | — | Nội bộ dự án | Project Code | 256px | Diffuse + `nor_gl` + ARM + Vertex Ripple Shader | 0 KB đĩa | Procedural mặt ao làng |

## 2. Bảng Kiểm Kê Vòm Trời & IBL (`config/atmosphere.json`)

| ID logic | Ứng viên HDRI Poly Haven | URL Tham Chiếu | Tác giả | License | Độ phân giải | Map / Định dạng | Dung lượng | Đã chỉnh sửa? |
|---|---|---|---|---|---|---|---|---|
| `sky.round1` | `evening_field` (đã xác minh trang) / fallback PMREM+Shader | `https://polyhaven.com/a/evening_field` | Sergej Majboroda (theo xác minh trang) | CC0 / Procedural | Equirectangular 64×32 PMREM + BackSide Shader | PMREM CubeUV + Sky Dome | 0 KB đĩa | Dùng bầu trời chiều muộn procedural stylized |
| `sky.round2` | `kloofendal_48d_partly_cloudy` (đã xác minh trang) / fallback PMREM+Shader | `https://polyhaven.com/a/kloofendal_48d_partly_cloudy` | Greg Zaal (theo xác minh trang) | CC0 / Procedural | Equirectangular 64×32 PMREM + BackSide Shader | PMREM CubeUV + Sky Dome | 0 KB đĩa | Dùng bầu trời hoàng hôn cam procedural stylized |
| `sky.round3` | `overcast_soil` (ứng viên) / fallback PMREM+Shader | Chờ xác nhận trang | Chờ `SOURCE.txt` | CC0 / Procedural | Equirectangular 64×32 PMREM + BackSide Shader | PMREM CubeUV + Sky Dome | 0 KB đĩa | Dùng bầu trời chạng vạng sương procedural |
| `sky.final` | Bầu trời đêm lễ hội procedural (trăng, sao, đom đóm, lồng đèn) | — | Nội bộ dự án | Project Code | Equirectangular 64×32 PMREM + BackSide Shader | PMREM CubeUV + Sky Dome | 0 KB đĩa | Procedural đêm hội lồng đèn |

## 3. Quy Trình Nạp Poly Haven Khi Có Repo / Tệp Đính Kèm
1. Đặt các bộ 1K/2K JPG (`*_diff_*`, `*_nor_gl_*`, `*_arm_*`, `SOURCE.txt`) vào `polyhaven/<asset_id>/` và `.hdr` vào `polyhaven/hdri/<asset_id>/`.
2. Chạy `node tools/process_polyhaven.mjs --input=polyhaven --stylize=medium` (hoặc `light` / `strong`).
3. Script tự động làm mịn giữ cạnh, chuyển tông màu dân gian Việt Nam (`#5B3A24`, `#4F6F3A`, `#A84432`), nén `.webp`, kiểm tra ngân sách (`≤ 20 MB` texture, `≤ 6 MB` HDRI) và cập nhật `/public/assets/textures/polyhaven/manifest.json`.
