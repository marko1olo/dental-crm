/**
 * managerialPnlEngine.ts — Statutory Dental Managerial P&L Engine.
 *
 * ФИНАНСОВЫЙ И НОРМАТИВНЫЙ КОНТУР:
 * • Построен строго на 6 кассовых счетах (`cash_boxes`) и 12 канонических статьях расхода (`cash_expense_reasons`).
 * • Расчеты строго в рублях и копейках без псевдонаучных диорам и абстрактных симуляций.
 * • Формирует прозрачный отчет о прибылях и убытках:
 *   Валовая выручка (Gross Revenue) -> Себестоимость лечения (COGS) ->
 *   Валовая прибыль (Gross Profit) -> Операционные расходы (OPEX) -> EBITDA ->
 *   Налоги -> Чистая прибыль (Net Profit).
 */

import { z } from "zod";

export type ClinicalSpecialtyDepartment =
	| "therapy"
	| "orthopedics"
	| "surgery"
	| "orthodontics"
	| "hygiene"
	| "pediatric"
	| "diagnostic";

export const DEPARTMENT_METADATA_RU: Record<
	ClinicalSpecialtyDepartment,
	{ label: string; code: string; color: string }
> = {
	therapy: { label: "Терапия и эндодонтия", code: "THERAPY", color: "#3b82f6" },
	orthopedics: { label: "Ортопедия (протезирование ЗТЛ)", code: "ORTHO", color: "#8b5cf6" },
	surgery: { label: "Хирургия и имплантация", code: "SURGERY", color: "#ef4444" },
	orthodontics: { label: "Ортодонтия (брекеты/элайнеры)", code: "BRACES", color: "#f59e0b" },
	hygiene: { label: "Профгигиена и пародонтология", code: "HYGIENE", color: "#10b981" },
	pediatric: { label: "Детская стоматология", code: "PEDIA", color: "#ec4899" },
	diagnostic: { label: "Рентген-диагностика / КЛКТ", code: "DIAG", color: "#6366f1" },
};

export interface DepartmentRevenueItem {
	department: ClinicalSpecialtyDepartment;
	titleRu: string;
	revenueRub: number;
	sharePct: number; // Доля в выручке %
	servicesCount: number;
	averageBillRub: number;
}

export interface StatutoryExpenseRow {
	reasonId: number; // 1..12
	titleRu: string;
	isLocked: boolean; // 1 = Зарплата, 8 = Подотчет, 11 = Лаборатория
	amountRub: number;
	shareOfExpensesPct: number; // Доля в расходах %
	costNature: "direct_cogs" | "opex" | "taxes";
}

export interface CashBoxRevenueItem {
	boxId: string;
	boxName: string;
	boxType: "main" | "extra" | "cashless" | "dms" | "account" | "expenses";
	revenueRub: number;
	sharePct: number;
	paymentsCount: number;
}

export interface ManagerialPnlReport {
	period: {
		from: string; // ISO / YYYY-MM-DD
		to: string;   // ISO / YYYY-MM-DD
	};
	clinicName: string;

	// 1. Доходная часть
	grossRevenueRub: number;
	departmentRevenue: DepartmentRevenueItem[];
	cashBoxRevenue: CashBoxRevenueItem[];

	// 2. Себестоимость лечения (COGS - Direct Medical Costs)
	directLabCostRub: number;       // Статья 11 (ЗТЛ)
	directMaterialsCostRub: number;   // Статьи 4, 5 (Материалы)
	directDoctorPieceRateRub: number; // Сдельный ФОТ врачей от выручки
	totalCogsRub: number;
	grossProfitRub: number;
	grossMarginPct: number;

	// 3. Операционные расходы (OPEX)
	statutoryExpenses: StatutoryExpenseRow[];
	totalOpexRub: number;

	// 4. Финансовые итоги
	ebitdaRub: number;
	ebitdaMarginPct: number;
	taxesRub: number; // Статья 2 (Налоги)
	netProfitRub: number;
	netMarginPct: number;

	isProfitable: boolean;
	totalExpensesRub: number;
}

export interface CalculateManagerialPnlInput {
	period: { from: string; to: string };
	clinicName?: string;
	payments: Array<{
		amountRub: number;
		department?: ClinicalSpecialtyDepartment | string;
		cashBoxType?: "main" | "extra" | "cashless" | "dms" | "account" | "expenses";
		cashBoxId?: string;
		cashBoxName?: string;
	}>;
	expenses: Array<{
		reasonId: number;
		amountRub: number;
		reasonName?: string;
	}>;
	doctorPieceRatePayrollRub?: number;
}

/**
 * Канонический расчет управленческого P&L стоматологической клиники.
 */
export function calculateManagerialPnl(input: CalculateManagerialPnlInput): ManagerialPnlReport {
	// 1. Агрегация выручки по направлениям
	const deptSums: Record<ClinicalSpecialtyDepartment, { sum: number; count: number }> = {
		therapy: { sum: 0, count: 0 },
		orthopedics: { sum: 0, count: 0 },
		surgery: { sum: 0, count: 0 },
		orthodontics: { sum: 0, count: 0 },
		hygiene: { sum: 0, count: 0 },
		pediatric: { sum: 0, count: 0 },
		diagnostic: { sum: 0, count: 0 },
	};

	// Агрегация по кассам
	const boxSums: Record<string, { name: string; type: any; sum: number; count: number }> = {};

	let grossRevenueRub = 0;

	for (const p of input.payments) {
		const amt = Math.max(0, p.amountRub);
		grossRevenueRub += amt;

		// Направление
		let deptKey: ClinicalSpecialtyDepartment = "therapy";
		if (p.department && p.department in deptSums) {
			deptKey = p.department as ClinicalSpecialtyDepartment;
		}
		deptSums[deptKey].sum += amt;
		deptSums[deptKey].count += 1;

		// Касса
		const bId = p.cashBoxId || p.cashBoxType || "cashless";
		const bName = p.cashBoxName || (p.cashBoxType === "main" ? "Основная касса (наличные)" : "Безналичный эквайринг");
		if (!boxSums[bId]) {
			boxSums[bId] = { name: bName, type: p.cashBoxType || "cashless", sum: 0, count: 0 };
		}
		boxSums[bId].sum += amt;
		boxSums[bId].count += 1;
	}

	grossRevenueRub = Number(grossRevenueRub.toFixed(2));

	const departmentRevenue: DepartmentRevenueItem[] = (
		Object.keys(deptSums) as ClinicalSpecialtyDepartment[]
	).map((dept) => {
		const info = deptSums[dept];
		const sum = Number(info.sum.toFixed(2));
		return {
			department: dept,
			titleRu: DEPARTMENT_METADATA_RU[dept].label,
			revenueRub: sum,
			sharePct: grossRevenueRub > 0 ? Number(((sum / grossRevenueRub) * 100).toFixed(1)) : 0,
			servicesCount: info.count,
			averageBillRub: info.count > 0 ? Math.round(sum / info.count) : 0,
		};
	});

	const cashBoxRevenue: CashBoxRevenueItem[] = Object.entries(boxSums).map(([bId, b]) => {
		const sum = Number(b.sum.toFixed(2));
		return {
			boxId: bId,
			boxName: b.name,
			boxType: b.type,
			revenueRub: sum,
			sharePct: grossRevenueRub > 0 ? Number(((sum / grossRevenueRub) * 100).toFixed(1)) : 0,
			paymentsCount: b.count,
		};
	});

	// 2. Агрегация расходов по 12 регламентированным статьям StomX
	const STATUTORY_NAMES: Record<number, { name: string; isLocked: boolean; costNature: "direct_cogs" | "opex" | "taxes" }> = {
		1: { name: "Зарплата врачей и персонала", isLocked: true, costNature: "direct_cogs" },
		2: { name: "Налоги и сборы", isLocked: false, costNature: "taxes" },
		3: { name: "Оплата канцелярии", isLocked: false, costNature: "opex" },
		4: { name: "Оплата комплектации и расходных материалов", isLocked: false, costNature: "direct_cogs" },
		5: { name: "Оплата материалов / работ", isLocked: false, costNature: "direct_cogs" },
		6: { name: "Оплата расходов по рекламе и маркетингу", isLocked: false, costNature: "opex" },
		7: { name: "Оплата расходов по услугам связи", isLocked: false, costNature: "opex" },
		8: { name: "Средства под отчет", isLocked: true, costNature: "opex" },
		9: { name: "Транспортные расходы", isLocked: false, costNature: "opex" },
		10: { name: "Хозяйственные нужды", isLocked: false, costNature: "opex" },
		11: { name: "Оплата услуг лаборатории (ЗТЛ)", isLocked: true, costNature: "direct_cogs" },
		12: { name: "Аренда помещения", isLocked: false, costNature: "opex" },
		100: { name: "Аренда помещения", isLocked: false, costNature: "opex" },
	};

	const expenseSums: Record<number, number> = {
		1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0,
	};

	let totalExpensesRub = 0;

	for (const e of input.expenses) {
		const amt = Math.max(0, e.amountRub);
		const normalizedId = e.reasonId === 100 ? 12 : e.reasonId;
		if (normalizedId in expenseSums) {
			expenseSums[normalizedId] = (expenseSums[normalizedId] || 0) + amt;
		}
		totalExpensesRub += amt;
	}

	// Если передан расчетный ФОТ врачей от сделки и он выше записанного в кассе
	const currentSalaryExpense = expenseSums[1] ?? 0;
	if (input.doctorPieceRatePayrollRub && input.doctorPieceRatePayrollRub > currentSalaryExpense) {
		const diff = input.doctorPieceRatePayrollRub - currentSalaryExpense;
		expenseSums[1] = input.doctorPieceRatePayrollRub;
		totalExpensesRub += diff;
	}

	totalExpensesRub = Number(totalExpensesRub.toFixed(2));

	const statutoryExpenses: StatutoryExpenseRow[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((id) => {
		const meta = STATUTORY_NAMES[id] || { name: `Статья ${id}`, isLocked: false, costNature: "opex" as const };
		const amt = Number((expenseSums[id] || 0).toFixed(2));
		return {
			reasonId: id,
			titleRu: meta.name,
			isLocked: meta.isLocked,
			amountRub: amt,
			shareOfExpensesPct: totalExpensesRub > 0 ? Number(((amt / totalExpensesRub) * 100).toFixed(1)) : 0,
			costNature: meta.costNature,
		};
	});

	// 3. Расчет себестоимости лечения (COGS)
	const directLabCostRub = Number((expenseSums[11] || 0).toFixed(2));
	const directMaterialsCostRub = Number(((expenseSums[4] || 0) + (expenseSums[5] || 0)).toFixed(2));
	const directDoctorPieceRateRub = Number((expenseSums[1] || 0).toFixed(2));
	const totalCogsRub = Number((directLabCostRub + directMaterialsCostRub + directDoctorPieceRateRub).toFixed(2));

	const grossProfitRub = Number((grossRevenueRub - totalCogsRub).toFixed(2));
	const grossMarginPct = grossRevenueRub > 0
		? Number(((grossProfitRub / grossRevenueRub) * 100).toFixed(1))
		: 0;

	// 4. Операционные затраты (OPEX)
	const opexReasons = [3, 6, 7, 8, 9, 10, 12];
	const totalOpexRub = Number(
		opexReasons.reduce((acc, rId) => acc + (expenseSums[rId] || 0), 0).toFixed(2)
	);

	// 5. EBITDA и Чистая прибыль
	const ebitdaRub = Number((grossProfitRub - totalOpexRub).toFixed(2));
	const ebitdaMarginPct = grossRevenueRub > 0
		? Number(((ebitdaRub / grossRevenueRub) * 100).toFixed(1))
		: 0;

	const taxesRub = Number((expenseSums[2] || 0).toFixed(2));
	const netProfitRub = Number((ebitdaRub - taxesRub).toFixed(2));
	const netMarginPct = grossRevenueRub > 0
		? Number(((netProfitRub / grossRevenueRub) * 100).toFixed(1))
		: 0;

	return {
		period: input.period,
		clinicName: input.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		grossRevenueRub,
		departmentRevenue,
		cashBoxRevenue,
		directLabCostRub,
		directMaterialsCostRub,
		directDoctorPieceRateRub,
		totalCogsRub,
		grossProfitRub,
		grossMarginPct,
		statutoryExpenses,
		totalOpexRub,
		ebitdaRub,
		ebitdaMarginPct,
		taxesRub,
		netProfitRub,
		netMarginPct,
		isProfitable: netProfitRub >= 0,
		totalExpensesRub,
	};
}
