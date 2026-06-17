# Apply Progress: model-profiles-picker-ux

Strict TDD evidence log for `model-profiles-picker-ux`.

## Baseline

- `pnpm test` at start: PASS.
  - Node test suite: 171/171 passing.
  - Runtime harness: exit 0.
- Baseline harness covered the action-first profile flow via `p` then
  `s/l/o/d`, using host `ctx.ui.input`, `ctx.ui.select`, and
  `ctx.ui.confirm`. This slice replaces that host-prompt profile flow with an
  in-panel picker-first flow.

## Phase 0 — Preparation

- [x] 0.1 Re-read proposal/spec/design/tasks; no drift.
- [x] 0.2 Inventoried `SddModelPanel`, `renderProfileMenu`,
      `handleModelsCommand`, and the existing profile harness block around
      `tests/runtime-harness.mjs` lines 1019-1153.
- [x] 0.3 Baseline `pnpm test` recorded above.

## Phase 1 — Tests first (RED) in `tests/runtime-harness.mjs`

Migrated the existing profile harness scenario to drive the picker-first
contract:

- `p` enters profile mode; empty state includes `No profiles found` and
  `Press n to create a profile from current assignments`.
- `n` enters the in-panel name prompt; typed names include `b` to guard free
  text entry; `Enter` saves.
- Load and invalid-load assert alphabetical list behavior and no
  current/active/loaded marker copy.
- `Enter` loads immediately without host selection/confirmation.
- `o` enters in-panel overwrite confirmation and `Enter` confirms.
- `d` enters in-panel delete confirmation and `Enter` confirms.

### RED evidence

`pnpm test` after harness migration failed as expected:

```text
AssertionError [ERR_ASSERTION]: The input did not match the regular expression
/Press n to create a profile/.

Input included the old action-first profile menu copy.
```

This proved the new contract was not implemented yet in
`SddModelPanel.renderProfileMenu()`.

## Phase 2 — Runtime changes in `extensions/gentle-ai.ts` (GREEN)

Implemented the picker-first runtime path:

- `ModelPanelResult` carries `name` for `profile-save` and `filename` for
  selected profile operations.
- `showSddModelPanel()` accepts `{ initialMode }` and can reopen directly in
  `profiles` mode.
- `SddModelPanel` owns profile picker state, profile cursor, in-panel save name
  prompt, overwrite confirmation, and delete confirmation.
- Profile rendering is list-first, shows empty-state save guidance, and does
  not show current/active/loaded markers.
- `Enter` loads the selected profile directly; `n`, `o`, and `d` route through
  in-panel prompts/confirmations.
- Profile operation and error paths reopen with `{ initialMode: "profiles" }`.
- `ctx.ui.select()` is no longer used for profile load/overwrite/delete.

### GREEN evidence

`pnpm test` after runtime implementation and the supervisor-approved minimal
repair: PASS.

- `node --experimental-strip-types --test tests/*.test.ts`: PASS, 171/171.
- `node --experimental-strip-types tests/runtime-harness.mjs`: PASS, exit 0.

The first GREEN attempt failed because fresh command invocations start in the
agents view and profile operation paths were reopening without profiles mode. A
fresh reviewer confirmed the minimal repair: press `p` for fresh harness
invocations, preserve the `load-invalid` phase before mutation, and reopen all
profile operation/error paths in `profiles` mode.

A second fresh review found that lowercase `b` was treated as cancel inside the
save-name prompt, preventing names such as `baseline`. Minimal repair: in the
free-text save-name prompt, `Esc` cancels and printable `b` is accepted as text.
The harness now saves `Daily Baseline / v2` to cover this regression.

## Phase 3 — Verification

- `pnpm test`: PASS after the minimal repairs.
- `lsp_diagnostics` for `extensions/gentle-ai.ts` and
  `tests/runtime-harness.mjs`: PASS, no diagnostics.
- `lens_diagnostics mode=all`: no blocking errors. Remaining findings are
  warnings about existing complexity/duplication in the large extension file.
- `git diff --check`: PASS.
- Runtime/test diff after repair:
  - `extensions/gentle-ai.ts`: 410 changed lines.
  - `tests/runtime-harness.mjs`: 30 changed lines.
  - Total runtime/test: 317 insertions, 123 deletions.

## Stop-rule deviation

The runtime/test diff exceeded the planned ~360 changed-line pause threshold.
The parent paused, ran fresh reviewer audits, received explicit user approval
for the minimal repair, and then continued only with targeted fixes. No broader
UI redesign or helper-layer changes were added.

## Residual risks

- The implementation exceeded the original review workload forecast and should
  receive fresh review before sync/archive.
- The harness scenario covers the main picker-first CRUD path, invalid-load
  safety, empty state, no active marker copy, operation reopen behavior, and
  `b` as printable save-name text. It does not independently assert every
  fine-grained task item as a separate test case.
- `ctx.ui.select`, `ctx.ui.confirm`, and `ctx.ui.input` mocks remain wired on
  `ctx.ui` for compatibility but are unused in the profile flow.
- The picker-first flow reopens the panel in `profiles` mode after profile
  operations. The harness factory is invoked multiple times per command; the
  first invocation drives the phase action and later invocations cancel via
  `\u001b`.
