/**
 * doctorShiftsComputer.ts — Группировка визитов врача по сменам и расчет сделки за смену.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import type { DoctorPayoutRow, DoctorPayoutVisit, ShiftSummaryItem } from "./types.js";
import { formatShiftDate } from "./types.js";
import { rublesToKopecks, kopecksToRubles, percentageOfKopecks, type Kopecks } from "@dental/shared";

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
	const commissionBasisPoints = Math.round((currentDoctor.commissionPct ?? 0) * 100);
	const labOrdersList = currentDoctor.labOrders ?? [];

	return sortedDates.map((dateStr) => {
		const rawVList = map.get(dateStr) ?? [];
		const shiftPatients = new Set(rawVList.map((v) => v.patientName.trim().toLowerCase()));

		const patientLabMap = new Map<string, number>();
		let unlinkedLabKop = 0;
		if (labOrdersList.length > 0) {
			for (const lo of labOrdersList) {
				const orderDate = lo.completedAt ? lo.completedAt.slice(0, 10) : "";
				const pName = lo.patientName.trim().toLowerCase();
				const isSameDate = orderDate === dateStr;
				const isSamePatient = shiftPatients.has(pName);
				if (isSameDate || isSamePatient) {
					const loKop = rublesToKopecks(lo.withheldRub != null ? lo.withheldRub : lo.priceRub || 0);
					if (isSamePatient) {
						patientLabMap.set(pName, (patientLabMap.get(pName) ?? 0) + loKop);
					} else {
						unlinkedLabKop += loKop;
					}
				}
			}
		}

		type VisitDraft = {
			visit: DoctorPayoutVisit;
			revKop: number;
			matKop: number;
			labKop: number;
			netKop: number;
			earnedKop: number;
		};

		const visitDrafts: VisitDraft[] = [];
		let shiftRevKop = 0;
		let shiftMatKop = 0;
		let shiftLabKop = unlinkedLabKop;

		for (let i = 0; i < rawVList.length; i++) {
			const v = rawVList[i]!;
			const revKop = rublesToKopecks(v.revenueRub);
			let matKop = 0;
			if (Array.isArray(v.materials)) {
				for (const m of v.materials) {
					if (!m.isOverheadConsumable && !m.coveredByClinic) {
						matKop += rublesToKopecks(m.totalCostRub || 0);
					}
				}
			}

			const pName = v.patientName.trim().toLowerCase();
			let labKop = patientLabMap.get(pName) ?? 0;
			patientLabMap.delete(pName);

			if (i === 0 && unlinkedLabKop > 0) {
				labKop += unlinkedLabKop;
			}

			const netKop = Math.max(0, revKop - matKop - labKop);
			const earnedKop = percentageOfKopecks(netKop as Kopecks, commissionBasisPoints);

			shiftRevKop += revKop;
			shiftMatKop += matKop;
			shiftLabKop += (labKop - (i === 0 ? unlinkedLabKop : 0));

			visitDrafts.push({ visit: v, revKop, matKop, labKop, netKop, earnedKop });
		}

		const shiftNetRevKop = Math.max(0, shiftRevKop - shiftMatKop - shiftLabKop);
		const totalShiftEarnedKop = percentageOfKopecks(shiftNetRevKop as Kopecks, commissionBasisPoints);

		const sumDraftEarnedKop = visitDrafts.reduce((acc, d) => acc + d.earnedKop, 0);
		const residualKop = totalShiftEarnedKop - sumDraftEarnedKop;

		const enrichedVisits: DoctorPayoutVisit[] = visitDrafts.map((d, idx) => {
			const finalEarnedKop = (idx === visitDrafts.length - 1) ? Math.max(0, d.earnedKop + residualKop) : d.earnedKop;
			return {
				...d.visit,
				materialsCostRub: kopecksToRubles(d.matKop as Kopecks),
				labCostRub: kopecksToRubles(d.labKop as Kopecks),
				netRevenueRub: kopecksToRubles(d.netKop as Kopecks),
				earnedRub: kopecksToRubles(finalEarnedKop as Kopecks),
			};
		});

		const { formatted, dayOfWeek } = formatShiftDate(dateStr);
		let estimatedHours = 6;
		const validTimestamps = rawVList
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
			visits: enrichedVisits,
			patientCount: rawVList.length,
			estimatedHours,
			shiftRevenueRub: kopecksToRubles(shiftRevKop as Kopecks),
			shiftEarnedRub: kopecksToRubles(totalShiftEarnedKop),
		};
	});
}
