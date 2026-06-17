# Proposal: Clean canonical model routing spec

## Problem

The canonical `model-routing` OpenSpec spec currently includes internal mechanics from the archived `model-profiles-ux` extraction slice. Those details are useful historical implementation context, but they make the upstream-facing canonical spec harder to read because they mix product/system behavior with test architecture and temporary internal bridge decisions.

Examples include runtime harness scope, `__testing.modelProfiles` bridge stability, and detailed helper-boundary wording.

## Goals

- Keep `openspec/specs/model-routing/spec.md` focused on canonical product/system behavior.
- Preserve named model profile behavior, storage location, export envelope compatibility, unsafe input rejection, and unchanged fixed `x`/`r` export/restore behavior.
- Preserve the fact that picker-first profile UX is not part of the current behavior.
- Leave implementation/testing rationale in archived SDD artifacts where it remains understandable historical context.
- Keep the change docs/spec-only and minimal.

## Non-Goals

- Do not implement picker-first UX.
- Do not change runtime code or tests unless verification reveals an unavoidable spec/runtime inconsistency.
- Do not rewrite unrelated model routing requirements.
- Do not autoformat OpenSpec files.

## Affected Areas

- `openspec/specs/model-routing/spec.md`
- `openspec/changes/model-routing-spec-cleanup/*`
- Archived `model-profiles-ux` artifacts remain unchanged and continue to document extraction mechanics.

## Success Criteria

- Canonical spec still states that named profiles exist.
- Canonical spec still states profiles live under `~/.pi/gentle-ai/model-profiles/`.
- Canonical spec still states profile files use the existing model routing export envelope.
- Canonical spec still states invalid or unsafe profile inputs are rejected without changing active config.
- Canonical spec still states fixed `x`/`r` behavior for `~/.pi/gentle-ai/models.export.json` remains unchanged.
- Canonical spec does not include runtime harness, `__testing.modelProfiles`, or detailed helper-boundary testing mechanics as canonical requirements.
- Canonical spec does not introduce picker-first UX.

## Risks

- Removing internal requirements from the canonical spec could look like behavior reduction unless the archive/history makes clear these were implementation/testing mechanics.
- Over-editing could create unnecessary review noise in an upstream PR.

## Rollback

Revert this cleanup commit. The archived `model-profiles-ux` artifacts already contain the original implementation/testing rationale.
