import type { DoublePostingCheckResult } from "../types.js";

const processedSyncHashes = new Set<string>();
const exportedPackageHashes = new Map<string, { exportedAtIso: string; packageId: string }>();

export function isSyncHashProcessed(hash: string): boolean {
	return processedSyncHashes.has(hash);
}

export function markSyncHashProcessed(hash: string): void {
	processedSyncHashes.add(hash);
}

export function registerExportedPackage(sha256: string, info: { exportedAtIso: string; packageId: string }): void {
	exportedPackageHashes.set(sha256, info);
}

export function checkDoublePosting(
	_organizationId: string,
	sha256Hash: string,
): DoublePostingCheckResult {
	const existing = exportedPackageHashes.get(sha256Hash);
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
