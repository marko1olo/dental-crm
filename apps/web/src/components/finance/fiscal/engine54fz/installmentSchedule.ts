import { kopecksToRub, rubToKopecks } from "@dental/shared";
import type {
	InstallmentPlanScheduleResult,
	InstallmentStageItem,
} from "./types";

/**
 * Calculates a zero-interest clinic installment schedule
 * with exact integer kopecks arithmetic and down payment calculation.
 */
export function calculateInstallmentPlanSchedule(params: {
	readonly totalRub: number;
	readonly downPaymentPercent?: number | undefined; // Default: 30%
	readonly monthsCount?: number | undefined; // Default: 3 months
	readonly startDateIso?: string | undefined; // Default: today
	readonly planTitle?: string | undefined;
}): InstallmentPlanScheduleResult {
	const totalKopecks = rubToKopecks(params.totalRub);
	const downPaymentPercent = params.downPaymentPercent ?? 30;
	const monthsCount = Math.max(1, params.monthsCount ?? 3);
	const startDate = params.startDateIso ? new Date(params.startDateIso) : new Date();

	const downPaymentKopecks = Math.min(
		totalKopecks,
		Math.round((totalKopecks * downPaymentPercent) / 100),
	);
	const remainingDebtKopecks = Math.max(0, totalKopecks - downPaymentKopecks);

	const baseMonthlyKop = Math.floor(remainingDebtKopecks / monthsCount);
	const stages: InstallmentStageItem[] = [];

	stages.push({
		stageIndex: 0,
		title: params.planTitle
			? `Первый взнос (${downPaymentPercent}%): ${params.planTitle}`
			: `Первый взнос по рассрочке (${downPaymentPercent}%)`,
		dueDateIso: startDate.toISOString(),
		dueDateRu: startDate.toLocaleDateString("ru-RU"),
		amountRub: kopecksToRub(downPaymentKopecks),
		amountKopecks: downPaymentKopecks,
		paymentMethod: "prepayment",
		isInitialDownPayment: true,
		status: "pending",
	});

	let allocatedDebtKop = 0;
	for (let i = 1; i <= monthsCount; i++) {
		const monthDueDate = new Date(startDate);
		monthDueDate.setMonth(startDate.getMonth() + i);

		const isLastMonth = i === monthsCount;
		const stageKop = isLastMonth
			? remainingDebtKopecks - allocatedDebtKop
			: baseMonthlyKop;

		allocatedDebtKop += stageKop;

		stages.push({
			stageIndex: i,
			title: `Платеж ${i}/${monthsCount} по рассрочке`,
			dueDateIso: monthDueDate.toISOString(),
			dueDateRu: monthDueDate.toLocaleDateString("ru-RU"),
			amountRub: kopecksToRub(stageKop),
			amountKopecks: stageKop,
			paymentMethod: isLastMonth ? "full_payment" : "prepayment",
			isInitialDownPayment: false,
			status: "scheduled",
		});
	}

	const sumAllStagesKop = stages.reduce((acc, s) => acc + s.amountKopecks, 0);

	return {
		totalPlanRub: kopecksToRub(totalKopecks),
		totalPlanKopecks: totalKopecks,
		downPaymentPercent,
		downPaymentRub: kopecksToRub(downPaymentKopecks),
		downPaymentKopecks,
		remainingDebtRub: kopecksToRub(remainingDebtKopecks),
		remainingDebtKopecks,
		monthsCount,
		monthlyPaymentRub: kopecksToRub(baseMonthlyKop),
		monthlyPaymentKopecks: baseMonthlyKop,
		stages,
		isBalanced: sumAllStagesKop === totalKopecks,
	};
}
