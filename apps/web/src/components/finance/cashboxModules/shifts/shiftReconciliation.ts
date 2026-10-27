/**
 * shiftReconciliation.ts — Layer 2: Drawer Cash Reconciliation & Totals Aggregation.
 *
 * DENTE Dental CRM — Cash Register 54-FZ, Discounts & Staff Autonomy Operations.
 */

import { kopecksToRub, rubToKopecks } from "@dental/shared";
import type { CashboxReconciliationResult } from "../cashboxTypes.js";

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
