import assert from "node:assert/strict";
import test from "node:test";
import {
	ModelProfilePanel,
	type ModelProfilePanelAction,
} from "../lib/model-profile-panel.ts";
import { matchesKey, truncateToWidth } from "@earendil-works/pi-tui";

/**
 * Minimal test mocks for the panel's injected dependencies.
 */
function makeDeps(profileNames: readonly string[], lineWidth = 80) {
	return {
		profileNames,
		lineWidth,
		matchesKey: (data: string, key: string) =>
			matchesKey(data, key as Parameters<typeof matchesKey>[1]),
		truncateToWidth,
		sanitizeTerminalText: (value: string) => {
			// Strip ANSI and control chars — same behaviour as the real helper
			return value
				.replace(
					/[\u001b\u009b][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g,
					"",
				)
				.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, "");
		},
	};
}

/**
 * Collects actions emitted by the panel.
 */
function captureActions(): { actions: ModelProfilePanelAction[] } {
	return { actions: [] };
}

test("renders empty profile list", () => {
	const deps = makeDeps([]);
	const capt = captureActions();
	const panel = new ModelProfilePanel(deps, (action) =>
		capt.actions.push(action),
	);

	const rendered = panel.render().join("\n");

	assert.match(rendered, /Model profiles/);
	assert.match(rendered, /Available profiles:/);
	assert.match(rendered, /No profiles found/);
	assert.match(rendered, /Press n to create a profile/);
});

test("renders profile list with items", () => {
	const deps = makeDeps(["daily.json", "production.json"]);
	const capt = captureActions();
	const panel = new ModelProfilePanel(deps, (action) =>
		capt.actions.push(action),
	);

	const rendered = panel.render().join("\n");

	assert.match(rendered, /Model profiles/);
	assert.match(rendered, /Available profiles: 2/);
	assert.match(rendered, /▸ daily\.json/);
	assert.match(rendered, /production\.json/);
	assert.match(rendered, /j\/k scroll/);
	assert.match(rendered, /enter load/);
	assert.match(rendered, /n new/);
	assert.match(rendered, /o overwrite/);
	assert.match(rendered, /d delete/);
});

test("cursor moves down and up", () => {
	const deps = makeDeps(["alpha.json", "beta.json", "gamma.json"]);
	const capt = captureActions();
	const panel = new ModelProfilePanel(deps, (action) =>
		capt.actions.push(action),
	);

	// Initial: alpha focused
	assert.match(panel.render().join("\n"), /▸ alpha\.json/);

	// Down to beta
	panel.handleInput("j");
	assert.match(panel.render().join("\n"), /▸ beta\.json/);

	// Down to gamma
	panel.handleInput("j");
	assert.match(panel.render().join("\n"), /▸ gamma\.json/);

	// Down stay at end
	panel.handleInput("j");
	assert.match(panel.render().join("\n"), /▸ gamma\.json/);

	// Up to beta
	panel.handleInput("k");
	assert.match(panel.render().join("\n"), /▸ beta\.json/);

	// Up to alpha
	panel.handleInput("k");
	assert.match(panel.render().join("\n"), /▸ alpha\.json/);

	// Up stays at top
	panel.handleInput("k");
	assert.match(panel.render().join("\n"), /▸ alpha\.json/);
});

test("load action from empty list does nothing", () => {
	const deps = makeDeps([]);
	const capt = captureActions();
	const panel = new ModelProfilePanel(deps, (action) =>
		capt.actions.push(action),
	);

	panel.handleInput("\r");
	assert.deepEqual(capt.actions, []);
});

test("load action emits load with selected filename", () => {
	const deps = makeDeps(["daily.json", "production.json"]);
	const capt = captureActions();
	const panel = new ModelProfilePanel(deps, (action) =>
		capt.actions.push(action),
	);

	// Move to second item
	panel.handleInput("j");
	panel.handleInput("\r");

	assert.equal(capt.actions.length, 1);
	assert.deepEqual(capt.actions[0], {
		type: "load",
		filename: "production.json",
	});
});

test("back action emits back", () => {
	const deps = makeDeps(["daily.json"]);
	const capt = captureActions();
	const panel = new ModelProfilePanel(deps, (action) =>
		capt.actions.push(action),
	);

	panel.handleInput("\u001b");

	assert.equal(capt.actions.length, 1);
	assert.deepEqual(capt.actions[0], { type: "back" });
});

test("cancel action emits cancel", () => {
	const deps = makeDeps(["daily.json"]);
	const capt = captureActions();
	const panel = new ModelProfilePanel(deps, (action) =>
		capt.actions.push(action),
	);

	panel.handleInput("\u0003"); // ctrl+c

	assert.equal(capt.actions.length, 1);
	assert.deepEqual(capt.actions[0], { type: "cancel" });
});

test("save-name prompt renders and collects name", () => {
	const deps = makeDeps(["daily.json"]);
	const capt = captureActions();
	const panel = new ModelProfilePanel(deps, (action) =>
		capt.actions.push(action),
	);

	// Enter save-name prompt
	panel.handleInput("n");

	const rendered = panel.render().join("\n");
	assert.match(rendered, /Save current assignments as new profile/);
	assert.match(rendered, /Name: type a name\.\.\./);

	// Type a name
	for (const ch of "My Profile") panel.handleInput(ch);

	const withName = panel.render().join("\n");
	assert.match(withName, /Name: My Profile/);

	// Submit
	panel.handleInput("\r");

	assert.equal(capt.actions.length, 1);
	assert.deepEqual(capt.actions[0], { type: "save", name: "My Profile" });

	// After save, prompt resets to picker
	const afterSave = panel.render().join("\n");
	assert.match(afterSave, /Available profiles:/);
});

test("save-name prompt escape cancels without action", () => {
	const deps = makeDeps(["daily.json"]);
	const capt = captureActions();
	const panel = new ModelProfilePanel(deps, (action) =>
		capt.actions.push(action),
	);

	panel.handleInput("n");
	panel.handleInput("\u001b"); // escape

	assert.equal(capt.actions.length, 0);
	assert.match(panel.render().join("\n"), /Available profiles:/);
});

test("save-name empty input on enter does nothing", () => {
	const deps = makeDeps(["daily.json"]);
	const capt = captureActions();
	const panel = new ModelProfilePanel(deps, (action) =>
		capt.actions.push(action),
	);

	panel.handleInput("n");
	panel.handleInput("\r"); // empty buffer

	assert.equal(capt.actions.length, 0);
	// Still in save-name prompt
	assert.match(panel.render().join("\n"), /Name: /);
});

test("overwrite confirm emits overwrite on y", () => {
	const deps = makeDeps(["daily.json", "production.json"]);
	const capt = captureActions();
	const panel = new ModelProfilePanel(deps, (action) =>
		capt.actions.push(action),
	);

	// Move to second item, then overwrite
	panel.handleInput("j");
	panel.handleInput("o");

	const rendered = panel.render().join("\n");
	assert.match(rendered, /Overwrite profile/);
	assert.match(rendered, /production\.json/);

	panel.handleInput("y");

	assert.equal(capt.actions.length, 1);
	assert.deepEqual(capt.actions[0], {
		type: "overwrite",
		filename: "production.json",
	});

	// Prompt resets to picker after confirm
	assert.match(panel.render().join("\n"), /Available profiles:/);
});

test("overwrite confirm escape cancels without action", () => {
	const deps = makeDeps(["daily.json"]);
	const capt = captureActions();
	const panel = new ModelProfilePanel(deps, (action) =>
		capt.actions.push(action),
	);

	panel.handleInput("o");
	panel.handleInput("\u001b");

	assert.equal(capt.actions.length, 0);
	assert.match(panel.render().join("\n"), /Available profiles:/);
});

test("delete confirm emits delete on y", () => {
	const deps = makeDeps(["daily.json"]);
	const capt = captureActions();
	const panel = new ModelProfilePanel(deps, (action) =>
		capt.actions.push(action),
	);

	panel.handleInput("d");

	const rendered = panel.render().join("\n");
	assert.match(rendered, /Delete profile/);
	assert.match(rendered, /daily\.json/);

	panel.handleInput("y");

	assert.equal(capt.actions.length, 1);
	assert.deepEqual(capt.actions[0], { type: "delete", filename: "daily.json" });

	// Prompt resets to picker
	assert.match(panel.render().join("\n"), /Available profiles:/);
});

test("delete confirm cancels on n", () => {
	const deps = makeDeps(["daily.json"]);
	const capt = captureActions();
	const panel = new ModelProfilePanel(deps, (action) =>
		capt.actions.push(action),
	);

	panel.handleInput("d");
	panel.handleInput("n");

	assert.equal(capt.actions.length, 0);
	assert.match(panel.render().join("\n"), /Available profiles:/);
});

test("g and G jump to top and bottom", () => {
	const deps = makeDeps(["a.json", "b.json", "c.json", "d.json", "e.json"]);
	const capt = captureActions();
	const panel = new ModelProfilePanel(deps, (action) =>
		capt.actions.push(action),
	);

	// Jump to bottom
	panel.handleInput("G");
	assert.match(panel.render().join("\n"), /▸ e\.json/);

	// Jump to top
	panel.handleInput("g");
	assert.match(panel.render().join("\n"), /▸ a\.json/);
});

test("actions from empty list are ignored", () => {
	const deps = makeDeps([]);
	const capt = captureActions();
	const panel = new ModelProfilePanel(deps, (action) =>
		capt.actions.push(action),
	);

	// All list-modifying inputs should be no-ops on empty
	panel.handleInput("j");
	panel.handleInput("k");
	panel.handleInput("o"); // overwrite on empty → no-op
	panel.handleInput("d"); // delete on empty → no-op

	assert.equal(capt.actions.length, 0);
});

test("cancel works from save-name prompt", () => {
	const deps = makeDeps(["daily.json"]);
	const capt = captureActions();
	const panel = new ModelProfilePanel(deps, (action) =>
		capt.actions.push(action),
	);

	panel.handleInput("n"); // enter save-name
	panel.handleInput("\u0003"); // ctrl+c from save-name

	assert.equal(capt.actions.length, 1);
	assert.deepEqual(capt.actions[0], { type: "cancel" });
});

test("cancel works from overwrite confirm", () => {
	const deps = makeDeps(["daily.json"]);
	const capt = captureActions();
	const panel = new ModelProfilePanel(deps, (action) =>
		capt.actions.push(action),
	);

	panel.handleInput("o");
	panel.handleInput("\u0003");

	assert.equal(capt.actions.length, 1);
	assert.deepEqual(capt.actions[0], { type: "cancel" });
});

test("save-name prompt limits collected profile name length", () => {
	const deps = makeDeps([]);
	const capt = captureActions();
	const panel = new ModelProfilePanel(deps, (action) =>
		capt.actions.push(action),
	);

	panel.handleInput("n");
	for (const ch of "x".repeat(200)) panel.handleInput(ch);
	panel.handleInput("\r");

	assert.equal(capt.actions.length, 1);
	assert.equal(capt.actions[0]!.type, "save");
	if (capt.actions[0]!.type === "save") {
		assert.equal(capt.actions[0]!.name.length, 128);
	}
});

test("save-name prompt ignores control characters", () => {
	const deps = makeDeps([]);
	const capt = captureActions();
	const panel = new ModelProfilePanel(deps, (action) =>
		capt.actions.push(action),
	);

	panel.handleInput("n");
	panel.handleInput("A");
	panel.handleInput("\u0001");
	panel.handleInput("B");
	panel.handleInput("\r");

	assert.deepEqual(capt.actions, [{ type: "save", name: "AB" }]);
});
