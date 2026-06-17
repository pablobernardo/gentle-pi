# Archive Report: model-profiles-picker-ux

## Status

PASS — change archived successfully by parent session after the archive subagent
timed out without writing files.

No commit or push was performed.

## Structured Status and Action Context

| Field | Finding |
| --- | --- |
| Change | `model-profiles-picker-ux` |
| Artifact store | `openspec` |
| Workspace | `/Users/pablo/code/pablobernardo/gentle-pi` |
| Action context | `repo-local`; archive operation stayed inside the workspace. |
| Phase gates | proposal, spec, design, tasks, apply, verify, and sync artifacts present. |

## Artifacts Preserved

| Artifact | Present |
| --- | --- |
| `proposal.md` | Yes |
| `specs/model-routing/spec.md` | Yes |
| `design.md` | Yes |
| `tasks.md` | Yes |
| `apply-progress.md` | Yes |
| `verify-report.md` | Yes, PASS with caveats |
| `sync-report.md` | Yes, Synced |
| `archive-report.md` | Yes |

## Verify Summary

`verify-report.md` status: PASS with documented review-workload and coverage
caveats.

Validation evidence recorded before archive:

- `pnpm test`: PASS.
  - Node test suite: 171/171.
  - Runtime harness: PASS.
- `git diff --check`: PASS.
- `lens_diagnostics` error scan over changed files: PASS, no errors.

## Sync Summary

`sync-report.md` status: Synced.

The delta in
`openspec/changes/model-profiles-picker-ux/specs/model-routing/spec.md` was
merged into `openspec/specs/model-routing/spec.md`.

Canonical changes:

- Removed the temporary `Requirement: no picker-first profile UX yet` block.
- Added picker-first profile requirements for:
  - picker-first profile entry;
  - picker profile operations;
  - picker navigation and empty state;
  - profile compatibility preservation.

## Implementation Summary

Changed implementation/documentation files:

| File | Type |
| --- | --- |
| `extensions/gentle-ai.ts` | Modified: picker-first profile UI state, rendering, key handling, and command-handler filename plumbing. |
| `tests/runtime-harness.mjs` | Modified: profile picker CRUD and compatibility harness coverage. |
| `README.md` | Modified: concise named profile picker wording. |
| `openspec/specs/model-routing/spec.md` | Modified by sync. |

Preserved invariants:

- No profile file format change.
- No `~/.pi/gentle-ai/model-profiles/` storage location change.
- No model routing export envelope change.
- No `x`/`r` behavior change for `~/.pi/gentle-ai/models.export.json`.
- No migration behavior.
- No broader `/gentle:models` redesign.

## Task Completion Note

`tasks.md` contains some unchecked Phase 1 micro-test items. Verification
accepted this with caveats because the runtime harness covers the main
picker-first CRUD path, invalid-load safety, empty state, no active marker,
`n` create, and printable `b`/`n` text-entry behavior as grouped assertions
rather than one isolated assertion per task line.

This exception was already documented in `verify-report.md` and
`apply-progress.md`; no new runtime work was performed during archive.

## Stop-Rule Deviation

The implementation exceeded the original review-workload forecast during
apply. The parent paused, ran fresh review, received explicit user approval,
and continued only with targeted repairs. This is documented in
`apply-progress.md`, `verify-report.md`, and `sync-report.md`.

## Archived Path

```text
openspec/changes/model-profiles-picker-ux/
  → openspec/changes/archive/2026-06-17-model-profiles-picker-ux/
```

## Residual Risks

- Diff size is larger than the initial forecast and should receive final review
  before commit.
- Some task-list microassertions are grouped in the harness instead of tracked
  as separate tests.
- Full project diagnostics include unrelated/pre-existing findings outside this
  slice; changed-file test evidence is green.

## Next Recommended

Run a final fresh review, then commit only after explicit user approval.
