# Design: model-profiles-picker-ux

## Overview

Implement a focused picker-first profile flow inside the existing `/gentle:models` overlay. The runtime change should stay centered on `extensions/gentle-ai.ts`, reusing `lib/model-profiles.ts` for listing, reading, writing, deleting, filename safety, profile storage path, and model routing export envelope. Do not change profile file format, `~/.pi/gentle-ai/model-profiles/`, `~/.pi/gentle-ai/models.export.json`, or broader model/effort assignment behavior.

Inspected runtime/test files for design: `extensions/gentle-ai.ts`, `lib/model-profiles.ts`, and `tests/runtime-harness.mjs`.

## Current shape

- `SddModelPanel` already has `agents`, `models`, `effort`, and `profiles` modes.
- Profile mode is currently action-first: it renders a static profile summary and emits `profile-save`, `profile-load`, `profile-overwrite`, or `profile-delete`; the command handler then uses `ctx.ui.select()` for load/overwrite/delete.
- `listModelProfiles()` already returns safe regular files sorted alphabetically by filename.
- Profile helpers already preserve the envelope `{ kind, version, agents }` and reject invalid/unsafe profile input.

## Implementation approach

1. Extend the panel result contract so profile operations carry picker input:
   - `profile-save` becomes `{ type: "profile-save"; config; name: string }` after an in-panel name prompt;
   - selected operations become `{ type: "profile-load" | "profile-overwrite" | "profile-delete"; config; filename: string }`.
2. Add an optional `initialMode` to `showSddModelPanel()`/`SddModelPanel` so the command loop can reopen directly in `profiles` after profile operations and prompt cancellation.
3. Replace `renderProfileMenu()` with a real picker list:
   - show title and concise instructions;
   - render `profileNames` in existing alphabetical order with a cursor marker only for keyboard focus;
   - do not render any current/matching-profile marker;
   - show an empty state: `No model profiles found` plus `Press n to create a profile from current assignments`.
4. Add `profileCursor` and `profilePrompt` panel state. Support `j/down`, `k/up`, optional `g/G`, and keep the cursor clamped when the list is empty.
5. Handle keys in profile picker state:
   - `Enter`: if a profile is selected, emit `profile-load` with that filename immediately; no confirmation.
   - `n`: enter in-panel save-name prompt.
   - `o`: if a profile is selected, enter in-panel overwrite confirmation.
   - `d`: if a profile is selected, enter in-panel delete confirmation.
   - `Esc` or `b`: return to `agents` mode only from the picker.
   - `Ctrl+C`: cancel the whole overlay, preserving existing behavior.
6. Handle secondary prompt keys in the panel:
   - save-name prompt captures printable characters and backspace; `Enter` emits `profile-save` with the typed name; `Esc` returns to the picker without saving; printable characters, including `b` and `n`, remain text input;
   - overwrite/delete confirmations accept `y`/`Enter` to emit the operation and `n`/`Esc`/`b` to return to the picker without changing files.
7. Move load/overwrite/delete selection responsibility out of `ctx.ui.select()` and into the picker. In `handleModelsCommand`, resolve `result.filename` against a fresh `await listModelProfiles()` before acting. If the file no longer exists, notify and reopen the panel with `initialMode: "profiles"`.
8. Confirmation behavior:
   - Load: remove the existing load confirmation so `Enter` applies the selected valid profile immediately.
   - Overwrite: use the in-panel confirmation before emitting the overwrite result; command handler still writes with `writeModelProfileFile()` only after the confirmed result.
   - Delete: use the in-panel confirmation before emitting the delete result; command handler still deletes only after the confirmed result.
   - Save: use the in-panel name prompt; keep the existing collision safety by detecting a colliding safe filename in the command handler and reopening an in-panel overwrite-save confirmation or, if keeping that as a host confirm, reopen directly to `profiles` when declined.
9. Keep successful operations reopening `/gentle:models` with refreshed profile names via the existing command loop calling `showSddModelPanel(ctx, config, { initialMode: "profiles" })` after each operation.

## State model and navigation

Panel state remains localized to `SddModelPanel`:

- `agents`: normal model/effort assignment view. `p` enters `profiles`; `Esc` cancels as today.
- `profiles` + `profilePrompt: "picker"`: picker-first profile list. `Esc`/`b` returns to `agents`. `Enter` emits load; `n`/`o`/`d` enter secondary prompt states.
- `profiles` + `profilePrompt: "save-name"`: captures a profile name. `Enter` emits save when non-empty; printable characters, including `b` and `n`, are text input; `Esc` backs out one level to the picker without saving.
- `profiles` + `profilePrompt: "overwrite-confirm"`: shows selected filename and current-assignment overwrite warning. Confirm emits overwrite; `Esc`/`b`/`n` backs out to picker.
- `profiles` + `profilePrompt: "delete-confirm"`: shows selected filename and delete warning. Confirm emits delete; `Esc`/`b`/`n` backs out to picker.
- Optional `profiles` + `profilePrompt: "save-overwrite-confirm"`: used only if a save name maps to an existing file and the implementation chooses to keep collision confirmation inside the panel. Confirm emits save; `Esc` backs out to the picker.

This explicit one-level prompt state avoids relying on host `input/select/confirm` behavior for `b` and guarantees secondary prompt cancellation returns to the profile picker, not the agents list.

## Empty state

When `profileNames.length === 0`, profile mode renders no selectable profile rows and advertises `n`. `Enter`, `o`, and `d` are no-ops in the panel for an empty list. The command handler may keep defensive no-profile checks for stale races, but normal empty-state UX should not leave the picker to show a warning.

## Compatibility guarantees

- Continue using `listModelProfiles()`, `readModelProfile()`, `writeModelProfile()`, `writeModelProfileFile()`, and `deleteModelProfile()`.
- Do not change `buildModelProfileEnvelope()`, `MODEL_EXPORT_KIND`, `MODEL_EXPORT_VERSION`, or `modelProfilesDir()`.
- Do not migrate existing profile files.
- Do not change `x` export or `r` restore paths/semantics for `~/.pi/gentle-ai/models.export.json`.
- Do not mutate named profiles from `x`/`r` unless a profile operation is explicitly chosen.

## Strict TDD test strategy

Use `pnpm test` for RED/GREEN evidence. Add/update focused assertions in `tests/runtime-harness.mjs` around the existing `/gentle:models` profile flow; helper-level profile format/storage tests should remain in `tests/model-profiles.test.ts` unless a regression is discovered.

RED expectations before implementation:

1. Picker-first render test fails because profile mode still shows action-first text and does not expose selected-row `Enter` load.
2. Alphabetical list/no-current-marker test fails if existing render lacks cursor navigation expectations or shows only a static list.
3. `Enter` load test fails because current flow emits `profile-load` without filename and requires `ctx.ui.select()` plus load confirmation.
4. Delete confirmation test fails until `d` carries the selected filename from the picker and command handler confirms/deletes it.
5. Empty-state test fails until copy explicitly says creating with `n` is available and `Enter`/`o`/`d` are no-ops.
6. Back behavior test fails until `b` and `Esc` are asserted for profile picker and in-panel secondary prompt cancellation.

GREEN expectations after implementation:

- Existing profile CRUD integration still passes and verifies envelope/path compatibility.
- New picker tests verify alphabetical filename order, no current-profile marker, selected-profile `Enter` immediate load, `n` new, `o` confirmed overwrite, `d` confirmed delete, empty state, and `Esc`/`b` one-level back.
- Existing export/restore assertions continue to prove `models.export.json` is independent from named profiles.
- Full `pnpm test` passes.

## Review workload forecast

Expected implementation should remain within the 400 changed-line review budget:

- `extensions/gentle-ai.ts`: roughly 80-140 changed lines for result typing, profile cursor/list rendering, key handling, and command handler filename plumbing.
- `tests/runtime-harness.mjs`: roughly 120-180 changed lines for focused RED/GREEN profile picker scenarios.
- No expected changes to `lib/model-profiles.ts` or docs/specs during apply.

Forecast total: ~200-320 changed lines. If command-handler prompt cancellation requires a larger modal abstraction or broad overlay redesign, pause before apply and split the work.

## Tradeoffs and rejected alternatives

- Rejected keeping load confirmation: the approved spec requires `Enter` to load immediately, so safety relies on existing profile validation and warning on invalid profiles.
- Rejected adding a current-profile marker: matching active config to an on-disk profile is ambiguous and explicitly out of scope for this slice.
- Rejected closing the picker after operations: keeping it open supports continued profile work and matches the proposal; users exit with `Esc`/`b`.
- Rejected retaining `ctx.ui.select()` for load/overwrite/delete: it preserves action-first behavior and prevents `Enter` from being a direct picker load.
- Rejected profile format/storage migrations: no compatibility need and higher regression risk.
- Rejected broader `/gentle:models` layout redesign: the slice should only replace profile entry/list behavior.

## Rollout

Single small PR after tasks/apply approval. Implement tests first under strict TDD, then runtime changes, then run `pnpm test`. Manual smoke is optional but useful: open `/gentle:models`, press `p`, navigate profiles, test `Enter`, `n`, `o`, `d`, `Esc`, and `b`.
