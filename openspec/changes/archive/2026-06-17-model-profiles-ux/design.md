# Technical Design: model-profiles-ux

## Scope

This change is a maintainability-first extraction slice for the existing `/gentle:models` named profile behavior from commit `f97eeac5`. It does not change the profile UI flow, the fixed export/restore flow, or the on-disk profile format. Runtime work should stay centered on `extensions/gentle-ai.ts`, a new `lib/model-profiles.ts`, and profile-focused tests.

## Chosen module boundary

Create `lib/model-profiles.ts` as the owner of model profile storage, filename/path safety, envelope construction, reading, writing, deletion, and listing.

The module should export:

- `MODEL_PROFILE_FILENAME_PATTERN`
- `MAX_MODEL_PROFILE_FILENAME_LENGTH`
- `type ModelProfileEntry = { filename: string; path: string }`
- `modelProfilesDir()`
- `safeModelProfileFilename(name)`
- `isSafeModelProfileFilename(filename)`
- `listModelProfiles()`
- `buildModelProfileEnvelope(agents)`
- `writeModelProfileFile(path, agents)`
- `writeModelProfile(name, agents)`
- `readModelProfile(filename)`
- `deleteModelProfile(filename)`

`extensions/gentle-ai.ts` should import these helpers and keep the command orchestration in place: prompting, confirmation, notification wording, applying loaded configs to agents, and model panel rendering. The `SddModelPanel` and `handleModelsCommand()` profile branches should continue to call helpers with the same inputs they use today.

The new module should preserve current path semantics: `modelProfilesDir()` resolves to `join(gentleAiConfigHome(), "model-profiles")`, and named profiles are JSON files under that directory only.

## Dependency strategy for private helpers/constants

The current profile helpers depend on file-private model routing utilities in `extensions/gentle-ai.ts`:

- `gentleAiConfigHome()`
- `parseModelExport()`
- `normalizeModelConfig()`
- `MODEL_EXPORT_KIND`
- `MODEL_EXPORT_VERSION`
- supporting validation helpers/types such as `AgentModelConfig`, `AgentRoutingEntry`, `ThinkingLevel`, `isRecord()`, `normalizeRoutingEntry()`

For this slice, prefer extracting the shared model routing envelope and normalization helpers from `extensions/gentle-ai.ts` into `lib/model-profiles.ts` only if they are strictly needed by profile storage. To avoid duplicating validation logic, `lib/model-profiles.ts` should become the single owner of the model routing export envelope helpers it needs:

- export `MODEL_EXPORT_KIND` and `MODEL_EXPORT_VERSION` from `lib/model-profiles.ts`;
- export `normalizeModelConfig(value)` and `parseModelExport(value)` from `lib/model-profiles.ts`;
- export or locally define the minimal model routing types required by these functions if those types are not already importable from another library module;
- export `buildModelProfileEnvelope()` using those shared envelope constants and normalization helpers.

Then `extensions/gentle-ai.ts` should import the same envelope helpers/constants back from `lib/model-profiles.ts` for the existing fixed `models.export.json` export/restore path. This keeps named profiles and `x`/`r` export/restore on one envelope implementation and reduces drift risk.

`gentleAiConfigHome()` can move to `lib/model-profiles.ts` only if no other extraction target exists in this slice. Because many unrelated extension helpers still use it, the lower-churn approach is to duplicate only a tiny exported `gentleAiConfigHome()` in `lib/model-profiles.ts` with identical implementation, then later consolidate config-path ownership in a broader config module if desired. Do not make `lib/model-profiles.ts` import from `extensions/gentle-ai.ts`; that would invert the dependency and keep tests coupled to the extension entrypoint.

## Envelope helper export vs dependency injection tradeoff

Two implementation options were considered:

1. **Export shared envelope helpers/constants from the new module.**
   - Pros: one validation/envelope implementation for profiles and fixed export/restore; direct unit-test imports; no per-call boilerplate; clear future picker-first UX dependency.
   - Cons: slightly broadens the public surface of `lib/model-profiles.ts` beyond profile CRUD.

2. **Dependency-inject `parseModelExport`, `normalizeModelConfig`, `MODEL_EXPORT_KIND`, `MODEL_EXPORT_VERSION`, and config-home path resolution into profile functions.**
   - Pros: keeps the new module narrowly storage-oriented.
   - Cons: noisy call sites; easier for profile and fixed export behavior to drift; harder for focused tests to exercise the real production envelope; risks leaving a thin but awkward bridge in `extensions/gentle-ai.ts`.

Choose option 1. Export the shared envelope helpers/constants from `lib/model-profiles.ts` and import them into `extensions/gentle-ai.ts`. This is the lowest-maintenance boundary for the approved extraction and directly supports focused unit tests without preserving `__testing.modelProfiles`.

## Data flow after extraction

### Save profile

1. `/gentle:models` returns `profile-save` with current draft config.
2. Handler prompts for a profile name.
3. Handler calls `safeModelProfileFilename(name)` to validate and compute notification/check path.
4. Handler checks `join(modelProfilesDir(), filename)` for overwrite confirmation.
5. Handler calls `writeModelProfile(name, result.config)`.
6. `lib/model-profiles.ts` normalizes config, wraps it with `{ kind, version, agents }`, creates the profile directory, and writes `<profile>.json` with trailing newline.

### Load profile

1. Handler calls `listModelProfiles()` and offers filenames with the existing `ctx.ui.select()` flow.
2. Handler calls `readModelProfile(filename)`.
3. `lib/model-profiles.ts` rejects unsafe filenames, missing files, invalid JSON, wrong kind/version, and malformed routing content by returning `undefined`.
4. Handler preserves current warning/confirmation behavior and only writes active config after a valid load is confirmed.

### Overwrite/delete profile

`listModelProfiles()` remains the source of selectable safe filenames and absolute paths. Overwrite writes the selected `profile.path` through `writeModelProfileFile()`. Delete calls `deleteModelProfile(profile.filename)`, which no-ops for unsafe or missing filenames.

### Fixed export/restore

`exportSavedModelConfig()` and `readModelExport()` in `extensions/gentle-ai.ts` should continue to use `modelExportPath(ctx.cwd)`, which resolves to `~/.pi/gentle-ai/models.export.json`. They should use the shared envelope constants/parser from `lib/model-profiles.ts` but must not use profile paths or profile CRUD helpers.

## File changes

Expected implementation files for the next phase:

- `lib/model-profiles.ts` — new extracted helper module and shared envelope helpers/constants.
- `extensions/gentle-ai.ts` — remove extracted profile helper definitions; import profile and envelope helpers; optionally reduce or remove `__testing.modelProfiles`.
- `tests/model-profiles.test.ts` — new focused unit tests importing directly from `lib/model-profiles.ts`.
- `tests/runtime-harness.mjs` — remove the `profiles-unit` direct `__testing.modelProfiles` block; keep integration flow coverage for `/gentle:models` profile save/load/overwrite/delete and fixed export/restore invariants.

No runtime implementation should be changed during the design phase.

## Test strategy

Use the existing package command:

```sh
pnpm test
```

This runs TypeScript unit tests via:

```sh
node --experimental-strip-types --test tests/*.test.ts
```

and then the runtime harness:

```sh
pnpm run test:harness
```

Add `tests/model-profiles.test.ts` with focused coverage for:

- `modelProfilesDir()` honoring `GENTLE_PI_CONFIG_HOME` and returning `<home>/model-profiles`;
- `safeModelProfileFilename()` happy paths and sanitization such as `Daily Routing / v2 -> daily-routing-v2.json` and `../escape -> escape.json`;
- unsafe/empty names returning `undefined`;
- `isSafeModelProfileFilename()` rejecting traversal, missing `.json`, spaces, hidden files, and malformed basenames;
- `listModelProfiles()` returning `[]` for a missing directory, filtering unsafe names/non-files, and sorting safe files by filename;
- `writeModelProfile()` creating directories, normalizing entries, writing the existing envelope kind/version, and returning the profile path;
- overwrite behavior when writing the same profile name twice;
- `readModelProfile()` returning normalized config for a valid envelope and `undefined` for missing files, unsafe filenames, invalid JSON, wrong kind, wrong version, or malformed routing content;
- `deleteModelProfile()` deleting safe existing profiles, no-oping missing profiles, and not deleting via unsafe/traversal names;
- profile operations never creating, modifying, deleting, or requiring `<home>/models.export.json`.

Tests should use temporary directories and restore `process.env.GENTLE_PI_CONFIG_HOME` in `finally` blocks.

## Runtime harness trimming strategy

Remove the current helper-internal `profiles-unit` section from `tests/runtime-harness.mjs`, including the dynamic import of `__testing.modelProfiles` and assertions for helper pathing, filename safety, direct CRUD, invalid JSON, and fixed export untouched behavior at helper level.

Keep the existing integration-oriented `/gentle:models` profile flow coverage:

- profile panel shows empty/listed profile state;
- save creates the expected named profile envelope;
- load applies the profile to `models.json` and agent frontmatter after confirmation;
- overwrite replaces the selected profile content;
- invalid profile load warns and leaves active config unchanged;
- delete removes the selected profile and leaves unrelated invalid files alone;
- profile operations do not touch `models.export.json`.

Keep the existing fixed export/restore harness coverage for `x`/`r` and `~/.pi/gentle-ai/models.export.json` unchanged.

`__testing.modelProfiles` should not be preserved as a compatibility contract. If the harness no longer needs it after trimming, remove it from `__testing`. If a temporary internal bridge is necessary during the extraction, keep only the minimal shape required and do not add new tests that depend on it.

## Backward compatibility

- Existing files under `~/.pi/gentle-ai/model-profiles/` remain loadable if they contain `{ kind: "gentle-pi.agent_model_routing", version: 1, agents: ... }`.
- No profile file migration is introduced.
- Profile filename sanitization, validation, sorting, and deletion semantics remain unchanged.
- Invalid profile files continue to be rejected without changing active model routing config.
- Fixed `x`/`r` export/restore behavior continues to use `~/.pi/gentle-ai/models.export.json` and is not coupled to named profile operations.
- User-visible profile UI remains the existing `p` sub-panel with `s`/`l`/`o`/`d` actions; picker-first UX is explicitly deferred.
- Upstream formatting should be preserved: move code with minimal edits, avoid autoformatting, and avoid unrelated rewrites in `extensions/gentle-ai.ts`.

## Review workload forecast

Expected review size is below the 400 changed-line budget:

- `lib/model-profiles.ts`: roughly 120-170 lines, mostly moved helper code plus exported envelope helpers.
- `extensions/gentle-ai.ts`: net reduction, with imports replacing private helpers and optional `__testing.modelProfiles` removal.
- `tests/model-profiles.test.ts`: roughly 120-180 lines of focused tests.
- `tests/runtime-harness.mjs`: net reduction from deleting the helper-unit block, with profile integration tests retained.

A single PR is appropriate. The main review task is confirming behavior was moved rather than changed.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Envelope behavior drifts between profiles and fixed export/restore | Export one shared `parseModelExport()`, `normalizeModelConfig()`, `MODEL_EXPORT_KIND`, and `MODEL_EXPORT_VERSION` from `lib/model-profiles.ts` and import them in `extensions/gentle-ai.ts`. |
| Extraction accidentally changes path behavior | Keep `modelProfilesDir()` implementation identical and test `GENTLE_PI_CONFIG_HOME` behavior directly. |
| Path traversal protection is weakened | Keep `isSafeModelProfileFilename()` as the gate for read/delete and `safeModelProfileFilename()` as the gate for writes; unit-test traversal inputs and unsafe filenames. |
| Runtime harness loses meaningful coverage | Move helper assertions to `tests/model-profiles.test.ts`, but retain full `/gentle:models` save/load/overwrite/delete flow in the harness. |
| Removal of `__testing.modelProfiles` breaks hidden assumptions | Treat it as internal only; direct tests import from `lib/model-profiles.ts`; if any temporary bridge remains, do not document it as stable. |
| Shared helper exports expand module responsibility | Limit exports to model routing envelope/profile helpers needed by profiles and existing export/restore; defer broader model config extraction. |

## Rollout

No migration or user-facing rollout is required. Ship as an internal refactor with focused unit coverage and integration regression coverage. If `pnpm test` passes, existing installations continue using their current profile files and fixed export file paths.

## Next recommended phase

`sdd-tasks`
