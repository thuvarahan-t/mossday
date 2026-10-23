# Remaining work — 23 October 2026

Open UI checklist boxes require implementation and phone verification. They do
not mean the corresponding screen is absent.

## Implementation audit

| Area | Evidence | Remaining |
| --- | --- | --- |
| Repositories | `7d66262`; persistent feature repositories | Phone persistence checks |
| Expenses | `293a201`; entry sheets, categories, day/week/month, delete/undo | Design, date picker and gesture checks |
| Habits | `ebb3149`; heatmaps, streaks, detail and past-day changes | Native tick/reminder and inactive-day checks |
| Diary | `1f18c86`; tasks, calendar, carry-over and journal | Native autosave/reorder checks |
| Notes | `a3cd9cd`; search, folders, pin and block editor | Native camera, voice, keyboard and media checks |
| Today / Quick Add | Existing uncommitted implementation | Midnight refresh added; verify live totals and add flows |
| Settings | Existing uncommitted implementation | Appearance, budgets, reminders and ZIP sharing device checks |
| Release | Existing untracked preview APK configuration | EAS project/account setup, APK build and install |

## Next checklist

- [x] Read all project Markdown, inspect branch, upstream, remotes and existing changes.
- [x] Run foundation, recorder, repository and service suites.
- [x] Add tested local-midnight/foreground refresh for Today.
- [x] Fix autosave render-time ref write and service/script lint failures.
- [ ] Compare every Phase 6 screen with its design on mobile in light/dark mode.
- [ ] Verify Phase 4 interactions with Reduce Motion enabled and disabled.
- [ ] Resolve current `app/` versus AGENTS' required `src/app/` layout.
- [ ] Reconcile UI-ANALYSIS decisions with implementation: Today has recent notes
  and a mini chart despite R9; Expenses has a donut despite R7. Diary calendar is
  a mode within DiaryScreen, rather than the separate routes in the analysis.
- [ ] Review and commit pre-existing Today, Settings, notification and UI work in coherent increments.
- [ ] Diagnose local Hermes bytecode export failure; JS-only export is a separate check.
- [ ] Build preview APK with EAS and test on Android.
- [ ] Configure the intended remote/upstream and push validated commits.

## Validation and environment

SDK 58 docs were consulted before API edits. TypeScript, ESLint over source
directories, the four existing suites, and `node scripts/verify-today.cjs` pass.
The new test covers local midnight, resume after multiple days and cleanup.

Node/npm are absent from this shell's PATH; checks used the installed Codex Node
24 runtime directly. Expo lint delegates to unavailable `npx`, so ESLint was run
directly. Metro starts on port 8081. ADB reports no attached devices. Android
export reached Hermes, whose compiler exited unsuccessfully. A subsequent Android
JS export with `--no-bytecode` passed (4,008 modules). This is not an APK
verification. No Git remote or branch upstream is configured.

Pre-existing user edits are preserved. Older session logs describe their original
checkpoints, not today's implementation. Keep screen completion boxes open until
their design and native verification requirements are met.
