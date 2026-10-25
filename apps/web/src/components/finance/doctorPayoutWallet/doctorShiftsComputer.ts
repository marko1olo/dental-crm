/**
 * doctorShiftsComputer.ts — Группировка визитов врача по сменам и расчет сделки за смену.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import type { DoctorPayoutRow, DoctorPayoutVisit } from "../../../pages/payoutDashboard/types.js";
import { formatShiftDate } from "./types.js";
import type { ShiftSummaryItem } from "./types.js";

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

	return sortedDates.map((dateStr) => {
		const vList = map.get(dateStr) ?? [];
		const rev = vList.reduce((acc, v) => acc + v.revenueRub, 0);
		const earned = Math.round(rev * commissionRate);
		const { formatted, dayOfWeek } = formatShiftDate(dateStr);
		const estimatedHours = Math.min(12, Math.max(4, Math.round(vList.length * 1.5)));

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
