/**
 * doctorShiftsComputer.ts — Группировка визитов врача по сменам и расчет сделки за смену.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import type { DoctorPayoutRow, DoctorPayoutVisit, ShiftSummaryItem } from "./types.js";
import { formatShiftDate } from "./types.js";

export function computeDoctorShifts(
	currentDoctor: DoctorPayoutRow | null,
): readonly ShiftSummaryItem[] {
	if (!currentDoctor || !currentDoctor.visits || currentDoctor.visits.length === 0) {
		return [];
	}

	const map = new Map<string, DoctorPayoutVisit[]>();
	for (const v of currentDoctor.visits) {
		const d = v.visitDate || v.paidAt.slice(0, 10);
		const list = map.get(d) ?? [];
		list.push(v);
		map.set(d, list);
	}

	const sortedDates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
	const commissionRate = (currentDoctor.commissionPct ?? 0) / 100;
	const labOrdersList = currentDoctor.labOrders ?? [];

	return sortedDates.map((dateStr) => {
		const vList = map.get(dateStr) ?? [];
		const rev = vList.reduce((acc, v) => acc + v.revenueRub, 0);

		// Себестоимость расходных материалов визитов смены (за вычетом общеклинических накладных)
		let shiftMaterialsCostRub = 0;
		for (const v of vList) {
			if (Array.isArray(v.materials)) {
				for (const m of v.materials) {
					if (!m.isOverheadConsumable && !m.coveredByClinic) {
						shiftMaterialsCostRub += (m.totalCostRub || 0);
					}
				}
			}
		}

		// Себестоимость зуботехнической лаборатории (ЗТЛ) смены
		let shiftLabCostRub = 0;
		if (labOrdersList.length > 0) {
			const shiftPatients = new Set(vList.map((v) => v.patientName.trim().toLowerCase()));
			for (const lo of labOrdersList) {
				const orderDate = lo.completedAt ? lo.completedAt.slice(0, 10) : "";
				const isSameDate = orderDate === dateStr;
				const isSamePatient = shiftPatients.has(lo.patientName.trim().toLowerCase());
				if (isSameDate || isSamePatient) {
					shiftLabCostRub += (lo.withheldRub != null ? lo.withheldRub : lo.priceRub || 0);
				}
			}
		}

		// Чистая база смены (Net Revenue = Выручка - Материалы - ЗТЛ)
		const netRevenueRub = Math.max(0, rev - shiftMaterialsCostRub - shiftLabCostRub);
		const earned = Math.round(netRevenueRub * commissionRate);
		const { formatted, dayOfWeek } = formatShiftDate(dateStr);

		// Реалистичная длительность смены (ст. 350 ТК РФ: стандарт 6 ч., либо фактический интервал приемов)
		let estimatedHours = 6;
		const validTimestamps = vList
			.map((v) => Date.parse(v.paidAt))
			.filter((t) => !Number.isNaN(t));

		if (validTimestamps.length >= 2) {
			const minTime = Math.min(...validTimestamps);
			const maxTime = Math.max(...validTimestamps);
			const diffHours = Math.round((maxTime - minTime) / (1000 * 60 * 60)) + 1;
			estimatedHours = Math.min(12, Math.max(4, diffHours));
		}

		return {
			date: dateStr,
			formattedDate: formatted,
			dayOfWeek,
			visits: vList,
			patientCount: vList.length,
			estimatedHours,
			shiftRevenueRub: rev,
			shiftEarnedRub: earned,
		};
	});
}
