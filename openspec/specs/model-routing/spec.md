# Spec: Named model profiles

## Requirement: named model profiles

The package MUST support named model profiles managed from the existing
`/gentle:models` UI.

### Scenario: profiles are available from model routing UI

- Given the user opens `/gentle:models`
- Then the UI offers profile actions for saving, loading, overwriting, and
  deleting named model profiles
- And the UI keeps the existing model assignment workflow available

## Requirement: profile list and CRUD

The package MUST list available profiles stored in
`~/.pi/gentle-ai/model-profiles/` from the `/gentle:models` UI.

The package MUST save the current assignments as a named profile.

The package MUST load a profile into active configuration.

The package MUST overwrite an existing profile by name.

The package MUST delete an existing profile.

Profiles MUST be stored as JSON files inside `model-profiles/` using
filesystem-safe filenames.

### Scenario: save current assignments as a profile

- Given the user opens `/gentle:models`
- And selects "Save current assignments as profile"
- When they enter a profile name
- Then a file is written under `~/.pi/gentle-ai/model-profiles/`
- And the filename is derived from the profile name using a filesystem-safe form
- And the file uses the model routing export envelope used by restore/export

### Scenario: load a valid profile

- Given a valid profile exists under `~/.pi/gentle-ai/model-profiles/`
- And the user opens `/gentle:models`
- When they select "Load profile"
- And choose that profile
- Then the profile assignments are applied to the active model routing
  configuration
- And the same validation rules used by restore/export are honored

### Scenario: reject invalid profile contents

- Given a profile file exists under `~/.pi/gentle-ai/model-profiles/`
- And the file does not contain a valid model routing export envelope
- When the user selects "Load profile"
- And chooses that profile
- Then the package warns that the profile is invalid
- And the active model routing configuration is not changed

### Scenario: overwrite existing profile

- Given a profile named `daily-routing` already exists
- And the user opens `/gentle:models`
- When they choose to overwrite `daily-routing` with the current assignments
- Then the existing profile file is replaced with a valid profile export
  envelope
- And no unrelated profile files are changed

### Scenario: delete existing profile

- Given a profile named `daily-routing` exists under
  `~/.pi/gentle-ai/model-profiles/`
- And the user opens `/gentle:models`
- When they choose to delete `daily-routing`
- Then the corresponding profile file is removed
- And the active model routing configuration is not changed

## Requirement: compatibility of existing export format

Existing behavior of `x`/`r` with `~/.pi/gentle-ai/models.export.json` MUST
remain unchanged.

Loading/saving profiles MUST NOT remove or alter `models.export.json` behavior.

### Scenario: fixed export path remains unchanged

- Given the user opens `/gentle:models`
- When they press `x` to export model routing
- Then the package writes `~/.pi/gentle-ai/models.export.json`
- And no named profile is created or modified unless the user explicitly chooses
  a profile action

### Scenario: fixed restore path remains unchanged

- Given `~/.pi/gentle-ai/models.export.json` contains a valid model routing
  export envelope
- And the user opens `/gentle:models`
- When they press `r` to restore model routing
- Then the package restores from `~/.pi/gentle-ai/models.export.json`
- And named profile files under `~/.pi/gentle-ai/model-profiles/` are not
  required
- And named profile files are not modified

## Requirement: profile storage compatibility and file safety

The package MUST preserve compatibility with existing profile files under
`~/.pi/gentle-ai/model-profiles/`.

Profile files MUST use the existing model routing export envelope.

Profile operations MUST reject unsafe filenames, path traversal, invalid JSON,
invalid envelope kind or version, and missing or malformed routing content
without changing active model routing configuration.

### Scenario: existing profile file remains loadable

- Given an existing profile file under `~/.pi/gentle-ai/model-profiles/`
  contains a valid model routing export envelope
- When the user loads that profile from `/gentle:models`
- Then the profile assignments are applied to active model routing configuration
  And no profile file format migration is required

### Scenario: unsafe or invalid profile input is rejected

- Given a profile name or profile file would escape
  `~/.pi/gentle-ai/model-profiles/` or does not contain a valid model routing
  export envelope
- When the user attempts to use that profile operation
- Then the package rejects the operation
- And active model routing configuration is not changed
- And unrelated profile files are not changed

## Requirement: Picker-first model profile entry

The package MUST show a picker/list of existing named model profiles when the
user enters profiles from `/gentle:models`, instead of showing an action-first
profile panel.

The profile picker MUST list existing profiles alphabetically and MUST NOT mark
the currently loaded or matching profile in this change.

### Scenario: entering profiles shows alphabetical profile picker

- GIVEN multiple named profiles exist under `~/.pi/gentle-ai/model-profiles/`
- WHEN the user enters profiles from `/gentle:models`
- THEN the UI shows a profile picker/list first
- AND the profiles are ordered alphabetically
- AND the UI does not display a marker for the currently loaded or matching
  profile
- AND the existing model assignment workflow remains available when the user
  backs out

## Requirement: Picker profile operations

The profile picker MUST preserve existing save, load, overwrite, and delete
semantics through the picker-first flow.

Pressing `Enter` on a selected profile MUST load that profile immediately
without an additional confirmation prompt.

Pressing `n` MUST create a new profile from the current assignments.

Pressing `o` on a selected profile MUST overwrite that profile only after
confirmation, matching existing overwrite safety behavior.

Pressing `d` on a selected profile MUST delete that profile only after
confirmation.

Successful profile operations MUST keep the profile picker open unless the
user exits with `Esc` or `b`.

### Scenario: selected profile loads immediately

- GIVEN a valid named profile is selected in the profile picker
- WHEN the user presses `Enter`
- THEN the selected profile assignments are applied to the active model routing
  configuration
- AND no additional confirmation prompt is shown
- AND the profile picker remains open after the successful load

### Scenario: invalid selected profile is rejected safely

- GIVEN a selected profile file does not contain a valid model routing export
  envelope or would be unsafe to load
- WHEN the user presses `Enter`
- THEN the package rejects the profile
- AND the active model routing configuration is not changed
- AND the profile picker remains available after the rejection

### Scenario: create a new profile from picker

- GIVEN the user is viewing the profile picker
- WHEN the user presses `n`
- AND enters a valid new profile name
- THEN the current assignments are saved as a named profile using the existing
  profile save semantics
- AND the profile picker remains open after the successful save

### Scenario: overwrite selected profile after confirmation

- GIVEN a named profile is selected in the profile picker
- WHEN the user presses `o`
- AND confirms the overwrite prompt
- THEN the selected profile is replaced with the current assignments using the
  existing overwrite safety behavior
- AND no unrelated profile files are changed
- AND the profile picker remains open after the successful overwrite

### Scenario: delete selected profile after confirmation

- GIVEN a named profile is selected in the profile picker
- WHEN the user presses `d`
- AND confirms the delete prompt
- THEN the selected profile file is removed
- AND the active model routing configuration is not changed
- AND the profile picker remains open after the successful delete

## Requirement: Profile picker navigation and empty state

The profile picker MUST support backing out one level with `Esc` or `b`.

Confirmation prompts MUST return to the profile picker when the user presses
`Esc`, `b`, or `n`. Text entry prompts MUST treat printable characters,
including `b` and `n`, as input and use `Esc` to cancel.

The profile picker MUST return to the previous `/gentle:models` view when the
user presses `Esc` or `b` from the picker itself.

When no named profiles exist, the picker MUST clearly state that no profiles
exist and that creating a new profile from current assignments is available.

### Scenario: secondary prompt backs out to picker

- GIVEN the user is in an overwrite or delete confirmation prompt opened from
  the profile picker
- WHEN the user presses `Esc`, `b`, or `n`
- THEN the prompt is dismissed
- AND the user returns to the profile picker
- AND no profile operation is completed by the back action

### Scenario: picker backs out to previous models view

- GIVEN the user is viewing the profile picker
- WHEN the user presses `Esc` or `b`
- THEN the UI returns to the previous `/gentle:models` view
- AND no profile operation is completed by the back action

### Scenario: empty picker advertises create availability

- GIVEN no named profiles exist under `~/.pi/gentle-ai/model-profiles/`
- WHEN the user enters profiles from `/gentle:models`
- THEN the UI clearly states that no profiles exist
- AND the UI indicates that creating a new profile from current assignments is
  available

## Requirement: Profile compatibility remains unchanged

The picker-first profile flow MUST preserve the existing profile file format,
the `~/.pi/gentle-ai/model-profiles/` storage location, and the existing model
routing export envelope.

The picker-first profile flow MUST NOT introduce migration behavior for
existing profile files.

Existing `x` and `r` behavior for `~/.pi/gentle-ai/models.export.json` MUST
remain unchanged and MUST NOT create, modify, delete, or require named profile
files unless the user explicitly chooses a profile operation.

### Scenario: profile storage compatibility is preserved

- GIVEN an existing profile file under `~/.pi/gentle-ai/model-profiles/`
  contains a valid model routing export envelope
- WHEN the user loads that profile from the profile picker
- THEN the profile assignments are applied to the active model routing
  configuration
- AND no profile file format migration is required

### Scenario: fixed export and restore behavior is preserved

- GIVEN the user opens `/gentle:models`
- WHEN the user presses `x` or `r`
- THEN export and restore continue to use `~/.pi/gentle-ai/models.export.json`
- AND named profile files under `~/.pi/gentle-ai/model-profiles/` are not
  modified by those fixed export or restore actions
