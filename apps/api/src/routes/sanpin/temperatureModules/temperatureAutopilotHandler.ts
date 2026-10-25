/**
 * apps/api/src/routes/sanpin/temperatureModules/temperatureAutopilotHandler.ts
 * 1-клик фиксация нормы температуры и влажности за смену.
 * Мандат 8b: строго <= 120 строк.
 */

import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import {
	temperatureHumidityEquipments,
	temperatureHumidityLogs,
} from "../../../db/schema.js";
import { wsBroker } from "../../../services/websocketBroker.js";

async function ensureDefaultEquipments(organizationId: string) {
	let equips = await db
		.select()
		.from(temperatureHumidityEquipments)
		.where(eq(temperatureHumidityEquipments.organizationId, organizationId));

	if (equips.length === 0) {
		const [fridge] = await db
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

		const [room] = await db
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

		equips = [fridge, room].filter(Boolean) as typeof equips;
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

	const body = (req.body as Record<string, any>) || {};
	const measurementDate = body.date || new Date().toISOString().slice(0, 10);
	const measurementPeriod: "morning" | "evening" = body.period === "evening" ? "evening" : "morning";

	const equips = await ensureDefaultEquipments(organizationId);
	const createdLogs: any[] = [];

	if (equips.length > 0) {
		const logsToInsert = equips.map((tEquip) => {
			const isFridge = tEquip.equipmentType.includes("refrigerator");
			return {
				organizationId,
				equipmentId: tEquip.id,
				measurementDate,
				measurementPeriod,
				temperatureCelsius: String(isFridge ? 4.2 : 21.5),
				relativeHumidityPercent: isFridge ? null : String(48),
				isWithinNorm: true,
				deviationReason: null,
				operatorId: (req as any).user?.id || null,
				notes: `⚡ 1-Клик норма смены (${measurementPeriod === "morning" ? "утро" : "вечер"}): санитарные нормы`,
			};
		});

		const inserted = await db.insert(temperatureHumidityLogs).values(logsToInsert).returning();
		createdLogs.push(...inserted);
	}

	wsBroker.broadcastToOrganization(organizationId, {
		type: "SANPIN_TEMPERATURE_SHIFT_AUTOPILOT",
		payload: { count: createdLogs.length, measurementDate, measurementPeriod },
	});

	return reply.send({ success: true, count: createdLogs.length, logs: createdLogs });
}
