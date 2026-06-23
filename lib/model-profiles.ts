import { constants, existsSync } from "node:fs";
import { lstat, mkdir, open, readdir, rename, rm, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";

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
export const MAX_MODEL_PROFILE_BYTES = 64 * 1024;

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

async function ensureModelProfilesDir(): Promise<string> {
	const dir = modelProfilesDir();
	await mkdir(dir, { recursive: true });
	const info = await lstat(dir);
	if (!info.isDirectory() || info.isSymbolicLink()) {
		throw new Error(`Model profiles path is not a safe directory: ${dir}`);
	}
	return dir;
}

function profilePathForFilename(filename: string): string | undefined {
	if (!isSafeModelProfileFilename(filename)) return undefined;
	return resolve(modelProfilesDir(), filename);
}

function assertProfilePath(path: string): string {
	const filename = basename(path);
	const expected = profilePathForFilename(filename);
	if (!expected || resolve(path) !== expected) {
		throw new Error(`Unsafe model profile path: ${path}`);
	}
	return expected;
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
		const path = join(dir, entry.name);
		if (!(await readModelProfile(entry.name))) continue;
		profiles.push({ filename: entry.name, path });
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

async function writeNewModelProfileFile(
	path: string,
	agents: AgentModelConfig,
): Promise<void> {
	const targetPath = assertProfilePath(path);
	await ensureModelProfilesDir();
	const handle = await open(
		targetPath,
		constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
		0o600,
	);
	try {
		await handle.writeFile(`${buildModelProfileEnvelope(agents)}\n`, "utf8");
	} catch (error) {
		await rm(targetPath, { force: true });
		throw error;
	} finally {
		await handle.close();
	}
}

async function replaceModelProfileFile(
	path: string,
	agents: AgentModelConfig,
): Promise<void> {
	const targetPath = assertProfilePath(path);
	const dir = await ensureModelProfilesDir();
	const tempPath = join(
		dir,
		`.${basename(targetPath)}.${process.pid}.${Date.now()}.tmp`,
	);
	const handle = await open(
		tempPath,
		constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
		0o600,
	);
	try {
		await handle.writeFile(`${buildModelProfileEnvelope(agents)}\n`, "utf8");
		await handle.close();
		await rename(tempPath, targetPath);
	} catch (error) {
		await handle.close().catch(() => undefined);
		await rm(tempPath, { force: true });
		throw error;
	}
}

export async function writeModelProfile(
	name: string,
	agents: AgentModelConfig,
): Promise<string> {
	const filename = safeModelProfileFilename(name);
	if (!filename) throw new Error(`Invalid profile name: ${name}`);
	const path = join(modelProfilesDir(), filename);
	await writeNewModelProfileFile(path, agents);
	return path;
}

export async function overwriteModelProfile(
	filename: string,
	agents: AgentModelConfig,
): Promise<void> {
	const path = profilePathForFilename(filename);
	if (!path) throw new Error(`Invalid profile filename: ${filename}`);
	await replaceModelProfileFile(path, agents);
}

export async function readModelProfile(
	filename: string,
): Promise<AgentModelConfig | undefined> {
	const path = profilePathForFilename(filename);
	if (!path || !existsSync(path)) return undefined;
	let handle: Awaited<ReturnType<typeof open>> | undefined;
	try {
		handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
		const info = await handle.stat();
		if (!info.isFile() || info.size > MAX_MODEL_PROFILE_BYTES) return undefined;
		return parseModelExport(JSON.parse(await handle.readFile("utf8")));
	} catch {
		return undefined;
	} finally {
		await handle?.close();
	}
}

export async function deleteModelProfile(filename: string): Promise<void> {
	if (!isSafeModelProfileFilename(filename)) return;
	const path = join(modelProfilesDir(), filename);
	if (existsSync(path)) await unlink(path);
}
