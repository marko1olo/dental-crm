import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { computePayloadHash } from "@dental/shared";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { auditEvents, treatmentItems, treatmentPlans } from "../../db/schema.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { cancelRejectedPlanTierLedgerItems } from "./handlers/mutations/planLedgerSync.js";
import {
	createInvoiceForApprovedPlan,
	type CreatedInvoiceSummary,
} from "./handlers/mutations/statusTreatmentPlanHandler.js";
import type { PipelineStage } from "./pipelineTypes.js";

export const stageTransitionSchema = z.object({
	targetStage: z
		.enum([
			"requires_budget",
			"awaiting_decision",
			"no_appointment",
			"in_progress_abandoned",
			"completed",
		])
		.optional(),
	status: z.enum(["Draft", "Active", "Approved", "Completed", "Rejected"]).optional(),
	reason: z.string().max(255).optional(),
});

export async function handleStageTransition(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
	organizationId: string,
) {
	const rawIdempotencyKey =
		(request.headers?.["idempotency-key"] as string | undefined) ??
		(request.headers?.["x-idempotency-key"] as string | undefined) ??
		(request.body && typeof request.body === "object"
			? ((request.body as Record<string, unknown>).idempotencyKey as string | undefined) ??
			  ((request.body as Record<string, unknown>).clientMutationId as string | undefined)
			: undefined);
	const idempotencyKey = typeof rawIdempotencyKey === "string" ? rawIdempotencyKey.trim() : undefined;

	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);

		// Дедупликация по таблице idempotency_keys (Мандаты 8d, 8bo, 8zp)
		const [existingRecord] = await db
			.select()
			.from(idempotencyKeys)
			.where(and(eq(idempotencyKeys.clinicId, organizationId), eq(idempotencyKeys.key, idempotencyKey)))
			.limit(1);

		if (existingRecord) {
			if (existingRecord.status === "completed" && existingRecord.responseBody) {
				reply.header("idempotency-replayed", "true");
				reply.header("x-idempotency-replayed", "true");
				return reply.code(existingRecord.responseCode || 200).send(existingRecord.responseBody);
			}
			if (existingRecord.status === "in_flight") {
				return reply.code(409).header("Retry-After", "1").send({
					error: "Conflict",
					message: "Операция перемещения плана лечения с данным Idempotency-Key уже выполняется.",
				});
			}
		}
	}

	const { id } = request.params;
	const parsed = stageTransitionSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры перемещения плана лечения: " + parsed.error.issues.map((i) => i.message).join("; "),
			issues: parsed.error.issues,
		});
	}

	const { targetStage, status, reason } = parsed.data;

	const VALID_STATUSES = ["Draft", "Active", "Approved", "Completed", "Rejected"] as const;
	type TreatmentPlanStatus = (typeof VALID_STATUSES)[number];
	function isValidStatus(val: string): val is TreatmentPlanStatus {
		return (VALID_STATUSES as readonly string[]).includes(val);
	}

	const result = await withTenantCtx(organizationId, async (tx) => {
		const [existing] = await tx
			.select()
			.from(treatmentPlans)
			.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
			.limit(1);

		if (!existing) {
			return { kind: "not_found" as const };
		}

		let targetStatus: TreatmentPlanStatus;
		if (status && isValidStatus(status)) {
			targetStatus = status;
		} else if (targetStage) {
			switch (targetStage) {
				case "requires_budget":
					targetStatus = "Draft";
					break;
				case "awaiting_decision":
					targetStatus = "Active";
					break;
				case "no_appointment":
					targetStatus = "Approved";
					break;
				case "in_progress_abandoned":
					targetStatus = "Active";
					break;
				case "completed":
					targetStatus = "Completed";
					break;
				default:
					targetStatus = "Active";
			}
		} else {
			targetStatus = isValidStatus(existing.status) ? existing.status : "Active";
		}

		const now = new Date();
		const updatePayload: Partial<typeof treatmentPlans.$inferInsert> = {
			status: targetStatus,
			updatedAt: now,
		};
		// Явное сохранение этапа воронки координатора (ликвидация самопроизвольного отката)
		if (targetStage) {
			updatePayload.curatorFunnelStage = targetStage;
		}
		if (targetStatus === "Approved" && !existing.approvedAt) {
			updatePayload.approvedAt = now;
		}

		const [plan] = await tx
			.update(treatmentPlans)
			.set(updatePayload)
			.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
			.returning();

		if (!plan) {
			return null;
		}

		let invoice: CreatedInvoiceSummary | null = null;

		if (targetStatus === "Approved") {
			await tx
				.update(treatmentItems)
				.set({
					status: "approved",
					treatmentPlanId: id,
				})
				.where(
					and(
						eq(treatmentItems.organizationId, organizationId),
						eq(treatmentItems.patientId, existing.patientId),
						eq(treatmentItems.status, "proposed"),
						eq(treatmentItems.treatmentPlanId, id),
					),
				);

			await cancelRejectedPlanTierLedgerItems(tx, {
				organizationId,
				patientId: existing.patientId,
				approvedPlanId: id,
				planGroupId: existing.planGroupId,
			});

			invoice = await createInvoiceForApprovedPlan(tx, {
				organizationId,
				patientId: existing.patientId,
				planId: id,
				planName: plan.name || "Комплексный план лечения",
				planTotalPriceRub: plan.totalPriceRub || plan.totalPrice,
				discountMode: plan.discountMode,
				planDiscountPercent: plan.planDiscountPercent ? Number(plan.planDiscountPercent) : 0,
				planDiscountRub: plan.planDiscountRub ? Number(plan.planDiscountRub) : 0,
			});
		}

		await tx.insert(auditEvents).values({
			organizationId,
			actorUserId: null,
			entityType: "treatment_plan",
			entityId: id,
			action: "TREATMENT_PLAN_STAGE_TRANSITION",
			reason: `План лечения «${plan.name}» перемещен в статус ${targetStatus} (этап: ${targetStage || "custom"})${reason ? `: ${reason}` : ""}`,
		});

		const responsePayload: Record<string, unknown> = {
			success: true,
			status: targetStatus,
			newStage: targetStage,
			newStatus: targetStatus,
			plan,
			invoice,
			createdInvoice: invoice,
		};

		if (idempotencyKey) {
			await tx
				.insert(idempotencyKeys)
				.values({
					clinicId: organizationId,
					key: idempotencyKey,
					status: "completed",
					payloadHash: computePayloadHash(request.body ?? {}),
					responseBody: responsePayload,
					responseCode: 200,
				})
				.onConflictDoUpdate({
					target: [idempotencyKeys.clinicId, idempotencyKeys.key],
					set: {
						status: "completed",
						responseBody: responsePayload,
						responseCode: 200,
					},
				});
		}

		return { responsePayload, plan, invoice, targetStatus, now, patientId: existing.patientId };
	});

	if (result && "kind" in result && result.kind === "not_found") {
		return reply.code(404).send({
			error: "TreatmentPlanNotFound",
			message: "План лечения не найден.",
		});
	}

	if (!result || !("plan" in result) || !result.plan) {
		return reply.code(500).send({
			error: "UpdateFailed",
			message: "Не удалось переместить план лечения",
		});
	}

	const { responsePayload, invoice: createdInvoice, targetStatus, now, patientId } = result;

	wsBroker.broadcastToOrganization(organizationId, {
		type: "TREATMENT_PLAN_UPDATED",
		payload: {
			planId: id,
			status: targetStatus,
			stage: targetStage,
			updatedAt: now.toISOString(),
		},
	});

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
			request.log.warn({ err: wsErr }, "WebSocket broadcast failed for INVOICE_CREATED from plan stage transition");
		}
	}

	return reply.code(200).send(responsePayload);
}
