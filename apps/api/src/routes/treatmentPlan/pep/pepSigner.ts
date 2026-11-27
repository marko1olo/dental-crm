import { createHash } from "node:crypto";
import { and, eq, or, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { onTenantTxCommit, withTenantWriteCtx, type TenantDb } from "../../../db/rls.js";
import {
	auditEvents,
	patients,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlanStages,
	treatmentPlans,
} from "../../../db/schema.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { extractIdempotencyKey } from "../../../utils/httpIdempotency.js";
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
	tx?: TenantDb,
) {
	const idempotencyKey = extractIdempotencyKey(request);
	if (idempotencyKey) {
		if (!isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
			});
		}
		reply.header("Idempotency-Key", idempotencyKey);
	}

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

	if (data.action === "request_code") {
		const loadInitial = async (executor: TenantDb) => {
			const [planRow] = await executor
				.select()
				.from(treatmentPlans)
				.where(and(eq(treatmentPlans.id, planId), eq(treatmentPlans.organizationId, organizationId)))
				.limit(1);

			if (!planRow) return null;

			const [patientRow] = await executor
				.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone })
				.from(patients)
				.where(and(eq(patients.id, planRow.patientId), eq(patients.organizationId, organizationId)))
				.limit(1);

			return { plan: planRow, patient: patientRow ?? null };
		};
		const initialData = tx ? await loadInitial(tx) : await withTenantWriteCtx(organizationId, loadInitial);

		if (!initialData) {
			return reply.code(404).send({ error: "TreatmentPlanNotFound", message: "План лечения не найден." });
		}

		const targetPhone = data.phone || initialData.patient?.phone || "";
		return handleOtpRequest(planId, targetPhone, request, reply, organizationId, initialData.plan.patientId, tx);
	}

	const ledgerPrefix = planId.slice(0, LEDGER_ID_PREFIX_LENGTH).toLowerCase();
	const pepMethodKey = data.method === "sms" ? "pep_sms" : data.method === "qr_touch" ? "pep_qr_touch" : "paper_physical";

	const runSign = async (executor: TenantDb) => {
		const [planToLock] = await executor
			.select()
			.from(treatmentPlans)
			.where(and(eq(treatmentPlans.id, planId), eq(treatmentPlans.organizationId, organizationId)))
			.for("update")
			.limit(1);

		if (!planToLock) {
			return { kind: "not_found" as const };
		}

		if (data.method === "sms") {
			const otpValid = await verifyOtpCode(planId, data.code, organizationId, planToLock.patientId, executor);
			if (!otpValid) {
				return { kind: "invalid_code" as const };
			}
		}

		const [[patientRow], loadedItems, loadedStages] = await Promise.all([
			executor
				.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone })
				.from(patients)
				.where(and(eq(patients.id, planToLock.patientId), eq(patients.organizationId, organizationId)))
				.limit(1),
			executor
				.select()
				.from(treatmentPlanItemsNew)
				.where(
					and(
						eq(treatmentPlanItemsNew.planId, planId),
						eq(treatmentPlanItemsNew.organizationId, organizationId),
					),
				),
			executor
				.select()
				.from(treatmentPlanStages)
				.where(
					and(
						eq(treatmentPlanStages.planId, planId),
						eq(treatmentPlanStages.organizationId, organizationId),
					),
				),
		]);

		const patientFullName = data.signerName || patientRow?.fullName || "Пациент";
		const targetPhone = data.phone || patientRow?.phone || "";

		// Юридическая чистота ПЭП 63-ФЗ: полный канонический снимок под блокировкой FOR UPDATE
		const canonicalPlanSnapshot = {
			planId: planToLock.id,
			patientId: planToLock.patientId,
			organizationId,
			name: planToLock.name,
			diagnosisIcd10: planToLock.diagnosisIcd10 ?? null,
			priceFreezePolicy: planToLock.priceFreezePolicy ?? "standard_30_days",
			discountMode: planToLock.discountMode ?? "plan_fixed",
			totalPriceKopecks: planToLock.totalPriceKopecks ? String(planToLock.totalPriceKopecks) : null,
			planDiscountKopecks: planToLock.planDiscountKopecks ? String(planToLock.planDiscountKopecks) : null,
			totalPriceRub: planToLock.totalPriceRub || planToLock.totalPrice,
			signerName: patientFullName,
			signerPhone: targetPhone,
			stages: loadedStages
				.map((s) => ({
					stageOrder: s.stageOrder,
					stageName: s.stageName,
					completionPercentage: s.completionPercentage,
				}))
				.sort((a, b) => a.stageOrder - b.stageOrder),
			items: loadedItems
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

		const [updated] = await executor
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
			await executor
				.update(treatmentItems)
				.set({ status: "approved", treatmentPlanId: planId })
				.where(
					and(
						eq(treatmentItems.organizationId, organizationId),
						eq(treatmentItems.patientId, planToLock.patientId),
						eq(treatmentItems.status, "proposed"),
						or(
							eq(treatmentItems.treatmentPlanId, planId),
							sql`lower(left(${treatmentItems.id}::text, ${sql.raw(String(LEDGER_ID_PREFIX_LENGTH))})) = ${ledgerPrefix}`,
						),
					),
				);

			await cancelRejectedPlanTierLedgerItems(executor, {
				organizationId,
				patientId: planToLock.patientId,
				approvedPlanId: planId,
				planGroupId: planToLock.planGroupId,
			});

			invoice = await createInvoiceForApprovedPlan(executor, {
				organizationId,
				patientId: planToLock.patientId,
				planId,
				planName: updated.name || planToLock.name || "Комплексный план лечения",
				planTotalPriceRub: updated.totalPriceRub || updated.totalPrice || planToLock.totalPriceRub || planToLock.totalPrice,
				discountMode: updated.discountMode || planToLock.discountMode,
				planDiscountPercent: updated.planDiscountPercent
					? Number(updated.planDiscountPercent)
					: (planToLock.planDiscountPercent ? Number(planToLock.planDiscountPercent) : 0),
				planDiscountRub: updated.planDiscountRub
					? Number(updated.planDiscountRub)
					: (planToLock.planDiscountRub ? Number(planToLock.planDiscountRub) : 0),
				planDiscountKopecks: updated.planDiscountKopecks != null ? BigInt(updated.planDiscountKopecks) : (planToLock.planDiscountKopecks != null ? BigInt(planToLock.planDiscountKopecks) : null),
				totalPriceKopecks: updated.totalPriceKopecks != null ? BigInt(updated.totalPriceKopecks) : (planToLock.totalPriceKopecks != null ? BigInt(planToLock.totalPriceKopecks) : null),
			});

			await executor.insert(auditEvents).values({
				organizationId,
				actorUserId: null,
				entityType: "treatment_plan",
				entityId: planId,
				action: "TREATMENT_PLAN_SIGNED_PEP",
				reason: `План лечения «${planToLock.name}» успешно утвержден и подписан через ПЭП (${pepMethodKey})`,
			});
		}

		const targetPatientId = planToLock.patientId;
		onTenantTxCommit(() => {
			activeOtpCache.delete(planId);
			wsBroker.broadcastToOrganization(organizationId, {
				type: "TREATMENT_PLAN_PEP_SIGNED",
				payload: { planId, patientId: targetPatientId, signature: pepRecord },
			});
			if (invoice) {
				try {
					wsBroker.broadcastToOrganization(organizationId, {
						type: "INVOICE_CREATED",
						payload: {
							invoiceId: invoice.id,
							invoiceNumber: invoice.invoiceNumber,
							patientId: targetPatientId,
							patientName: invoice.patientName,
							totalAmountRub: invoice.totalAmountRub,
							status: "draft",
						},
					});
				} catch (wsErr) {
					request.log.warn({ err: wsErr }, "WebSocket broadcast failed for INVOICE_CREATED from plan PEP signing");
				}
			}
		});

		return {
			kind: "ok" as const,
			signedPlan: updated,
			createdInvoice: invoice,
			patientId: targetPatientId,
			pepRecord,
			documentHash,
		};
	};

	const txResult = tx ? await runSign(tx) : await withTenantWriteCtx(organizationId, runSign);

	if (txResult.kind === "not_found") {
		return reply.code(404).send({ error: "TreatmentPlanNotFound", message: "План лечения не найден." });
	}
	if (txResult.kind === "invalid_code") {
		return reply.code(400).send({
			error: "InvalidVerificationCode",
			message: "Неверный код подтверждения СМС или срок его действия истек.",
		});
	}

	const { signedPlan, createdInvoice, pepRecord, documentHash } = txResult;

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
