/**
 * liveLabOrdersProcessor.ts — Извлечение и расчет нарядов ЗТЛ по приему врача.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import {
	LAB_STATUS_RU,
	type DoctorEarningsLabOrderItem,
} from "./types.js";
import type { LiveCalculationInput } from "./liveEarningsTypes.js";

export function processAptLabOrders(
	aptPatientId: string | null,
	dbLabOrders: LiveCalculationInput["dbLabOrders"],
): { aptLabItems: DoctorEarningsLabOrderItem[]; aptLabKop: number } {
	const aptLabOrdersList = dbLabOrders.filter((lo) => lo.patientId === aptPatientId);
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
