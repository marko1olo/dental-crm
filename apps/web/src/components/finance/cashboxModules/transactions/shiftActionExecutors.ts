/**
 * shiftActionExecutors.ts — Layer 3: Shift Open, Z-Report & X-Report Executors.
 *
 * DENTE Dental CRM — Cash Register 54-FZ, Discounts & Staff Autonomy Operations.
 * Implements:
 * - Open shift & Close shift (Z-report with fiscal print)
 * - Intermediate X-report execution without closing
 */

import { kopecksToRub, rubToKopecks } from "@dental/shared";
import { callCashShiftApi } from "../../cashShiftApi.js";
import type { CashboxTransactionResult } from "../cashboxTypes.js";

/**
 * Открытие кассовой смены (по ст. 4.3 54-ФЗ).
 */
export async function executeShiftOpen(params: {
	readonly cashBoxId: string;
	readonly operatorName?: string | undefined;
	readonly initialFundRub?: number | undefined;
}): Promise<CashboxTransactionResult> {
	const fundKop = rubToKopecks(Math.max(0, params.initialFundRub || 0));
	const payload = {
		cashBoxId: params.cashBoxId,
		operatorName: params.operatorName || "Кассир",
		initialCashRub: kopecksToRub(fundKop),
	};

	await callCashShiftApi(
		"/api/fiscal/shift/open",
		"/api/cash/cash-box-all-open",
		payload as Record<string, unknown>,
	);

	return {
		success: true,
		cashBoxId: params.cashBoxId,
		amountRub: kopecksToRub(fundKop),
		balanceBeforeRub: 0,
		balanceAfterRub: kopecksToRub(fundKop),
		messageRu: "Кассовая смена успешно открыта",
	};
}

/**
 * Закрытие кассовой смены со снятием фискального Z-отчета (по 54-ФЗ).
 */
export async function executeShiftCloseZReport(params: {
	readonly cashBoxId: string;
	readonly shiftId?: string | undefined;
	readonly operatorName?: string | undefined;
	readonly expectedCashRub?: number | undefined;
	readonly actualCashRub?: number | undefined;
}): Promise<CashboxTransactionResult> {
	const payload = {
		cashBoxId: params.cashBoxId,
		shiftId: params.shiftId,
		operatorName: params.operatorName || "Кассир",
		expectedCashRub: params.expectedCashRub || 0,
		actualCashRub: params.actualCashRub || 0,
	};

	await callCashShiftApi(
		"/api/fiscal/shift/close",
		"/api/cash/cash-box-all-closing",
		payload as Record<string, unknown>,
	);

	return {
		success: true,
		cashBoxId: params.cashBoxId,
		amountRub: params.actualCashRub || 0,
		balanceBeforeRub: params.expectedCashRub || 0,
		balanceAfterRub: 0,
		messageRu: "Кассовая смена закрыта, Z-отчет успешно сформирован",
	};
}

/**
 * Снятие промежуточного X-отчета (без гашения смены).
 */
export async function executeShiftXReport(params: {
	readonly cashBoxId: string;
	readonly operatorName?: string | undefined;
}): Promise<CashboxTransactionResult> {
	const payload = {
		cashBoxId: params.cashBoxId,
		operatorName: params.operatorName || "Кассир",
	};

	await callCashShiftApi(
		"/api/fiscal/x-report",
		"/api/cash/x-report",
		payload as Record<string, unknown>,
	);

	return {
		success: true,
		cashBoxId: params.cashBoxId,
		amountRub: 0,
		balanceBeforeRub: 0,
		balanceAfterRub: 0,
		messageRu: "X-отчет успешно сформирован и отправлен на печать",
	};
}
