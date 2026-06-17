# Tasks: model-profiles-picker-ux

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~200-320 (extensions/gentle-ai.ts ~80-140; tests/runtime-harness.mjs ~120-180) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

```text
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low
```

Forecast rationale (from design):

- `extensions/gentle-ai.ts`: ~80-140 changed lines for `ModelPanelResult`
  shape (filename/name on selected ops), `profileCursor`/`profilePrompt`
  panel state, picker list rendering replacing `renderProfileMenu()`,
  key handling for `Enter`/`n`/`o`/`d`/`Esc`/`b`/`Ctrl+C`, and command
  handler plumbing (resolve `result.filename` against a fresh
  `listModelProfiles()`, optional `initialMode` reopen).
- `tests/runtime-harness.mjs`: ~120-180 changed lines for focused
  RED/GREEN profile picker scenarios (see TDD strategy below).
- No expected changes to `lib/model-profiles.ts` or to docs/specs during apply.

Stop rule: If, during apply, the diff against `extensions/gentle-ai.ts`
plus `tests/runtime-harness.mjs` approaches ~360 changed lines, OR the
command handler prompt cancellation requires a larger modal abstraction
beyond `profilePrompt` sub-states, pause and contact the supervisor
(`reason: "need_decision"`) before continuing. Do not silently expand
scope.

## Strict TDD sequencing

`pnpm test` is the canonical RED/GREEN/TRIANGULATE/REFACTOR evidence
command (see `openspec/config.yaml` `apply.test_command` and
`verify.test_command`). Every test in this change is added first and
must fail before its corresponding runtime change is written; both
failures and passes must be captured in the apply-phase log.

Order per behavior unit:

1. RED: add the focused assertion(s) in `tests/runtime-harness.mjs`
   (and/or `tests/model-profiles.test.ts` if a helper regression is
   uncovered) and run `pnpm test` to capture the failing run.
2. GREEN: make the minimum runtime change in `extensions/gentle-ai.ts`
   (helper layer untouched) and run `pnpm test` to capture the passing
   run.
3. TRIANGULATE: add the next assertion that pins down a closely related
   case (e.g., empty-state copy after picker render; overwrite warning
   copy after delete confirmation) and run `pnpm test`.
4. REFACTOR: only after GREEN+TRIANGULATE, tighten naming/types/
   duplicated rendering; rerun `pnpm test`.

Apply-phase log must include, per task, the exact `pnpm test` line(s)
that prove RED and GREEN.

---

## Phase 0 — Preparation (no edits)

- [x] 0.1 Re-read `openspec/changes/model-profiles-picker-ux/proposal.md`,
      `specs/model-routing/spec.md`, and `design.md`; confirm no
      spec/design drift before writing any test.
- [x] 0.2 Inventory the current `/gentle:models` profile flow in
      `extensions/gentle-ai.ts` (`ModelPanelResult`, `SddModelPanel`,
      `renderProfileMenu`, profile branches in `handleModelsCommand`)
      and `tests/runtime-harness.mjs` profile block (around lines
      1019-1153) so RED expectations are anchored to existing behavior.
- [x] 0.3 Confirm `pnpm test` runs cleanly on the current tree as a
      baseline; record baseline output before any RED commits.

## Phase 1 — Tests first (RED) in `tests/runtime-harness.mjs`

Goal: add focused assertions for every behavior the delta spec adds.
Each task is RED until the matching runtime task in Phase 2 is done.

- [ ] 1.1 **Picker-first render** — Add an assertion that, after
      `panel.handleInput("p")`, `panel.render(100)` shows the
      alphabetical profile filenames as a selectable list (not the
      action-first summary). Cover at least two pre-existing profiles
      and assert the rendered filenames appear in alphabetical order.
      RED evidence: `pnpm test` fails with a regex mismatch (current
      render shows action-first copy).
- [ ] 1.2 **No current/matching profile marker** — Add an assertion
      that the picker render does not include a "current" or "active"
      marker for any profile, even when a profile's assignments equal
      `config`. RED evidence: `pnpm test` fails until marker copy is
      removed.
- [ ] 1.3 **Empty state copy** — Add an assertion that, with no
      profiles on disk, `panel.render(100)` after `p` matches
      `/No profiles found/` AND `/Press n to create a profile/`.
      RED evidence: `pnpm test` fails on the "Press n..." copy until
      the picker advertises `n` in empty state.
- [ ] 1.4 **`Enter` loads immediately without confirmation** — Add
      an assertion that, with a valid selected profile, pressing
      `Enter` resolves the panel with `{ type: "profile-load", filename }`
      on the first panel mount (no extra `ctx.ui.confirm` and no extra
      `ctx.ui.select` for load). Assert `ctx.ui.confirm` is NOT called
      for load. RED evidence: `pnpm test` fails because current flow
      still requires a load confirmation/select round.
- [ ] 1.5 **`Enter` on invalid profile is rejected safely** — Add
      an assertion that loading a profile whose file does not contain
      a valid envelope results in a notification matching `/invalid/i`,
      leaves `models.json` unchanged, and reopens the panel. RED
      evidence: `pnpm test` fails until invalid-load rejection +
      reopen logic exists.
- [ ] 1.6 **`n` creates with in-panel name prompt** — Add an assertion
      that pressing `n` enters a name prompt in the panel (no separate
      `ctx.ui.input` for the name), accepts a typed name, and emits
      `{ type: "profile-save", name }`; verify the resulting file uses
      the existing envelope (`kind === "gentle-pi.agent_model_routing"`,
      correct `agents`) and is written under
      `~/.pi/gentle-ai/model-profiles/`. RED evidence: `pnpm test`
      fails until the in-panel name prompt exists and the command
      handler resolves `result.name` to a safe filename.
- [ ] 1.7 **`o` overwrite after in-panel confirmation** — Add an
      assertion that pressing `o` shows an in-panel confirmation
      prompt naming the selected file, that `y`/`Enter` emits
      `{ type: "profile-overwrite", filename }`, and that `n`/`Esc`
      returns to the picker without writing. Assert only the selected
      file changes. RED evidence: `pnpm test` fails until the in-panel
      overwrite confirmation replaces the current flow.
- [ ] 1.8 **`d` delete after in-panel confirmation** — Add an
      assertion that pressing `d` shows an in-panel delete confirmation
      prompt naming the selected file, that `y`/`Enter` emits
      `{ type: "profile-delete", filename }`, and that `n`/`Esc`
      returns to the picker without deleting. Assert the selected
      file is removed, that other files (e.g., `broken.json`) are NOT
      removed, and that `models.json` is unchanged. RED evidence:
      `pnpm test` fails until the in-panel delete confirmation exists.
- [ ] 1.9 **Secondary prompts back out one level** — Add assertions
      that `Esc` returns from `save-name` to the picker, printable `b`
      and `n` remain text input in `save-name`, and `Esc`/`b`/`n`
      return from `overwrite-confirm` and `delete-confirm` to the
      picker without emitting any result. RED evidence: `pnpm test`
      fails until prompt sub-states route cancellation correctly.
- [ ] 1.10 **Picker backs out to agents view with `Esc`/`b`** —
      Add an assertion that, from the picker itself, `Esc` and `b`
      return the panel to `agents` mode (or resolve with a non-profile
      result) without performing any profile operation. RED evidence:
      `pnpm test` fails until `b` is wired in the picker.
- [ ] 1.11 **Successful operations keep picker open** — Add
      assertions for `Enter` load, `n` new, `o` overwrite, and `d`
      delete that, after the result resolves, the next panel mount
      is in `profiles` mode with refreshed profile names. RED
      evidence: `pnpm test` fails until `initialMode: "profiles"`
      reopen is implemented.
- [ ] 1.12 **`x` export and `r` restore do not touch profile files** —
      Add (or keep) assertions that after running `x` and `r`, no
      file under `~/.pi/gentle-ai/model-profiles/` is created,
      modified, or required, and `models.export.json` is the only
      fixed export artifact. RED evidence: this is a regression
      guard; if it already passes, log it as a passing RED guard and
      move to GREEN without code changes.
- [ ] 1.13 **Profile storage compatibility guard** — Add an assertion
      that loading a pre-existing profile file written with the
      existing envelope requires no migration (envelope kind/version
      preserved). RED evidence: passing today; log as passing
      regression guard before GREEN.

TRIANGULATE pass (after first GREEN for each task above): add at
least one neighboring assertion per behavior (e.g., `Enter` clamps on
empty list, `o` is a no-op when nothing is selected, save name with
unsafe characters is rejected and picker stays open, overwrite that
fails to write reopens picker).

## Phase 2 — Runtime changes in `extensions/gentle-ai.ts` (GREEN)

Goal: minimum runtime change to make Phase 1 tests green. Keep helper
layer (`lib/model-profiles.ts`) untouched.

- [x] 2.1 Extend `ModelPanelResult`: change `profile-save` to carry
      `name: string`; change `profile-load`, `profile-overwrite`,
      `profile-delete` to carry `filename: string`. Update all
      construction sites and discriminant sites accordingly.
- [x] 2.2 Add optional `initialMode` to `showSddModelPanel()` and
      `SddModelPanel` so the command loop can reopen directly in
      `profiles`. Default remains `"agents"` when omitted.
- [x] 2.3 Add panel fields `profileCursor` and `profilePrompt`
      (`"picker" | "save-name" | "overwrite-confirm" |
      "delete-confirm"`). Initialize `profileCursor` from
      `profileNames` length; clamp to `>= 0` and `< profileNames.length`.
- [x] 2.4 Replace `renderProfileMenu()` body with a real picker list:
      title + instructions; alphabetical filenames from
      `profileNames`; cursor marker only on the focused row; no
      current/matching-profile marker; empty-state copy
      `No model profiles found` + `Press n to create a profile from current
      assignments` when `profileNames.length === 0`.
      Add sub-renderers for `save-name`, `overwrite-confirm`, and
      `delete-confirm` that name the selected file (or typed name)
      and show the warning copy from the design.
- [x] 2.5 In `handleProfileInput`:
      - `Enter`: if a profile is selected, `done({ type:
        "profile-load", filename, config: this.draft })`; if list
        is empty, no-op.
      - `n`: enter `save-name` prompt; printable chars and backspace
        edit a local `profileNameBuffer`; `Enter` with non-empty
        buffer emits `profile-save`; `Esc` returns to picker; printable
        `b` and `n` stay text input.
      - `o`: if a profile is selected, enter `overwrite-confirm`;
        `y`/`Enter` emits `profile-overwrite`; `n`/`Esc`/`b` returns
        to picker.
      - `d`: if a profile is selected, enter `delete-confirm`;
        `y`/`Enter` emits `profile-delete`; `n`/`Esc`/`b` returns to
        picker.
      - `Esc`/`b` from picker: return to `agents` mode (or resolve
        with a non-profile result), matching existing overlay exit
        contract.
      - `Ctrl+C`: keep current overlay-cancel behavior.
- [x] 2.6 In `handleModelsCommand`, drop `ctx.ui.select()` for
      profile load/overwrite/delete. Resolve `result.filename`
      against a fresh `await listModelProfiles()`; if missing,
      notify and reopen with `initialMode: "profiles"`. Reuse
      existing `readModelProfile`/`writeModelProfileFile`/
      `deleteModelProfile` helpers. Keep collision-safety logic for
      `n`: if `result.name` maps to an existing safe filename, either
      reopen an in-panel overwrite-save confirmation or notify and
      reopen directly in `profiles` per the design's chosen path.
- [x] 2.7 Reopen policy: after each successful profile operation
      (`save`, `load`, `overwrite`, `delete`) and after prompt
      cancellation that should keep the picker reachable, call
      `await showSddModelPanel(ctx, config, { initialMode:
      "profiles" })` with refreshed `profileNames` via the helper
      that already wraps `listModelProfiles()`.
- [x] 2.8 Compatibility invariants: do not change
      `lib/model-profiles.ts`, `buildModelProfileEnvelope()`,
      `MODEL_EXPORT_KIND`, `MODEL_EXPORT_VERSION`, `modelProfilesDir()`,
      the `~/.pi/gentle-ai/models.export.json` `x`/`r` paths, or the
      profile file format. Confirm via grep that no
      `model-profiles` path string or envelope field is renamed.

TRIANGULATE/REFACTOR pass: dedupe the warning copy between
overwrite and delete confirmations where the design allows; tighten
the `ModelPanelResult` discriminated union; ensure
`profileCursor` clamps remain correct after `profileNames` changes
between reopens. Rerun `pnpm test`.

## Phase 3 — Verification (full suite)

- [x] 3.1 Run `pnpm test` end-to-end; capture the full output. All
      Phase 1 assertions must pass; all pre-existing tests must
      still pass; no skipped or `.todo` tests are introduced.
- [x] 3.2 Re-grep `extensions/gentle-ai.ts` for
      `renderProfileMenu`, `profile-load`, `profile-save`,
      `profile-overwrite`, `profile-delete` and confirm the new
      contract is the only contract in use (no orphan
      `ctx.ui.select` for load/overwrite/delete remains).
- [x] 3.3 Confirm `git diff --stat` for this slice stays within
      the forecast band (~200-320 changed lines across the two
      files). If it exceeds ~360 changed lines, invoke the stop
      rule from the forecast above.
- [x] 3.4 Confirm no runtime file outside `extensions/gentle-ai.ts`
      and no test file outside `tests/runtime-harness.mjs` was
      edited by this slice (helper-layer and spec files untouched).
- [x] 3.5 Update the apply-phase report with: RED evidence per
      Phase 1 task, GREEN evidence per Phase 2 task, the final
      `pnpm test` summary line, the actual `git diff --stat`,
      and any deviations from this plan.

## Out of scope (do not add tasks here)

- Profile file format, storage location, or envelope changes.
- Migration behavior for existing profile files.
- `x`/`r` behavior changes for `~/.pi/gentle-ai/models.export.json`.
- Autoformatting / unrelated refactors.
- Broader `/gentle:models` UI redesign.
