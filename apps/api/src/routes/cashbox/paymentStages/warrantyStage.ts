/**
 * apps/api/src/routes/cashbox/paymentStages/warrantyStage.ts
 *
 * Stage 2: Doctor Warranty Settlement (100% discount, 0 ₽, no fiscal receipt).
 * Governed by Mandate 8e: Doctor & Cashier Autonomy.
 */

import { and, eq, inArray } from "drizzle-orm";
import { normalizePaymentMethod } from "@dental/shared";
import { patientInvoices, payments, visits } from "../../../db/schema.js";
import type { PaymentProcessingContext, StageStepResult, TenantTransaction } from "./types.js";

export async function processWarrantyStage(
	tx: TenantTransaction,
	ctx: PaymentProcessingContext,
): Promise<StageStepResult> {
	if (!ctx.isWarrantyPayment) {
		return { success: true };
	}

	const { orgId, body, effectiveMutationId, resolvedPatientId, effectiveVisitId } = ctx;

	if (body.invoiceId) {
		const [inv] = await tx
			.select()
			.from(patientInvoices)
			.where(
				and(
					eq(patientInvoices.id, body.invoiceId),
					eq(patientInvoices.organizationId, orgId),
				),
			)
			.for("update")
			.limit(1);

		if (!inv) {
			return { failure: { kind: "invoice_not_found", invoiceId: body.invoiceId } };
		}
		if (inv.status === "paid" || inv.status === "paid_warranty") {
			return {
				failure: {
					kind: "invoice_already_paid",
					invoiceId: inv.id,
					status: inv.status,
				},
			};
		}
		if (inv.status === "voided" || inv.status === "cancelled" || inv.status === "refunded") {
			return {
				failure: {
					kind: "invoice_voided",
					invoiceId: inv.id,
					status: inv.status,
				},
			};
		}

		await tx
			.update(patientInvoices)
			.set({
				status: "paid_warranty",
				paidAt: new Date(),
			})
			.where(
				and(
					eq(patientInvoices.id, body.invoiceId),
					eq(patientInvoices.organizationId, orgId),
				),
			);
	}

	if (effectiveVisitId) {
		if (!body.invoiceId) {
			await tx
				.update(patientInvoices)
				.set({
					status: "paid_warranty",
					paidAt: new Date(),
				})
				.where(
					and(
						eq(patientInvoices.visitId, effectiveVisitId),
						eq(patientInvoices.organizationId, orgId),
						inArray(patientInvoices.status, ["draft", "issued", "sent", "partially_paid"]),
					),
				);
		}

		await tx
			.update(visits)
			.set({ updatedAt: new Date() })
			.where(and(eq(visits.id, effectiveVisitId), eq(visits.organizationId, orgId)));
	}

	const [np] = await tx
		.insert(payments)
		.values({
			organizationId: orgId,
			patientId: resolvedPatientId,
			visitId: effectiveVisitId,
			documentId: body.invoiceId || null,
			clientMutationId: effectiveMutationId,
			amountRub: 0,
			amountKopecks: 0n,
			method: normalizePaymentMethod(body.method),
			status: "paid",
			paidAt: new Date(),
			fiscalReceiptNumber: null,
			fiscalReceiptIssuedAt: null,
			payerFullName: body.payerFullName || body.cashierFullName || "Кассир",
			payerInn: body.payerInn || body.buyerInn || null,
			payerBirthDate: body.payerBirthDate || null,
			payerIdentityDocument: body.payerIdentityDocument || null,
			payerRelationship: body.payerRelationship || null,
			taxDeductionCode: null,
			note: body.note || "Гарантийный расчёт (скидка 100%)",
		})
		.returning();

	if (!np) {
		throw new Error("Не удалось создать запись гарантийного расчета в базе данных.");
	}

	return {
		outcome: {
			statusCode: 200,
			body: {
				success: true,
				data: {
					id: np.id,
					amountKopecks: 0,
					amountRub: 0,
					method: "warranty",
					status: "paid_warranty",
					isWarranty: true,
					fiscalReceiptNumber: null,
					clientMutationId: effectiveMutationId,
					note: np.note,
				},
			},
		},
	};
}
