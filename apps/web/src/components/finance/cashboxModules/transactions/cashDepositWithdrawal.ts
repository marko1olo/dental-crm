/**
 * cashDepositWithdrawal.ts — Layer 3: Cash In/Out Operations.
 *
 * DENTE Dental CRM — Cash Register 54-FZ, Discounts & Staff Autonomy Operations.
 * Implements:
 * - 1-click Cash In (Внесение размена для кассира)
 * - 1-click Cash Out (Инкассация / Выплата из кассы)
 */

import { kopecksToRub, rubToKopecks } from "@dental/shared";
import { callCashShiftApi } from "../../cashShiftApi.js";
import type {
	CashboxTransactionPayload,
	CashboxTransactionResult,
} from "../cashboxTypes.js";

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
