# Spec Delta: model-routing canonical cleanup

## MODIFIED Requirements

### Requirement: profile storage compatibility and file safety

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
- And no profile file format migration is required

### Scenario: unsafe or invalid profile input is rejected

- Given a profile name or profile file would escape
  `~/.pi/gentle-ai/model-profiles/` or does not contain a valid model routing
  export envelope
- When the user attempts to use that profile operation
- Then the package rejects the operation
- And active model routing configuration is not changed
- And unrelated profile files are not changed

### Requirement: no picker-first profile UX yet

The package MUST preserve the existing `/gentle:models` profile UX behavior,
including save, load, overwrite, and delete semantics.

This cleanup does not introduce picker-first profile UX.

### Scenario: current profile behavior is unchanged

- Given the user opens `/gentle:models`
- When the user navigates profile actions
- Then the existing profile action semantics remain available
- And no picker-first UX is introduced by this change

## REMOVED Requirements

### Requirement: extracted profile helper boundary

This requirement is removed from the canonical spec because helper-module
boundaries and focused unit-test import paths are implementation/testing
mechanics. The archived `model-profiles-ux` artifacts retain that rationale.

### Requirement: runtime harness remains integration-oriented

This requirement is removed from the canonical spec because runtime harness
scope is internal test architecture, not canonical product/system behavior. The
archived `model-profiles-ux` artifacts retain that rationale.

### Requirement: internal testing bridge is not a compatibility contract

This requirement is removed from the canonical spec because the stability of
`__testing.modelProfiles` is an internal test bridge decision, not canonical
product/system behavior. The archived `model-profiles-ux` artifacts retain that
rationale.
