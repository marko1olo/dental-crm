import { kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { TenantDb } from "../../db/rls.js";
import {
	fiscalReceiptQueue,
	generatedDocuments,
	patientInvoices,
	patients,
	payments,
	sberbankTransactions,
	visits,
} from "../../db/schema.js";
import { FiscalReceiptFactory } from "../../services/kkt/FiscalReceiptFactory.js";
import { isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { applyAcquiringCashboxLedgerInTx } from "../cashbox/cashlessAcquiringLedger.js";
import { reconcileInvoiceBalanceInDb } from "../payments/sberWebhook/paymentStateTransition.js";
import type { ProcessSbpWebhookResult } from "./sbpWebhookTypes.js";
import type { SbpWebhookTargetContext } from "./types.js";

/** Handles successful SBP payment settlement */
export async function handleSbpWebhookSuccess(params: {
	tx: TenantDb;
	orgId: string;
	operationId: string;
	mutationId: string;
	targetContext: SbpWebhookTargetContext;
	payload: Record<string, unknown>;
	incomingAmountKopecks: number | null;
	lockedSberTx?: typeof sberbankTransactions.$inferSelect | undefined;
	lockedPayment?: typeof payments.$inferSelect | undefined;
}): Promise<ProcessSbpWebhookResult> {
	const {
		tx,
		orgId,
		operationId,
		mutationId,
		targetContext,
		payload,
		incomingAmountKopecks,
		lockedSberTx,
		lockedPayment,
	} = params;

	const txStatusUpper = lockedSberTx?.status?.toUpperCase();
	if (
		txStatusUpper === "REFUNDED" ||
		txStatusUpper === "REVERSED" ||
		lockedPayment?.status === "refunded"
	) {
		return {
			statusCode: 200,
			body: {
				success: true,
				processed: false,
				reason: "already_refunded",
				status: "REFUNDED",
				paymentId: lockedPayment?.id ?? undefined,
			},
		};
	}

	if ((lockedSberTx && lockedSberTx.status === "success") || (lockedPayment && lockedPayment.status === "paid")) {
		return {
			statusCode: 200,
			body: { success: true, processed: false, reason: "already_processed", status: "PAID", paymentId: lockedPayment?.id ?? undefined },
		};
	}

	const effectivePatientId = targetContext.patientId || lockedSberTx?.patientId || (payload.patientId ? String(payload.patientId) : null);
	if (!effectivePatientId || !isValidUuid(effectivePatientId)) {
		return {
			statusCode: 400,
			body: { error: "MissingPatientId", message: "Не удалось определить пациента для разноски платежа СБП." },
		};
	}

	const [patientRow] = await tx
		.select({ id: patients.id })
		.from(patients)
		.where(and(eq(patients.id, effectivePatientId), eq(patients.organizationId, orgId)))
		.limit(1);
	if (!patientRow) {
		return {
			statusCode: 404,
			body: { error: "PatientNotFound", message: "Пациент не принадлежит клинике." },
		};
	}

	const targetInvoiceId = targetContext.invoiceId || lockedSberTx?.invoiceId || null;
	if (targetInvoiceId && isValidUuid(targetInvoiceId)) {
		const [invRow] = await tx
			.select({ id: patientInvoices.id, patientId: patientInvoices.patientId })
			.from(patientInvoices)
			.where(and(eq(patientInvoices.id, targetInvoiceId), eq(patientInvoices.organizationId, orgId)))
			.limit(1);
		if (!invRow || invRow.patientId !== effectivePatientId) {
			return {
				statusCode: 403,
				body: { error: "ForbiddenInvoice", message: "Счёт не найден или принадлежит другому пациенту клиники." },
			};
		}
	}

	if (lockedSberTx) {
		await tx
			.update(sberbankTransactions)
			.set({ status: "success", updatedAt: new Date() })
			.where(and(eq(sberbankTransactions.id, lockedSberTx.id), eq(sberbankTransactions.organizationId, orgId)));
	}

	const effectiveAmountKopecks =
		targetContext.amountKopecks ??
		incomingAmountKopecks ??
		(payload.amountKopecks !== undefined && payload.amountKopecks !== null
			? Number(payload.amountKopecks)
			: 0);
	const amountRub =
		effectiveAmountKopecks > 0
			? kopecksToRubles(effectiveAmountKopecks)
			: payload.amountRub !== undefined && payload.amountRub !== null && Number.isFinite(Number(payload.amountRub))
				? Number(payload.amountRub)
				: 0;
	const targetAmountKopecks =
		effectiveAmountKopecks > 0 ? effectiveAmountKopecks : rublesToKopecks(amountRub);
	if (!Number.isInteger(targetAmountKopecks) || targetAmountKopecks <= 0) {
		return {
			statusCode: 400,
			body: {
				error: "InvalidAmount",
				message: "Некорректная сумма платежа СБП в копейках",
			},
		};
	}

	const resolvedDocumentId =
		(targetInvoiceId && isValidUuid(targetInvoiceId) ? targetInvoiceId : null) ||
		targetContext.documentId ||
		lockedSberTx?.documentId ||
		null;
	const [insertedPayment] = await tx
		.insert(payments)
		.values({
			organizationId: orgId,
			patientId: effectivePatientId,
			visitId: targetContext.visitId || lockedSberTx?.visitId || null,
			documentId: resolvedDocumentId,
			method: "online",
			status: "paid",
			amountRub,
			amountKopecks: BigInt(targetAmountKopecks),
			paidAt: new Date(),
			clientMutationId: mutationId,
			note: `Оплата через СБП QR (операция ${operationId})`,
		})
		.onConflictDoNothing({ target: [payments.organizationId, payments.clientMutationId] })
		.returning();

	const targetDocId = targetContext.documentId || lockedSberTx?.documentId;
	if (targetDocId) {
		await tx
			.update(generatedDocuments)
			.set({ status: "issued", issuedAt: new Date() })
			.where(and(eq(generatedDocuments.id, targetDocId), eq(generatedDocuments.organizationId, orgId), eq(generatedDocuments.status, "draft")));
	}

	const targetVisitId = targetContext.visitId || lockedSberTx?.visitId;
	if (targetVisitId) {
		await tx.update(visits).set({ updatedAt: new Date() }).where(and(eq(visits.id, targetVisitId), eq(visits.organizationId, orgId)));
	}

	if (targetInvoiceId && isValidUuid(targetInvoiceId)) {
		await reconcileInvoiceBalanceInDb(tx, orgId, targetInvoiceId);
	}

	// Only enqueue 54-FZ receipt & update cashless shift ledger if payment row was genuinely inserted
	const resolvedPaymentId = insertedPayment?.id || lockedPayment?.id || null;
	if (insertedPayment) {
		await applyAcquiringCashboxLedgerInTx(tx, {
			organizationId: orgId,
			direction: "income",
			amountKopecks: targetAmountKopecks,
			paymentMethod: "online",
			patientId: effectivePatientId,
			paymentId: insertedPayment.id,
			invoiceId: targetInvoiceId,
			reasonText: `Оплата через СБП QR (операция ${operationId})`,
			sourceTag: mutationId,
		});

		const ffdPayload = FiscalReceiptFactory.buildFfd12Receipt({
			patientId: effectivePatientId,
			invoiceId: targetInvoiceId || undefined,
			visitId: targetVisitId || undefined,
			clientMutationId: mutationId,
			operationType: "income",
			taxationSystem: "usn_income",
			cashierFullName: "Система быстрых платежей (СБП)",
			sbpKopecks: targetAmountKopecks,
			totalKopecks: targetAmountKopecks,
			items: [
				{
					name: (payload.serviceTitle as string) || "Оплата стоматологических услуг по СБП",
					priceKopecks: targetAmountKopecks,
					quantity: 1,
					amountKopecks: targetAmountKopecks,
					subject: "service",
					method: "full_payment",
					vatRate: "vat_none",
					measure: "piece",
				},
			],
		});

		await tx.insert(fiscalReceiptQueue).values({
			organizationId: orgId,
			paymentId: insertedPayment.id,
			visitId: targetVisitId ?? undefined,
			receiptType: "income",
			status: "pending_print",
			payloadJson: {
				...ffdPayload,
				clientMutationId: mutationId,
				invoiceId: targetInvoiceId || null,
				paymentId: insertedPayment.id,
				operationId,
				amountRub,
				amountKopecks: targetAmountKopecks,
				source: "sbp_webhook",
			},
			retryCount: 0,
		});
	}

	return {
		statusCode: 200,
		body: {
			success: true,
			processed: true,
			status: "PAID",
			paymentId: resolvedPaymentId ?? undefined,
			amount: targetAmountKopecks,
		},
	};
}
