/**
 * apps/api/src/routes/sanpin/temperatureModules/temperatureAutopilotHandler.ts
 * Фиксация нормы температуры и влажности за смену.
 * Мандат 8b: строго <= 120 строк.
 */

import { resolveValidIanaTimeZone, todayDateKeyInTimeZone } from "@dental/shared";
import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantWriteCtx, type TenantDb } from "../../../db/rls.js";
import {
	temperatureHumidityEquipments,
	temperatureHumidityLogs,
} from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { clinicTimeZone } from "../../../services/reports/managerReports/timezone.js";
import { wsBroker } from "../../../services/websocketBroker.js";

async function ensureDefaultEquipments(tx: TenantDb, organizationId: string) {
	let equips = await tx
		.select()
		.from(temperatureHumidityEquipments)
		.where(eq(temperatureHumidityEquipments.organizationId, organizationId));

	if (equips.length === 0) {
		const [fridge] = await tx
			.insert(temperatureHumidityEquipments)
			.values({
				organizationId,
				name: "Фармацевтический холодильник Pozis ХФ-250 (№1)",
				equipmentType: "refrigerator_cold",
				location: "ЦСО / Процедурный кабинет",
				meterDeviceName: "Электронный термометр-гигрометр ТМЦ-1",
				meterSerialNumber: "SN-TM-2026-001",
				targetTempMinCelsius: "2.00",
				targetTempMaxCelsius: "8.00",
			})
			.returning();

		const [room] = await tx
			.insert(temperatureHumidityEquipments)
			.values({
				organizationId,
				name: "Кабинет терапевтической стоматологии №1",
				equipmentType: "room_ambient",
				location: "Основной лечебный блок",
				meterDeviceName: "Психрометрический гигрометр ВИТ-2",
				meterSerialNumber: "VIT2-4412",
				targetTempMinCelsius: "15.00",
				targetTempMaxCelsius: "25.00",
				targetHumidityMinPercent: "30.00",
				targetHumidityMaxPercent: "60.00",
			})
			.returning();

		equips = [fridge, room].filter((item): item is NonNullable<typeof item> => Boolean(item));
	}
	return equips;
}

export async function handlePostTemperatureShiftAutopilot(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"temperature shift autopilot",
	);
	if (!organizationId) return;

	const rawBody = req.body;
	const bodyRecord = typeof rawBody === "object" && rawBody !== null ? rawBody : null;
	const rawDate = bodyRecord && "date" in bodyRecord ? bodyRecord.date : undefined;
	const rawPeriod = bodyRecord && "period" in bodyRecord ? bodyRecord.period : undefined;
	const explicitDate = typeof rawDate === "string" && rawDate.length > 0 ? rawDate : null;
	const measurementPeriod: "morning" | "evening" = rawPeriod === "evening" ? "evening" : "morning";
	const operatorId = getRequestIdentity(req).userId ?? null;

	const { createdLogs, measurementDate } = await withTenantWriteCtx(organizationId, async (tx) => {
		const resolvedMeasurementDate =
			explicitDate ??
			todayDateKeyInTimeZone(resolveValidIanaTimeZone(await clinicTimeZone(organizationId, tx)));
		const equips = await ensureDefaultEquipments(tx, organizationId);
		if (equips.length === 0) return { createdLogs: [], measurementDate: resolvedMeasurementDate };

		const logsToInsert = equips.map((tEquip) => {
			const isFridge = tEquip.equipmentType.includes("refrigerator");
			return {
				organizationId,
				equipmentId: tEquip.id,
				measurementDate: resolvedMeasurementDate,
				measurementPeriod,
				temperatureCelsius: String(isFridge ? 4.2 : 21.5),
				relativeHumidityPercent: isFridge ? null : String(48),
				isWithinNorm: true,
				deviationReason: null,
				operatorId,
				notes: `Фиксация нормы смены (${measurementPeriod === "morning" ? "утро" : "вечер"}): санитарные нормы`,
			};
		});

		const inserted = await tx.insert(temperatureHumidityLogs).values(logsToInsert).returning();
		return { createdLogs: inserted, measurementDate: resolvedMeasurementDate };
	});

	wsBroker.broadcastToOrganization(organizationId, {
		type: "SANPIN_TEMPERATURE_SHIFT_AUTOPILOT",
		payload: { count: createdLogs.length, measurementDate, measurementPeriod },
	});

	return reply.send({ success: true, count: createdLogs.length, logs: createdLogs });
}
