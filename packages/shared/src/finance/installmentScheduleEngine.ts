/**
 * installmentScheduleEngine.ts — Kopeck-Exact Stage Payments, 0% Installments & Overdue Debt Engine.
 * 
 * ФИНАНСОВЫЙ И НОРМАТИВНЫЙ КОНТУР:
 * • Расчеты строго в целых копейках (Kopecks) для 100% защиты от ошибок округления float.
 * • ГК РФ ст. 709 («Смета»), ст. 711 («Порядок оплаты»), ст. 819 («Кредит и рассрочка»).
 * • Закон РФ № 2300-1 ст. 37 («Порядок и формы оплаты выполненной работы»).
 * • 54-ФЗ (тег 1214: признак способа расчета 1 — предоплата 100%, 2 — предоплата, 3 — аванс, 4 — полный расчет).
 */

import {
	type Kopecks,
	formatKopecksRu,
	parseKopecks,
	rublesToKopecks,
	sumKopecks,
} from "../money.js";

export type ClinicalStageCategory = "surgery" | "orthopedics" | "therapy" | "orthodontics" | "hygiene";

export type InstallmentStageStatus = "paid" | "partially_paid" | "pending" | "overdue";

export interface ClinicalStagePaymentItem {
	readonly id: string;
	readonly stageNumber: number;
	readonly category: ClinicalStageCategory;
	readonly title: string;
	readonly code804n: string;
	readonly totalCostKopecks: Kopecks;
	readonly paidKopecks: Kopecks;
	readonly dueDateIso: string;
	readonly status: InstallmentStageStatus;
	readonly servicesCount: number;
	readonly notes?: string;
}

export interface InstallmentMonthSchedule {
	readonly monthIndex: number;
	readonly paymentDateIso: string;
	readonly amountKopecks: Kopecks;
	readonly isPaid: boolean;
	readonly isOverdue: boolean;
}

export interface PatientDebtSummary {
	readonly totalPlanCostKopecks: Kopecks;
	readonly totalPaidKopecks: Kopecks;
	readonly remainingDebtKopecks: Kopecks;
	readonly overdueDebtKopecks: Kopecks;
	readonly hasOverdueDebt: boolean;
	readonly hasDebt: boolean;
	readonly paidPercent: number;
	readonly formattedTotalCost: string;
	readonly formattedTotalPaid: string;
	readonly formattedRemainingDebt: string;
	readonly formattedOverdueDebt: string;
	readonly ndflRefund13PercentKopecks: Kopecks;
	readonly formattedNdflRefund: string;
}

/**
 * Calculates kopeck-exact debt summary from an array of clinical stages.
 */
export function calculatePatientDebtSummary(
	stages: readonly ClinicalStagePaymentItem[],
	currentDateIso: string = new Date().toISOString(),
): PatientDebtSummary {
	const currentMs = new Date(currentDateIso).getTime();

	const totalPlanCostKopecks = sumKopecks(stages.map((s) => s.totalCostKopecks));
	const totalPaidKopecks = sumKopecks(stages.map((s) => s.paidKopecks));

	const overdueStagesKop: Kopecks[] = [];
	for (const stage of stages) {
		const remainingStageKop = Math.max(0, stage.totalCostKopecks - stage.paidKopecks) as Kopecks;
		const dueMs = new Date(stage.dueDateIso).getTime();

		if (remainingStageKop > 0 && dueMs < currentMs) {
			overdueStagesKop.push(remainingStageKop);
		}
	}
	const overdueDebtKopecks = sumKopecks(overdueStagesKop);

	const remainingDebtKopecks = Math.max(
		0,
		totalPlanCostKopecks - totalPaidKopecks,
	) as Kopecks;

	const paidPercent =
		totalPlanCostKopecks > 0
			? Math.min(100, Math.round((totalPaidKopecks / totalPlanCostKopecks) * 100))
			: 100;

	// 13% NDFL tax deduction on paid amounts (limit 150 000 ₽ for standard, unlimited for high-tech surgery)
	const ndflRefund13PercentKopecks = Math.floor((totalPaidKopecks * 13) / 100) as Kopecks;

	return {
		totalPlanCostKopecks,
		totalPaidKopecks,
		remainingDebtKopecks,
		overdueDebtKopecks,
		hasOverdueDebt: overdueDebtKopecks > 0,
		hasDebt: remainingDebtKopecks > 0,
		paidPercent,
		formattedTotalCost: formatKopecksRu(totalPlanCostKopecks),
		formattedTotalPaid: formatKopecksRu(totalPaidKopecks),
		formattedRemainingDebt: formatKopecksRu(remainingDebtKopecks),
		formattedOverdueDebt: formatKopecksRu(overdueDebtKopecks),
		ndflRefund13PercentKopecks,
		formattedNdflRefund: formatKopecksRu(ndflRefund13PercentKopecks),
	};
}

/**
 * Splits remaining debt into exact kopeck installments across N months without losing single kopeck.
 * The remainder kopecks are added to the first payment.
 */
export function generate0PercentInstallmentSchedule(
	totalKopecks: Kopecks,
	monthsCount: 3 | 6 | 12 | 24,
	startDateIso: string = new Date().toISOString(),
): InstallmentMonthSchedule[] {
	if (monthsCount <= 0 || totalKopecks <= 0) {
		return [];
	}

	const baseAmountKop = Math.floor(totalKopecks / monthsCount) as Kopecks;
	const remainderKop = (totalKopecks - baseAmountKop * monthsCount) as Kopecks;

	const startDate = new Date(startDateIso);
	const nowMs = Date.now();
	const schedule: InstallmentMonthSchedule[] = [];

	for (let i = 0; i < monthsCount; i++) {
		const payDate = new Date(startDate);
		payDate.setMonth(payDate.getMonth() + i);

		// First month absorbs the remainder kopecks
		const amountKopecks = (i === 0 ? baseAmountKop + remainderKop : baseAmountKop) as Kopecks;

		schedule.push({
			monthIndex: i + 1,
			paymentDateIso: payDate.toISOString(),
			amountKopecks,
			isPaid: false,
			isOverdue: payDate.getTime() < nowMs,
		});
	}

	return schedule;
}

/**
 * Default preset for standard 300 000 ₽ Implant & Crown Stage Plan (Surgery 150k + Orthopedics 150k).
 */
export function createDefaultImplantStagesPreset(
	totalRubles: number = 300000,
	startDateIso: string = new Date().toISOString(),
): ClinicalStagePaymentItem[] {
	const totalKopecks = rublesToKopecks(totalRubles);
	const surgeryKopecks = Math.floor((totalKopecks * 50) / 100) as Kopecks;
	const orthoKopecks = (totalKopecks - surgeryKopecks) as Kopecks;

	const start = new Date(startDateIso);
	const orthoDate = new Date(start);
	orthoDate.setMonth(orthoDate.getMonth() + 3); // 3 months healing period after implant placement

	return [
		{
			id: "stage-implant-surgery-1",
			stageNumber: 1,
			category: "surgery",
			title: "Этап 1: Хирургический (Установка дентальных имплантатов + костная пластика НКР)",
			code804n: "A16.07.006.001",
			totalCostKopecks: surgeryKopecks,
			paidKopecks: parseKopecks(0),
			dueDateIso: start.toISOString(),
			status: "pending",
			servicesCount: 3,
			notes: "Установка имплантатов системы Osstem/Straumann, синус-лифтинг, мембрана и костный графт.",
		},
		{
			id: "stage-implant-ortho-2",
			stageNumber: 2,
			category: "orthopedics",
			title: "Этап 2: Ортопедический (Протезирование на имплантатах — циркониевые коронки)",
			code804n: "A16.07.004.002",
			totalCostKopecks: orthoKopecks,
			paidKopecks: parseKopecks(0),
			dueDateIso: orthoDate.toISOString(),
			status: "pending",
			servicesCount: 4,
			notes: "Индивидуальные титановые абатменты, цельноциркониевые коронки Prettau на винтовой фиксации.",
		},
	];
}

/**
 * Generates official friendly WhatsApp payment reminder message with exact kopeck debt amount.
 */
export function generateDebtPaymentReminderMessage(
	patientName: string,
	clinicName: string,
	summary: PatientDebtSummary,
	sbpQrUrl?: string,
): string {
	const debtText = summary.formattedRemainingDebt;
	const overdueNotice = summary.hasOverdueDebt
		? `\n⚠️ В том числе просрочено: ${summary.formattedOverdueDebt}`
		: "";

	const sbpLink = sbpQrUrl ? `\n\n📲 Быстрая оплата через СБП 0%: ${sbpQrUrl}` : "";

	return (
		`Здравствуйте, ${patientName}!\n\n` +
		`Напоминаем график платежей по вашему плану лечения в клинике ${clinicName}.\n` +
		`Общая стоимость плана: ${summary.formattedTotalCost}\n` +
		`Оплачено: ${summary.formattedTotalPaid} (${summary.paidPercent}%)\n` +
		`Остаток к оплате: ${debtText}${overdueNotice}` +
		`\n\nПри оплате на этапе лечения вам доступен возврат 13% НДФЛ (${summary.formattedNdflRefund}).` +
		`${sbpLink}\n\nЕсли у вас возникли вопросы, мы всегда на связи!`
	);
}
