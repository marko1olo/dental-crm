import type { DentalSpecialtyCategory, CategoryAccrualBreakdown } from "@dental/shared";
import type { ReportPeriod } from "../../reports/managerReports.js";

/**
 * Предел ширины периода — тот же, что у отчётов руководителю
 * (`routes/reports.ts`). Слишком широкий диапазон отклоняется, а не обрезается
 * молча: расчёт «за всё время», выданный за расчёт «за год», хуже отказа —
 * по нему заплатят зарплату.
 */
export const MAX_PAYOUT_PERIOD_DAYS = 400;

export type ResolvedPayoutPeriod =
	| { readonly ok: true; readonly from: Date; readonly to: Date }
	| { readonly ok: false; readonly message: string };

export type DoctorPayoutScope = ReportPeriod & {
	readonly organizationId: string;
	/**
	 * Врач, которому разрешено видеть только свои выплаты (право
	 * `payroll.read.own`). Фильтр применяется в SQL, а не после выборки: строки
	 * чужой зарплаты не должны покидать базу вовсе.
	 */
	readonly onlyDoctorUserId?: string | null;
};

/** Состояние расчёта по врачу. Ни одно из значений не подменяет другое. */
export type DoctorPayoutState =
	/** Ставка есть, выплата посчитана. */
	| "computed"
	/** Ставки нет ни одной активной строки — считать не из чего. */
	| "rate_missing"
	/** Ставка в базе есть, но её значение непригодно для расчёта. */
	| "rate_invalid"
	/** Есть списания материалов, но процент удержания не задан. */
	| "material_policy_missing";

/** Что известно про себестоимость материалов врача за период. */
export type DoctorPayoutMaterialsState =
	/** Списания есть, у всех указана цена. */
	| "counted"
	/** Списаний по оплаченным визитам нет вовсе — удерживать нечего. */
	| "no_movements"
	/** Списания есть, но часть без цены или без количества: себестоимость занижена. */
	| "cost_missing";

export type DoctorPayoutVisitService = {
	readonly id: string;
	readonly title: string;
	readonly order804nCode: string | null;
	readonly category?: string | null;
	readonly specialty?: DentalSpecialtyCategory;
	readonly toothCode: string | null;
	readonly priceRub: number;
	readonly quantity: number;
};

export type DoctorPayoutVisitMaterial = {
	readonly id: string;
	readonly name: string;
	readonly quantity: number;
	readonly unit: string;
	readonly unitCostRub: number;
	readonly totalCostRub: number;
	readonly isOverheadConsumable?: boolean;
	readonly coveredByClinic?: boolean;
};

export type DoctorPayoutVisit = {
	readonly visitId: string;
	readonly appointmentId: string | null;
	readonly paidAt: string;
	readonly visitDate: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly medicalCardNumber: string;
	readonly revenueRub: number;
	readonly paymentCount: number;
	readonly services: DoctorPayoutVisitService[];
	readonly materials: DoctorPayoutVisitMaterial[];
};

export type DoctorPayoutLabOrder = {
	readonly id: string;
	readonly orderNumber: string;
	readonly toothFdi: string | null;
	readonly restorationType: string;
	readonly material: string | null;
	readonly patientName: string;
	readonly status: string;
	readonly completedAt: string | null;
	readonly priceRub: number;
	readonly withheldRub: number;
	readonly deductionPct: number;
	readonly isWarranty?: boolean;
	readonly warrantyCoveredByClinicRub?: number;
};

export type DoctorPayoutRow = {
	readonly doctorUserId: string;
	readonly doctorName: string;
	readonly role: string;
	/** Сотрудник уволен/отключён, но заработанное за период у него остаётся. */
	readonly isActive: boolean;

	/** Фактически полученные деньги: только платежи `paid` за период. */
	readonly revenueRub: number;
	readonly paymentCount: number;

	/** Себестоимость материалов по тем же визитам, чьи оплаты попали в период. */
	readonly materialCostRub: number;
	readonly materialMovements: number;
	/** Списания без цены или без количества: они не удорожают себестоимость. */
	readonly materialMovementsUnpriced: number;
	readonly materialsState: DoctorPayoutMaterialsState;

	/** Себестоимость общеклинических расходников (салфетки, валики), оплаченных клиникой. */
	readonly overheadCostRub?: number | undefined;

	/** Расходы на зуботехническую лабораторию (ЗТЛ). */
	readonly labCostRub: number;
	readonly labOrdersCount: number;
	readonly withheldLabRub: number | null;

	/** Ставка: `commission_pct`, ничто иное. null — строки ставки нет. */
	readonly commissionPct: number | null;
	readonly materialDeductionPct: number | null;
	readonly labDeductionPct?: number | null | undefined;
	readonly rateEffectiveFrom: string | null;
	/** Сколько активных ставок нашлось: уникальности в БД нет, взята свежая. */
	readonly rateRowCount: number;

	readonly state: DoctorPayoutState;
	readonly accruedRub: number | null;
	readonly withheldMaterialRub: number | null;
	readonly payoutRub: number | null;

	/** Детализация начислений по категориям (терапия, ортопедия, хирургия, ортодонтия, гигиена). */
	readonly categoryBreakdown?: readonly CategoryAccrualBreakdown[] | undefined;

	/** Печатная форма расчетного листка Т-51. */
	readonly t51Html?: string | undefined;

	/** Причина и действие человеческим языком — для показа как есть. */
	readonly note: string;

	/** Детальный реестр приемов и смен (Drill-Down). */
	readonly visits?: DoctorPayoutVisit[];
	/** Детальный реестр заказ-нарядов лаборатории (ЗТЛ). */
	readonly labOrders?: DoctorPayoutLabOrder[];
};

export type DoctorPayoutTotals = {
	/** Вся касса периода, включая то, что не отнесено ни к одному врачу. */
	readonly revenueRub: number;
	readonly paymentCount: number;
	/** Касса, дошедшая до врача по цепочке визит → приём. */
	readonly attributableRevenueRub: number;
	/** Касса без врача: платёж без визита или визит без приёма. */
	readonly unattributedRevenueRub: number;
	readonly materialCostRub: number;
	/** Себестоимость общеклинических расходников (салфетки, валики), покрываемых клиникой. */
	readonly overheadCostRub?: number;
	readonly labCostRub: number;
	/** Итоги считаются ТОЛЬКО по врачам, у которых ставка задана. */
	readonly accruedRub: number;
	readonly withheldMaterialRub: number;
	readonly withheldLabRub: number;
	readonly payoutRub: number;
	readonly doctorsCounted: number;
	readonly doctorsWithoutRate: number;
};

export type DoctorPayoutReport = {
	readonly period: { readonly from: string; readonly to: string };
	readonly rows: DoctorPayoutRow[];
	readonly totals: DoctorPayoutTotals;
	/** Как именно посчитано — обязательно к показу рядом с суммами. */
	readonly methodNote: string;
	/** Чего расчёт не умеет. Пустой массив означает «ограничений нет». */
	readonly limitations: string[];
	readonly isEmpty: boolean;
};

export type PayoutFormulaInput = {
	readonly revenueRub: number;
	readonly materialCostRub: number;
	readonly materialMovements: number;
	readonly commissionPct: number | null;
	readonly materialDeductionPct: number | null;
	readonly overheadCostRub?: number;
	readonly labCostRub?: number;
	readonly labOrdersCount?: number;
	readonly labDeductionPct?: number | null;
	readonly refundRub?: number;
	readonly refundCount?: number;
	readonly isWarranty?: boolean;
};

export type PayoutFormulaResult = {
	readonly state: DoctorPayoutState;
	readonly accruedRub: number | null;
	readonly withheldMaterialRub: number | null;
	readonly withheldLabRub: number | null;
	readonly payoutRub: number | null;
	readonly refundClawbackRub?: number;
};
