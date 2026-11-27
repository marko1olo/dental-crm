import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { withTenantReadCtx } from "../../../../db/rls.js";
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

	const list = await withTenantReadCtx(organizationId, (tx) =>
		tx
			.select()
			.from(bactericidalEquipments)
			.where(eq(bactericidalEquipments.organizationId, organizationId))
			.orderBy(bactericidalEquipments.roomName),
	);

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
