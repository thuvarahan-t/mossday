# Mossday — Product & Technical Spec

> Single source of truth for building Mossday. AI agents: read this file fully before every task, follow it exactly, and update the **Progress** section at the end after finishing a module.

---

## 1. Overview

**Mossday** is an offline-first Android app (built with Expo / React Native) that answers *"How much did I spend today?"* in under 10 seconds, with a GitHub-style habit tracker, a date-based diary with to-dos, and rich notes in the same app.

- **Problem:** Tracking daily spending by hand is tedious; most expense apps ask too many fields for a Rs. 450 lunch. Habits, to-dos and notes then live in three other apps.
- **Core idea:** Logging a meal expense = **2 taps + 1 number** (tap Lunch → type amount → Save). Every common action is one tap away.
- **Target user:** University students / young professionals in Sri Lanka.
- **Currency:** LKR, displayed as `Rs. 1,250` (changeable later in Settings).
- **Platform:** Android (Expo also allows iOS later).
- **Data:** 100% local on the phone. No login, no server.

### Design principles
1. **Speed first** — the most common entry takes 2 taps and one number.
2. **Calm, clean UI** — white space, rounded cards, soft colours, no clutter, no heavy shadows.
3. **Offline & private** — all data stays on the device.
4. **Rewarding** — green heatmaps, streaks, and count-up totals give a small sense of progress.
5. **One-thumb use** — actions at the bottom, information at the top.

---

## 2. Tech stack

| Need | Choice |
| --- | --- |
| Framework | Expo (latest SDK), React Native, TypeScript |
| Navigation | Expo Router (file-based, bottom tabs) |
| Database | `expo-sqlite` |
| Images | `expo-image-picker` (gallery + camera) |
| Voice | `expo-audio` (record + playback, AAC/M4A) |
| Files | `expo-file-system` (store images/voice in app document directory) |
| Heatmap | `react-native-svg` (custom grid) |
| Charts | `react-native-gifted-charts` (bar + donut) |
| Bottom sheets | `@gorhom/bottom-sheet` (or a simple custom Modal sheet) |
| Gestures / animation | `react-native-gesture-handler`, `react-native-reanimated` |
| Haptics | `expo-haptics` |
| Icons | `@expo/vector-icons` (rounded style) |
| Settings storage | `expo-sqlite` key-value table or `@react-native-async-storage/async-storage` |
| Build APK | EAS Build (`eas build -p android --profile preview`) |

Always install Expo packages with `npx expo install <pkg>` so versions match the SDK.

---

## 3. Project structure

```
mossday/
├─ app/                    # Expo Router routes
│  ├─ _layout.tsx          # root: theme, DB init, gesture handler
│  ├─ (tabs)/
│  │  ├─ _layout.tsx       # bottom tabs
│  │  ├─ index.tsx         # Today
│  │  ├─ expenses.tsx
│  │  ├─ habits.tsx
│  │  ├─ diary.tsx
│  │  └─ notes.tsx
│  ├─ habit/[id].tsx       # habit detail
│  ├─ note/[id].tsx        # note editor
│  └─ settings.tsx
├─ components/             # shared UI (Card, Chip, Fab, Sheet, Heatmap, ...)
├─ constants/theme.ts      # colours, spacing, typography
├─ hooks/                  # useTheme, useExpenses, useHabits, ...
├─ lib/
│  ├─ db.ts                # open DB, create tables, seed
│  ├─ repos/               # expenses.ts, habits.ts, todos.ts, notes.ts
│  ├─ date.ts              # local date helpers (yyyy-MM-dd)
│  └─ money.ts             # cents <-> "Rs. 1,250"
└─ SPEC.md
```

---

## 4. Navigation

Bottom tab bar, 5 tabs (icon + label), active tab tinted with its module colour:

| Tab | Icon | Screen | FAB action |
| --- | --- | --- | --- |
| Today | house | Dashboard | Quick Add sheet (Expense / To-do / Note) |
| Expenses | wallet | Day / Week / Month spending | Add expense |
| Habits | grid | Habit list with heatmaps | New habit |
| Diary | calendar | Date page with to-dos + journal | Add to-do |
| Notes | note | Card grid of notes | New note |

Settings opens from a gear icon on the Today screen.

---

## 5. Modules

### 5.1 Today (Home dashboard)
Top to bottom:
1. Greeting + date ("Good evening 👋", "Thursday, 22 Oct") + gear icon.
2. **Spend card (hero):** "Spent today", big total, mini 7-day bar chart, budget progress bar if a budget is set. Three meal chips: Breakfast / Lunch / Dinner — logged ones show ✓ and amount; unlogged show "+" and open the Add Expense sheet with that category preselected.
3. **Habits today:** horizontal row of round tick buttons (emoji, name, progress ring e.g. 5/8). Tap = +1 tick.
4. **Today's to-dos:** first 3–5 items from today's diary, checkable in place, "See all".
5. **Recent notes:** two latest note cards.
6. FAB → Quick Add sheet with 3 big buttons: Expense, To-do, Note.

### 5.2 Expense tracker (main feature)

**Categories**
- **Default meals (always shown first):** Breakfast, Lunch, Dinner. Each remembers `lastAmount` → "Same as last time · Rs. 450" pill.
- **Other:** Snacks/Tea, Transport, Groceries, Bills, Shopping, Education, Health, Entertainment, + **New category** (name, icon, colour).
- **One-time:** for something that fits nowhere — user types a title ("Phone charger") + amount. Saved with `categoryId = null`, `isOneTime = 1`. Does not create a category.

**Add Expense bottom sheet**
1. Large amount display at top; custom number keypad in the bottom half (opens immediately).
2. Category row: Breakfast, Lunch, Dinner as large chips, then "Other ▸" (opens category grid) and "One-time" (reveals a "What was it?" title field).
3. Optional: note, date pill (Today / Yesterday / pick date), payment method (Cash / Card / Online).
4. Full-width green **Save**. Sheet closes, total animates (count-up), haptic feedback.

**Expenses tab**
- Segmented control: **Day | Week | Month**.
- **Day view (default):** date row with ‹ ›, total card with change vs yesterday, entries grouped by category (icon circle, title, time, amount). Swipe left = delete (with Undo snackbar). Tap = edit.
- **Week / Month view:** total, daily average, highest day, bar chart per day (today highlighted), category donut with legend.
- **Insights (computed locally):** e.g. "Food is 62% of this month", "You spent 18% less than last week", "Average lunch: Rs. 420".

**Budget (v1.1):** optional daily & monthly budget; spend card turns amber at 80%, red when over.

### 5.3 Habit tracker (GitHub-style heatmap)

Each habit has a contribution grid: **one square per day**, 7 rows (Mon–Sun), columns = weeks. Each tick that day makes the square a darker green.

| Ticks that day | Level | Light colour | Dark colour |
| --- | --- | --- | --- |
| 0 | 0 | #EBEDF0 | #161B22 |
| 1 | 1 | #9BE9A8 | #0E4429 |
| 2 | 2 | #40C463 | #006D32 |
| 3 | 3 | #30A14E | #26A641 |
| 4+ (or ≥ goal) | 4 | #216E39 | #39D353 |

- If `dailyGoal > 1`, scale levels to the goal: `level = ceil(count / dailyGoal * 4)`, capped at 4 (0 stays 0).
- Days a habit is not active (`activeDays` bitmask) are drawn as hollow squares and don't break streaks.

**Habit card (list):** emoji/icon, name, streak badge "🔥 12 days", round **+** button (tap = +1 tick today with haptic + square fades to the new shade; long-press = undo last tick), compact heatmap of last 16 weeks below. Squares ~10 dp with 3 dp gap, rounded 2 dp.

**Habit detail screen:** full-year heatmap (horizontal scroll), month labels on top, M/W/F labels on left, "Less ▢▢▢▢▢ More" legend. Tap a square → tooltip "Tue, 14 Oct · 3 times" with − / + to edit past days. Stats: current streak, best streak, completion rate, total ticks.

**Add habit sheet:** name, emoji, colour (default green), daily goal stepper, active days (M T W T F S S), optional reminder time.

**Streak rule:** a day counts as done when `count >= 1` (or `>= dailyGoal` if the habit uses "goal mode"). Inactive days are skipped. Past days are editable.

### 5.4 Diary & To-do
A paper-diary page per date; opens on today.
1. **Date header:** "Thursday, 22 October 2026", ‹ › arrows, calendar icon. Week strip (Mon–Sun) below with dots on days that have entries.
2. **Carry-over banner:** "3 tasks left from yesterday — Move to today".
3. **To-do list:** checkbox items, optional time tag, priority flag, strike-through when done, drag to reorder, swipe to delete.
4. **Journal:** "How was today?" text area + mood row (😞 😐 🙂 😄 🤩). Autosave.
5. **Day summary footer (auto):** "Spent Rs. 1,250 · 3 of 4 habits done".

**Calendar view:** month grid; dot = has to-dos; light orange tint = spending level that day.

### 5.5 Notes
A note = **heading + ordered stack of blocks**. Block types:

| Block | Added via | Stored as |
| --- | --- | --- |
| TEXT | Typing | text in `content` |
| IMAGE | Gallery or camera | compressed JPEG in app documents dir, path in `filePath` |
| VOICE | Hold mic to record | M4A file in app documents dir, `filePath` + `durationMs` |
| CHECKLIST | Checklist button | JSON array `[{text, done}]` in `content` |

- **Editor:** big heading field, blocks below; toolbar above keyboard: Aa, image, camera, mic, checklist. Reorder by drag, delete by swipe. Voice block = play button + waveform + duration. Recording state = big red mic, live timer, "Release to save".
- **Notes list:** search bar, folder chips (All, University, Ideas, …), Pinned section then Others, two-column staggered cards (heading, preview line or thumbnail, small icons for voice/checklist), optional pastel card colour. Long-press: pin, colour, folder, delete.
- Deleting a note also deletes its image/voice files.

### 5.6 Settings
Currency, daily & monthly budget, meal reminders (Breakfast 9:00, Lunch 14:00, Dinner 21:00), theme (Light / Dark / System), backup & export (ZIP of DB + media), storage used.

---

## 6. Design system

### Colours
| Role | Light | Dark |
| --- | --- | --- |
| Background | #F7F8FA | #0F1115 |
| Card | #FFFFFF | #1A1D23 |
| Text | #111827 | #F3F4F6 |
| Text secondary | #6B7280 | #9CA3AF |
| Border | #E5E7EB | #2A2E36 |
| Accent (primary) | #22C55E | #22C55E |
| Danger | #EF4444 | #EF4444 |
| Warning | #F59E0B | #F59E0B |

Module colours: **Expenses** #F97316 · **Habits** #22C55E · **Diary** #6366F1 · **Notes** #F59E0B.

### Typography
One rounded sans-serif (Plus Jakarta Sans via `@expo-google-fonts`, fallback system). Sizes: **32** big totals · **20** screen titles · **16** body · **13** captions. Use tabular numbers for amounts.

### Shape & spacing
8-point grid · card radius 16 · card padding 16 · chips fully rounded · bottom sheet top radius 24 · min touch target 48 dp · no heavy shadows (subtle border or very soft elevation).

### Components
Card, Chip (icon + label, filled when selected), FAB, BottomSheet, NumberKeypad, SegmentedControl, Heatmap, ProgressRing, EmptyState (small illustration + one line, e.g. "No expenses today. Nice!"), Snackbar with Undo.

### Interaction rules
- Haptic on habit tick, to-do complete, expense save.
- Totals count up after saving.
- Every delete shows an Undo snackbar.
- All "add" flows are bottom sheets (user never loses context).
- Accessibility: contrast ≥ 4.5:1, labels on icon buttons.

---

## 7. Data model (SQLite)

```sql
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('MEAL','OTHER')),
  sortOrder INTEGER NOT NULL DEFAULT 0,
  isDefault INTEGER NOT NULL DEFAULT 0,
  lastAmount INTEGER
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount INTEGER NOT NULL,              -- cents (Rs. 450 = 45000)
  categoryId INTEGER REFERENCES categories(id),  -- NULL for one-time
  title TEXT,
  note TEXT,
  date TEXT NOT NULL,                   -- local yyyy-MM-dd
  createdAt TEXT NOT NULL,              -- ISO timestamp
  paymentMethod TEXT,                   -- CASH | CARD | ONLINE
  isOneTime INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT NOT NULL DEFAULT '#22C55E',
  dailyGoal INTEGER NOT NULL DEFAULT 1,
  activeDays INTEGER NOT NULL DEFAULT 127,  -- bitmask Mon=1 ... Sun=64
  reminderTime TEXT,
  createdAt TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS habit_logs (
  habitId INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date TEXT NOT NULL,                   -- yyyy-MM-dd
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (habitId, date)
);

CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  text TEXT NOT NULL,
  isDone INTEGER NOT NULL DEFAULT 0,
  time TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  sortOrder INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS diary_entries (
  date TEXT PRIMARY KEY,
  text TEXT,
  mood INTEGER
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL DEFAULT '',
  folder TEXT,
  color TEXT,
  isPinned INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS note_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  noteId INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('TEXT','IMAGE','VOICE','CHECKLIST')),
  content TEXT,
  filePath TEXT,
  durationMs INTEGER,
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

**Seed (first run only):** Breakfast, Lunch, Dinner (MEAL, isDefault=1, sortOrder 0–2); Snacks/Tea, Transport, Groceries, Bills, Shopping, Education, Health, Entertainment (OTHER).

### Rules that prevent bugs
- **Money is always an integer in cents.** Never store floats. Format only at display time.
- **Dates for grouping are local `yyyy-MM-dd` strings**, separate from the `createdAt` timestamp. Never derive the day from a UTC ISO string.
- Habit tick = `INSERT ... ON CONFLICT(habitId, date) DO UPDATE SET count = count + 1`.
- Heatmap data = one query per habit: `SELECT date, count FROM habit_logs WHERE habitId = ? AND date BETWEEN ? AND ?`.
- Media files live in `FileSystem.documentDirectory + 'media/'`; DB stores relative paths.

---

## 8. Build plan (1-day sprint)

| Time | Phase | Done when |
| --- | --- | --- |
| 0–1 h | Setup: Expo project, git, Expo Go running | Default app opens on phone |
| 1–2 h | Foundation: theme, 5 tabs, DB + seed, helpers | 5 themed tabs, DB created |
| 2–5 h | **Expenses**: add sheet (meals / other / one-time), day view, edit/delete + undo, week/month totals, donut | Can log lunch in 2 taps; totals correct |
| 5–7 h | **Habits**: add habit, tick/undo, heatmap with 5 shades, streaks, detail screen | Ticking 3× darkens today's square 3 levels |
| 7–8 h | **Diary**: date page, to-dos, carry-over, journal, day summary | To-dos saved per date |
| 8–10 h | **Notes**: block editor (text, image, voice, checklist), card grid, search, pin | Note with image + voice saved and replayed |
| 10–11 h | **Today** dashboard, dark mode pass, empty states, bug fixes | Dashboard pulls live data |
| 11–12 h | APK via EAS Build, install on phone | APK installed and working |

**Workflow:** one module per prompt → test on phone → `git commit` → next module. Never build everything in one prompt.

### MVP (must have)
Expenses (meal presets, other, one-time, day/week/month), habit heatmap with intensity, diary to-dos + journal, notes with text/image/voice, Today dashboard, dark mode.

### v2 (later)
Budgets & alerts, recurring expenses, reminders/notifications, home-screen widget, CSV/PDF export, backup/restore ZIP, app lock (biometrics), Google Drive sync, voice-to-text.

---

## 9. Rules for AI coding agents

1. Read this SPEC before every task; do only the module asked for.
2. TypeScript strict; no `any` unless unavoidable.
3. All DB access goes through `lib/repos/*` — screens never write SQL directly.
4. Use theme tokens from `constants/theme.ts`; no hard-coded colours in screens.
5. Install packages with `npx expo install`.
6. After each module: run `npx tsc --noEmit`, fix errors, then summarise what changed and how to test it on the phone.
7. Keep components small and reusable (`components/`).
8. Don't add features outside the current module or outside this spec without asking.
9. Update the Progress checklist below when a module is complete.

---

## 10. Progress

See [remaining work](docs/REMAINING-WORK.md) for current evidence. Expenses, Habits,
Diary and Notes have implementation commits; Today and Settings have working-tree
implementations. Their boxes remain open pending end-to-end phone verification.

- [ ] Setup (Expo project, git, Expo Go)
- [x] Foundation (theme, tabs, DB, helpers)
- [ ] Expenses module
- [ ] Habits module
- [ ] Diary module
- [ ] Notes module
- [ ] Today dashboard
- [ ] Polish (dark mode, empty states, haptics, undo)
- [ ] APK build
Foundation verification: TypeScript and SQLite/helper checks passed. Expo Go installation and phone smoke test remain manual.
