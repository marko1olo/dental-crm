import type { DoublePostingCheckResult } from "../types.js";

// Multi-tenant stores partitioned by organizationId
const processedSyncHashesByOrg = new Map<string, Set<string>>();
const exportedPackageHashesByOrg = new Map<
	string,
	Map<string, { exportedAtIso: string; packageId: string }>
>();

function getProcessedSyncSet(organizationId: string): Set<string> {
	let set = processedSyncHashesByOrg.get(organizationId);
	if (!set) {
		set = new Set<string>();
		processedSyncHashesByOrg.set(organizationId, set);
	}
	return set;
}

function getExportedMap(
	organizationId: string,
): Map<string, { exportedAtIso: string; packageId: string }> {
	let map = exportedPackageHashesByOrg.get(organizationId);
	if (!map) {
		map = new Map<string, { exportedAtIso: string; packageId: string }>();
		exportedPackageHashesByOrg.set(organizationId, map);
	}
	return map;
}

export function isSyncHashProcessed(organizationId: string, hash: string): boolean {
	return getProcessedSyncSet(organizationId).has(hash);
}

export function markSyncHashProcessed(organizationId: string, hash: string): void {
	getProcessedSyncSet(organizationId).add(hash);
}

export function registerExportedPackage(
	organizationId: string,
	sha256: string,
	info: { exportedAtIso: string; packageId: string },
): void {
	getExportedMap(organizationId).set(sha256, info);
}

export function checkDoublePosting(
	organizationId: string,
	sha256Hash: string,
): DoublePostingCheckResult {
	const orgMap = getExportedMap(organizationId);
	const existing = orgMap.get(sha256Hash);
	if (existing) {
		return {
			isDoublePosting: true,
			previousExportDate: existing.exportedAtIso,
			message: `ВНИМАНИЕ: Пакет с контрольным хэшем SHA-256 (${sha256Hash.slice(0, 16)}...) уже выгружался ранее (${existing.exportedAtIso}). Повторное проведение может привести к удвоению проводок в 1С!`,
		};
	}
	return {
		isDoublePosting: false,
		message: "Пакет уникален, двойное проведение отсутствует.",
	};
}

export function clearReconciliationStoreForTests(): void {
	processedSyncHashesByOrg.clear();
	exportedPackageHashesByOrg.clear();
}
