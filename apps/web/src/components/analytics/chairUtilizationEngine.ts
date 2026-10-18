import { calculateSingleChairMetrics } from "./chairEngineModules/calculateSingleChairMetrics";
import { DEFAULT_CLINIC_CHAIRS } from "./chairEngineModules/chairUtilizationDefaults";
import type {
	ChairDefinition,
	ClinicChairUtilizationSummary,
	RawAppointmentItem,
	SingleChairUtilizationMetrics,
} from "./chairEngineModules/chairUtilizationTypes";

export * from "./chairEngineModules/calculateSingleChairMetrics";
export * from "./chairEngineModules/chairUtilizationDefaults";
export * from "./chairEngineModules/chairUtilizationTypes";

export function calculateClinicChairUtilization(params: {
	readonly appointments: readonly RawAppointmentItem[];
	readonly chairsConfig?: readonly ChairDefinition[];
	readonly daysCount?: number;
	readonly periodLabel?: string;
}): ClinicChairUtilizationSummary {
	const {
		appointments,
		chairsConfig = DEFAULT_CLINIC_CHAIRS,
		daysCount = 1,
		periodLabel = "Текущий период",
	} = params;

	const safeDays = Math.max(1, Math.round(daysCount));
	const appointmentsByChair = new Map<string, RawAppointmentItem[]>();

	for (const appt of appointments) {
		let chairId = appt.chairId || "";
		if (!chairId) {
			const found = chairsConfig.find(
				(c) => c.name.toLowerCase() === (appt.chairName || "").toLowerCase(),
			);
			chairId = found ? found.id : chairsConfig[0]?.id || "chair-1";
		}
		const list = appointmentsByChair.get(chairId) || [];
		list.push(appt);
		appointmentsByChair.set(chairId, list);
	}

	const chairMetricsList: SingleChairUtilizationMetrics[] = [];
	let totalOccupiedMin = 0;
	let totalSanitationMin = 0;
	let totalAvailableMin = 0;
	let totalRevenueKop = 0;

	for (const ch of chairsConfig) {
		const appts = appointmentsByChair.get(ch.id) || [];
		const m = calculateSingleChairMetrics(ch, appts, safeDays);
		chairMetricsList.push(m);

		totalOccupiedMin += m.occupiedMinutes;
		totalSanitationMin += m.sanitationMinutes;
		totalAvailableMin += m.availableMinutes;
		totalRevenueKop += m.totalRevenueKopecks;
	}

	const totalEffectiveOccupiedMinutes = Math.min(
		totalAvailableMin,
		totalOccupiedMin + totalSanitationMin,
	);
	const totalIdleMinutes = Math.max(0, totalAvailableMin - totalEffectiveOccupiedMinutes);

	const overallUtilizationPercent =
		totalAvailableMin > 0
			? Math.min(100, Number(((totalEffectiveOccupiedMinutes / totalAvailableMin) * 100).toFixed(1)))
			: 0;

	const overallPureOccupancyPercent =
		totalAvailableMin > 0
			? Math.min(100, Number(((totalOccupiedMin / totalAvailableMin) * 100).toFixed(1)))
			: 0;

	const activeChairsCount = chairsConfig.length;
	const averageRevenuePerChairKopecks =
		activeChairsCount > 0 ? Math.round(totalRevenueKop / activeChairsCount) : 0;
	const totalAvailableHours = totalAvailableMin / 60;
	const averageHourlyYieldKopecks =
		totalAvailableHours > 0 ? Math.round(totalRevenueKop / totalAvailableHours) : 0;

	return {
		periodLabel,
		daysCount: safeDays,
		totalChairsCount: activeChairsCount,
		chairs: chairMetricsList,
		totalOccupiedMinutes: totalOccupiedMin,
		totalSanitationMinutes: totalSanitationMin,
		totalEffectiveOccupiedMinutes,
		totalAvailableMinutes: totalAvailableMin,
		totalIdleMinutes,
		overallUtilizationPercent,
		overallPureOccupancyPercent,
		totalRevenueKopecks: totalRevenueKop,
		averageRevenuePerChairKopecks,
		averageHourlyYieldKopecks,
		isEmpty: appointments.length === 0,
	};
}
