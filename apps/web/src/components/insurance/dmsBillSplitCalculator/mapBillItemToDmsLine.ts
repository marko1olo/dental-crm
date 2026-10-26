/**
 * mapBillItemToDmsLine.ts — Преобразование позиций счёта в строки расчета ДМС
 * Мандат 8b: строго <= 120 строк.
 */

import type { DmsBillableLineItem } from "../dmsSplitEngine.js";
import type { BillItemToSplit } from "../DmsGuaranteeLetterModal.js";

export function mapBillItemToDmsLine(item: BillItemToSplit): DmsBillableLineItem {
	const raw = item as unknown as Record<string, unknown>;
	const code = typeof item.serviceCode804n === "string" ? item.serviceCode804n : typeof raw.code === "string" ? raw.code : "";
	const name = typeof item.serviceName === "string" ? item.serviceName : typeof raw.name === "string" ? raw.name : "";
	const priceKop = typeof item.unitPriceKopecks === "number" ? item.unitPriceKopecks : typeof raw.priceRub === "number" ? Math.round(raw.priceRub * 100) : 0;

	return {
		id: item.id || `item-${Math.random()}`,
		serviceCode: code,
		serviceCode804n: code,
		serviceName: name,
		toothNumber: item.toothNumber || (typeof raw.tooth === "string" ? raw.tooth : undefined),
		quantity: typeof item.quantity === "number" ? item.quantity : 1,
		unitPriceKopecks: priceKop,
		discountPercent: item.discountPercent,
	};
}
