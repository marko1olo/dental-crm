import { desc, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { db } from "../../../../db/client.js";
import {
	bactericidalEquipments,
	bactericidalIrradiatorLogs,
	users,
} from "../../../../db/schema.js";
import {
	calculateBactericidalLampResource,
	calculateCumulativeOperatingHours,
	calculateSessionHours,
} from "../bactericidalHoursCalculator.js";
import { createBactericidalLogEntryDtoSchema } from "../bactericidalSchemas.js";

export async function handleGetBactericidalLogs(
	req: FastifyRequest,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"bactericidal logs read",
	);
	if (!organizationId) return;

	const logs = await db
		.select({
			id: bactericidalIrradiatorLogs.id,
			organizationId: bactericidalIrradiatorLogs.organizationId,
			equipmentId: bactericidalIrradiatorLogs.equipmentId,
			roomName: bactericidalEquipments.roomName,
			deviceBrand: bactericidalEquipments.deviceBrand,
			serialNumber: bactericidalEquipments.serialNumber,
			date: bactericidalIrradiatorLogs.date,
			sessionStartTime: bactericidalIrradiatorLogs.sessionStartTime,
			sessionEndTime: bactericidalIrradiatorLogs.sessionEndTime,
			durationMinutes: bactericidalIrradiatorLogs.durationMinutes,
			operatingMode: bactericidalIrradiatorLogs.operatingMode,
			cumulativeHoursAfterSession: bactericidalIrradiatorLogs.cumulativeHoursAfterSession,
			operatorId: bactericidalIrradiatorLogs.operatorId,
			operatorName: users.fullName,
			notes: bactericidalIrradiatorLogs.notes,
			createdAt: bactericidalIrradiatorLogs.createdAt,
		})
		.from(bactericidalIrradiatorLogs)
		.innerJoin(
			bactericidalEquipments,
			eq(bactericidalEquipments.id, bactericidalIrradiatorLogs.equipmentId),
		)
		.leftJoin(users, eq(users.id, bactericidalIrradiatorLogs.operatorId))
		.where(eq(bactericidalIrradiatorLogs.organizationId, organizationId))
		.orderBy(desc(bactericidalIrradiatorLogs.date), desc(bactericidalIrradiatorLogs.sessionStartTime));

	return logs.map((l) => ({
		...l,
		cumulativeHoursAfterSession: Number(l.cumulativeHoursAfterSession),
		durationHours: calculateSessionHours(l.durationMinutes),
	}));
}

export async function handleCreateBactericidalLog(
	req: FastifyRequest,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"bactericidal log create",
	);
	if (!organizationId) return;

	const parsed = createBactericidalLogEntryDtoSchema.safeParse(req.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: parsed.error.issues[0]?.message ?? "Некорректные параметры сеанса облучателя.",
		});
	}
	const data = parsed.data;

	const [equipment] = await db
		.select()
		.from(bactericidalEquipments)
		.where(eq(bactericidalEquipments.id, data.equipmentId))
		.limit(1);

	if (!equipment) {
		return reply.code(404).send({ error: "NotFound", message: "Бактерицидный облучатель не найден." });
	}

	const prevHours = Number(equipment.totalOperatingHours);
	const newTotalHours = calculateCumulativeOperatingHours(prevHours, data.durationMinutes);
	const lampLife = calculateBactericidalLampResource(newTotalHours, equipment.maxLampHours);

	const startTime = new Date(
		`${data.date}T${data.sessionStartTime.length === 5 ? data.sessionStartTime + ":00" : data.sessionStartTime}`,
	);
	const endTime = new Date(
		`${data.date}T${data.sessionEndTime.length === 5 ? data.sessionEndTime + ":00" : data.sessionEndTime}`,
	);

	const [log] = await db.transaction(async (tx) => {
		await tx
			.update(bactericidalEquipments)
			.set({ totalOperatingHours: String(newTotalHours), lampStatus: lampLife.status, updatedAt: new Date() })
			.where(eq(bactericidalEquipments.id, equipment.id));

		return tx
			.insert(bactericidalIrradiatorLogs)
			.values({
				organizationId,
				equipmentId: data.equipmentId,
				date: data.date,
				sessionStartTime: isNaN(startTime.getTime()) ? new Date() : startTime,
				sessionEndTime: isNaN(endTime.getTime()) ? new Date() : endTime,
				durationMinutes: data.durationMinutes,
				operatingMode: data.operatingMode,
				cumulativeHoursAfterSession: String(newTotalHours),
				operatorId: data.operatorId ?? null,
				notes: data.notes ?? null,
			})
			.returning();
	});

	return reply.code(201).send(log);
}
