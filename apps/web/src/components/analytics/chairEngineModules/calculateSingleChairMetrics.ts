import { getAppointmentDurationMinutes } from "./chairUtilizationDefaults";
import type {
	ChairDefinition,
	RawAppointmentItem,
	SingleChairUtilizationMetrics,
} from "./chairUtilizationTypes";

export function calculateSingleChairMetrics(
	ch: ChairDefinition,
	appts: readonly RawAppointmentItem[],
	safeDays: number,
): SingleChairUtilizationMetrics {
	const workingHours = ch.workingHoursPerDay || 12;
	const availableMinutes = safeDays * workingHours * 60;
	const sanPerVisit = ch.sanitationMinutesPerVisit || 15;

	let occupiedMinutes = 0;
	let completedCount = 0;
	let cancelledCount = 0;
	let noShowCount = 0;
	let chairRevKop = 0;

	for (const appt of appts) {
		const dur = getAppointmentDurationMinutes(appt.startsAt, appt.endsAt);
		const rev = Math.max(0, Math.round(appt.revenueKopecks || 0));

		if (appt.status === "cancelled") {
			cancelledCount += 1;
			continue;
		}
		if (appt.status === "no_show") {
			noShowCount += 1;
			continue;
		}

		occupiedMinutes += dur;
		chairRevKop += rev;

		if (appt.status === "completed") {
			completedCount += 1;
		}
	}

	const validVisitsCount = appts.length - cancelledCount - noShowCount;
	const sanitationMinutes = Math.max(0, validVisitsCount * sanPerVisit);
	const effectiveOccupiedMinutes = Math.min(
		availableMinutes,
		occupiedMinutes + sanitationMinutes,
	);
	const idleMinutes = Math.max(0, availableMinutes - effectiveOccupiedMinutes);

	const pureOccupancyPercent =
		availableMinutes > 0
			? Math.min(100, Number(((occupiedMinutes / availableMinutes) * 100).toFixed(1)))
			: 0;
	const effectiveUtilizationPercent =
		availableMinutes > 0
			? Math.min(100, Number(((effectiveOccupiedMinutes / availableMinutes) * 100).toFixed(1)))
			: 0;

	const occupiedHours = occupiedMinutes / 60;
	const availableHours = availableMinutes / 60;
	const revenuePerHourKopecks =
		occupiedHours > 0 ? Math.round(chairRevKop / occupiedHours) : 0;
	const capacityYieldPerHourKopecks =
		availableHours > 0 ? Math.round(chairRevKop / availableHours) : 0;

	const totalApptsCount = appts.length;
	const cancellationRatePercent =
		totalApptsCount > 0
			? Number((((cancelledCount + noShowCount) / totalApptsCount) * 100).toFixed(1))
			: 0;

	return {
		chairId: ch.id,
		chairName: ch.name,
		cabinet: ch.cabinet,
		totalAppointments: totalApptsCount,
		completedCount,
		cancelledCount,
		noShowCount,
		occupiedMinutes,
		sanitationMinutes,
		effectiveOccupiedMinutes,
		availableMinutes,
		idleMinutes,
		pureOccupancyPercent,
		effectiveUtilizationPercent,
		totalRevenueKopecks: chairRevKop,
		revenuePerHourKopecks,
		capacityYieldPerHourKopecks,
		cancellationRatePercent,
		isOverloaded: effectiveUtilizationPercent >= 90,
	};
}
