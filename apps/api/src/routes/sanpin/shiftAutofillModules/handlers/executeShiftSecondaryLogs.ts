import { and, eq } from "drizzle-orm";
import type { TenantDb } from "../../../../db/rls.js";
import {
	bactericidalEquipments,
	bactericidalIrradiatorLogs,
	medicalWasteLogs,
	temperatureHumidityEquipments,
	temperatureHumidityLogs,
} from "../../../../db/schema.js";
import {
	getDefaultBactericidalEquipments,
	getDefaultTemperatureHumidityEquipments,
} from "../shiftAutofillCalculators.js";

export async function executeShiftBactericidalAndClimateLogs(
	tx: TenantDb,
	organizationId: string,
	todayStr: string,
	operatorId: string | null,
) {
	let activeEquips = await tx
		.select()
		.from(bactericidalEquipments)
		.where(and(eq(bactericidalEquipments.organizationId, organizationId), eq(bactericidalEquipments.isCommissioned, true)));

	if (activeEquips.length === 0) {
		activeEquips = await tx.insert(bactericidalEquipments).values(getDefaultBactericidalEquipments(organizationId)).returning();
	}
	if (activeEquips.length > 0) {
		const sessStart = new Date(); sessStart.setHours(8, 0, 0, 0);
		const sessEnd = new Date(); sessEnd.setHours(8, 30, 0, 0);
		const bactLogsToInsert = activeEquips.map((bactEquip) => {
			const currentHours = Number(bactEquip.totalOperatingHours || 0);
			const nextHours = (currentHours + 0.5).toFixed(2);
			return {
				organizationId,
				equipmentId: bactEquip.id,
				date: todayStr,
				sessionStartTime: sessStart,
				sessionEndTime: sessEnd,
				durationMinutes: 30,
				operatingMode: "continuous_presence" as const,
				cumulativeHoursAfterSession: nextHours,
				operatorId,
				notes: "⚡ 1-Клик автопилот смены: предсменная дезинфекция воздуха",
			};
		});
		await tx.insert(bactericidalIrradiatorLogs).values(bactLogsToInsert);
		for (const bactEquip of activeEquips) {
			const currentHours = Number(bactEquip.totalOperatingHours || 0);
			const nextHours = (currentHours + 0.5).toFixed(2);
			await tx
				.update(bactericidalEquipments)
				.set({ totalOperatingHours: nextHours, updatedAt: new Date() })
				.where(and(eq(bactericidalEquipments.id, bactEquip.id), eq(bactericidalEquipments.organizationId, organizationId)));
		}
	}

	let tempEquips = await tx.select().from(temperatureHumidityEquipments).where(eq(temperatureHumidityEquipments.organizationId, organizationId));
	if (tempEquips.length === 0) {
		tempEquips = await tx.insert(temperatureHumidityEquipments).values(getDefaultTemperatureHumidityEquipments(organizationId)).returning();
	}
	if (tempEquips.length > 0) {
		await tx.insert(temperatureHumidityLogs).values(
			tempEquips.map((te) => ({
				organizationId,
				equipmentId: te.id,
				measurementDate: todayStr,
				measurementPeriod: "morning" as const,
				temperatureCelsius: te.equipmentType.includes("refrigerator") ? "4.2" : "21.5",
				relativeHumidityPercent: te.equipmentType.includes("refrigerator") ? null : "48",
				isWithinNorm: true,
				deviationReason: null,
				operatorId,
				notes: "⚡ 1-Клик автопилот смены: норма СанПиН 3.3686-21",
			})),
		);
	}

	await tx.insert(medicalWasteLogs).values({
		organizationId,
		operationType: "accumulation",
		wasteClass: "class_B",
		wasteDescription: "Отработанные расходные материалы (перчатки, маски, слюноотсосы)",
		packageType: "yellow_bag",
		packageCount: 2,
		weightKg: "1.850",
		disinfectionMethod: "chemical_soaking",
		disinfectantUsed: "Оптимакс Про 1.5%",
		disposalCompany: "ООО «ЭкоМедСервис»",
		transferActNumber: `АКТ-Б-${todayStr.replace(/-/g, "")}`,
		responsibleStaffId: operatorId,
		notes: "⚡ 1-Клик автопилот смены: сбор и обеззараживание отходов класса Б",
	});
}
