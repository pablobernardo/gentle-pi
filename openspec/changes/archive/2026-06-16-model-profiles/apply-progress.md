# Apply progress: model-profiles

## Status

Implemented; reviewer notes addressed.

## TDD evidence

- RED: Added model-profile runtime harness coverage before completing the UI and
  handler implementation. The initial harness run exposed incomplete profile UI
  handling and an assertion issue for invalid-profile rejection.
- GREEN: `pnpm run test:harness` passed after implementing profile actions and
  correcting the invalid-profile assertion.
- GREEN: `pnpm test` passed after the full implementation and documentation
  update.
- Review follow-up: a fresh reviewer found no blockers and noted filename-safety
  hardening plus profile-load frontmatter coverage opportunities. Those were
  implemented, then `pnpm run test:harness` and `pnpm test` passed again.
- Diff-noise follow-up: unrelated formatting and cleanup changes were reverted;
  the remaining code/doc/test diff is scoped to model profile support.

## Changed files

- `extensions/gentle-ai.ts`
  - Added profile storage helpers under the existing model-routing helper area.
  - Added `/gentle:models` profile menu actions for save, load, overwrite, and
    delete.
  - Reused the existing model routing export envelope for profile files.
  - Preserved fixed `x`/`r` export/restore behavior for
    `~/.pi/gentle-ai/models.export.json`.
  - Hardened profile list/read/delete helpers so only safe profile filenames are
    accepted.
- `tests/runtime-harness.mjs`
  - Added coverage for profile filename safety, list/read/write/delete helpers,
    save/load/overwrite/delete command flows, invalid profile rejection,
    profile-load agent frontmatter application, and `models.export.json`
    compatibility.
- `README.md`
  - Documented profile storage and `/gentle:models` profile behavior.
- `tasks.md`
  - Marked implementation, tests, and documentation tasks complete.

## Validation

```text
pnpm run test:harness
HARNESS_EXIT:0

pnpm test
TEST_EXIT:0

git diff --check
(no output)
```

## Review workload

The runtime/docs/test diff exceeds the configured 400-line review budget and
must be called out before PR/review. OpenSpec artifacts are additional review
context, not runtime product code.

## Residual risks

- Profile helpers stayed local to `extensions/gentle-ai.ts` to avoid a broader
  extraction of existing private routing helpers.
- The profile action menu is intentionally compact and key-driven to match the
  current modal style.
