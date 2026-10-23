import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationAccess, resolveOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";

export async function handleDiarySyncProgressPost(req: FastifyRequest, reply: FastifyReply): Promise<void> {
	if (!(await requireClinicalMutationAccess(req, reply, "sync progress"))) return;

	const { patientId } = req.body as { patientId?: string };
	const orgId = await resolveOrganizationId(req);
	if (orgId && patientId) {
		const { treatmentPlans, patients } = await import("../../../db/schema.js");
		await db
			.select()
			.from(treatmentPlans)
			.innerJoin(patients, eq(treatmentPlans.patientId, patients.id))
			.where(and(eq(treatmentPlans.patientId, patientId), eq(patients.organizationId, orgId)));
	}

	return reply.send({ success: true });
}
