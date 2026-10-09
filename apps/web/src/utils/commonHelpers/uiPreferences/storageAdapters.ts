import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { countLabel } from "../../lib/russianPlural.js";
import { normalizedLocalOrganizationId } from "../AuthOnboardingHelpers";
import {
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
} from "../localStorageHelpers";
import type { PersistenceHealth } from "./types";

// In-Memory Fallback Cache to survive Safari Private Browsing and QuotaExceededError
const memoryStorageFallback = new Map<string, string>();
let memoryFallbackActivated = false;

export function isMemoryFallbackActive(): boolean {
	return memoryFallbackActivated;
}

export function safeGetStorageItem(
	storage: Storage | null | undefined,
	key: string,
): string | null {
	try {
		if (storage) {
			const val = storage.getItem(key);
			if (val !== null) return val;
		}
	} catch {
		// Storage access blocked or restricted (e.g. security sandbox)
	}
	return memoryStorageFallback.get(key) ?? null;
}

export function safeSetStorageItem(
	storage: Storage | null | undefined,
	key: string,
	value: string,
): boolean {
	try {
		if (storage) {
			storage.setItem(key, value);
			memoryStorageFallback.set(key, value);
			return true;
		}
	} catch (_error) {
		// QuotaExceededError or SecurityError in private browsing
		memoryFallbackActivated = true;
	}
	memoryStorageFallback.set(key, value);
	return false;
}

export function safeRemoveStorageItem(
	storage: Storage | null | undefined,
	key: string,
): void {
	try {
		if (storage) {
			storage.removeItem(key);
		}
	} catch {
		// Silently handle storage clearance failures
	}
	memoryStorageFallback.delete(key);
}

export function browserGeneratedId(prefix: string): string {
	return `${prefix}-${crypto.randomUUID()}`;
}

export function isRecordKey<T extends string>(
	value: unknown,
	record: Record<T, unknown>,
): value is T {
	return typeof value === "string" && Object.hasOwn(record, value);
}

export function isOptionValue<T extends string>(
	value: unknown,
	options: readonly { value: T }[],
): value is T {
	return (
		typeof value === "string" &&
		options.some((option) => option.value === value)
	);
}

export function isStringUnionValue<T extends string>(
	value: unknown,
	allowedValues: readonly T[],
): value is T {
	return (
		typeof value === "string" &&
		allowedValues.some((allowedValue) => allowedValue === value)
	);
}

export function isBooleanPreference(value: unknown): value is boolean {
	return typeof value === "boolean";
}

export function isBoundedPreferenceString(value: unknown): value is string {
	return typeof value === "string" && value.length <= 500;
}

export function isNullableString(value: unknown): value is string | null {
	return value === null || typeof value === "string";
}

export function isNullablePreferenceString(
	value: unknown,
): value is string | null {
	return value === null || isBoundedPreferenceString(value);
}

export function createLocalQueueId(): string {
	if (typeof crypto !== "undefined") {
		if ("randomUUID" in crypto) return crypto.randomUUID();
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const cryptoAny = crypto as any;
		if (typeof cryptoAny.getRandomValues === "function") {
			const array = new Uint32Array(1);
			cryptoAny.getRandomValues(array);
			return `local-${Date.now()}-${(array[0] || 0).toString(16)}`;
		}
	}
	const timeStr = Date.now().toString(16);
	let hash = 0;
	for (let i = 0; i < timeStr.length; i++) {
		hash = (Math.imul(31, hash) + timeStr.charCodeAt(i)) | 0;
	}
	return `local-${Date.now()}-${Math.abs(hash).toString(16)}`;
}

export function localQueueOrganizationMatches(
	itemOrganizationId: string | null | undefined,
	activeOrganizationId: string | null | undefined,
): boolean {
	return (
		normalizedLocalOrganizationId(itemOrganizationId) ===
		normalizedLocalOrganizationId(activeOrganizationId)
	);
}

export function normalizePersistenceHealth(
	payload: unknown,
): PersistenceHealth | null {
	if (!payload || typeof payload !== "object") return null;
	const persistence =
		(
			payload as {
				meta?: Partial<PersistenceHealth>;
				persistence?: Partial<PersistenceHealth>;
			}
		).meta ??
		(payload as { persistence?: Partial<PersistenceHealth> }).persistence;
	if (!persistence || typeof persistence !== "object") return null;

	return {
		enabled: persistence.enabled === true,
		filePath:
			typeof persistence.filePath === "string" ? persistence.filePath : "",
		exists: persistence.exists === true,
		version:
			typeof persistence.version === "number" ? persistence.version : null,
		savedAt:
			typeof persistence.savedAt === "string" ? persistence.savedAt : null,
		checksum:
			typeof persistence.checksum === "string" ? persistence.checksum : null,
		backupDirectoryPath:
			typeof persistence.backupDirectoryPath === "string"
				? persistence.backupDirectoryPath
				: "",
		backupCount:
			typeof persistence.backupCount === "number" ? persistence.backupCount : 0,
		latestBackupAt:
			typeof persistence.latestBackupAt === "string"
				? persistence.latestBackupAt
				: null,
		latestBackupSizeBytes:
			typeof persistence.latestBackupSizeBytes === "number"
				? persistence.latestBackupSizeBytes
				: null,
		maxBackupCount:
			typeof persistence.maxBackupCount === "number"
				? persistence.maxBackupCount
				: 0,
	};
}

export {
	countLabel,
	denteAdminSecretRequestHeaders,
	localConvenienceRetentionMs,
	localSavedAtFresh,
	organizationScopedLocalStorageKey,
};
