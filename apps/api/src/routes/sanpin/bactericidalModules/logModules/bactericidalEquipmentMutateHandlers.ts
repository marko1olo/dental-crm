import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { db } from "../../../../db/client.js";
import { bactericidalEquipments } from "../../../../db/schema.js";
import {
	createBactericidalEquipmentDtoSchema,
	type UpdateBactericidalEquipmentBody,
} from "../bactericidalSchemas.js";

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
