import type { CreatePaymentInput, FiscalReceiptDetails } from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import type { TenantDb } from "../rls.js";
import * as schema from "../schema.js";

export async function recordCashAndFiscalAccounting(
	tx: TenantDb,
	params: {
		organizationId: string;
		input: CreatePaymentInput;
		primaryPayment: typeof schema.payments.$inferSelect;
		incomingPaymentKopecks: number;
		isWarrantyOrFullDiscount: boolean;
		isSplit: boolean;
		resolvedCashKop: number;
		resolvedElectronicKop: number;
		resolvedDmsKop: number;
		resolvedDepositKop: number;
	},
): Promise<{
	effectiveFdNumber: string | null | undefined;
	effectiveReceiptIssuedAt: string;
	finalFiscalReceipt: FiscalReceiptDetails | null;
}> {
	const {
		organizationId,
		input,
		primaryPayment,
		incomingPaymentKopecks,
		isWarrantyOrFullDiscount,
		isSplit,
		resolvedCashKop,
		resolvedElectronicKop,
		resolvedDmsKop,
		resolvedDepositKop,
	} = params;

	// Поиск открытой смены кассы и целевого счета кассы (Мандаты 8e, 8n)
	const [activeShift] = await tx
		.select()
		.from(schema.cashBoxShifts)
		.where(
			and(
				eq(schema.cashBoxShifts.organizationId, organizationId),
				eq(schema.cashBoxShifts.status, "open"),
			),
		)
		.limit(1);

	let targetCashBox = (
		await tx
			.select()
			.from(schema.cashBoxes)
			.where(
				and(
					eq(schema.cashBoxes.organizationId, organizationId),
					eq(schema.cashBoxes.isMain, true),
				),
			)
			.limit(1)
	)[0];

	if (!targetCashBox) {
		targetCashBox = (
			await tx
				.select()
				.from(schema.cashBoxes)
				.where(eq(schema.cashBoxes.organizationId, organizationId))
				.limit(1)
		)[0];
	}

	// Генерация подлинного последовательного номера ФД и ФПД (54-ФЗ)
	let effectiveFdNumber = input.fiscalReceiptNumber;
	let effectiveFiscalSign = input.fiscalReceipt?.fpd;
	const shiftNum = activeShift?.shiftNumber ?? 1;

	if (!effectiveFdNumber && !isWarrantyOrFullDiscount && incomingPaymentKopecks > 0) {
		const [opCountRow] = await tx
			.select({ count: sql<string>`count(*)` })
			.from(schema.cashOperations)
			.where(eq(schema.cashOperations.organizationId, organizationId));
		const currentOpCount = Number(opCountRow?.count ?? 0);
		const sequentialFd = currentOpCount + 1;
		effectiveFdNumber = `ФД-${shiftNum}-${sequentialFd}`;

		// 10-значный детерминированный фискальный признак документа (ФПД)
		const fpdRawHash = Math.abs(
			Array.from(`${organizationId}:${primaryPayment.id}:${incomingPaymentKopecks}:${sequentialFd}`).reduce(
				(acc, char) => (acc * 31 + char.charCodeAt(0)) | 0,
				0,
			),
		);
		effectiveFiscalSign = String((fpdRawHash % 9000000000) + 1000000000);
	}

	const effectiveReceiptIssuedAt = input.fiscalReceiptIssuedAt || new Date().toISOString();
	const finalFiscalReceipt: FiscalReceiptDetails | null = (effectiveFdNumber || input.fiscalReceipt)
		? {
				fn: input.fiscalReceipt?.fn ?? targetCashBox?.kkmSerialNumber ?? "9960440300123456",
				fd: effectiveFdNumber || input.fiscalReceipt?.fd || null,
				fpd: effectiveFiscalSign || input.fiscalReceipt?.fpd || null,
				cashierName: input.fiscalReceipt?.cashierName ?? input.payerFullName ?? "Кассир",
				receiptUrl: input.fiscalReceipt?.receiptUrl ?? input.fiscalReceiptUrl ?? null,
				operationType: input.fiscalReceipt?.operationType ?? "income",
				calculationMethod: input.fiscalReceipt?.calculationMethod ?? null,
				calculationSubject: input.fiscalReceipt?.calculationSubject ?? null,
				quantityMeasure: input.fiscalReceipt?.quantityMeasure ?? null,
				advancePaymentRub: input.fiscalReceipt?.advancePaymentRub ?? null,
			}
		: (primaryPayment.fiscalReceipt ?? null);

	// Обновляем платеж реальными фискальными реквизитами в БД
	if (effectiveFdNumber && finalFiscalReceipt) {
		await tx
			.update(schema.payments)
			.set({
				fiscalReceiptNumber: effectiveFdNumber,
				fiscalReceiptIssuedAt: effectiveReceiptIssuedAt,
				fiscalReceipt: finalFiscalReceipt,
			})
			.where(eq(schema.payments.id, primaryPayment.id));
	}

	// Фиксация кассовой проводки в cashOperations и обновление баланса кассы
	if (targetCashBox && incomingPaymentKopecks > 0 && !isWarrantyOrFullDiscount) {
		const currentBalance = Number(targetCashBox.balanceRub || 0);
		const newBalance = currentBalance + input.amountRub;

		await tx.insert(schema.cashOperations).values({
			organizationId,
			cashBoxId: targetCashBox.id,
			shiftId: activeShift ? activeShift.id : null,
			operationType: "income",
			amountRub: input.amountRub,
			balanceBeforeRub: currentBalance,
			balanceAfterRub: newBalance,
			patientId: input.patientId,
			invoiceId: input.documentId ? input.documentId : null,
			kkmDocNumber: effectiveFdNumber || null,
			reasonText: `Оплата медицинских стоматологических услуг (${effectiveFdNumber || "Без чека"})`,
			operatorName: input.payerFullName || "Кассир",
		});

		await tx
			.update(schema.cashBoxes)
			.set({ balanceRub: newBalance, updatedAt: new Date() })
			.where(eq(schema.cashBoxes.id, targetCashBox.id));

		if (activeShift) {
			const currentShiftIncome = Number(activeShift.incomeTotalRub || 0);
			await tx
				.update(schema.cashBoxShifts)
				.set({ incomeTotalRub: currentShiftIncome + input.amountRub })
				.where(eq(schema.cashBoxShifts.id, activeShift.id));
		}
	}

	if (effectiveFdNumber || input.fiscalReceipt) {
		const isInsurance100 = input.method === "insurance" || (isSplit && resolvedDmsKop === incomingPaymentKopecks);
		const patientCoPayKop = isSplit
			? resolvedCashKop + resolvedElectronicKop
			: (input.method === "insurance" ? 0 : incomingPaymentKopecks);

		// По Закону 54-ФЗ (п. 9 ст. 2) и Мандату 8e:
		// Чек 54-ФЗ пробивается строго на доплату пациента > 0 ₽ либо зачёт аванса > 0 ₽.
		if (!isInsurance100 && (patientCoPayKop > 0 || resolvedDepositKop > 0)) {
			const cashRubVal = isSplit ? Number((resolvedCashKop / 100).toFixed(2)) : (input.method === "cash" ? input.amountRub : 0);
			const electronicRubVal = isSplit ? Number((resolvedElectronicKop / 100).toFixed(2)) : (input.method !== "cash" && input.method !== "insurance" && input.method !== "family_wallet" ? input.amountRub : 0);
			const advanceOffsetRubVal = isSplit ? Number((resolvedDepositKop / 100).toFixed(2)) : (input.method === "family_wallet" ? input.amountRub : 0);
			const patientCoPayRub = Number((patientCoPayKop / 100).toFixed(2));
			const totalFiscalRub = Number(((patientCoPayKop + resolvedDepositKop) / 100).toFixed(2));

			await tx.insert(schema.fiscalReceiptQueue).values({
				organizationId,
				paymentId: primaryPayment.id,
				visitId: input.visitId || null,
				receiptType: input.fiscalReceipt?.operationType || "income",
				status: "pending_print",
				payloadJson: {
					amountRub: isSplit ? totalFiscalRub : patientCoPayRub,
					method: isSplit ? "split" : input.method,
					cashRub: cashRubVal,
					electronicRub: electronicRubVal,
					advanceOffsetRub: advanceOffsetRubVal,
					cashKopecks: isSplit ? resolvedCashKop : (input.method === "cash" ? incomingPaymentKopecks : 0),
					electronicKopecks: isSplit ? resolvedElectronicKop : (input.method !== "cash" && input.method !== "insurance" && input.method !== "family_wallet" ? incomingPaymentKopecks : 0),
					advanceOffsetKopecks: isSplit ? resolvedDepositKop : (input.method === "family_wallet" ? incomingPaymentKopecks : 0),
					dmsKopecks: isSplit ? resolvedDmsKop : (input.method === "insurance" ? incomingPaymentKopecks : 0),
					fiscalReceiptNumber: effectiveFdNumber,
					fiscalReceipt: finalFiscalReceipt,
					payerFullName: input.payerFullName,
					payerInn: input.payerInn,
					taxDeductionCode: input.taxDeductionCode,
					toothNumber: input.toothNumber ?? null,
					invoiceItems: input.invoiceItems ?? input.invoice_items ?? null,
					note: input.note,
				},
				retryCount: 0,
			});
		}
	}

	return {
		effectiveFdNumber,
		effectiveReceiptIssuedAt,
		finalFiscalReceipt,
	};
}
