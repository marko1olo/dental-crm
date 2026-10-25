/**
 * apps/api/src/routes/sanpin/temperatureModules/temperatureLogHandlers.ts
 * Обработчики записей журнала температуры и влажности.
 * Мандат 8b: строго <= 120 строк.
 */

import {
	SanPiNRegulatoryEngine,
	createTemperatureHumidityLogDtoSchema,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import {
	temperatureHumidityEquipments,
	temperatureHumidityLogs,
	users,
} from "../../../db/schema.js";
import { wsBroker } from "../../../services/websocketBroker.js";

export async function handleGetTemperatureLogs(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"temperature logs read",
	);
	if (!organizationId) return;

	const logs = await db
		.select({
			id: temperatureHumidityLogs.id,
			organizationId: temperatureHumidityLogs.organizationId,
			equipmentId: temperatureHumidityLogs.equipmentId,
			equipmentName: temperatureHumidityEquipments.name,
			equipmentType: temperatureHumidityEquipments.equipmentType,
			location: temperatureHumidityEquipments.location,
			targetTempMin: temperatureHumidityEquipments.targetTempMinCelsius,
			targetTempMax: temperatureHumidityEquipments.targetTempMaxCelsius,
			measurementDate: temperatureHumidityLogs.measurementDate,
			measurementPeriod: temperatureHumidityLogs.measurementPeriod,
			temperatureCelsius: temperatureHumidityLogs.temperatureCelsius,
			relativeHumidityPercent: temperatureHumidityLogs.relativeHumidityPercent,
			isWithinNorm: temperatureHumidityLogs.isWithinNorm,
			deviationReason: temperatureHumidityLogs.deviationReason,
			correctiveAction: temperatureHumidityLogs.correctiveAction,
			operatorId: temperatureHumidityLogs.operatorId,
			operatorName: users.fullName,
			notes: temperatureHumidityLogs.notes,
			createdAt: temperatureHumidityLogs.createdAt,
		})
		.from(temperatureHumidityLogs)
		.innerJoin(
			temperatureHumidityEquipments,
			eq(temperatureHumidityEquipments.id, temperatureHumidityLogs.equipmentId),
		)
		.leftJoin(users, eq(users.id, temperatureHumidityLogs.operatorId))
		.where(eq(temperatureHumidityLogs.organizationId, organizationId))
		.orderBy(desc(temperatureHumidityLogs.measurementDate), desc(temperatureHumidityLogs.createdAt));

	return logs.map((l) => ({
		...l,
		temperatureCelsius: Number(l.temperatureCelsius),
		relativeHumidityPercent: l.relativeHumidityPercent ? Number(l.relativeHumidityPercent) : null,
		targetTempMin: Number(l.targetTempMin),
		targetTempMax: Number(l.targetTempMax),
	}));
}

export async function handlePostTemperatureLog(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"temperature log create",
	);
	if (!organizationId) return;

	const parsed = createTemperatureHumidityLogDtoSchema.safeParse(req.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: parsed.error.issues[0]?.message ?? "Некорректные данные замера температуры/влажности.",
		});
	}
	const data = parsed.data;

	const [equipment] = await db
		.select()
		.from(temperatureHumidityEquipments)
		.where(
			and(
				eq(temperatureHumidityEquipments.id, data.equipmentId),
				eq(temperatureHumidityEquipments.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!equipment) {
		return reply.code(404).send({ error: "NotFound", message: "Оборудование не найдено." });
	}

	const evalResult = SanPiNRegulatoryEngine.evaluateTemperatureHumidity({
		equipmentType: equipment.equipmentType as any,
		targetTempMin: Number(equipment.targetTempMinCelsius),
		targetTempMax: Number(equipment.targetTempMaxCelsius),
		actualTemp: data.temperatureCelsius,
		targetHumidityMin: equipment.targetHumidityMinPercent ? Number(equipment.targetHumidityMinPercent) : null,
		targetHumidityMax: equipment.targetHumidityMaxPercent ? Number(equipment.targetHumidityMaxPercent) : null,
		actualHumidity: data.relativeHumidityPercent ?? null,
	});

	const [log] = await db
		.insert(temperatureHumidityLogs)
		.values({
			organizationId,
			equipmentId: data.equipmentId,
			measurementDate: data.measurementDate,
			measurementPeriod: data.measurementPeriod,
			temperatureCelsius: String(data.temperatureCelsius),
			relativeHumidityPercent: data.relativeHumidityPercent ? String(data.relativeHumidityPercent) : null,
			isWithinNorm: evalResult.isWithinNorm,
			deviationReason: data.deviationReason || evalResult.deviationMessage,
			correctiveAction: data.correctiveAction ?? null,
			operatorId: data.operatorId ?? null,
			notes: data.notes ?? null,
		})
		.returning();

	wsBroker.broadcastToOrganization(organizationId, {
		type: "SANPIN_TEMPERATURE_LOG_ADDED",
		payload: { log, evalResult },
	});

	return reply.code(201).send({ success: true, log, evalResult });
}
