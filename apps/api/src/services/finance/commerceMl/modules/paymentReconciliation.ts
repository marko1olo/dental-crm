import { and, eq, gte, inArray, lte } from "drizzle-orm";
import {
	classifyPaymentFlowRecord,
	type OneCChartOfAccounts,
	type OneCClinicProfile,
	type OneCPaymentBreakdownItem,
} from "@dental/shared";
import type { TenantDb } from "../../../../db/rls.js";
import { payments } from "../../../../db/schema.js";

export interface ReconciledPaymentsResult {
	readonly paymentBreakdowns: OneCPaymentBreakdownItem[];
	readonly totalPaymentsKop: number;
}

export async function fetchAndReconcilePayments(
	tx: TenantDb,
	params: {
		readonly orgId: string;
		readonly startTimestamp: Date;
		readonly endTimestamp: Date;
		readonly cleanDate: string;
		readonly clinic: OneCClinicProfile;
		readonly chartOfAccounts: OneCChartOfAccounts;
	},
): Promise<ReconciledPaymentsResult> {
	const { orgId, startTimestamp, endTimestamp, cleanDate, clinic, chartOfAccounts } = params;

	const paymentRows = await tx
		.select({
			id: payments.id,
			method: payments.method,
			status: payments.status,
			amountRub: payments.amountRub,
			amountKopecks: payments.amountKopecks,
			fiscalReceipt: payments.fiscalReceipt,
		})
		.from(payments)
		.where(
			and(
				eq(payments.organizationId, orgId),
				inArray(payments.status, ["paid", "refunded"]),
				gte(payments.paidAt, startTimestamp),
				lte(payments.paidAt, endTimestamp),
			),
		);

	let cashKopBig = 0n;
	let acquiringKopBig = 0n;
	let sbpKopBig = 0n;
	let advanceKopBig = 0n;

	for (const p of paymentRows) {
		const flow = classifyPaymentFlowRecord(p, "flow");
		if (flow.kind === "ignored") continue;
		const signedKopBig = flow.signedKopecks;
		if (p.method === "cash") {
			cashKopBig += signedKopBig;
		} else if (p.method === "card") {
			acquiringKopBig += signedKopBig;
		} else if (p.method === "bank_transfer" || p.method === "online") {
			sbpKopBig += signedKopBig;
		} else {
			advanceKopBig += signedKopBig;
		}
	}

	const cashKop = Number(cashKopBig);
	const acquiringKop = Number(acquiringKopBig);
	const sbpKop = Number(sbpKopBig);
	const advanceKop = Number(advanceKopBig);

	const breakdowns: OneCPaymentBreakdownItem[] = [];

	if (cashKop !== 0) {
		breakdowns.push({
			id: `pay-cash-${cleanDate}`,
			tenderType: "cash",
			tenderTitleRu: "Наличные в кассу (50.01)",
			amountKopecks: cashKop,
			accountCode: chartOfAccounts.accountCashDesk,
		});
	}
	if (acquiringKop !== 0) {
		breakdowns.push({
			id: `pay-acq-${cleanDate}`,
			tenderType: "card_acquiring",
			tenderTitleRu: "Оплата банковской картой / Эквайринг (57.03)",
			amountKopecks: acquiringKop,
			accountCode: chartOfAccounts.accountAcquiringTransit,
			...(clinic.bankName ? { acquiringBankName: clinic.bankName } : {}),
		});
	}
	if (sbpKop !== 0) {
		breakdowns.push({
			id: `pay-sbp-${cleanDate}`,
			tenderType: "sbp",
			tenderTitleRu: "Система быстрых платежей / QR (51)",
			amountKopecks: sbpKop,
			accountCode: chartOfAccounts.accountBankCurrent,
		});
	}
	if (advanceKop !== 0) {
		breakdowns.push({
			id: `pay-adv-${cleanDate}`,
			tenderType: "advance_offset",
			tenderTitleRu: "Зачет авансов и депозитов (62.02)",
			amountKopecks: advanceKop,
			accountCode: chartOfAccounts.accountAdvancesReceived,
		});
	}

	const totalPaymentsKop = breakdowns.reduce((s, p) => s + p.amountKopecks, 0);
	return { paymentBreakdowns: breakdowns, totalPaymentsKop };
}
