This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Continuous validation and Git workflow

- Work in small, complete, reviewable increments. Validate every meaningful change, including small fixes, before moving on.
- Run the relevant automated tests for each increment, plus lint and typecheck before committing. For UI or platform behavior changes, verify the affected flow on the applicable mobile platforms when available. Report any checks that cannot run; never claim unverified work passed.
- Commit frequently with clear messages describing one coherent change. Preserve a detailed, useful project history; do not create empty commits or split unfinished work merely to increase the commit count.
- Before starting, inspect the working tree, current branch, upstream, and remotes. Use the task's established branch; otherwise create a descriptive feature, fix, or documentation branch. Keep unrelated user changes out of commits.
- Push each validated, meaningful commit to the correct branch's configured remote and upstream throughout the task. Verify the destination before the first push, set the upstream for a new branch, and check that the push succeeded. Do not force-push, rewrite shared history, or push directly to a protected/default branch without explicit authorization.
- If no remote is configured or testing/pushing is blocked, finish the safe local work and clearly report the blocker. Do not invent a remote destination or silently skip required checks.

## Code quality and maintainable architecture

- Maintain a production-quality codebase suitable for a growing application. Follow established project conventions and clear module boundaries, and improve structure incrementally as features grow.
- Keep every changed file readable and focused. Use descriptive names, small cohesive functions/components, explicit types at module boundaries, and straightforward control flow.
- Remove unused imports, variables, unreachable code, obsolete helpers, and commented-out implementations in the code being changed. Avoid duplicate logic and unrelated cleanup.
- Keep route files focused on screen composition and navigation. Separate reusable UI, feature logic, hooks, data access, types, and utilities outside the route directory; keep platform-specific behavior isolated.
- Prefer simple, purposeful abstractions. Do not add unnecessary layers, dependencies, or speculative infrastructure just to resemble a large project.
- Add concise explanations where they help: document non-obvious decisions, constraints, public contracts, and workarounds. Explain why code exists rather than narrating obvious statements; update explanations when behavior changes.
- Handle loading, empty, error, and cleanup states where applicable. Preserve accessibility, mobile performance, and cross-platform behavior.
- Review the final diff for correctness, readability, unused code, accidental files, and architectural consistency before each commit. Keep setup and architecture documentation aligned with meaningful changes.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
