import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { patientToothDefects } from "../../db/schema.js";
import { deleteDefectParamsSchema, deleteDefectQuerySchema } from "./outpatientTypes.js";

export async function deletePatientToothDefectHandler(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;

	const paramsParsed = deleteDefectParamsSchema.safeParse(request.params);
	if (!paramsParsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры запроса",
			details: paramsParsed.error.issues,
		});
	}

	const queryParsed = deleteDefectQuerySchema.safeParse(request.query);
	const resolveOnly =
		queryParsed.success &&
		(queryParsed.data.resolveOnly === "true" || queryParsed.data.resolveOnly === "1");

	const [existing] = await db
		.select()
		.from(patientToothDefects)
		.where(
			and(
				eq(patientToothDefects.id, paramsParsed.data.id),
				eq(patientToothDefects.patientId, paramsParsed.data.patientId),
				eq(patientToothDefects.organizationId, orgId),
			),
		)
		.limit(1);

	if (!existing) {
		return reply.code(404).send({ error: "DefectNotFound", message: "Дефект не найден в карте пациента" });
	}

	if (resolveOnly) {
		const [updated] = await db
			.update(patientToothDefects)
			.set({ resolvedAt: new Date() })
			.where(and(eq(patientToothDefects.id, existing.id), eq(patientToothDefects.organizationId, orgId)))
			.returning();

		return reply.send({ success: true, action: "resolved", defect: updated });
	}

	await db
		.delete(patientToothDefects)
		.where(and(eq(patientToothDefects.id, existing.id), eq(patientToothDefects.organizationId, orgId)));

	return reply.send({ success: true, action: "deleted", id: existing.id });
}
