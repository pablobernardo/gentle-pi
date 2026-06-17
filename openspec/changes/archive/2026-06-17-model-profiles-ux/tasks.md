# Tasks: model-profiles-ux

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~200 net (extraction + new test file; offset by removals) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr |
| Chain strategy | stacked-to-main |

```text
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low
```

The change is dominated by extraction: helpers and constants move from
`extensions/gentle-ai.ts` into `lib/model-profiles.ts` and the new
`tests/model-profiles.test.ts` adds focused coverage while
`tests/runtime-harness.mjs` shrinks by removing the helper-unit block. The
profile UI flow, fixed export/restore path, and on-disk profile format are
unchanged. Under the 400-line review budget — single PR is appropriate.

## Guardrails

- **No UX flow change.** The `/gentle:models` profile sub-panel (`p`) and the
  `s`/`l`/`o`/`d` keybindings keep their current behavior. No picker-first UX
  is introduced.
- **No change to fixed `~/.pi/gentle-ai/models.export.json` behavior.** The
  `x`/`r` keybindings still read/write that exact path via
  `exportSavedModelConfig()` / `readModelExport()` in
  `extensions/gentle-ai.ts`. Profile CRUD never touches that file.
- **No profile file format migration.** Existing files under
  `~/.pi/gentle-ai/model-profiles/` that contain
  `{ kind: "gentle-pi.agent_model_routing", version: 1, agents: ... }` continue
  to load without changes.
- **No unrelated formatting/autoformatting.** Only the moved code and its
  immediate imports/symbols are touched in `extensions/gentle-ai.ts`. No
  reformatting, no ordering churn, no editor-driven rewrap.
- **No `lib/model-profiles.ts` import back into `extensions/gentle-ai.ts`.**
  Dependency direction stays one-way: extension imports from `lib/`.
- **`__testing.modelProfiles` is not a compatibility contract.** It may be
  reduced or removed once the harness no longer needs direct helper access.

## Validation commands

- `pnpm test` — runs `node --experimental-strip-types --test tests/*.test.ts`
  followed by `pnpm run test:harness` (the runtime harness). Both must pass.
- Targeted focused-test iteration:
  `node --experimental-strip-types --test tests/model-profiles.test.ts`
- Optional review diagnostic (no fix-up behavior, read-only):
  `git diff --stat` should show net under ~250 lines and a 400-line ceiling.

---

## Implementation Tasks

- [x] Task 1 — RED: add focused failing tests in `tests/model-profiles.test.ts`

- **File:** `tests/model-profiles.test.ts` (new). Must be picked up by the
  existing `pnpm test` glob `tests/*.test.ts` (already covered by the package
  script in `package.json`).
- **Imports:** direct imports from `lib/model-profiles.ts`. Do **not** import
  from `extensions/gentle-ai.ts` or from `__testing`.
- **Scaffolding:** create a fresh temp directory per test in `before()`,
  point `process.env.GENTLE_PI_CONFIG_HOME` at it (or whatever env var the
  extracted `gentleAiConfigHome()` reads — confirm during implementation
  against `extensions/gentle-ai.ts` line 653), and restore the previous value
  in `after()`/`finally`. Use `node:test` and `node:assert/strict` to match
  the existing `tests/*.test.ts` style.
- **RED evidence expectation:** running
  `node --experimental-strip-types --test tests/model-profiles.test.ts` fails
  with module-not-found for `lib/model-profiles.ts` (and any missing named
  exports). Capture the failure output for the change log.
- **Coverage matrix (each row must initially fail, then drive a GREEN):**
  1. `modelProfilesDir()` returns `<GENTLE_PI_CONFIG_HOME>/model-profiles` and
     honors env override.
  2. `safeModelProfileFilename("Daily Routing / v2")` →
     `"daily-routing-v2.json"`.
  3. `safeModelProfileFilename("../escape")` → `"escape.json"`.
  4. `safeModelProfileFilename("")`, `safeModelProfileFilename("   ")`,
     `safeModelProfileFilename(".hidden")`, `safeModelProfileFilename("a/b")`
     each return `undefined`.
  5. `isSafeModelProfileFilename` rejects `"../foo.json"`, `"foo"` (no `.json`),
     `"foo bar.json"`, `".hidden.json"`, `"-leading.json"`,
     `"trailing-.json"`, and accepts `"daily.json"`.
  6. `listModelProfiles()` returns `[]` for missing directory, filters unsafe
     names and non-files, and sorts safe files by filename.
  7. `writeModelProfile("foo", agents)` creates the directory, writes
     `<home>/model-profiles/foo.json` containing a JSON object with
     `kind === "gentle-pi.agent_model_routing"`, `version === 1`, normalized
     `agents`, and a trailing newline.
  8. `writeModelProfile` overwrite: second call replaces contents and returns
     the same path.
  9. `readModelProfile("daily.json")` returns the normalized config for a valid
     envelope.
  10. `readModelProfile` returns `undefined` for: missing file, unsafe
      filename, invalid JSON, wrong `kind`, wrong `version`, malformed routing
      content (e.g., non-record entry, missing required agent field).
  11. `deleteModelProfile("daily.json")` removes an existing safe file;
      `deleteModelProfile` no-ops on missing files and on unsafe filenames
      (must not delete anything).
  12. Path-traversal guard: `readModelProfile("../escape.json")` and
      `deleteModelProfile("../escape.json")` both return no result / no-op,
      and no file outside `modelProfilesDir()` is touched.
  13. `models.export.json` invariant: after `writeModelProfile`,
      `readModelProfile`, `deleteModelProfile`, and `listModelProfiles`, the
      file `<home>/models.export.json` is **not** created and not required to
      exist.

**Done when:** every assertion above is encoded in the new test file and the
file fails to run because `lib/model-profiles.ts` does not yet exist. No
production code is written in this task.

- [x] Task 2 — GREEN: scaffold `lib/model-profiles.ts` to make Task 1 pass

- **File:** `lib/model-profiles.ts` (new).
- **Scope:** minimum-surface implementation that satisfies the Task 1 RED
  assertions. Do not refactor unrelated code.
- **Required exports (per design.md):**
  `MODEL_PROFILE_FILENAME_PATTERN`, `MAX_MODEL_PROFILE_FILENAME_LENGTH`,
  `type ModelProfileEntry`, `modelProfilesDir()`,
  `safeModelProfileFilename(name)`, `isSafeModelProfileFilename(filename)`,
  `listModelProfiles()`, `buildModelProfileEnvelope(agents)`,
  `writeModelProfileFile(path, agents)`, `writeModelProfile(name, agents)`,
  `readModelProfile(filename)`, `deleteModelProfile(filename)`.
- **Shared envelope helpers/constants:** also export `MODEL_EXPORT_KIND`,
  `MODEL_EXPORT_VERSION`, `normalizeModelConfig(value)`, and
  `parseModelExport(value)` from `lib/model-profiles.ts` per the design's
  dependency-strategy section. Move (don't duplicate) these from
  `extensions/gentle-ai.ts`. Keep `gentleAiConfigHome()` duplicated minimally
  inside this module (identical body) to avoid inverting the dependency
  direction; consolidation is deferred per design.md.
- **GREEN evidence expectation:**
  `node --experimental-strip-types --test tests/model-profiles.test.ts`
  passes. `pnpm test` still fails because `extensions/gentle-ai.ts` has not
  been updated yet (expected at this point — record the partial pass).

**Done when:** the focused test file is green in isolation.

- [x] Task 3 — TRIANGULATE: tighten edge cases without changing contract

- **Files:** `lib/model-profiles.ts`, `tests/model-profiles.test.ts`.
- **Add (or strengthen) coverage for behavior already implied by the spec:**
  - Profile operations normalize agent keys to lowercase strings and strip
    entries that are not records.
  - `readModelProfile` returns `undefined` (does **not** throw) when the
    directory itself is missing.
  - `listModelProfiles` skips symlinks pointing outside the profile directory
    (defensive: write a symlink in the temp dir to a file outside and assert
    it is filtered).
  - `safeModelProfileFilename` truncates input to
    `MAX_MODEL_PROFILE_FILENAME_LENGTH` characters before slugging and rejects
    results that do not match `MODEL_PROFILE_FILENAME_PATTERN`.
- **TRIANGULATE evidence expectation:** new assertions pass; existing
  assertions continue to pass; no production behavior change beyond the
  tightened invariants above.

**Done when:** the focused test file remains green with the additional edge
cases in place.

- [x] Task 4 — REFACTOR: dedupe shared envelope constants inside `lib/model-profiles.ts`

- **File:** `lib/model-profiles.ts`.
- **Goal:** single source of truth for the model routing envelope inside the
  new module. Replace any remaining inline literals (e.g., hard-coded
  `"gentle-pi.agent_model_routing"`, `version: 1`) with the exported
  constants. Extract a small `writeEnvelope(path, agents)` helper if it
  removes duplication between `writeModelProfileFile` and any future
  fixed-export call site.
- **REFACTOR evidence expectation:**
  - `node --experimental-strip-types --test tests/model-profiles.test.ts`
    still passes without edits to the test assertions.
  - `grep` for the literal strings `"gentle-pi.agent_model_routing"` and
    `version: 1` inside `lib/model-profiles.ts` returns only the constant
    declarations.
- **No** changes to public function signatures.

**Done when:** refactor is complete with no behavior change.

- [x] Task 5 — Wire `extensions/gentle-ai.ts` to the extracted module

- **File:** `extensions/gentle-ai.ts`.
- **Changes:**
  - Add `import` for the shared envelope helpers/constants and profile CRUD
    helpers from `lib/model-profiles.ts`.
  - Remove the local definitions of `MODEL_PROFILE_FILENAME_PATTERN`,
    `MAX_MODEL_PROFILE_FILENAME_LENGTH`, `modelProfilesDir`,
    `safeModelProfileFilename`, `isSafeModelProfileFilename`,
    `listModelProfiles`, `buildModelProfileEnvelope`, `writeModelProfileFile`,
    `writeModelProfile`, `readModelProfile`, `deleteModelProfile`, plus
    `MODEL_EXPORT_KIND`, `MODEL_EXPORT_VERSION`, `parseModelExport`,
    `normalizeModelConfig` (lines around 653–733 and the local envelope
    helpers/constants they reference). All call sites in
    `handleModelsCommand()` (lines ~1774, 1863, 1872, 1883, 1892, 1904, 1935,
    1952, 1962, 1979) keep the same inputs and outputs.
  - Update `exportSavedModelConfig()` and `readModelExport()` to import
    `MODEL_EXPORT_KIND`, `MODEL_EXPORT_VERSION`, `parseModelExport`,
    `normalizeModelConfig` from `lib/model-profiles.ts`. Keep the fixed
    `modelExportPath(ctx.cwd) → ~/.pi/gentle-ai/models.export.json` path
    unchanged and do not introduce any coupling to profile CRUD helpers.
  - Reduce or remove the `modelProfiles` block from the `__testing` object
    (lines ~2206–2212). Do not add new tests that depend on it. If the
    runtime harness still requires a temporary bridge, keep the minimal
    shape and document it inline as internal-only.
- **Guardrails during edit:** no reformatting of unrelated code, no reordering
  of imports beyond the new line, no autoformatter run, no edits outside the
  profile/envelope symbols listed above.

**Done when:**

- `pnpm test` is green end-to-end (focused tests + trimmed harness).
- `git diff extensions/gentle-ai.ts` shows net negative lines and touches
  only the listed symbols and their imports.

- [x] Task 6 — Trim `tests/runtime-harness.mjs` helper-internal block

- **File:** `tests/runtime-harness.mjs`.
- **Changes:**
  - Remove the `profiles-unit` block (around lines 1018–1050: dynamic import
    `…?runtime-harness=profiles-unit`, the `__testing.modelProfiles`
    assertions for `modelProfilesDir`, filename safety, direct CRUD, invalid
    JSON, and helper-level `models.export.json` untouched checks).
  - Keep the integration coverage: profile panel empty/listed state, save
    creates expected envelope, load applies profile to `models.json` and
    agent frontmatter after confirmation, overwrite replaces selected
    profile, invalid load warns and leaves active config unchanged, delete
    removes selected profile and leaves unrelated invalid files alone,
    profile operations do not touch `models.export.json`.
  - Keep fixed export/restore harness coverage for `x`/`r` and
    `~/.pi/gentle-ai/models.export.json` unchanged.
- **TRIANGULATE expectation:** after trimming, the harness still drives the
  full `/gentle:models` profile flow via the UI, but no longer asserts
  helper internals — those moved to `tests/model-profiles.test.ts`.

**Done when:** `pnpm test` passes and the only test files asserting helper
behavior are `tests/model-profiles.test.ts`.

- [x] Task 7 — Final verification

- Run `pnpm test` end-to-end.
- Confirm the focused file runs independently:
  `node --experimental-strip-types --test tests/model-profiles.test.ts`.
- Confirm guardrails with quick greps (review diagnostics only, no edits):
  - `git diff --stat` shows net reduction in `extensions/gentle-ai.ts` and
    `tests/runtime-harness.mjs`, with the new files roughly within the
    forecast range.
  - No occurrences of `safeModelProfileFilename`, `listModelProfiles`,
    `writeModelProfile`, `readModelProfile`, `deleteModelProfile`,
    `buildModelProfileEnvelope`, `writeModelProfileFile`,
    `MODEL_PROFILE_FILENAME_PATTERN`, or
    `MAX_MODEL_PROFILE_FILENAME_LENGTH` remain as definitions in
    `extensions/gentle-ai.ts` (only call sites and imports).
  - No new dependencies added in `package.json`.
  - `models.export.json` literal path still resolved via `modelExportPath` in
    `extensions/gentle-ai.ts`.

**Done when:** all of the above pass with no edits to runtime behavior.
