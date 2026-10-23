# Mossday

Offline Android app built with Expo, React Native, TypeScript, and Expo Router.
The foundation includes five title-only tabs, system light/dark themes,
local SQLite storage, 11 first-run expense categories, and date/money helpers.

## Run

Install Node.js LTS, then run `npm install` and `npx expo start`.
Install Expo Go on Android, connect the phone and laptop to the same Wi-Fi,
and scan the terminal QR code from Expo Go. If LAN fails, run
`npx expo start --tunnel`.

## Structure

```text
app/           Root layout and five bottom-tab routes
components/    Shared UI
constants/     Theme tokens
hooks/         System theme hook
lib/           SQLite initialization, local date and money helpers
spec.md        Product specification and progress
```

`mossday.db` lives in the app's private storage on the phone. The schema and
11 default categories initialize atomically once, tracked by SQLite's
`user_version`. Restarting preserves data and never reseeds deleted categories.
Future screen data access goes through `lib/repos/` repositories.
Amounts are integer cents; `formatMoney(125000)` returns `Rs. 1,250`.

## Verify

Run `npx tsc --noEmit` and `npx expo-doctor`.
On a phone, verify all five tabs and change Android's light/dark setting.
The app should reopen offline without a second seed or a loading hang.
Full expense, habit, diary, and note features are future modules.

Run `npm test` for SQLite migration, seed persistence, foreign key, cascade, local date, and money checks.

Dependency audit: the generated SDK 58 dependency tree reports 19 high-severity advisories. npm proposes incompatible Expo/React Native downgrades; these have not been applied. Review compatible upstream fixes before release.
