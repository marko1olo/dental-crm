import { and, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { rublesToKopecks, sumPaymentFlowBigInt } from "@dental/shared";
import { withSavepoint, type TenantDb } from "../../db/rls.js";
import {
	installmentContracts,
	patientInvoices,
	payments,
	treatmentItems,
} from "../../db/schema.js";
import { isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { reverseVisitConsumablesTx } from "../inventory/storno/stornoOperationHandlers.js";

/**
 * Atomically reverts completed treatment items back to "approved" inside `tx`
 * when an invoice or visit has reached a full refund (net paid <= 0 and refunded > 0).
 */
export async function revertTreatmentItemsOnFullRefundTx(
	tx: TenantDb,
	organizationId: string,
	params: { invoiceId?: string | null; visitId?: string | null },
): Promise<void> {
	const { invoiceId, visitId } = params;
	if (invoiceId && isValidUuid(invoiceId)) {
		await tx
			.update(treatmentItems)
			.set({
				status: "approved",
				version: sql`${treatmentItems.version} + 1`,
			})
			.where(
				and(
					eq(treatmentItems.organizationId, organizationId),
					eq(treatmentItems.invoiceId, invoiceId),
					eq(treatmentItems.status, "completed"),
				),
			);
	}

	if (visitId && isValidUuid(visitId)) {
		const visitInvoices = await tx
			.select({
				id: patientInvoices.id,
				status: patientInvoices.status,
			})
			.from(patientInvoices)
			.where(
				and(
					eq(patientInvoices.organizationId, organizationId),
					eq(patientInvoices.visitId, visitId),
					ne(patientInvoices.status, "voided"),
				),
			);
		const hasActivePaidInvoice = visitInvoices.some(
			(inv) => inv.status === "paid" || inv.status === "partially_paid",
		);
		if (hasActivePaidInvoice) {
			return;
		}

		const visitPayments = await tx
			.select({
				amountRub: payments.amountRub,
				amountKopecks: payments.amountKopecks,
				status: payments.status,
				fiscalReceipt: payments.fiscalReceipt,
			})
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, organizationId),
					eq(payments.visitId, visitId),
					or(eq(payments.status, "paid"), eq(payments.status, "refunded")),
				),
			);
		const visitFlow = sumPaymentFlowBigInt(visitPayments, "ledger");
		const visitFullFlow = sumPaymentFlowBigInt(visitPayments, "flow");
		const hasInPlaceVisitRefund = visitPayments.some(
			(p) => (p.status ?? "").trim().toLowerCase() === "refunded",
		);
		const hasAnyVisitRefund =
			visitFlow.refundedKopecks > 0n ||
			visitFullFlow.refundedKopecks > 0n ||
			hasInPlaceVisitRefund;
		if (visitFlow.netKopecks <= 0n && hasAnyVisitRefund) {
			await tx
				.update(treatmentItems)
				.set({
					status: "approved",
					version: sql`${treatmentItems.version} + 1`,
				})
				.where(
					and(
						eq(treatmentItems.organizationId, organizationId),
						eq(treatmentItems.visitId, visitId),
						eq(treatmentItems.status, "completed"),
					),
				);

			try {
				await withSavepoint(tx, async (spTx) => {
					await reverseVisitConsumablesTx(spTx, {
						organizationId,
						visitId,
						userId: null,
						reason: "full_refund",
						notes: "Авто-сторно расходников при полном возврате оплаты визита",
					});
				});
			} catch {
				// Non-blocking savepoint: payment refund and treatment status rollback stay atomic even if inventory storno fails
			}
		}
	}
}

export interface InvoiceReconciliationResult {
	invoiceTotalKopecks: number;
	paidKopecks: number;
	remainingKopecks: number;
	isFullyPaid: boolean;
}

/**
 * Reconciles invoice balance and updates invoice status atomically within a tenant transaction.
 * Accounts for direct invoice payments, linked installment contract payments ([invoice:<uuid>]),
 * single-invoice visit legacy payments, and negative cashbox refund entries.
 */
export async function reconcileInvoiceBalanceInDb(
	tx: TenantDb,
	organizationId: string,
	invoiceId: string,
): Promise<InvoiceReconciliationResult> {
	if (!isValidUuid(invoiceId)) {
		return {
			invoiceTotalKopecks: 0,
			paidKopecks: 0,
			remainingKopecks: 0,
			isFullyPaid: false,
		};
	}

	const [invoice] = await tx
		.select()
		.from(patientInvoices)
		.where(
			and(
				eq(patientInvoices.organizationId, organizationId),
				eq(patientInvoices.id, invoiceId),
			),
		)
		.for("update")
		.limit(1);

	if (!invoice) {
		return {
			invoiceTotalKopecks: 0,
			paidKopecks: 0,
			remainingKopecks: 0,
			isFullyPaid: false,
		};
	}

	const rawTotal = invoice.totalAmountRub || invoice.totalRub || "0";
	const invoiceTotalKopecks =
		invoice.totalPriceKopecks !== null &&
		invoice.totalPriceKopecks !== undefined &&
		invoice.totalPriceKopecks > 0n
			? Number(invoice.totalPriceKopecks)
			: rublesToKopecks(Number(rawTotal));

	let useLegacyVisitFallback = false;
	if (invoice.visitId) {
		const [visitInvCount] = await tx
			.select({ cnt: sql<number>`count(*)::int` })
			.from(patientInvoices)
			.where(
				and(
					eq(patientInvoices.organizationId, organizationId),
					eq(patientInvoices.visitId, invoice.visitId),
				),
			);
		useLegacyVisitFallback = (visitInvCount?.cnt ?? 0) === 1;
	}

	const linkedContracts = await tx
		.select({ id: installmentContracts.id })
		.from(installmentContracts)
		.where(
			and(
				eq(installmentContracts.organizationId, organizationId),
				eq(installmentContracts.patientId, invoice.patientId),
				sql`${installmentContracts.notes} like ${`%[invoice:${invoice.id}]%`}`,
			),
		);
	const linkedContractIds = linkedContracts.map((c) => c.id);

	const linkConditions = [eq(payments.documentId, invoice.id)];
	if (linkedContractIds.length > 0) {
		linkConditions.push(inArray(payments.documentId, linkedContractIds));
	}
	if (invoice.visitId && useLegacyVisitFallback) {
		const visitLegacyCond = and(eq(payments.visitId, invoice.visitId), isNull(payments.documentId));
		if (visitLegacyCond) {
			linkConditions.push(visitLegacyCond);
		}
	}
	const linkScope =
		linkConditions.length === 1 ? linkConditions[0] : or(...linkConditions);

	const invoicePayments = await tx
		.select({
			amountRub: payments.amountRub,
			amountKopecks: payments.amountKopecks,
			status: payments.status,
			fiscalReceipt: payments.fiscalReceipt,
		})
		.from(payments)
		.where(
			and(
				eq(payments.organizationId, organizationId),
				eq(payments.patientId, invoice.patientId),
				or(eq(payments.status, "paid"), eq(payments.status, "refunded")),
				linkScope,
			),
		);

	const flowSummary = sumPaymentFlowBigInt(invoicePayments, "ledger");
	const fullFlowSummary = sumPaymentFlowBigInt(invoicePayments, "flow");
	const hasInPlaceRefund = invoicePayments.some(
		(p) => (p.status ?? "").trim().toLowerCase() === "refunded",
	);
	const hasAnyRefund =
		flowSummary.refundedKopecks > 0n ||
		fullFlowSummary.refundedKopecks > 0n ||
		hasInPlaceRefund;
	const paidKopecks = flowSummary.netKopecks > 0n ? Number(flowSummary.netKopecks) : 0;
	const remainingKopecks = Math.max(0, invoiceTotalKopecks - paidKopecks);
	const isFullyPaid = paidKopecks >= invoiceTotalKopecks;

	const nextStatus =
		invoice.status === "voided" || invoice.status === "cancelled"
			? invoice.status
			: isFullyPaid && (invoiceTotalKopecks > 0 || !hasAnyRefund)
				? invoice.status === "paid_warranty"
					? "paid_warranty"
					: "paid"
				: paidKopecks > 0
					? hasAnyRefund
						? "partially_refunded"
						: "partially_paid"
					: hasAnyRefund
						? "refunded"
						: "draft";

	await tx
		.update(patientInvoices)
		.set({
			status: nextStatus,
			paidAt:
				nextStatus === "paid" || nextStatus === "paid_warranty"
					? (invoice.paidAt ?? new Date())
					: null,
		})
		.where(
			and(
				eq(patientInvoices.organizationId, organizationId),
				eq(patientInvoices.id, invoiceId),
			),
		);

	if (flowSummary.netKopecks <= 0n && hasAnyRefund) {
		await revertTreatmentItemsOnFullRefundTx(tx, organizationId, {
			invoiceId,
			visitId: invoice.visitId,
		});
	}

	return {
		invoiceTotalKopecks,
		paidKopecks,
		remainingKopecks,
		isFullyPaid,
	};
}
