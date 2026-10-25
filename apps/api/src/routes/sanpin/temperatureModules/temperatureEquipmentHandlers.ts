/**
 * apps/api/src/routes/sanpin/temperatureModules/temperatureEquipmentHandlers.ts
 * Обработчики оборудования контроля температуры и влажности.
 * Мандат 8b: строго <= 120 строк.
 */

import { createTemperatureHumidityEquipmentDtoSchema } from "@dental/shared";
import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { temperatureHumidityEquipments } from "../../../db/schema.js";

export async function handleGetTemperatureEquipments(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"temperature equipments read",
	);
	if (!organizationId) return;

	const list = await db
		.select()
		.from(temperatureHumidityEquipments)
		.where(eq(temperatureHumidityEquipments.organizationId, organizationId))
		.orderBy(temperatureHumidityEquipments.name);

	return list.map((e) => ({
		...e,
		targetTempMinCelsius: Number(e.targetTempMinCelsius),
		targetTempMaxCelsius: Number(e.targetTempMaxCelsius),
		targetHumidityMinPercent: e.targetHumidityMinPercent ? Number(e.targetHumidityMinPercent) : null,
		targetHumidityMaxPercent: e.targetHumidityMaxPercent ? Number(e.targetHumidityMaxPercent) : null,
	}));
}

export async function handlePostTemperatureEquipment(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"temperature equipment create",
	);
	if (!organizationId) return;

	const parsed = createTemperatureHumidityEquipmentDtoSchema.safeParse(req.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: parsed.error.issues[0]?.message ?? "Некорректные параметры объекта контроля.",
		});
	}
	const data = parsed.data;

	const [created] = await db
		.insert(temperatureHumidityEquipments)
		.values({
			organizationId,
			equipmentType: data.equipmentType,
			name: data.name,
			location: data.location,
			meterDeviceName: data.meterDeviceName,
			meterSerialNumber: data.meterSerialNumber ?? null,
			verificationExpiryDate: data.verificationExpiryDate ?? null,
			targetTempMinCelsius: String(data.targetTempMinCelsius),
			targetTempMaxCelsius: String(data.targetTempMaxCelsius),
			targetHumidityMinPercent: data.targetHumidityMinPercent ? String(data.targetHumidityMinPercent) : null,
			targetHumidityMaxPercent: data.targetHumidityMaxPercent ? String(data.targetHumidityMaxPercent) : null,
			isActive: data.isActive ?? true,
		})
		.returning();

	return reply.code(201).send(created);
}
