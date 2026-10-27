import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { db } from "../../../../db/client.js";
import { bactericidalEquipments } from "../../../../db/schema.js";
import { calculateBactericidalLampResource } from "../bactericidalHoursCalculator.js";

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
