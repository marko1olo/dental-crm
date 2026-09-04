/**
 * doctorNetSalaryEngine.ts — Statutory Doctor Net Revenue & Form T-51 Payroll Engine.
 * 
 * ФОРМУЛА РАСЧЕТА ЧИСТОЙ ВЫРУЧКИ И ЗАРПЛАТЫ (Net Revenue Formula):
 * 1. Чистая база = Gross (Выручка) - Lab (ЗТЛ) - Materials (Себестоимость материалов)
 * 2. Начислено врачу = Чистая база * Category% + Fixed (Оклад) + salary_price (Фикс за услуги) + Эффективные премии
 *    В соответствии со ст. 137 и ст. 192 ТК РФ дисциплинарные штрафы и удержания из оклада / сдельной базы запрещены.
 *    Депремирование возможно исключительно путем неначисления или уменьшения стимулирующих выплат (бонусов)!
 * 3. На руки = Начислено врачу - 13% НДФЛ (или настраиваемая ставка налога)
 * 
 * Расчеты ведутся строго в целых копейках (Kopecks) для 100% защиты от float-дрейфа.
 */

import {
	type Kopecks,
	formatKopecksRu,
	parseKopecks,
	rublesToKopecks,
} from "../money.js";
import { kopecksToRub as kopecksToRubles } from "../fiscal/kopecksArithmetic.js";

export interface DoctorNetSalaryInput {
	/** Общая выручка от оказанных услуг (Gross) в рублях или копейках */
	readonly grossRevenueRub?: number;
	readonly grossRevenueKop?: Kopecks;

	/** Прямые расходы на зуботехническую лабораторию (ЗТЛ / Lab) */
	readonly labCostRub?: number;
	readonly labCostKop?: Kopecks;

	/** Прямая себестоимость списанных по техкарте расходных материалов */
	readonly materialsCostRub?: number;
	readonly materialsCostKop?: Kopecks;

	/** Процент врача от чистой базы (напр. 25 = 25%) */
	readonly categoryPercent: number;

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

function toKop(rub: number | undefined, kop: Kopecks | undefined): Kopecks {
	if (kop !== undefined) return kop;
	if (rub === undefined || rub === 0) return 0 as Kopecks;
	return Math.round(rub * 100) as Kopecks;
}

/**
 * Рассчитывает заработную плату врача по формуле Net Revenue с копеечной точностью.
 */
export function calculateDoctorNetSalary(input: DoctorNetSalaryInput): DoctorNetSalaryBreakdown {
	const grossRevenueKop = toKop(input.grossRevenueRub, input.grossRevenueKop);
	const labCostKop = toKop(input.labCostRub, input.labCostKop);
	const materialsCostKop = toKop(input.materialsCostRub, input.materialsCostKop);

	// Чистая база = Gross - Lab - Materials (не может быть отрицательной)
	const netBaseRevenueKop = Math.max(0, grossRevenueKop - labCostKop - materialsCostKop) as Kopecks;

	const categoryPercent = Math.max(0, Math.min(100, input.categoryPercent));
	const pieceworkAccruedKop = Math.round((netBaseRevenueKop * categoryPercent) / 100) as Kopecks;

	const fixedSalaryKop = toKop(input.fixedSalaryRub, input.fixedSalaryKop);
	const serviceSalaryPriceKop = toKop(input.serviceSalaryPriceRub, input.serviceSalaryPriceKop);
	const bonusesKop = toKop(input.bonusesRub, input.bonusesKop);
	const penaltiesKop = toKop(input.penaltiesRub, input.penaltiesKop);

	// Депремирование по ТК РФ (ст. 137, 192): неначисление или уменьшение стимулирующей премии,
	// но категорически запрещено вычитать штрафы из сдельной части, оклада или процедурных тарифов!
	const effectiveBonusesKop = Math.max(0, bonusesKop - penaltiesKop) as Kopecks;

	// Общее начисление до налога
	const rawAccruedKop = pieceworkAccruedKop + fixedSalaryKop + serviceSalaryPriceKop + effectiveBonusesKop;
	const totalAccruedKop = Math.max(0, rawAccruedKop) as Kopecks;

	const ndflRatePercent = input.ndflRatePercent !== undefined ? Math.max(0, input.ndflRatePercent) : 13;
	const ndflTaxKop = Math.round((totalAccruedKop * ndflRatePercent) / 100) as Kopecks;

	// Сумма на руки
	const netPayoutKop = Math.max(0, totalAccruedKop - ndflTaxKop) as Kopecks;

	return {
		grossRevenueKop,
		grossRevenueRub: kopecksToRubles(grossRevenueKop),
		labCostKop,
		labCostRub: kopecksToRubles(labCostKop),
		materialsCostKop,
		materialsCostRub: kopecksToRubles(materialsCostKop),
		netBaseRevenueKop,
		netBaseRevenueRub: kopecksToRubles(netBaseRevenueKop),
		categoryPercent,
		pieceworkAccruedKop,
		pieceworkAccruedRub: kopecksToRubles(pieceworkAccruedKop),
		fixedSalaryKop,
		fixedSalaryRub: kopecksToRubles(fixedSalaryKop),
		serviceSalaryPriceKop,
		serviceSalaryPriceRub: kopecksToRubles(serviceSalaryPriceKop),
		bonusesKop,
		bonusesRub: kopecksToRubles(bonusesKop),
		penaltiesKop,
		penaltiesRub: kopecksToRubles(penaltiesKop),
		effectiveBonusesKop,
		effectiveBonusesRub: kopecksToRubles(effectiveBonusesKop),
		totalAccruedKop,
		totalAccruedRub: kopecksToRubles(totalAccruedKop),
		ndflRatePercent,
		ndflTaxKop,
		ndflTaxRub: kopecksToRubles(ndflTaxKop),
		netPayoutKop,
		netPayoutRub: kopecksToRubles(netPayoutKop),
		formattedGross: formatKopecksRu(grossRevenueKop),
		formattedNetBase: formatKopecksRu(netBaseRevenueKop),
		formattedTotalAccrued: formatKopecksRu(totalAccruedKop),
		formattedNdflTax: formatKopecksRu(ndflTaxKop),
		formattedNetPayout: formatKopecksRu(netPayoutKop),
	};
}

/**
 * Рассчитывает детализацию вознаграждения по списку индивидуальных оказанных услуг.
 */
export function calculateServicesPayrollBreakdown(
	items: readonly ServiceSalaryItemInput[],
	defaultCategoryPercent: number = 25,
): {
	items: ServiceSalaryItemBreakdown[];
	totalGrossKop: Kopecks;
	totalLabKop: Kopecks;
	totalMaterialsKop: Kopecks;
	totalNetBaseKop: Kopecks;
	totalDoctorEarningsKop: Kopecks;
} {
	let totalGrossKop = 0 as Kopecks;
	let totalLabKop = 0 as Kopecks;
	let totalMaterialsKop = 0 as Kopecks;
	let totalNetBaseKop = 0 as Kopecks;
	let totalDoctorEarningsKop = 0 as Kopecks;

	const breakdowns: ServiceSalaryItemBreakdown[] = [];

	for (const item of items) {
		const priceKop = toKop(item.priceRub, undefined);
		const labCostKop = toKop(item.labCostRub, undefined);
		const materialsCostKop = toKop(item.materialsCostRub, undefined);
		const salaryPriceKop = toKop(item.salaryPriceRub, undefined);
		const categoryPercent = item.categoryPercent ?? defaultCategoryPercent;

		const netBaseKop = Math.max(0, priceKop - labCostKop - materialsCostKop) as Kopecks;
		const pieceworkKop = Math.round((netBaseKop * categoryPercent) / 100) as Kopecks;
		const doctorEarningsKop = (pieceworkKop + salaryPriceKop) as Kopecks;

		totalGrossKop = (totalGrossKop + priceKop) as Kopecks;
		totalLabKop = (totalLabKop + labCostKop) as Kopecks;
		totalMaterialsKop = (totalMaterialsKop + materialsCostKop) as Kopecks;
		totalNetBaseKop = (totalNetBaseKop + netBaseKop) as Kopecks;
		totalDoctorEarningsKop = (totalDoctorEarningsKop + doctorEarningsKop) as Kopecks;

		breakdowns.push({
			id: item.id,
			title: item.title,
			priceKop,
			labCostKop,
			materialsCostKop,
			netBaseKop,
			salaryPriceKop,
			categoryPercent,
			doctorEarningsKop,
			isExpensive: Boolean(item.isExpensive),
		});
	}

	return {
		items: breakdowns,
		totalGrossKop,
		totalLabKop,
		totalMaterialsKop,
		totalNetBaseKop,
		totalDoctorEarningsKop,
	};
}
