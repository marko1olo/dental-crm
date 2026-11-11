import { and, eq, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../../db/client.js";
import { auditEvents, patientInvoices, treatmentItems, treatmentPlans } from "../../../../db/schema.js";
import { LEDGER_ID_PREFIX_LENGTH } from "../../../odontogram/types.js";
import { updateTreatmentPlanStatusSchema } from "./schemas.js";

/**
 * statusTreatmentPlanHandler.ts — Утверждение, смена статуса и жизненный цикл плана лечения.
 * Мандат 8b/8zi: строгое транзакционное управление статусами с обновлением книги лечения.
 */

export async function handleApproveTreatmentPlan(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
	organizationId: string,
) {
	const { id } = request.params;
	const rawBody = (request.body && typeof request.body === "object") ? (request.body as Record<string, unknown>) : {};
	const selectedTier = (typeof rawBody.selectedTier === "string" && rawBody.selectedTier.trim())
		|| (typeof rawBody.alternativeTier === "string" && rawBody.alternativeTier.trim())
		|| "optimum";

	const [existing] = await db
		.select()
		.from(treatmentPlans)
		.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
		.limit(1);

	if (!existing) {
		return reply.code(404).send({
			error: "TreatmentPlanNotFound",
			message: "План лечения не найден.",
		});
	}

	const ledgerPrefix = id.slice(0, LEDGER_ID_PREFIX_LENGTH).toLowerCase();
	let createdInvoice: typeof patientInvoices.$inferSelect | null = null;
	const approvedPlan = await db.transaction(async (tx) => {
		const [updated] = await tx
			.update(treatmentPlans)
			.set({
				status: "Approved",
				approvedAt: new Date(),
				alternativeTier: selectedTier,
				updatedAt: new Date(),
			})
			.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
			.returning();

		if (updated) {
			await tx
				.update(treatmentItems)
				.set({ status: "approved" })
				.where(
					and(
						eq(treatmentItems.organizationId, organizationId),
						eq(treatmentItems.patientId, existing.patientId),
						eq(treatmentItems.status, "proposed"),
						sql`lower(left(${treatmentItems.id}::text, ${sql.raw(String(LEDGER_ID_PREFIX_LENGTH))})) = ${ledgerPrefix}`,
					),
				);

			const totalAmountRub = Number(
				updated.totalPriceRub || updated.totalPrice || existing.totalPriceRub || existing.totalPrice || 0,
			);
			if (totalAmountRub > 0) {
				const now = new Date();
				const [invoice] = await tx
					.insert(patientInvoices)
					.values({
						organizationId,
						patientId: existing.patientId,
						totalRub: String(totalAmountRub),
						totalAmountRub,
						status: "issued",
						issuedAt: now,
						createdAt: now,
						isSynced: false,
					})
					.returning();
				createdInvoice = invoice ?? null;
			}
		}

		return updated;
	});

	if (!approvedPlan) {
		return reply.code(500).send({
			error: "ApproveFailed",
			message: "Не удалось утвердить план лечения",
		});
	}

	try {
		await db.insert(auditEvents).values({
			organizationId,
			actorUserId: null,
			entityType: "treatment_plan",
			entityId: id,
			action: "TREATMENT_PLAN_APPROVED",
			reason: `План лечения «${approvedPlan.name}» утвержден (сумма: ${approvedPlan.totalPriceRub || approvedPlan.totalPrice} ₽)`,
		});
	} catch (auditErr) {
		request.log.warn({ err: auditErr }, "Не удалось записать аудит утверждения плана лечения");
	}

	return reply.code(200).send({
		success: true,
		plan: approvedPlan,
		invoice: createdInvoice,
		createdInvoice,
	});
}

export async function handleUpdateTreatmentPlanStatus(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
	organizationId: string,
) {
	const { id } = request.params;
	const parsed = updateTreatmentPlanStatusSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры статуса плана лечения: " + parsed.error.issues.map((i) => i.message).join("; "),
			issues: parsed.error.issues,
		});
	}
	const status = parsed.data.status;

	const [existing] = await db
		.select()
		.from(treatmentPlans)
		.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
		.limit(1);

	if (!existing) {
		return reply.code(404).send({
			error: "TreatmentPlanNotFound",
			message: "План лечения не найден.",
		});
	}

	const isApproved = status.toLowerCase() === "approved";
	const selectedTier = parsed.data.selectedTier || parsed.data.alternativeTier;
	const [updatedPlan] = await db
		.update(treatmentPlans)
		.set({
			status,
			...(isApproved ? { approvedAt: new Date() } : {}),
			...(selectedTier ? { alternativeTier: selectedTier } : {}),
			updatedAt: new Date(),
		})
		.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
		.returning();

	if (!updatedPlan) {
		return reply.code(500).send({
			error: "UpdateStatusFailed",
			message: "Не удалось обновить статус плана лечения.",
		});
	}

	try {
		await db.insert(auditEvents).values({
			organizationId,
			actorUserId: null,
			entityType: "treatment_plan",
			entityId: id,
			action: isApproved ? "TREATMENT_PLAN_APPROVED" : "TREATMENT_PLAN_STATUS_CHANGED",
			reason: `Статус плана лечения «${updatedPlan.name || updatedPlan.title}» изменен на «${status}»`,
		});
	} catch (auditErr) {
		request.log.warn({ err: auditErr }, "Не удалось записать аудит смены статуса плана лечения");
	}

	return reply.code(200).send({
		success: true,
		plan: updatedPlan,
	});
}
