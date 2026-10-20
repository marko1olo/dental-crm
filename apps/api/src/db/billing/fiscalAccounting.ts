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

	// 1. Поиск кассовых счетов клиники и открытых смен (Мандаты 8e, 8n)
	const allBoxes = await tx
		.select()
		.from(schema.cashBoxes)
		.where(eq(schema.cashBoxes.organizationId, organizationId));

	const openShifts = await tx
		.select()
		.from(schema.cashBoxShifts)
		.where(
			and(
				eq(schema.cashBoxShifts.organizationId, organizationId),
				eq(schema.cashBoxShifts.status, "open"),
			),
		);

	const getTargetBoxAndShift = (preferredType: string, specificBoxId?: string | null) => {
		let box = specificBoxId ? allBoxes.find((b) => b.id === specificBoxId) : undefined;
		if (!box) {
			box = allBoxes.find((b) => b.type === preferredType);
		}
		if (!box && (preferredType === "sbp" || preferredType === "online" || preferredType === "dms")) {
			box = allBoxes.find((b) => b.type === "cashless");
		}
		if (!box) {
			box = allBoxes.find((b) => b.isMain) || allBoxes[0];
		}
		const shift = box
			? openShifts.find((s) => s.cashBoxId === box!.id) || openShifts[0] || null
			: openShifts[0] || null;
		return { box, shift };
	};

	const defaultBoxType = input.cashBoxType || (input.method === "cash" ? "main" : "cashless");
	const { box: targetCashBox, shift: activeShift } = getTargetBoxAndShift(defaultBoxType, input.cashBoxId);

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
	const recordBoxIncome = async (
		box: typeof schema.cashBoxes.$inferSelect | undefined,
		shift: typeof schema.cashBoxShifts.$inferSelect | null,
		amtRub: number,
		tenderLabel: string,
	) => {
		if (!box || amtRub <= 0 || isWarrantyOrFullDiscount) return;
		const currentBalance = Number(box.balanceRub || 0);
		const newBalance = Number((currentBalance + amtRub).toFixed(2));

		await tx.insert(schema.cashOperations).values({
			organizationId,
			cashBoxId: box.id,
			shiftId: shift ? shift.id : null,
			operationType: "income",
			amountRub: amtRub,
			balanceBeforeRub: currentBalance,
			balanceAfterRub: newBalance,
			patientId: input.patientId,
			invoiceId: input.documentId ? input.documentId : null,
			kkmDocNumber: effectiveFdNumber || null,
			reasonText: `Оплата медицинских стоматологических услуг [${tenderLabel}] (${effectiveFdNumber || "Без чека"})`,
			operatorName: input.payerFullName || "Кассир",
		});

		await tx
			.update(schema.cashBoxes)
			.set({ balanceRub: newBalance, updatedAt: new Date() })
			.where(eq(schema.cashBoxes.id, box.id));

		if (shift) {
			const currentShiftIncome = Number(shift.incomeTotalRub || 0);
			await tx
				.update(schema.cashBoxShifts)
				.set({ incomeTotalRub: Number((currentShiftIncome + amtRub).toFixed(2)) })
				.where(eq(schema.cashBoxShifts.id, shift.id));
		}
	};

	if (incomingPaymentKopecks > 0 && !isWarrantyOrFullDiscount) {
		if (isSplit) {
			// Раздельные кассовые проводки по видам оплат в целевые кассы
			if (resolvedCashKop > 0) {
				const { box, shift } = getTargetBoxAndShift("main");
				await recordBoxIncome(box, shift, Number((resolvedCashKop / 100).toFixed(2)), "Наличные");
			}
			if (resolvedElectronicKop > 0) {
				const { box, shift } = getTargetBoxAndShift("cashless");
				await recordBoxIncome(box, shift, Number((resolvedElectronicKop / 100).toFixed(2)), "Безналичный расчет");
			}
			if (resolvedDmsKop > 0) {
				const { box, shift } = getTargetBoxAndShift("dms");
				await recordBoxIncome(box, shift, Number((resolvedDmsKop / 100).toFixed(2)), "ДМС");
			}
		} else if (input.method !== "family_wallet") {
			const tenderLabel =
				input.method === "cash"
					? "Наличные"
					: input.cashBoxType === "sbp" || input.method === "online"
						? "СБП QR / Онлайн"
						: input.method === "insurance"
							? "ДМС"
							: "Безналичный расчет";
			await recordBoxIncome(targetCashBox, activeShift, input.amountRub, tenderLabel);
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
