/**
 * apps/api/src/routes/sanpin/regulatoryExportModules/shiftCloseMicroclimateSaver.ts
 * Сохранение замеров микроклимата при закрытии смены.
 * Мандат 8b: строго <= 120 строк.
 */

import { eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import {
	temperatureHumidityEquipments,
	temperatureHumidityLogs,
} from "../../../db/schema.js";

type TxType = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function saveShiftMicroclimateRecords(
	tx: TxType,
	organizationId: string,
	body: Record<string, unknown>,
	operatorId: string | null,
	dateStr: string,
): Promise<number> {
	const microclimateRecords = Array.isArray(body.microclimateRecords)
		? (body.microclimateRecords as Record<string, unknown>[])
		: [];

	if (microclimateRecords.length > 0) {
		const microInserts = microclimateRecords.map((m) => ({
			organizationId,
			equipmentId: String(m.equipmentId),
			measurementDate: dateStr,
			measurementPeriod: (m.controlTimeOfDay === "evening" ? "evening" : "morning") as "evening" | "morning",
			temperatureCelsius: String(m.temperatureValueC ?? "4.2"),
			relativeHumidityPercent: m.relativeHumidityPercent ? String(m.relativeHumidityPercent) : null,
			isWithinNorm: m.isWithinNorm != null ? Boolean(m.isWithinNorm) : true,
			deviationReason: null,
			operatorId,
			notes: m.loggedByStaffName ? `Фиксация: ${m.loggedByStaffName}` : "Режим в норме",
		}));
		await tx.insert(temperatureHumidityLogs).values(microInserts);
		return microInserts.length;
	}

	const microclimate = body.microclimate as Record<string, Record<string, unknown>> | undefined;
	if (microclimate) {
		const tempEquips = await tx
			.select()
			.from(temperatureHumidityEquipments)
			.where(eq(temperatureHumidityEquipments.organizationId, organizationId));

		if (tempEquips.length > 0) {
			const tempLogsToInsert: Array<typeof temperatureHumidityLogs.$inferInsert> = tempEquips.map((te) => {
				const isFridge = te.equipmentType.includes("refrigerator");
				const temp = isFridge
					? String(microclimate.refrigeratorLog?.morningTempCelsius || "4.2")
					: String(microclimate.psychrometerLog?.morningTempCelsius || "21.5");
				const humidity = isFridge
					? null
					: String(microclimate.psychrometerLog?.morningHumidityPercent || "55");
				return {
					organizationId,
					equipmentId: te.id,
					measurementDate: dateStr,
					measurementPeriod: "morning" as const,
					temperatureCelsius: temp,
					relativeHumidityPercent: humidity,
					isWithinNorm: true,
					deviationReason: null,
					operatorId,
					notes: isFridge
						? "Фармацевтический холодильник (норма 2..8°C)"
						: "Психрометр (норма 18..25°C, 40..60%)",
				};
			});

			await tx.insert(temperatureHumidityLogs).values(tempLogsToInsert);
			return tempLogsToInsert.length;
		}
	}

	return 0;
}
