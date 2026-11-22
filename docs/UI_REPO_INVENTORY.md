# UI Repository Inventory – `levantuannnn/codejs`

- **Source URL:** `https://github.com/levantuannnn/codejs.git`
- **Verified Local Clone Path (Read-Only):** `/third_party/codejs/`
- **Verified Commit Hash:** `468289df675bba7a1a34fb1a82c53003ce2751f8` (`add file`)
- **Total Files:** 130+ files (~1.2 MB) across two distinct pixel-art UI packs.

---

## Bộ A: Complete UI Book Styles Pack Free v1.0 – "TravelBook Lite"

- **Author / Licensor:** Crusenho Agus Hennihuno (`https://crusenho.itch.io`)
- **Product Page:** `https://crusenho.itch.io/complete-ui-book-styles-pack` (02 March 2025)
- **License Terms (`License.txt`):**
  - Permitted: Use, share, copy, adapt, remix, transform for personal and commercial projects.
  - Restricted: **MUST NOT** re-sell or publish the material itself (original or adapted/remixed) standalone. **MUST NOT** use for NFTs.
  - Required: Appropriate credit + link to product page + clear indication of changes made.
- **Measured Native Palette (`Sprites/*.png` pixel audit):**
  - Giấy trang sách (`paper`): `#FFD7A8`, bevel `#E5B67F`, shadow `#DEA974`, highlight `#FFE3C6`
  - Bìa sách đỏ (`cover`): `#B75B5F`, spine/trim `#9C4351`, clasp `#FFD071` / `#FFA34D`
  - Mực viền (`ink`): `#493333` (deep `#2F2424` / `#341F20`)
  - Gỗ ô slot (`wood`): `#45292A` / `#4D2A26` / `#634041` / `#825F60`
  - Nút / thanh (`neutral`): `#C6B09B` / `#8A7868`
  - Biểu tượng: Tim đỏ `#D43E3E`, Năng lượng xanh `#3E89D4`, Sao vàng `#D4A23E` / `#E1C432`

### Asset Dimensions & Verified 9-Slice Regions (Set A)

| File Pattern | Count | Pixel Size | Measured 9-Slice Insets (`T R B L`) | Purpose |
|---|---:|---|---|---|
| `UI_TravelBook_BookCover01a.png` | 1 | `224×160` | `5 11 5 11` | Menu chính & Victory background book |
| `UI_TravelBook_BookPageLeft01a.png` | 1 | `104×147` | `1 4 7 1` | Trang trái sách mở (HowToPlay / SkillDraft) |
| `UI_TravelBook_BookPageRight01a.png` | 1 | `104×147` | `1 1 7 5` | Trang phải sách mở (HowToPlay / SkillDraft) |
| `UI_TravelBook_Popup01a.png` | 1 | `62×30` | `4 5 5 4` | Panel HUD / Modal / Tooltip / Toast |
| `UI_TravelBook_Frame01a.png` | 1 | `62×14` | `3 3 3 3` | Dòng danh sách / thanh tiêu đề |
| `UI_TravelBook_FrameSelect01a.png` | 1 | `62×14` | `3 3 3 3` | Nút / mục đang hover |
| `UI_TravelBook_FrameSelect01b.png` | 1 | `62×14` | `3 3 3 3` | Nút / mục đang active / selected |
| `UI_TravelBook_Slot01a.png` | 1 | `30×30` | `4 3 3 3` | Ô kỹ năng / ô vật phẩm [F] bình thường |
| `UI_TravelBook_Slot01b.png` | 1 | `30×30` | `4 3 3 3` | Ô đang kích hoạt / giữ sáng |
| `UI_TravelBook_Slot01c.png` | 1 | `30×30` | `4 3 3 3` | Ô trống / bị khóa / bán trong suốt |
| `UI_TravelBook_Select01a.png` | 1 | `30×30` | `6 6 6 6` | Khung nhắm 4 góc trên ô được chọn |
| `UI_TravelBook_Bar01a.png` | 1 | `62×4` | `1 3 1 3` | Khung thanh tiến trình |
| `UI_TravelBook_Fill01a.png` / `01b.png` | 2 | `30×2` | `0 0 0 0` | Lõi thanh tiến trình (tỉ lệ cắt theo %) |
| `UI_TravelBook_Toggle03a.png` / `03b.png` | 2 | `10×6` | — | Công tắc Tắt / Bật trong Settings |
| `UI_TravelBook_Handle03a.png` | 1 | `7×8` | — | Tay nắm thanh trượt (Slider thumb) |
| `UI_TravelBook_HandleDropdown01a.png` | 1 | `9×6` | — | Mũi tên Dropdown |
| `UI_TravelBook_ButtonValue01a.png` / `01b.png` | 2 | `8×6` | — | Nút tinh chỉnh `+` / `−` |
| `UI_TravelBook_Line01a.png` | 1 | `30×2` | — | Đường kẻ ngang phân cách |
| `UI_TravelBook_Marker01a.png` | 1 | `20×14` | — | Thẻ đánh dấu trang sách (Tab) |
| `UI_TravelBook_Cursor01c/d.png` | 2 | `14×16` | — | Con trỏ pixel |
| `UI_TravelBook_Alert01a.png` | 1 | `3×6` | — | Dấu chấm than cảnh báo |
| Icons (`Heart`, `Energy`, `Star`, `Coin`, `Gear`, `Home`, `Pause`, `Play`, `Restart`, `Tick`, `Cross`, `Arrow`) | 18 | `9–16 px` | — | Biểu tượng chức năng khớp mật độ pixel |
| Gamepad Glyphs (`A/B/X/Y`, `DPad`, `LB/RB/LT/RT`, `L/R/L3/R3`, `Menu/View/Share`) | 20 | `8–15 px` | — | Nút điều khiển phụ trợ |
| `Sprites Animated/*` | 45 | `4×7`–`30×31` | — | Chuỗi khung hình rời (`Alert01a_1..4`, `Button01a_1..5`, `SlotCursor01a_1..4`, `MarkerShow/Hide_1..4`, `Command*`, `Point*`) |
| `Aseprite/*.aseprite` | 2 | `608×880`, `96×96` | — | File nguồn; frame timings kiểm tra từ header: `100ms/frame` cho Alert & SlotCursor, `70/50/70/90ms` cho Button |

---

## Bộ B: Pixel UI HUD: Fantasy RPG Kit – FREE Demo

- **Author:** `indigolay` (`https://indigolay.itch.io/pixel-hud-ui`)
- **License (`ReadMe.txt`):** Free for personal & commercial use (9 sample PNGs).
- **Measured Dimensions:**
  - `UI_StatusBar_Bg.png` (`395×57`), `UI_StatusBar_Fill_HP.png` (`319×39`)
  - `UI_Progress_Style2_Bg.png` (`104×39`), `UI_Progress_Style2_Fill_Red.png` (`92×24`)
  - `UI_Slot_Selected.png` (`111×111`), `UI_Indicator_Heart.png` (`42×39`)
  - `Icon_Consumable_Apple.png` (`128×128`), `Icon_Tool_RepairHammer.png` (`128×128`)
- **Decision on Set B (Pixel-Density Compatibility Audit):**
  - **Omitted from runtime UI.** Set B renders at roughly `3.7×–8×` higher pixel grid density (`111×111` slot / `128×128` icon / `395×57` bar) compared to Set A (`30×30` slot / `14×14` icon / `62×4` bar) inside our `480×270` virtual canvas. Mixing them causes jarring mixels and breaks the "Cuốn Sổ Hội Làng" book coherence. Copies are kept only in `ui-preview.html` for transparent visual comparison.
