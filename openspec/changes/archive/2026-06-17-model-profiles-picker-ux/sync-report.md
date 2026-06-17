# Sync Report: model-profiles-picker-ux

## Status

Synced. The change delta under
`openspec/changes/model-profiles-picker-ux/specs/model-routing/spec.md` has
been merged into the canonical `openspec/specs/model-routing/spec.md`.

## Resolved Active Change

User-resolved active change: `model-profiles-picker-ux`.

The preflight SDD status marked the active change as ambiguous across three
candidates (`align-sdd-openspec-deltas`, `gentle-models-effort`,
`model-profiles-picker-ux`). The user's explicit request resolved this in
favor of `model-profiles-picker-ux`, which is the only candidate whose
delta targets `openspec/specs/model-routing/spec.md`.

## Action Context Findings

- `mode: repo-local`
- `workspaceRoot: /Users/pablo/code/pablobernardo/gentle-pi`
- `allowedEditRoots: [/Users/pablo/code/pablobernardo/gentle-pi]`
- The canonical spec path `openspec/specs/model-routing/spec.md` is inside
  the authoritative workspace and inside `allowedEditRoots`. Edit is
  permitted.
- No `mode: workspace-planning` warning.

## Domain and Same-Domain Collision Check

- This change touches the `model-routing` domain.
- Other active changes:
  - `align-sdd-openspec-deltas`: domain `sdd-openspec` (different).
  - `gentle-models-effort`: legacy flat `spec.md`, no domain subdirectory
    yet (different domain).
- No active change shares the `model-routing` domain, so no same-domain
  collision and no archive/sync order decision was required.

## Verification Input

- `openspec/changes/model-profiles-picker-ux/verify-report.md`: PASS,
  "PASS with documented review-workload and coverage caveats".
- `pnpm test`: PASS (per verify-report and preflight status).
- `git diff --check`: PASS (re-confirmed pre-sync; exit 0).

No `FAIL`, `BLOCKED`, or `CRITICAL` markers were present in the verification
report.

## Delta Applied

Source: `openspec/changes/model-profiles-picker-ux/specs/model-routing/spec.md`.

Canonical target: `openspec/specs/model-routing/spec.md`.

Helper semantics used (file-backed, native helpers):

- `## ADDED Requirements` appended to canonical spec.
- `## REMOVED Requirements` deleted from canonical spec by exact name.
- `## MODIFIED Requirements`: none in this delta.
- `## RENAMED Requirements`: none in this delta.

### REMOVED Requirements

- `## Requirement: no picker-first profile UX yet`
  - Reason recorded in delta: temporary constraint from the helper-extraction
    slice is replaced by the picker-first profile flow for `/gentle:models`.
  - Migration: none. Profile file format, storage location, export envelope,
    and fixed export/restore behavior remain unchanged.
  - This is a non-destructive removal: the removed block asserted only that
    picker-first UX was deferred. No user-facing behavior is removed; it is
    replaced by stricter picker-first requirements in the same delta.

### ADDED Requirements

- `## Requirement: Picker-first model profile entry`
  - Scenario: entering profiles shows alphabetical profile picker.
- `## Requirement: Picker profile operations`
  - Scenario: selected profile loads immediately.
  - Scenario: invalid selected profile is rejected safely.
  - Scenario: create a new profile from picker.
  - Scenario: overwrite selected profile after confirmation.
  - Scenario: delete selected profile after confirmation.
- `## Requirement: Profile picker navigation and empty state`
  - Scenario: secondary prompt backs out to picker.
  - Scenario: picker backs out to previous models view.
  - Scenario: empty picker advertises create availability.
- `## Requirement: Profile compatibility remains unchanged`
  - Scenario: profile storage compatibility is preserved.
  - Scenario: fixed export and restore behavior is preserved.

## Canonical Files Updated

- `openspec/specs/model-routing/spec.md`

## Canonical Diff Summary

- Total requirements before sync: 5
  - `named model profiles`
  - `profile list and CRUD`
  - `compatibility of existing export format`
  - `profile storage compatibility and file safety`
  - `no picker-first profile UX yet`
- Total requirements after sync: 8
  - 4 preserved unchanged from the original canonical spec
    (`named model profiles`, `profile list and CRUD`,
    `compatibility of existing export format`,
    `profile storage compatibility and file safety`)
  - 4 appended from the delta
    (`Picker-first model profile entry`, `Picker profile operations`,
    `Profile picker navigation and empty state`,
    `Profile compatibility remains unchanged`)
- Unrelated canonical content preserved verbatim; only the temporary
  `no picker-first profile UX yet` block was removed and the four new
  requirement blocks were appended at the end of the file.

`git diff --stat openspec/specs/model-routing/spec.md`:

```text
 openspec/specs/model-routing/spec.md | 159 ++++++++++++++++++++++++++++++++---
 1 file changed, 149 insertions(+), 10 deletions(-)
```

## Validation Commands Performed

- `test -f openspec/changes/model-profiles-picker-ux/sync-report.md`: PASS
  (this report).
- `! rg -n "Requirement: no picker-first profile UX yet" openspec/specs/model-routing/spec.md`:
  PASS (no matches after sync).
- `rg -n "picker-first|profile picker|Pressing \`n\`|creates a new profile" openspec/specs/model-routing/spec.md`:
  PASS (picker-first language now present in the canonical spec).
- `rg -c "^## Requirement:" openspec/specs/model-routing/spec.md`: 8
  (matches expected requirement count).
- `git diff --check` against tracked tree pre-sync: PASS.

## Destructive Sync Approvals / Blockers

- The single REMOVED requirement (`no picker-first profile UX yet`) is a
  non-destructive cleanup marker whose removal is paired with a strict
  picker-first replacement in the same delta. No additional destructive
  approval is required.
- No MODIFIED requirements in this delta, so the large-MODIFIED approval
  rule does not apply.
- No RENAMED requirements, so the RENAMED-block rule does not apply.
- No legacy flat `openspec/changes/model-profiles-picker-ux/spec.md` exists;
  this change uses the domain `specs/model-routing/spec.md` shape.

## OpenSpec Config Rules Applied

- `openspec/config.yaml` does not define a `rules.sync` block. No
  project-specific sync rules were applied beyond the native helper
  semantics.

## Stop-Rule Compliance

- No archive action performed; the change folder remains in
  `openspec/changes/model-profiles-picker-ux/`.
- No commit, push, or branch operation performed.
- No runtime code modified by this sync phase.

## Risks

- The implementation diff exceeded the original ~360 changed-line pause
  threshold during apply (verify-report and apply-progress both document
  this). The change already received explicit user approval for the
  minimal repair and was verified passing before sync. This sync only
  propagates the spec delta; no runtime regression risk is introduced by
  this phase.
- The canonical spec file is now larger. Reviewers comparing the change
  should look at the appended requirements and the removal of the
  temporary no-picker-first block; the preserved requirements are
  verbatim.

## Next Recommended

`sdd-archive` after the user approves the runtime commit. The change is
synced, verified PASS, and ready for archive-time review per the
`verify → sync → archive` ordering.
