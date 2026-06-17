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
