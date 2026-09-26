import type { TreatmentPlanItem } from "../../../treatment-plans/types";
import { mapTreatmentItemsToFiscalReceipt } from "../../order804nFiscalEngine";

/**
 * Безупречное форматирование денежных сумм в рублях с копейками без артефактов округления.
 */
export function formatMoneyRu(value: number): string {
	const safeVal = Number.isFinite(value) ? (Object.is(value, -0) ? 0 : value) : 0;
	return (
		safeVal.toLocaleString("ru-RU", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}) + " ₽"
	);
}

/**
 * 1-Click Экспресс-выбор всех позиций плана лечения для 100% возврата (Мандаты 8e, 8k, 8n).
 */
export function selectAllRefundItems(items: readonly TreatmentPlanItem[]): Record<string, boolean> {
	const allSelected: Record<string, boolean> = {};
	for (const item of items) {
		allSelected[item.id] = true;
	}
	return allSelected;
}

/**
 * 1-Click Сброс выбора позиций возврата (очистка).
 */
export function deselectAllRefundItems(): Record<string, boolean> {
	return {};
}

/**
 * Расчет эффективных позиций для чека возврата прихода (54-ФЗ / ФФД 1.2).
 * Поддерживает как частичный/полный возврат по смете, так и возврат аванса/депозита без услуг.
 */
export function calculateRefundActiveItems(params: {
	readonly items: readonly TreatmentPlanItem[];
	readonly selection: Record<string, boolean>;
	readonly isAdvanceRefund: boolean;
	readonly advanceAmountRub: number;
	readonly advancePurpose: string;
}): readonly TreatmentPlanItem[] {
	const { items, selection, isAdvanceRefund, advanceAmountRub, advancePurpose } = params;

	if (isAdvanceRefund) {
		if (advanceAmountRub <= 0) return [];
		return [
			{
				id: "refund-advance-deposit",
				code804n: "",
				name: advancePurpose.trim() || "Возврат аванса / денежных средств",
				category: "Возврат",
				unitPriceRub: advanceAmountRub,
				priceRub: advanceAmountRub,
				quantity: 1,
				discountRub: 0,
				phase: 1,
				stageKind: "stage_1_therapy",
			},
		];
	}

	return items.filter((i) => Boolean(selection[i.id]));
}

/**
 * Расчет сумм и валидация готовности к фискализации возврата прихода (54-ФЗ).
 */
export function calculateRefundFiscalSummary(params: {
	readonly items: readonly TreatmentPlanItem[];
	readonly selection: Record<string, boolean>;
	readonly isAdvanceRefund: boolean;
	readonly advanceAmountRub: number;
	readonly advancePurpose: string;
}): {
	readonly effectiveItems: readonly TreatmentPlanItem[];
	readonly totalRub: number;
	readonly totalKopecks: number;
	readonly canFiscalize: boolean;
} {
	const effectiveItems = calculateRefundActiveItems(params);
	const fiscalData = mapTreatmentItemsToFiscalReceipt(effectiveItems);

	return {
		effectiveItems,
		totalRub: fiscalData.totalRub,
		totalKopecks: fiscalData.totalKopecks,
		canFiscalize: fiscalData.totalRub > 0,
	};
}
