/**
 * types.ts — Types and DTO contracts for Doctor Net Salary & T-51 Payroll.
 * Layer 0: Types & DTOs (0 runtime dependencies).
 */

import type { Kopecks } from "../../money.js";
import type { IdentMaterialWriteoffResult } from "../../warehouse/identMaterialWriteoffEngine.js";

export interface SpecialtyCategoryRates {
	readonly therapyPercent?: number; // Терапия
	readonly orthopedicsPercent?: number; // Ортопедия
	readonly surgeryPercent?: number; // Хирургия / имплантология
	readonly orthodonticsPercent?: number; // Ортодонтия
	readonly hygienePercent?: number; // Гигиена
	readonly periodontologyPercent?: number; // Пародонтология
	readonly otherPercent?: number; // Прочие услуги
}

export type DentalSpecialtyCategory =
	| "therapy"
	| "orthopedics"
	| "surgery"
	| "orthodontics"
	| "hygiene"
	| "periodontology"
	| "other";

export const DENTAL_SPECIALTY_NAMES_RU: Record<DentalSpecialtyCategory, string> = {
	therapy: "Терапевтическая стоматология (пломбы, эндодонтия)",
	orthopedics: "Ортопедическая стоматология (коронки, протезы, виниры)",
	surgery: "Хирургия и имплантология (удаления, импланты, пластика)",
	orthodontics: "Ортодонтия (брекеты, элайнеры, пластинки)",
	hygiene: "Профессиональная гигиена и отбеливание",
	periodontology: "Пародонтология и консервативное лечение",
	other: "Консультации, диагностика и прочие услуги",
};

export interface CategoryAccrualBreakdown {
	readonly category: DentalSpecialtyCategory;
	readonly categoryNameRu: string;
	readonly appliedPercent: number;
	readonly grossRevenueKop: Kopecks;
	readonly grossRevenueRub: number;
	readonly netBaseKop: Kopecks;
	readonly netBaseRub: number;
	readonly accruedKop: Kopecks;
	readonly accruedRub: number;
}

/**
 * Политики распределения скидок и частичной оплаты IDENT (IDENT Payroll Models):
 * 1. "gross_unconditional": «Без учета скидки» (Формула 1 IDENT) — скидки покрываются клиникой, врач получает 100% со своей базы.
 * 2. "clinic_first": «Сначала клиника» — из внесенных пациентом средств сначала компенсируются расходы клиники (материалы + ЗТЛ).
 * 3. "doctor_first": «Сначала врач» — из внесенных пациентом средств сначала выплачивается вознаграждение врачу.
 * 4. "proportional": «Пропорционально» — оплаченная сумма делит чистую базу пропорционально коэффициенту оплаты (paid / invoiceTotal).
 */
export type IdentDiscountAllocationPolicy =
	| "clinic_first"
	| "doctor_first"
	| "proportional"
	| "gross_unconditional";

export interface IdentDiscountSalaryBaseParams {
	readonly grossRevenueKop: Kopecks;
	readonly invoiceTotalKop: Kopecks;
	readonly paidKop: Kopecks;
	readonly discountKop: Kopecks;
	readonly clinicCostsKop: Kopecks;
	readonly policy: IdentDiscountAllocationPolicy;
}

export interface IdentDiscountSalaryBaseResult {
	readonly doctorBaseKop: Kopecks;
	readonly doctorBaseRub: number;
	readonly clinicShareKop: Kopecks;
	readonly clinicShareRub: number;
	readonly policyApplied: IdentDiscountAllocationPolicy;
	readonly isFullyPaid: boolean;
	readonly debtKop: Kopecks;
	readonly debtRub: number;
}

/**
 * Разовое удержание из процента врача (Dentaro: компенсация брака/переделок ЗТЛ).
 */
export interface DoctorOneTimeDeduction {
	readonly id: string;
	readonly amountKop: Kopecks;
	readonly reason: string;
	readonly orderNumber?: string;
}

export interface DoctorNetSalaryInput {
	/** Общая выручка от оказанных услуг (Gross) в рублях или копейках */
	readonly grossRevenueRub?: number;
	readonly grossRevenueKop?: Kopecks;

	/** Прямые расходы на зуботехническую лабораторию (ЗТЛ / Lab) */
	readonly labCostRub?: number;
	readonly labCostKop?: Kopecks;

	/** Прямая себестоимость списанных по техкарте расходных материалов (исключая салфетки/валики) */
	readonly materialsCostRub?: number;
	readonly materialsCostKop?: Kopecks;

	/** Себестоимость общеклинических расходников (салфетки, валики, слюноотсосы), покрываемых клиникой */
	readonly overheadConsumablesRub?: number;
	readonly overheadConsumablesKop?: Kopecks;

	/** Процент врача от чистой базы (напр. 25 = 25%) */
	readonly categoryPercent: number;

	/** Персональные ставки по клиническим категориям (терапия, ортопедия, хирургия, ортодонтия, гигиена) */
	readonly specialtyRates?: SpecialtyCategoryRates;

	/** Фиксированный оклад за период (при наличии) */
	readonly fixedSalaryRub?: number;
	readonly fixedSalaryKop?: Kopecks;

	/** Начисления по фиксированной ставке за конкретные процедуры (salary_price) */
	readonly serviceSalaryPriceRub?: number;
	readonly serviceSalaryPriceKop?: Kopecks;

	/** Индивидуальные премии и надбавки (бонусы) */
	readonly bonusesRub?: number;
	readonly bonusesKop?: Kopecks;

	/** Штрафы и удержания */
	readonly penaltiesRub?: number;
	readonly penaltiesKop?: Kopecks;

	/** Разовые удержания из процента врача (Dentaro: лабораторный брак, переделки) */
	readonly oneTimeDeductions?: readonly DoctorOneTimeDeduction[];

	/** Ставка НДФЛ в процентах (по умолчанию 13%) */
	readonly ndflRatePercent?: number;
}

export interface DoctorNetSalaryBreakdown {
	/** Выручка Gross */
	readonly grossRevenueKop: Kopecks;
	readonly grossRevenueRub: number;

	/** Расход на ЗТЛ */
	readonly labCostKop: Kopecks;
	readonly labCostRub: number;

	/** Расход на материалы */
	readonly materialsCostKop: Kopecks;
	readonly materialsCostRub: number;

	/** Чистая база начисления = Gross - Lab - Materials */
	readonly netBaseRevenueKop: Kopecks;
	readonly netBaseRevenueRub: number;

	/** Примененный процент врача */
	readonly categoryPercent: number;

	/** Сдельное вознаграждение = NetBase * Category% */
	readonly pieceworkAccruedKop: Kopecks;
	readonly pieceworkAccruedRub: number;

	/** Фиксированный оклад */
	readonly fixedSalaryKop: Kopecks;
	readonly fixedSalaryRub: number;

	/** Сумма по фиксированным ставкам за процедуры (salary_price) */
	readonly serviceSalaryPriceKop: Kopecks;
	readonly serviceSalaryPriceRub: number;

	/** Бонусы и премии (стимулирующая часть) */
	readonly bonusesKop: Kopecks;
	readonly bonusesRub: number;

	/** Депремирование (уменьшение премии по регламенту) */
	readonly penaltiesKop: Kopecks;
	readonly penaltiesRub: number;

	/** Эффективная премия с учетом депремирования (не менее 0) */
	readonly effectiveBonusesKop: Kopecks;
	readonly effectiveBonusesRub: number;

	/** Итого начислено до налогообложения по ТК РФ = Piecework + Fixed + SalaryPrice + EffectiveBonuses */
	readonly totalAccruedKop: Kopecks;
	readonly totalAccruedRub: number;

	/** Ставка НДФЛ */
	readonly ndflRatePercent: number;

	/** Удержанный НДФЛ 13% */
	readonly ndflTaxKop: Kopecks;
	readonly ndflTaxRub: number;
	/** Себестоимость общеклинических расходников (салфетки, валики), оплаченных клиникой */
	readonly overheadConsumablesCoveredKop: Kopecks;
	readonly overheadConsumablesCoveredRub: number;

	/** Детализация начислений по медицинским категориям (терапия, ортопедия, хирургия, ортодонтия, гигиена) */
	readonly categoriesBreakdown?: readonly CategoryAccrualBreakdown[] | undefined;

	/** Разовые вычеты из вознаграждения врача (Dentaro: лабораторный брак, переделки) */
	readonly oneTimeDeductions?: readonly DoctorOneTimeDeduction[] | undefined;
	readonly oneTimeDeductionsTotalKop: Kopecks;
	readonly oneTimeDeductionsTotalRub: number;

	/** Чистая выплата "На руки" = TotalAccrued - NDFL */
	readonly netPayoutKop: Kopecks;
	readonly netPayoutRub: number;

	/** Форматированные строки для печати ведомости Т-51 */
	readonly formattedGross: string;
	readonly formattedNetBase: string;
	readonly formattedTotalAccrued: string;
	readonly formattedNdflTax: string;
	readonly formattedNetPayout: string;
}

export interface ServiceSalaryItemInput {
	readonly id: string;
	readonly title: string;
	readonly priceRub: number;
	readonly labCostRub?: number;
	readonly materialsCostRub?: number;
	readonly salaryPriceRub?: number;
	readonly categoryPercent?: number;
	readonly isExpensive?: boolean;
}

export interface ServiceSalaryItemBreakdown {
	readonly id: string;
	readonly title: string;
	readonly priceKop: Kopecks;
	readonly labCostKop: Kopecks;
	readonly materialsCostKop: Kopecks;
	readonly netBaseKop: Kopecks;
	readonly salaryPriceKop: Kopecks;
	readonly categoryPercent: number;
	readonly doctorEarningsKop: Kopecks;
	readonly isExpensive: boolean;
}

/**
 * 3 канонические модели расчета сдельной заработной платы врачей IDENT:
 * 1. "gross": По валовой выручке (Gross). Начисление от прейскурантной стоимости услуг. Клиника берет все расходы (ЗТЛ и материалы) на себя.
 * 2. "net": По чистой выручке (Net). Из базы вычитаются расходы на ЗТЛ и прямые дорогостоящие материалы (Уровень 2: expensive_clinical).
 *    Общеклинические накладные материалы (Уровень 1: cheap_overhead — салфетки, валики, слюноотсосы) НЕ удерживаются (ст. 129 ТК РФ).
 * 3. "cash_basis": По кассовому чеку (Cash Basis). Начисление строго по факту поступления средств в кассу/на р/сч.
 *    Поддерживает «Цену для ЗП» (salary_price) и 4 политики распределения скидок и частичных оплат.
 */
export type IdentSalaryModel = "gross" | "net" | "cash_basis";

export const IDENT_SALARY_MODEL_NAMES_RU: Record<IdentSalaryModel, string> = {
	gross: "По валовой выручке (Gross — без вычета лаборатории и материалов)",
	net: "По чистой выручке (Net — за вычетом прямых материалов и ЗТЛ)",
	cash_basis: "По кассовому чеку (Cash Basis — по факту денег в кассе с учетом «Цены для ЗП»)",
};

/**
 * Способ применения «Цены для ЗП» (salary_price) в IDENT:
 * - "flat_addition": фиксированная ставка/доплата за единицу услуги к сдельщине врача.
 * - "replaces_gross_base": расчет процента ведется от эталонной «Цены для ЗП» вместо цены коммерческого прайса
 *   (актуально при маркетинговых акциях и дисконтных программах, чтобы врач не терял в доходе).
 */
export type IdentSalaryPriceApplicationMode = "flat_addition" | "replaces_gross_base";

export interface IdentDoctorSalaryCalculationParams {
	readonly model: IdentSalaryModel;
	/** Валовая стоимость оказанных услуг (Gross) в копейках или рублях */
	readonly grossRevenueKop?: Kopecks;
	readonly grossRevenueRub?: number;
	/** Итоговая сумма счета с учетом скидок пациента */
	readonly invoiceTotalKop?: Kopecks;
	readonly invoiceTotalRub?: number;
	/** Фактически оплачено пациентом в кассу (для модели cash_basis и политик частичной оплаты) */
	readonly paidAmountKop?: Kopecks;
	readonly paidAmountRub?: number;
	/** Расходы на ЗТЛ (вычитаются в модели Net и при политиках clinic_first / proportional) */
	readonly labCostKop?: Kopecks;
	readonly labCostRub?: number;
	/** Расходы на дорогие клинические материалы (Уровень 2: expensive_clinical) */
	readonly expensiveMaterialsCostKop?: Kopecks;
	readonly expensiveMaterialsCostRub?: number;
	/** Общеклинические накладные расходы (Уровень 1: cheap_overhead) — не удерживаются с врача ст. 129 ТК РФ */
	readonly overheadMaterialsCostKop?: Kopecks;
	readonly overheadMaterialsCostRub?: number;
	/** Результат 2-уровневого списания материалов IDENT (автоматически извлекает уровни 1 и 2) */
	readonly materialWriteoffResult?: IdentMaterialWriteoffResult;
	/** Процент вознаграждения врача от расчетной базы (напр. 25 = 25%) */
	readonly doctorPercent: number;
	/** «Цена для ЗП» (salary_price) из прейскуранта или номенклатуры */
	readonly salaryPriceKop?: Kopecks;
	readonly salaryPriceRub?: number;
	/** Способ применения «Цены для ЗП» (по умолчанию "flat_addition") */
	readonly salaryPriceApplication?: IdentSalaryPriceApplicationMode;
	/** Политика распределения скидок и частичной оплаты IDENT (по умолчанию "proportional") */
	readonly discountPolicy?: IdentDiscountAllocationPolicy;
	/** Гарантированный оклад за период */
	readonly fixedSalaryKop?: Kopecks;
	readonly fixedSalaryRub?: number;
	/** Стимулирующие премии и бонусы */
	readonly bonusesKop?: Kopecks;
	readonly bonusesRub?: number;
	/** Регламентное депремирование (ст. 137, 192 ТК РФ — только из бонусов) */
	readonly penaltiesKop?: Kopecks;
	readonly penaltiesRub?: number;
	/** Разовые вычеты из процента (Dentaro: лабораторный брак, переделки) */
	readonly oneTimeDeductions?: readonly DoctorOneTimeDeduction[];
	/** Ставка НДФЛ (по умолчанию 13%) */
	readonly ndflRatePercent?: number;
}

export interface IdentDoctorSalaryCalculationResult {
	readonly model: IdentSalaryModel;
	readonly modelNameRu: string;
	readonly grossRevenueKop: Kopecks;
	readonly grossRevenueRub: number;
	/** Эффективная расчетная база, с которой начислен процент врача */
	readonly effectiveBaseKop: Kopecks;
	readonly effectiveBaseRub: number;
	readonly appliedPercent: number;
	/** Сдельное начисление врача (Base * %) */
	readonly pieceworkAccruedKop: Kopecks;
	readonly pieceworkAccruedRub: number;
	/** Доплата за процедуры по «Цене для ЗП» (при flat_addition) */
	readonly salaryPriceAdditionKop: Kopecks;
	readonly salaryPriceAdditionRub: number;
	/** Фиксированный оклад */
	readonly fixedSalaryKop: Kopecks;
	readonly fixedSalaryRub: number;
	/** Бонусы до депремирования */
	readonly bonusesKop: Kopecks;
	readonly bonusesRub: number;
	/** Сумма депремирования */
	readonly penaltiesKop: Kopecks;
	readonly penaltiesRub: number;
	/** Эффективные премии (бонусы за вычетом депремирования) */
	readonly effectiveBonusesKop: Kopecks;
	readonly effectiveBonusesRub: number;
	/** Разовые удержания Dentaro */
	readonly oneTimeDeductionsTotalKop: Kopecks;
	readonly oneTimeDeductionsTotalRub: number;
	/** Итого начислено до налога */
	readonly totalAccruedKop: Kopecks;
	readonly totalAccruedRub: number;
	/** НДФЛ (13%) */
	readonly ndflTaxKop: Kopecks;
	readonly ndflTaxRub: number;
	/** Чистая выплата «На руки» */
	readonly netPayoutKop: Kopecks;
	readonly netPayoutRub: number;
	/** Для модели Cash Basis: отложенный остаток вознаграждения до погашения долга пациентом */
	readonly deferredPendingDoctorEarningsKop: Kopecks;
	readonly deferredPendingDoctorEarningsRub: number;
	/** Доля фактической оплаты по кассе (0..1) */
	readonly paidRatio: number;
	/** Фактически удержанные расходы на ЗТЛ */
	readonly deductedLabKop: Kopecks;
	readonly deductedLabRub: number;
	/** Фактически удержанные дорогие материалы Уровня 2 */
	readonly deductedExpensiveMaterialsKop: Kopecks;
	readonly deductedExpensiveMaterialsRub: number;
	/** Общеклинические расходники Уровня 1, покрытые клиникой (гарантия ст. 129 ТК РФ) */
	readonly coveredOverheadMaterialsKop: Kopecks;
	readonly coveredOverheadMaterialsRub: number;
}

export interface DoctorT51VisitItem {
	readonly visitId: string;
	readonly visitDate: string;
	readonly patientName: string;
	readonly medicalCardNumber: string;
	readonly serviceTitle: string;
	readonly order804nCode?: string | null;
	readonly toothCode?: string | null;
	readonly priceRub: number;
	readonly accruedRub: number;
}

export interface DoctorT51LabItem {
	readonly orderNumber: string;
	readonly patientName: string;
	readonly restorationType: string;
	readonly toothFdi?: string | null;
	readonly priceRub: number;
	readonly withheldRub: number;
	readonly isWarranty: boolean;
}

export interface DoctorT51PrintPayload {
	readonly organizationName: string;
	readonly organizationInn?: string | undefined;
	readonly doctorName: string;
	readonly personnelNumber?: string | undefined;
	readonly specialtyTitle: string;
	readonly periodFromIso: string;
	readonly periodToIso: string;
	readonly grossRevenueRub: number;
	readonly netBaseRevenueRub: number;
	readonly pieceworkAccruedRub: number;
	readonly fixedSalaryRub?: number | undefined;
	readonly bonusesRub?: number | undefined;
	readonly totalAccruedRub: number;
	readonly ndflTaxRub: number;
	readonly withheldLabRub: number;
	readonly withheldMaterialRub: number;
	readonly overheadConsumablesCoveredRub?: number | undefined;
	readonly netPayoutRub: number;
	readonly categoryBreakdown?: readonly CategoryAccrualBreakdown[] | undefined;
	readonly visits?: readonly DoctorT51VisitItem[] | undefined;
	readonly labOrders?: readonly DoctorT51LabItem[] | undefined;
}
