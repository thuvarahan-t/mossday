# Mossday — UI Build Plan & Checklist

Build the full UI of **Mossday** (Expo, React Native, TypeScript, Expo Router).
Tick each box (`[x]`) only after that part is finished, type-checked and committed.

**Sources of truth**
- `design/*.png` → how every screen must LOOK (layout, spacing, colours, sizes). Local only — `design/` is git-ignored and never pushed.
- `spec.md` → features, behaviour and data (also holds the design-system tables; there is no separate DESIGN.md).
- The design files use the old name "DayLog" — always use **"Mossday"**.

**Goal:** a pixel-faithful, premium app that looks and feels like a native iOS app (Apple HIG) on Android — consistent typography, iOS-style glass surfaces, iOS-like spring animations everywhere. Consistency across every screen matters more than anything else.

---

## Phase 1 — Analyse (no code)
- [x] Study every image in `design/` and read `spec.md` fully
- [x] Write `docs/UI-ANALYSIS.md`:
  - [x] Screen inventory (every screen / sheet / state + file name)
  - [x] Per screen: layout top→bottom, components, states (empty, filled, pressed, selected, over-budget, recording, dark), interactions/animations
  - [x] Reusable component list (anything used twice = a component)
  - [x] Inconsistencies between screens + the single rule used to resolve each
- [x] Show a short summary, then continue

## Phase 2 — Design system (`constants/`, tokens only — never hard-code in screens)
- [x] Typography: Inter via `@expo-google-fonts/inter` (SF Pro substitute), slight negative tracking on large sizes
  - largeTitle 34/41 bold · title1 28/34 bold · title2 22/28 bold · title3 20/25 semibold · headline 17/22 semibold · body 17/22 regular · callout 16/21 · subheadline 15/20 · footnote 13/18 · caption1 12/16 · caption2 11/13
  - Amounts use `fontVariant: ['tabular-nums']`
  - `<Text variant="headline">` component — screens use only this
- [x] Colours: exact values from spec/images; iOS semantic tokens (background, secondaryBackground, groupedBackground, label, secondaryLabel, tertiaryLabel, separator, fill, accent) + module colours + 5-level heatmap scale; full light + dark, following system theme
- [x] Spacing 4/8/12/16/20/24/32; radii (cards 16–20, sheets 28+, buttons/chips pill); `borderCurve: 'continuous'`
- [x] Shadows: very soft iOS style (low opacity, large radius), never harsh elevation
- [x] Motion tokens `constants/motion.ts` (Reanimated springs):
  - spring.default `{ damping: 20, stiffness: 220, mass: 1 }` — general UI
  - spring.snappy `{ damping: 18, stiffness: 320 }` — buttons, chips, toggles
  - spring.gentle `{ damping: 26, stiffness: 160 }` — sheets, large transitions
  - spring.bouncy `{ damping: 12, stiffness: 260 }` — success moments
  - durations fast 150 / normal 250 / slow 400 ms; easing `Easing.bezier(0.25, 0.1, 0.25, 1)`

## Phase 3 — Glass (iOS Liquid Glass look)
- [x] One `<GlassSurface>` used for: tab bar, FABs, scrolled nav headers, bottom sheets, toasts, context menus, Quick Add sheet, home widget preview
- [x] `expo-blur` BlurView with Android blur method enabled; intensity + tint per theme
- [x] Layers: translucent tint (white ~55–70% light, black ~35–50% dark), 0.5–1px top-edge highlight border, very soft shadow
- [x] Floating pill tab bar above content with content blurred behind it
- [x] Fallback to solid translucent surface when blur unavailable
- [x] Press: scale 0.96 + highlight brighten with spring.snappy

## Phase 4 — iOS interactions & animations (app-wide)
Reanimated + gesture-handler + expo-haptics.
- [ ] 1. Press feedback: every tappable scales ~0.96 (spring.snappy); no Android ripple
- [ ] 2. Large titles collapse into small centred title in glass header on scroll
- [ ] 3. Push screens slide from right (iOS card) + left-edge swipe-back
- [ ] 4. Bottom sheets: grabber, detents (medium/large), spring.gentle, velocity drag-dismiss, background dims + scales down
- [ ] 5. Tab switch: icon bounce (spring.bouncy) + light haptic; content cross-fade
- [ ] 6. Lists: swipe-to-delete with rubber-band; Layout animations (FadeIn/FadeOut + LinearTransition)
- [ ] 7. Habit tick: square fills next level with pop (1→1.15→1), medium haptic, "+" bounces, streak rolls up
- [ ] 8. Numbers: totals count up / roll (animated tabular digits)
- [ ] 9. To-do check: spring fill, left→right strike-through, light haptic
- [ ] 10. Expense save: sheet dismisses, row slides in, total counts up, success haptic
- [ ] 11. Segmented controls & toggles: sliding thumb, spring.snappy
- [ ] 12. Toast: glass pill from bottom with Undo
- [ ] 13. Long-press context menu (notes, habits): blur bg, card lifts/scales, spring menu
- [ ] 14. Voice recording: mic grows, live waveform bars, timer
- [ ] 15. Respect Reduce Motion: springs → simple fades
- Haptics map: selection → `selectionAsync`; tap/tick → `impactAsync(Light/Medium)`; success → `notificationAsync(Success)`; delete → `Warning`

## Phase 5 — Shared components (before any screen, tokens only)
- [ ] Text · Icon · PressableScale · GlassSurface · Card
- [ ] GroupedList + ListRow · Chip · Button (filled / tinted / plain) · FAB
- [ ] SegmentedControl · Toggle · BottomSheet · NumberKeypad
- [ ] LargeTitleHeader · TabBar · SwipeableRow
- [ ] Heatmap (react-native-svg) + HeatmapSquare · ProgressRing · Checkbox · AnimatedNumber
- [ ] EmptyState · Toast · ContextMenu · VoicePlayer / VoiceRecorder · DatePill · WeekStrip
- [ ] Hidden dev route `app/dev/components.tsx` showing every component in all states (light + dark)

## Phase 6 — Screens (one at a time, in order)
For each screen: (a) re-open design image + UI-ANALYSIS section · (b) build from shared components + tokens, wired to `lib/repos` · (c) compare element-by-element and fix differences · (d) add animations · (e) check light AND dark · (f) `npx tsc --noEmit` + lint, commit `feat(ui): <screen>` · (g) 2-line summary, tick here and in spec.md Progress.

- [ ] 1. Tab bar + app shell
- [ ] 2. Today
- [ ] 3. Quick Add sheet
- [ ] 4. Add Expense sheet (+ Other grid, One-time)
- [ ] 5. Expenses Day / Week / Month
- [ ] 6. Habits list
- [ ] 7. Add Habit sheet
- [ ] 8. Habit Detail
- [ ] 9. Diary day page
- [ ] 10. Diary calendar
- [ ] 11. Notes list
- [ ] 12. Note editor (+ recording state)
- [ ] 13. Settings
- [ ] 14. Empty states, over-budget state, toasts
- [ ] 15. Dark mode pass on every screen

If a screen needs a missing component, add it to shared components (not inside the screen) and to the dev route.

---

## Rules
- Consistency first: same paddings, title styles, card style, motion on every screen.
- No hard-coded values in screens. No Android-looking defaults (ripples, Material switches, default Android headers, sharp elevation).
- Install packages with `npx expo install`.
- 60fps: animations on the UI thread (worklets), memoised list rows.
- Ambiguous design → follow the closest iOS system app (Settings, Notes, Reminders, Health) and note the decision in UI-ANALYSIS.md.
- If context gets long: finish the current screen, commit, and report which screen is next.
- Never commit `design/` images.

## Session log
- 2026-10-23 — Plan saved; `design/` git-ignored; branch `feat/ios-ui`. No git remote configured, so commits stay local until one is added.
