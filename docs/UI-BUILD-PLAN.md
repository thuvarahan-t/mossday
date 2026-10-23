# Mossday — UI Build Plan & Checklist

Build the full UI of **Mossday** (Expo, React Native, TypeScript, Expo Router).
Tick each box (`[x]`) only after that part is finished, type-checked and committed.

**Current audit (2026-10-23):** Feature code is ahead of the older session logs.
See [remaining work](REMAINING-WORK.md) for implementation evidence, current
checks, and device/release tasks. Screen boxes remain open pending verification.

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
- [x] Text · Icon · PressableScale · GlassSurface · Card
- [x] GroupedList + ListRow · Chip · Button (filled / tinted / plain) · FAB
- [x] SegmentedControl · Toggle · BottomSheet · NumberKeypad
- [x] LargeTitleHeader (implemented as LargeTitleScreen) · TabBar · SwipeableRow
- [x] Heatmap (react-native-svg) + HeatmapSquare · ProgressRing · Checkbox · AnimatedNumber
- [x] EmptyState · Toast · ContextMenu · VoicePlayer / VoiceRecorder · DatePill · WeekStrip
- [ ] Hidden dev route `src/app/dev/components.tsx` showing every component in all states (light + dark). Route and interactive light/dark galleries implemented; exhaustive device state verification remains.

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
- 2026-10-23 — Recovered the interrupted Phase 5 work on `feat/ios-ui`: committed shared controls, charts/calendars/heatmaps, voice components, widget previews, and the light/dark dev gallery. Added DatePill and interactive recording/playback samples. Fixed recording permission/preparation release races, failed-stop handling, microphone cleanup, safe amount parsing, future timestamp labels, and week-strip selection alignment. Checks passed: TypeScript, Expo lint, foundation/helper tests, mocked recorder lifecycle regression tests, Android JS bundle export. Native audio, accessibility actions, glass appearance, and gesture feel still require a phone check. Phase 4 boxes remain open until interactions are integrated and verified in real screens. **Next: Phase 6 screen 1 (tab bar/app shell verification), then Today; add `lib/repos/` data access before wiring live screen data.** No Git remote is configured, so pushing remains unavailable.
- 2026-10-23 — Plan saved; `design/` git-ignored; branch `feat/ios-ui`. No git remote configured, so commits stay local until one is added.
- 2026-10-23 — Phases 1–3 complete (analysis, tokens, glass + floating tab bar). Verified: `tsc`, `expo lint`, `npm test`, Android JS bundle export. Not verified: on-device look/blur (no device/adb available). **Next: Phase 4** (sheet, large-title header, swipe row, toast, context menu, reduce motion), then Phase 5 components + `src/app/dev/components.tsx`.
