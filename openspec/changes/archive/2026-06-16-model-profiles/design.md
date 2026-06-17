# Design: model-profiles

## Overview

Named model profiles extend the existing `/gentle:models` routing workflow with
multiple saved presets. Profiles are separate from the current global routing
config and separate from the fixed export/restore file:

- active config remains `~/.pi/gentle-ai/models.json`;
- fixed export/restore remains `~/.pi/gentle-ai/models.export.json`;
- named profiles live under `~/.pi/gentle-ai/model-profiles/*.json`.

A profile file stores the same versioned export envelope already used by
`x`/`r`, so profile load can reuse existing validation and active config write
logic instead of introducing a second routing schema.

## Current implementation anchors

- `gentleAiConfigHome()` resolves the shared config root.
- `modelConfigPath()` resolves the active global routing config.
- `modelExportPath()` resolves the fixed `models.export.json` file.
- `MODEL_EXPORT_KIND`, `MODEL_EXPORT_VERSION`, and `parseModelExport()` define
  the existing export envelope and validation.
- `exportSavedModelConfig()` writes the fixed export file from the saved config.
- `readModelExport()` reads the fixed export file.
- `writeModelConfigAsync()` writes active routing config.
- `applyModelConfigAsync()` applies active routing to agent frontmatter and
  builtin overrides.
- `SddModelPanel` currently returns `save`, `custom`, `export`, `restore`, or
  `cancel` results.

The implementation should add profile behavior near these model-routing helpers
without reformatting unrelated code.

## Code organization

Prefer a small, focused module for new profile storage behavior when it can be
introduced without moving existing export/restore code. For example,
`lib/model-profiles.ts` can own filesystem-safe names, profile directory/path
resolution, profile list/read/write/delete operations, and envelope read/write
helpers that receive the existing kind/version or parser dependencies.

Keep `extensions/gentle-ai.ts` responsible for command integration only:
keybindings, panel result variants, prompts, confirmations, notifications,
writing active config, and applying routing to agents.

Do not perform a broad extraction of existing model-routing code just to create
the new module. If clean separation would require moving private helpers such as
`parseModelExport()`, `MODEL_EXPORT_KIND`, `MODEL_EXPORT_VERSION`, or existing
config writers across files, keep the new helper block local to
`extensions/gentle-ai.ts` for this change and defer extraction to a dedicated
refactor.

## Data model

Profile JSON files MUST use the existing export envelope:

```json
{
  "kind": "gentle-pi.agent_model_routing",
  "version": 1,
  "agents": {
    "sdd-design": {
      "model": "anthropic/claude-sonnet-4",
      "thinking": "high"
    }
  }
}
```

This keeps profile load equivalent to restore after choosing a different file.
Invalid JSON, wrong `kind`, unsupported `version`, missing/invalid `agents`, or
entries rejected by `normalizeModelConfig()` must not change active config.

## Profile storage helpers

Add helpers adjacent to `modelExportPath()` and export-envelope helpers:

- `modelProfilesDir(cwd)` returns
  `join(gentleAiConfigHome(), "model-profiles")`.
- `safeModelProfileFilename(name)` converts a user-visible name into a stable,
  filesystem-safe basename plus `.json`.
- `modelProfilePath(cwd, name)` joins the profiles directory and safe filename.
- `listModelProfiles(ctx)` returns display names and paths for valid `.json`
  files in the profile directory.
- `writeModelProfile(ctx, name, config)` writes the export envelope to the safe
  path, creating the directory first.
- `readModelProfile(ctx, profile)` reads JSON and validates with
  `parseModelExport()`.
- `deleteModelProfile(ctx, profile)` removes only the selected profile path.

Filename safety should prevent path traversal and shell/control characters. A
simple approach is to trim, lowercase, replace unsupported characters with `-`,
collapse repeated separators, and reject an empty result. If two different names
normalize to the same filename, they intentionally address the same profile and
therefore overwrite the same file only after the overwrite flow confirms intent.

## UI flow

Keep the existing assignment list as the primary `/gentle:models` screen. Add
profile actions without changing `x` and `r` semantics.

Recommended key shape:

- `p`: open a profile action menu;
- `x`: unchanged fixed export to `models.export.json`;
- `r`: unchanged fixed restore from `models.export.json`;
- existing model, effort, custom, inherit, save, and cancel keys unchanged.

The profile menu can be implemented by returning a new `ModelPanelResult` from
`SddModelPanel`, then handling the multi-step flow in `handleModelsCommand()`.
This avoids embedding filesystem or prompt side effects inside the overlay
component.

Suggested result variants:

```ts
| { type: "profile-menu"; config: AgentModelConfig }
| { type: "profile-save"; config: AgentModelConfig }
| { type: "profile-load"; config: AgentModelConfig }
| { type: "profile-overwrite"; config: AgentModelConfig }
| { type: "profile-delete"; config: AgentModelConfig }
```

The handler can use existing `ctx.ui.input`, `ctx.ui.select`, `ctx.ui.confirm`,
and `ctx.ui.notify` primitives:

1. save profile:
   - ask for a profile name;
   - validate/sanitize filename;
   - if the target exists, confirm overwrite;
   - write the current draft config as an export envelope;
   - notify path and entry count;
   - return to the model panel with the same draft config.
2. load profile:
   - list profiles;
   - select one;
   - read and validate envelope;
   - confirm replacing active config;
   - write `models.json` and apply routing;
   - update the in-memory panel config to loaded values;
   - notify success or warning.
3. overwrite profile:
   - list profiles;
   - select one;
   - confirm replacement;
   - write current draft config to that profile file;
   - do not modify active config unless the user later saves.
4. delete profile:
   - list profiles;
   - select one;
   - confirm deletion;
   - remove the selected file;
   - do not modify active config.

If no profiles exist, load/overwrite/delete should notify that there are no
profiles and return to the model panel.

## Compatibility constraints

- `modelExportPath()` and `exportSavedModelConfig()` must remain the only path
  used by `x` export.
- `readModelExport()` must keep reading only `models.export.json` for `r`
  restore.
- Profile save/load must not create, delete, or rewrite `models.export.json`.
- Legacy project-local `.pi/gentle-ai/models.json` fallback behavior must remain
  unchanged.
- Do not reformat, reorder, or rewrite unrelated code while implementing this
  change.

## Testing strategy

Prefer a focused test file for this feature, such as
`tests/model-profiles.test.mjs`, if the runtime harness helpers can be reused or
extracted with a small, low-risk change. A separate file keeps profile behavior
reviewable and avoids growing `tests/runtime-harness.mjs` further.

If the existing harness does not expose reusable helpers and separating tests
would require broad restructuring, extend `tests/runtime-harness.mjs` near the
current `/gentle:models` export and restore coverage. In that fallback, keep the
new cases grouped under a clearly named model-profiles section and avoid
reformatting unrelated harness code.

Recommended cases:

1. save profile:
   - drive the panel to profile save;
   - provide a name;
   - assert `model-profiles/<safe-name>.json` exists;
   - assert the JSON envelope has the existing kind/version and expected agents.
2. load valid profile:
   - prewrite a valid profile envelope;
   - drive profile load and confirm;
   - assert `models.json` changed;
   - assert agent frontmatter/settings application follows existing restore
     behavior.
3. reject invalid profile:
   - prewrite invalid JSON or wrong envelope;
   - attempt load;
   - assert warning notification;
   - assert `models.json` and agent files are unchanged.
4. overwrite and delete:
   - prewrite a profile;
   - overwrite with current draft config and assert file replacement;
   - delete it and assert only that profile path is removed.
5. compatibility regression:
   - keep existing `x`/`r` tests asserting `models.export.json` behavior;
   - add assertions that profile actions do not touch `models.export.json`.

Because `openspec/config.yaml` declares strict TDD, implementation should start
by adding failing coverage, preferably in the focused profile test file. If the
fallback harness path is chosen, add the failing cases in the existing runtime
harness first, then make them pass with the smallest code changes.

## Tradeoffs

- Reusing the export envelope avoids a new profile schema and keeps validation
  centralized, but profile files contain a technical envelope rather than a
  minimal `agents` object.
- Filesystem-safe normalized names are predictable and portable, but different
  display names can collide. Treating collisions as intentional overwrite targets
  is simpler than maintaining a separate profile index.
- Keeping profile side effects outside `SddModelPanel` preserves the current UI
  separation, but it adds several handler result variants.

## Open questions

- Exact keybinding and labels for profile actions can be adjusted during
  implementation if the existing modal layout is too tight.
- If a future UI supports richer menus, profile action selection can move from
  key-driven variants to a dedicated profile submenu without changing storage.
