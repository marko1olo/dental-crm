/**
 * managerialPnlEngine.ts — Statutory Dental Managerial P&L Engine.
 *
 * ФИНАНСОВЫЙ И НОРМАТИВНЫЙ КОНТУР:
 * • Построен строго на 6 кассовых счетах (`cash_boxes`) и 12 канонических статьях расхода (`cash_expense_reasons`).
 * • Расчеты строго в копейках без потери точности (zero float drift).
 * • Формирует прозрачный отчет о прибылях и убытках:
 *   Валовая выручка (Gross Revenue) -> Себестоимость лечения (COGS) ->
 *   Валовая прибыль (Gross Profit) -> Операционные расходы (OPEX) -> EBITDA ->
 *   Налоги -> Чистая прибыль (Net Profit).
 * • Включает расчет точки безубыточности (Break-Even Point, CVP-анализ)
 *   и юнит-экономику кресел клиники.
 */

import { z } from "zod";
import { kopecksToRub, rubToKopecks } from "../fiscal/kopecksArithmetic.js";

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
	directCostsRub: number; // Прямая себестоимость направления (материалы, ЗТЛ, ФОТ)
	marginRub: number;      // Маржинальный доход (выручка - прямые затраты)
	marginPct: number;      // Маржинальность направления (%)
}

export interface StatutoryExpenseRow {
	reasonId: number; // 1..12
	titleRu: string;
	isLocked: boolean; // 1 = Зарплата, 8 = Подотчет, 11 = Лаборатория
	amountRub: number;
	shareOfExpensesPct: number; // Доля в расходах %
	costNature: "direct_cogs" | "opex" | "taxes";
}

export type CashBoxKind = "main" | "extra" | "cashless" | "dms" | "account" | "expenses";

export interface CashBoxRevenueItem {
	boxId: string;
	boxName: string;
	boxType: CashBoxKind;
	revenueRub: number;
	sharePct: number;
	paymentsCount: number;
}

/**
 * Точка безубыточности стоматологической практики (CVP Break-Even Analysis).
 */
export interface BreakEvenAnalysis {
	fixedCostsRub: number;           // Постоянные расходы (Аренда, оклады, коммуналка, связь, амортизация)
	variableCostsRub: number;        // Переменные расходы (Материалы, ЗТЛ, сдельная оплата врачей)
	contributionMarginRub: number;   // Маржинальная прибыль (Выручка - Переменные расходы)
	contributionMarginRatio: number; // Коэффициент маржинального дохода (CM / Revenue)
	breakEvenRevenueRub: number;     // Точка безубыточности в деньгах: FixedCosts / CMRatio
	breakEvenVisitsCount: number;    // Точка безубыточности в визитах/пациентах
	marginOfSafetyRub: number;       // Запас финансовой прочности в рублях
	marginOfSafetyPct: number;       // Запас финансовой прочности в %
	isBreakEvenReached: boolean;     // Достигнута ли точка безубыточности
}

/**
 * Юнит-экономика отдельного стоматологического кресла.
 */
export interface ChairUnitEconomicsItem {
	chairId: string;
	chairName: string;
	roomName?: string | undefined;
	operatingHours: number;
	occupiedHours: number;
	occupancyRatePct: number;
	revenueRub: number;
	costRub: number;
	profitRub: number;
}

/**
 * Сводная юнит-экономика кресел клиники.
 */
export interface ChairEconomicsSummary {
	activeChairsCount: number;
	totalOperatingHours: number;
	totalOccupiedHours: number;
	chairOccupancyRatePct: number;
	costPerAvailableChairHourRub: number;
	costPerOccupiedChairHourRub: number;
	revenuePerChairRub: number;
	profitPerChairRub: number;
	chairs: ChairUnitEconomicsItem[];
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

	// 5. CVP Анализ точки безубыточности
	breakEven: BreakEvenAnalysis;

	// 6. Юнит-экономика кресел
	chairEconomics: ChairEconomicsSummary;
}

export interface ChairInputItem {
	chairId: string;
	chairName: string;
	roomName?: string | undefined;
	operatingHours?: number;
	occupiedHours?: number;
	revenueRub?: number;
}

export interface ChairEconomicsConfig {
	activeChairsCount?: number;
	operatingDays?: number;
	operatingHoursPerDay?: number;
	occupiedHours?: number;
	chairs?: ChairInputItem[];
}

export interface CalculateManagerialPnlInput {
	period: { from: string; to: string };
	clinicName?: string;
	payments: Array<{
		amountRub: number;
		department?: ClinicalSpecialtyDepartment | string;
		cashBoxType?: CashBoxKind;
		cashBoxId?: string;
		cashBoxName?: string;
	}>;
	expenses: Array<{
		reasonId: number;
		amountRub: number;
		reasonName?: string;
	}>;
	doctorPieceRatePayrollRub?: number;
	departmentDirectCosts?: Partial<Record<ClinicalSpecialtyDepartment, number>>;
	chairEconomics?: ChairEconomicsConfig;
}

/**
 * Канонический расчет управленческого P&L стоматологической клиники.
 * Все расчеты выполняются в целочисленных копейках (zero float drift).
 */
export function calculateManagerialPnl(input: CalculateManagerialPnlInput): ManagerialPnlReport {
	// 1. Агрегация выручки по направлениям (в копейках)
	const deptSumsKop: Record<ClinicalSpecialtyDepartment, { sumKop: number; count: number }> = {
		therapy: { sumKop: 0, count: 0 },
		orthopedics: { sumKop: 0, count: 0 },
		surgery: { sumKop: 0, count: 0 },
		orthodontics: { sumKop: 0, count: 0 },
		hygiene: { sumKop: 0, count: 0 },
		pediatric: { sumKop: 0, count: 0 },
		diagnostic: { sumKop: 0, count: 0 },
	};

	// Агрегация по кассам (в копейках)
	const boxSumsKop: Record<string, { name: string; type: CashBoxKind; sumKop: number; count: number }> = {};

	let grossRevenueKop = 0;

	for (const p of input.payments) {
		const amtRub = Math.max(0, p.amountRub);
		const amtKop = rubToKopecks(amtRub);
		grossRevenueKop += amtKop;

		// Направление
		let deptKey: ClinicalSpecialtyDepartment = "therapy";
		if (p.department && p.department in deptSumsKop) {
			deptKey = p.department as ClinicalSpecialtyDepartment;
		}
		deptSumsKop[deptKey].sumKop += amtKop;
		deptSumsKop[deptKey].count += 1;

		// Касса
		const bId = p.cashBoxId || p.cashBoxType || "cashless";
		const bName = p.cashBoxName || (p.cashBoxType === "main" ? "Основная касса (наличные)" : "Безналичный эквайринг");
		const bType: CashBoxKind = p.cashBoxType || "cashless";
		if (!boxSumsKop[bId]) {
			boxSumsKop[bId] = { name: bName, type: bType, sumKop: 0, count: 0 };
		}
		boxSumsKop[bId].sumKop += amtKop;
		boxSumsKop[bId].count += 1;
	}

	const grossRevenueRub = kopecksToRub(grossRevenueKop);

	// 2. Агрегация расходов по 12 регламентированным статьям StomX (в копейках)
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

	const expenseSumsKop: Record<number, number> = {
		1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0,
	};

	let totalExpensesKop = 0;

	for (const e of input.expenses) {
		const amtRub = Math.max(0, e.amountRub);
		const amtKop = rubToKopecks(amtRub);
		const normalizedId = e.reasonId === 100 ? 12 : e.reasonId;
		if (normalizedId in expenseSumsKop) {
			expenseSumsKop[normalizedId] = (expenseSumsKop[normalizedId] || 0) + amtKop;
		}
		totalExpensesKop += amtKop;
	}

	// Если передан расчетный ФОТ врачей от сделки и он выше записанного в кассе
	const currentSalaryKop = expenseSumsKop[1] ?? 0;
	if (input.doctorPieceRatePayrollRub) {
		const inputDoctorPieceRateKop = rubToKopecks(input.doctorPieceRatePayrollRub);
		if (inputDoctorPieceRateKop > currentSalaryKop) {
			const diffKop = inputDoctorPieceRateKop - currentSalaryKop;
			expenseSumsKop[1] = inputDoctorPieceRateKop;
			totalExpensesKop += diffKop;
		}
	}

	const totalExpensesRub = kopecksToRub(totalExpensesKop);

	const statutoryExpenses: StatutoryExpenseRow[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((id) => {
		const meta = STATUTORY_NAMES[id] || { name: `Статья ${id}`, isLocked: false, costNature: "opex" as const };
		const amtKop = expenseSumsKop[id] || 0;
		const amtRub = kopecksToRub(amtKop);
		return {
			reasonId: id,
			titleRu: meta.name,
			isLocked: meta.isLocked,
			amountRub: amtRub,
			shareOfExpensesPct: totalExpensesKop > 0 ? Number(((amtKop / totalExpensesKop) * 100).toFixed(1)) : 0,
			costNature: meta.costNature,
		};
	});

	// 3. Расчет себестоимости лечения (COGS) в копейках
	const directLabCostKop = expenseSumsKop[11] || 0;
	const directMaterialsCostKop = (expenseSumsKop[4] || 0) + (expenseSumsKop[5] || 0);
	const directDoctorPieceRateKop = expenseSumsKop[1] || 0;
	const totalCogsKop = directLabCostKop + directMaterialsCostKop + directDoctorPieceRateKop;

	const directLabCostRub = kopecksToRub(directLabCostKop);
	const directMaterialsCostRub = kopecksToRub(directMaterialsCostKop);
	const directDoctorPieceRateRub = kopecksToRub(directDoctorPieceRateKop);
	const totalCogsRub = kopecksToRub(totalCogsKop);

	const grossProfitKop = grossRevenueKop - totalCogsKop;
	const grossProfitRub = kopecksToRub(grossProfitKop);
	const grossMarginPct = grossRevenueKop > 0
		? Number(((grossProfitKop / grossRevenueKop) * 100).toFixed(1))
		: 0;

	// Маржинальность направлений (Specialty Margins)
	const departmentRevenue: DepartmentRevenueItem[] = (
		Object.keys(deptSumsKop) as ClinicalSpecialtyDepartment[]
	).map((dept) => {
		const info = deptSumsKop[dept];
		const sumRub = kopecksToRub(info.sumKop);

		// Расчет прямых затрат направления
		let deptDirectCostsKop = 0;
		if (input.departmentDirectCosts && input.departmentDirectCosts[dept] !== undefined) {
			deptDirectCostsKop = rubToKopecks(input.departmentDirectCosts[dept]!);
		} else if (grossRevenueKop > 0 && totalCogsKop > 0) {
			// Пропорциональное распределение COGS по выручке
			deptDirectCostsKop = Math.round((info.sumKop / grossRevenueKop) * totalCogsKop);
		}

		const deptDirectCostsRub = kopecksToRub(deptDirectCostsKop);
		const deptMarginKop = info.sumKop - deptDirectCostsKop;
		const deptMarginRub = kopecksToRub(deptMarginKop);
		const deptMarginPct = info.sumKop > 0
			? Number(((deptMarginKop / info.sumKop) * 100).toFixed(1))
			: 0;

		return {
			department: dept,
			titleRu: DEPARTMENT_METADATA_RU[dept].label,
			revenueRub: sumRub,
			sharePct: grossRevenueKop > 0 ? Number(((info.sumKop / grossRevenueKop) * 100).toFixed(1)) : 0,
			servicesCount: info.count,
			averageBillRub: info.count > 0 ? Math.round(sumRub / info.count) : 0,
			directCostsRub: deptDirectCostsRub,
			marginRub: deptMarginRub,
			marginPct: deptMarginPct,
		};
	});

	const cashBoxRevenue: CashBoxRevenueItem[] = Object.entries(boxSumsKop).map(([bId, b]) => {
		const sumRub = kopecksToRub(b.sumKop);
		return {
			boxId: bId,
			boxName: b.name,
			boxType: b.type,
			revenueRub: sumRub,
			sharePct: grossRevenueKop > 0 ? Number(((b.sumKop / grossRevenueKop) * 100).toFixed(1)) : 0,
			paymentsCount: b.count,
		};
	});

	// 4. Операционные затраты (OPEX) в копейках
	const opexReasons = [3, 6, 7, 8, 9, 10, 12];
	const totalOpexKop = opexReasons.reduce((acc, rId) => acc + (expenseSumsKop[rId] || 0), 0);
	const totalOpexRub = kopecksToRub(totalOpexKop);

	// 5. EBITDA и Чистая прибыль в копейках
	const ebitdaKop = grossProfitKop - totalOpexKop;
	const ebitdaRub = kopecksToRub(ebitdaKop);
	const ebitdaMarginPct = grossRevenueKop > 0
		? Number(((ebitdaKop / grossRevenueKop) * 100).toFixed(1))
		: 0;

	const taxesKop = expenseSumsKop[2] || 0;
	const taxesRub = kopecksToRub(taxesKop);

	const netProfitKop = ebitdaKop - taxesKop;
	const netProfitRub = kopecksToRub(netProfitKop);
	const netMarginPct = grossRevenueKop > 0
		? Number(((netProfitKop / grossRevenueKop) * 100).toFixed(1))
		: 0;

	// 6. CVP Анализ точки безубыточности (Break-Even Analysis)
	const fixedCostsKop = totalOpexKop + taxesKop; // Постоянные расходы клиники
	const variableCostsKop = totalCogsKop;          // Переменные расходы (COGS)
	const contributionMarginKop = grossRevenueKop - variableCostsKop; // Маржинальный доход (Gross Profit)
	const contributionMarginRatio = grossRevenueKop > 0
		? contributionMarginKop / grossRevenueKop
		: 0;

	let breakEvenRevenueKop = 0;
	if (contributionMarginRatio > 0 && fixedCostsKop > 0) {
		breakEvenRevenueKop = Math.round(fixedCostsKop / contributionMarginRatio);
	}
	const breakEvenRevenueRub = kopecksToRub(breakEvenRevenueKop);

	const totalPaymentsCount = input.payments.length;
	const avgVisitBillKop = totalPaymentsCount > 0 ? Math.round(grossRevenueKop / totalPaymentsCount) : 0;
	const breakEvenVisitsCount = avgVisitBillKop > 0 ? Math.ceil(breakEvenRevenueKop / avgVisitBillKop) : 0;

	const marginOfSafetyKop = Math.max(0, grossRevenueKop - breakEvenRevenueKop);
	const marginOfSafetyRub = kopecksToRub(marginOfSafetyKop);
	const marginOfSafetyPct = grossRevenueKop > 0
		? Number(((marginOfSafetyKop / grossRevenueKop) * 100).toFixed(1))
		: 0;

	const breakEven: BreakEvenAnalysis = {
		fixedCostsRub: kopecksToRub(fixedCostsKop),
		variableCostsRub: kopecksToRub(variableCostsKop),
		contributionMarginRub: kopecksToRub(contributionMarginKop),
		contributionMarginRatio: Number(contributionMarginRatio.toFixed(3)),
		breakEvenRevenueRub,
		breakEvenVisitsCount,
		marginOfSafetyRub,
		marginOfSafetyPct,
		isBreakEvenReached: grossRevenueKop >= breakEvenRevenueKop && breakEvenRevenueKop > 0,
	};

	// 7. Юнит-экономика стоматологических кресел (Chair Unit Economics)
	const chairCfg = input.chairEconomics || {};
	const activeChairsCount = Math.max(
		1,
		chairCfg.activeChairsCount ?? (chairCfg.chairs?.length || 1),
	);
	const operatingDays = Math.max(1, chairCfg.operatingDays ?? 26);
	const operatingHoursPerDay = Math.max(1, chairCfg.operatingHoursPerDay ?? 12);
	const totalOperatingHours = activeChairsCount * operatingDays * operatingHoursPerDay;

	// Если есть детальные кресла в инпуте
	let chairsList: ChairUnitEconomicsItem[] = [];
	let totalOccupiedHours = 0;

	if (chairCfg.chairs && chairCfg.chairs.length > 0) {
		chairsList = chairCfg.chairs.map((c) => {
			const opHours = c.operatingHours ?? operatingDays * operatingHoursPerDay;
			const occHours = c.occupiedHours ?? 0;
			totalOccupiedHours += occHours;
			const occPct = opHours > 0 ? Number(((occHours / opHours) * 100).toFixed(1)) : 0;
			const revRub = c.revenueRub ?? (grossRevenueRub / chairCfg.chairs!.length);
			const costRub = activeChairsCount > 0 ? totalExpensesRub / activeChairsCount : 0;
			const pRub = revRub - costRub;
			return {
				chairId: c.chairId,
				chairName: c.chairName,
				roomName: c.roomName,
				operatingHours: opHours,
				occupiedHours: occHours,
				occupancyRatePct: occPct,
				revenueRub: Math.round(revRub),
				costRub: Math.round(costRub),
				profitRub: Math.round(pRub),
			};
		});
	} else {
		// Оценка загрузки по числу визитов (в среднем 1 час на визит)
		totalOccupiedHours = chairCfg.occupiedHours ?? Math.min(totalPaymentsCount, totalOperatingHours);
		const revPerChair = Math.round(grossRevenueRub / activeChairsCount);
		const costPerChair = Math.round(totalExpensesRub / activeChairsCount);
		const profitPerChair = Math.round(netProfitRub / activeChairsCount);
		const occPct = totalOperatingHours > 0
			? Number(((totalOccupiedHours / totalOperatingHours) * 100).toFixed(1))
			: 0;

		chairsList = Array.from({ length: activeChairsCount }).map((_, idx) => ({
			chairId: `chair-${idx + 1}`,
			chairName: `Установка №${idx + 1}`,
			operatingHours: Math.round(totalOperatingHours / activeChairsCount),
			occupiedHours: Math.round(totalOccupiedHours / activeChairsCount),
			occupancyRatePct: occPct,
			revenueRub: revPerChair,
			costRub: costPerChair,
			profitRub: profitPerChair,
		}));
	}

	const costPerAvailableChairHourRub = totalOperatingHours > 0
		? Math.round(totalExpensesRub / totalOperatingHours)
		: 0;
	const costPerOccupiedChairHourRub = totalOccupiedHours > 0
		? Math.round(totalExpensesRub / totalOccupiedHours)
		: 0;
	const revenuePerChairRub = Math.round(grossRevenueRub / activeChairsCount);
	const profitPerChairRub = Math.round(netProfitRub / activeChairsCount);
	const chairOccupancyRatePct = totalOperatingHours > 0
		? Number(((totalOccupiedHours / totalOperatingHours) * 100).toFixed(1))
		: 0;

	const chairEconomics: ChairEconomicsSummary = {
		activeChairsCount,
		totalOperatingHours,
		totalOccupiedHours,
		chairOccupancyRatePct,
		costPerAvailableChairHourRub,
		costPerOccupiedChairHourRub,
		revenuePerChairRub,
		profitPerChairRub,
		chairs: chairsList,
	};

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
		breakEven,
		chairEconomics,
	};
}
