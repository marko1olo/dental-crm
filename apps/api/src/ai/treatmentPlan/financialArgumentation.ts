/**
 * financialArgumentation.ts — Deterministic Financial Calculations (13% NDFL, Installments & Stages)
 */

import {
	kopecksToRubles,
	percentageOfKopecks,
	rublesToKopecks,
	splitKopecks,
	type TreatmentPlanValidationStage,
	type TreatmentPlanValidateAndCommentResponse,
} from "@dental/shared";

export function calculateDeterministicFinancialArgumentation(
	stages: readonly TreatmentPlanValidationStage[],
	installmentMonths = 12,
): TreatmentPlanValidateAndCommentResponse["financialArgumentation"] {
	const allItems = stages.flatMap((s) => s.items);
	const stageTotals = stages.map(
		(s) =>
			s.totalRub ||
			s.items.reduce((acc, it) => acc + (it.priceRub || 0), 0),
	);
	const totalRub = stageTotals.reduce((sum, val) => sum + val, 0);

	// Разделение по кодам НДФЛ:
	// Код 02 (Дорогостоящее лечение): Имплантация (A16.07.054), Костная пластика / Синус-лифтинг (A16.07.041), Сложное протезирование
	// Код 01 (Обычное лечение): Терапия, гигиена, обычные коронки, пломбы (лимит 150 000 ₽)
	let code02AmountRub = 0;
	let code01AmountRub = 0;

	if (allItems.length > 0) {
		for (const item of allItems) {
			const code = (item.code804n || "").trim().toUpperCase();
			const isExpensive =
				code.startsWith("A16.07.054") ||
				code.startsWith("A16.07.041") ||
				code.startsWith("A16.07.042") ||
				code.startsWith("A16.07.043") ||
				/имплант|синус|костн.*пласт|all-on-4|all-on-6|балочн/i.test(item.name);

			if (isExpensive) {
				code02AmountRub += item.priceRub || 0;
			} else {
				code01AmountRub += item.priceRub || 0;
			}
		}
	} else if (stages.length > 0 && totalRub > 0) {
		// Честный анализ названий этапов вместо слепого stageNumber === 2
		for (let i = 0; i < stages.length; i++) {
			const st = stages[i];
			const stTotal = stageTotals[i] ?? 0;
			const isExpensiveStage = /имплант|синус|костн.*пласт|all-on-4|all-on-6|хирург/i.test(st?.title ?? "");
			if (isExpensiveStage) {
				code02AmountRub += stTotal;
			} else {
				code01AmountRub += stTotal;
			}
		}
	}

	const code01Eligible = Math.min(code01AmountRub, 150000);
	const code01RefundRub = kopecksToRubles(percentageOfKopecks(rublesToKopecks(code01Eligible), 1300));
	const code02RefundRub = kopecksToRubles(percentageOfKopecks(rublesToKopecks(code02AmountRub), 1300));
	const totalRefundRub = code01RefundRub + code02RefundRub;
	const netPriceWithRefundRub = Math.max(0, totalRub - totalRefundRub);

	const ndflExplanation =
		`Государственный налоговый вычет 13% (ст. 219 НК РФ): вы вернете ${totalRefundRub.toLocaleString("ru-RU")} ₽. ` +
		(code02AmountRub > 0
			? `Дорогостоящее лечение (Код 02: имплантация, хирургический этап) дает возврат 13% со всей суммы без ограничений (${code02RefundRub.toLocaleString("ru-RU")} ₽), обычное лечение (Код 01) — ${code01RefundRub.toLocaleString("ru-RU")} ₽.`
			: `По обычному лечению (Код 01) возврат составляет 13% (до 19 500 ₽ в год).`);

	// Рассрочка 0% без переплат (3, 6, 12, 24 мес)
	const totalKop = rublesToKopecks(totalRub);
	const terms = [3, 6, 12, 24];
	const installments: Record<
		string,
		{
			months: number;
			monthlyPaymentRub: number;
			totalPaymentRub: number;
			overpaymentRub: 0;
		}
	> = {};
	for (const m of terms) {
		const splits = totalRub > 0 ? splitKopecks(totalKop, m) : [0];
		const monthly = totalRub > 0 ? kopecksToRubles(splits[0] ?? 0) : 0;
		installments[String(m)] = {
			months: m,
			monthlyPaymentRub: monthly,
			totalPaymentRub: totalRub,
			overpaymentRub: 0,
		};
	}

	// Честная динамическая генерация этапов по реальным услугам плана
	let stage1AdvanceRub = 0;
	let stage2SurgicalRub = 0;
	let stage3FinalRub = 0;
	let stagedExplanation = "";

	if (stages.length === 1) {
		stage1AdvanceRub = stageTotals[0] ?? totalRub;
		stage2SurgicalRub = 0;
		stage3FinalRub = 0;
		const stageName = stages[0]?.title || "Основной этап";
		stagedExplanation = `Оплата производится по факту завершения этапа «${stageName}»: ${stage1AdvanceRub.toLocaleString("ru-RU")} ₽.`;
	} else if (stages.length === 2) {
		stage1AdvanceRub = stageTotals[0] ?? 0;
		stage2SurgicalRub = stageTotals[1] ?? 0;
		stage3FinalRub = 0;
		const name1 = stages[0]?.title || "1 этап";
		const name2 = stages[1]?.title || "2 этап";
		stagedExplanation = `Оплата разделена на 2 клинических этапа: «${name1}» (${stage1AdvanceRub.toLocaleString("ru-RU")} ₽) и «${name2}» (${stage2SurgicalRub.toLocaleString("ru-RU")} ₽).`;
	} else if (stages.length === 3) {
		stage1AdvanceRub = stageTotals[0] ?? 0;
		stage2SurgicalRub = stageTotals[1] ?? 0;
		stage3FinalRub = stageTotals[2] ?? 0;
		const name1 = stages[0]?.title || "1 этап";
		const name2 = stages[1]?.title || "2 этап";
		const name3 = stages[2]?.title || "3 этап";
		stagedExplanation = `Оплата разделена на 3 клинических этапа: «${name1}» (${stage1AdvanceRub.toLocaleString("ru-RU")} ₽), «${name2}» (${stage2SurgicalRub.toLocaleString("ru-RU")} ₽) и «${name3}» (${stage3FinalRub.toLocaleString("ru-RU")} ₽).`;
	} else if (stages.length > 3) {
		stage1AdvanceRub = stageTotals[0] ?? 0;
		stage2SurgicalRub = stageTotals.slice(1, -1).reduce((sum, v) => sum + v, 0);
		stage3FinalRub = stageTotals[stages.length - 1] ?? 0;
		const name1 = stages[0]?.title || "Начальный этап";
		const nameLast = stages[stages.length - 1]?.title || "Завершающий этап";
		stagedExplanation = `Оплата разделена на ${stages.length} этапов: «${name1}» (${stage1AdvanceRub.toLocaleString("ru-RU")} ₽), промежуточные процедуры (${stage2SurgicalRub.toLocaleString("ru-RU")} ₽) и «${nameLast}» (${stage3FinalRub.toLocaleString("ru-RU")} ₽).`;
	} else {
		// Резервный случай для плана без этапов
		stage1AdvanceRub = kopecksToRubles(percentageOfKopecks(totalKop, 3000));
		stage2SurgicalRub = kopecksToRubles(percentageOfKopecks(totalKop, 4000));
		stage3FinalRub = Math.max(0, totalRub - stage1AdvanceRub - stage2SurgicalRub);
		stagedExplanation = `Оплата распределяется поэтапно по мере выполнения манипуляций: авансовый платёж 30% (${stage1AdvanceRub.toLocaleString("ru-RU")} ₽), основной этап 40% (${stage2SurgicalRub.toLocaleString("ru-RU")} ₽) и окончательный расчёт 30% (${stage3FinalRub.toLocaleString("ru-RU")} ₽).`;
	}

	return {
		totalRub,
		ndflDeduction: {
			code01AmountRub,
			code01RefundRub,
			code02AmountRub,
			code02RefundRub,
			totalRefundRub,
			netPriceWithRefundRub,
			explanation: ndflExplanation,
		},
		installments,
		stagedPaymentSchedule: {
			stage1AdvanceRub,
			stage2SurgicalRub,
			stage3FinalRub,
			explanation: stagedExplanation,
		},
	};
}
