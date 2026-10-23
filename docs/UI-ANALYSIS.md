# Mossday — UI Analysis

Phase 1 output of [UI-BUILD-PLAN.md](UI-BUILD-PLAN.md). Built from all 27 images in `design/` (local only, git-ignored) and `spec.md`.
The design files say "DayLog"; the app is **Mossday** everywhere.

**Measuring rule:** the screen mock-ups are 786 px wide = a 393 pt iPhone at @2x. Every size below is in **pt/dp (px ÷ 2)**, rounded to the nearest design token.

---

## 1. Screen inventory

| # | Screen / sheet / state | Design file(s) | Route / host |
|---|---|---|---|
| 0 | Design system cover (colours, type, components, motion, heatmap, tab bar) | `Cover · iOS colours, type & components.png` | — (tokens) |
| 1 | Floating glass tab bar + FAB (light + dark) | `Component · Floating glass tab bar.png`, cover | `src/app/(tabs)/_layout.tsx` |
| 2 | Today (light / dark) | `A · Today.png`, `A · Today — Dark.png` | `src/app/(tabs)/index.tsx` |
| 2b | Today — over budget + undo toast | `M · Over budget + undo toast.png` | state of #2 |
| 3 | Quick Add sheet | `A · Quick Add sheet.png` | sheet over any tab |
| 4 | Add Expense sheet (meal selected) | `C · Add expense.png` | sheet |
| 4b | Other → Categories sheet (stacked) | `C(i) · Other categories.png` | nested sheet |
| 4c | One-time expense | `C(ii) · One-time.png` | state of #4 |
| 5 | Expenses — Day (light / dark, swipe-delete revealed) | `B · Expenses — Day.png`, `B · Expenses Day — Dark.png` | `src/app/(tabs)/expenses.tsx` |
| 5b | Expenses — Month (Week uses the same layout) | `D · Expenses — Month.png` | segment of #5 |
| 5c | Expenses — empty + toast | `M · Empty expenses + toast.png` | state of #5 |
| 6 | Habits list (light / dark) | `E · Habits.png`, `E · Habits — Dark.png` | `src/app/(tabs)/habits.tsx` |
| 6b | Habits — empty | `M · Empty habits.png` | state of #6 |
| 7 | Add Habit sheet | `G · Add habit.png` | sheet |
| 8 | Habit detail + day editor | `F · Habit detail + day editor.png` | `src/app/habit/[id].tsx` |
| 9 | Diary — day page (light / dark) | `H · Diary — Day.png`, `H · Diary — Dark.png` | `src/app/(tabs)/diary/index.tsx` |
| 10 | Diary — calendar | `I · Diary — Calendar.png` | `src/app/(tabs)/diary/calendar.tsx` |
| 11 | Notes list | `J · Notes.png` | `src/app/(tabs)/notes.tsx` |
| 11b | Notes — empty | `M · Empty notes.png` | state of #11 |
| 12 | Note editor (keyboard up) | `K · Note editor.png` | `src/app/note/[id].tsx` |
| 12b | Note editor — recording | `K · Recording.png` | state of #12 |
| 13 | Settings | `L · Settings.png` | `src/app/settings.tsx` |
| 14 | Home-screen widget | `N · Home Screen widget.png` | dev preview only (native widget is spec v2) |

Not drawn but required by spec (built from the closest drawn pattern): Expenses **Week** (= Month layout, 7 bars, day labels M–S), long-press **context menu** (iOS context menu), **New category** sheet (= Add Habit form pattern), **edit expense** (= Add Expense prefilled, title "Edit Expense" + Delete row), **Add to-do** sheet (= One-time title field + time pill), **Appearance** picker (iOS Settings checkmark list), budget amount entry (= NumberKeypad sheet).

---

## 2. Global layout facts (same on every screen)

| Element | Value |
|---|---|
| Screen background | `groupedBackground` (#F2F2F7 / #000000) |
| Card | `card` (#FFFFFF / #1C1C1E), radius **20**, continuous corners, no border, no shadow |
| Card horizontal inset from screen edge | **16** |
| Large title / section title inset | **20** (titles sit 4 pt further in than cards, like iOS) |
| Card inner padding | **20** for hero/content cards, **16** for list rows |
| Gap between cards | **12**; gap section-title → card **12**; between sections **28–32** → token 32 |
| Large title | largeTitle 34/41 bold, top ≈ 64 pt below status bar top on tab screens |
| Large title subtitle | body 17 `secondaryLabel` ("Thursday, 22 October", "3 of 4 done today") |
| Section header above card | title3 20/25 semibold, "Habits", "To-dos"; trailing accessory callout `secondaryLabel` or tinted "See All" (body, `accent`) |
| Grouped-list section header | footnote 13 **UPPERCASE** `secondaryLabel`, inset 20 ("BY CATEGORY", "PINNED", "MONEY") |
| List row | min height **52**, separator 0.5 pt `separator`, inset to the text start (not under the icon) |
| Icon tile in rows | 32 pt square, radius 8 (Settings 30/7), white glyph on accent colour |
| Glass circle buttons (gear, back, calendar) | **44** circle, GlassSurface, glyph 22 |
| Tab bar | floating glass pill, height **62**, inset 16 left; FAB glass circle **62** to its right, gap 12; bottom = safe-area + 4 |
| Content bottom padding | tab bar height + 24 so the last card can scroll above the bar |
| Toast | pill height **50**, sits 12 above the tab bar, inset 24 |
| Sheets | radius **28** (top), grabber 36×5 at top 6, header row 44 pt circle buttons at 16 inset, title headline 17 semibold centred |
| Primary button | filled `accent`, pill, height **52**, headline white |
| Chips | pill height **40**, padding-x 16, fill `fill`, body; selected = `accent` fill + white semibold |

---

## 3. Per-screen analysis

### 3.1 Tab bar + app shell (`Component · Floating glass tab bar`, cover — revised)
- **Layout (user revision, 23 Oct):** one full-width floating liquid-glass pill, 5 equal items in the order Expenses · Habits · **Today** · Diary · Notes, so Today sits in the middle. No "+" in the bar; each tab's add action is a glass "+" beside its large title (Today: Quick Add, next to the gear).
- **Glass:** blur of the scenes behind, translucent tint, specular sheen from the top edge, soft shade at the bottom, bright rim (`GlassSurface sheen`).
- **States:** focused item = green glass lens (accent-tinted fill, bright rim, soft shadow) + icon/label in `accent`; others `secondaryLabel`.
- **Animations:** tapping slides the lens with `spring.snappy` and a brief liquid stretch; dragging along the bar carries the lens under the finger (lifted 1.1×, selection haptic per tab crossed) and releasing opens the tab under it. Icon bounce on focus. Hidden on pushed detail screens.

### 3.2 Today (`A · Today`, `A · Today — Dark`, `M · Over budget`)
Top → bottom:
1. Large title "Today" + subtitle date; glass **gear** button 44 at right, vertically centred to title block → Settings.
2. **Spend card** (padding 20): "Spent today" body secondary · amount **hero 48 bold tabular** (AnimatedNumber) · budget bar 8 pt pill (`fill` track, `accentBar` fill) · row: "Rs. 750 left" subheadline semibold `accent` ↔ "of Rs. 2,000" subheadline secondary · separator (inset 0 inside card) · 3 **meal tiles** (equal width, gap 8, height 56, radius 14, `fill`): label subheadline secondary + amount headline-bold 20 `label`, or "+ Add" `accent` when not logged.
3. Section "Habits" + "3 of 4 done" · card with up to 4 **habit rings** (ring 56, stroke 5, emoji 28 inside, name subheadline below). Overflow → horizontal scroll.
4. Section "To-dos" + "See All" · grouped card of first 3–5 to-do rows (Checkbox 24, body text, time subheadline secondary).
5. (Spec) Recent notes — **not in design**; see §5 rule R9.
- **States:** no budget → hide bar row (just the amount); ≥80 % → bar + text `warning`; over → amount, bar and "Rs. 300 over budget" in `danger`, bar 100 %. Meal logged → amount; unlogged → "+ Add". No habits → habits card shows a one-line EmptyState "Add your first habit" row. No to-dos → row "Nothing planned · Add to-do". Dark per design.
- **Interactions:** meal tile "+ Add" → Add Expense with category preselected; logged tile → Expenses Day. Ring tap = +1 tick (bouncy pop, medium haptic, ring stroke animates to new progress); long-press = undo last tick. Checkbox toggle in place. Large title collapses into glass header on scroll. FAB → Quick Add.

### 3.3 Quick Add sheet (`A · Quick Add sheet`)
- Sheet on `groupedBackground`, medium detent; header: centred "Add" headline + glass **×** circle at right.
- Grouped card of 3 rows (height 64): icon tile 36 radius 10 (Expense orange wallet, To-do indigo checkbox, Note yellow doc) · title body + subtitle subheadline secondary ("A meal or anything you paid for", "Adds to today in your diary", Note → "Text, photos or a voice memo") · chevron `tertiaryLabel`.
- Behaviour: Expense → replaces with Add Expense sheet; To-do → Add To-do sheet; Note → push new note editor.
- Animation: spring.gentle open, background dims + scales to 0.94; rows PressableScale.

### 3.4 Add Expense sheet (+ Other grid, One-time) (`C`, `C(i)`, `C(ii)`)
- Large detent sheet on `card` (#FFF / #1C1C1E). Header: glass **×** left, title "New Expense" / "One-time Expense" / "Edit Expense".
- **Amount display:** "Rs." title1 28 bold `secondaryLabel` + digits **display 64 bold tabular** baseline-aligned, centred. Max 7 digits + 2 decimals; shake (spring.snappy translateX) when exceeding.
- **Category chips** (wrap, centred, gap 12/16): Breakfast, Lunch, Dinner, Other, One-time. Selected = accent fill. Selecting a different "Other" category renames the Other chip to that category name ("Transport ▸").
- **Options bar** (height 44, radius 14, `fill`): three equal cells split by 0.5 pt vertical separators — date pill ("Today" → Yesterday → date picker), payment ("Cash" ⇄ Card ⇄ Online, cycles on tap with selection haptic), "Add note" `accent` (opens inline text field / shows note text when set).
- **"Same as last time · Rs. 450" pill** (spec): shown under the amount when the selected meal has `lastAmount` and amount is empty; tap fills it. Not drawn → tinted small chip (callout, `accent` on `accentFill`).
- **One-time state:** "What was it?" TextField (height 48, radius 14, 1.5 pt `accentBar` border when focused) appears between chips and options bar with a layout transition; Save disabled until title + amount.
- **NumberKeypad** (fills remaining height): 4×3, keys title1-ish 30 regular `label`, no key backgrounds (iOS phone-pad style) with pressed `fill` circle highlight; ".", "0", ⌫ (delete key, long-press clears). Light impact on each key.
- **Save** button full width 52 pill, `accent`; disabled = 40 % opacity.
- **Other → Categories sheet** (stacked second sheet, medium detent, `groupedBackground`): back chevron glass circle, title "Categories", 3-column grid of tiles (card, radius 16, height ~92, icon tile 36 r10 + body label), last tile "New" (`fill` icon tile, "+") → New Category form.
- **Animations:** sheet spring.gentle; amount digits roll as typed; chip selection spring.snappy colour/scale; on Save: sheet dismisses, success haptic, target screen row slides in + total counts up.

### 3.5 Expenses Day / Week / Month (`B`, `B dark`, `D`, `M · Empty expenses`)
- Large title "Expenses" · **SegmentedControl** (height 36 ≈ 32+inset, radius 10, track `fill`, thumb `card` with soft shadow, label subheadline; selected semibold).
- **Period header (centred):** caption "Today, 22 Oct" / "This week" / "October" subheadline secondary · row: ‹ (accent, 28) · amount **hero 48 bold tabular** · › (tertiary when at current period → disabled) · delta line subheadline: "12% less than yesterday" `accent`, "x% more…" `danger`, "Nothing spent yet" `accent`, Month/Week: "About Rs. 1,392 a day" secondary.
- **Day list card:** rows 60 pt — icon tile 32 · title body + time footnote secondary ("18:10 · One-time") · amount body tabular right. Ordered by time. Swipe-left reveals red **Delete** (width 88, headline white) with rubber-band; full swipe deletes. Tap → edit sheet.
- **Month/Week:** bar-chart card (height ~160, padding 16): one bar per day (width fills, radius 3), past = `accentBarSoft`, today = `accent`, future = dotted `tertiaryLabel` dashes; dashed average line `separator`; x labels caption1 secondary (1, 8, 15, 22, 31; today's label accent semibold). Week shows 7 bars labelled M–S. Section "BY CATEGORY": rows icon tile · name body · amount body secondary · 4 pt progress bar under name in the category colour (share of max).
- **States:** empty day → EmptyState (wallet icon 48 secondary, "No expenses today" title3 bold, "Nice! Tap + when you spend." body secondary) centred in remaining space; toast after delete.
- **Interactions:** segment change cross-fades content; ‹ › change period with horizontal slide (spring.default); swipe on header also pages; list items `FadeIn/FadeOut + LinearTransition`; totals AnimatedNumber; delete → warning haptic + Undo toast.

### 3.6 Habits list (`E`, `E dark`, `M · Empty habits`)
- Large title "Habits" + subtitle "3 of 4 done today" (empty: "Small daily wins").
- **Habit card** (padding 16/20): emoji 32 · name headline 20 semibold (title3) · "12-day streak" body secondary · right **tick control** 44: goal > 1 & incomplete → ProgressRing with "5/8" footnote semibold; done → filled `accent` circle with white check; not done goal = 1 → outlined `fill` circle with "+" `accent`.
- **Heatmap** below (gap 16): 7 rows (Mon→Sun) × N week columns; squares sized to fill card width (≈13 pt, gap 3.5, radius 3). Today's square has a 1.5 pt `label` outline. Future days absent. Inactive days hollow (1 pt border, no fill).
- **Empty:** grid icon 48 · "No habits yet" title3 bold · body secondary "Start with one small thing, like 8 glasses of water." · filled Button "New Habit" (pill 52, padding-x 28).
- **Interactions:** tick → today's square pops (1→1.15→1, spring.bouncy) & colour steps level, button bounces, streak number rolls, medium haptic; long-press tick = undo; long-press card = ContextMenu (Edit, Archive, Delete); tap card → Habit detail (push). Cards enter with FadeIn + LinearTransition.

### 3.7 Add Habit sheet (`G`)
- Large detent, `groupedBackground`. Header: × glass left · "New Habit" · **Add** small filled button (pill height 44, padding-x 16) right (disabled until a name).
- Card: emoji tile 52 (`fill`, radius 14, emoji 30; tap → emoji picker grid) + TextField body "Habit name".
- Section "COLOUR": card with 6 swatches 32 (green, blue, indigo, orange, pink, teal) evenly spaced; selected gets a 2.5 pt ring in its own colour with 3 pt gap.
- Grouped card: "Times a day" body · value body secondary · **Stepper** (− | +, 92×36, `fill`, radius 10, − disabled at 1) / "Repeat" + 7 **DayToggle** circles 40 (selected `accent` fill white headline, unselected `fill` secondary) / "Reminder" · time body secondary (tap → time picker) · **Toggle**.
- Animations: swatch ring spring.snappy; day circles colour spring; Add → sheet closes, new card enters list.

### 3.8 Habit detail (`F`)
- Push screen, no tab bar. Top bar: glass back circle 44 left · glass "Edit" pill (height 44, body) right → Add Habit sheet in edit mode.
- Title row: emoji 34 + name **title1 28 bold** (wraps). Streak: number **display 64 bold** (AnimatedNumber) + "day streak" title3 regular secondary, baseline aligned.
- **Heatmap card:** month labels caption1 secondary above columns, weekday labels M / W / F caption1 on the left (fixed), grid scrolls horizontally (full year, opens scrolled to today); future squares faint `fill`. Selected square outlined (1.5 pt `label`). Divider, then **day editor**: "Wed, 14 Oct" body + "3 times" subheadline secondary · Stepper − / + (100×36).
- Grouped list: Best streak · Completion · Total ticks (values body secondary, tabular).
- Interactions: tap square → selection haptic, outline springs to it, editor values roll; ± updates log (light impact) and square colour animates. Swipe-back from left edge.

### 3.9 Diary day page (`H`, `H dark`)
- Large title = **"22 October"** + subtitle "Thursday, 2026"; glass calendar button 44 right → calendar.
- **WeekStrip** (Mon–Sun, inset 20): weekday letter footnote secondary; day number title3 regular; selected = 40 `accent` circle with white semibold; today (when not selected) = number in `accent`; 4 pt dot under days that have entries. Swipe left/right changes week.
- **To-do card:** optional carry-over header row "3 left from yesterday" subheadline secondary ↔ "Move to Today" headline `accent`, separated by full-width separator. Rows (52): Checkbox 24 · text body · time subheadline secondary right. Done = filled check + strikethrough + `secondaryLabel`.
- **Journal card:** "How was today?" headline · multiline TextInput body (autosave, debounced 600 ms) · **mood row** 5 emoji 34 evenly spaced; selected emoji full colour on 52 `fill` circle; unselected 50 % opacity / desaturated.
- **Footer:** "Spent Rs. 1,250 · 3 of 4 habits done" subheadline secondary centred.
- Interactions: checkbox spring fill + left→right strike + light haptic; swipe to delete (Undo toast); long-press drag reorder; FAB → Add To-do sheet (date prefilled); selecting a day slides the page content (spring.default).

### 3.10 Diary calendar (`I`)
- Pushed inside the Diary tab stack (tab bar stays). Top bar: glass back circle left · glass pill with ‹ › month nav right.
- Large title month name "October" (year added when not current year).
- Card: weekday header footnote secondary; 7-col grid, day cells 40 circles: spending tint (5 levels of `spendScale`, 0 = none), today = `accent` circle white semibold, future = `secondaryLabel` no tint; 4 pt `tertiaryLabel`-grey dot under days with to-dos.
- Legend: orange dot "More spent" · grey dot "Has to-dos" (footnote secondary), centred.
- Summary row card: "Thursday, 22 October" body + "Rs. 1,250 · 3 to-dos left" subheadline secondary + chevron → day page for that date.
- Interactions: tap day → selection haptic + summary row updates (FadeIn); month paging with horizontal slide.

### 3.11 Notes list (`J`, `M · Empty notes`)
- Large title "Notes" · **SearchField** (height 38, radius 12, `fill`, magnifier 18 + placeholder body `secondaryLabel`) · folder **Chips** (horizontal scroll, height 34; "All" selected).
- "PINNED" header → 2-column grid (gap 12): image card = thumbnail 88 high on top, title headline, time subheadline secondary; text card = title headline (2 lines), preview body secondary (2 lines), date subheadline tertiary. Optional pastel note colour as card background.
- "OTHERS" header → grouped list rows: title headline + subtitle subheadline secondary ("Tuesday · Voice note 1:24", preview text).
- Empty: doc icon 48 · "No notes" title3 bold · "Ideas, recipes and voice memos will show up here." Search with no results → "No results for "…"".
- Interactions: search filters live (LinearTransition); long-press → ContextMenu (Pin/Unpin, Colour, Folder, Delete); tap → editor push; FAB → new note.

### 3.12 Note editor (`K · Note editor`, `K · Recording`)
- Push screen, no tab bar, `card` background (white / #1C1C1E). Top bar: glass back 44 · glass pill with pin + share icons · filled `accent` check circle 44 (done → dismiss keyboard/save).
- Date caption footnote secondary centred ("22 October 2026 at 19:36").
- Title TextInput **title1 28 bold**, then blocks (gap 12): TEXT (body, multiline) · IMAGE (radius 16, full width, aspect kept) · VOICE (pill 52 high on `fill`: play circle 40 `accent`, waveform bars 3 pt wide, played = `accent`, rest = `tertiaryLabel`, duration subheadline secondary right) · CHECKLIST (check circle 22 + text; done = strike + secondary).
- **Floating toolbar** (glass pill, height 52, inset 12, above keyboard): Aa, image, camera, mic, checklist — icons 24.
- **Recording state:** mic tool gets `dangerFill` circle; a banner "● Recording into this note…" (`dangerFill` pill, callout semibold `danger`) inserts at cursor; keyboard replaced by recorder panel on `dangerFill`: timer "● 0:07" title1 bold `danger` tabular, live waveform (`danger` bars, upcoming dotted), mic button 76 `danger` with 2 pulsing halo rings, "‹ Slide to cancel" subheadline secondary left, "Release to save" subheadline semibold `danger` right. Hold to record, slide left > 100 pt cancels (warning haptic), release saves (success haptic) → voice block inserts with FadeIn.
- Swipe-left on a block → delete; long-press drag reorder.

### 3.13 Settings (`L`)
- Push from Today gear, no tab bar. Glass back circle; large title "Settings".
- Sections (ListRow with icon tile 30 r7):
  - MONEY: Currency (green) "LKR" › · Daily Budget (orange) "Rs. 2,000" › · Monthly Budget (red) "Rs. 50,000" ›
  - MEAL REMINDERS: Breakfast (orange cup) 9:00 Toggle · Lunch (orange fork) 14:00 Toggle · Dinner (indigo moon) 21:00 Toggle
  - GENERAL: Appearance (blue) "Automatic" › · App Lock (green) Toggle — see R11
  - DATA: Backup & Export (teal) › · Storage (grey) "24.6 MB" ›
- Value text body `secondaryLabel`; chevron 14 `tertiaryLabel`; time text tappable → time picker.
- Interactions: Toggle spring thumb; rows PressableScale + highlight; large-title collapse; swipe-back.

### 3.14 Empty, over-budget, toasts (`M · *`)
- EmptyState block: icon 48 `secondaryLabel` (stroke 2) · gap 16 · title3 bold title · gap 6 · body secondary centred, max width 300 · optional Button.
- Toast: pill 50, message body, trailing "Undo" tinted pill (headline, `accentOnDark` on white-12 % fill). Auto-dismiss 6 s (long enough to reach Undo one-handed); swipe down dismisses.
- Over budget: see 3.2.

### 3.15 Home-screen widget (`N`)
Out of scope for v1 (spec v2). Rendered only as `WidgetPreview` in the dev route: medium spend widget (Today accent, amount 32 bold, "Rs. 750 left", 3 meal tiles, "+ Dinner" filled) and small habits widget (ring 3/4, "Water left · 5 of 8").

---

## 4. Reusable components (anything used ≥ 2×)

| Component | Used on |
|---|---|
| `Text` (variants) | everywhere |
| `Icon` (rounded stroke icon set, size/colour tokens, filled variant) | everywhere |
| `PressableScale` | every tappable |
| `GlassSurface` | tab bar, FAB, circle buttons, header pill, sheets, toast, context menu, toolbar, widget preview |
| `GlassButton` (circle 44 / pill) | gear, back, calendar, Edit, close, month nav, note header |
| `Card` | all content cards |
| `GroupedList` + `ListRow` + `SectionHeader` | expenses day, by-category, quick add, habit stats, notes others, settings, calendar summary |
| `IconTile` | list rows, category grid, quick add, settings |
| `Chip` | add-expense categories, folder chips |
| `Button` (filled / tinted / plain, sizes) | Save, Add, New Habit, See All, Move to Today, Undo |
| `FAB` | tab shell |
| `SegmentedControl` | Expenses |
| `Toggle` | Settings, Add Habit |
| `Stepper` | Add Habit, Habit detail |
| `BottomSheet` (+ `SheetHeader`) | Quick Add, Add Expense, Categories, Add Habit, Add To-do, pickers |
| `NumberKeypad` + `AmountDisplay` | Add Expense, budget entry |
| `LargeTitleHeader` / `LargeTitleScrollView` | all tab screens, detail screens |
| `TabBar` | shell |
| `SwipeableRow` | expenses, to-dos, note blocks |
| `Heatmap` + `HeatmapSquare` | habit card, habit detail |
| `ProgressRing` | Today habits, habit tick, widget |
| `ProgressBar` | budget, by-category |
| `Checkbox` | to-dos (Today, Diary), checklist blocks |
| `AnimatedNumber` | totals, streaks |
| `EmptyState` | expenses, habits, notes, search |
| `Toast` (+ provider) | delete/undo everywhere |
| `ContextMenu` | notes, habits |
| `VoicePlayer` / `VoiceRecorder` / `Waveform` | note editor |
| `DatePill` / `OptionsBar` | add expense, add to-do |
| `WeekStrip` | diary |
| `MonthGrid` | diary calendar |
| `BarChart` | week/month |
| `TextField` / `SearchField` | one-time, add habit, notes, to-do |
| `HabitTickButton` | Today, Habits |
| `DayToggle` / `SwatchPicker` | add habit |

---

## 5. Inconsistencies & resolution rules

| # | Inconsistency | Rule used |
|---|---|---|
| R1 | spec §6 colours (#F7F8FA, #22C55E, Plus Jakarta Sans, 32/20/16/13 sizes) vs design cover (iOS system colours, SF Pro scale) | **Design + build plan win.** iOS semantic colours from the cover, Inter with the iOS type scale. Spec module colours are used only for icon tiles (cover: "accents appear only inside small category icons; everything interactive uses the one green tint"). |
| R2 | Two greens: text/buttons #248A3D vs bars/toggles/rings #34C759 (light); dark uses #30D158 for both | Tokens `accent` (#248A3D / #30D158) for text, buttons, selected states; `accentBar` (#34C759 / #30D158) for fills that carry no text (bars, rings, toggle track, focus border). |
| R3 | Heatmap: spec level-0 #EBEDF0 / dark #161B22 vs design grey #E5E5EA / #2C2C2E and brighter dark top level | Levels 1–4 from spec (light) / design (dark: #0E4429, #006D32, #26A641, #30D158); level 0 = design greys so empty squares match iOS fills. |
| R4 | Done to-do: Today shows grey text without strike; Diary shows strikethrough | Done = check + strikethrough + `secondaryLabel` **everywhere**. |
| R5 | Category colour differs: Bills is yellow in the grid but teal in Month "by category" | One colour per category from the DB; the Categories grid wins (Bills = yellow). |
| R6 | Category names: spec "Snacks/Tea", "Entertainment" vs design "Snacks", "Fun" | Design short names win. Schema v3 updates names, icon identifiers and semantic colours only when the old seed name, icon, colour and order are untouched; edited and custom categories are preserved. Schema v2 adds query indexes. |
| R7 | Spec: category **donut**; design: horizontal bars list | Design wins: "BY CATEGORY" bar rows; no chart library needed (react-native-svg / Views). |
| R8 | Spec Habit detail: "Less ▢▢▢▢▢ More" legend + current streak stat; design: no legend, streak as hero | Design wins; legend omitted, current streak = hero number. |
| R9 | Spec Today has "Recent notes" + 7-day mini bar chart; design has neither | Design wins for v1 layout; recent notes and mini chart omitted from Today (kept out to preserve the one-answer-per-screen design). |
| R10 | Note editor toolbar has a paperclip (attachments) not in spec | Omitted — only spec block types (Aa, image, camera, mic, checklist). |
| R11 | Settings shows iOS-only "Face ID Lock" and "iCloud" | Platform-neutral copy: "App Lock" (biometrics, spec v2 → row shown with "Soon" value, disabled) and Backup & Export value "ZIP". |
| R12 | Quick Add mock shows the tab bar drawn on top of the sheet | Sheets always present **above** the tab bar (iOS modal sheet). |
| R13 | Diary calendar keeps the tab bar; Habit detail / Note editor / Settings hide it | Screens that are a *mode of a tab* (calendar) live in that tab's stack and keep the bar; *detail* screens are pushed on the root stack and hide it. |
| R14 | Toast is a dark pill in light mode, but the build plan says glass | Toast = GlassSurface with the **dark material in both themes** (like iOS HUD/banners), so it matches the mock in light mode. |
| R15 | Habit card heatmap squares (≈13 pt, 20 weeks) vs spec 10 dp / 16 weeks | Square size = 13 target, column count derived from card width so the grid always fills edge to edge. |
| R16 | Spec week strip has dots; design strip has none | Keep dots (spec) using the same 4 pt dot as the calendar for consistency; invisible when a day has no entries, so the mock is unchanged. |
| R17 | Cover motion note (response 0.4 / damping 0.8, sheet bezier 0.32,0.72,0,1) vs build-plan tokens | Build-plan tokens are used. response 0.4 / ζ 0.8 ≈ stiffness 247 / damping 25 — practically `spring.default`, confirming it. Timing-based sheet fallback (Reduce Motion off but no velocity) uses `easing.sheet` = bezier(0.32, 0.72, 0, 1). |
| R18 | AGENTS.md requires routes in `src/app/`; older checkpoints used `app/` | Follow AGENTS.md: routes now live in `src/app/`; shared components, hooks and repositories stay outside the route directory. |
| R19 | Spec says "Plus Jakarta Sans"; build plan says Inter | Inter (build plan is the newer instruction). |
| R21 | Spec lists `@expo/vector-icons`; design icons are Lucide-style rounded strokes (wallet with clasp, 2×2 grid, file-text) | `lucide-react-native` (on the already-required `react-native-svg`) behind one `Icon` component with a curated name map; `@expo/vector-icons` removed. |
| R22 | Android blur only works on content inside a `BlurTargetView` | `BlurTargetProvider` + `BlurTargetContent` wrap what sits behind glass (tab scenes, screen scroll content, the app under sheets). Glass *inside* blurred content can't blur its own parent, so it uses the solid translucent fallback, which looks the same on the flat backgrounds where those buttons sit. |
| R20 | Notes: spec "two-column staggered for all"; design pinned grid + others list | Design wins: pinned = 2-col grid, others = grouped list. |

Ambiguities resolved by "closest iOS app": Appearance picker = Settings ▸ Display checkmark list; Add To-do = Reminders quick entry; context menu = iOS Notes long-press; time pickers = iOS wheel in a small sheet (`@react-native-community/datetimepicker` spinner on Android, styled sheet).

---

## 6. Data needed (for wiring, Phase 6)

`lib/repos/` is implemented: `expenses.ts` owns categories, entries and totals; `habits.ts` owns logs and streaks; `diary.ts` owns tasks and journal; `notes.ts` owns note blocks; `settings.ts` owns preferences. Screens use hooks that refresh on focus, foreground return and local writes. Routes only compose feature screens.
