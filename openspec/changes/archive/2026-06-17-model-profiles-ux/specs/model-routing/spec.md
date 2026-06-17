# Delta for Model Routing

## ADDED Requirements

### Requirement: Extracted profile helper boundary

The package MUST expose model profile storage, path safety, listing, envelope construction, reading, writing, and deletion behavior from a focused model profile helper module instead of requiring tests or callers to reach through the `/gentle:models` command implementation.

Focused unit tests for model profile helper behavior MUST import the helper module directly and MUST NOT depend on `__testing.modelProfiles`.

#### Scenario: helper behavior is tested through the extracted module

- GIVEN the model profile helper behavior is under test
- WHEN focused unit tests exercise filename safety, listing, CRUD, envelope validation, overwrite, and path traversal rejection
- THEN the tests import directly from the model profile helper module
- AND the tests do not access helper behavior through `__testing.modelProfiles`

#### Scenario: extension command delegates without changing behavior

- GIVEN the user opens `/gentle:models`
- WHEN the user saves, loads, overwrites, lists, or deletes a named profile
- THEN the command observes the same user-visible behavior as before the extraction
- AND the profile operation is backed by the focused helper behavior

### Requirement: Profile storage compatibility and file safety preservation

The package MUST preserve compatibility with existing profile files under `~/.pi/gentle-ai/model-profiles/`.

Profile files MUST continue to use the existing model routing export envelope, and profile operations MUST continue to reject unsafe filenames, path traversal, invalid JSON, invalid envelope kind or version, and missing or malformed routing content without changing active model routing configuration.

#### Scenario: existing profile file remains loadable

- GIVEN an existing profile file under `~/.pi/gentle-ai/model-profiles/` contains a valid model routing export envelope
- WHEN the user loads that profile from `/gentle:models`
- THEN the profile assignments are applied to active model routing configuration
- AND no profile file format migration is required

#### Scenario: unsafe or invalid profile input is rejected

- GIVEN a profile name or profile file would escape `~/.pi/gentle-ai/model-profiles/` or does not contain a valid model routing export envelope
- WHEN the user attempts to use that profile operation
- THEN the package rejects the operation
- AND active model routing configuration is not changed
- AND unrelated profile files are not changed

### Requirement: Fixed export and restore behavior remains unchanged

The `x` and `r` export and restore behavior for `~/.pi/gentle-ai/models.export.json` MUST remain unchanged by model profile helper extraction.

Named profile save, load, overwrite, list, and delete operations MUST NOT create, modify, delete, or require `~/.pi/gentle-ai/models.export.json` unless the user explicitly invokes the existing export or restore action.

#### Scenario: profile operations do not touch fixed export file

- GIVEN the user is managing named profiles from `/gentle:models`
- WHEN the user saves, loads, overwrites, lists, or deletes a profile
- THEN `~/.pi/gentle-ai/models.export.json` is not created, modified, deleted, or required by that profile operation

#### Scenario: fixed export and restore path is preserved

- GIVEN the user opens `/gentle:models`
- WHEN the user presses `x` or `r`
- THEN export and restore continue to use `~/.pi/gentle-ai/models.export.json`
- AND named profile files under `~/.pi/gentle-ai/model-profiles/` are not modified by those fixed export or restore actions

### Requirement: Runtime harness remains integration-oriented

The runtime harness MUST cover the `/gentle:models` profile flow at the integration level and MUST NOT be the primary place for unit-level assertions about profile helper internals.

Focused unit tests MUST cover helper-level behavior separately from the runtime harness.

#### Scenario: harness validates profile UI flow

- GIVEN the runtime harness exercises model profile behavior
- WHEN it validates save, load, overwrite, delete, and notification behavior through `/gentle:models`
- THEN it treats profile helpers as implementation details
- AND helper-level filename, envelope, listing, and path safety cases are covered by focused unit tests

### Requirement: Internal testing bridge is not a compatibility contract

`__testing.modelProfiles` MUST NOT be treated as a public or stable compatibility contract for model profile helpers.

The package MAY reduce, remove, or temporarily retain `__testing.modelProfiles` only as an internal bridge needed by existing integration coverage.

#### Scenario: tests do not require testing bridge stability

- GIVEN profile helper tests need access to helper behavior
- WHEN the tests are written for this change
- THEN they import the focused helper module directly
- AND they do not require `__testing.modelProfiles` to exist or preserve a stable shape

### Requirement: No UX flow change in extraction slice

The extraction slice MUST preserve the existing `/gentle:models` profile UX flow, including the profile sub-panel and existing save, load, overwrite, and delete actions.

The extraction MUST keep profile behavior organized so a follow-up picker-first UX change can build on the helper boundary without requiring another profile storage compatibility change.

#### Scenario: current profile panel flow is unchanged

- GIVEN the user opens `/gentle:models`
- WHEN the user navigates profile actions
- THEN the existing profile sub-panel flow and profile action semantics remain available
- AND no picker-first UX is introduced by this change

#### Scenario: extraction does not block future picker-first UX

- GIVEN a future change introduces a picker-first profile UX
- WHEN that change needs profile listing, validation, reading, writing, or deletion behavior
- THEN those behaviors are available behind the focused helper boundary
- AND existing profile files remain compatible
