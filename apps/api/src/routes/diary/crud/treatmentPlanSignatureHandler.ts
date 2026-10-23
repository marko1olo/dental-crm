import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess, resolveOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";

export async function handleTreatmentPlanSignaturePut(req: FastifyRequest, reply: FastifyReply): Promise<void> {
	if (!(await requireClinicalMutationAccess(req, reply, "sign plan"))) return;

	const paramsParsed = z
		.object({ planId: z.string().uuid("Идентификатор плана лечения должен быть корректным UUID") })
		.safeParse(req.params);
	if (!paramsParsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор плана лечения.",
			details: paramsParsed.error.issues,
		});
	}
	const { planId } = paramsParsed.data;

	const bodyParsed = z
		.object({ patientSignature: z.string().trim().min(1, "Подпись пациента обязательна") })
		.safeParse(req.body);
	if (!bodyParsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Подпись пациента обязательна для сохранения.",
			details: bodyParsed.error.issues,
		});
	}
	const { patientSignature } = bodyParsed.data;

	const orgId = await resolveOrganizationId(req);
	if (!orgId) {
		return reply.code(403).send({
			error: "OrgRequired",
			message: "Не удалось определить клинику. Войдите в кабинет клиники и повторите действие.",
		});
	}

	const { treatmentPlans, patients } = await import("../../../db/schema.js");
	const updateResult = await db.transaction(async (tx) => {
		const [plan] = await tx
			.select()
			.from(treatmentPlans)
			.where(and(eq(treatmentPlans.id, planId), eq(treatmentPlans.organizationId, orgId)))
			.for("update")
			.limit(1);
		if (!plan) return { kind: "plan_not_found" as const };

		const [patient] = await tx
			.select({ id: patients.id })
			.from(patients)
			.where(and(eq(patients.id, plan.patientId), eq(patients.organizationId, orgId)))
			.limit(1);
		if (!patient) return { kind: "forbidden" as const };

		await tx
			.update(treatmentPlans)
			.set({ patientSignature, updatedAt: new Date() })
			.where(and(eq(treatmentPlans.id, planId), eq(treatmentPlans.organizationId, orgId)));

		return { kind: "ok" as const };
	});

	if (updateResult.kind === "plan_not_found") {
		return reply.code(404).send({ error: "Not found", message: "План лечения не найден." });
	}
	if (updateResult.kind === "forbidden") {
		return reply.code(403).send({ error: "Forbidden", message: "Нет доступа к плану лечения этого пациента." });
	}

	return reply.send({ success: true });
}
