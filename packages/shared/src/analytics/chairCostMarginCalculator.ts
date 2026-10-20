/**
 * chairCostMarginCalculator.ts — Калькулятор честной себестоимости кресла и маржи врача.
 *
 * Standalone виральный калькулятор юнит-экономики для владельцев клиник, главврачей
 * и врачей-арендаторов стоматологических кабинетов в РФ/СНГ.
 *
 * Решает острую боль рынка:
 * 1. Иллюзия «высокого оборота»: клиника делает 3M ₽ выручки, а на счетах владельца остаётся 150к ₽.
 * 2. Споры клиники и врача: обоснование сдельной ставки (вычет ЗТЛ и расходников по Mandate 8e).
 * 3. Ловушка скидок: скидка 10% пациенту уничтожает до 50% чистой маржи клиники.
 * 4. Затянутые приёмы: почему задержка на 30 минут делает терапию глубокого кариеса убыточной.
 */

import { z } from "zod";
import { calculateChairHourCost } from "../finance/clinicExpensesEngine.js";
import { kopecksToRub, rubToKopecks } from "../fiscal/kopecksArithmetic.js";

// ─── 1. ВХОДНЫЕ ПАРАМЕТРЫ КЛИНИКИ И ПРОЦЕДУРЫ ─────────────────────────────────

export const clinicOverheadInputSchema = z.object({
	/** Количество действующих кресел в клинике */
	activeChairsCount: z.number().int().min(1).default(3),
	/** Рабочих дней клиники в месяц */
	workingDaysPerMonth: z.number().int().min(1).max(31).default(30),
	/** Часов работы клиники в день (например, с 09:00 до 21:00 = 12 часов) */
	workingHoursPerDay: z.number().min(4).max(24).default(12),
	/** Средняя плановая загрузка кресел (0.3..0.9, дефолт 0.65 = 65%) */
	chairUtilizationRate: z.number().min(0.1).max(1).default(0.65),

	// Ежемесячные постоянные расходы клиники (Fixed Overhead, руб./мес):
	/** Аренда помещения клиники */
	monthlyRentRub: z.number().nonnegative().default(350_000),
	/** Коммунальные услуги, интернет, охрана, вывоз медотходов класса Б */
	monthlyUtilitiesRub: z.number().nonnegative().default(45_000),
	/** ФОТ администраторов, санитарок, ЦСО-медсестер, бухгалтера (оклады) */
	monthlyAdministrativePayrollRub: z.number().nonnegative().default(280_000),
	/** Амортизация оборудования клиники и резерв на ТО (установки, компрессор, автоклав) */
	monthlyEquipmentDepreciationRub: z.number().nonnegative().default(120_000),
	/** Расходники стерилизации и дезинфекции SanPiN (крафт-пакеты, дезрастворы, барьеры) */
	monthlySanpinSterilizationRub: z.number().nonnegative().default(60_000),
	/** Маркетинг, реклама, телефония, налоги УСН/патент */
	monthlyMarketingAndOtherRub: z.number().nonnegative().default(150_000),
});
export type ClinicOverheadInput = z.infer<typeof clinicOverheadInputSchema>;

export const procedureEconomicsInputSchema = z.object({
	/** Название процедуры для калькуляции (например, "Реставрация зуба Estelite" или "Циркониевая коронка") */
	procedureName: z.string().default("Лечение кариеса (реставрация)"),
	/** Длительность процедуры в минутах (кресло-минуты) */
	durationMinutes: z.number().int().min(10).max(480).default(60),
	/** Прейскурантная стоимость процедуры для пациента (руб.) */
	patientPriceRub: z.number().positive().default(7_500),
	/** Скидка пациенту (0..0.5 = 0%..50%) */
	discountRate: z.number().min(0).max(0.5).default(0),

	// Переменные прямые затраты:
	/** Прямые расходные материалы на процедуру (анестетик, оптрагейт, композит, полировка, боры, руб.) */
	directConsumablesRub: z.number().nonnegative().default(1_200),
	/** Себестоимость зуботехнической лаборатории ЗТЛ (0 если терапия, руб.) */
	labTechnicianCostRub: z.number().nonnegative().default(0),

	// Модель оплаты труда врача:
	/** Процент врача от сдельной базы (например, 25% = 0.25) */
	doctorCommissionRate: z.number().min(0).max(0.7).default(0.25),
	/** Вычитать ли себестоимость ЗТЛ из базы расчета ЗП врача (Mandate 8e: true) */
	deductLabFromDoctorBase: z.boolean().default(true),
	/** Процент ассистента или фиксированная оплата за процедуру (руб.) */
	assistantFeeRub: z.number().nonnegative().default(400),
	/** Ставка эквайринга по картам / СБП (0.015 = 1.5%) */
	acquiringRate: z.number().min(0).max(0.05).default(0.015),
});
export type ProcedureEconomicsInput = z.infer<typeof procedureEconomicsInputSchema>;

// ─── 2. РЕЗУЛЬТАТЫ КАЛЬКУЛЯЦИИ ────────────────────────────────────────────────

export interface ChairHourlyCostResult {
	totalMonthlyFixedOverheadRub: number;
	totalAvailableChairHoursPerMonth: number;
	actualOccupiedChairHoursPerMonth: number;
	/** Себестоимость 1 часа доступного кресла (руб./час) */
	hourlyCostNominalRub: number;
	/** Себестоимость 1 часа фактически занятого кресла с учетом загрузки (руб./час) — ключевая цифра! */
	hourlyCostRealOccupiedRub: number;
	/** Себестоимость 1 минуты занятого кресла (руб./мин) */
	minuteCostRealOccupiedRub: number;
	/** Канонические поля в целых копейках (Мандат 8i) */
	totalMonthlyFixedOverheadKopecks?: number;
	hourlyCostNominalKopecks?: number;
	hourlyCostRealOccupiedKopecks?: number;
	minuteCostRealOccupiedKopecks?: number;
}

export interface ProcedureEconomicsResult {
	procedureName: string;
	durationMinutes: number;
	nominalPatientPriceRub: number;
	actualPatientPriceRub: number;
	discountAmountRub: number;

	// Структура затрат на процедуру:
	directConsumablesRub: number;
	labTechnicianCostRub: number;
	chairOverheadCostRub: number; // Стоимость простоя/работы кресла за время процедуры
	acquiringFeeRub: number;
	assistantFeeRub: number;
	doctorWageBaseRub: number;
	doctorEarningsRub: number;
	totalProcedureCostRub: number; // Сумма всех издержек клиники

	// Финансовый итог клиники:
	clinicNetProfitRub: number;
	clinicNetMarginPercent: number;
	clinicHourlyProfitabilityRub: number;
	isLossMaking: boolean;

	// Аналитика и радар скрытых убытков:
	breakEvenMinimumPriceRub: number;
	discountProfitErosionPercent: number; // Какую долю чистой прибыли съела скидка
	prolongationCostPer30MinRub: number;   // Убыток от задержки приёма на 30 мин
	executiveDiagnosticRu: string;
}

// ─── 3. ВЫЧИСЛИТЕЛЬНОЕ ЯДРО (FIRST PRINCIPLES) ────────────────────────────────

/**
 * Расчет честной почасовой себестоимости стоматологического кресла.
 * SSOT: Делегирует в канонический calculateChairHourCost (@dental/shared/finance) с гарантией целочисленных копеек.
 */
export function calculateChairHourlyCost(input: ClinicOverheadInput): ChairHourlyCostResult {
	const totalMonthlyFixedOverheadRub =
		input.monthlyRentRub +
		input.monthlyUtilitiesRub +
		input.monthlyAdministrativePayrollRub +
		input.monthlyEquipmentDepreciationRub +
		input.monthlySanpinSterilizationRub +
		input.monthlyMarketingAndOtherRub;

	const canonicalResult = calculateChairHourCost({
		activeChairsCount: input.activeChairsCount,
		operatingDaysPerMonth: input.workingDaysPerMonth,
		operatingHoursPerDay: input.workingHoursPerDay,
		targetOccupancyRate: input.chairUtilizationRate,
		monthlyExpenses: {
			generalOverheadKopecks: rubToKopecks(totalMonthlyFixedOverheadRub),
			directOperatoryKopecks: 0,
		},
	});

	const totalAvailableChairHoursPerMonth = canonicalResult.totalAvailableChairHours;
	const actualOccupiedChairHoursPerMonth = Math.round(canonicalResult.effectiveOccupiedChairHours);
	const hourlyCostNominalRub = Math.round(kopecksToRub(canonicalResult.costPerAvailableChairHourKopecks));
	const hourlyCostRealOccupiedRub = Math.round(kopecksToRub(canonicalResult.costPerOccupiedChairHourKopecks));
	const minuteCostRealOccupiedRub = Math.round((hourlyCostRealOccupiedRub / 60) * 100) / 100;

	return {
		totalMonthlyFixedOverheadRub,
		totalAvailableChairHoursPerMonth,
		actualOccupiedChairHoursPerMonth,
		hourlyCostNominalRub,
		hourlyCostRealOccupiedRub,
		minuteCostRealOccupiedRub,
		totalMonthlyFixedOverheadKopecks: canonicalResult.totalMonthlyExpensesKopecks,
		hourlyCostNominalKopecks: canonicalResult.costPerAvailableChairHourKopecks,
		hourlyCostRealOccupiedKopecks: canonicalResult.costPerOccupiedChairHourKopecks,
		minuteCostRealOccupiedKopecks: canonicalResult.costPerOccupiedMinuteKopecks,
	};
}

/**
 * Расчет юнит-экономики конкретной процедуры и чистой маржи клиники.
 */
export function calculateProcedureEconomics(
	overheadInput: ClinicOverheadInput,
	procInput: ProcedureEconomicsInput,
): ProcedureEconomicsResult {
	const chairCost = calculateChairHourlyCost(overheadInput);

	const discountAmountRub = Math.round(procInput.patientPriceRub * procInput.discountRate);
	const actualPatientPriceRub = procInput.patientPriceRub - discountAmountRub;

	// Фиксированные накладные расходы кресла за длительность процедуры
	const chairOverheadCostRub = Math.round(chairCost.minuteCostRealOccupiedRub * procInput.durationMinutes);

	// Эквайринг
	const acquiringFeeRub = Math.round(actualPatientPriceRub * procInput.acquiringRate);

	// База оплаты врача
	let doctorWageBaseRub = actualPatientPriceRub;
	if (procInput.deductLabFromDoctorBase) {
		doctorWageBaseRub = Math.max(0, actualPatientPriceRub - procInput.labTechnicianCostRub);
	}
	const doctorEarningsRub = Math.round(doctorWageBaseRub * procInput.doctorCommissionRate);

	// Итоговые затраты клиники
	const totalProcedureCostRub =
		procInput.directConsumablesRub +
		procInput.labTechnicianCostRub +
		chairOverheadCostRub +
		acquiringFeeRub +
		procInput.assistantFeeRub +
		doctorEarningsRub;

	// Чистая прибыль клиники
	const clinicNetProfitRub = actualPatientPriceRub - totalProcedureCostRub;
	const clinicNetMarginPercent =
		actualPatientPriceRub > 0 ? Math.round((clinicNetProfitRub / actualPatientPriceRub) * 1000) / 10 : 0;

	// Почасовая доходность клиники (нормализованная к 60 минутам)
	const clinicHourlyProfitabilityRub =
		procInput.durationMinutes > 0
			? Math.round((clinicNetProfitRub / procInput.durationMinutes) * 60)
			: clinicNetProfitRub;

	const isLossMaking = clinicNetProfitRub < 0;

	// Расчет цены безубыточности (Break-Even)
	// Price - Consumables - Lab - ChairOverhead - Assistant - Acquiring(Price) - Doc(Price - Lab) = 0
	// Price * (1 - Acquiring - DocRate) = Consumables + ChairOverhead + Assistant + Lab * (1 - DocRate)
	const docRate = procInput.doctorCommissionRate;
	const acqRate = procInput.acquiringRate;
	const divisor = 1 - acqRate - (procInput.deductLabFromDoctorBase ? docRate : docRate);
	const rawBreakEven =
		divisor > 0
			? (procInput.directConsumablesRub +
					chairOverheadCostRub +
					procInput.assistantFeeRub +
					procInput.labTechnicianCostRub * (procInput.deductLabFromDoctorBase ? 1 - docRate : 1)) /
				divisor
			: totalProcedureCostRub;
	const breakEvenMinimumPriceRub = Math.round(rawBreakEven);

	// Эрозия прибыли от скидки
	// Если бы скидки не было:
	const noDiscountBase = procInput.deductLabFromDoctorBase
		? Math.max(0, procInput.patientPriceRub - procInput.labTechnicianCostRub)
		: procInput.patientPriceRub;
	const noDiscountDoc = Math.round(noDiscountBase * procInput.doctorCommissionRate);
	const noDiscountCost =
		procInput.directConsumablesRub +
		procInput.labTechnicianCostRub +
		chairOverheadCostRub +
		Math.round(procInput.patientPriceRub * procInput.acquiringRate) +
		procInput.assistantFeeRub +
		noDiscountDoc;
	const noDiscountProfit = procInput.patientPriceRub - noDiscountCost;
	const discountProfitErosionPercent =
		noDiscountProfit > 0 && discountAmountRub > 0
			? Math.min(100, Math.round(((noDiscountProfit - clinicNetProfitRub) / noDiscountProfit) * 100))
			: 0;

	const prolongationCostPer30MinRub = Math.round(chairCost.minuteCostRealOccupiedRub * 30);

	let executiveDiagnosticRu = `Маржинальность здоровая (${clinicNetMarginPercent}%).`;
	if (isLossMaking) {
		executiveDiagnosticRu = `ВНИМАНИЕ: Процедура убыточна! Клиника теряет ${Math.abs(clinicNetProfitRub)} ₽ на каждом приёме. Поднимите цену минимум до ${breakEvenMinimumPriceRub} ₽.`;
	} else if (clinicNetMarginPercent < 15) {
		executiveDiagnosticRu = `Критически низкая маржа (${clinicNetMarginPercent}%). Любая задержка на 15 мин уведет прием в минус.`;
	} else if (discountProfitErosionPercent >= 30) {
		executiveDiagnosticRu = `Скидка ${Math.round(procInput.discountRate * 100)}% уничтожила ${discountProfitErosionPercent}% чистой прибыли клиники!`;
	}

	return {
		procedureName: procInput.procedureName,
		durationMinutes: procInput.durationMinutes,
		nominalPatientPriceRub: procInput.patientPriceRub,
		actualPatientPriceRub,
		discountAmountRub,
		directConsumablesRub: procInput.directConsumablesRub,
		labTechnicianCostRub: procInput.labTechnicianCostRub,
		chairOverheadCostRub,
		acquiringFeeRub,
		assistantFeeRub: procInput.assistantFeeRub,
		doctorWageBaseRub,
		doctorEarningsRub,
		totalProcedureCostRub,
		clinicNetProfitRub,
		clinicNetMarginPercent,
		clinicHourlyProfitabilityRub,
		isLossMaking,
		breakEvenMinimumPriceRub,
		discountProfitErosionPercent,
		prolongationCostPer30MinRub,
		executiveDiagnosticRu,
	};
}
