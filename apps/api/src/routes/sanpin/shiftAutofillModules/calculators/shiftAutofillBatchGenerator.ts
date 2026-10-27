import { generateDailySterilAndPsoRows } from "./shiftAutofillSterilAndPsoBatch.js";

export function generateMonthBatchRows(params: {
	workingDates: string[];
	organizationId: string;
	activeEquips: any[];
	tempEquips: any[];
	operatorId: string | null;
}) {
	const { workingDates, organizationId, activeEquips, tempEquips, operatorId } = params;

	const allSterilRows: any[] = [];
	const allPsoRows: any[] = [];
	const allBactLogs: any[] = [];
	const allTempLogs: any[] = [];
	const allWasteLogs: any[] = [];

	for (const dateStr of workingDates) {
		const { sterilRows, psoRows } = generateDailySterilAndPsoRows(dateStr, organizationId, operatorId);
		allSterilRows.push(...sterilRows);
		allPsoRows.push(...psoRows);

		const sessStart = new Date(`${dateStr}T08:00:00Z`);
		const sessEnd = new Date(`${dateStr}T08:30:00Z`);
		for (const eq of activeEquips) {
			allBactLogs.push({
				organizationId,
				equipmentId: eq.id,
				date: dateStr,
				sessionStartTime: sessStart,
				sessionEndTime: sessEnd,
				durationMinutes: 30,
				operatingMode: "continuous_presence" as const,
				cumulativeHoursAfterSession: (Number(eq.totalOperatingHours || 0) + 0.5).toFixed(2),
				operatorId,
				notes: "⚡ 1-Клик автопилот месяца: предсменная дезинфекция воздуха",
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
				notes: "⚡ 1-Клик автопилот месяца: норма СанПиН 3.3686-21",
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
			notes: "⚡ 1-Клик автопилот месяца: сбор и обеззараживание отходов класса Б",
		});
	}

	return { allSterilRows, allPsoRows, allBactLogs, allTempLogs, allWasteLogs };
}
