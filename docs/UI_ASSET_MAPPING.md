# UI Asset Mapping – "Cuốn Sổ Hội Làng" (`480×270` Virtual Canvas)

All runtime UI components read logical sprite IDs from `src/ui/atlas.ts` (never hardcoded file paths).
Processed/tuned files live in `/public/assets/ui/variants/` and `/public/assets/ui/custom/`; original files in `/third_party/codejs/` remain strictly untouched.

| Logical Atlas ID | Source Asset | Derived File / Variant | Screen / HUD Slot | Notes |
|---|---|---|---|---|
| `ui.cover.red` | `BookCover01a.png` (`224×160`) | `variants/book_cover_vermilion.png` | Title Screen (`MenuScreen`), `VictoryModal` | Recolored `#B75B5F -> #B3261E` (Son đỏ hội làng), 9-slice `5 11 5 11` |
| `ui.page.left` | `BookPageLeft01a.png` (`104×147`) | `variants/book_page_left_giaydo.png` | `HowToPlayModal`, `SkillDraftModal` | Tuned `#FFD7A8 -> #F3E8CF` (Giấy dó) for >= 10:1 ink contrast |
| `ui.page.right` | `BookPageRight01a.png` (`104×147`) | `variants/book_page_right_giaydo.png` | `HowToPlayModal`, `SkillDraftModal` | Tuned `#FFD7A8 -> #F3E8CF` |
| `ui.popup.paper` | `Popup01a.png` (`62×30`) | `variants/popup_giay_do.png` | HUD `top-left`, Signal resting, Modals, Elimination card | 9-slice `4 5 5 4` |
| `ui.popup.wood` | `Popup01a.png` (`62×30`) | `variants/popup_wood_dark.png` | HUD `top-center`, `bottom-center`, Pickup channel, Stat tiles | Dark wood + turmeric trim, 9-slice `4 5 5 4` |
| `ui.popup.danger` | `Popup01a.png` (`62×30`) | `variants/popup_vermilion.png` | Signal active, Croc `CHASE/ATTACK`, Danger Toasts | Vermilion + turmeric trim, 9-slice `4 5 5 4` |
| `ui.frame.row` | `Frame01a.png` (`62×14`) | `travelbook/UI_TravelBook_Frame01a.png` | Settings rows, Skill card footer | 9-slice `3 3 3 3` |
| `ui.frame.hover` | `FrameSelect01a.png` (`62×14`) | `travelbook/UI_TravelBook_FrameSelect01a.png` | Button / tab / list hover | 9-slice `3 3 3 3` |
| `ui.frame.active` | `FrameSelect01b.png` (`62×14`) | `travelbook/UI_TravelBook_FrameSelect01b.png` | Active difficulty tab, secondary plaque CTA | 9-slice `3 3 3 3` |
| `ui.btn.primary` | `FrameSelect01b.png` (`62×14`) | `variants/frame_btn_vermilion.png` | Primary CTA ("Chơi Ngay", "Tiếp Tục", "Chơi Lại") | Vermilion CTA button, 9-slice `3 3 3 3` |
| `ui.slot.normal` | `Slot01a.png` (`30×30`) | `travelbook/UI_TravelBook_Slot01a.png` | Skill slot Q/R/P & `[F]` item slot (ready) | 9-slice `4 3 3 3` |
| `ui.slot.active` | `Slot01b.png` (`30×30`) | `travelbook/UI_TravelBook_Slot01b.png` | Skill active / buff rare slot | 9-slice `4 3 3 3` |
| `ui.slot.locked` | `Slot01c.png` (`30×30`) | `travelbook/UI_TravelBook_Slot01c.png` | Empty / locked / silenced slot | 9-slice `4 3 3 3` |
| `ui.slot.select` | `Select01a.png` (`30×30`) | `travelbook/UI_TravelBook_Select01a.png` | Selected / hovered slot reticle | 9-slice `6 6 6 6` |
| `ui.bar.frame` | `Bar01a.png` (`62×4`) | `travelbook/UI_TravelBook_Bar01a.png` | Countdown, Stamina, Khí Lực, Pickup Channel | 9-slice `1 3 1 3` |
| `ui.bar.fill.bamboo` | `Fill01a.png` (`30×2`) | `variants/fill_bamboo.png` | Thể Lực (Tre) bar fill | Clipped width `%` |
| `ui.bar.fill.turmeric` | `Fill01a.png` (`30×2`) | `variants/fill_turmeric.png` | Khí Lực, Pickup Channel, Incense timer | Clipped width `%` |
| `ui.bar.fill.vermilion` | `Fill01a.png` (`30×2`) | `variants/fill_vermilion.png` | Urgent countdown (`<= 6s`) | Clipped width `%` |
| `ui.toggle.off` / `.on` | `Toggle03a/b.png` (`10×6`) | `travelbook/UI_TravelBook_Toggle03a/b.png` | Settings checkboxes & accessibility toggles | Interactive `<button role="switch">` |
| `ui.slider.handle` | `Handle03a.png` (`7×8`) | `travelbook/UI_TravelBook_Handle03a.png` | Sensitivity & volume sliders | Overlaid on `ui.bar.frame` |
| `ui.dropdown.handle` | `HandleDropdown01a.png` (`9×6`) | `travelbook/UI_TravelBook_HandleDropdown01a.png` | Graphics quality selector | Adjacent to `<select>` |
| `ui.marker.tab` | `Marker01a.png` (`20×14`) | `travelbook/UI_TravelBook_Marker01a.png` | `HowToPlayModal` chapter bookmarks | Flipped/active bookmark tabs |
| `ui.anim.alert` | `Alert01a_1..4.png` (`4×7`) | `travelbook/anim/UI_TravelBook_Alert01a_1..4.png` | Croc `DETECT/CHASE/ATTACK` & urgent telegraph | 100ms/frame step animation |
| `ui.anim.slotCursor` | `SlotCursor01a_1..4.png` (`30×30`) | `travelbook/anim/UI_TravelBook_SlotCursor01a_1..4.png` | Skill draft focus & active skill highlight | 100ms/frame step animation |
| `ui.icon.*` | `Icon*.png` (`9–16px`) | `travelbook/UI_TravelBook_Icon*.png` | Pause, Play, Restart, Gear, Home, Star (a/c/e), Energy, Heart, Coin, Tick, Cross | Crisp pixel icon controls |
| `ui.custom.contestant` | Custom (`16×16`) | `custom/icon_contestant.png` | HUD `top-left` survivor counter | Nón lá contestant icon |
| `ui.custom.crocodile` | Custom (`16×16`) | `custom/icon_crocodile.png` | HUD `top-right` croc status badge | Matches TravelBook ink `#493333` |
| `ui.custom.crosshair` | Custom (`5×5`) | `custom/crosshair_5x5.png` | HUD `center` reticle | Fixed center pixel reticle |
| `ui.custom.skill.*` | Custom (`16×16`, 8 sprites) | `custom/skill_*.png` | Skill Draft cards & HUD `bottom-right` Q/R/P slots | Maps 1-to-1 to `skills.json` |
| `ui.custom.debuff.*` | Custom (`16×16`, 7 sprites) | `custom/debuff_*.png` | HUD `mid-left` active debuffs | Maps 1-to-1 to `buffs.json` debuffs |
| `ui.custom.seal` | Custom (`32×32`) | `custom/seal_eliminated.png` | `EliminatedBanner` red stamp | Traditional vermilion square seal `"LOẠI"` |
| `ui.custom.flag` | Custom (`24×24`) | `custom/festival_flag.png` | `VictoryModal` festival banner | Vietnamese Ngũ Sắc pennant |
| `ui.custom.corner` / `.divider` | Custom (`12×12`, `32×6`) | `custom/dong_ho_corner.png`, `dong_ho_divider.png` | Modal corners & section dividers | Đông Hồ wave/cloud motif |

## Font Compatibility Check (`@fontsource/vt323` vs `Be Vietnam Pro` / `Noto Serif`)

- Checked `@fontsource/silkscreen`, `@fontsource/press-start-2p`, `@fontsource/pixelify-sans`, `@fontsource/tiny5`, `@fontsource/jersey-10/15/20`: **none** ship a `vietnamese` Unicode subset (`Ắ Ằ Ẳ Ẵ Ặ ễ ộ ự Ừ Ữ Ỵ Đ đ`).
- Visually inspected `@fontsource/vt323` at `20px` and `28px` in `/tools/ui-preview.html`: stacked Vietnamese diacritics (`Ắ`, `Ằ`, `Ặ`, `ự`, `Ỵ`) fell back to non-pixel system glyphs with mismatched advance width.
- **Final Font Selection (Verified Crisp):** Use **`Noto Serif`** (700/800) for book display headers & **`Be Vietnam Pro`** (400/600/700/800) for all HUD counters, labels, buttons, and book prose, paired with a crisp `1px` dark ink outline (`#1E1A16`) for >= 4.5:1 contrast.
