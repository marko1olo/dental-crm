/**
 * Clinic Lost Revenue & ROI Calculator for DENTE Trojan Closer Engine.
 *
 * Implements rigorous unit economics for private dental clinics:
 * 1. Abandoned treatment estimates (пациенты ушедшие "подумать").
 * 2. Unfilled cancellation windows (горящие окна и отмены в день приёма).
 * 3. Missed preventive checkups (пациенты не вернувшиеся на профгигиену и чекап).
 *
 * Features strictly realistic benchmarks (25-40% recovery, NEVER 100% fairy tales),
 * multi-tier scenarios (conservative, expected, optimistic), and executive summary.
 */

import { z } from "zod";
import { rubToKopecks } from "../fiscal/kopecksArithmetic.js";

export const clinicLostRevenueInputSchema = z.object({
	/** Количество первичных консультаций в месяц */
	monthlyNewConsultations: z.number().int().positive().default(100),
	/** Доля нереализованных смет (ушедших думать без записи на продолжение лечения, 0..1) */
	abandonedEstimateRate: z.number().min(0).max(1).default(0.65),
	/** Средняя стоимость брошенного комплексного плана лечения (руб.) */
	averageEstimateSum: z.number().positive().default(90_000),
	/** Среднее число отмен / простоев кресла в рабочий день */
	cancelledVisitsPerDay: z.number().min(0).default(1.8),
	/** Средняя стоимость потерянного часа / приёма (руб.) */
	averageSlotValue: z.number().positive().default(5_000),
	/** Рабочих дней клиники в месяц */
	workingDaysPerMonth: z.number().int().positive().default(26),
	/** Общий пул активных пациентов за последние 1.5-2 года */
	totalActivePatientBase: z.number().int().positive().default(2_500),
	/** Текущая естественная доходимость до профосмотра без автоматизации (0..1) */
	annualRecallRateWithoutBot: z.number().min(0).max(1).default(0.18),
	/** Средний чек профилактического визита (осмотр + профгигиена, руб.) */
	averageRecallTicket: z.number().positive().default(6_500),
	/** Доля пациентов на профосмотре, у которых выявляется необходимость лечения кариеса/замены пломб/коронок (0..1) */
	secondaryTreatmentFromRecallRate: z.number().min(0).max(1).default(0.35),
	/** Средний чек вторичного лечения, найденного на чекапе (руб.) */
	averageSecondaryTreatmentValue: z.number().positive().default(28_000),
	/** Ежемесячная стоимость подписки на систему автоматизации реколла и дожима смет (руб.) */
	automationMonthlyCostRub: z.number().nonnegative().default(19_900),
	/** Legacy alias для обратной совместимости */
	trojanBotMonthlyCost: z.number().nonnegative().optional(),
});

export type ClinicLostRevenueInput = z.infer<typeof clinicLostRevenueInputSchema>;

export interface RevenueScenarioResult {
	abandonedEstimatesRecovered: number;
	emptySlotsRecovered: number;
	recallsRecovered: number;
	totalMonthlyRecovered: number;
	totalMonthlyRecoveredKopecks?: number;
	totalAnnualRecovered: number;
	netMonthlyGain: number;
	netMonthlyGainKopecks?: number;
	roiPercentage: number;
	paybackPeriodDays: number;
	returnOnEveryRuble: number;
}

export interface ClinicLostRevenueAnalysis {
	input: ClinicLostRevenueInput;
	monthlyLosses: {
		abandonedEstimatesRub: number;
		abandonedEstimatesCount: number;
		emptySlotsRub: number;
		emptySlotsCount: number;
		missedRecallsRub: number;
		missedRecallsCount: number;
		totalMonthlyLossRub: number;
		totalMonthlyLossKopecks?: number;
	};
	annualLossRub: number;
	scenarios: {
		conservative: RevenueScenarioResult;
		expected: RevenueScenarioResult;
		optimistic: RevenueScenarioResult;
	};
	executiveSummaryRu: string;
}

/**
 * Реалистичные коэффициенты дожима (без сказок и шарлатанства).
 */
export const CLOSER_BENCHMARKS = {
	conservative: {
		estimateCloserRate: 0.22, // 22% дожима брошенных смет
		slotFillRate: 0.55,       // 55% закрытия дыр в расписании горящим листом ожидания
		recallBoostRate: 0.24,    // +24% к возвращаемости на гигиену
	},
	expected: {
		estimateCloserRate: 0.32, // 32% дожима брошенных смет
		slotFillRate: 0.72,       // 72% закрытия окон
		recallBoostRate: 0.38,    // +38% к возвращаемости
	},
	optimistic: {
		estimateCloserRate: 0.42, // 42% дожима брошенных смет
		slotFillRate: 0.85,       // 85% закрытия окон
		recallBoostRate: 0.52,    // +52% к возвращаемости
	},
} as const;

/**
 * Расчет упущенной выгоды и окупаемости внедрения Trojan Closer Bot.
 */
export function calculateClinicLostRevenue(
	rawInput: Partial<ClinicLostRevenueInput> = {},
): ClinicLostRevenueAnalysis {
	const parsed = clinicLostRevenueInputSchema.parse(rawInput);
	const automationCostRub = parsed.trojanBotMonthlyCost !== undefined
		? parsed.trojanBotMonthlyCost
		: parsed.automationMonthlyCostRub;
	const input: ClinicLostRevenueInput = {
		...parsed,
		automationMonthlyCostRub: automationCostRub,
		trojanBotMonthlyCost: automationCostRub,
	};

	// 1. Потери от брошенных первичных смет в месяц
	const monthlyAbandonedEstimatesCount = Math.round(
		input.monthlyNewConsultations * input.abandonedEstimateRate,
	);
	const monthlyAbandonedEstimatesRub =
		monthlyAbandonedEstimatesCount * input.averageEstimateSum;

	// 2. Потери от пустых окон в деньгах в месяц
	const monthlyEmptySlotsCount = Math.round(
		input.cancelledVisitsPerDay * input.workingDaysPerMonth,
	);
	const monthlyEmptySlotsRub = monthlyEmptySlotsCount * input.averageSlotValue;

	// 3. Потери от неявившихся на профосмотр в месяц (база / 12 месяцев)
	// Сколько пациентов в месяц должны приходить на 6-месячный осмотр (полный пул за год = база пациентов)
	const monthlyDueRecalls = Math.round(input.totalActivePatientBase / 12);
	const monthlyLostRecallsCount = Math.round(
		monthlyDueRecalls * (1 - input.annualRecallRateWithoutBot),
	);
	const recallUnitLifetimeValue =
		input.averageRecallTicket +
		input.secondaryTreatmentFromRecallRate * input.averageSecondaryTreatmentValue;
	const monthlyMissedRecallsRub =
		monthlyLostRecallsCount * recallUnitLifetimeValue;

	const totalMonthlyLossRub =
		monthlyAbandonedEstimatesRub + monthlyEmptySlotsRub + monthlyMissedRecallsRub;
	const annualLossRub = totalMonthlyLossRub * 12;

	// Функция расчета сценария
	const buildScenario = (benchmarks: {
		estimateCloserRate: number;
		slotFillRate: number;
		recallBoostRate: number;
	}): RevenueScenarioResult => {
		const estimatesRecovered = Math.round(
			monthlyAbandonedEstimatesRub * benchmarks.estimateCloserRate,
		);
		const slotsRecovered = Math.round(
			monthlyEmptySlotsRub * benchmarks.slotFillRate,
		);
		const recallsRecovered = Math.round(
			monthlyMissedRecallsRub * benchmarks.recallBoostRate,
		);
		const totalMonthlyRecovered =
			estimatesRecovered + slotsRecovered + recallsRecovered;
		const totalAnnualRecovered = totalMonthlyRecovered * 12;

		const netMonthlyGain = Math.max(
			0,
			totalMonthlyRecovered - automationCostRub,
		);
		const roiPercentage =
			automationCostRub > 0
				? Math.round((netMonthlyGain / automationCostRub) * 100)
				: 9999;

		// Срок окупаемости в днях (исходя из дневного возврата выручки)
		const dailyRecovered = totalMonthlyRecovered / input.workingDaysPerMonth;
		const paybackPeriodDays =
			dailyRecovered > 0
				? Number((automationCostRub / dailyRecovered).toFixed(1))
				: 999;

		const returnOnEveryRuble =
			automationCostRub > 0
				? Number((totalMonthlyRecovered / automationCostRub).toFixed(1))
				: 999;

		return {
			abandonedEstimatesRecovered: estimatesRecovered,
			emptySlotsRecovered: slotsRecovered,
			recallsRecovered: recallsRecovered,
			totalMonthlyRecovered,
			totalMonthlyRecoveredKopecks: rubToKopecks(totalMonthlyRecovered),
			totalAnnualRecovered,
			netMonthlyGain,
			netMonthlyGainKopecks: rubToKopecks(netMonthlyGain),
			roiPercentage,
			paybackPeriodDays,
			returnOnEveryRuble,
		};
	};

	const conservative = buildScenario(CLOSER_BENCHMARKS.conservative);
	const expected = buildScenario(CLOSER_BENCHMARKS.expected);
	const optimistic = buildScenario(CLOSER_BENCHMARKS.optimistic);

	const fmt = (num: number) => num.toLocaleString("ru-RU");

	const executiveSummaryRu = [
		`📊 ЭКСПРЕСС-АУДИТ УПУЩЕННОЙ ВЫРУЧКИ КЛИНИКИ:`,
		`• Текущие ежемесячные потери сквозь пальцы: ${fmt(totalMonthlyLossRub)} ₽/мес (или ${fmt(annualLossRub)} ₽/год).`,
		`  - Брошенные сметы (${monthlyAbandonedEstimatesCount} пац./мес): ${fmt(monthlyAbandonedEstimatesRub)} ₽`,
		`  - Дыры и простои в расписании (${monthlyEmptySlotsCount} окон/мес): ${fmt(monthlyEmptySlotsRub)} ₽`,
		`  - Забытые профосмотры и вторичный кариес (${monthlyLostRecallsCount} пац./мес): ${fmt(monthlyMissedRecallsRub)} ₽`,
		``,
		`🎯 ПРОГНОЗ ВОЗВРАТА ВЫРУЧКИ ЧЕРЕЗ АВТОМАТИЗАЦИЮ РЕКОЛЛА И ДЕЛИВЕРИ (РЕАЛИСТИЧНЫЙ СЦЕНАРИЙ):`,
		`• Возврат выручки в кассу: +${fmt(expected.totalMonthlyRecovered)} ₽ в месяц (+${fmt(expected.totalAnnualRecovered)} ₽ в год).`,
		`• Чистая прибыль клиники сверх затрат: +${fmt(expected.netMonthlyGain)} ₽/мес.`,
		`• Инвестиция в модуль: ${fmt(automationCostRub)} ₽/мес.`,
		`• Срок полной окупаемости: ${expected.paybackPeriodDays} раб. дн.`,
		`• ROI: ${expected.roiPercentage}% (каждый вложенный рубль возвращает ${expected.returnOnEveryRuble} ₽ выручки).`,
	].join("\n");

	return {
		input,
		monthlyLosses: {
			abandonedEstimatesRub: monthlyAbandonedEstimatesRub,
			abandonedEstimatesCount: monthlyAbandonedEstimatesCount,
			emptySlotsRub: monthlyEmptySlotsRub,
			emptySlotsCount: monthlyEmptySlotsCount,
			missedRecallsRub: monthlyMissedRecallsRub,
			missedRecallsCount: monthlyLostRecallsCount,
			totalMonthlyLossRub,
			totalMonthlyLossKopecks: rubToKopecks(totalMonthlyLossRub),
		},
		annualLossRub,
		scenarios: {
			conservative,
			expected,
			optimistic,
		},
		executiveSummaryRu,
	};
}
