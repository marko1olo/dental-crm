import { and, eq, gte, lte } from "drizzle-orm";
import {
	type OneCChartOfAccounts,
	type OneCClinicProfile,
	type OneCPaymentBreakdownItem,
	rubToKopecks,
} from "@dental/shared";
import { db } from "../../../../db/client.js";
import { payments } from "../../../../db/schema.js";

export interface ReconciledPaymentsResult {
	readonly paymentBreakdowns: OneCPaymentBreakdownItem[];
	readonly totalPaymentsKop: number;
}

export async function fetchAndReconcilePayments(params: {
	readonly orgId: string;
	readonly startTimestamp: Date;
	readonly endTimestamp: Date;
	readonly cleanDate: string;
	readonly clinic: OneCClinicProfile;
	readonly chartOfAccounts: OneCChartOfAccounts;
}): Promise<ReconciledPaymentsResult> {
	const { orgId, startTimestamp, endTimestamp, cleanDate, clinic, chartOfAccounts } = params;

	const paymentRows = await db
		.select()
		.from(payments)
		.where(
			and(
				eq(payments.organizationId, orgId),
				gte(payments.paidAt, startTimestamp),
				lte(payments.paidAt, endTimestamp),
			),
		);

	let cashKop = 0;
	let acquiringKop = 0;
	let sbpKop = 0;
	let advanceKop = 0;

	for (const p of paymentRows) {
		const amountKop = rubToKopecks(Number(p.amountRub) || 0);
		if (p.method === "cash") {
			cashKop += amountKop;
		} else if (p.method === "card") {
			acquiringKop += amountKop;
		} else if (p.method === "bank_transfer" || p.method === "online") {
			sbpKop += amountKop;
		} else {
			advanceKop += amountKop;
		}
	}

	const breakdowns: OneCPaymentBreakdownItem[] = [];

	if (cashKop > 0) {
		breakdowns.push({
			id: `pay-cash-${cleanDate}`,
			tenderType: "cash",
			tenderTitleRu: "Наличные в кассу (50.01)",
			amountKopecks: cashKop,
			accountCode: chartOfAccounts.accountCashDesk,
		});
	}
	if (acquiringKop > 0) {
		breakdowns.push({
			id: `pay-acq-${cleanDate}`,
			tenderType: "card_acquiring",
			tenderTitleRu: "Оплата банковской картой / Эквайринг (57.03)",
			amountKopecks: acquiringKop,
			accountCode: chartOfAccounts.accountAcquiringTransit,
			acquiringBankName: clinic.bankName || "ПАО СБЕРБАНК",
		});
	}
	if (sbpKop > 0) {
		breakdowns.push({
			id: `pay-sbp-${cleanDate}`,
			tenderType: "sbp",
			tenderTitleRu: "Система быстрых платежей / QR (51)",
			amountKopecks: sbpKop,
			accountCode: chartOfAccounts.accountBankCurrent,
		});
	}
	if (advanceKop > 0) {
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

export function balancePaymentBreakdowns(
	breakdowns: OneCPaymentBreakdownItem[],
	totalRevenueKop: number,
	cleanDate: string,
	chartOfAccounts: OneCChartOfAccounts,
): void {
	const totalPaymentsKop = breakdowns.reduce((s, p) => s + p.amountKopecks, 0);
	if (totalPaymentsKop !== totalRevenueKop) {
		if (breakdowns.length > 0) {
			const diff = totalRevenueKop - totalPaymentsKop;
			(breakdowns[0] as any).amountKopecks = Math.max(0, breakdowns[0]!.amountKopecks + diff);
		} else if (totalRevenueKop > 0) {
			breakdowns.push({
				id: `pay-auto-${cleanDate}`,
				tenderType: "cash",
				tenderTitleRu: "Наличные (Касса клиники)",
				amountKopecks: totalRevenueKop,
				accountCode: chartOfAccounts.accountCashDesk,
			});
		}
	}
}
