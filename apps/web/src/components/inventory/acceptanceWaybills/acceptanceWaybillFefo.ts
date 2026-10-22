import type {
	AcceptanceWaybillItem,
	FefoEvaluation,
	OverdraftReconciliationResult,
} from "../acceptanceWaybillsTypes.js";

/**
 * Рассчитывает количество дней до истечения срока годности.
 */
export function calculateDaysUntilExpiration(
	expirationDateIso: string,
	referenceDateIso?: string,
): number {
	const refDateStr = referenceDateIso || new Date().toISOString().slice(0, 10);
	const target = new Date(`${expirationDateIso.slice(0, 10)}T00:00:00Z`).getTime();
	const ref = new Date(`${refDateStr.slice(0, 10)}T00:00:00Z`).getTime();
	if (Number.isNaN(target) || Number.isNaN(ref)) return 0;
	return Math.round((target - ref) / (1000 * 60 * 60 * 24));
}

/**
 * Оценивает статус партии по регламенту FEFO.
 */
export function calculateFefoStatus(
	expirationDateIso: string,
	referenceDateIso?: string,
): FefoEvaluation {
	const days = calculateDaysUntilExpiration(expirationDateIso, referenceDateIso);

	if (days <= 0) {
		return {
			fefoStatus: "expired",
			badgeLabelRu: "Просрочен",
			hexColor: "var(--red, #ef4444)",
			bgSoft: "rgba(239, 68, 68, 0.12)",
			daysRemaining: days,
		};
	}
	if (days <= 30) {
		return {
			fefoStatus: "critical",
			badgeLabelRu: `FEFO: ${days} дн. (критический срок < 30 дн., срочно расходовать)`,
			hexColor: "var(--red, #ef4444)",
			bgSoft: "rgba(239, 68, 68, 0.12)",
			daysRemaining: days,
		};
	}
	if (days <= 180) {
		return {
			fefoStatus: "warning",
			badgeLabelRu: `FEFO: ${days} дн. (1-6 мес., первая очередь)`,
			hexColor: "var(--amber, #f59e0b)",
			bgSoft: "rgba(245, 158, 11, 0.12)",
			daysRemaining: days,
		};
	}
	return {
		fefoStatus: "fresh",
		badgeLabelRu: `Годен: ${days} дн. (> 6 мес.)`,
		hexColor: "var(--teal, #0d9488)",
		bgSoft: "rgba(13, 148, 136, 0.12)",
		daysRemaining: days,
	};
}

/**
 * Сортировка позиций по FEFO (первыми идут с ближайшим сроком окончания).
 */
export function sortWaybillItemsByFefo(
	items: readonly AcceptanceWaybillItem[],
	direction: "asc" | "desc" = "asc",
): AcceptanceWaybillItem[] {
	return [...items].sort((a, b) => {
		const diff = a.daysUntilExpiration - b.daysUntilExpiration;
		return direction === "asc" ? diff : -diff;
	});
}

/**
 * Ликвидация мягкого овердрафта (Мандат 8n).
 */
export function reconcileOverdraftOnReceipt(
	stockQuantity: number,
	receivedQuantity: number,
): OverdraftReconciliationResult {
	const previousStock = Number(stockQuantity.toFixed(3));
	const received = Math.max(0, Number(receivedQuantity.toFixed(3)));

	if (previousStock >= 0) {
		return {
			previousStock,
			clearedDeficit: 0,
			newStockQuantity: Number((previousStock + received).toFixed(3)),
			overdraftResolved: false,
		};
	}

	const deficit = Math.abs(previousStock);
	const clearedDeficit = Math.min(deficit, received);
	const newStockQuantity = Number((previousStock + received).toFixed(3));

	return {
		previousStock,
		clearedDeficit,
		newStockQuantity,
		overdraftResolved: true,
	};
}
