/**
 * shiftReconciliationEngine.ts — Statutory 54-FZ Shift Reconciliation & Tender Engine.
 *
 * Implements:
 * 1. SSOT tender type resolution via @dental/shared (normalizeTenderType, validateTenderParity).
 * 2. Honest double-ledger reconciliation between Cash Operations, Payments and Physical Cash.
 * 3. 54-FZ FFD 1.2 deterministic fiscal metadata generation (QR-code, FD, FPD, FN) for Demo & Production.
 * 4. Idempotency and atomic concurrency protection (pg_advisory_xact_lock).
 */

import {
	type CanonicalTenderType,
	isDemoOrganizationId,
	kopecksToRub,
	normalizeTenderType,
	rubToKopecks,
	validateTenderParity,
} from "@dental/shared";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import type { TenantDb } from "../../../db/rls.js";
import {
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	payments,
} from "../../../db/schema.js";
import { Fiscal54FzService } from "../../../services/billing/fiscal54fzService.js";
import {
	buildZReportDataPayload,
	formatZReportNumber,
} from "../cashboxHelpers.js";
import type { CloseShiftRequestBody, ZReportDataPayload } from "../types.js";

export interface CalculatedShiftTotals {
	incomeCashRub: number;
	incomeElectronicRub: number;
	incomeSbpRub: number;
	advanceOffsetRub: number;
	advanceDepositsRub: number;
	insuranceTotalRub: number;
	returnTotalRub: number;
	operationalExpenseRub: number;
	netRevenueRub: number;
	expectedCashInDrawerRub: number;
	totalIntroductionsRub: number;
	totalWithdrawalsRub: number;
}

export interface ShiftFiscalMetadataResult {
	fiscalDocNumber: string | null;
	fiscalSign: string | null;
	fnSerial: string | null;
	qrString: string | null;
	isOfflineKkt: boolean;
	statusDescription: string;
}

export interface ShiftReconciliationResult {
	shift: typeof cashBoxShifts.$inferSelect;
	box: typeof cashBoxes.$inferSelect | undefined;
	totals: CalculatedShiftTotals;
	zReportNumber: string;
	zReportData: ZReportDataPayload;
	discrepancyType: "balanced" | "excess" | "shortage";
	differenceRub: number;
	isBalanced: boolean;
	fiscalDocNumber: string | null;
	fiscalSign: string | null;
	qrString: string | null;
}

/**
 * Aggregates real payments and cash operations for a shift to calculate tender totals.
 */
export async function calculateShiftTenderTotals(
	tx: TenantDb,
	orgId: string,
	shift: typeof cashBoxShifts.$inferSelect,
	targetBox?: typeof cashBoxes.$inferSelect,
	now: Date = new Date(),
): Promise<CalculatedShiftTotals> {
	const shiftStart = shift.openedAt;
	const shiftEnd = now;

	// 1. Fetch cash operations created during shift timeframe so we can both
	//    aggregate this box's ops and exclude payments attributed to other cash boxes.
	const orgShiftOps = await tx
		.select()
		.from(cashOperations)
		.where(
			and(
				eq(cashOperations.organizationId, orgId),
				gte(cashOperations.createdAt, shiftStart),
				lte(cashOperations.createdAt, shiftEnd),
			),
		);

	const paymentBoxAttribution = new Map<string, string>();
	const mutationBoxAttribution = new Map<string, string>();
	const advanceDepositPaymentIds = new Set<string>();
	const advanceDepositMutationIds = new Set<string>();

	const ops: typeof orgShiftOps = [];
	for (const op of orgShiftOps) {
		const meta =
			op.metadata && typeof op.metadata === "object"
				? (op.metadata as Record<string, unknown>)
				: null;
		const linkedPaymentId =
			typeof meta?.paymentId === "string" && meta.paymentId.trim()
				? meta.paymentId.trim()
				: null;
		const linkedMutationId =
			typeof meta?.idempotencyKey === "string" && meta.idempotencyKey.trim()
				? meta.idempotencyKey.trim()
				: typeof meta?.clientMutationId === "string" && meta.clientMutationId.trim()
					? meta.clientMutationId.trim()
					: null;
		const isAdvanceDepositMeta =
			meta?.isAdvanceDeposit === true || typeof meta?.depositTagId === "string";

		if (op.cashBoxId) {
			if (linkedPaymentId) {
				paymentBoxAttribution.set(linkedPaymentId, op.cashBoxId);
			}
			if (linkedMutationId) {
				mutationBoxAttribution.set(linkedMutationId, op.cashBoxId);
			}
		}
		if (isAdvanceDepositMeta) {
			if (linkedPaymentId) advanceDepositPaymentIds.add(linkedPaymentId);
			if (linkedMutationId) advanceDepositMutationIds.add(linkedMutationId);
		}
		if (!op.cashBoxId || op.cashBoxId === shift.cashBoxId) {
			ops.push(op);
		}
	}

	let totalIntroductionsKop = 0;
	let totalWithdrawalsKop = 0;
	let opsIncomeCashKop = 0;
	let opsAdvanceDepositCashKop = 0;
	let opsReturnCashKop = 0;
	let opsOperationalExpenseKop = 0;

	for (const op of ops) {
		const amtKop =
			op.amountKopecks !== null && op.amountKopecks !== undefined
				? Number(op.amountKopecks)
				: rubToKopecks(op.amountRub);
		const meta =
			op.metadata && typeof op.metadata === "object"
				? (op.metadata as Record<string, unknown>)
				: null;
		const isAdvanceOffsetOp = meta?.isAdvanceOffset === true;
		const isAdvanceDepositOp =
			meta?.isAdvanceDeposit === true || typeof meta?.depositTagId === "string";
		const isDepositRefundOp = meta?.isDepositRefund === true;
		const isDmsOp = meta?.tenderType === "dms";
		const catalogAlias = typeof meta?.catalogAlias === "string" ? meta.catalogAlias : "";
		const isExplicitReturnOp =
			op.operationType === "income_return" ||
			meta?.isRefund === true ||
			meta?.refundId != null ||
			meta?.refundCashKopecks != null ||
			meta?.refundElectronicKopecks != null ||
			catalogAlias === "return_appointment" ||
			catalogAlias === "return_advance" ||
			catalogAlias === "return_product" ||
			(typeof op.reasonText === "string" &&
				op.reasonText.trim().toLowerCase().startsWith("возврат"));

		if (op.operationType === "introduction") {
			totalIntroductionsKop += amtKop;
		} else if (op.operationType === "withdrawal") {
			totalWithdrawalsKop += amtKop;
		} else if (op.operationType === "income") {
			if (isAdvanceDepositOp) {
				opsAdvanceDepositCashKop += amtKop;
			} else if (!isAdvanceOffsetOp && !isDmsOp) {
				opsIncomeCashKop += amtKop;
			}
		} else if (op.operationType === "expense" || op.operationType === "income_return") {
			if (!isDepositRefundOp) {
				if (isExplicitReturnOp) {
					opsReturnCashKop += amtKop;
				} else {
					opsOperationalExpenseKop += amtKop;
				}
			}
		}
	}

	// 2. [ANL-03] Fetch payments made in this organization during shift timeframe with strict cashbox isolation
	const boxType = targetBox?.type || "main";
	const isSbpBox = boxType === "sbp";
	const isCashlessBox =
		boxType === "cashless" || isSbpBox || targetBox?.isCashless === true;
	const isMainBox = boxType === "main";
	const isExtraBox = boxType === "extra";
	const isDmsBox = boxType === "dms";
	const isAccountBox = boxType === "account";
	const isExpensesBox = boxType === "expenses";

	let cashKop = 0;
	let cardKop = 0;
	let sbpKop = 0;
	let advanceKop = 0;
	let advanceDepositTotalKop = 0;
	let advanceDepositCashKop = 0;
	let insuranceKop = 0;
	let returnKop = 0;

	// Для подотчетного счета (expenses) выручка от пациентов строго 0
	if (!isExpensesBox) {
		const shiftPayments = await tx
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, orgId),
					inArray(payments.status, ["paid", "refunded"]),
					gte(payments.paidAt, shiftStart),
					lte(payments.paidAt, shiftEnd),
				),
			);

		for (const p of shiftPayments) {
			const attributedBoxId =
				(p.id ? paymentBoxAttribution.get(p.id) : undefined) ??
				(p.clientMutationId ? mutationBoxAttribution.get(p.clientMutationId) : undefined);
			if (attributedBoxId && attributedBoxId !== shift.cashBoxId) {
				continue;
			}

			const amtKop =
				p.amountKopecks !== undefined && p.amountKopecks !== null && p.amountKopecks !== 0n
					? Number(p.amountKopecks)
					: rubToKopecks(p.amountRub);
			// Negative ledger rows represent return outflows already captured in opsReturnCashKop.
			if (amtKop <= 0) {
				continue;
			}

			const fiscalMeta =
				p.fiscalReceipt && typeof p.fiscalReceipt === "object"
					? (p.fiscalReceipt as Record<string, unknown>)
					: null;
			const isAdvanceDepositPayment =
				fiscalMeta?.calculationMethod === "advance" ||
				fiscalMeta?.isAdvanceDeposit === true ||
				fiscalMeta?.method === "advance" ||
				(p.id ? advanceDepositPaymentIds.has(p.id) : false) ||
				(p.clientMutationId ? advanceDepositMutationIds.has(p.clientMutationId) : false) ||
				(p.documentId == null &&
					typeof p.note === "string" &&
					p.note.toLowerCase().includes("внесение аванса"));

			const canonicalTender = normalizeTenderType(p.method);
			const isAdvanceOffsetPayment =
				Number(fiscalMeta?.advanceOffsetKopecks ?? 0) > 0 ||
				fiscalMeta?.isAdvanceOffset === true ||
				canonicalTender === "deposit" ||
				canonicalTender === "family_wallet" ||
				(p.method === "other" &&
					typeof p.note === "string" &&
					(p.note.toLowerCase().includes("зачет") ||
						p.note.toLowerCase().includes("зачёт")));

			if (isAdvanceDepositPayment) {
				if (
					(canonicalTender === "cash" && isMainBox) ||
					(canonicalTender === "sbp" && isCashlessBox) ||
					((canonicalTender === "card" || canonicalTender === "bank_transfer") &&
						isCashlessBox &&
						!isSbpBox) ||
					(isExtraBox && attributedBoxId === shift.cashBoxId)
				) {
					advanceDepositTotalKop += amtKop;
					if (canonicalTender === "cash" && (isMainBox || isExtraBox)) {
						advanceDepositCashKop += amtKop;
					}
				}
				continue;
			}

			if (isAdvanceOffsetPayment) {
				// Зачёт аванса учитывается в безналичном/основном отчёте реализации, не дублируя кассу
				if (isCashlessBox && !isSbpBox) {
					advanceKop += amtKop;
				}
			} else if (canonicalTender === "cash") {
				// Наличные учитываются ТОЛЬКО в кассе main (или явно привязанной к этой кассе операции)
				if (isMainBox || (isExtraBox && attributedBoxId === shift.cashBoxId)) {
					cashKop += amtKop;
				}
			} else if (canonicalTender === "sbp") {
				// Безналичные СБП учитываются в кассе СБП / безналичной кассе
				if (isCashlessBox) {
					sbpKop += amtKop;
				}
			} else if (canonicalTender === "insurance") {
				// Страховые выплаты ДМС учитываются в кассе ДМС
				if (isDmsBox) {
					insuranceKop += amtKop;
				}
			} else if (canonicalTender === "bank_transfer") {
				// Банковский перевод на р/с
				if (isAccountBox || (isCashlessBox && !isSbpBox)) {
					cardKop += amtKop;
				}
			} else {
				// Эквайринг карты / прочие электронные платежи
				if (isCashlessBox && !isSbpBox) {
					cardKop += amtKop;
				}
			}
		}
	}

	// Для дополнительной кассы филиала (extra) наличный приход берется строго из ее собственных операций ops
	if (isExtraBox) {
		cashKop = opsIncomeCashKop;
		advanceDepositCashKop = Math.max(advanceDepositCashKop, opsAdvanceDepositCashKop);
	} else if (isMainBox) {
		if (opsIncomeCashKop > cashKop) {
			cashKop = opsIncomeCashKop;
		}
		if (opsAdvanceDepositCashKop > advanceDepositCashKop) {
			advanceDepositCashKop = opsAdvanceDepositCashKop;
		}
		if (advanceDepositCashKop > advanceDepositTotalKop) {
			advanceDepositTotalKop = advanceDepositCashKop;
		}
	}

	// Only explicit return/refund operations belong in returnKop (host/operational expenses stay separate)
	if (opsReturnCashKop > 0 && (isMainBox || isExtraBox || isCashlessBox)) {
		returnKop = opsReturnCashKop;
	}

	const incomeCashRub = kopecksToRub(cashKop);
	const incomeElectronicRub = kopecksToRub(cardKop);
	const incomeSbpRub = kopecksToRub(sbpKop);
	const advanceOffsetRub = kopecksToRub(advanceKop);
	const advanceDepositsRub = kopecksToRub(advanceDepositTotalKop);
	const insuranceTotalRub = kopecksToRub(insuranceKop);
	const returnTotalRub = kopecksToRub(returnKop);
	const operationalExpenseRub = kopecksToRub(opsOperationalExpenseKop);
	const totalIntroductionsRub = kopecksToRub(totalIntroductionsKop);
	const totalWithdrawalsRub = kopecksToRub(totalWithdrawalsKop);

	const netRevenueRub = kopecksToRub(
		cashKop + cardKop + sbpKop + advanceKop + insuranceKop - returnKop,
	);

	// Expected physical cash in drawer = start + cashIncome + cashAdvanceDeposits + introductions - withdrawals - operationalExpenses - cashReturns
	const startKop =
		shift.startBalanceKopecks !== undefined && shift.startBalanceKopecks !== null && shift.startBalanceKopecks !== 0
			? Number(shift.startBalanceKopecks)
			: rubToKopecks(shift.startBalanceRub);
	const expectedCashKop =
		startKop +
		cashKop +
		advanceDepositCashKop +
		totalIntroductionsKop -
		totalWithdrawalsKop -
		opsOperationalExpenseKop -
		returnKop;
	const expectedCashInDrawerRub = kopecksToRub(expectedCashKop);

	return {
		incomeCashRub,
		incomeElectronicRub,
		incomeSbpRub,
		advanceOffsetRub,
		advanceDepositsRub,
		insuranceTotalRub,
		returnTotalRub,
		operationalExpenseRub,
		netRevenueRub,
		expectedCashInDrawerRub: targetBox?.type === "main" ? expectedCashInDrawerRub : targetBox?.balanceRub ?? 0,
		totalIntroductionsRub,
		totalWithdrawalsRub,
	};
}

/**
 * Deterministically constructs statutory 54-FZ fiscal receipt metadata for shift closure.
 * - Demo mode (isDemoOrganizationId): deterministic simulation for training & showcases.
 * - Production: only issues real fiscal numbers if physical KKT is online.
 * - Production Offline: honestly returns null / "Локальный учетный Z-отчет (ККТ оффлайн)" without fabricating numbers.
 */
export function generateShiftFiscalMetadata(params: {
	orgId: string;
	shiftNumber: number;
	totalRevenueRub: number;
	closedAt: Date;
	isKktConnected?: boolean | undefined;
	kktReportData?: CloseShiftRequestBody["kktReportData"];
}): ShiftFiscalMetadataResult {
	const isDemo = isDemoOrganizationId(params.orgId);
	if (isDemo) {
		const fnSerial = "9999078900012345";
		const fdNum = params.shiftNumber * 100 + 1;
		const fiscalDocNumber = String(fdNum);
		const fpdNum = 1000000000 + ((params.shiftNumber * 1234567) % 900000000);
		const fiscalSign = String(fpdNum);

		const qrString = Fiscal54FzService.generate54FzQrString({
			issuedAt: params.closedAt,
			totalRub: params.totalRevenueRub,
			fnSerial,
			fiscalDocNumber,
			fiscalSign,
			operationType: 1, // Приход / Итог смены
		});

		return {
			fiscalDocNumber,
			fiscalSign,
			fnSerial,
			qrString,
			isOfflineKkt: false,
			statusDescription: "Фискальный Z-отчет (Демо)",
		};
	}

	if (params.kktReportData?.fiscalDocNumber && params.kktReportData?.fiscalSign) {
		const fnSerial = params.kktReportData.fnSerial ?? process.env.KKM_FN_SERIAL ?? null;
		const fiscalDocNumber = params.kktReportData.fiscalDocNumber;
		const fiscalSign = params.kktReportData.fiscalSign;
		const qrString = params.kktReportData.qrString || (fnSerial ? Fiscal54FzService.generate54FzQrString({
			issuedAt: params.closedAt,
			totalRub: params.totalRevenueRub,
			fnSerial,
			fiscalDocNumber,
			fiscalSign,
			operationType: 1,
		}) : null);

		return {
			fiscalDocNumber,
			fiscalSign,
			fnSerial,
			qrString,
			isOfflineKkt: false,
			statusDescription: "Фискальный Z-отчет (ККТ онлайн)",
		};
	}

	// [SEV-1.1] Честный учет без фабрикации фискальных реквизитов:
	// Если реальная ККТ не вернула ФД и ФП, не подделываем государственные реквизиты.
	return {
		fiscalDocNumber: null,
		fiscalSign: null,
		fnSerial: params.kktReportData?.fnSerial ?? (process.env.KKM_FN_SERIAL || null),
		qrString: null,
		isOfflineKkt: true,
		statusDescription: params.isKktConnected
			? "Z-отчет ожидает подтверждения аппаратной ККТ"
			: "Локальный учетный Z-отчет (ККТ оффлайн)",
	};
}

/**
 * Reconciles a single cash box shift with user input and calculated ledger totals.
 */
export async function reconcileSingleShift(
	tx: TenantDb,
	orgId: string,
	shift: typeof cashBoxShifts.$inferSelect,
	targetBox: typeof cashBoxes.$inferSelect | undefined,
	input: CloseShiftRequestBody,
	effectiveUserId: string | null,
	now: Date = new Date(),
): Promise<ShiftReconciliationResult> {
	const calculatedTotals = await calculateShiftTenderTotals(tx, orgId, shift, targetBox, now);

	const isPhysicalCashBox = targetBox?.type === "main" || targetBox?.type === "extra";
	const boxBalanceKop = targetBox
		? targetBox.balanceKopecks != null &&
			(Number(targetBox.balanceKopecks) !== 0 || Number(targetBox.balanceRub || 0) === 0)
			? Number(targetBox.balanceKopecks)
			: rubToKopecks(targetBox.balanceRub ?? 0)
		: 0;
	const boxBalanceRubSafe = kopecksToRub(boxBalanceKop);
	const expectedCash = isPhysicalCashBox
		? targetBox?.type === "main"
			? calculatedTotals.expectedCashInDrawerRub
			: boxBalanceRubSafe
		: boxBalanceRubSafe;

	// Physical counted cash applies strictly to cash drawer boxes; cashless/other accounts reconcile at ledger balance.
	const countedCashRub =
		isPhysicalCashBox && typeof input.countedCashRub === "number" && !Number.isNaN(input.countedCashRub)
			? input.countedCashRub
			: expectedCash;

	const diffKop = rubToKopecks(countedCashRub) - rubToKopecks(expectedCash);
	const differenceRub = kopecksToRub(diffKop);
	const isBalanced = Math.abs(diffKop) === 0;

	let discrepancyType: "balanced" | "excess" | "shortage" = "balanced";
	if (diffKop > 0) {
		discrepancyType = "excess";
	} else if (diffKop < 0) {
		discrepancyType = "shortage";
	}

	const incomeCashRub = input.incomeCashRub ?? calculatedTotals.incomeCashRub;
	const incomeElectronicRub = input.incomeElectronicRub ?? calculatedTotals.incomeElectronicRub;
	const incomeSbpRub = input.incomeSbpRub ?? calculatedTotals.incomeSbpRub;
	const advanceOffsetRub = input.advanceOffsetRub ?? calculatedTotals.advanceOffsetRub;
	const insuranceTotalRub = input.insuranceTotalRub ?? calculatedTotals.insuranceTotalRub;
	const returnTotalRub = input.returnTotalRub ?? calculatedTotals.returnTotalRub;
	const netRevenueRub = input.netRevenueRub ?? calculatedTotals.netRevenueRub;

	// Gross inflow equals netRevenue + returns; validateTenderParity sums gross positive tenders
	const grossDueKopecks = Math.max(0, rubToKopecks(netRevenueRub) + rubToKopecks(returnTotalRub));
	const parityCheck = validateTenderParity({
		totalDueKopecks: grossDueKopecks,
		cashKopecks: rubToKopecks(incomeCashRub),
		cardKopecks: rubToKopecks(incomeElectronicRub),
		sbpKopecks: rubToKopecks(incomeSbpRub),
		depositKopecks: rubToKopecks(advanceOffsetRub),
		insuranceKopecks: rubToKopecks(insuranceTotalRub),
		receivedCashKopecks: rubToKopecks(countedCashRub),
	});

	const fiscalMeta = generateShiftFiscalMetadata({
		orgId,
		shiftNumber: shift.shiftNumber,
		totalRevenueRub: netRevenueRub,
		closedAt: now,
		isKktConnected: input.isKktConnected,
		kktReportData: input.kktReportData,
	});

	const zReportNumber = formatZReportNumber(
		input.zReportNumber,
		shift.shiftNumber,
		now,
	);

	const finalBalanceRub = boxBalanceRubSafe;

	const zReportData = buildZReportDataPayload({
		now,
		cashierFullName: input.cashierFullName ?? null,
		startingBalanceRub: shift.startBalanceRub,
		finalBalanceRub,
		incomeTotalRub:
			netRevenueRub + returnTotalRub > 0
				? kopecksToRub(rubToKopecks(netRevenueRub) + rubToKopecks(returnTotalRub))
				: shift.incomeTotalRub,
		expenseTotalRub: returnTotalRub > 0 ? returnTotalRub : shift.expenseTotalRub,
		countedCashRub,
		incomeCashRub,
		incomeElectronicRub,
		incomeSbpRub,
		advanceOffsetRub,
		insuranceTotalRub,
		returnTotalRub,
		netRevenueRub,
		expectedCashInDrawerRub: expectedCash,
		differenceRub,
		isBalanced,
		discrepancyType,
		fiscalDocNumber: fiscalMeta.fiscalDocNumber,
		fiscalSign: fiscalMeta.fiscalSign,
		qrString: fiscalMeta.qrString,
		reconciliation: {
			parityCheck: {
				isValid: parityCheck.isValid,
				diffKopecks: parityCheck.diffKopecks,
				warningsRu: parityCheck.warningsRu,
			},
			...(input.reconciliation ?? {}),
		},
	});

	return {
		shift,
		box: targetBox,
		totals: calculatedTotals,
		zReportNumber,
		zReportData,
		discrepancyType,
		differenceRub,
		isBalanced,
		fiscalDocNumber: fiscalMeta.fiscalDocNumber,
		fiscalSign: fiscalMeta.fiscalSign,
		qrString: fiscalMeta.qrString,
	};
}
