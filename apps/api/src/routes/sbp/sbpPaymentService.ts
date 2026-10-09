import {
	kopecksToNumericString,
	SbpQrEngine,
} from "@dental/shared";
import { and, eq, or } from "drizzle-orm";
import { withSuperuserBypass, withTenantCtx } from "../../db/rls.js";
import {
	generatedDocuments,
	patientInvoices,
	payments,
	sberbankTransactions,
	visits,
} from "../../db/schema.js";
import { createTelegramQrSvg } from "../../telegramQr.js";
import type {
	GenerateQrResponse,
	GenerateSbpDynamicQrInput,
	SbpWebhookResult,
	SbpWebhookTargetContext,
	VerifyPayloadResponse,
} from "./types.js";

// Re-export fiscal receipt service for unified Layer 2 access
export * from "./fiscalReceiptService.js";

/** Generates dynamic SBP QR code and vector SVG */
export function generateSbpDynamicQrService(
	input: GenerateSbpDynamicQrInput,
): GenerateQrResponse {
	const { payloadUrl, cleanOperationId, crc16 } =
		SbpQrEngine.buildNspkDynamicPayload({
			operationId: input.operationId,
			bankMemberId: input.bankMemberId,
			amountKopecks: input.amountKopecks,
			currency: input.currency,
		});

	let qrSvg: string | null = null;
	try {
		qrSvg = createTelegramQrSvg(payloadUrl);
	} catch {
		qrSvg = null;
	}

	return {
		success: true,
		payloadUrl,
		operationId: cleanOperationId,
		crc16,
		amountKopecks: input.amountKopecks,
		amountRub: Number(kopecksToNumericString(input.amountKopecks)),
		currency: input.currency,
		qrSvg,
		ttlSeconds: input.ttlSeconds,
		expiresAt: new Date(Date.now() + input.ttlSeconds * 1000).toISOString(),
	};
}

/** Verifies payload URL and CRC16 checksum */
export function verifySbpPayloadService(
	payloadUrl: string,
): VerifyPayloadResponse {
	const verification = SbpQrEngine.verifyNspkPayload(payloadUrl);
	return {
		success: true,
		verification,
	};
}

/** Locates transaction or payment context with superuser bypass */
export async function locateSbpWebhookContext(
	operationId: string,
	payload: Record<string, unknown>,
): Promise<SbpWebhookTargetContext | null> {
	return await withSuperuserBypass(async (tx) => {
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
				amountKopecks: sberTx.amount,
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
				amountKopecks: Math.round(Number(existingPayment.amountRub) * 100),
				existingPayment,
			};
		}

		// 3. If payload includes organizationId and patientId (or invoiceId)
		if (payload.organizationId && (payload.patientId || payload.invoiceId)) {
			return {
				source: "payload" as const,
				organizationId: String(payload.organizationId),
				patientId: payload.patientId ? String(payload.patientId) : null,
				visitId: payload.visitId ? String(payload.visitId) : null,
				documentId: payload.documentId ? String(payload.documentId) : null,
				invoiceId: payload.invoiceId ? String(payload.invoiceId) : null,
				amountKopecks: payload.amountKopecks
					? Number(payload.amountKopecks)
					: payload.amount
						? Number(payload.amount)
						: null,
			};
		}

		return null;
	});
}

export type ProcessSbpWebhookResult =
	| {
			readonly statusCode: 400;
			readonly body: {
				readonly error: string;
				readonly message: string;
			};
	  }
	| {
			readonly statusCode: 200;
			readonly body: SbpWebhookResult;
	  };

/** Processes incoming SBP webhook payment within organization tenant boundary */
export async function processSbpWebhookTransaction(params: {
	orgId: string;
	operationId: string;
	targetContext: SbpWebhookTargetContext;
	payload: Record<string, unknown>;
	logWarn?: (obj: Record<string, unknown>, msg: string) => void;
}): Promise<ProcessSbpWebhookResult> {
	const { orgId, operationId, targetContext, payload, logWarn } = params;
	const mutationId = `sbp:${operationId}`;

	return await withTenantCtx(orgId, async (tx) => {
		// Pessimistic locking on sberbankTransactions if applicable
		let lockedSberTx: typeof sberbankTransactions.$inferSelect | undefined;
		if (targetContext.source === "sberbankTransactions") {
			const [locked] = await tx
				.select()
				.from(sberbankTransactions)
				.where(
					and(
						eq(sberbankTransactions.orderId, String(operationId)),
						eq(sberbankTransactions.organizationId, orgId),
					),
				)
				.for("update")
				.limit(1);
			lockedSberTx = locked;
		}

		// Pessimistic locking on payments table
		const [lockedPayment] = await tx
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, orgId),
					or(
						eq(payments.clientMutationId, mutationId),
						eq(payments.clientMutationId, String(operationId)),
					),
				),
			)
			.for("update")
			.limit(1);

		// Validate incoming amount if specified
		const incomingAmountKopecks =
			payload.amountKopecks !== undefined && payload.amountKopecks !== null
				? Number(payload.amountKopecks)
				: payload.amount !== undefined && payload.amount !== null
					? Number(payload.amount)
					: payload.sum !== undefined && payload.sum !== null
						? Number(payload.sum)
						: null;

		if (
			incomingAmountKopecks !== null &&
			targetContext.amountKopecks !== null &&
			!Number.isNaN(incomingAmountKopecks) &&
			incomingAmountKopecks !== targetContext.amountKopecks
		) {
			if (logWarn) {
				logWarn(
					{
						operationId,
						expected: targetContext.amountKopecks,
						received: incomingAmountKopecks,
					},
					"[SbpWebhook] Amount mismatch detected",
				);
			}
			return {
				statusCode: 400,
				body: {
					error: "AmountMismatch",
					message:
						"Сумма в уведомлении СБП не совпадает с суммой зарегистрированной операции.",
				},
			};
		}

		const operation = String(payload.operation ?? "").toLowerCase();
		const rawStatus = String(
			payload.status ?? payload.operation ?? "PAID",
		).toLowerCase();

		// 1. Refund operation handling
		if (
			operation === "refunded" ||
			operation === "refund" ||
			rawStatus === "refunded" ||
			rawStatus === "refund"
		) {
			if (lockedSberTx) {
				await tx
					.update(sberbankTransactions)
					.set({ status: "refunded", updatedAt: new Date() })
					.where(
						and(
							eq(sberbankTransactions.id, lockedSberTx.id),
							eq(sberbankTransactions.organizationId, orgId),
						),
					);
			}

			if (lockedPayment) {
				await tx
					.update(payments)
					.set({ status: "refunded", updatedAt: new Date() })
					.where(
						and(
							eq(payments.organizationId, orgId),
							eq(payments.id, lockedPayment.id),
						),
					);
			}

			return {
				statusCode: 200,
				body: {
					success: true,
					processed: true,
					status: "REFUNDED",
				},
			};
		}

		// 2. Success / Deposited / Paid handling
		const isSuccess =
			operation === "deposited" ||
			operation === "paid" ||
			rawStatus === "paid" ||
			rawStatus === "deposited" ||
			rawStatus === "success" ||
			rawStatus === "accepted" ||
			rawStatus === "2" ||
			rawStatus === "0";

		if (isSuccess) {
			// Idempotency check: if transaction is already processed or payment row exists
			if (
				(lockedSberTx && lockedSberTx.status === "success") ||
				(lockedPayment && lockedPayment.status === "paid")
			) {
				return {
					statusCode: 200,
					body: {
						success: true,
						processed: false,
						reason: "already_processed",
						status: "PAID",
						paymentId: lockedPayment?.id,
					},
				};
			}

			if (lockedSberTx) {
				await tx
					.update(sberbankTransactions)
					.set({ status: "success", updatedAt: new Date() })
					.where(
						and(
							eq(sberbankTransactions.id, lockedSberTx.id),
							eq(sberbankTransactions.organizationId, orgId),
						),
					);
			}

			const effectiveAmountKopecks =
				targetContext.amountKopecks ?? incomingAmountKopecks ?? 0;
			const amountRub =
				effectiveAmountKopecks > 0
					? Number(kopecksToNumericString(effectiveAmountKopecks))
					: payload.amountRub
						? Number(payload.amountRub)
						: 0;

			const effectivePatientId =
				targetContext.patientId ||
				lockedSberTx?.patientId ||
				(payload.patientId ? String(payload.patientId) : null);

			if (!effectivePatientId) {
				return {
					statusCode: 400,
					body: {
						error: "MissingPatientId",
						message: "Не удалось определить пациента для разноски платежа СБП.",
					},
				};
			}

			const [insertedPayment] = await tx
				.insert(payments)
				.values({
					organizationId: orgId,
					patientId: effectivePatientId,
					visitId: targetContext.visitId || lockedSberTx?.visitId || null,
					documentId:
						targetContext.documentId || lockedSberTx?.documentId || null,
					method: "online",
					status: "paid",
					amountRub,
					paidAt: new Date(),
					clientMutationId: mutationId,
					note: `Оплата через СБП QR (операция ${operationId})`,
				})
				.onConflictDoNothing({
					target: [payments.organizationId, payments.clientMutationId],
				})
				.returning();

			const targetDocId =
				targetContext.documentId || lockedSberTx?.documentId;
			if (targetDocId) {
				await tx
					.update(generatedDocuments)
					.set({ status: "issued", issuedAt: new Date() })
					.where(
						and(
							eq(generatedDocuments.id, targetDocId),
							eq(generatedDocuments.organizationId, orgId),
							eq(generatedDocuments.status, "draft"),
						),
					);
			}

			const targetVisitId = targetContext.visitId || lockedSberTx?.visitId;
			if (targetVisitId) {
				await tx
					.update(visits)
					.set({ updatedAt: new Date() })
					.where(
						and(
							eq(visits.id, targetVisitId),
							eq(visits.organizationId, orgId),
						),
					);
			}

			const targetInvoiceId =
				targetContext.invoiceId || lockedSberTx?.invoiceId;
			if (targetInvoiceId) {
				await tx
					.update(patientInvoices)
					.set({ status: "paid", paidAt: new Date() })
					.where(
						and(
							eq(patientInvoices.id, targetInvoiceId),
							eq(patientInvoices.organizationId, orgId),
						),
					);
			}

			return {
				statusCode: 200,
				body: {
					success: true,
					processed: true,
					status: "PAID",
					paymentId: insertedPayment?.id || lockedPayment?.id,
					amount: effectiveAmountKopecks,
				},
			};
		}

		// 3. Failed
		if (lockedSberTx) {
			await tx
				.update(sberbankTransactions)
				.set({ status: "failed", updatedAt: new Date() })
				.where(eq(sberbankTransactions.id, lockedSberTx.id));
		}

		return {
			statusCode: 200,
			body: {
				success: true,
				processed: true,
				status: "FAILED",
			},
		};
	});
}

/** Queries payment status for SBP operation */
export async function getSbpPaymentStatus(
	operationId: string,
	orgId?: string,
): Promise<{
	readonly found: boolean;
	readonly status: string | null;
	readonly amountRub: number | null;
	readonly paidAt: Date | null;
	readonly paymentId: string | null;
} | null> {
	return await withSuperuserBypass(async (tx) => {
		const mutationId = `sbp:${operationId}`;
		const query = tx
			.select()
			.from(payments)
			.where(
				orgId
					? and(
							eq(payments.organizationId, orgId),
							or(
								eq(payments.clientMutationId, mutationId),
								eq(payments.clientMutationId, String(operationId)),
							),
						)
					: or(
							eq(payments.clientMutationId, mutationId),
							eq(payments.clientMutationId, String(operationId)),
						),
			)
			.limit(1);

		const [payment] = await query;
		if (!payment) {
			return {
				found: false,
				status: null,
				amountRub: null,
				paidAt: null,
				paymentId: null,
			};
		}

		return {
			found: true,
			status: payment.status,
			amountRub: Number(payment.amountRub),
			paidAt: payment.paidAt,
			paymentId: payment.id,
		};
	});
}
