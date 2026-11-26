import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { rublesToKopecks, sumKopecks } from "@dental/shared";
import type { TenantDb } from "../../db/rls.js";
import { installmentContracts, patientInvoices, payments } from "../../db/schema.js";
import { isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";

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

	const paidRows = invoicePayments.filter((p) => p.status === "paid");
	const refundRows = invoicePayments.filter((p) => p.status === "refunded");

	const grossPaidKopecks = sumKopecks(
		paidRows.map((p) =>
			p.amountKopecks !== null &&
			p.amountKopecks !== undefined &&
			p.amountKopecks > 0n
				? Number(p.amountKopecks)
				: rublesToKopecks(p.amountRub),
		),
	);

	// Negative refunded rows represent cashbox reversals written alongside the original "paid" row.
	// Positive refunded rows were transitioned in-place from "paid" -> "refunded" and are already excluded from paidRows.
	const negativeRefundKopecks = sumKopecks(
		refundRows.map((p) => {
			if (p.amountKopecks !== null && p.amountKopecks !== undefined && p.amountKopecks < 0n) {
				return Math.abs(Number(p.amountKopecks));
			}
			const rubNum = Number(p.amountRub ?? 0);
			if (p.amountKopecks === null && rubNum < 0) {
				return Math.abs(rublesToKopecks(rubNum));
			}
			return 0;
		}),
	);

	const paidKopecks = Math.max(0, grossPaidKopecks - negativeRefundKopecks);
	const remainingKopecks = Math.max(0, invoiceTotalKopecks - paidKopecks);
	const isFullyPaid = paidKopecks >= invoiceTotalKopecks;

	await tx
		.update(patientInvoices)
		.set({
			status: isFullyPaid ? "paid" : paidKopecks > 0 ? "partially_paid" : "draft",
			paidAt: isFullyPaid ? invoice.paidAt ?? new Date() : null,
		})
		.where(
			and(
				eq(patientInvoices.organizationId, organizationId),
				eq(patientInvoices.id, invoiceId),
			),
		);

	return {
		invoiceTotalKopecks,
		paidKopecks,
		remainingKopecks,
		isFullyPaid,
	};
}
