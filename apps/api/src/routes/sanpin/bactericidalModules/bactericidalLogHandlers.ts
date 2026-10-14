import { and, desc, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import {
	bactericidalEquipments,
	bactericidalIrradiatorLogs,
	users,
} from "../../../db/schema.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import {
	calculateBactericidalLampResource,
	calculateCumulativeOperatingHours,
	calculateSessionHours,
} from "./bactericidalHoursCalculator.js";
import {
	createBactericidalEquipmentDtoSchema,
	createBactericidalLogEntryDtoSchema,
	type UpdateBactericidalEquipmentBody,
} from "./bactericidalSchemas.js";

export async function handleGetBactericidalEquipments(
	req: FastifyRequest,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"bactericidal equipments read",
	);
	if (!organizationId) return;

	const list = await db
		.select()
		.from(bactericidalEquipments)
		.where(eq(bactericidalEquipments.organizationId, organizationId))
		.orderBy(bactericidalEquipments.roomName);

	return list.map((eqRow) => {
		const totalHours = Number(eqRow.totalOperatingHours);
		const maxHours = eqRow.maxLampHours;
		const lampLife = calculateBactericidalLampResource(totalHours, maxHours);

		return {
			...eqRow,
			roomVolumeM3: Number(eqRow.roomVolumeM3),
			roomAreaM2: eqRow.roomAreaM2 ? Number(eqRow.roomAreaM2) : null,
			totalOperatingHours: totalHours,
			remainingLampHours: lampLife.remainingHours,
			remainingLampPercent: lampLife.remainingPercent,
			lampStatus: lampLife.status,
			isLampCritical: lampLife.isCritical,
			lampWarningMessage: lampLife.warningMessage,
		};
	});
}

export async function handleCreateBactericidalEquipment(
	req: FastifyRequest,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"bactericidal equipment create",
	);
	if (!organizationId) return;

	const parsed = createBactericidalEquipmentDtoSchema.safeParse(req.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: parsed.error.issues[0]?.message ?? "Некорректные параметры оборудования.",
		});
	}
	const data = parsed.data;

	const [created] = await db
		.insert(bactericidalEquipments)
		.values({
			organizationId,
			roomName: data.roomName,
			roomVolumeM3: String(data.roomVolumeM3),
			roomAreaM2: data.roomAreaM2 ? String(data.roomAreaM2) : null,
			deviceBrand: data.deviceBrand,
			serialNumber: data.serialNumber,
			deviceType: data.deviceType,
			lampType: data.lampType,
			lampCount: data.lampCount,
			maxLampHours: data.maxLampHours,
			totalOperatingHours: String(data.totalOperatingHours || 0),
			lampStatus: "normal",
			lastLampReplacementDate: data.lastLampReplacementDate ?? null,
			isCommissioned: data.isCommissioned ?? true,
			notes: data.notes ?? null,
		})
		.returning();

	return reply.code(201).send(created);
}

export async function handleUpdateBactericidalEquipment(
	req: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"bactericidal equipment update",
	);
	if (!organizationId) return;

	const { id } = req.params;
	const body = (req.body as UpdateBactericidalEquipmentBody) || {};

	if (body.action === "replace_lamps") {
		const today = new Date().toISOString().slice(0, 10);
		const [updated] = await db
			.update(bactericidalEquipments)
			.set({
				totalOperatingHours: "0.00",
				lastLampReplacementDate: today,
				lampStatus: "normal",
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(bactericidalEquipments.id, id),
					eq(bactericidalEquipments.organizationId, organizationId),
				),
			)
			.returning();

		return updated;
	}

	const [updated] = await db
		.update(bactericidalEquipments)
		.set({
			...(body.roomName ? { roomName: body.roomName } : {}),
			...(body.roomVolumeM3 ? { roomVolumeM3: String(body.roomVolumeM3) } : {}),
			...(body.deviceBrand ? { deviceBrand: body.deviceBrand } : {}),
			...(body.serialNumber ? { serialNumber: body.serialNumber } : {}),
			...(body.maxLampHours ? { maxLampHours: body.maxLampHours } : {}),
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(bactericidalEquipments.id, id),
				eq(bactericidalEquipments.organizationId, organizationId),
			),
		)
		.returning();

	return updated;
}

export async function handleDeleteBactericidalEquipment(
	req: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"bactericidal equipment delete",
	);
	if (!organizationId) return;

	const { id } = req.params;
	await db
		.delete(bactericidalEquipments)
		.where(
			and(
				eq(bactericidalEquipments.id, id),
				eq(bactericidalEquipments.organizationId, organizationId),
			),
		);
	return { success: true, id };
}

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
		.where(
			and(
				eq(bactericidalEquipments.id, data.equipmentId),
				eq(bactericidalEquipments.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!equipment) {
		return reply.code(404).send({
			error: "NotFound",
			message: "Бактерицидный облучатель не найден в клинике.",
		});
	}

	const prevHours = Number(equipment.totalOperatingHours);
	const newTotalHours = calculateCumulativeOperatingHours(prevHours, data.durationMinutes);
	const lampLife = calculateBactericidalLampResource(newTotalHours, equipment.maxLampHours);

	// Combine date with time for start/end
	const startTime = new Date(
		`${data.date}T${data.sessionStartTime.length === 5 ? data.sessionStartTime + ":00" : data.sessionStartTime}`,
	);
	const endTime = new Date(
		`${data.date}T${data.sessionEndTime.length === 5 ? data.sessionEndTime + ":00" : data.sessionEndTime}`,
	);

	const [log] = await db.transaction(async (tx) => {
		// Update equipment operating hours and lamp status
		await tx
			.update(bactericidalEquipments)
			.set({
				totalOperatingHours: String(newTotalHours),
				lampStatus: lampLife.status,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(bactericidalEquipments.id, equipment.id),
					eq(bactericidalEquipments.organizationId, organizationId),
				),
			);

		const [inserted] = await tx
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

		return [inserted];
	});

	wsBroker.broadcastToOrganization(organizationId, {
		type: "SANPIN_BACTERICIDAL_LOG_ADDED",
		payload: { log, lampLife },
	});

	return reply.code(201).send({
		success: true,
		log,
		lampLife,
	});
}
