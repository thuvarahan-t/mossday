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
The add expense sheet has a Daily / Monthly switch in its header and opens on Monthly
from the Month tab. Monthly has the same layout as Daily, with Electricity, Water and
Rent in place of the meals, and Groceries, Internet, Phone and others under Other.
The mode is saved with each expense. Monthly bills appear only in Month, in their own
list that supports edit, swipe-delete and Undo. They are payments for that month, with
no automatic recurrence, and count towards the month's total and budget but never a
day's: Day, Week, Today, the Diary summary, the daily budget and the daily chart leave them out.
Swipe left on Expenses to move Day → Week → Month and right to move back (past either
end, on to the next tab); the view slides out and the next slides in once its data is ready. The ‹ › arrows and
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
tracker, or grab the outlined day and drag it, to tick that day instead (the line under
the habit's name says which day). The detail screen works the same way. Quick controls always apply to today: taps count up to the
daily goal, then back down to empty, then up again (0, 1, 2, 3, 2, 1, 0, 1 for a
goal of 3). The visible Undo action, or holding the check, also removes one. Habit colours apply to cards, tracker cells, progress rings
and Today badges in both themes.
Hold a habit's name and drag to reorder the cards, like categories; holding
without dragging opens Edit / Archive / Delete. Archived habits appear under
"Archived habits" at the end of the list, where Restore returns them to their old place. The order persists (`habits.sortOrder`,
schema v5), new habits append, and accessibility actions move a habit up or down.

Diary dates: the strip under the title scrolls freely by day (any seven days, not
Monday–Sunday pages). The day row stays fixed under the title when scrolling and
never folds away. Drag it down to expand the month underneath it;
drag up, pick a day, or tap the grabber to fold just the month back. The month shows to-do dots and
each day's journal mood beside its date (the badges pop in as the month opens; the
selected day's one animates); swipe it left for the next month and right for the previous one, or
use its ‹ › arrows.

Notes show as a two-column masonry grid (Pinned, then Others): each card is as tall as
its photo, title and first lines, and joins the shorter column. Hold a card and drag
up, down or sideways to reorder it within Pinned or Others; neighbours glide aside
and a dashed placeholder marks the drop. Holding near the screen edges scrolls the
list. Release to save; cancel to restore. Ordering survives restarts and edits, and
folder/search reorders preserve hidden notes' slots (`settings.noteOrder`). New notes
appear first. Hold and release without moving for Pin, Folder, Colour and Delete.
Tap opens the note; Colour opens the full palette, including a plain-card option.
Accessibility actions also move notes earlier or later. Every main tab has
a green circular add button fixed above the right end of the bottom tab bar.
Diary adds an inline task, Habits opens New habit, and Today opens Quick add.

Inside a note, content lives on a free-position canvas with no boxes or handles.
Touch blank space and the cursor appears at the left edge of that line, or add a
photo, audio recording or checklist from the toolbar. An empty line that has the
cursor becomes the insertion point for media. Hold a photo, audio clip or drawing to
pick it up and drag it anywhere (it then shows a delete button until the next touch
on blank space); whatever it lands on moves down out of its way, live, and text that
grows does the same. Pinch a photo or drawing to resize it; tap a photo to open it,
where pinch or double tap zooms. Text keeps its long press for selection. Dragging
near the viewport edge scrolls the page, and the cursor always scrolls above the keyboard.

Select words in a text block and the toolbar becomes a format bar: bold, underline,
strikethrough, highlight and text colour. Formatting stays on its words as the text
around it changes (`note_blocks.spans`, schema v10) and carries through Undo, copies,
shared images and PDFs.

The pen draws directly on the page. Its tools (pen, marker, highlighter, eraser and
inks) expand above the toolbar's pen button and go away when any other tool is
chosen. One finger draws and two scroll. Each round of drawing becomes one block
cropped to its strokes, floating over the page so it can mark up text, which moves
and pinches like a photo. Undo in the header covers strokes too.
Positions and image proportions persist in `note_blocks.layout` (schema v7),
including after Undo, copying and delete/restore. Old notes retain their vertical
order until arranged. Horizontal fractions adapt the composition to phone width;
photos fit inside their frames without cropping.

Tab swipes follow the tab bar's order (components/navigation/tabs.ts): swipe left for the
tab on the right and right for the one on the left, anywhere on the page including its
blank space, on Habits, Today, Diary (below the dates) and Notes. Expenses swipes through Day → Week → Month first, then on to Today past
Month, or back to Habits past Day.
Changing tabs slides the page content, never the share and settings actions or the
floating add button, which stay fixed. It takes the old content out and brings the destination in from its
side of the tab bar. Swipes must cover about 38% of a phone's width (bounded to
120–180 pt); quick short flicks and canceled gestures never switch pages.

Share (on every tab, and in a note's menu) asks for PDF, Text or Image, plus Audio when
there are recordings. Audio sends only the recordings: one as itself, several as a ZIP,
because the system share sheet takes one file at a time. A note's PDF is a real document
with its text, photos and drawings; other PDFs are the page's share card.

To-dos (Diary and Today share one list): tap a task to open its edit sheet directly,
or hold and drag to reorder it live; swipe left to delete. The edit sheet has a red
delete icon beside Save, with Undo after deletion. In Diary, Add to-do (or the header
plus) inserts a focused typing row at the bottom. Keyboard Next saves it and keeps
the cursor ready for another; leaving the field or screen also saves nonempty text.
Empty drafts are discarded and failed saves keep the draft for retry. The
order is saved per day, so Today shows the Diary's order. Done to-dos always sit below
open ones, and a ticked one strikes through before gliding down.

Habit emoji are Microsoft's Fluent Emoji 3D images, bundled in `assets/emoji/` (MIT, see
its LICENSE) so iPhone and Android look the same; Apple's own emoji cannot be shipped in
an app. Diary moods use Google's Noto Emoji Animation (CC BY 4.0, credited in Settings):
the chosen mood animates (`assets/emoji-animated/`, via expo-image) over a glow in its
colour, and the others show still frames. Adding expo-image needs a new development build. Add a new choice there and in
`components/ui/emojiAssets.ts`; anything unmapped falls back to the system font.

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
