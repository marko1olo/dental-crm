import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { withTenantWriteCtx } from "../../../../db/rls.js";
import { sterilizerEquipments } from "../../../../db/schema.js";

export async function handleDeleteSterilizerEquipment(
	req: FastifyRequest,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sterilizer equipment delete",
	);
	if (!organizationId) return;

	const rawId =
		typeof req.params === "object" && req.params !== null && "id" in req.params
			? req.params.id
			: undefined;
	const idParsed = z.string().uuid().safeParse(rawId);
	if (!idParsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор оборудования (ожидается UUID).",
		});
	}
	const id = idParsed.data;
	await withTenantWriteCtx(organizationId, async (tx) => {
		await tx
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
	});
	return { success: true, id, status: "decommissioned" };
}
