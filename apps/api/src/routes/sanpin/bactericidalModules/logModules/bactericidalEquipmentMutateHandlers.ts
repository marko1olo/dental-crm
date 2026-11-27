import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { withTenantWriteCtx } from "../../../../db/rls.js";
import { bactericidalEquipments } from "../../../../db/schema.js";
import {
	createBactericidalEquipmentDtoSchema,
	updateBactericidalEquipmentBodySchema,
} from "../bactericidalSchemas.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

	const [created] = await withTenantWriteCtx(organizationId, async (tx) =>
		tx
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
			.returning(),
	);

	return reply.code(201).send(created);
}

export async function handleUpdateBactericidalEquipment(
	req: FastifyRequest,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"bactericidal equipment update",
	);
	if (!organizationId) return;

	const rawId =
		typeof req.params === "object" && req.params !== null && "id" in req.params
			? req.params.id
			: undefined;
	const id = typeof rawId === "string" ? rawId : "";
	if (!UUID_PATTERN.test(id)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор оборудования (ожидается формат UUID).",
		});
	}

	const parsedBody = updateBactericidalEquipmentBodySchema.safeParse(req.body ?? {});
	if (!parsedBody.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: parsedBody.error.issues[0]?.message ?? "Некорректные параметры обновления оборудования.",
		});
	}
	const body = parsedBody.data;

	if (body.action === "replace_lamps") {
		const today = new Date().toISOString().slice(0, 10);
		const [updated] = await withTenantWriteCtx(organizationId, async (tx) =>
			tx
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
				.returning(),
		);

		if (!updated) {
			return reply.code(404).send({
				error: "EquipmentNotFound",
				message: "Бактерицидное оборудование не найдено.",
			});
		}
		return reply.send(updated);
	}

	const [updated] = await withTenantWriteCtx(organizationId, async (tx) =>
		tx
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
			.returning(),
	);

	if (!updated) {
		return reply.code(404).send({
			error: "EquipmentNotFound",
			message: "Бактерицидное оборудование не найдено.",
		});
	}
	return reply.send(updated);
}

export async function handleDeleteBactericidalEquipment(
	req: FastifyRequest,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"bactericidal equipment delete",
	);
	if (!organizationId) return;

	const rawId =
		typeof req.params === "object" && req.params !== null && "id" in req.params
			? req.params.id
			: undefined;
	const id = typeof rawId === "string" ? rawId : "";
	if (!UUID_PATTERN.test(id)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор оборудования (ожидается формат UUID).",
		});
	}

	const [deleted] = await withTenantWriteCtx(organizationId, async (tx) =>
		tx
			.update(bactericidalEquipments)
			.set({
				status: "decommissioned",
				isCommissioned: false,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(bactericidalEquipments.id, id),
					eq(bactericidalEquipments.organizationId, organizationId),
				),
			)
			.returning({ id: bactericidalEquipments.id }),
	);

	if (!deleted) {
		return reply.code(404).send({
			error: "EquipmentNotFound",
			message: "Бактерицидное оборудование не найдено.",
		});
	}
	return { success: true, id: deleted.id, status: "decommissioned" };
}
