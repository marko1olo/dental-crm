/**
 * financePaymentsSeederModule.ts — Cash Desk, Cash Shifts, Invoices, Payments, and Doctor Commissions (Layer 2).
 */

import { and, eq } from "drizzle-orm";
import {
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	cashShifts,
	doctorCommissions,
	patientInvoices,
	payments,
} from "../../../../db/schema.js";
import {
	ensureOrganizationCashBoxes,
	ensureOrganizationExpenseReasons,
} from "../../../../db/seeds/seed_cash_and_reasons.js";
import {
	type DbTx,
	DEMO_INVOICE_1_ID,
	DEMO_INVOICE_2_ID,
	DEMO_INVOICE_3_ID,
	DEMO_PAYMENT_1_ID,
	DEMO_PAYMENT_2_ID,
	DEMO_SHOWCASE_ORG_ID,
} from "../types.js";

/**
 * Засевает финансовый контур: 6 счетов кассы, 12 статей расхода,
 * ставки комиссий врачей (doctor_commissions), выставленный счет (patient_invoices),
 * проведенный платеж (payments) и проводку в кассовую смену (cash_operations).
 */
export async function seedDemoFinanceAndPayments(
	tx: DbTx,
	organizationId: string,
	doctorUserId: string,
	orthopedistUserId: string,
	surgeonUserId: string,
	p0Id: string,
	p0FullName: string,
	createdVisitId?: string,
	p1Id?: string,
	p3Id?: string,
): Promise<{
	invoiceId?: string;
	paymentId?: string;
	invoiceIds: string[];
	paymentIds: string[];
}> {
	const isCanonicalDemo = organizationId === DEMO_SHOWCASE_ORG_ID;

	// 1. Обеспечиваем 6 счетов кассы и 12 статей расхода
	await ensureOrganizationCashBoxes(tx, organizationId);
	await ensureOrganizationExpenseReasons(tx, organizationId);

	// 2. Ставки врачей в doctor_commissions (Соколов: 30%, Орлов: 25%, Громов: 35%)
	await tx
		.insert(doctorCommissions)
		.values([
			{
				organizationId,
				userId: doctorUserId,
				doctorId: doctorUserId,
				specialty: "therapist",
				serviceCategory: "therapy",
				commissionPercent: "30.00",
				commissionPct: "30.00",
				materialCostDeductionPct: "10.00",
				labCostDeductionPct: "0.00",
				isActive: true,
				effectiveFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
			},
			{
				organizationId,
				userId: orthopedistUserId,
				doctorId: orthopedistUserId,
				specialty: "orthopedist",
				serviceCategory: "orthopedics",
				commissionPercent: "25.00",
				commissionPct: "25.00",
				materialCostDeductionPct: "10.00",
				labCostDeductionPct: "100.00",
				isActive: true,
				effectiveFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
			},
			{
				organizationId,
				userId: surgeonUserId,
				doctorId: surgeonUserId,
				specialty: "surgeon",
				serviceCategory: "surgery",
				commissionPercent: "35.00",
				commissionPct: "35.00",
				materialCostDeductionPct: "15.00",
				labCostDeductionPct: "0.00",
				isActive: true,
				effectiveFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
			},
		])
		.onConflictDoNothing();

	const allInvoiceIds: string[] = [];
	const allPaymentIds: string[] = [];
	let primaryInvoiceId: string | undefined;
	let primaryPaymentId: string | undefined;

	// 3. Выставляем и оплачиваем счета по пациентам
	// 3.1. Пациент 0 (Иванов Алексей) — оплаченный счёт терапевтического лечения
	const [createdInvoice0] = await tx
		.insert(patientInvoices)
		.values({
			...(isCanonicalDemo ? { id: DEMO_INVOICE_1_ID } : {}),
			organizationId,
			patientId: p0Id,
			visitId: createdVisitId ?? null,
			totalRub: "18500.00",
			totalAmountRub: 18500,
			status: "paid",
			issuedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
			paidAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
		})
		.onConflictDoNothing()
		.returning({ id: patientInvoices.id });

	primaryInvoiceId =
		createdInvoice0?.id ?? (isCanonicalDemo ? DEMO_INVOICE_1_ID : undefined);
	if (primaryInvoiceId) allInvoiceIds.push(primaryInvoiceId);

	const clientMutationId0 = `demo-pay-${organizationId.slice(0, 8)}-p0`;
	const [createdPayment0] = await tx
		.insert(payments)
		.values({
			...(isCanonicalDemo ? { id: DEMO_PAYMENT_1_ID } : {}),
			organizationId,
			patientId: p0Id,
			visitId: createdVisitId ?? null,
			documentId: primaryInvoiceId ?? null,
			clientMutationId: clientMutationId0,
			amountRub: 18500,
			method: "card",
			status: "paid",
			paidAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
			payerFullName: p0FullName,
			fiscalReceiptNumber: "ФД-0045182",
			fiscalReceiptIssuedAt: new Date(
				Date.now() - 1 * 60 * 60 * 1000,
			).toISOString(),
			fiscalReceiptUrl: "https://check.ofd.ru/rec/45182",
			note: "Оплата терапевтического лечения по плану санации (кариес 1.6, пульпит 3.6)",
		})
		.onConflictDoNothing()
		.returning({ id: payments.id });

	primaryPaymentId =
		createdPayment0?.id ?? (isCanonicalDemo ? DEMO_PAYMENT_1_ID : undefined);
	if (primaryPaymentId) allPaymentIds.push(primaryPaymentId);

	// 3.2. Пациент 1 (Смирнова Елена, Ортопедия) — выставленный счет за коронку ZrO2 (ожидает оплаты при сдаче)
	if (p1Id) {
		const [createdInvoice1] = await tx
			.insert(patientInvoices)
			.values({
				...(isCanonicalDemo ? { id: DEMO_INVOICE_2_ID } : {}),
				organizationId,
				patientId: p1Id,
				totalRub: "14500.00",
				totalAmountRub: 14500,
				status: "issued",
				issuedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
			})
			.onConflictDoNothing()
			.returning({ id: patientInvoices.id });

		const inv1Id =
			createdInvoice1?.id ?? (isCanonicalDemo ? DEMO_INVOICE_2_ID : undefined);
		if (inv1Id) allInvoiceIds.push(inv1Id);
	}

	// 3.3. Пациент 3 (Морозова Анна, Хирургия) — частично оплаченный счет за имплантацию (внесен аванс 20 000 ₽ по СБП)
	if (p3Id) {
		const [createdInvoice3] = await tx
			.insert(patientInvoices)
			.values({
				...(isCanonicalDemo ? { id: DEMO_INVOICE_3_ID } : {}),
				organizationId,
				patientId: p3Id,
				totalRub: "45000.00",
				totalAmountRub: 45000,
				status: "partially_paid",
				issuedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
			})
			.onConflictDoNothing()
			.returning({ id: patientInvoices.id });

		const inv3Id =
			createdInvoice3?.id ?? (isCanonicalDemo ? DEMO_INVOICE_3_ID : undefined);
		if (inv3Id) {
			allInvoiceIds.push(inv3Id);

			const clientMutationId3 = `demo-pay-${organizationId.slice(0, 8)}-p3`;
			const [createdPayment3] = await tx
				.insert(payments)
				.values({
					...(isCanonicalDemo ? { id: DEMO_PAYMENT_2_ID } : {}),
					organizationId,
					patientId: p3Id,
					documentId: inv3Id,
					clientMutationId: clientMutationId3,
					amountRub: 20000,
					method: "online",
					status: "paid",
					paidAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
					payerFullName: "Морозова Анна Дмитриевна",
					fiscalReceiptNumber: "ФД-0045091",
					fiscalReceiptIssuedAt: new Date(
						Date.now() - 48 * 60 * 60 * 1000,
					).toISOString(),
					fiscalReceiptUrl: "https://check.ofd.ru/rec/45091",
					note: "Аванс за хирургическую операцию дентальной имплантации (СБП 54-ФЗ)",
				})
				.onConflictDoNothing()
				.returning({ id: payments.id });

			const pay3Id =
				createdPayment3?.id ?? (isCanonicalDemo ? DEMO_PAYMENT_2_ID : undefined);
			if (pay3Id) allPaymentIds.push(pay3Id);
		}
	}

	// 4. Открываем смену кассы и создаем операцию прихода
	const boxes = await tx
		.select()
		.from(cashBoxes)
		.where(eq(cashBoxes.organizationId, organizationId));

	const mainBox = boxes.find((b) => b.isMain) ?? boxes[0];
	const cashlessBox = boxes.find((b) => b.isCashless) ?? mainBox;

	if (mainBox) {
		const existingOpenShift = await tx
			.select()
			.from(cashBoxShifts)
			.where(
				and(
					eq(cashBoxShifts.organizationId, organizationId),
					eq(cashBoxShifts.cashBoxId, mainBox.id),
					eq(cashBoxShifts.status, "open"),
				),
			)
			.limit(1);

		let shiftId = existingOpenShift[0]?.id;

		if (!shiftId) {
			const [newShift] = await tx
				.insert(cashBoxShifts)
				.values({
					organizationId,
					cashBoxId: mainBox.id,
					shiftNumber: 1,
					status: "open",
					openedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
					openedByUserId: doctorUserId,
					startBalanceRub: 5000,
					incomeTotalRub: 18500,
					expenseTotalRub: 0,
				})
				.returning({ id: cashBoxShifts.id });
			shiftId = newShift?.id;
		}

		// Также открываем смену в cashShifts
		const existingCashShift = await tx
			.select()
			.from(cashShifts)
			.where(
				and(
					eq(cashShifts.organizationId, organizationId),
					eq(cashShifts.status, "open"),
				),
			)
			.limit(1);

		if (existingCashShift.length === 0) {
			await tx
				.insert(cashShifts)
				.values({
					organizationId,
					openedByUserId: doctorUserId,
					openedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
					startingBalance: "5000.00",
					status: "open",
				})
				.onConflictDoNothing();
		}

		// Проводка кассовой операции
		if (cashlessBox) {
			await tx
				.insert(cashOperations)
				.values({
					organizationId,
					cashBoxId: cashlessBox.id,
					shiftId: shiftId ?? null,
					operationType: "income",
					amountRub: 18500,
					balanceBeforeRub: 0,
					balanceAfterRub: 18500,
					patientId: p0Id,
					invoiceId: primaryInvoiceId ?? null,
					reasonCode: 5,
					reasonText: "Оплата услуг терапевтического лечения по карте",
					operatorId: doctorUserId,
					operatorName: "Д-р Соколов А. В.",
				})
				.onConflictDoNothing();
		}
	}

	return {
		...(primaryInvoiceId ? { invoiceId: primaryInvoiceId } : {}),
		...(primaryPaymentId ? { paymentId: primaryPaymentId } : {}),
		invoiceIds: allInvoiceIds,
		paymentIds: allPaymentIds,
	};
}
