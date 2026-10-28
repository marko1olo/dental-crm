import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { db } from "../../../../db/client.js";
import { sterilizerEquipments } from "../../../../db/schema.js";
import { updateSterilizerEquipmentDtoSchema } from "../sterilizationSchemas.js";
import { executeEquipmentLifecycleAction } from "./updateSterilizerEquipmentActions.js";

export async function handleUpdateSterilizerEquipment(
	req: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sterilizer equipment update",
	);
	if (!organizationId) return;

	const { id } = req.params;
	const parsed = updateSterilizerEquipmentDtoSchema.safeParse(req.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: parsed.error.issues[0]?.message ?? "Некорректные параметры обновления.",
		});
	}
	const body = parsed.data;

	if (body.action) {
		const updated = await executeEquipmentLifecycleAction(id, organizationId, {
			action: body.action,
			...(body.notes !== undefined ? { notes: body.notes } : {}),
			...(body.decommissionReason !== undefined ? { decommissionReason: body.decommissionReason } : {}),
			...(body.decommissioningDate !== undefined ? { decommissioningDate: body.decommissioningDate } : {}),
		});
		if (!updated) {
			return reply.code(404).send({ error: "NotFound", message: "Аппарат не найден" });
		}
		return { ...updated, chamberVolumeLiters: Number(updated.chamberVolumeLiters) };
	}

	const [updated] = await db
		.update(sterilizerEquipments)
		.set({
			...(body.name ? { name: body.name } : {}),
			...(body.brandModel ? { brandModel: body.brandModel } : {}),
			...(body.serialNumber ? { serialNumber: body.serialNumber } : {}),
			...(body.inventoryNumber !== undefined ? { inventoryNumber: body.inventoryNumber } : {}),
			...(body.deviceType ? { deviceType: body.deviceType } : {}),
			...(body.deviceClass ? { deviceClass: body.deviceClass } : {}),
			...(body.chamberVolumeLiters ? { chamberVolumeLiters: String(body.chamberVolumeLiters) } : {}),
			...(body.locationRoom ? { locationRoom: body.locationRoom } : {}),
			...(body.verificationExpiryDate !== undefined ? { verificationExpiryDate: body.verificationExpiryDate } : {}),
			...(body.lastMaintenanceDate !== undefined ? { lastMaintenanceDate: body.lastMaintenanceDate } : {}),
			...(body.nextMaintenanceDate !== undefined ? { nextMaintenanceDate: body.nextMaintenanceDate } : {}),
			...(body.commissioningDate !== undefined ? { commissioningDate: body.commissioningDate } : {}),
			...(body.status ? { status: body.status, isCommissioned: body.status !== "decommissioned" } : {}),
			...(body.notes !== undefined ? { notes: body.notes } : {}),
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(sterilizerEquipments.id, id),
				eq(sterilizerEquipments.organizationId, organizationId),
			),
		)
		.returning();

	if (!updated) {
		return reply.code(404).send({ error: "NotFound", message: "Аппарат не найден" });
	}

	return { ...updated, chamberVolumeLiters: Number(updated.chamberVolumeLiters) };
}
