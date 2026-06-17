# Apply Progress: model-profiles-ux

Strict TDD is active. Test runner: `pnpm test`.

## Review Workload Forecast (from tasks.md)

```text
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low
```

## Guardrails

- No UX flow change (sub-panel `p`, `s`/`l`/`o`/`d` keybindings stay).
- `~/.pi/gentle-ai/models.export.json` and `x`/`r` behavior remain unchanged.
- No profile file format migration.
- No unrelated formatting or autoformatting in `extensions/gentle-ai.ts`.
- No `lib/model-profiles.ts` import back into `extensions/gentle-ai.ts`.
- `__testing.modelProfiles` is not a compatibility contract and was removed.
- No package dependency changes.

## TDD Cycle Evidence

| Task | Cycle | Status | Command | Result summary |
| --- | --- | --- | --- | --- |
| 1 | RED | done | `node --experimental-strip-types --test tests/model-profiles.test.ts` | Failed with `ERR_MODULE_NOT_FOUND` for `lib/model-profiles.ts` before production code existed (expected RED). |
| 2 | GREEN | done | `node --experimental-strip-types --test tests/model-profiles.test.ts` | Focused model profile helper tests pass after adding `lib/model-profiles.ts`. |
| 3 | TRIANGULATE | done | `node --experimental-strip-types --test tests/model-profiles.test.ts` | Added/kept edge coverage for env home, filename safety, traversal, symlink filtering, malformed envelopes, missing files, delete no-op, overwrite, and `models.export.json` isolation. |
| 4 | REFACTOR | done | `node --experimental-strip-types --test tests/model-profiles.test.ts` | Shared envelope constants/helpers live in `lib/model-profiles.ts`; focused tests remained green. |
| 5 | WIRE | done | `pnpm test` | `extensions/gentle-ai.ts` imports extracted profile/envelope helpers; local duplicates and `__testing.modelProfiles` removed. |
| 6 | TRIM | done | `pnpm test` | Removed runtime harness helper-internal `profiles-unit` block; integration flow remains covered. |
| 7 | VERIFY | done | `pnpm test` | Full package tests passed: 169 node:test tests plus runtime harness completed successfully. |

## Files touched

- `lib/model-profiles.ts` (new extracted helper module)
- `extensions/gentle-ai.ts` (imports extracted helpers, removes local profile/envelope duplicates and `__testing.modelProfiles`)
- `tests/model-profiles.test.ts` (new focused unit tests)
- `tests/runtime-harness.mjs` (removed helper-internal `profiles-unit` block)
- `openspec/changes/model-profiles-ux/tasks.md` (all implementation tasks marked complete)
- `openspec/changes/model-profiles-ux/apply-progress.md` (this report)

## Validation

- `node --experimental-strip-types --test tests/model-profiles.test.ts` — passed, 16/16 tests.
- `pnpm test` — passed, including 169 `node:test` tests and the runtime harness.
- `lens_diagnostics mode=all severity=error` — reports pre-existing TypeScript diagnostics in `extensions/gentle-ai.ts` after unrelated cleanup was reverted to honor the no-unrelated-edits guardrail. `pnpm test` remains green.
- Guard grep: no local profile helper definitions remain in `extensions/gentle-ai.ts` for `safeModelProfileFilename`, `listModelProfiles`, `writeModelProfile`, `readModelProfile`, `deleteModelProfile`, `buildModelProfileEnvelope`, `writeModelProfileFile`, `MODEL_PROFILE_FILENAME_PATTERN`, or `MAX_MODEL_PROFILE_FILENAME_LENGTH`.
- Guard grep: no `__testing.modelProfiles` or `profiles-unit` references remain.

## Notes

- A first apply attempt touched unrelated formatting and legacy diagnostics in `extensions/gentle-ai.ts`. That was reverted. The current diff is restricted to the profile/envelope extraction and removing `__testing.modelProfiles` plus the helper-internal harness block.
- Existing TypeScript diagnostics remain around `computeDiffForEvent` git options and unused legacy declarations. They are intentionally not fixed in this slice because they are unrelated to model profiles.

## Deviations from design

- `gentleAiConfigHome()` remains duplicated minimally in `lib/model-profiles.ts` to avoid importing from the extension entrypoint, as planned.
- No UX changes were introduced.

## Remaining tasks

None. Apply is complete and ready for SDD verify/review.
