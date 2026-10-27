import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { db } from "../../../../db/client.js";
import { sterilizerEquipments } from "../../../../db/schema.js";
import { createSterilizerEquipmentDtoSchema } from "../sterilizationSchemas.js";

export async function handleCreateSterilizerEquipment(
	req: FastifyRequest,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sterilizer equipment create",
	);
	if (!organizationId) return;

	const parsed = createSterilizerEquipmentDtoSchema.safeParse(req.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: parsed.error.issues[0]?.message ?? "Некорректные параметры аппарата.",
		});
	}
	const data = parsed.data;

	const [created] = await db
		.insert(sterilizerEquipments)
		.values({
			organizationId,
			name: data.name,
			brandModel: data.brandModel,
			serialNumber: data.serialNumber,
			inventoryNumber: data.inventoryNumber ?? null,
			deviceType: data.deviceType,
			deviceClass: data.deviceClass,
			chamberVolumeLiters: String(data.chamberVolumeLiters),
			locationRoom: data.locationRoom,
			verificationExpiryDate: data.verificationExpiryDate ?? null,
			lastMaintenanceDate: data.lastMaintenanceDate ?? null,
			nextMaintenanceDate: data.nextMaintenanceDate ?? null,
			commissioningDate: data.commissioningDate ?? new Date().toISOString().slice(0, 10),
			status: data.status ?? "active",
			isCommissioned: data.status !== "decommissioned",
			notes: data.notes ?? null,
		})
		.returning();

	if (!created) {
		return reply.code(500).send({
			error: "InternalError",
			message: "Не удалось сохранить оборудование стерилизации.",
		});
	}

	return reply.code(201).send({
		...created,
		chamberVolumeLiters: Number(created.chamberVolumeLiters),
	});
}
