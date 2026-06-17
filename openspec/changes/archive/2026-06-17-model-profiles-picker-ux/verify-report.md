# Verify Report: model-profiles-picker-ux

## Status

PASS with documented review-workload and coverage caveats.

## Summary

The `model-profiles-picker-ux` implementation matches the approved picker-first
profile UX and the later `n new` keybinding adjustment. The runtime changes are
limited to the `/gentle:models` profile flow in `extensions/gentle-ai.ts`, the
profile-flow harness coverage in `tests/runtime-harness.mjs`, and the concise
README profile-picker wording.

No commit, push, sync, or archive was performed.

## Verification commands

```text
pnpm test
```

Result: PASS.

- `node --experimental-strip-types --test tests/*.test.ts`: PASS, 171/171.
- `node --experimental-strip-types tests/runtime-harness.mjs`: PASS, exit 0.

```text
git diff --check
```

Result: PASS.

## Requirement verification

| Requirement | Result | Evidence |
| --- | --- | --- |
| Picker-first profile entry | PASS | `renderProfilePicker()` replaces action-first profile menu and tests enter profiles with `p`. |
| Alphabetical plain list | PASS | Existing `listModelProfiles()` sorted listing is reused; picker renders `profileNames` directly with only focus cursor. |
| No current-profile marker | PASS | Picker render has no active/current/loaded marker copy; harness asserts absence. |
| `Enter` loads selected profile immediately | PASS | Picker emits `profile-load` with `filename`; command handler applies without load confirmation. |
| `n` creates a new profile | PASS | Picker `n` enters save-name prompt; harness creates `daily-baseline-v2.json`. |
| `o` overwrites selected profile after confirmation | PASS | Picker enters overwrite confirmation and only emits after `y`/`Enter`. |
| `d` deletes selected profile after confirmation | PASS | Picker enters delete confirmation and only emits after `y`/`Enter`. |
| Empty state advertises create action | PASS | Empty state copy says `Press n to create a profile from current assignments`; harness asserts it. |
| Text entry treats `b`/`n` as text | PASS | Save-name prompt only uses `Esc` to cancel; harness saves `Daily Baseline / v2`. |
| Successful operations keep picker open | PASS | Profile operation and error paths reopen with `{ initialMode: "profiles" }`. |
| Profile format/storage/envelope unchanged | PASS | No diff in `lib/model-profiles.ts`; existing helpers still handle storage and envelope. |
| `x`/`r` behavior unchanged | PASS | Export/restore code paths remain separate and harness asserts profile actions do not create `models.export.json`. |
| No migration behavior | PASS | No migration code added; existing profile files remain loaded through `readModelProfile()`. |
| No broader `/gentle:models` redesign | PASS | Changes are scoped to profile mode plus command-handler routing for profile result types. |

## Diff summary

Changed tracked files:

- `README.md` — concise profile picker wording.
- `extensions/gentle-ai.ts` — picker-first profile UI state, rendering,
  key handling, and command-handler filename plumbing.
- `tests/runtime-harness.mjs` — profile-flow harness coverage for picker-first
  create/load/overwrite/delete, invalid-load safety, empty state, and
  `models.export.json` non-interaction.

New OpenSpec artifacts under `openspec/changes/model-profiles-picker-ux/`:

- `proposal.md`
- `specs/model-routing/spec.md`
- `design.md`
- `tasks.md`
- `apply-progress.md`
- `verify-report.md`

Runtime/test diff exceeded the original forecast and stop-rule threshold during
apply. The parent paused, ran fresh review, received explicit user approval,
and continued only with targeted repairs.

## Residual risks

- The runtime/test diff is larger than originally forecast. This is documented
  and should receive final review before sync/archive/commit.
- `tests/runtime-harness.mjs` covers the main picker-first CRUD path,
  invalid-load safety, empty state, no current marker, `n` create, and
  `b`/`n` text-entry behavior. Some task-list microassertions remain grouped
  into that scenario rather than represented as separate tests.
- Project-wide `lens_diagnostics mode=full` reports pre-existing or unrelated
  TypeScript diagnostics in areas outside this feature. Focused `pnpm test` and
  `git diff --check` pass, and no unrelated runtime code was changed for those
  diagnostics.

## Next recommended

Proceed to `sdd-sync` only after the user approves. Do not commit yet.
