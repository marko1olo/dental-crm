import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
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

	const idParsed = z.string().uuid().safeParse(req.params?.id);
	if (!idParsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор оборудования (ожидается UUID).",
		});
	}
	const id = idParsed.data;
	await db
		.update(sterilizerEquipments)
		.set({
			status: "decommissioned",
			isCommissioned: false,
			decommissioningDate: new Date().toISOString().slice(0, 10),
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(sterilizerEquipments.id, id),
				eq(sterilizerEquipments.organizationId, organizationId),
			),
		);
	return { success: true, id, status: "decommissioned" };
}
