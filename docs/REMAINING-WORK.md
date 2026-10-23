# Remaining work — 23 October 2026

Implementation is committed in focused increments on `feat/ios-ui`. Screen
acceptance still includes device checks; the UI plan keeps those boxes open.

## Completed implementation

- [x] Repositories, serialized writes, query indexes and safe category migrations.
- [x] Today live totals, budget states, meals, habit rings, tasks and Quick Add.
- [x] Expense entry/edit, presets, one-time entries, category grid, day/week/month and Undo.
- [x] Habit list, tick/undo, heatmaps, detail, historical edits, streaks and reminders.
- [x] Diary tasks, reorder, carry-over, calendar, journal and mood autosave.
- [x] Notes search, pin/folder/colour, text/image/voice/checklist blocks and media cleanup.
- [x] Settings budgets, appearance, meal reminders, ZIP backup and storage.
- [x] Shared motion pass: selections, focus, charts, lists, sheets, tabs, numbers,
  habit feedback, context menus, toast and Reduce Motion handling.
- [x] Routes moved to `src/app/` as required by AGENTS.md.
- [x] Today and expense category bars follow UI analysis R7/R9.
- [x] Native time and category controls added to the light/dark gallery.
- [x] Six test suites, strict TypeScript and source lint pass.
- [x] Expo Doctor reports 20/20 checks passed.
- [x] Android and iOS production Hermes bundles compile.
- [x] Four Inter weights are bundled instead of the entire family.
- [x] Design fidelity pass against `design/*.png` using seeded data in a 393 pt
  web preview: Expenses day/month (category tiles, hero header, chart labels),
  Add Expense options bar, habit tick states, habit detail layout, Add Habit
  grouped form, diary carry-over row and calendar view, section spacing and
  Settings rows. Web preview renders list items without layout animations.

- [x] Android emulator pass (AVD `Small_Phone`, 360×640 dp, Expo Go 58.0.5): expense
  add/edit/swipe-delete/Undo, habit add/tick/long-press undo/context-menu delete,
  to-do add/check/delete/Undo, journal autosave, note create/type/empty-note cleanup,
  daily budget → Today bar. Fixed on device: tab scenes splitting the screen height,
  sheets/keypad overflowing short screens, keyboard covering the note toolbar and
  journal, context-menu offset, truncated tab labels, clipped heatmap column.

## Release and device checklist

- [ ] Note editor and recording state were not compared in the web preview;
  compare them with `K · Note editor.png` / `K · Recording.png` on a phone.

- [ ] Compare every Phase 6 screen with its design on mobile in light/dark mode.
- [ ] Run the [motion acceptance checks](MOTION-CHECKLIST.md) on a device.
- [ ] Verify camera, audio, permissions, keyboard and media ownership on device.
- [ ] Verify reminders arrive and reschedule after edits, archive/delete and restart.
- [ ] Share a ZIP from a device and inspect its database and media files.
- [ ] Log in to EAS, link the project and build/install the preview APK.
- [ ] Configure the intended Git remote/upstream and push validated commits.

## Environment evidence

EAS CLI `whoami` returns **Not logged in**. No Git remote/upstream is configured.
The `Small_Phone` AVD (Android 37) is available; boot it with `-memory 4096` because
Expo Go 58 is killed for low memory at the default 1 GB.
Computer-use inventory reports no browsers or app windows, so visual/native flow
verification cannot be claimed in this session.

The earlier Hermes error was sandbox execution denial. Running the installed
compiler/export with execution permission succeeds. Outputs are ignored under
`dist/`; they are bundles, not installable APKs.

Node/npm were absent from PATH. The installed Codex Node 24 runtime and official
npm CLI obtained via Corepack run the project commands. Temporary CLI shims and
caches remain ignored inside `.expo/`. Lint explicitly covers all source and
verification directories, with zero warnings allowed.

Tests cover migrations/seed preservation, money/date helpers, repository CRUD and
rollback, concurrent ticks, streaks, carry-over/reorder, journal and note blocks,
recorder lifecycle, reminder reconciliation/permissions, ZIP/media ownership,
photo-buffer cleanup, midnight refresh and sheet dismissal sequencing.
