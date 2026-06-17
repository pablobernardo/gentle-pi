# Change: model-profiles-ux

## Problem

The initial `model-profiles` implementation (archived 2026-06-16) added named
model routing profiles to `/gentle:models` and landed as commit `f97eeac5`. It
works functionally, but the profile logic is embedded inline inside
`extensions/gentle-ai.ts` (~80 lines of helpers plus ~200 lines of handler
logic) and the profile tests are mixed into the long-running
`tests/runtime-harness.mjs` integration suite. This creates two pain points:

1. **Maintainability risk.** `extensions/gentle-ai.ts` is already a large,
   central file (~2500 lines). Extracting profile storage/path/validation into a
   focused module reduces build-up collision risk whenever the upstream Pi
   extension API evolves and the file needs rebasing.

2. **Test friction.** Profile unit behavior (filename safety, envelope
   validation, directory listing) is tested alongside full UI integration flows
   inside the runtime harness. Focused unit tests in a dedicated test file make
   profile logic faster to iterate on, easier to debug, and safer to refactor
   before future UX work.

The current profile UX also remains a sub-panel behind a `p` keystroke with
key-driven actions (`s`/`o`/`l`/`d`). It works but lacks the direct clarity of
the agent model selection flow. Improving that UX will require touching many of
the same code areas, so extracting first reduces the blast radius.

## Goals

1. **Extract profile storage/validation helpers** from `extensions/gentle-ai.ts`
   into a focused module (preferably `lib/model-profiles.ts`, following the
   pattern already established in the archived design). The extraction covers:
   - `modelProfilesDir()`
   - `safeModelProfileFilename()`
   - `isSafeModelProfileFilename()`
   - `listModelProfiles()` (with `readdir` dependency)
   - `buildModelProfileEnvelope()`
   - `writeModelProfileFile()`
   - `writeModelProfile()`
   - `readModelProfile()`
   - `deleteModelProfile()`
   - Plus dependent constants: `MODEL_PROFILE_FILENAME_PATTERN`,
     `MAX_MODEL_PROFILE_FILENAME_LENGTH`.

2. **Add focused unit tests** in a new `tests/model-profiles.test.ts` file,
   matching the repo's current `pnpm test` discovery pattern for TypeScript
   unit tests. These tests run independently of the runtime harness and exercise
   filename safety, CRUD operations, invalid envelope rejection, listing,
   overwrite, and path traversal protection.

3. **Trim the runtime harness** profile tests. The harness retains integration
   tests for the full `/gentle:models` command flow (panel interaction,
   notification behavior, `models.export.json` compatibility). Unit-level
   assertions on helper internals move to the focused test file.

4. **Preserve all existing runtime behavior** from `f97eeac5`: no functional
   change to profile storage, export/restore, or `/gentle:models` command
   behavior. `__testing.modelProfiles` is not treated as a public API contract;
   focused tests should import the extracted helper module directly, and any
   remaining `__testing` exposure should be minimized or kept only as a
   temporary internal bridge if the runtime harness still needs it.

5. **Establish a clean base** for a follow-up UX slice that improves the profile
   picker/selection flow (picker-first, visible list, confirmation for
   destructive actions), analogous to the existing agent model selection window.

## Non-goals

- **No change to export/import behavior for `models.export.json`.** The `x`/`r`
  keybindings and their fixed path must remain identical.
- **No migration of the existing profile file format.** Profiles continue to
  use the `gentle-pi.agent_model_routing` export envelope on disk.
- **No broad runtime harness rewrite.** Only profile-specific assertions move;
  the harness structure, other test suites, and runtime scaffolding remain
  unchanged.
- **No reformatting or refactoring of unrelated code in `extensions/gentle-ai.ts`.**
  Only lines moved into the new module are touched.
- **No UX overhaul in this change.** The profile sub-panel UI (key-driven
  `s`/`o`/`l`/`d` actions behind `p`) stays the same until the follow-up UX
  slice.
- **No localization, accessibility audit, or dependency upgrades.**

## Impact

### Code affected (primary)

| Area | Change |
|------|--------|
| `extensions/gentle-ai.ts` | Remove ~80 lines of profile helpers and constants; add `import` from `lib/model-profiles.ts`; reduce or remove `__testing.modelProfiles` usage rather than preserving it as a contract. |
| `lib/model-profiles.ts` (new) | Receive extracted helpers plus any small adapters needed to decouple from private dependencies (e.g., `gentleAiConfigHome`, `parseModelExport`, `normalizeModelConfig`, `MODEL_EXPORT_KIND`, `MODEL_EXPORT_VERSION`). |
| `tests/model-profiles.test.ts` (new) | Focused unit tests that import directly from `lib/model-profiles.ts`, covering filename safety, CRUD, envelope validation, and path traversal. |
| `tests/runtime-harness.mjs` | Remove unit-level helper assertions (~60 lines in the `profiles-unit` block); keep integration tests for the `/gentle:models` command profile flow and avoid reaching through `__testing` for helper behavior. |
| `openspec/specs/model-routing/spec.md` | May receive minor clarifications if the extraction surfaces previously implicit invariants. No requirement changes. |

### Code affected (keeping the same, verified by regression)

- `/gentle:models` command handler (save/load/overwrite/delete logic inside
  `handleModelsCommand()`) — remains in `extensions/gentle-ai.ts` but calls
  the extracted module.
- `SddModelPanel` — profile mode rendering, keybindings, and result types
  unchanged.
- `__testing.modelProfiles` export — no longer a compatibility requirement for
  profile helper tests; may be reduced or removed if runtime harness coverage no
  longer needs direct helper access.
- `x`/`r` export/restore paths — not touched.

### Teams/workflows affected

- **Developers maintaining this repo:** less merge-conflict surface in the
  central extension file; faster profile test feedback loop.
- **Users of `/gentle:models` profiles:** zero behavioral change in this slice.
- **Upstream Pi contributors:** no interaction; this change lives inside the
  `gentle-pi` extension package.

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Extraction breaks implicit dependencies on private helpers (`parseModelExport`, `MODEL_EXPORT_KIND`, `normalizeModelConfig`) | Pass these as function parameters or accept them as module-level imports from a shared location. If any must remain file-private, the extraction may need to keep a thin forwarding wrapper in `extensions/gentle-ai.ts`. |
| Focused test file diverges in behavior from harness tests | Run `pnpm test`, which executes `node --experimental-strip-types --test tests/*.test.ts` and then the runtime harness. |
| Removing `__testing.modelProfiles` hides helper access previously used by tests | Move focused helper assertions to direct imports from `lib/model-profiles.ts`; keep any remaining harness coverage integration-oriented. If a temporary bridge is necessary, keep it internal and do not document it as a contract. |
| Extraction touches more lines than expected | Bound the change: extract only the profile helpers. If the dependency chain forces extracting additional code (e.g., `gentleAiConfigHome`), defer to a dedicated follow-up extraction and keep this change minimal with a forwarding wrapper. |

## Review workload

Estimated under 200 changed lines net (extraction mostly moves code, net
additions are the new test file and import lines). Well within the 400-line
review budget. A single PR is appropriate.

## Success criteria

1. `pnpm test` passes with both `tests/model-profiles.test.ts` and the trimmed
   `tests/runtime-harness.mjs` profile tests.
2. Focused tests cover: safe filename generation (happy path, path traversal
   rejection, empty/whitespace-only input), list (empty dir, filtered unsafe
   names), write (envelope structure, directory creation), read (valid, invalid
   JSON, wrong kind/version, missing file), delete (existing, missing, unsafe
   name), and that `models.export.json` is never touched.
3. Runtime harness profile integration tests (save, load, overwrite, delete via
   the panel) continue to pass without modification beyond removing redundant
   unit assertions.
4. Focused helper tests do not depend on `__testing.modelProfiles`; they import
   directly from `lib/model-profiles.ts`, and the harness avoids direct helper
   assertions where practical.
5. All existing `/gentle:models` behavior (agent assignment, effort, export,
   restore, profile CRUD) is unchanged.

## Next phase

`sdd-spec` — produce delta specs with acceptance criteria that encode the
extraction boundaries, the focused test coverage shape, and the compatibility
invariants.
