import { and, eq, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../../db/client.js";
import {
	auditEvents,
	patientInvoices,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlans,
} from "../../../../db/schema.js";
import {
	ledgerRowId,
	splitStoredPriceId,
} from "../../../odontogram/planHelpers.js";
import { LEDGER_ID_PREFIX_LENGTH, UUID_SHAPE } from "../../../odontogram/types.js";
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

				if (invoice) {
					// Проверяем существующие строки в treatmentItems по префиксу плана
					const existingLedgerItems = await tx
						.select({ id: treatmentItems.id })
						.from(treatmentItems)
						.where(
							and(
								eq(treatmentItems.organizationId, organizationId),
								eq(treatmentItems.patientId, existing.patientId),
								sql`lower(left(${treatmentItems.id}::text, ${sql.raw(String(LEDGER_ID_PREFIX_LENGTH))})) = ${ledgerPrefix}`,
							),
						);

					if (existingLedgerItems.length > 0) {
						// Обновляем статус и связываем существующие позиции со счётом
						await tx
							.update(treatmentItems)
							.set({
								status: "approved",
								notes: sql`CASE WHEN ${treatmentItems.notes} IS NULL OR ${treatmentItems.notes} = '' THEN ${'Счёт ' + invoice.id} ELSE ${treatmentItems.notes} || ' | Счёт ' || ${invoice.id} END`,
							})
							.where(
								and(
									eq(treatmentItems.organizationId, organizationId),
									eq(treatmentItems.patientId, existing.patientId),
									sql`lower(left(${treatmentItems.id}::text, ${sql.raw(String(LEDGER_ID_PREFIX_LENGTH))})) = ${ledgerPrefix}`,
								),
							);
					} else {
						// Если в леджере строк не было — загружаем строки из treatmentPlanItemsNew и создаем детальные позиции счета
						const planItems = await tx
							.select()
							.from(treatmentPlanItemsNew)
							.where(
								and(
									eq(treatmentPlanItemsNew.planId, id),
									eq(treatmentPlanItemsNew.organizationId, organizationId),
								),
							);

						if (planItems.length > 0) {
							let slot = 0;
							const newLedgerItems = planItems.map((item) => {
								const rowId = ledgerRowId(id, slot);
								slot += 1;
								const priceNum = Number(item.price || 0);
								const discountNum = Number(item.discount || 0);
								const lineTotalRub = Math.max(0, priceNum * item.quantity - discountNum);
								const { priceId, name: legacyName } = splitStoredPriceId(item.priceId);
								const title = item.name || legacyName || priceId;
								return {
									id: rowId,
									organizationId,
									patientId: existing.patientId,
									visitId: null,
									serviceId: UUID_SHAPE.test(priceId) ? priceId : null,
									toothCode: item.toothNumber != null ? String(item.toothNumber) : null,
									title,
									quantity: String(item.quantity),
									priceRub: lineTotalRub,
									unitPriceRub: priceNum,
									discountRub: discountNum,
									status: "approved" as const,
									plannedDoctorUserId: item.doctorId ?? null,
									notes: `План лечения: ${updated.name || "Утвержденный"} | Счёт ${invoice.id}`,
								};
							});
							await tx.insert(treatmentItems).values(newLedgerItems);
						}
					}
				}
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
