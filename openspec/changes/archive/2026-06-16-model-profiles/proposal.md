# Change: model-profiles

## Problem

`/gentle:models` can export and restore the active model routing assignments
through a single fixed file, `~/.pi/gentle-ai/models.export.json`, but users
cannot keep multiple named routing presets. Switching between common setups,
such as cheap/default models, high-quality SDD models, or experimental provider
mixes, requires manually moving files or re-entering assignments.

## Goals

- Add named model profiles managed from the existing `/gentle:models` UI.
- Store profiles under `~/.pi/gentle-ai/model-profiles/` as JSON files with
  filesystem-safe names.
- Save the current assignments as a named profile using the same model routing
  export envelope used by export/restore.
- List, load, overwrite, and delete named profiles from `/gentle:models`.
- Reject invalid profile contents with a warning and leave the active
  configuration unchanged.
- Preserve the existing `x`/`r` export and restore behavior for
  `~/.pi/gentle-ai/models.export.json` unchanged.

## Non-goals

- Do not replace or rename `~/.pi/gentle-ai/models.export.json`.
- Do not change the model routing assignment schema beyond reusing the existing
  export envelope for profiles.
- Do not add remote profile sync, profile sharing, or provider catalog
  management.
- Do not change Pi's global `/model` selector.

## Impact

Primary code likely lives in `extensions/gentle-ai.ts`, especially the
`/gentle:models` command and existing export/restore helpers. Tests should cover
profile filesystem behavior, invalid profile rejection, and compatibility with
the fixed export file. README or command documentation should mention named
profiles and their storage path.

## Implementation constraints

- Do not reformat, reorder, or rewrite unrelated code while implementing this
  change.
- Only touch formatting on lines that are functionally related to model profile
  support.

## Review workload

Expected small-to-medium change, likely touching the command implementation,
tests, and documentation. Forecast should remain under 400 changed lines; use a
single PR unless implementation discovers broader refactoring needs.
