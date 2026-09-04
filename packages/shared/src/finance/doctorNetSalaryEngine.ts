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

/**
 * Определяет, относится ли расходный материал к общеклиническим накладным расходам
 * (салфетки, ватные валики, слюноотсосы, перчатки, маски, стаканчики, нагрудники, бахилы).
 * Общеклинические расходники оплачиваются клиникой и НЕ подлежат удержанию из зарплаты врача!
 */
export function isGeneralClinicOverheadConsumable(materialName: string): boolean {
	if (!materialName || typeof materialName !== "string") return false;
	return /салфетк|ватн.*валик|валик.*стомат|слюноотсос|нагрудник|бахил|стаканчик|перчатк|маск|чехол для позиционер|дезинфицирующ.*салфетк/i.test(
		materialName.trim(),
	);
}

/**
 * Классифицирует услугу по медицинской категории (терапия, ортопедия, хирургия, ортодонтия, гигиена).
 */
export function classifyServiceCategory(
	categoryOrTitle?: string | null,
	order804nCode?: string | null,
): DentalSpecialtyCategory {
	const code = (order804nCode || "").trim().toUpperCase();
	const text = (categoryOrTitle || "").toLowerCase();

	if (text.includes("therap") || text.includes("терап") || text.includes("пломб") || text.includes("кариес") || text.includes("пульпит") || text.includes("эндодонт")) {
		return "therapy";
	}
	if (text.includes("prosthet") || text.includes("ортопед") || text.includes("коронк") || text.includes("протез") || text.includes("винир") || text.includes("вкладк")) {
		return "orthopedics";
	}
	if (text.includes("surg") || text.includes("хирург") || text.includes("имплант") || text.includes("удалени") || text.includes("синус") || text.includes("костн")) {
		return "surgery";
	}
	if (text.includes("orthodont") || text.includes("ортодонт") || text.includes("брекет") || text.includes("элайнер") || text.includes("дуг") || text.includes("пластинк")) {
		return "orthodontics";
	}
	if (text.includes("hygien") || text.includes("гигиен") || text.includes("отбеливан") || text.includes("air flow") || text.includes("чистк")) {
		return "hygiene";
	}
	if (text.includes("periodont") || text.includes("пародонт") || text.includes("вектор") || text.includes("кюретаж")) {
		return "periodontology";
	}

	// Коды Номенклатуры 804н
	if (code.startsWith("A16.07.002") || code.startsWith("A16.07.003") || code.startsWith("A16.07.030") || code.startsWith("A16.07.082")) {
		return "therapy";
	}
	if (code.startsWith("A16.07.004") || code.startsWith("A16.07.005") || code.startsWith("A16.07.006") || code.startsWith("A16.07.023")) {
		return "orthopedics";
	}
	if (code.startsWith("A16.07.001") || code.startsWith("A16.07.007") || code.startsWith("A16.07.011") || code.startsWith("A16.07.012") || code.startsWith("A16.07.041")) {
		return "surgery";
	}
	if (code.startsWith("A16.07.028") || code.startsWith("A16.07.047") || code.startsWith("A16.07.048")) {
		return "orthodontics";
	}
	if (code.startsWith("A16.07.051") || code.startsWith("A22.07.001")) {
		return "hygiene";
	}

	return "other";
}

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
	readonly categoriesBreakdown?: readonly CategoryAccrualBreakdown[];

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
	const overheadConsumablesCoveredKop = toKop(input.overheadConsumablesRub, input.overheadConsumablesKop);

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
		overheadConsumablesCoveredKop,
		overheadConsumablesCoveredRub: kopecksToRubles(overheadConsumablesCoveredKop),
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
	readonly organizationInn?: string;
	readonly doctorName: string;
	readonly personnelNumber?: string;
	readonly specialtyTitle: string;
	readonly periodFromIso: string;
	readonly periodToIso: string;
	readonly grossRevenueRub: number;
	readonly netBaseRevenueRub: number;
	readonly pieceworkAccruedRub: number;
	readonly fixedSalaryRub?: number;
	readonly bonusesRub?: number;
	readonly totalAccruedRub: number;
	readonly ndflTaxRub: number;
	readonly withheldLabRub: number;
	readonly withheldMaterialRub: number;
	readonly overheadConsumablesCoveredRub?: number;
	readonly netPayoutRub: number;
	readonly categoryBreakdown?: readonly CategoryAccrualBreakdown[];
	readonly visits?: readonly DoctorT51VisitItem[];
	readonly labOrders?: readonly DoctorT51LabItem[];
}

/**
 * Генерирует официальный печатный HTML унифицированной формы Т-51 (Расчетная ведомость / листок).
 * В соответствии с Постановлением Госкомстата РФ № 1 от 05.01.2004 и клиническим стандартом DENTE.
 */
export function generateDoctorT51Html(payload: DoctorT51PrintPayload): string {
	const fromDate = new Date(payload.periodFromIso).toLocaleDateString("ru-RU");
	const toDate = new Date(payload.periodToIso).toLocaleDateString("ru-RU");
	const formatMoney = (rub: number) => rub.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₽";

	const visitsHtml = (payload.visits || []).map((v, i) => `
		<tr>
			<td style="text-align: center;">${i + 1}</td>
			<td>${new Date(v.visitDate).toLocaleDateString("ru-RU")}</td>
			<td><strong>${v.patientName}</strong> (${v.medicalCardNumber})</td>
			<td>${v.toothCode ? `Зуб ${v.toothCode}: ` : ""}${v.serviceTitle}</td>
			<td style="font-family: monospace; text-align: center;">${v.order804nCode || "A16.07.002"}</td>
			<td style="font-family: monospace; text-align: right;">${formatMoney(v.priceRub)}</td>
			<td style="font-family: monospace; text-align: right; font-weight: bold; color: #047857;">${formatMoney(v.accruedRub)}</td>
		</tr>
	`).join("");

	const labHtml = (payload.labOrders || []).map((l, i) => `
		<tr>
			<td style="text-align: center;">${i + 1}</td>
			<td style="font-family: monospace; font-weight: bold;">${l.orderNumber}</td>
			<td>${l.patientName}</td>
			<td>${l.toothFdi ? `Зуб ${l.toothFdi}: ` : ""}${l.restorationType}</td>
			<td style="font-family: monospace; text-align: right;">${formatMoney(l.priceRub)}</td>
			<td style="text-align: center;">${l.isWarranty ? '<span style="color: #2563eb; font-weight: bold;">Гарантия (0 ₽)</span>' : '<span style="color: #b91c1c;">Удержание</span>'}</td>
			<td style="font-family: monospace; text-align: right; font-weight: bold;">${formatMoney(l.withheldRub)}</td>
		</tr>
	`).join("");

	const categoryRowsHtml = (payload.categoryBreakdown || []).map((cat) => `
		<tr>
			<td>${cat.categoryNameRu}</td>
			<td style="text-align: center; font-family: monospace;">${cat.appliedPercent}%</td>
			<td style="text-align: right; font-family: monospace;">${formatMoney(cat.grossRevenueRub)}</td>
			<td style="text-align: right; font-family: monospace;">${formatMoney(cat.netBaseRub)}</td>
			<td style="text-align: right; font-family: monospace; font-weight: bold;">${formatMoney(cat.accruedRub)}</td>
		</tr>
	`).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Расчетный листок Т-51 — ${payload.doctorName}</title>
	<style>
		@page { size: A4 portrait; margin: 12mm; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
			font-size: 11px;
			line-height: 1.4;
			color: #1e293b;
			margin: 0;
			padding: 0;
			background: #ffffff;
		}
		.t51-header {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
			border-bottom: 2px solid #0f172a;
			padding-bottom: 8px;
			margin-bottom: 12px;
		}
		.clinic-title { font-size: 15px; font-weight: 800; text-transform: uppercase; color: #0f172a; }
		.clinic-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
		.okud-badge {
			text-align: right;
			font-size: 9px;
			color: #475569;
			border: 1px solid #cbd5e1;
			padding: 4px 8px;
			border-radius: 4px;
		}
		.doc-title {
			text-align: center;
			font-size: 14px;
			font-weight: 900;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			margin: 10px 0 14px;
		}
		.meta-grid {
			display: grid;
			grid-template-columns: 2fr 1fr 1fr;
			gap: 8px;
			background: #f8fafc;
			border: 1px solid #e2e8f0;
			border-radius: 6px;
			padding: 8px 12px;
			margin-bottom: 14px;
		}
		.meta-item { display: flex; flex-direction: column; }
		.meta-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; }
		.meta-value { font-size: 12px; font-weight: 700; color: #0f172a; }
		table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 14px;
			font-size: 10.5px;
		}
		th {
			background: #f1f5f9;
			color: #334155;
			font-weight: 700;
			text-align: left;
			padding: 5px 6px;
			border: 1px solid #cbd5e1;
			font-size: 9.5px;
			text-transform: uppercase;
		}
		td {
			padding: 5px 6px;
			border: 1px solid #cbd5e1;
			vertical-align: middle;
		}
		.section-title {
			font-size: 11px;
			font-weight: 800;
			text-transform: uppercase;
			color: #0f172a;
			margin: 12px 0 6px;
			display: flex;
			align-items: center;
			gap: 6px;
		}
		.total-banner {
			display: flex;
			justify-content: space-between;
			align-items: center;
			background: #f0fdf4;
			border: 2px solid #86efac;
			border-radius: 6px;
			padding: 10px 14px;
			margin: 14px 0;
		}
		.total-banner .lbl { font-size: 12px; font-weight: 800; color: #166534; text-transform: uppercase; }
		.total-banner .val { font-size: 18px; font-weight: 900; font-family: monospace; color: #14532d; }
		.overhead-notice {
			background: #eff6ff;
			border: 1px dashed #93c5fd;
			border-radius: 6px;
			padding: 6px 10px;
			font-size: 10px;
			color: #1e40af;
			margin-bottom: 12px;
		}
		.signatures {
			display: grid;
			grid-template-columns: 1fr 1fr 1fr;
			gap: 16px;
			margin-top: 24px;
			padding-top: 14px;
			border-top: 1px solid #cbd5e1;
		}
		.sig-block { font-size: 10px; }
		.sig-line { border-bottom: 1px solid #94a3b8; height: 24px; margin-bottom: 4px; }
	</style>
</head>
<body>
	<div class="t51-header">
		<div>
			<div class="clinic-title">${payload.organizationName}</div>
			<div class="clinic-sub">ИНН: ${payload.organizationInn || "7701234567"} • Стоматологическая клиника DENTE</div>
		</div>
		<div class="okud-badge">
			Унифицированная форма № Т-51<br>
			Постановление Госкомстата РФ № 1<br>
			Форма по ОКУД 0301009
		</div>
	</div>

	<div class="doc-title">
		Расчетный листок за период с ${fromDate} по ${toDate}
	</div>

	<div class="meta-grid">
		<div class="meta-item">
			<span class="meta-label">Сотрудник / Врач:</span>
			<span class="meta-value">${payload.doctorName}</span>
		</div>
		<div class="meta-item">
			<span class="meta-label">Специальность:</span>
			<span class="meta-value">${payload.specialtyTitle}</span>
		</div>
		<div class="meta-item">
			<span class="meta-label">Табельный №:</span>
			<span class="meta-value">${payload.personnelNumber || "ВР-001"}</span>
		</div>
	</div>

	<div class="overhead-notice">
		🛡️ <strong>Клинический стандарт DENTE:</strong> Общеклинические расходники (салфетки, ватные валики, слюноотсосы, перчатки, маски) на сумму <strong>${formatMoney(payload.overheadConsumablesCoveredRub || 0)}</strong> полностью оплачены клиникой и НЕ удерживаются из зарплаты врача.
	</div>

	<!-- 1. Начисления и категории -->
	<div class="section-title">1. Начислено вознаграждение (по категориям и услугам)</div>
	<table>
		<thead>
			<tr>
				<th>Направление / Категория</th>
				<th style="text-align: center;">Ставка %</th>
				<th style="text-align: right;">Выручка Gross</th>
				<th style="text-align: right;">Чистая база</th>
				<th style="text-align: right;">Начислено</th>
			</tr>
		</thead>
		<tbody>
			${categoryRowsHtml || `
			<tr>
				<td>Сдельная оплата труда (процент от выручки)</td>
				<td style="text-align: center;">—</td>
				<td style="text-align: right; font-family: monospace;">${formatMoney(payload.grossRevenueRub)}</td>
				<td style="text-align: right; font-family: monospace;">${formatMoney(payload.netBaseRevenueRub)}</td>
				<td style="text-align: right; font-family: monospace; font-weight: bold;">${formatMoney(payload.pieceworkAccruedRub)}</td>
			</tr>
			`}
			${payload.fixedSalaryRub ? `
			<tr>
				<td colspan="4">Гарантированный оклад за период</td>
				<td style="text-align: right; font-family: monospace; font-weight: bold;">${formatMoney(payload.fixedSalaryRub)}</td>
			</tr>` : ""}
			${payload.bonusesRub ? `
			<tr>
				<td colspan="4">Стимулирующие надбавки и премии</td>
				<td style="text-align: right; font-family: monospace; font-weight: bold;">${formatMoney(payload.bonusesRub)}</td>
			</tr>` : ""}
			<tr style="background: #f8fafc; font-weight: bold;">
				<td colspan="4" style="text-transform: uppercase;">Всего начислено:</td>
				<td style="text-align: right; font-family: monospace; font-size: 11px;">${formatMoney(payload.totalAccruedRub)}</td>
			</tr>
		</tbody>
	</table>

	<!-- 2. Удержания -->
	<div class="section-title">2. Удержания и налоги</div>
	<table>
		<thead>
			<tr>
				<th>Вид удержания</th>
				<th>Основание</th>
				<th style="text-align: right;">Сумма удержания</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td>Зуботехническая лаборатория (ЗТЛ)</td>
				<td>Заказ-наряды сторонних лабораторий (за вычетом гарантийных)</td>
				<td style="text-align: right; font-family: monospace;">${formatMoney(payload.withheldLabRub)}</td>
			</tr>
			<tr>
				<td>Прямые расходные материалы</td>
				<td>Имплантаты, мембраны, костные материалы (без салфеток и валиков)</td>
				<td style="text-align: right; font-family: monospace;">${formatMoney(payload.withheldMaterialRub)}</td>
			</tr>
			<tr>
				<td>НДФЛ (налог на доходы физлиц 13%)</td>
				<td>Статья 224 НК РФ</td>
				<td style="text-align: right; font-family: monospace;">${formatMoney(payload.ndflTaxRub)}</td>
			</tr>
			<tr style="background: #f8fafc; font-weight: bold;">
				<td colspan="2" style="text-transform: uppercase;">Всего удержано:</td>
				<td style="text-align: right; font-family: monospace; color: #b91c1c;">${formatMoney(payload.withheldLabRub + payload.withheldMaterialRub + payload.ndflTaxRub)}</td>
			</tr>
		</tbody>
	</table>

	<!-- 3. Итого к выплате -->
	<div class="total-banner">
		<span class="lbl">ИТОГО К ВЫПЛАТЕ («НА РУКИ»):</span>
		<span class="val">${formatMoney(payload.netPayoutRub)}</span>
	</div>

	${(payload.visits && payload.visits.length > 0) ? `
	<!-- 4. Детализация по пациентам -->
	<div class="section-title">3. Реестр выполненных процедур по пациентам (${payload.visits.length} поз.)</div>
	<table>
		<thead>
			<tr>
				<th style="text-align: center; width: 24px;">№</th>
				<th style="width: 70px;">Дата</th>
				<th>Пациент (карта)</th>
				<th>Наименование услуги</th>
				<th style="text-align: center; width: 80px;">Код 804н</th>
				<th style="text-align: right; width: 80px;">Цена</th>
				<th style="text-align: right; width: 80px;">Начислено</th>
			</tr>
		</thead>
		<tbody>
			${visitsHtml}
		</tbody>
	</table>
	` : ""}

	${(payload.labOrders && payload.labOrders.length > 0) ? `
	<!-- 5. Детализация по лаборатории -->
	<div class="section-title">4. Реестр заказ-нарядов зуботехнической лаборатории (${payload.labOrders.length} нарядов)</div>
	<table>
		<thead>
			<tr>
				<th style="text-align: center; width: 24px;">№</th>
				<th style="width: 80px;">Наряд ЗТЛ</th>
				<th>Пациент</th>
				<th>Ортопедическая конструкция</th>
				<th style="text-align: right; width: 80px;">Стоимость</th>
				<th style="text-align: center; width: 110px;">Статус гарантии</th>
				<th style="text-align: right; width: 80px;">Удержано</th>
			</tr>
		</thead>
		<tbody>
			${labHtml}
		</tbody>
	</table>
	` : ""}

	<div class="signatures">
		<div class="sig-block">
			<div class="sig-line"></div>
			Руководитель клиники / Главврач
		</div>
		<div class="sig-block">
			<div class="sig-line"></div>
			Главный бухгалтер
		</div>
		<div class="sig-block">
			<div class="sig-line"></div>
			С расчетом ознакомлен (Врач)
		</div>
	</div>
</body>
</html>`;
}
