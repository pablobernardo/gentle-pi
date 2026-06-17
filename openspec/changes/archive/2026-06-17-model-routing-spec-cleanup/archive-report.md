# Archive Report: model-routing-spec-cleanup

## Status

**PASS** — cleanup slice archived successfully.

## Structured Status and Action Context

| Field | Finding |
| --- | --- |
| Change | `model-routing-spec-cleanup` |
| Artifact store | `openspec` plus Engram summary |
| Workspace | `/Users/pablo/code/pablobernardo/gentle-pi` |
| Action context | `repo-local`; allowed edit root is workspace. All operations stayed within OpenSpec docs. |
| Phase gates | apply done, verify done, archive ready |

## Artifacts Read

| Artifact | Path | Present |
| --- | --- | --- |
| Proposal | `openspec/changes/model-routing-spec-cleanup/proposal.md` | Yes |
| Spec delta | `openspec/changes/model-routing-spec-cleanup/specs/model-routing/spec.md` | Yes |
| Tasks | `openspec/changes/model-routing-spec-cleanup/tasks.md` | Yes; all checked |
| Apply Progress | `openspec/changes/model-routing-spec-cleanup/apply-progress.md` | Yes |
| Verify Report | `openspec/changes/model-routing-spec-cleanup/verify-report.md` | Yes; PASS |
| Canonical Spec | `openspec/specs/model-routing/spec.md` | Yes; already cleaned |

## Task Completion Gate

All implementation tasks and acceptance checklist items are checked in `tasks.md`. No unchecked `- [ ]` markers remain.

## Sync Summary

The cleanup was already applied directly to canonical `openspec/specs/model-routing/spec.md` because this slice is a docs/spec-only correction to the canonical spec after the archived `model-profiles-ux` sync.

Canonical spec now keeps product/system behavior only:

- named model profiles are available from `/gentle:models`;
- profile files live under `~/.pi/gentle-ai/model-profiles/`;
- profile files use the existing model routing export envelope;
- unsafe or invalid profile input is rejected without changing active model routing configuration;
- fixed `x`/`r` behavior for `~/.pi/gentle-ai/models.export.json` remains unchanged;
- picker-first UX is explicitly not introduced.

Removed from canonical requirements:

- runtime harness scope;
- `__testing.modelProfiles` bridge stability;
- helper-boundary and focused unit-test mechanics.

The archived `model-profiles-ux` artifacts remain unchanged and retain the implementation/testing rationale.

## Runtime/code changes during archive

None. Archive only moves OpenSpec Markdown artifacts.

## Validation

- `verify-report.md` status: PASS.
- `git diff --name-only` showed only `openspec/specs/model-routing/spec.md` plus cleanup OpenSpec artifacts before archive.
- `rg` found no `runtime harness`, `__testing.modelProfiles`, `helper boundary`, `helper-level`, `focused unit tests`, or `extraction slice` wording in the canonical spec.
- `lens_diagnostics mode=all severity=error`: PASS, no blocking diagnostics.

## Runtime tests

Not run. This slice changes only OpenSpec Markdown artifacts and does not touch runtime source or test files.

## Archived Path

```text
openspec/changes/model-routing-spec-cleanup/
  → openspec/changes/archive/2026-06-17-model-routing-spec-cleanup/
```

## Residual Risks

- The canonical spec still explicitly says no picker-first UX is introduced. This is intentional to preserve the current product boundary before the planned picker-first UX slice.
- The cleanup slice is docs/spec-only; runtime behavior remains covered by the prior `model-profiles-ux` implementation and archived verification evidence.

## Next Recommended

Review the final diff and commit this small cleanup slice before starting picker-first UX.
