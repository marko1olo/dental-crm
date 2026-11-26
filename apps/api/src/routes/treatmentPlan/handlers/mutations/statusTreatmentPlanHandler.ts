import { and, eq, or, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { isValidUuid } from "@dental/shared";
import { withTenantCtx } from "../../../../db/rls.js";
import {
	auditEvents,
	treatmentItems,
	treatmentPlans,
} from "../../../../db/schema.js";
import { wsBroker } from "../../../../services/websocketBroker.js";
import {
	createInvoiceForApprovedPlan,
	type CreatedInvoiceSummary,
} from "./planApprovedInvoiceService.js";
import { cancelRejectedPlanTierLedgerItems } from "./planLedgerSync.js";
import { updateTreatmentPlanStatusSchema } from "./schemas.js";

export type { CreatedInvoiceSummary };
export { createInvoiceForApprovedPlan };

const approveTreatmentPlanBodySchema = z.object({
	selectedTier: z.string().trim().optional(),
	alternativeTier: z.string().trim().optional(),
}).strict();

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
	if (!isValidUuid(id)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор плана лечения.",
		});
	}

	const parsed = approveTreatmentPlanBodySchema.safeParse(request.body ?? {});
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры утверждения плана лечения.",
			issues: parsed.error.issues,
		});
	}
	const selectedTier =
		(parsed.data.selectedTier && parsed.data.selectedTier.length > 0 ? parsed.data.selectedTier : undefined)
		|| (parsed.data.alternativeTier && parsed.data.alternativeTier.length > 0 ? parsed.data.alternativeTier : undefined)
		|| "optimum";

	const approveResult = await withTenantCtx(organizationId, async (tx) => {
		const [planToLock] = await tx
			.select()
			.from(treatmentPlans)
			.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
			.for("update")
			.limit(1);

		if (!planToLock) {
			return { notFound: true as const, approvedPlan: null, createdInvoice: null };
		}

		let invoice: CreatedInvoiceSummary | null = null;
		const [updated] = await tx
			.update(treatmentPlans)
			.set({
				status: "Approved",
				approvedAt: planToLock.approvedAt ?? new Date(),
				alternativeTier: selectedTier,
				updatedAt: new Date(),
			})
			.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
			.returning();

		if (updated) {
			await tx
				.update(treatmentItems)
				.set({
					status: "approved",
					treatmentPlanId: id,
				})
				.where(
					and(
						eq(treatmentItems.organizationId, organizationId),
						eq(treatmentItems.patientId, planToLock.patientId),
						eq(treatmentItems.status, "proposed"),
						or(
							eq(treatmentItems.treatmentPlanId, id),
							sql`${treatmentItems.treatmentPlanItemId} IN (SELECT id FROM treatment_plan_items_new WHERE plan_id = ${id} AND organization_id = ${organizationId})`,
						),
					),
				);

			await cancelRejectedPlanTierLedgerItems(tx, {
				organizationId,
				patientId: planToLock.patientId,
				approvedPlanId: id,
				planGroupId: planToLock.planGroupId,
			});

			invoice = await createInvoiceForApprovedPlan(tx, {
				organizationId,
				patientId: planToLock.patientId,
				planId: id,
				planName: updated.name || "Комплексный план лечения",
				planTotalPriceRub: updated.totalPriceRub || updated.totalPrice,
				discountMode: updated.discountMode,
				planDiscountPercent: updated.planDiscountPercent ? Number(updated.planDiscountPercent) : 0,
				planDiscountRub: updated.planDiscountRub ? Number(updated.planDiscountRub) : 0,
				planDiscountKopecks: updated.planDiscountKopecks != null ? BigInt(updated.planDiscountKopecks) : null,
				totalPriceKopecks: updated.totalPriceKopecks != null ? BigInt(updated.totalPriceKopecks) : null,
			});

			await tx.insert(auditEvents).values({
				organizationId,
				actorUserId: null,
				entityType: "treatment_plan",
				entityId: id,
				action: "TREATMENT_PLAN_APPROVED",
				reason: `План лечения «${updated.name}» утвержден (сумма: ${updated.totalPriceRub || updated.totalPrice} ₽)`,
			});
		}

		return { notFound: false as const, approvedPlan: updated, createdInvoice: invoice, patientId: planToLock.patientId };
	});

	if (approveResult.notFound) {
		return reply.code(404).send({
			error: "TreatmentPlanNotFound",
			message: "План лечения не найден.",
		});
	}

	const { approvedPlan, createdInvoice, patientId } = approveResult;

	if (!approvedPlan) {
		return reply.code(500).send({
			error: "ApproveFailed",
			message: "Не удалось утвердить план лечения",
		});
	}

	if (createdInvoice) {
		try {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "INVOICE_CREATED",
				payload: {
					invoiceId: createdInvoice.id,
					invoiceNumber: createdInvoice.invoiceNumber,
					patientId,
					patientName: createdInvoice.patientName,
					totalAmountRub: createdInvoice.totalAmountRub,
					status: "draft",
				},
			});
		} catch (wsErr) {
			request.log.warn({ err: wsErr }, "WebSocket broadcast failed for INVOICE_CREATED from plan approval");
		}
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
	if (!isValidUuid(id)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор плана лечения.",
		});
	}

	const parsed = updateTreatmentPlanStatusSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры статуса плана лечения: " + parsed.error.issues.map((i) => i.message).join("; "),
			issues: parsed.error.issues,
		});
	}
	const status = parsed.data.status;
	const isApproved = status.toLowerCase() === "approved";
	const selectedTier = parsed.data.selectedTier || parsed.data.alternativeTier;

	const statusResult = await withTenantCtx(organizationId, async (tx) => {
		let invoice: CreatedInvoiceSummary | null = null;
		const [planToLock] = await tx
			.select()
			.from(treatmentPlans)
			.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
			.for("update")
			.limit(1);

		if (!planToLock) {
			return { notFound: true as const, updatedPlan: null, createdInvoice: null };
		}

		const [updated] = await tx
			.update(treatmentPlans)
			.set({
				status,
				...(isApproved ? { approvedAt: planToLock.approvedAt ?? new Date() } : {}),
				...(selectedTier ? { alternativeTier: selectedTier } : {}),
				updatedAt: new Date(),
			})
			.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
			.returning();

		if (updated && isApproved) {
			await tx
				.update(treatmentItems)
				.set({
					status: "approved",
					treatmentPlanId: id,
				})
				.where(
					and(
						eq(treatmentItems.organizationId, organizationId),
						eq(treatmentItems.patientId, planToLock.patientId),
						eq(treatmentItems.status, "proposed"),
						or(
							eq(treatmentItems.treatmentPlanId, id),
							sql`${treatmentItems.treatmentPlanItemId} IN (SELECT id FROM treatment_plan_items_new WHERE plan_id = ${id} AND organization_id = ${organizationId})`,
						),
					),
				);

			await cancelRejectedPlanTierLedgerItems(tx, {
				organizationId,
				patientId: planToLock.patientId,
				approvedPlanId: id,
				planGroupId: planToLock.planGroupId,
			});

			invoice = await createInvoiceForApprovedPlan(tx, {
				organizationId,
				patientId: planToLock.patientId,
				planId: id,
				planName: updated.name || "Комплексный план лечения",
				planTotalPriceRub: updated.totalPriceRub || updated.totalPrice,
				discountMode: updated.discountMode,
				planDiscountPercent: updated.planDiscountPercent ? Number(updated.planDiscountPercent) : 0,
				planDiscountRub: updated.planDiscountRub ? Number(updated.planDiscountRub) : 0,
				planDiscountKopecks: updated.planDiscountKopecks != null ? BigInt(updated.planDiscountKopecks) : null,
				totalPriceKopecks: updated.totalPriceKopecks != null ? BigInt(updated.totalPriceKopecks) : null,
			});
		}

		if (updated) {
			await tx.insert(auditEvents).values({
				organizationId,
				actorUserId: null,
				entityType: "treatment_plan",
				entityId: id,
				action: isApproved ? "TREATMENT_PLAN_APPROVED" : "TREATMENT_PLAN_STATUS_CHANGED",
				reason: `Статус плана лечения «${updated.name || updated.title}» изменен на «${status}»`,
			});
		}

		return { notFound: false as const, updatedPlan: updated, createdInvoice: invoice, patientId: planToLock.patientId };
	});

	if (statusResult.notFound) {
		return reply.code(404).send({
			error: "TreatmentPlanNotFound",
			message: "План лечения не найден.",
		});
	}

	const { updatedPlan, createdInvoice, patientId } = statusResult;

	if (!updatedPlan) {
		return reply.code(500).send({
			error: "UpdateStatusFailed",
			message: "Не удалось обновить статус плана лечения.",
		});
	}

	if (createdInvoice) {
		try {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "INVOICE_CREATED",
				payload: {
					invoiceId: createdInvoice.id,
					invoiceNumber: createdInvoice.invoiceNumber,
					patientId,
					patientName: createdInvoice.patientName,
					totalAmountRub: createdInvoice.totalAmountRub,
					status: "draft",
				},
			});
		} catch (wsErr) {
			request.log.warn({ err: wsErr }, "WebSocket broadcast failed for INVOICE_CREATED from plan status change");
		}
	}

	return reply.code(200).send({
		success: true,
		plan: updatedPlan,
		invoice: createdInvoice,
		createdInvoice,
	});
}
