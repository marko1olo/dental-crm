import { createHash } from "node:crypto";
import { and, eq, or, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { withTenantCtx } from "../../../db/rls.js";
import {
	auditEvents,
	patients,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlanStages,
	treatmentPlans,
} from "../../../db/schema.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { LEDGER_ID_PREFIX_LENGTH } from "../../odontogram/types.js";
import { cancelRejectedPlanTierLedgerItems } from "../handlers/mutations/planLedgerSync.js";
import {
	createInvoiceForApprovedPlan,
	type CreatedInvoiceSummary,
} from "../handlers/mutations/statusTreatmentPlanHandler.js";
import { handleOtpRequest, verifyOtpCode } from "./pepOtpService.js";
import { activeOtpCache, signTreatmentPlanPepSchema } from "./pepTypes.js";
import { isValidUuid } from "@dental/shared";

export async function handleSignTreatmentPlanPep(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
	organizationId: string,
) {
	const planId = request.params.id?.trim();
	if (!planId || !isValidUuid(planId)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Идентификатор плана лечения должен быть валидным UUID.",
		});
	}
	const parsed = signTreatmentPlanPepSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры подписания плана через ПЭП.",
			issues: parsed.error.issues,
		});
	}

	const data = parsed.data;
	const initialData = await withTenantCtx(organizationId, async (tx) => {
		const [planRow] = await tx
			.select()
			.from(treatmentPlans)
			.where(and(eq(treatmentPlans.id, planId), eq(treatmentPlans.organizationId, organizationId)))
			.limit(1);

		if (!planRow) {
			return null;
		}

		const [patientRow] = await tx
			.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone })
			.from(patients)
			.where(and(eq(patients.id, planRow.patientId), eq(patients.organizationId, organizationId)))
			.limit(1);

		return { plan: planRow, patient: patientRow ?? null };
	});

	if (!initialData) {
		return reply.code(404).send({ error: "TreatmentPlanNotFound", message: "План лечения не найден." });
	}

	const { plan, patient } = initialData;
	const patientFullName = data.signerName || patient?.fullName || "Пациент";
	const targetPhone = data.phone || patient?.phone || "";

	if (data.action === "request_code") {
		return handleOtpRequest(planId, targetPhone, request, reply, organizationId, plan.patientId);
	}

	if (data.method === "sms" && !(await verifyOtpCode(planId, data.code, organizationId, plan.patientId))) {
		return reply.code(400).send({
			error: "InvalidVerificationCode",
			message: "Неверный код подтверждения СМС или срок его действия истек.",
		});
	}

	const { items, stages } = await withTenantCtx(organizationId, async (tx) => {
		const [loadedItems, loadedStages] = await Promise.all([
			tx
				.select()
				.from(treatmentPlanItemsNew)
				.where(
					and(
						eq(treatmentPlanItemsNew.planId, planId),
						eq(treatmentPlanItemsNew.organizationId, organizationId),
					),
				),
			tx
				.select()
				.from(treatmentPlanStages)
				.where(
					and(
						eq(treatmentPlanStages.planId, planId),
						eq(treatmentPlanStages.organizationId, organizationId),
					),
				),
		]);
		return { items: loadedItems, stages: loadedStages };
	});

	// Юридическая чистота ПЭП 63-ФЗ: полный канонический снимок сметы, позиций и этапов
	const canonicalPlanSnapshot = {
		planId: plan.id,
		patientId: plan.patientId,
		organizationId,
		name: plan.name,
		diagnosisIcd10: plan.diagnosisIcd10 ?? null,
		priceFreezePolicy: plan.priceFreezePolicy ?? "standard_30_days",
		discountMode: plan.discountMode ?? "plan_fixed",
		totalPriceKopecks: plan.totalPriceKopecks ? String(plan.totalPriceKopecks) : null,
		planDiscountKopecks: plan.planDiscountKopecks ? String(plan.planDiscountKopecks) : null,
		totalPriceRub: plan.totalPriceRub || plan.totalPrice,
		signerName: patientFullName,
		signerPhone: targetPhone,
		stages: stages
			.map((s) => ({
				stageOrder: s.stageOrder,
				stageName: s.stageName,
				completionPercentage: s.completionPercentage,
			}))
			.sort((a, b) => a.stageOrder - b.stageOrder),
		items: items
			.map((it) => ({
				id: it.id,
				toothNumber: it.toothNumber,
				phase: it.phase,
				priceId: it.priceId,
				name: it.name,
				quantity: it.quantity,
				priceKopecks: it.priceKopecks ? String(it.priceKopecks) : null,
				discountKopecks: it.discountKopecks ? String(it.discountKopecks) : null,
			}))
			.sort((a, b) => (a.phase - b.phase) || (a.toothNumber || 0) - (b.toothNumber || 0) || a.id.localeCompare(b.id)),
	};

	const documentHash = createHash("sha256").update(JSON.stringify(canonicalPlanSnapshot)).digest("hex");
	const pepMethodKey = data.method === "sms" ? "pep_sms" : data.method === "qr_touch" ? "pep_qr_touch" : "paper_physical";

	const pepRecord = {
		method: pepMethodKey,
		signedAtIso: new Date().toISOString(),
		signerPhone: targetPhone,
		signerName: patientFullName,
		clientIp: request.ip || "127.0.0.1",
		userAgent: request.headers["user-agent"] || "",
		documentHash,
		signatureBase64: data.signatureBase64 || null,
		verified: true,
	};

	const ledgerPrefix = planId.slice(0, LEDGER_ID_PREFIX_LENGTH).toLowerCase();
	const { signedPlan, createdInvoice } = await withTenantCtx(
		organizationId,
		async (tx): Promise<{ signedPlan: typeof treatmentPlans.$inferSelect | undefined; createdInvoice: CreatedInvoiceSummary | null }> => {
		const [planToLock] = await tx
			.select()
			.from(treatmentPlans)
			.where(and(eq(treatmentPlans.id, planId), eq(treatmentPlans.organizationId, organizationId)))
			.for("update")
			.limit(1);

		if (!planToLock) {
			return { signedPlan: undefined, createdInvoice: null };
		}

		const [updated] = await tx
			.update(treatmentPlans)
			.set({
				patientSignature: JSON.stringify(pepRecord),
				status: "Approved",
				approvedAt: planToLock.approvedAt ?? new Date(),
				updatedAt: new Date(),
			})
			.where(and(eq(treatmentPlans.id, planId), eq(treatmentPlans.organizationId, organizationId)))
			.returning();

		let invoice: CreatedInvoiceSummary | null = null;
		if (updated) {
			await tx
				.update(treatmentItems)
				.set({ status: "approved", treatmentPlanId: planId })
				.where(
					and(
						eq(treatmentItems.organizationId, organizationId),
						eq(treatmentItems.patientId, plan.patientId),
						eq(treatmentItems.status, "proposed"),
						or(
							eq(treatmentItems.treatmentPlanId, planId),
							sql`lower(left(${treatmentItems.id}::text, ${sql.raw(String(LEDGER_ID_PREFIX_LENGTH))})) = ${ledgerPrefix}`,
						),
					),
				);

			// SEV-2.4: Аннулируем позиции отвергнутых альтернативных тарифов в той же группе планов
			await cancelRejectedPlanTierLedgerItems(tx, {
				organizationId,
				patientId: plan.patientId,
				approvedPlanId: planId,
				planGroupId: plan.planGroupId,
			});

			// DEF-PLAN-01 / ПЭП: Создаем счет/наряд в кассе при подписании плана через ПЭП
			invoice = await createInvoiceForApprovedPlan(tx, {
				organizationId,
				patientId: plan.patientId,
				planId,
				planName: updated.name || plan.name || "Комплексный план лечения",
				planTotalPriceRub: updated.totalPriceRub || updated.totalPrice || plan.totalPriceRub || plan.totalPrice,
				discountMode: updated.discountMode || plan.discountMode,
				planDiscountPercent: updated.planDiscountPercent
					? Number(updated.planDiscountPercent)
					: (plan.planDiscountPercent ? Number(plan.planDiscountPercent) : 0),
				planDiscountRub: updated.planDiscountRub
					? Number(updated.planDiscountRub)
					: (plan.planDiscountRub ? Number(plan.planDiscountRub) : 0),
			});

			await tx.insert(auditEvents).values({
				organizationId,
				actorUserId: null,
				entityType: "treatment_plan",
				entityId: planId,
				action: "TREATMENT_PLAN_SIGNED_PEP",
				reason: `План лечения «${plan.name}» успешно утвержден и подписан через ПЭП (${pepMethodKey})`,
			});
		}

		return { signedPlan: updated, createdInvoice: invoice };
	});

	activeOtpCache.delete(planId);
	wsBroker.broadcastToOrganization(organizationId, {
		type: "TREATMENT_PLAN_PEP_SIGNED",
		payload: { planId, patientId: plan.patientId, signature: pepRecord },
	});

	if (createdInvoice) {
		try {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "INVOICE_CREATED",
				payload: {
					invoiceId: createdInvoice.id,
					invoiceNumber: createdInvoice.invoiceNumber,
					patientId: plan.patientId,
					patientName: createdInvoice.patientName,
					totalAmountRub: createdInvoice.totalAmountRub,
					status: "draft",
				},
			});
		} catch (wsErr) {
			request.log.warn({ err: wsErr }, "WebSocket broadcast failed for INVOICE_CREATED from plan PEP signing");
		}
	}

	return reply.code(200).send({
		success: true,
		signed: true,
		treatmentPlan: signedPlan,
		signature: pepRecord,
		documentHash,
		invoice: createdInvoice,
		createdInvoice,
	});
}
