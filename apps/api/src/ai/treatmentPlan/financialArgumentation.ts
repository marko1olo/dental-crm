/**
 * financialArgumentation.ts — Deterministic Financial Calculations (13% NDFL, Installments & Stages)
 */

import type {
	TreatmentPlanValidationStage,
	TreatmentPlanValidateAndCommentResponse,
} from "@dental/shared";

export function calculateDeterministicFinancialArgumentation(
	stages: readonly TreatmentPlanValidationStage[],
	installmentMonths = 12,
): TreatmentPlanValidateAndCommentResponse["financialArgumentation"] {
	const allItems = stages.flatMap((s) => s.items);
	const totalRub = stages.reduce(
		(sum, s) =>
			sum +
			(s.totalRub ||
				s.items.reduce((acc, it) => acc + (it.priceRub || 0), 0)),
		0,
	);

	// Разделение по кодам НДФЛ:
	// Код 02 (Дорогостоящее лечение): Имплантация (A16.07.054), Костная пластика / Синус-лифтинг (A16.07.041), Сложное протезирование (All-on-4/6)
	// Код 01 (Обычное лечение): Терапия, гигиена, обычные коронки, пломбы (лимит 150 000 ₽)
	let code02AmountRub = 0;
	let code01AmountRub = 0;

	for (const item of allItems) {
		const code = (item.code804n || "").trim().toUpperCase();
		const isExpensive =
			code.startsWith("A16.07.054") ||
			code.startsWith("A16.07.041") ||
			/имплант|синус|костн.*пласт|all-on-4|all-on-6|балочн/i.test(item.name);

		if (isExpensive) {
			code02AmountRub += item.priceRub || 0;
		} else {
			code01AmountRub += item.priceRub || 0;
		}
	}

	// Если не было расписано по услугам, используем деление по этапам
	if (code01AmountRub === 0 && code02AmountRub === 0 && totalRub > 0) {
		const stage2 = stages.find((s) => s.stageNumber === 2)?.totalRub || 0;
		code02AmountRub = stage2;
		code01AmountRub = Math.max(0, totalRub - stage2);
	}

	const code01Eligible = Math.min(code01AmountRub, 150000);
	const code01RefundRub = Math.round((code01Eligible * 13) / 100);
	const code02RefundRub = Math.round((code02AmountRub * 13) / 100);
	const totalRefundRub = code01RefundRub + code02RefundRub;
	const netPriceWithRefundRub = Math.max(0, totalRub - totalRefundRub);

	const ndflExplanation =
		`Государственный налоговый вычет 13% (ст. 219 НК РФ): вы вернете ${totalRefundRub.toLocaleString("ru-RU")} ₽. ` +
		(code02AmountRub > 0
			? `Дорогостоящее лечение (Код 02: имплантация, костная пластика) дает возврат 13% со всей суммы без ограничений (${code02RefundRub.toLocaleString("ru-RU")} ₽), обычное лечение (Код 01) — ${code01RefundRub.toLocaleString("ru-RU")} ₽.`
			: `По обычному лечению (Код 01) возврат составляет до 19 500 ₽ в год.`);

	// Рассрочка 0% без переплат (3, 6, 12, 24 мес)
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
		const monthly = totalRub > 0 ? Math.round(totalRub / m) : 0;
		installments[String(m)] = {
			months: m,
			monthlyPaymentRub: monthly,
			totalPaymentRub: totalRub,
			overpaymentRub: 0,
		};
	}

	// Поэтапная оплата (30% аванс / 40% хирургия / 30% финал)
	const stage1AdvanceRub = Math.round((totalRub * 30) / 100);
	const stage2SurgicalRub = Math.round((totalRub * 40) / 100);
	const stage3FinalRub = Math.max(
		0,
		totalRub - stage1AdvanceRub - stage2SurgicalRub,
	);

	const stagedExplanation = `Оплата разбивается на 3 комфортных этапа: 30% (${stage1AdvanceRub.toLocaleString("ru-RU")} ₽) при старте лечения, 40% (${stage2SurgicalRub.toLocaleString("ru-RU")} ₽) на хирургическом этапе и остаток 30% (${stage3FinalRub.toLocaleString("ru-RU")} ₽) при финальной фиксации постоянных конструкций.`;

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
