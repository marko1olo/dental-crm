import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ModelHealthRecord } from "./types.js";
import {
	sanitizeProviderErrorMessage,
	modelHealthFilePath,
} from "./keyHashing.js";

const modelHealthByName = new Map<string, ModelHealthRecord>();
let modelHealthLoadedFromDisk = false;

function loadModelHealthFromDisk(): void {
	if (modelHealthLoadedFromDisk) return;
	modelHealthLoadedFromDisk = true;
	const filePath = modelHealthFilePath();
	if (!filePath || !existsSync(filePath)) return;
	try {
		const parsed = JSON.parse(readFileSync(filePath, "utf8"));
		if (parsed && typeof parsed.models === "object") {
			const now = Date.now();
			for (const [model, data] of Object.entries(parsed.models)) {
				const candidate = data as Partial<ModelHealthRecord>;
				if (candidate && typeof candidate === "object") {
					const bannedUntil = Number(candidate.bannedUntil ?? 0);
					if (bannedUntil > now) {
						modelHealthByName.set(model, {
							bannedUntil,
							failures: Number(candidate.failures ?? 1),
							lastFailureAt: candidate.lastFailureAt ?? null,
							lastSuccessAt: candidate.lastSuccessAt ?? null,
							lastError: candidate.lastError
								? sanitizeProviderErrorMessage(String(candidate.lastError))
								: null,
						});
					}
				}
			}
		}
	} catch {
		modelHealthByName.clear();
	}
}

function saveModelHealthToDisk(): void {
	loadModelHealthFromDisk();
	const filePath = modelHealthFilePath();
	if (!filePath) return;
	try {
		mkdirSync(dirname(filePath), { recursive: true });
		const payload = {
			version: 1,
			savedAt: new Date().toISOString(),
			models: Object.fromEntries(modelHealthByName.entries()),
		};
		writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
	} catch {
		// Non-fatal safety cache
	}
}

export function isModelBanned(modelName: string): boolean {
	loadModelHealthFromDisk();
	const health = modelHealthByName.get(modelName);
	if (!health) return false;
	const now = Date.now();
	if (health.bannedUntil <= now) {
		modelHealthByName.delete(modelName);
		return false;
	}
	return true;
}

export function getBannedModels(): Record<string, { bannedUntil: number; reason?: string | undefined }> {
	loadModelHealthFromDisk();
	const now = Date.now();
	const out: Record<string, { bannedUntil: number; reason?: string | undefined }> = {};
	for (const [name, h] of modelHealthByName.entries()) {
		if (h.bannedUntil > now) {
			out[name] = { bannedUntil: h.bannedUntil, reason: h.lastError ?? undefined };
		}
	}
	return out;
}

export function banModel(
	modelName: string,
	durationSeconds: number,
	reason?: string,
): void {
	loadModelHealthFromDisk();
	const health = modelHealthByName.get(modelName) ?? {
		bannedUntil: 0,
		failures: 0,
		lastFailureAt: null,
		lastSuccessAt: null,
		lastError: null,
	};
	health.bannedUntil = Date.now() + durationSeconds * 1000;
	health.failures += 1;
	health.lastFailureAt = Date.now();
	if (reason) health.lastError = sanitizeProviderErrorMessage(reason);
	modelHealthByName.set(modelName, health);
	saveModelHealthToDisk();
	console.warn(
		`[ModelHealth] Model ${modelName} banned for ${durationSeconds}s. Reason: ${reason ?? "unknown"}`,
	);
}

export function recordModelFailure(modelName: string, error: unknown): number {
	loadModelHealthFromDisk();
	const errLower = sanitizeProviderErrorMessage(
		error instanceof Error ? error.message : String(error ?? ""),
	).toLowerCase();

	const isNotFound = /\b404\b|not_?found|does not exist/i.test(errLower);
	if (isNotFound) {
		const banSec = 86400; // 24 hours
		banModel(modelName, banSec, "Model not found (404)");
		return banSec;
	}

	const health = modelHealthByName.get(modelName) ?? {
		bannedUntil: 0,
		failures: 0,
		lastFailureAt: null,
		lastSuccessAt: null,
		lastError: null,
	};

	const now = Date.now();
	let count = health.failures;
	if (health.lastFailureAt && now - health.lastFailureAt > 15 * 60 * 1000) {
		count = 0;
	}
	count += 1;

	// Progressive backoff: 60s for 1st transient 503 spike, 300s (5m) for 2nd, 1200s (20m) for persistent overload
	let banSec = 60;
	if (count === 2) banSec = 300;
	else if (count >= 3) banSec = 1200;

	health.failures = count;
	health.bannedUntil = now + banSec * 1000;
	health.lastFailureAt = now;
	health.lastError = sanitizeProviderErrorMessage(errLower);
	modelHealthByName.set(modelName, health);
	saveModelHealthToDisk();

	console.warn(
		`[ModelHealth] Model ${modelName} failed (${errLower.slice(0, 100)}). Failure #${count}. Banned for ${banSec}s.`,
	);
	return banSec;
}

export function recordModelSuccess(modelName: string): void {
	loadModelHealthFromDisk();
	if (modelHealthByName.has(modelName)) {
		modelHealthByName.delete(modelName);
		saveModelHealthToDisk();
		console.log(`[ModelHealth] Model ${modelName} answered successfully. Ban lifted.`);
	}
}

export function filterActiveModelCascade(cascade: readonly string[]): string[] {
	loadModelHealthFromDisk();
	const active: string[] = [];
	const seen = new Set<string>();

	for (const m of cascade) {
		if (seen.has(m)) continue;
		seen.add(m);
		if (!isModelBanned(m)) {
			active.push(m);
		}
	}

	// If all models in cascade are banned, return the last model as safe fallback (better to try than silence)
	if (active.length === 0 && cascade.length > 0) {
		return [cascade[cascade.length - 1]!];
	}
	return active;
}

export function clearModelHealthMemoryForTests(): void {
	modelHealthByName.clear();
	modelHealthLoadedFromDisk = true;
	const filePath = modelHealthFilePath();
	if (filePath && existsSync(filePath)) {
		try {
			unlinkSync(filePath);
		} catch {}
	}
}
