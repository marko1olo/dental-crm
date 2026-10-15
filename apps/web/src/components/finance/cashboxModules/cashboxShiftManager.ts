/**
 * cashboxShiftManager.ts — Layer 2: 54-FZ Cash Shift Lifecycle & Drawer Reconciliation.
 *
 * Implements:
 * - 54-FZ Art. 4.3 24-hour Fiscal Shift limit validation (shift duration guard)
 * - Exact kopeck reconciliation between recorded ledger and physical cash in drawer
 * - Calculation of shift income/expense aggregates across payment methods
 */

import { kopecksToRub, rubToKopecks } from "@dental/shared";
import type {
	CashboxReconciliationResult,
	CashboxShiftValidation,
} from "./cashboxTypes.js";

/**
 * Статья 4.3 54-ФЗ: Продолжительность смены на ККТ не должна превышать 24 часов.
 * При превышении 24 часов фискальный накопитель (ФН) блокирует формирование кассовых чеков.
 */
export function checkShift24hLimit(
	openedAt: Date | string | number,
	now: Date | string | number = new Date(),
): CashboxShiftValidation {
	const openTime = new Date(openedAt).getTime();
	const currentTime = new Date(now).getTime();

	if (Number.isNaN(openTime) || openTime <= 0) {
		return {
			isLimitExceeded: false,
			durationHours: 0,
			durationMinutes: 0,
			remainingHours: 24,
			canOpen: true,
			canClose: false,
			statusMessageRu: "Смена не открыта",
		};
	}

	const diffMs = Math.max(0, currentTime - openTime);
	const durationMinutes = Math.floor(diffMs / (1000 * 60));
	const durationHours = Number((diffMs / (1000 * 60 * 60)).toFixed(1));
	const isLimitExceeded = durationMinutes >= 24 * 60;
	const remainingMinutes = Math.max(0, 24 * 60 - durationMinutes);
	const remainingHours = Number((remainingMinutes / 60).toFixed(1));

	let statusMessageRu = `Смена открыта (${durationHours} ч.)`;
	let warningRu: string | undefined;

	if (isLimitExceeded) {
		statusMessageRu = `Смена превысила 24 часа (${durationHours} ч.)`;
		warningRu = "Смена длится более 24 часов. Требуется закрыть смену и снять Z-отчет перед новыми чеками.";
	} else if (remainingMinutes <= 60) {
		warningRu = `До истечения 24 часов осталось ${remainingMinutes} мин. Рекомендуется закрыть смену.`;
	}

	return {
		isLimitExceeded,
		durationHours,
		durationMinutes,
		remainingHours,
		canOpen: false,
		canClose: true,
		statusMessageRu,
		warningRu,
	};
}

/**
 * Форматирование продолжительности смены в человекочитаемый вид (например: "8 ч 35 мин").
 */
export function formatShiftDuration(
	openedAt: Date | string | number,
	now: Date | string | number = new Date(),
): string {
	const openTime = new Date(openedAt).getTime();
	const currentTime = new Date(now).getTime();
	if (Number.isNaN(openTime) || openTime <= 0) return "0 мин";

	const diffMs = Math.max(0, currentTime - openTime);
	const totalMins = Math.floor(diffMs / (1000 * 60));
	const hours = Math.floor(totalMins / 60);
	const mins = totalMins % 60;

	if (hours === 0) return `${mins} мин`;
	return `${hours} ч ${mins} мин`;
}

/**
 * Сверка наличных в кассе (инкассация / Z-отчет):
 * Ожидаемый остаток = Начальный остаток + Внесения/Приход налом - Выплаты/Расход налом.
 * Сравнение с фактической суммой пересчета с точностью до копейки.
 */
export function reconcileShiftCounters(params: {
	readonly initialCashRub: number;
	readonly cashIncomeRub: number;
	readonly cashExpenseRub: number;
	readonly actualCashRub?: number | undefined;
}): CashboxReconciliationResult {
	const initKop = rubToKopecks(Math.max(0, params.initialCashRub || 0));
	const incomeKop = rubToKopecks(Math.max(0, params.cashIncomeRub || 0));
	const expenseKop = rubToKopecks(Math.max(0, params.cashExpenseRub || 0));

	const expectedKop = Math.max(0, initKop + incomeKop - expenseKop);
	const expectedCashRub = kopecksToRub(expectedKop);

	const actualProvided = typeof params.actualCashRub === "number" && !Number.isNaN(params.actualCashRub);
	const actualKop = actualProvided ? rubToKopecks(Math.max(0, params.actualCashRub!)) : expectedKop;
	const actualCashRub = kopecksToRub(actualKop);

	const discrepancyKop = actualKop - expectedKop;
	const discrepancyRub = kopecksToRub(Math.abs(discrepancyKop));
	const isBalanced = discrepancyKop === 0;

	let statusRu: "Сбалансировано" | "Излишек" | "Недостача" = "Сбалансировано";
	let descriptionRu = `Касса сходится копейка в копейку (${expectedCashRub.toLocaleString("ru-RU")} ₽)`;

	if (discrepancyKop > 0) {
		statusRu = "Излишек";
		descriptionRu = `Обнаружен излишек: +${discrepancyRub.toLocaleString("ru-RU")} ₽`;
	} else if (discrepancyKop < 0) {
		statusRu = "Недостача";
		descriptionRu = `Обнаружена недостача: -${discrepancyRub.toLocaleString("ru-RU")} ₽`;
	}

	return {
		expectedCashRub,
		expectedCashKop: expectedKop,
		actualCashRub,
		actualCashKop: actualKop,
		discrepancyRub: isBalanced ? 0 : (discrepancyKop < 0 ? -discrepancyRub : discrepancyRub),
		discrepancyKop,
		isBalanced,
		statusRu,
		descriptionRu,
	};
}

/**
 * Агрегация итогов смены по операциям.
 */
export function calculateShiftTotals(
	operations: ReadonlyArray<{
		readonly operationType: string;
		readonly amountRub: number;
		readonly method?: string | undefined;
	}>,
): {
	readonly totalIncomeRub: number;
	readonly totalExpenseRub: number;
	readonly cashIncomeRub: number;
	readonly cardIncomeRub: number;
	readonly sbpIncomeRub: number;
} {
	let cashIncKop = 0;
	let cardIncKop = 0;
	let sbpIncKop = 0;
	let expKop = 0;

	for (const op of operations) {
		const kop = rubToKopecks(op.amountRub || 0);
		if (op.operationType === "income") {
			if (op.method === "card") {
				cardIncKop += kop;
			} else if (op.method === "sbp") {
				sbpIncKop += kop;
			} else {
				cashIncKop += kop;
			}
		} else if (op.operationType === "expense" || op.operationType === "cash_out") {
			expKop += kop;
		}
	}

	const totalIncomeKop = cashIncKop + cardIncKop + sbpIncKop;

	return {
		totalIncomeRub: kopecksToRub(totalIncomeKop),
		totalExpenseRub: kopecksToRub(expKop),
		cashIncomeRub: kopecksToRub(cashIncKop),
		cardIncomeRub: kopecksToRub(cardIncKop),
		sbpIncomeRub: kopecksToRub(sbpIncKop),
	};
}
