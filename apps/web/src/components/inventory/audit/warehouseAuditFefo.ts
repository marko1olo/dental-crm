import type { FefoStatus, WarehouseAuditItemLine } from "./warehouseAuditTypes.js";

export function calculateDaysUntilExpiration(expiryDateStr: string, referenceDateStr?: string): number {
	const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
	const expDate = new Date(expiryDateStr);

	if (Number.isNaN(refDate.getTime()) || Number.isNaN(expDate.getTime())) {
		return 0;
	}

	const diffTime = expDate.getTime() - refDate.getTime();
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateFefoStatus(
	expiryDateStr: string,
	referenceDateStr?: string,
): {
	fefoStatus: FefoStatus;
	daysUntilExpiration: number;
	badgeLabelRu: string;
	hexColor: string;
	cssModifier: string;
} {
	const days = calculateDaysUntilExpiration(expiryDateStr, referenceDateStr);

	if (days <= 0) {
		return {
			fefoStatus: "expired",
			daysUntilExpiration: days,
			badgeLabelRu: "Просрочен",
			hexColor: "#ef4444",
			cssModifier: "expired",
		};
	}
	if (days <= 30) {
		return {
			fefoStatus: "warning_30",
			daysUntilExpiration: days,
			badgeLabelRu: `< 30 дней (${days} дн.)`,
			hexColor: "#f97316",
			cssModifier: "warning-30",
		};
	}
	if (days <= 60) {
		return {
			fefoStatus: "warning_60",
			daysUntilExpiration: days,
			badgeLabelRu: `< 60 дней (${days} дн.)`,
			hexColor: "#eab308",
			cssModifier: "warning-60",
		};
	}
	return {
		fefoStatus: "fresh",
		daysUntilExpiration: days,
		badgeLabelRu: `Свежий (${days} дн.)`,
		hexColor: "#10b981",
		cssModifier: "fresh",
	};
}

export function sortAuditItemsByFefo(items: readonly WarehouseAuditItemLine[]): WarehouseAuditItemLine[] {
	return [...items].sort((a, b) => {
		const diff = a.daysUntilExpiration - b.daysUntilExpiration;
		if (diff !== 0) return diff;
		return a.nameRu.localeCompare(b.nameRu, "ru");
	});
}

export function quarantineExpiredBatchesFromAudit(
	items: readonly WarehouseAuditItemLine[],
): {
	validLines: WarehouseAuditItemLine[];
	expiredQuarantineLines: WarehouseAuditItemLine[];
	totalExpiredQuantity: number;
	totalExpiredCostKopecks: number;
} {
	const validLines: WarehouseAuditItemLine[] = [];
	const expiredQuarantineLines: WarehouseAuditItemLine[] = [];
	let totalExpiredQuantity = 0;
	let totalExpiredCostKopecks = 0;

	for (const it of items) {
		if (it.fefoStatus === "expired" || it.daysUntilExpiration <= 0 || it.isWriteoffRequired) {
			expiredQuarantineLines.push(it);
			totalExpiredQuantity += it.actualQuantity;
			totalExpiredCostKopecks += it.actualTotalKopecks;
		} else {
			validLines.push(it);
		}
	}

	return {
		validLines,
		expiredQuarantineLines,
		totalExpiredQuantity,
		totalExpiredCostKopecks,
	};
}
