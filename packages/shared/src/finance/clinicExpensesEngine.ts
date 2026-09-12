/**
 * packages/shared/src/finance/clinicExpensesEngine.ts
 *
 * WAVE 135: Clinic Operating Expenses & Chair-Hour Cost Allocation Engine.
 * Reverse-engineered and adapted from DentalPin expenses module:
 * - backend/app/modules/expenses/models.py
 * - backend/app/modules/expenses/schemas.py
 * - backend/app/modules/expenses/service.py
 *
 * ARCHITECTURAL & CLINICAL MANDATES:
 * 1. Mandate 8e & 8n (Doctor Autonomy & Scale Sovereignty):
 *    - Solo doctor & compact clinic profile (1-3 chairs): 1-click chair rent calculation
 *      without requiring 50 corporate accounting ledger rows.
 *    - Doctor discounts up to 100% (warranty rework, staff courtesies) do not throw
 *      or produce NaN/Infinity; they calculate negative margin cleanly.
 * 2. Mandate 8k (CRM != Reality Simulator):
 *    - Pragmatic chair-hour cost allocation based on target occupancy rate.
 * 3. Mandate 8d item 7 (Studio Clinical HIG):
 *    - STRICTLY 0 cartoon emojis in statutory A4 managerial cost statement.
 * 4. Kopeck-Exact Financial Integrity:
 *    - All monetary sums strictly in integer kopecks without IEEE-754 drift.
 */

import { z } from "zod";
import { formatKopecksRu } from "../utils/money.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ZOD SCHEMAS & TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 10 Canonical Operating Expense Categories for Dental Practices.
 */
export const expenseCategorySchema = z.enum([
	"rent",
	"utilities",
	"salaries",
	"supplies",
	"equipment_lease",
	"insurance",
	"maintenance",
	"marketing",
	"license_software",
	"other",
]);
export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;


export const EXPENSE_CATEGORY_LABELS_RU: Record<ExpenseCategory, string> = {
	rent: "Аренда помещений и кресел",
	utilities: "Коммунальные услуги, клининг и связь",
	salaries: "ФОТ постоянный (оклады администраторов, санитарок, руководства)",
	supplies: "Общеклинические материалы и дезинфектанты (не списанные на приём)",
	equipment_lease: "Лизинг и амортизация стоматологических установок",
	insurance: "Страхование профессиональной ответственности",
	maintenance: "Техническое обслуживание установок, компрессоров, автоклавов",
	marketing: "Реклама, маркетинг, сайт, телефония и лидогенерация",
	license_software: "Лицензии ПО, МИС, ОФД, ЭЦП и сервисы маркировки ЧЗ/МДЛП",
	other: "Прочие административно-хозяйственные расходы",
};

/** Backward compatibility alias */
export const EXPENSE_CATEGORY_NAMES_RU = EXPENSE_CATEGORY_LABELS_RU;

export const expenseRecurrenceSchema = z.enum([
	"one_time",
	"monthly",
	"quarterly",
	"annual",
]);
export type ExpenseRecurrence = z.infer<typeof expenseRecurrenceSchema>;

export const EXPENSE_RECURRENCE_LABELS_RU: Record<ExpenseRecurrence, string> = {
	one_time: "Разовый платёж",
	monthly: "Ежемесячно",
	quarterly: "Ежеквартально",
	annual: "Ежегодно",
};

/**
 * Single clinic operating expense record.
 */
export const clinicExpenseRecordSchema = z.object({
	id: z.string().min(1, "ID расхода обязателен"),
	organizationId: z.string().min(1, "ID организации обязателен"),
	clinicId: z.string().optional().nullable(),
	category: expenseCategorySchema,
	amountKopecks: z.number().int().nonnegative("Сумма расхода должна быть неотрицательной"),
	expenseDate: z.string(), // YYYY-MM-DD
	description: z.string().max(2000).default(""),
	recurrence: expenseRecurrenceSchema.default("monthly"),
	isDirectChairCost: z.boolean().default(false), // true = direct chair cost (lease, compressor), false = general overhead
	vendorName: z.string().max(255).optional().nullable(),
	receiptUrl: z.string().url().optional().nullable(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
});
export type ClinicExpenseRecord = z.infer<typeof clinicExpenseRecordSchema>;

/** Backward compatibility alias */
export const expenseItemSchema = clinicExpenseRecordSchema;
export type ExpenseItem = ClinicExpenseRecord;

/**
 * Input for chair-hour cost allocation calculation.
 */
export const chairHourCostInputSchema = z.object({
	activeChairsCount: z.number().int().min(1, "Число кресел должно быть >= 1").default(1),
	operatingDaysPerMonth: z.number().int().min(1).max(31).default(26),
	operatingHoursPerDay: z.number().int().min(1).max(24).default(12),
	targetOccupancyRate: z.number().min(0.01).max(1.0).default(0.70), // 70% standard occupancy
	monthlyExpenses: z.union([
		z.array(clinicExpenseRecordSchema),
		z.object({
			generalOverheadKopecks: z.number().int().nonnegative(),
			directOperatoryKopecks: z.number().int().nonnegative().default(0),
		}),
	]),
});
export type ChairHourCostInput = z.infer<typeof chairHourCostInputSchema>;

/**
 * Result of chair-hour cost allocation.
 */
export const chairHourCostResultSchema = z.object({
	totalMonthlyExpensesKopecks: z.number().int().nonnegative(),
	generalOverheadMonthlyKopecks: z.number().int().nonnegative(),
	directOperatoryMonthlyKopecks: z.number().int().nonnegative(),
	totalAvailableChairHours: z.number().positive(),
	effectiveOccupiedChairHours: z.number().positive(),
	costPerAvailableChairHourKopecks: z.number().int().nonnegative(),
	costPerOccupiedChairHourKopecks: z.number().int().nonnegative(),
	costPerOccupiedMinuteKopecks: z.number().int().nonnegative(),
});
export type ChairHourCostResult = z.infer<typeof chairHourCostResultSchema>;

/**
 * Input for individual clinical visit profitability analysis.
 */
export const visitMarginInputSchema = z.object({
	visitId: z.string().min(1, "ID визита обязателен"),
	visitDurationMinutes: z.number().int().positive("Длительность приема должна быть > 0 мин"),
	totalBilledKopecks: z.number().int().nonnegative("Сумма по прейскуранту должна быть неотрицательной"),
	discountKopecks: z.number().int().nonnegative().default(0),
	consumablesCostKopecks: z.number().int().nonnegative().default(0), // from Wave 134 treatmentConsumablesEngine
	doctorCommissionKopecks: z.number().int().nonnegative().default(0),
	labCostKopecks: z.number().int().nonnegative().default(0),
	chairCostPerOccupiedMinuteKopecks: z.number().int().nonnegative(),
	serviceName: z.string().optional(),
	patientName: z.string().optional(),
	doctorName: z.string().optional(),
});
export type VisitMarginInput = z.infer<typeof visitMarginInputSchema>;

/**
 * Result of individual clinical visit profitability analysis.
 */
export const visitMarginResultSchema = z.object({
	visitId: z.string(),
	netRevenueKopecks: z.number().int(),
	chairTimeCostKopecks: z.number().int().nonnegative(),
	directCostsKopecks: z.number().int().nonnegative(),
	grossProfitKopecks: z.number().int(),
	grossMarginPercent: z.number(),
	netProfitKopecks: z.number().int(),
	netMarginPercent: z.number(),
	isProfitable: z.boolean(),
	breakEvenBilledKopecks: z.number().int().nonnegative(),
});
export type VisitMarginResult = z.infer<typeof visitMarginResultSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXPENSE NORMALIZATION & AGGREGATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalizes an expense amount to a 1-month equivalent in integer kopecks.
 */
export function normalizeExpenseToMonthlyKopecks(
	amountKopecks: number,
	recurrence: ExpenseRecurrence,
): number {
	switch (recurrence) {
		case "monthly":
			return amountKopecks;
		case "quarterly":
			return Math.round(amountKopecks / 3);
		case "annual":
			return Math.round(amountKopecks / 12);
		case "one_time":
			return amountKopecks;
	}
}

/**
 * Aggregates monthly expenses by category.
 */
export function aggregateExpensesByCategory(
	expenses: readonly ClinicExpenseRecord[],
): Record<ExpenseCategory, number> {
	const result: Record<ExpenseCategory, number> = {
		rent: 0,
		utilities: 0,
		salaries: 0,
		supplies: 0,
		equipment_lease: 0,
		insurance: 0,
		maintenance: 0,
		marketing: 0,
		license_software: 0,
		other: 0,
	};

	for (const exp of expenses) {
		const monthlyAmount = normalizeExpenseToMonthlyKopecks(exp.amountKopecks, exp.recurrence);
		result[exp.category] = (result[exp.category] ?? 0) + monthlyAmount;
	}

	return result;
}

/**
 * Calculates total monthly expenses with general vs direct operatory split.
 */
export function calculateTotalMonthlyExpenses(
	expenses: readonly ClinicExpenseRecord[],
): {
	totalMonthlyKopecks: number;
	generalOverheadMonthlyKopecks: number;
	directOperatoryMonthlyKopecks: number;
	categoryTotalsKopecks: Record<ExpenseCategory, number>;
} {
	let generalOverheadMonthlyKopecks = 0;
	let directOperatoryMonthlyKopecks = 0;
	const categoryTotalsKopecks = aggregateExpensesByCategory(expenses);

	for (const exp of expenses) {
		const monthlyAmount = normalizeExpenseToMonthlyKopecks(exp.amountKopecks, exp.recurrence);
		if (exp.isDirectChairCost) {
			directOperatoryMonthlyKopecks += monthlyAmount;
		} else {
			generalOverheadMonthlyKopecks += monthlyAmount;
		}
	}

	return {
		totalMonthlyKopecks: generalOverheadMonthlyKopecks + directOperatoryMonthlyKopecks,
		generalOverheadMonthlyKopecks,
		directOperatoryMonthlyKopecks,
		categoryTotalsKopecks,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CHAIR-HOUR COST ALLOCATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes exact kopeck cost of 1 chair-hour and 1 chair-minute.
 */
export function calculateChairHourCost(input: ChairHourCostInput): ChairHourCostResult {
	let generalOverheadMonthlyKopecks = 0;
	let directOperatoryMonthlyKopecks = 0;

	if (Array.isArray(input.monthlyExpenses)) {
		const totals = calculateTotalMonthlyExpenses(input.monthlyExpenses);
		generalOverheadMonthlyKopecks = totals.generalOverheadMonthlyKopecks;
		directOperatoryMonthlyKopecks = totals.directOperatoryMonthlyKopecks;
	} else {
		generalOverheadMonthlyKopecks = input.monthlyExpenses.generalOverheadKopecks;
		directOperatoryMonthlyKopecks = input.monthlyExpenses.directOperatoryKopecks ?? 0;
	}

	const totalMonthlyExpensesKopecks = generalOverheadMonthlyKopecks + directOperatoryMonthlyKopecks;

	// Total available chair hours = chairs * days * hoursPerDay
	const chairs = Math.max(1, input.activeChairsCount);
	const days = Math.max(1, input.operatingDaysPerMonth);
	const hoursPerDay = Math.max(1, input.operatingHoursPerDay);
	const totalAvailableChairHours = chairs * days * hoursPerDay;

	// Effective occupied chair hours = totalAvailableChairHours * targetOccupancyRate
	const occupancy = Math.max(0.01, Math.min(1.0, input.targetOccupancyRate));
	const rawOccupiedHours = totalAvailableChairHours * occupancy;
	// Round occupied hours deterministically to 2 decimal places avoiding IEEE-754 precision quirks
	const effectiveOccupiedChairHours = Math.round(rawOccupiedHours * 100) / 100;

	// Kopeck-exact hourly and minute costs
	const costPerAvailableChairHourKopecks = Math.round(totalMonthlyExpensesKopecks / totalAvailableChairHours);
	const costPerOccupiedChairHourKopecks = Math.round(totalMonthlyExpensesKopecks / effectiveOccupiedChairHours);
	const costPerOccupiedMinuteKopecks = Math.round(costPerOccupiedChairHourKopecks / 60);

	return {
		totalMonthlyExpensesKopecks,
		generalOverheadMonthlyKopecks,
		directOperatoryMonthlyKopecks,
		totalAvailableChairHours,
		effectiveOccupiedChairHours,
		costPerAvailableChairHourKopecks,
		costPerOccupiedChairHourKopecks,
		costPerOccupiedMinuteKopecks,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SOLO DOCTOR & SMALL CLINIC PROFILE (MANDATES 8E & 8N)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a chair hour cost input for a Solo Doctor renting 1 chair.
 * Mandate 8e & 8n: Solo practitioner needs only 1-click chair rent without 50 corporate rows.
 */
export function createSoloPracticeProfile(
	chairRentMonthlyKopecks: number,
	otherExpensesKopecks = 0,
	operatingDaysPerMonth = 22,
	operatingHoursPerDay = 8,
	targetOccupancyRate = 0.75,
): ChairHourCostInput {
	return {
		activeChairsCount: 1,
		operatingDaysPerMonth,
		operatingHoursPerDay,
		targetOccupancyRate,
		monthlyExpenses: {
			generalOverheadKopecks: otherExpensesKopecks,
			directOperatoryKopecks: chairRentMonthlyKopecks,
		},
	};
}

/**
 * Calculates chair cost for solo doctor in 1 single function call.
 */
export function calculateSoloDoctorChairCost(
	chairRentMonthlyKopecks: number,
	otherExpensesKopecks = 0,
	operatingDaysPerMonth = 22,
	operatingHoursPerDay = 8,
	targetOccupancyRate = 0.75,
): ChairHourCostResult {
	const profile = createSoloPracticeProfile(
		chairRentMonthlyKopecks,
		otherExpensesKopecks,
		operatingDaysPerMonth,
		operatingHoursPerDay,
		targetOccupancyRate,
	);
	return calculateChairHourCost(profile);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. VISIT PROFITABILITY & MARGIN CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates gross and net margins for an individual clinical visit.
 * Mandate 8e: Doctor discounts up to 100% (warranty rework, staff courtesies)
 * are handled gracefully without NaN or Infinity.
 */
export function calculateVisitMargin(input: VisitMarginInput): VisitMarginResult {
	const discount = Math.min(input.totalBilledKopecks, input.discountKopecks);
	const netRevenueKopecks = Math.max(0, input.totalBilledKopecks - discount);

	// Direct chair time cost = duration * cost per minute
	const chairTimeCostKopecks = Math.round(input.visitDurationMinutes * input.chairCostPerOccupiedMinuteKopecks);

	// Direct costs = chairTime + consumables (Wave 134) + doctorCommission + lab
	const directCostsKopecks =
		chairTimeCostKopecks +
		input.consumablesCostKopecks +
		input.doctorCommissionKopecks +
		input.labCostKopecks;

	// Gross profit = net revenue - consumables - lab
	const grossProfitKopecks = netRevenueKopecks - input.consumablesCostKopecks - input.labCostKopecks;

	// Gross margin %
	let grossMarginPercent = 0;
	if (netRevenueKopecks > 0) {
		grossMarginPercent = Math.round((grossProfitKopecks / netRevenueKopecks) * 10000) / 100;
	} else if (grossProfitKopecks < 0) {
		grossMarginPercent = -100;
	}

	// Net profit = net revenue - all direct costs
	const netProfitKopecks = netRevenueKopecks - directCostsKopecks;

	// Net margin %
	let netMarginPercent = 0;
	if (netRevenueKopecks > 0) {
		netMarginPercent = Math.round((netProfitKopecks / netRevenueKopecks) * 10000) / 100;
	} else if (netProfitKopecks < 0) {
		netMarginPercent = -100;
	}

	const isProfitable = netProfitKopecks >= 0;

	// Break-even billed amount needed to cover all direct costs (accounting for discount)
	const breakEvenBilledKopecks = directCostsKopecks + discount;

	return {
		visitId: input.visitId,
		netRevenueKopecks,
		chairTimeCostKopecks,
		directCostsKopecks,
		grossProfitKopecks,
		grossMarginPercent,
		netProfitKopecks,
		netMarginPercent,
		isProfitable,
		breakEvenBilledKopecks,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. STATUTORY A4 MANAGERIAL REPORT (MANDATE 8D ITEM 7: STRICTLY 0 EMOJIS)
// ─────────────────────────────────────────────────────────────────────────────

export interface ClinicExpensesA4ReportParams {
	clinicName?: string;
	organizationName?: string;
	periodMonthYear?: string;
	chairCostResult: ChairHourCostResult;
	categoryTotalsKopecks?: Record<ExpenseCategory, number>;
	sampleVisits?: VisitMarginResult[];
	auditorName?: string;
}

/**
 * Formats statutory A4 operating expenses and chair-hour cost allocation statement.
 * MANDATE 8D ITEM 7: STRICTLY 0 CARTOON EMOJIS! Clean typographical business Russian.
 */
export function formatClinicExpensesAndChairCostA4Report(
	params: ClinicExpensesA4ReportParams,
): string {
	const clinic = params.clinicName ?? "СТОМАТОЛОГИЧЕСКАЯ КЛИНИКА «ДЕНТЕ»";
	const org = params.organizationName ?? "ООО / ИП СТОМАТОЛОГИЧЕСКАЯ ПРАКТИКА";
	const period = params.periodMonthYear ?? new Date().toISOString().slice(0, 7);
	const auditor = params.auditorName ?? "Финансовый управляющий / Главный врач";
	const r = params.chairCostResult;

	const divider = "=".repeat(78);
	const subDivider = "-".repeat(78);
	const lines: string[] = [];

	lines.push(divider);
	lines.push("ВЕДОМОСТЬ ОПЕРАЦИОННЫХ РАСХОДОВ И СЕБЕСТОИМОСТИ КРЕСЛО-ЧАСА");
	lines.push("УПРАВЛЕНЧЕСКИЙ УЧЕТ И КАЛЬКУЛЯЦИЯ ЗАТРАТ СТОМАТОЛОГИЧЕСКОЙ КЛИНИКИ");
	lines.push(divider);
	lines.push(`Организация: ${org}`);
	lines.push(`Клиника: ${clinic}`);
	lines.push(`Отчетный период: ${period}`);
	lines.push(subDivider);

	lines.push("1. БАЗОВЫЕ ПАРАМЕТРЫ ПРОПУСКНОЙ СПОСОБНОСТИ И НАГРУЗКИ:");
	lines.push(`   Фонд рабочего времени установок: ${r.totalAvailableChairHours} ч./мес.`);
	lines.push(`   Эффективная загрузка установок : ${r.effectiveOccupiedChairHours} ч./мес.`);
	lines.push(subDivider);

	lines.push("2. СТРУКТУРА ЕЖЕМЕСЯЧНЫХ РАСХОДОВ КЛИНИКИ:");
	lines.push(`   Общие расходы за месяц       : ${formatKopecksRu(r.totalMonthlyExpensesKopecks)}`);
	lines.push(`   Общеклинический оверхед (Fix): ${formatKopecksRu(r.generalOverheadMonthlyKopecks)}`);
	lines.push(`   Прямые расходы на установки  : ${formatKopecksRu(r.directOperatoryMonthlyKopecks)}`);

	if (params.categoryTotalsKopecks) {
		lines.push("");
		lines.push("   Детализация расходов по статьям:");
		const categories = Object.keys(params.categoryTotalsKopecks) as ExpenseCategory[];
		for (const cat of categories) {
			const amount = params.categoryTotalsKopecks[cat] ?? 0;
			if (amount > 0) {
				const label = EXPENSE_CATEGORY_LABELS_RU[cat] ?? cat;
				lines.push(`   - ${label}: ${formatKopecksRu(amount)}`);
			}
		}
	}
	lines.push(subDivider);

	lines.push("3. РАСЧЕТНАЯ СЕБЕСТОИМОСТЬ ВРЕМЕНИ В КРЕСЛЕ:");
	lines.push(`   Себестоимость доступного кресло-часа (100%): ${formatKopecksRu(r.costPerAvailableChairHourKopecks)}`);
	lines.push(`   Себестоимость занятого кресло-часа (план)  : ${formatKopecksRu(r.costPerOccupiedChairHourKopecks)}`);
	lines.push(`   Себестоимость 1 минуты в кресле            : ${formatKopecksRu(r.costPerOccupiedMinuteKopecks)}`);
	lines.push(subDivider);

	if (params.sampleVisits && params.sampleVisits.length > 0) {
		lines.push("4. ВЫБОРОЧНЫЙ АНАЛИЗ МАРЖИНАЛЬНОСТИ ПРИЕМОВ (UNIT-ECONOMICS):");
		for (let i = 0; i < params.sampleVisits.length; i++) {
			const v = params.sampleVisits[i];
			if (!v) continue;
			const status = v.isProfitable ? "[РЕНТАБЕЛЬНО]" : "[УБЫТОЧНО / ГАРАНТИЯ]";
			lines.push(`   Прием ${i + 1} (${v.visitId}) ${status}:`);
			lines.push(
				`     Выручка нетто: ${formatKopecksRu(v.netRevenueKopecks)} | Кресло-время: ${formatKopecksRu(v.chairTimeCostKopecks)} | Прямые затраты: ${formatKopecksRu(v.directCostsKopecks)}`,
			);
			lines.push(
				`     Чистая прибыль: ${formatKopecksRu(v.netProfitKopecks)} | Чистая маржа: ${v.netMarginPercent}% | Точка безубыточности: ${formatKopecksRu(v.breakEvenBilledKopecks)}`,
			);
		}
		lines.push(subDivider);
	}

	lines.push("Подписи ответственных лиц:");
	lines.push(`Финансовый управляющий: ____________________ / ${auditor} /`);
	lines.push("Главный врач / Руководитель клиники: ____________________ /                        /");
	lines.push(divider);

	return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. ENGINE NAMESPACE EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const clinicExpensesEngine = {
	expenseCategorySchema,
	expenseRecurrenceSchema,
	clinicExpenseRecordSchema,
	chairHourCostInputSchema,
	chairHourCostResultSchema,
	visitMarginInputSchema,
	visitMarginResultSchema,
	EXPENSE_CATEGORY_LABELS_RU,
	EXPENSE_RECURRENCE_LABELS_RU,
	normalizeExpenseToMonthlyKopecks,
	aggregateExpensesByCategory,
	calculateTotalMonthlyExpenses,
	calculateChairHourCost,
	createSoloPracticeProfile,
	calculateSoloDoctorChairCost,
	calculateVisitMargin,
	formatClinicExpensesAndChairCostA4Report,
} as const;
