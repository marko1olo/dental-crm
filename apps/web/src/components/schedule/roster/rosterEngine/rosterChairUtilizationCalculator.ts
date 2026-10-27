import {
	type CabinetDefinition,
	CLINIC_CABINETS_CATALOG,
} from "../doctorShiftRosterPresets";
import type {
	ChairHeatLevel,
	ChairUtilizationMetric,
	DoctorShift,
} from "./rosterEngineTypes";
import { timeStringToMinutes } from "./rosterTimeMath";

interface AppointmentTimeSlot {
	chairId: string;
	startsAt: string; // ISO string or time string
	endsAt: string; // ISO string or time string
	status?: string;
}

function resolveSlotTime(timeVal: string, dateIso: string): { matchesDate: boolean; time: string } {
	if (timeVal.includes("T")) {
		const parts = timeVal.split("T");
		if (parts[0] !== dateIso) return { matchesDate: false, time: "" };
		return { matchesDate: true, time: parts[1] ? parts[1].substring(0, 5) : timeVal };
	}
	return { matchesDate: true, time: timeVal };
}

function computeHeatLevel(totalShiftMinutes: number, rate: number): ChairHeatLevel {
	if (totalShiftMinutes === 0) return "empty";
	if (rate < 30) return "cold";
	if (rate <= 80) return "optimal";
	if (rate <= 95) return "peak";
	return "overload";
}

/**
 * Calculate Chair Utilization % based on booked appointments vs scheduled shift duration
 */
export function calculateChairUtilization(
	shifts: DoctorShift[],
	appointments: AppointmentTimeSlot[],
	dateIso: string,
	cabinets: CabinetDefinition[] = CLINIC_CABINETS_CATALOG,
): ChairUtilizationMetric[] {
	const allChairs = cabinets.flatMap((cab) =>
		cab.chairs.map((chair) => ({
			chairId: chair.id,
			chairName: chair.name,
			cabinetId: cab.id,
			cabinetName: cab.name,
		})),
	);

	const dateShifts = shifts.filter(
		(s) => s.dateIso === dateIso && s.status !== "cancelled" && s.durationHours > 0,
	);

	return allChairs.map((chairInfo) => {
		const chairShifts = dateShifts.filter((s) => s.chairId === chairInfo.chairId);

		let totalShiftMinutes = 0;
		for (const shift of chairShifts) {
			const startM = timeStringToMinutes(shift.startTime);
			let endM = timeStringToMinutes(shift.endTime);
			if (endM <= startM) endM += 1440;
			totalShiftMinutes += Math.max(0, endM - startM - (shift.breakMinutes || 0));
		}

		let bookedAppointmentMinutes = 0;
		for (const app of appointments) {
			if (app.chairId !== chairInfo.chairId) continue;
			if (app.status === "cancelled" || app.status === "did_not_come") continue;

			const startRes = resolveSlotTime(app.startsAt, dateIso);
			if (!startRes.matchesDate) continue;
			const endRes = resolveSlotTime(app.endsAt, dateIso);

			const sM = timeStringToMinutes(startRes.time);
			let eM = timeStringToMinutes(endRes.time);
			if (eM <= sM) eM += 1440;
			bookedAppointmentMinutes += Math.max(0, eM - sM);
		}

		const utilizationRatePercent =
			totalShiftMinutes > 0
				? Math.min(100, Math.round((bookedAppointmentMinutes / totalShiftMinutes) * 1000) / 10)
				: 0;

		return {
			cabinetId: chairInfo.cabinetId,
			cabinetName: chairInfo.cabinetName,
			chairId: chairInfo.chairId,
			chairName: chairInfo.chairName,
			dateIso,
			totalShiftMinutes,
			bookedAppointmentMinutes,
			utilizationRatePercent,
			heatLevel: computeHeatLevel(totalShiftMinutes, utilizationRatePercent),
		};
	});
}
