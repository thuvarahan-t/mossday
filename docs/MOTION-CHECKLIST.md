# Motion acceptance

Motion uses `constants/motion.ts` and Reanimated shared values. Static content
stays still; interaction and data changes provide feedback. A compiled bundle
does not establish visual quality or frame rate.

| Element | Implemented behaviour | Device acceptance |
| --- | --- | --- |
| Buttons, chips, rows, FAB and days | Shared spring press feedback, no ripple | Rapid/cancelled presses recover cleanly |
| Colour/day/mood pickers | Selection ring, colour or opacity transition | Light/dark selections remain legible |
| Input fields | Animated focus border | Keyboard focus does not shift the field |
| Segments/toggles | Spring thumb | Repeated changes remain smooth |
| Tab bar/scenes | Sliding highlight, one icon bounce, haptic and focus fade | No repeated bounce on data writes |
| Large titles | Scroll-driven glass header fade | Track finger without clipping |
| Push navigation | iOS card slide and edge-back | Cancel back gesture without blank content |
| Sheets | Spring open, detents, velocity close, scrim and presenter recession | Save/Cancel finish exit; nested forms restore presenter |
| Quick Add | Dismiss before replacing sheet/opening note | No leftover modal or blocked screen |
| Feature lists | Entry, exit and layout animation | Delete/Undo/reorder retain identity |
| Numbers | Tabular digit roll | Totals retain line height |
| Spending bars | Animate from current heights | Unrelated renders do not replay chart |
| Habit ticks | Button/square pop, colour transition, rolling streak | Fast taps preserve counts and settle at scale 1 |
| To-do/checklist | Fill and strike-through | Repeated toggles match saved state |
| Context menu | Card lift, blur and spring menu | Dismiss/reopen without stale overlay |
| Undo toast | Glass pill presentation/dismissal | Action operates once |
| Voice recorder | Mic feedback, metered waveform and timer | Release during setup, slide cancel, leave while recording |
| Reduce Motion | Fades or immediate updates; no decorative roll/pop/scale | Repeat with OS preference enabled |

All device acceptance cells remain pending. Check interrupted animations, large
font sizes, small displays, background/resume, both themes and screen readers.
Native haptics, blur quality and 60fps require device evidence.
