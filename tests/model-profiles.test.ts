import assert from "node:assert/strict";
import {
	mkdirSync,
	mkdtempSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
	MAX_MODEL_PROFILE_FILENAME_LENGTH,
	MODEL_PROFILE_FILENAME_PATTERN,
	buildModelProfileEnvelope,
	deleteModelProfile,
	isSafeModelProfileFilename,
	listModelProfiles,
	modelProfilesDir,
	readModelProfile,
	safeModelProfileFilename,
	writeModelProfile,
} from "../lib/model-profiles.ts";

const ENV_VAR = "GENTLE_PI_CONFIG_HOME";

function withTempHome(t: test.TestContext): string {
	const previous = process.env[ENV_VAR];
	const home = mkdtempSync(join(tmpdir(), "gentle-pi-model-profiles-"));
	process.env[ENV_VAR] = home;
	t.after(() => {
		if (previous === undefined) delete process.env[ENV_VAR];
		else process.env[ENV_VAR] = previous;
		rmSync(home, { recursive: true, force: true });
	});
	return home;
}

function writeJson(path: string, value: unknown): void {
	writeFileSync(path, `${JSON.stringify(value)}\n`);
}

test("modelProfilesDir honors GENTLE_PI_CONFIG_HOME", (t) => {
	const home = withTempHome(t);
	assert.equal(modelProfilesDir(), join(home, "model-profiles"));
});

test("safeModelProfileFilename slugifies common cases", () => {
	assert.equal(
		safeModelProfileFilename("Daily Routing / v2"),
		"daily-routing-v2.json",
	);
	assert.equal(safeModelProfileFilename("   ../escape"), "escape.json");
	assert.equal(safeModelProfileFilename("dev__mode-1"), "dev-mode-1.json");
});

test("safeModelProfileFilename rejects empty/whitespace and zero safe segments", () => {
	assert.equal(safeModelProfileFilename(""), undefined);
	assert.equal(safeModelProfileFilename("   "), undefined);
	assert.equal(safeModelProfileFilename("!!"), undefined);
});

test("safeModelProfileFilename truncates to MAX length and validates against pattern", () => {
	const longInput = "a".repeat(MAX_MODEL_PROFILE_FILENAME_LENGTH + 20);
	const safe = safeModelProfileFilename(longInput);
	assert.ok(safe);
	assert.equal(safe!.endsWith(".json"), true);
	const basename = safe!.slice(0, -5);
	assert.equal(basename.length, MAX_MODEL_PROFILE_FILENAME_LENGTH);
	assert.ok(MODEL_PROFILE_FILENAME_PATTERN.test(basename));
});

test("isSafeModelProfileFilename rejects traversal and malformed inputs", () => {
	const unsafe = [
		"../foo.json",
		"foo",
		"foo bar.json",
		".hidden.json",
		"-leading.json",
		"trailing-.json",
	];
	for (const name of unsafe) {
		assert.equal(
			isSafeModelProfileFilename(name),
			false,
			`expected unsafe: ${name}`,
		);
	}
	assert.equal(isSafeModelProfileFilename("daily.json"), true);
});

test("listModelProfiles returns empty when the profile directory is missing", async (t) => {
	withTempHome(t);
	assert.deepEqual(await listModelProfiles(), []);
});

test("listModelProfiles filters unsafe names, non-files, and sorts safe files", async (t) => {
	const home = withTempHome(t);
	const dir = join(home, "model-profiles");
	mkdirSync(dir, { recursive: true });
	writeJson(join(dir, "alpha.json"), { kind: "x", version: 1, agents: {} });
	writeJson(join(dir, "beta.json"), { kind: "x", version: 1, agents: {} });
	writeJson(join(dir, "unsafe name.json"), {});
	mkdirSync(join(dir, "nested"), { recursive: true });
	writeJson(join(dir, "nested", "ignored.json"), {});

	const list = await listModelProfiles();
	assert.deepEqual(
		list.map((entry) => entry.filename),
		["alpha.json", "beta.json"],
	);
	assert.equal(list[0]!.path, join(dir, "alpha.json"));
});

test("listModelProfiles skips symlinks that point outside the profile directory", async (t) => {
	const home = withTempHome(t);
	const outside = mkdtempSync(join(tmpdir(), "gentle-pi-outside-"));
	t.after(() => rmSync(outside, { recursive: true, force: true }));

	const dir = join(home, "model-profiles");
	mkdirSync(dir, { recursive: true });
	writeJson(join(dir, "alpha.json"), { kind: "x", version: 1, agents: {} });
	writeJson(join(outside, "escape.json"), {
		kind: "x",
		version: 1,
		agents: {},
	});
	try {
		symlinkSync(join(outside, "escape.json"), join(dir, "escape.json"));
	} catch {
		// Some platforms do not permit symlinks; the test cannot assert behavior then.
		return;
	}

	const list = await listModelProfiles();
	const names = list.map((entry) => entry.filename);
	assert.equal(names.includes("alpha.json"), true);
	assert.equal(names.includes("escape.json"), false);
});

test("writeModelProfile creates the directory and writes the envelope", async (t) => {
	const home = withTempHome(t);
	const dir = join(home, "model-profiles");
	const path = await writeModelProfile("daily", {
		"sdd-design": {
			model: "anthropic/claude-sonnet-4",
			thinking: "high" as const,
		},
	});
	assert.equal(path, join(dir, "daily.json"));

	const raw = JSON.parse(await readFile(path, "utf8"));
	assert.equal(raw.kind, "gentle-pi.agent_model_routing");
	assert.equal(raw.version, 1);
	assert.deepEqual(raw.agents, {
		"sdd-design": { model: "anthropic/claude-sonnet-4", thinking: "high" },
	});
});

test("writeModelProfile overwrite replaces contents and returns the same path", async (t) => {
	withTempHome(t);
	const pathA = await writeModelProfile("daily", {
		"sdd-design": {
			model: "anthropic/claude-sonnet-4",
			thinking: "high" as const,
		},
	});
	const pathB = await writeModelProfile("daily", {
		"sdd-design": {
			model: "anthropic/claude-sonnet-4",
			thinking: "low" as const,
		},
	});
	assert.equal(pathA, pathB);

	const raw = JSON.parse(await readFile(pathB, "utf8"));
	assert.equal(raw.agents["sdd-design"].thinking, "low");
});

test("buildModelProfileEnvelope normalizes entries and drops invalid model ids", () => {
	// Construct an intentionally malformed object via a function-scope cast so
	// the test exercises runtime normalization without fighting the static
	// `AgentModelConfig` shape. We pass an object whose `"bad-id-entry"`
	// value is a plain string instead of an `AgentRoutingEntry`.
	const malformed = {
		"sdd-design": {
			model: "  anthropic/claude-sonnet-4  ",
			thinking: "high" as const,
		},
		// Whitespace name fails the agent-name pattern and is stripped.
		" ": { model: "anthropic/claude-sonnet-4", thinking: "high" as const },
		// String entry whose "model id" is invalid (contains spaces).
		"bad-id-entry": "not a safe id",
	} as unknown as Parameters<typeof buildModelProfileEnvelope>[0];
	const envelope = buildModelProfileEnvelope(malformed);
	const parsed = JSON.parse(envelope);
	assert.equal(parsed.kind, "gentle-pi.agent_model_routing");
	assert.equal(parsed.version, 1);
	assert.deepEqual(parsed.agents, {
		"sdd-design": { model: "anthropic/claude-sonnet-4", thinking: "high" },
	});
});

test("readModelProfile returns the normalized config for a valid envelope", async (t) => {
	withTempHome(t);
	const agents = {
		"sdd-design": {
			model: "anthropic/claude-sonnet-4",
			thinking: "high" as const,
		},
	};
	await writeModelProfile("daily", agents);
	assert.deepEqual(await readModelProfile("daily.json"), agents);
});

test("readModelProfile returns undefined for missing directory or missing files", async (t) => {
	withTempHome(t);
	assert.equal(await readModelProfile("daily.json"), undefined);
});

test("readModelProfile rejects unsafe filenames", async (t) => {
	withTempHome(t);
	assert.equal(await readModelProfile("../escape.json"), undefined);
	assert.equal(await readModelProfile("foo"), undefined);
});

test("readModelProfile rejects invalid JSON, wrong kind, wrong version, and malformed entries", async (t) => {
	const home = withTempHome(t);
	const dir = join(home, "model-profiles");
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, "broken.json"), "{ not valid json");
	writeJson(join(dir, "wrong-kind.json"), {
		kind: "some.other.kind",
		version: 1,
		agents: {},
	});
	writeJson(join(dir, "wrong-version.json"), {
		kind: "gentle-pi.agent_model_routing",
		version: 99,
		agents: {},
	});
	writeJson(join(dir, "malformed.json"), {
		kind: "gentle-pi.agent_model_routing",
		version: 1,
		agents: {
			"good-agent": { model: "anthropic/claude-sonnet-4" },
			"bad-entry": "not a safe id",
		},
	});
	assert.equal(await readModelProfile("broken.json"), undefined);
	assert.equal(await readModelProfile("wrong-kind.json"), undefined);
	assert.equal(await readModelProfile("wrong-version.json"), undefined);
	assert.deepEqual(await readModelProfile("malformed.json"), {
		"good-agent": { model: "anthropic/claude-sonnet-4" },
	});
});

test("deleteModelProfile removes a safe file and no-ops on missing/unsafe names", async (t) => {
	const home = withTempHome(t);
	const dir = join(home, "model-profiles");
	mkdirSync(dir, { recursive: true });
	await writeModelProfile("daily", {
		"sdd-design": {
			model: "anthropic/claude-sonnet-4",
			thinking: "high" as const,
		},
	});
	// broken.json is a regular file written outside the helper; it has a safe name
	// but it is not a profile envelope. deleteModelProfile must not touch it.
	writeFileSync(join(dir, "broken.json"), "{ not valid json");

	await deleteModelProfile("daily.json");
	const listAfterDelete = await listModelProfiles();
	assert.deepEqual(
		listAfterDelete.map((entry) => entry.filename),
		["broken.json"],
	);

	// Unsafe name must not delete anything.
	await deleteModelProfile("../broken.json");
	const listAfterUnsafe = await listModelProfiles();
	assert.equal(listAfterUnsafe.length, 1);
	assert.equal(listAfterUnsafe[0]!.filename, "broken.json");

	// Missing safe name is a silent no-op.
	await deleteModelProfile("does-not-exist.json");
	const listAfterMissing = await listModelProfiles();
	assert.equal(listAfterMissing.length, 1);
});
