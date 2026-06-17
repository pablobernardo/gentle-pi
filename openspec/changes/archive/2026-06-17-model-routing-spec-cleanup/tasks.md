# Tasks: model-routing-spec-cleanup

## Review Workload Forecast

| Field                   | Value                                      |
| ----------------------- | ------------------------------------------ |
| Estimated changed lines | <150                                       |
| 400-line budget risk    | Low                                        |
| Chained PRs recommended | No                                         |
| Suggested split         | Single docs/spec-only commit               |
| Delivery strategy       | single-pr-default                          |
| Chain strategy          | no chained PR needed for this cleanup slice |

Decision needed before apply: No — user approved the proposed cleanup plan.
Chained PRs recommended: No
400-line budget risk: Low

## Implementation Tasks

### 1. Preserve product/system behavior

- [x] 1.1 Keep named profile behavior in the canonical spec.
- [x] 1.2 Keep `~/.pi/gentle-ai/model-profiles/` as the profile storage location.
- [x] 1.3 Keep the existing model routing export envelope requirement for profile files.
- [x] 1.4 Keep invalid/unsafe input rejection without active config mutation.
- [x] 1.5 Keep fixed `x`/`r` behavior for `~/.pi/gentle-ai/models.export.json` unchanged.
- [x] 1.6 Keep picker-first UX out of this cleanup.

### 2. Remove internal mechanics from canonical spec

- [x] 2.1 Remove runtime harness scope as a canonical requirement.
- [x] 2.2 Remove `__testing.modelProfiles` bridge stability as a canonical requirement.
- [x] 2.3 Remove or reduce helper-boundary/testing wording from canonical requirements.
- [x] 2.4 Leave archived `model-profiles-ux` artifacts unchanged as implementation/testing history.

### 3. Verify minimal docs/spec-only diff

- [x] 3.1 Confirm no runtime source or test files changed.
- [x] 3.2 Review `git diff -- openspec` for minimal formatting-preserving changes.
- [x] 3.3 Record verification evidence in this change.

## Acceptance Checklist

- [x] Canonical spec is product/system focused.
- [x] Internal implementation/testing mechanics remain available in archived SDD artifacts.
- [x] No picker-first UX is introduced.
- [x] No runtime code is touched.
