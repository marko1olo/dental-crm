import type {
	KraftBatchStatistics,
	KraftPackageRecord,
	KraftPackageStatus,
} from "./kraftPackageTypes.js";

export function filterKraftPackages(
	records: readonly KraftPackageRecord[],
	filter: {
		status?: KraftPackageStatus | "all";
		query?: string;
		autoclaveId?: string;
	},
): KraftPackageRecord[] {
	return records.filter((r) => {
		if (filter.status && filter.status !== "all" && r.status !== filter.status) {
			return false;
		}
		if (filter.autoclaveId && filter.autoclaveId !== "all" && r.autoclaveId !== filter.autoclaveId) {
			return false;
		}
		if (filter.query && filter.query.trim()) {
			const q = filter.query.toLowerCase().trim();
			const matchName = r.toolSetNameRu.toLowerCase().includes(q);
			const matchBarcode = r.barcode128.toLowerCase().includes(q);
			const matchBatch = r.batchId.toLowerCase().includes(q);
			const matchOperator = r.operatorName.toLowerCase().includes(q);
			if (!matchName && !matchBarcode && !matchBatch && !matchOperator) {
				return false;
			}
		}
		return true;
	});
}

export function calculateKraftBatchStatistics(
	records: readonly KraftPackageRecord[],
): KraftBatchStatistics {
	let sterileValidCount = 0;
	let expiringSoonCount = 0;
	let expiredCount = 0;
	let recalledCount = 0;
	let verifiedIndicatorCount = 0;

	for (const r of records) {
		if (r.status === "sterile_valid") sterileValidCount++;
		else if (r.status === "expiring_soon_7d") expiringSoonCount++;
		else if (r.status === "expired") expiredCount++;
		else if (r.status === "recalled") recalledCount++;

		if (r.indicatorVerified) verifiedIndicatorCount++;
	}

	return {
		totalPacks: records.length,
		sterileValidCount,
		expiringSoonCount,
		expiredCount,
		recalledCount,
		verifiedIndicatorCount,
	};
}
