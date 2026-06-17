import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type ThinkingLevel =
	| "off"
	| "minimal"
	| "low"
	| "medium"
	| "high"
	| "xhigh";

export interface AgentRoutingEntry {
	model?: string;
	thinking?: ThinkingLevel;
}

export type AgentModelConfig = Record<string, AgentRoutingEntry>;

export const MODEL_EXPORT_KIND = "gentle-pi.agent_model_routing";
export const MODEL_EXPORT_VERSION = 1;

export const MODEL_PROFILE_FILENAME_PATTERN =
	/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
export const MAX_MODEL_PROFILE_FILENAME_LENGTH = 64;

const SAFE_MODEL_ID_PATTERN = /^[A-Za-z0-9._~:@/+%-]+$/;

function gentleAiConfigHome(): string {
	return (
		process.env.GENTLE_PI_CONFIG_HOME ?? join(homedir(), ".pi", "gentle-ai")
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isThinkingLevel(value: unknown): value is ThinkingLevel {
	return (
		value === "off" ||
		value === "minimal" ||
		value === "low" ||
		value === "medium" ||
		value === "high" ||
		value === "xhigh"
	);
}

function normalizeModelId(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const model = value.trim();
	if (model.length === 0) return undefined;
	if (!SAFE_MODEL_ID_PATTERN.test(model)) return undefined;
	return model;
}

function normalizeRoutingEntry(value: unknown): AgentRoutingEntry | undefined {
	if (typeof value === "string") {
		const model = normalizeModelId(value);
		return model ? { model } : undefined;
	}
	if (!isRecord(value)) return undefined;
	const model = normalizeModelId(value.model);
	const thinking = isThinkingLevel(value.thinking) ? value.thinking : undefined;
	if (!model && !thinking) return undefined;
	const entry: AgentRoutingEntry = {};
	if (model) entry.model = model;
	if (thinking) entry.thinking = thinking;
	return entry;
}

export function normalizeModelConfig(
	value: unknown,
): AgentModelConfig | undefined {
	if (!isRecord(value)) return undefined;
	const cleaned: AgentModelConfig = {};
	for (const [name, entryValue] of Object.entries(value)) {
		if (!/^[A-Za-z0-9._:@/+%-]+$/.test(name)) continue;
		const entry = normalizeRoutingEntry(entryValue);
		if (entry) cleaned[name] = entry;
	}
	return cleaned;
}

export function parseModelExport(value: unknown): AgentModelConfig | undefined {
	if (!isRecord(value)) return undefined;
	if (
		value.kind !== MODEL_EXPORT_KIND ||
		value.version !== MODEL_EXPORT_VERSION
	) {
		return undefined;
	}
	return normalizeModelConfig(value.agents);
}

export interface ModelProfileEntry {
	filename: string;
	path: string;
}

export function modelProfilesDir(_cwd?: string): string {
	return join(gentleAiConfigHome(), "model-profiles");
}

export function safeModelProfileFilename(name: string): string | undefined {
	const trimmed = name.trim();
	if (trimmed.length === 0) return undefined;
	const segments = trimmed
		.toLowerCase()
		.split(/[\\/]+/)
		.map((segment) =>
			segment.replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, ""),
		)
		.filter((segment) => segment.length > 0);
	if (segments.length === 0) return undefined;
	const basename = segments
		.join("-")
		.slice(0, MAX_MODEL_PROFILE_FILENAME_LENGTH);
	if (!MODEL_PROFILE_FILENAME_PATTERN.test(basename)) return undefined;
	return `${basename}.json`;
}

export function isSafeModelProfileFilename(filename: string): boolean {
	if (!filename.endsWith(".json")) return false;
	return MODEL_PROFILE_FILENAME_PATTERN.test(filename.slice(0, -5));
}

export async function listModelProfiles(): Promise<ModelProfileEntry[]> {
	const dir = modelProfilesDir();
	if (!existsSync(dir)) return [];
	const entries = await readdir(dir, { withFileTypes: true });
	const profiles: ModelProfileEntry[] = [];
	for (const entry of entries) {
		if (!entry.isFile() || !isSafeModelProfileFilename(entry.name)) continue;
		profiles.push({ filename: entry.name, path: join(dir, entry.name) });
	}
	profiles.sort((left, right) => left.filename.localeCompare(right.filename));
	return profiles;
}

export function buildModelProfileEnvelope(agents: AgentModelConfig): string {
	const cleaned = normalizeModelConfig(agents) ?? {};
	return JSON.stringify(
		{ kind: MODEL_EXPORT_KIND, version: MODEL_EXPORT_VERSION, agents: cleaned },
		null,
		2,
	);
}

export async function writeModelProfileFile(
	path: string,
	agents: AgentModelConfig,
): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, `${buildModelProfileEnvelope(agents)}\n`);
}

export async function writeModelProfile(
	name: string,
	agents: AgentModelConfig,
): Promise<string> {
	const filename = safeModelProfileFilename(name);
	if (!filename) throw new Error(`Invalid profile name: ${name}`);
	const path = join(modelProfilesDir(), filename);
	await writeModelProfileFile(path, agents);
	return path;
}

export async function readModelProfile(
	filename: string,
): Promise<AgentModelConfig | undefined> {
	if (!isSafeModelProfileFilename(filename)) return undefined;
	const path = join(modelProfilesDir(), filename);
	if (!existsSync(path)) return undefined;
	try {
		return parseModelExport(JSON.parse(await readFile(path, "utf8")));
	} catch {
		return undefined;
	}
}

export async function deleteModelProfile(filename: string): Promise<void> {
	if (!isSafeModelProfileFilename(filename)) return;
	const path = join(modelProfilesDir(), filename);
	if (existsSync(path)) await unlink(path);
}
