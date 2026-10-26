/**
 * liveLabOrdersProcessor.ts — Извлечение и расчет нарядов ЗТЛ по приему врача.
 *
 * Железные правила вычета зуботехнической лаборатории:
 * 1. Учитываются только живые наряды (отправлен, в работе, сдан, принят, переделка, завершён).
 *    Черновики и отменённые наряды не имеют счета и никогда не вычитаются из зарплаты врача.
 * 2. Гарантийная переделка оплачивается клиникой — вычет с врача равен нулю.
 * 3. Сумма вычета по приему считается ОДИН раз (не по числу ортопедических услуг).
 * Mandate 8b: строго <= 120 строк на файл.
 */

import {
	LAB_STATUS_RU,
	type DoctorEarningsLabOrderItem,
} from "./types.js";
import { LAB_DEDUCTED_CATEGORIES } from "./constants.js";
import type { LiveCalculationInput } from "./liveEarningsTypes.js";

/** Статусы нарядов, которые дают реальный счет ЗТЛ. Черновик и отмена — не счет. */
const PAID_LAB_STATUSES = new Set(["sent", "in_progress", "shipped", "received", "refitting", "completed"]);

export function processAptLabOrders(
	aptPatientId: string | null,
	dbLabOrders: LiveCalculationInput["dbLabOrders"],
): { aptLabItems: DoctorEarningsLabOrderItem[]; aptLabKop: number } {
	const aptLabOrdersList = dbLabOrders.filter((lo) => lo.patientId === aptPatientId && PAID_LAB_STATUSES.has(String(lo.status)));
	let aptLabKop = 0;

	const aptLabItems: DoctorEarningsLabOrderItem[] = aptLabOrdersList.map((lo) => {
		const loCostRub = lo.isWarranty ? 0 : (parseFloat(String(lo.labCostRub ?? lo.priceRub)) || 0);
		const loCostKop = Math.round(loCostRub * 100);
		aptLabKop += loCostKop;
		return {
			id: lo.id,
			toothFdi: lo.toothFdi,
			material: lo.material,
			status: lo.status,
			statusRu: LAB_STATUS_RU[lo.status] || lo.status,
			costRub: loCostRub,
			costKop: loCostKop,
			dueDate: lo.dueDate ? lo.dueDate.toISOString() : null,
		};
	});

	return { aptLabItems, aptLabKop };
}

/**
 * Распределяет счет ЗТЛ пациента между ортопедическими услугами одного приема
 * пропорционально их цене. Сумма вычетов по услугам строго равна общему счету
 * приёма (без задвоения и без увода базы в минус).
 */
export function distributeLabKopAcrossServices(
	aptLabKop: number,
	services: readonly { priceKop: number; isOrthopedic: boolean }[],
): number[] {
	const shares = services.map(() => 0);
	if (aptLabKop <= 0 || services.length === 0) return shares;

	const orthoIndexes = services
		.map((srv, idx) => ({ srv, idx }))
		.filter(({ srv }) => srv.isOrthopedic)
		.map(({ idx }) => idx);

	const targetIndexes = orthoIndexes.length > 0 ? orthoIndexes : services.map((_, idx) => idx);
	const totalOrthoGross = targetIndexes.reduce((sum, idx) => sum + services[idx]!.priceKop, 0);

	let remaining = aptLabKop;
	if (totalOrthoGross <= 0) {
		// Нет ценовой базы — весь вычет на первую целевую услугу.
		shares[targetIndexes[0]!] = remaining;
		remaining = 0;
	} else {
		for (const idx of targetIndexes) {
			if (remaining <= 0) break;
			const share = Math.min(remaining, Math.round((aptLabKop * services[idx]!.priceKop) / totalOrthoGross));
			shares[idx] = share;
			remaining -= share;
		}
		if (remaining > 0) {
			// Остаток округления — на последнюю целевую услугу.
			const lastIdx = targetIndexes[targetIndexes.length - 1];
			if (lastIdx !== undefined) shares[lastIdx] = (shares[lastIdx] ?? 0) + remaining;
		}
	}
	return shares;
}
