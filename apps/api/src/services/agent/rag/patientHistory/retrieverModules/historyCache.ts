import type { PatientHistoryMemoryChunk } from "../types.js";

interface CacheEntry {
	readonly chunks: PatientHistoryMemoryChunk[];
	readonly expiresAt: number;
}

const historyCache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 60_000;

export function getCachedPatientHistory(patientId: string): PatientHistoryMemoryChunk[] | undefined {
	const entry = historyCache.get(patientId);
	if (!entry) return undefined;
	if (Date.now() > entry.expiresAt) {
		historyCache.delete(patientId);
		return undefined;
	}
	return entry.chunks;
}

export function setCachedPatientHistory(
	patientId: string,
	chunks: PatientHistoryMemoryChunk[],
	ttlMs: number = DEFAULT_TTL_MS,
): void {
	historyCache.set(patientId, {
		chunks,
		expiresAt: Date.now() + ttlMs,
	});
}

export function invalidatePatientHistoryCache(patientId?: string): void {
	if (patientId) {
		historyCache.delete(patientId);
	} else {
		historyCache.clear();
	}
}
