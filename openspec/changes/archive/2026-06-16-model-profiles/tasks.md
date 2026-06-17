# Tasks: model-profiles

## Implementation

- [x] Locate the existing `/gentle:models` export/restore implementation and
  identify the model routing export envelope validation path.
- [x] Prefer a focused module for profile storage helpers, such as
  `lib/model-profiles.ts`, if it can be added without moving unrelated existing
  model-routing code.
- [x] Add profile storage helpers for `~/.pi/gentle-ai/model-profiles/`,
  including directory creation, filesystem-safe filename derivation, JSON
  read/write, list, overwrite, and delete behavior.
- [x] Keep `extensions/gentle-ai.ts` changes limited to command/UI integration
  unless helper extraction would create more churn than a local helper block.
- [x] Extend `/gentle:models` UI actions to list available profiles and support
  save, load, overwrite, and delete flows.
- [x] Ensure profile save/load reuses the same export envelope used by `x`/`r`
  restore/export.
- [x] Reject invalid profile JSON or invalid export envelopes with a
  user-visible warning and no active configuration mutation.
- [x] Preserve existing `x`/`r` behavior for
  `~/.pi/gentle-ai/models.export.json` unchanged.
- [x] Avoid formatting, reordering, or rewriting unrelated code; keep any
  formatting edits limited to lines functionally related to model profile
  support.

## Tests

- [x] Prefer a focused model-profiles test file if harness helpers can be reused
  or extracted with a small, low-risk change; otherwise add cases near the
  existing `/gentle:models` runtime-harness coverage.
- [x] Add or extend runtime tests for saving the current assignments as a named
  profile.
- [x] Add or extend runtime tests for listing and loading a valid profile.
- [x] Add or extend runtime tests proving invalid profile contents are rejected
  without changing active configuration.
- [x] Add or extend runtime tests for overwriting and deleting profiles.
- [x] Add regression coverage proving `x`/`r` still use
  `~/.pi/gentle-ai/models.export.json` exactly as before.

## Documentation

- [x] Document named model profiles in the `/gentle:models` README or command
  documentation.
- [x] Document the storage directory `~/.pi/gentle-ai/model-profiles/` and
  clarify that profiles reuse the export/restore envelope.
