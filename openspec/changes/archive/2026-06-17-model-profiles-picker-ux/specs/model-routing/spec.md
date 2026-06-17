# Delta for Model Routing

## ADDED Requirements

### Requirement: Picker-first model profile entry

The package MUST show a picker/list of existing named model profiles when the user enters profiles from `/gentle:models`, instead of showing an action-first profile panel.

The profile picker MUST list existing profiles alphabetically and MUST NOT mark the currently loaded or matching profile in this change.

#### Scenario: entering profiles shows alphabetical profile picker

- GIVEN multiple named profiles exist under `~/.pi/gentle-ai/model-profiles/`
- WHEN the user enters profiles from `/gentle:models`
- THEN the UI shows a profile picker/list first
- AND the profiles are ordered alphabetically
- AND the UI does not display a marker for the currently loaded or matching profile
- AND the existing model assignment workflow remains available when the user backs out

### Requirement: Picker profile operations

The profile picker MUST preserve existing save, load, overwrite, and delete semantics through the picker-first flow.

Pressing `Enter` on a selected profile MUST load that profile immediately without an additional confirmation prompt.

Pressing `n` MUST create a new profile from the current assignments.

Pressing `o` on a selected profile MUST overwrite that profile only after confirmation, matching existing overwrite safety behavior.

Pressing `d` on a selected profile MUST delete that profile only after confirmation.

Successful profile operations MUST keep the profile picker open unless the user exits with `Esc` or `b`.

#### Scenario: selected profile loads immediately

- GIVEN a valid named profile is selected in the profile picker
- WHEN the user presses `Enter`
- THEN the selected profile assignments are applied to the active model routing configuration
- AND no additional confirmation prompt is shown
- AND the profile picker remains open after the successful load

#### Scenario: invalid selected profile is rejected safely

- GIVEN a selected profile file does not contain a valid model routing export envelope or would be unsafe to load
- WHEN the user presses `Enter`
- THEN the package rejects the profile
- AND the active model routing configuration is not changed
- AND the profile picker remains available after the rejection

#### Scenario: create a new profile from picker

- GIVEN the user is viewing the profile picker
- WHEN the user presses `n`
- AND enters a valid new profile name
- THEN the current assignments are saved as a named profile using the existing profile save semantics
- AND the profile picker remains open after the successful save

#### Scenario: overwrite selected profile after confirmation

- GIVEN a named profile is selected in the profile picker
- WHEN the user presses `o`
- AND confirms the overwrite prompt
- THEN the selected profile is replaced with the current assignments using the existing overwrite safety behavior
- AND no unrelated profile files are changed
- AND the profile picker remains open after the successful overwrite

#### Scenario: delete selected profile after confirmation

- GIVEN a named profile is selected in the profile picker
- WHEN the user presses `d`
- AND confirms the delete prompt
- THEN the selected profile file is removed
- AND the active model routing configuration is not changed
- AND the profile picker remains open after the successful delete

### Requirement: Profile picker navigation and empty state

The profile picker MUST support backing out one level with `Esc` or `b`.

Confirmation prompts MUST return to the profile picker when the user presses `Esc`, `b`, or `n`. Text entry prompts MUST treat printable characters, including `b` and `n`, as input and use `Esc` to cancel.

The profile picker MUST return to the previous `/gentle:models` view when the user presses `Esc` or `b` from the picker itself.

When no named profiles exist, the picker MUST clearly state that no profiles exist and that creating a new profile from current assignments is available.

#### Scenario: secondary prompt backs out to picker

- GIVEN the user is in an overwrite or delete confirmation prompt opened from the profile picker
- WHEN the user presses `Esc`, `b`, or `n`
- THEN the prompt is dismissed
- AND the user returns to the profile picker
- AND no profile operation is completed by the back action

#### Scenario: picker backs out to previous models view

- GIVEN the user is viewing the profile picker
- WHEN the user presses `Esc` or `b`
- THEN the UI returns to the previous `/gentle:models` view
- AND no profile operation is completed by the back action

#### Scenario: empty picker advertises create availability

- GIVEN no named profiles exist under `~/.pi/gentle-ai/model-profiles/`
- WHEN the user enters profiles from `/gentle:models`
- THEN the UI clearly states that no profiles exist
- AND the UI indicates that creating a new profile from current assignments is available

### Requirement: Profile compatibility remains unchanged

The picker-first profile flow MUST preserve the existing profile file format, the `~/.pi/gentle-ai/model-profiles/` storage location, and the existing model routing export envelope.

The picker-first profile flow MUST NOT introduce migration behavior for existing profile files.

Existing `x` and `r` behavior for `~/.pi/gentle-ai/models.export.json` MUST remain unchanged and MUST NOT create, modify, delete, or require named profile files unless the user explicitly chooses a profile operation.

#### Scenario: profile storage compatibility is preserved

- GIVEN an existing profile file under `~/.pi/gentle-ai/model-profiles/` contains a valid model routing export envelope
- WHEN the user loads that profile from the profile picker
- THEN the profile assignments are applied to the active model routing configuration
- AND no profile file format migration is required

#### Scenario: fixed export and restore behavior is preserved

- GIVEN the user opens `/gentle:models`
- WHEN the user presses `x` or `r`
- THEN export and restore continue to use `~/.pi/gentle-ai/models.export.json`
- AND named profile files under `~/.pi/gentle-ai/model-profiles/` are not modified by those fixed export or restore actions

## REMOVED Requirements

### Requirement: no picker-first profile UX yet

(Reason: This temporary constraint from the helper-extraction slice is replaced by the picker-first profile flow for `/gentle:models`.)
(Migration: None; profile file format, storage location, export envelope, and fixed export/restore behavior remain unchanged.)
