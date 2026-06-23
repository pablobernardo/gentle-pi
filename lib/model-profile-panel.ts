export const MAX_PROFILE_NAME_INPUT_LENGTH = 128;

export type ModelProfilePanelAction =
	| { type: "load"; filename: string }
	| { type: "save"; name: string }
	| { type: "overwrite"; filename: string }
	| { type: "delete"; filename: string }
	| { type: "back" }
	| { type: "cancel" };

export type ProfilePrompt =
	| "picker"
	| "save-name"
	| "overwrite-confirm"
	| "delete-confirm";

export type KeyMatcher = (data: string, key: string) => boolean;

export type WidthTruncator = (
	text: string,
	maxWidth: number,
	ellipsis?: string,
	pad?: boolean,
) => string;

export type TextSanitizer = (value: string) => string;

export interface ModelProfilePanelDeps {
	profileNames: readonly string[];
	lineWidth: number;
	matchesKey: KeyMatcher;
	truncateToWidth: WidthTruncator;
	sanitizeTerminalText: TextSanitizer;
}

/**
 * Profile picker sub-panel.
 *
 * Manages cursor, prompt, and name-buffer state for the profile UI.
 * Renders the profile list and confirmation prompts.
 * Emits actions through a callback instead of modifying SddModelPanel directly.
 */
export class ModelProfilePanel {
	private cursor = 0;
	private prompt: ProfilePrompt = "picker";
	private nameBuffer = "";
	private readonly deps: ModelProfilePanelDeps;
	private readonly onAction: (action: ModelProfilePanelAction) => void;

	constructor(
		deps: ModelProfilePanelDeps,
		onAction: (action: ModelProfilePanelAction) => void,
	) {
		this.deps = deps;
		this.onAction = onAction;
	}

	handleInput(data: string): void {
		// Ctrl+C always cancels from anywhere in the profile UI
		if (this.deps.matchesKey(data, "ctrl+c")) {
			this.onAction({ type: "cancel" });
			return;
		}

		switch (this.prompt) {
			case "save-name":
				return this.handleSaveNameInput(data);
			case "overwrite-confirm":
				return this.handleOverwriteConfirmInput(data);
			case "delete-confirm":
				return this.handleDeleteConfirmInput(data);
			default:
				return this.handlePickerInput(data);
		}
	}

	render(): string[] {
		const { lineWidth, truncateToWidth: t } = this.deps;
		const line = (text = "") => t(text, Math.max(1, lineWidth), "…", true);

		switch (this.prompt) {
			case "save-name":
				return this.renderSaveNamePrompt(line);
			case "overwrite-confirm":
				return this.renderOverwriteConfirm(line);
			case "delete-confirm":
				return this.renderDeleteConfirm(line);
			default:
				return this.renderPicker(line);
		}
	}

	// ── picker ──────────────────────────────────────────────

	private handlePickerInput(data: string): void {
		if (
			this.deps.matchesKey(data, "escape") ||
			this.deps.matchesKey(data, "b")
		) {
			this.onAction({ type: "back" });
			return;
		}
		if (this.deps.matchesKey(data, "down") || this.deps.matchesKey(data, "j")) {
			if (this.deps.profileNames.length === 0) return;
			this.cursor = Math.min(
				this.deps.profileNames.length - 1,
				this.cursor + 1,
			);
			return;
		}
		if (this.deps.matchesKey(data, "up") || this.deps.matchesKey(data, "k")) {
			if (this.deps.profileNames.length === 0) return;
			this.cursor = Math.max(0, this.cursor - 1);
			return;
		}
		if (this.deps.matchesKey(data, "g")) {
			this.cursor = 0;
			return;
		}
		if (data === "G") {
			if (this.deps.profileNames.length === 0) return;
			this.cursor = this.deps.profileNames.length - 1;
			return;
		}
		if (this.deps.matchesKey(data, "n")) {
			this.prompt = "save-name";
			this.nameBuffer = "";
			return;
		}
		if (this.deps.matchesKey(data, "o")) {
			if (this.deps.profileNames.length === 0) return;
			this.prompt = "overwrite-confirm";
			return;
		}
		if (this.deps.matchesKey(data, "d")) {
			if (this.deps.profileNames.length === 0) return;
			this.prompt = "delete-confirm";
			return;
		}
		if (this.deps.matchesKey(data, "return")) {
			if (this.deps.profileNames.length === 0) return;
			const filename = this.deps.profileNames[this.cursor];
			if (!filename) return;
			this.onAction({ type: "load", filename });
		}
	}

	// ── save name ───────────────────────────────────────────

	private handleSaveNameInput(data: string): void {
		if (this.deps.matchesKey(data, "escape")) {
			this.prompt = "picker";
			this.nameBuffer = "";
			return;
		}
		if (this.deps.matchesKey(data, "return")) {
			const name = this.nameBuffer.trim();
			if (name.length === 0) return;
			this.prompt = "picker";
			this.nameBuffer = "";
			this.onAction({ type: "save", name });
			return;
		}
		if (data === "\u007f" || data === "\b") {
			this.nameBuffer = this.nameBuffer.slice(0, -1);
			return;
		}
		if (data.length === 1) {
			const code = data.charCodeAt(0);
			if (
				code >= 0x20 &&
				code < 0x7f &&
				this.nameBuffer.length < MAX_PROFILE_NAME_INPUT_LENGTH
			) {
				this.nameBuffer += data;
			}
		}
	}

	// ── overwrite confirm ───────────────────────────────────

	private handleOverwriteConfirmInput(data: string): void {
		if (
			this.deps.matchesKey(data, "escape") ||
			this.deps.matchesKey(data, "b") ||
			data === "n" ||
			data === "N"
		) {
			this.prompt = "picker";
			return;
		}
		if (this.deps.matchesKey(data, "return") || data === "y" || data === "Y") {
			const filename = this.deps.profileNames[this.cursor];
			if (!filename) {
				this.prompt = "picker";
				return;
			}
			this.prompt = "picker";
			this.onAction({ type: "overwrite", filename });
		}
	}

	// ── delete confirm ─────────────────────────────────────

	private handleDeleteConfirmInput(data: string): void {
		if (
			this.deps.matchesKey(data, "escape") ||
			this.deps.matchesKey(data, "b") ||
			data === "n" ||
			data === "N"
		) {
			this.prompt = "picker";
			return;
		}
		if (this.deps.matchesKey(data, "return") || data === "y" || data === "Y") {
			const filename = this.deps.profileNames[this.cursor];
			if (!filename) {
				this.prompt = "picker";
				return;
			}
			this.prompt = "picker";
			this.onAction({ type: "delete", filename });
		}
	}

	// ── render helpers ──────────────────────────────────────

	private renderPicker(line: (text: string) => string): string[] {
		const { profileNames, sanitizeTerminalText: s } = this.deps;
		const profileCount = profileNames.length;

		// Clamp cursor
		if (this.cursor < 0) this.cursor = 0;
		if (profileCount > 0 && this.cursor >= profileCount) {
			this.cursor = profileCount - 1;
		}

		const lines: string[] = [
			line("Model profiles"),
			"",
			line(`Available profiles:${profileCount > 0 ? ` ${profileCount}` : ""}`),
			"",
		];

		if (profileCount === 0) {
			lines.push(line("  No profiles found"));
			lines.push("");
			lines.push(line("Press n to create a profile from current assignments"));
			lines.push("");
			lines.push(line("n new • esc back"));
			return lines;
		}

		for (let i = 0; i < profileCount; i++) {
			const focused = i === this.cursor;
			const name = s(profileNames[i] ?? "");
			lines.push(line(`${focused ? "▸" : " "} ${name}`));
		}

		lines.push("");
		lines.push(
			line(
				"j/k scroll • enter load • n new • o overwrite • d delete • esc back",
			),
		);
		return lines;
	}

	private renderSaveNamePrompt(line: (text: string) => string): string[] {
		const safeName = this.deps.sanitizeTerminalText(this.nameBuffer);
		return [
			line("Save current assignments as new profile"),
			"",
			line(`Name: ${safeName || "type a name..."}`),
			"",
			line("enter save • esc cancel"),
		];
	}

	private renderOverwriteConfirm(line: (text: string) => string): string[] {
		const filename = this.deps.sanitizeTerminalText(
			this.deps.profileNames[this.cursor] ?? "",
		);
		return [
			line(`Overwrite profile ${filename}?`),
			"",
			line("This replaces the selected profile with current assignments."),
			"",
			line("y/enter confirm • n/esc cancel"),
		];
	}

	private renderDeleteConfirm(line: (text: string) => string): string[] {
		const filename = this.deps.sanitizeTerminalText(
			this.deps.profileNames[this.cursor] ?? "",
		);
		return [
			line(`Delete profile ${filename}?`),
			"",
			line("This removes the selected profile file."),
			"",
			line("y/enter confirm • n/esc cancel"),
		];
	}
}
