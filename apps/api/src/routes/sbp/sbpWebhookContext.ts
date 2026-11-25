import { rublesToKopecks } from "@dental/shared";
import { and, eq, or } from "drizzle-orm";
import { withSuperuserBypass, withTenantCtx } from "../../db/rls.js";
import { patientInvoices, patients, payments, sberbankTransactions } from "../../db/schema.js";
import { isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import type { SbpWebhookTargetContext } from "./types.js";

/** Locates transaction or payment context with strict tenant ownership verification */
export async function locateSbpWebhookContext(
	operationId: string,
	payload: Record<string, unknown>,
): Promise<SbpWebhookTargetContext | null> {
	const resolved = await withSuperuserBypass(async (tx) => {
		// 1. Check sberbankTransactions (orders registered for SBP)
		const [sberTx] = await tx
			.select()
			.from(sberbankTransactions)
			.where(eq(sberbankTransactions.orderId, String(operationId)))
			.limit(1);

		if (sberTx) {
			return {
				source: "sberbankTransactions" as const,
				organizationId: sberTx.organizationId,
				patientId: sberTx.patientId,
				visitId: sberTx.visitId,
				documentId: sberTx.documentId,
				invoiceId: sberTx.invoiceId,
				amountKopecks: Number(sberTx.amountKopecks),
				sberTx,
			};
		}

		// 2. Check existing payments by clientMutationId
		const mutationId = `sbp:${operationId}`;
		const [existingPayment] = await tx
			.select()
			.from(payments)
			.where(
				or(
					eq(payments.clientMutationId, mutationId),
					eq(payments.clientMutationId, String(operationId)),
				),
			)
			.limit(1);

		if (existingPayment) {
			return {
				source: "payments" as const,
				organizationId: existingPayment.organizationId,
				patientId: existingPayment.patientId,
				visitId: existingPayment.visitId,
				documentId: existingPayment.documentId,
				invoiceId: null,
				amountKopecks:
					existingPayment.amountKopecks !== null && existingPayment.amountKopecks !== undefined
						? Number(existingPayment.amountKopecks)
						: rublesToKopecks(Number(existingPayment.amountRub)),
				existingPayment,
			};
		}

		return null;
	});

	if (resolved) {
		return resolved;
	}

	// 3. Payload fallback is forbidden in production without an initiated transaction/payment record
	if (process.env.NODE_ENV === "production") {
		return null;
	}

	// In non-production environments, enforce strict UUID & tenant ownership checks via withTenantCtx
	if (payload.organizationId && (payload.patientId || payload.invoiceId)) {
		const orgId = String(payload.organizationId).trim();
		const rawPatientId = payload.patientId ? String(payload.patientId).trim() : null;
		const rawInvoiceId = payload.invoiceId ? String(payload.invoiceId).trim() : null;
		const rawVisitId = payload.visitId ? String(payload.visitId).trim() : null;
		const rawDocumentId = payload.documentId ? String(payload.documentId).trim() : null;

		if (!isValidUuid(orgId)) return null;
		if (rawPatientId && !isValidUuid(rawPatientId)) return null;
		if (rawInvoiceId && !isValidUuid(rawInvoiceId)) return null;
		if (rawVisitId && !isValidUuid(rawVisitId)) return null;
		if (rawDocumentId && !isValidUuid(rawDocumentId)) return null;

		const verified = await withTenantCtx(orgId, async (tx) => {
			let verifiedPatientId: string | null = rawPatientId;
			if (rawInvoiceId) {
				const [inv] = await tx
					.select({
						id: patientInvoices.id,
						patientId: patientInvoices.patientId,
					})
					.from(patientInvoices)
					.where(
						and(
							eq(patientInvoices.id, rawInvoiceId),
							eq(patientInvoices.organizationId, orgId),
						),
					)
					.limit(1);
				if (!inv) return null;
				if (rawPatientId && inv.patientId !== rawPatientId) {
					return null;
				}
				verifiedPatientId = inv.patientId;
			}

			if (verifiedPatientId) {
				const [pat] = await tx
					.select({ id: patients.id })
					.from(patients)
					.where(
						and(
							eq(patients.id, verifiedPatientId),
							eq(patients.organizationId, orgId),
						),
					)
					.limit(1);
				if (!pat) return null;
			} else {
				return null;
			}

			const parsedAmountKopecks =
				payload.amountKopecks !== undefined && payload.amountKopecks !== null
					? Number(payload.amountKopecks)
					: payload.amount !== undefined && payload.amount !== null
						? Number(payload.amount)
						: payload.amountRub !== undefined &&
							  payload.amountRub !== null &&
							  Number.isFinite(Number(payload.amountRub))
							? rublesToKopecks(Number(payload.amountRub))
							: null;

			return {
				source: "payload" as const,
				organizationId: orgId,
				patientId: verifiedPatientId,
				visitId: rawVisitId,
				documentId: rawDocumentId,
				invoiceId: rawInvoiceId,
				amountKopecks:
					parsedAmountKopecks !== null && Number.isFinite(parsedAmountKopecks)
						? parsedAmountKopecks
						: null,
			};
		});

		return verified;
	}

	return null;
}
