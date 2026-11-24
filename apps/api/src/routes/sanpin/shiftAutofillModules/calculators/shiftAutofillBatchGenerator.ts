import type {
	bactericidalEquipments,
	bactericidalIrradiatorLogs,
	medicalWasteLogs,
	preSterilizationCleaningLogs,
	sterilizationLogs,
	temperatureHumidityEquipments,
	temperatureHumidityLogs,
} from "../../../../db/schema.js";
import { generateDailySterilAndPsoRows } from "./shiftAutofillSterilAndPsoBatch.js";

export function generateMonthBatchRows(params: {
	workingDates: string[];
	organizationId: string;
	activeEquips: Array<typeof bactericidalEquipments.$inferSelect>;
	tempEquips: Array<typeof temperatureHumidityEquipments.$inferSelect>;
	operatorId: string | null;
}) {
	const { workingDates, organizationId, activeEquips, tempEquips, operatorId } = params;

	const allSterilRows: Array<typeof sterilizationLogs.$inferInsert> = [];
	const allPsoRows: Array<typeof preSterilizationCleaningLogs.$inferInsert> = [];
	const allBactLogs: Array<typeof bactericidalIrradiatorLogs.$inferInsert> = [];
	const allTempLogs: Array<typeof temperatureHumidityLogs.$inferInsert> = [];
	const allWasteLogs: Array<typeof medicalWasteLogs.$inferInsert> = [];

	const cumulativeHoursByEquip = new Map<string, number>();
	for (const eq of activeEquips) {
		cumulativeHoursByEquip.set(eq.id, Number(eq.totalOperatingHours || 0));
	}

	for (const dateStr of workingDates) {
		const { sterilRows, psoRows } = generateDailySterilAndPsoRows(dateStr, organizationId, operatorId);
		allSterilRows.push(...sterilRows);
		allPsoRows.push(...psoRows);

		const sessStart = new Date(`${dateStr}T08:00:00Z`);
		const sessEnd = new Date(`${dateStr}T08:30:00Z`);
		for (const eq of activeEquips) {
			const nextCumulative = (cumulativeHoursByEquip.get(eq.id) ?? 0) + 0.5;
			cumulativeHoursByEquip.set(eq.id, nextCumulative);
			allBactLogs.push({
				organizationId,
				equipmentId: eq.id,
				date: dateStr,
				sessionStartTime: sessStart,
				sessionEndTime: sessEnd,
				durationMinutes: 30,
				operatingMode: "continuous_presence" as const,
				cumulativeHoursAfterSession: nextCumulative.toFixed(2),
				operatorId,
				notes: "Автопилот месяца: предсменная дезинфекция воздуха",
			});
		}

		for (const te of tempEquips) {
			const isFridge = te.equipmentType.includes("refrigerator");
			allTempLogs.push({
				organizationId,
				equipmentId: te.id,
				measurementDate: dateStr,
				measurementPeriod: "morning" as const,
				temperatureCelsius: isFridge ? "4.2" : "21.5",
				relativeHumidityPercent: isFridge ? null : "48",
				isWithinNorm: true,
				deviationReason: null,
				operatorId,
				notes: "Автопилот месяца: норма микроклимата",
			});
		}

		allWasteLogs.push({
			organizationId,
			operationType: "accumulation",
			wasteClass: "class_B",
			wasteDescription: "Отработанные расходные материалы (перчатки, маски, слюноотсосы)",
			packageType: "yellow_bag",
			packageCount: 1,
			weightKg: "1.200",
			disinfectionMethod: "chemical_soaking",
			disinfectantUsed: "Оптимакс Про 1.5%",
			transferActNumber: `АКТ-М-${dateStr.replace(/-/g, "")}`,
			responsibleStaffId: operatorId,
			notes: "Автопилот месяца: сбор и обеззараживание отходов класса Б",
		});
	}

	return { allSterilRows, allPsoRows, allBactLogs, allTempLogs, allWasteLogs };
}
