import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { db } from "../../../../db/client.js";
import { sterilizerEquipments } from "../../../../db/schema.js";

export async function handleDeleteSterilizerEquipment(
	req: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sterilizer equipment delete",
	);
	if (!organizationId) return;

	const { id } = req.params;
	await db
		.delete(sterilizerEquipments)
		.where(
			and(
				eq(sterilizerEquipments.id, id),
				eq(sterilizerEquipments.organizationId, organizationId),
			),
		);
	return { success: true, id };
}
