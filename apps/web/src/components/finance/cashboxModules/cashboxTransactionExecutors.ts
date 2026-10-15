/**
 * cashboxTransactionExecutors.ts — Layer 3: Cash In/Out & Shift Fiscal Action Executors.
 *
 * Implements:
 * - 1-click Cash In (Внесение размена для кассира)
 * - 1-click Cash Out (Инкассация / Выплата из кассы)
 * - Open shift & Close shift (Z-report with fiscal print)
 * - Intermediate X-report execution without closing
 */

import { kopecksToRub, rubToKopecks } from "@dental/shared";
import { callCashShiftApi } from "../cashShiftApi.js";
import type {
	CashboxTransactionPayload,
	CashboxTransactionResult,
} from "./cashboxTypes.js";

/**
 * Внесение наличных в кассу (разменная монета / пополнение).
 */
export async function executeCashDeposit(params: {
	readonly cashBoxId: string;
	readonly amountRub: number;
	readonly currentBalanceRub: number;
	readonly reasonText?: string | undefined;
	readonly operatorName?: string | undefined;
	readonly shiftId?: string | undefined;
}): Promise<CashboxTransactionResult> {
	const amountKop = rubToKopecks(Math.max(0, params.amountRub));
	const currentKop = rubToKopecks(Math.max(0, params.currentBalanceRub));
	const nextKop = currentKop + amountKop;

	const reason = params.reasonText?.trim() || "Внесение разменного фонда";

	const payload: CashboxTransactionPayload = {
		cashBoxId: params.cashBoxId,
		operationType: "cash_in",
		amountRub: kopecksToRub(amountKop),
		reasonText: reason,
		operatorName: params.operatorName,
		shiftId: params.shiftId,
	};

	await callCashShiftApi(
		"/api/fiscal/cash-in",
		"/api/cash/cash-introduction",
		payload as unknown as Record<string, unknown>,
	);

	return {
		success: true,
		cashBoxId: params.cashBoxId,
		amountRub: kopecksToRub(amountKop),
		balanceBeforeRub: kopecksToRub(currentKop),
		balanceAfterRub: kopecksToRub(nextKop),
		messageRu: `Внесение ${kopecksToRub(amountKop).toLocaleString("ru-RU")} ₽ успешно проведено`,
	};
}

/**
 * Изъятие / Инкассация наличных из кассы (выемка / инкассация в банк).
 */
export async function executeCashWithdrawal(params: {
	readonly cashBoxId: string;
	readonly amountRub: number;
	readonly currentBalanceRub: number;
	readonly reasonText?: string | undefined;
	readonly operatorName?: string | undefined;
	readonly shiftId?: string | undefined;
}): Promise<CashboxTransactionResult> {
	const amountKop = rubToKopecks(Math.max(0, params.amountRub));
	const currentKop = rubToKopecks(Math.max(0, params.currentBalanceRub));

	if (amountKop > currentKop) {
		const shortageRub = kopecksToRub(amountKop - currentKop);
		return {
			success: false,
			cashBoxId: params.cashBoxId,
			amountRub: kopecksToRub(amountKop),
			balanceBeforeRub: kopecksToRub(currentKop),
			balanceAfterRub: kopecksToRub(currentKop),
			messageRu: `Недостаточно наличных в кассе для изъятия (не хватает ${shortageRub.toLocaleString("ru-RU")} ₽)`,
		};
	}

	const nextKop = currentKop - amountKop;
	const reason = params.reasonText?.trim() || "Инкассация наличных";

	const payload: CashboxTransactionPayload = {
		cashBoxId: params.cashBoxId,
		operationType: "cash_out",
		amountRub: kopecksToRub(amountKop),
		reasonText: reason,
		operatorName: params.operatorName,
		shiftId: params.shiftId,
	};

	await callCashShiftApi(
		"/api/fiscal/cash-out",
		"/api/cash/cash-withdrawal",
		payload as unknown as Record<string, unknown>,
	);

	return {
		success: true,
		cashBoxId: params.cashBoxId,
		amountRub: kopecksToRub(amountKop),
		balanceBeforeRub: kopecksToRub(currentKop),
		balanceAfterRub: kopecksToRub(nextKop),
		messageRu: `Изъятие ${kopecksToRub(amountKop).toLocaleString("ru-RU")} ₽ успешно проведено`,
	};
}

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
