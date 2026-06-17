# Change: model-profiles-picker-ux

## Problem

Named model profiles are now available from `/gentle:models`, but the profile
entry point is still action-first: users enter a profile panel and must choose
whether they want to save, load, overwrite, or delete before seeing the set of
existing profiles. That works functionally, but it makes the common action —
choosing an existing profile — less direct than the rest of the model picker
experience.

The current canonical `model-routing` spec also explicitly preserves "no
picker-first profile UX yet" from the helper-extraction slice. This change is
the follow-up slice that replaces that temporary constraint with a small,
reviewable picker-first profile flow while preserving the already-verified
profile storage and export compatibility semantics.

## Goals

1. Change the `/gentle:models` profile entry flow so users first see a
   picker/list of existing profiles instead of an action-first profile panel.
2. Preserve existing profile CRUD semantics through the picker-first flow:
   - `Enter` on a selected profile loads that profile immediately, without an
     additional confirmation prompt.
   - `n` creates a new profile from current assignments.
   - `o` overwrites the selected profile after confirmation, matching existing
     overwrite safety behavior.
   - `d` deletes the selected profile after confirmation.
   - `Esc` or `b` backs out one level from nested profile states: secondary
     prompts return to the profile picker, and the picker returns to the
     previous `/gentle:models` view.
   - Successful profile operations keep the picker open so users can continue
     profile work unless they explicitly leave with `Esc` or `b`.
3. Show an empty state when no profiles exist that clearly communicates:
   - no profiles exist yet;
   - creating a new profile from current assignments is available.
4. Present existing profiles in alphabetical order, without adding a marker for
   the currently loaded or matching profile in this slice.
5. Keep the first slice focused on the profile picker only, with the smallest
   safe runtime and test changes needed to support the new flow.

## Non-goals

- No change to the profile file format.
- No change to the profile storage location:
  `~/.pi/gentle-ai/model-profiles/`.
- No change to the existing model routing export envelope used by profile files.
- No change to `x`/`r` behavior for
  `~/.pi/gentle-ai/models.export.json`.
- No migration behavior for existing profile files.
- No redesign of the broader `/gentle:models` UI.
- No unrelated refactoring or formatting churn.
- No autoformatting tools.
- No runtime implementation before proposal/spec/design/tasks are clear.

## Impact

### Spec impact

- `openspec/specs/model-routing/spec.md`: replace the current temporary
  requirement that preserves "no picker-first profile UX yet" with picker-first
  profile selection and confirmed deletion requirements.
- New delta spec under `openspec/changes/model-profiles-picker-ux/`: define
  picker-first profile behavior, empty state, keybindings, alphabetical
  ordering, and compatibility invariants.

### Runtime impact forecast

- `/gentle:models` profile UI state: replace action-first profile entry with
  list-first profile state and selected-profile operations.
- Profile CRUD handlers: reuse existing save/load/overwrite/delete helpers and
  validation behavior; only route them through the picker-first flow.
- Tests: add or update focused tests for picker-first rendering, key handling,
  delete confirmation, empty state, and compatibility invariants.

### Preserved behavior

- Existing valid profile files remain loadable.
- Invalid or unsafe profile input remains rejected without changing active model
  routing configuration.
- Profile files continue to use the existing model routing export envelope.
- `x` export and `r` restore continue to use
  `~/.pi/gentle-ai/models.export.json` and do not create or mutate named
  profiles unless the user explicitly chooses a profile operation.

## Risks and mitigations

- Picker-first UI could grow into a broader `/gentle:models` redesign.
  Mitigation: keep scope limited to profile entry/list state, keybindings, empty
  state, and delete confirmation. Defer broader layout polish.
- Delete confirmation could expand modal state complexity. Mitigation: treat
  confirmation as a small, explicit sub-state for the selected profile only;
  preserve existing delete helper semantics after confirmation.
- Loading a profile can overwrite unsaved current assignments. Mitigation: this
  slice intentionally keeps loading immediate to preserve simple existing
  semantics; document and test that `Enter` applies the selected profile
  directly.
- Profile ordering changes may affect expectations. Mitigation: specify
  alphabetical ordering and cover it in tests.
- Compatibility could regress in storage/export behavior. Mitigation: reuse
  existing `lib/model-profiles.ts` helpers and add regression coverage around
  storage path, envelope, and `models.export.json` non-interaction.
- Review workload could exceed the intended slice. Mitigation: forecast tasks
  against the 400 changed-line budget and split follow-up work if design
  indicates broad changes.

## Review workload

Expected implementation should remain below the 400 changed-line review budget
if it only changes profile picker state, routing, and focused tests. A single PR
is appropriate unless design discovers that the existing modal state structure
requires a larger refactor.

## Success criteria

1. Opening profiles from `/gentle:models` shows a picker/list of existing
   profiles first.
2. Existing profiles are listed alphabetically.
3. `Enter` on the selected profile loads it immediately using existing profile
   validation semantics.
4. `n` creates a new profile from current assignments.
5. `o` overwrites the selected profile.
6. `d` asks for confirmation before deleting the selected profile, and confirmed
   deletion removes only that profile without changing active model routing
   configuration.
7. `Esc` and `b` return from the picker to the previous `/gentle:models` view.
8. Empty profile state clearly communicates that no profiles exist and creating
   a new profile is available.
9. Profile file format, storage location, export envelope, and `x`/`r`
   `models.export.json` behavior remain unchanged.
10. Strict TDD evidence is recorded during implementation, using `pnpm test`.

## Next phase

`sdd-spec` — write delta requirements and scenarios for picker-first profile
selection, delete confirmation, empty state, alphabetical ordering, and
compatibility invariants.
