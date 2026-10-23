# Mossday

Offline Android app built with Expo, React Native, TypeScript, and Expo Router.
Includes feature tabs, local SQLite storage, expenses, habit heatmaps, diary tasks
and journal, and notes with photo and voice blocks. Today and Settings are wired
to local data. See [remaining work](docs/REMAINING-WORK.md) for verification status.

## Run

Install Node.js LTS, then run `npm install` and `npx expo start`.
Install Expo Go on Android, connect the phone and laptop to the same Wi-Fi,
and scan the terminal QR code from Expo Go. If LAN fails, run
`npx expo start --tunnel`.

## Structure

```text
src/app/           Root layout and five bottom-tab routes
components/    Shared UI
constants/     Theme tokens
hooks/         System theme hook
lib/           SQLite initialization, local date and money helpers
spec.md        Product specification and progress
```

`mossday.db` lives in the app's private storage on the phone. The schema and
11 default categories initialize atomically once, tracked by SQLite's
`user_version`. Restarting preserves data and never reseeds deleted categories.
Screen data access goes through `lib/repos/` repositories.
Amounts are integer cents; `formatMoney(125000)` returns `Rs. 1,250`.
First launch asks for a currency (Skip keeps Rs.); Settings → Currency changes it
later. Only the label changes; saved amounts are never converted.
Expenses shows the month's budget as a progress line on every period; tapping it
(or the daily budget bar) opens one Budget sheet with a Daily / Monthly switch. The
"a day" average divides by days that have at least one expense, not by calendar days.
Swipe left on Expenses to move Day → Week → Month and right to move back; the
view slides out and the next slides in once its data is ready. The ‹ › arrows and
the tappable date label change the date.
In Add Expense → Other, categories use a compact sheet. Long press and drag a
tile to reorder it; nearby tiles shift live and a dashed placeholder marks the
drop position. Releasing saves the order; canceling restores it. The order
persists across restarts. Accessibility actions
also move categories earlier or later. New categories append to the saved order.
Long press without dragging to open the same context menu used for expenses.
Edit changes a category's name and colour. User-created categories also have
a red Delete action. Deletion hides it from
the picker while preserving old expenses; Undo
restores it. Built-in categories cannot be deleted.

Habits shows one Year tracker per card, opened on the current week, with
previous-year navigation. Each card ticks today by default; tap a past day on its
tracker, or grab the outlined day and drag it, to tick that day instead (the caption
above the check names it). The detail screen works the same way. Quick controls always apply to today: taps count up to the
daily goal, then back down to empty, then up again (0, 1, 2, 3, 2, 1, 0, 1 for a
goal of 3). The visible Undo action, or holding the check, also removes one. Habit colours apply to cards, tracker cells, progress rings
and Today badges in both themes.
Hold a habit's name and drag to reorder the cards, like categories; holding
without dragging opens Edit / Archive / Delete. Archived habits appear under
"Archived habits" at the end of the list, where Restore returns them to their old place. The order persists (`habits.sortOrder`,
schema v5), new habits append, and accessibility actions move a habit up or down.

To-dos (Diary and Today share one list): hold a to-do and release for Edit / Delete,
or hold and drag to reorder it live; tap its text to edit, swipe left to delete. The
order is saved per day, so Today shows the Diary's order. Done to-dos always sit below
open ones, and a ticked one strikes through before gliding down.

## Verify

Run `npx tsc --noEmit` and `npx expo-doctor`.
On a phone, verify all five tabs and change Android's light/dark setting.
The app should reopen offline without a second seed or a loading hang.
Verify expense, habit, diary and note flows on the phone before release.

## UI development checkpoint

The shared UI library and development gallery are implemented on `feat/ios-ui`.
Open `mossday://dev/components` in a running development build to inspect light/dark
controls, charts, sheets, and recording/playback samples. The gallery redirects
to the home screen in production. Device appearance and native gestures still
need a phone check; automated checks do not establish visual fidelity.

Continue screen work using [the UI build plan](docs/UI-BUILD-PLAN.md). The app shell
and Today screen are committed; phone verification remains pending.
No Git remote is configured, so commits are currently local.

Run `npm test` for SQLite migration, seed persistence, foreign key, cascade, local date, and money checks.
It also covers keypad limits, heatmap levels, and mocked voice recorder lifecycle
regressions (release during setup, save/cancel, stop failure, and unmount).

Run `npm run lint` and `npm run typecheck` before committing. Tests also cover
backup/reminder services, photo cleanup, midnight refresh and sheet sequencing.
Use [the motion checklist](docs/MOTION-CHECKLIST.md) for device acceptance.

## Android preview APK

Run `npx eas-cli@latest login`, then `npx eas-cli@latest init` to link your Expo
project, and `npx eas-cli@latest build --platform android --profile preview`.
The checked-in `eas.json` requests an APK; production requests an AAB.
EAS is currently not logged in; no cloud build or APK install has been verified.

Dependency audit: the generated SDK 58 dependency tree reports 19 high-severity advisories. npm proposes incompatible Expo/React Native downgrades; these have not been applied. Review compatible upstream fixes before release.
