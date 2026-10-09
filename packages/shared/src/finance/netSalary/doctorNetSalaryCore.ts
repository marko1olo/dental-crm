/**
 * doctorNetSalaryCore.ts — Statutory Doctor Net Revenue & Form T-51 Payroll Engine Core.
 * Layer 2: Pure Domain Logic & Calculation Engines.
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
} from "../../money.js";
import { kopecksToRub as kopecksToRubles } from "../../fiscal/kopecksArithmetic.js";
import {
	type DoctorNetSalaryInput,
	type DoctorNetSalaryBreakdown,
	type IdentDoctorSalaryCalculationParams,
	type IdentDoctorSalaryCalculationResult,
	IDENT_SALARY_MODEL_NAMES_RU,
	type ServiceSalaryItemInput,
	type ServiceSalaryItemBreakdown,
	type DoctorT51PrintPayload,
} from "./types.js";
import { toKop, calculateIdentDiscountSalaryBase } from "./taxAndDeductionMath.js";
import { extractDeductibleMaterialsFromWriteoff } from "./labCostDeductionEngine.js";

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

	// Разовые вычеты из процента врача (Dentaro)
	let oneTimeDeductionsTotalKop = 0 as Kopecks;
	if (input.oneTimeDeductions && input.oneTimeDeductions.length > 0) {
		for (const d of input.oneTimeDeductions) {
			oneTimeDeductionsTotalKop = (oneTimeDeductionsTotalKop + Math.max(0, d.amountKop)) as Kopecks;
		}
	}
	const effectivePieceworkAccruedKop = Math.max(0, pieceworkAccruedKop - oneTimeDeductionsTotalKop) as Kopecks;

	// Депремирование по ТК РФ (ст. 137, 192): неначисление или уменьшение стимулирующей премии,
	// но категорически запрещено вычитать штрафы из сдельной части, оклада или процедурных тарифов!
	const effectiveBonusesKop = Math.max(0, bonusesKop - penaltiesKop) as Kopecks;

	// Общее начисление до налога
	const rawAccruedKop = effectivePieceworkAccruedKop + fixedSalaryKop + serviceSalaryPriceKop + effectiveBonusesKop;
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
		oneTimeDeductions: input.oneTimeDeductions,
		oneTimeDeductionsTotalKop,
		oneTimeDeductionsTotalRub: kopecksToRubles(oneTimeDeductionsTotalKop),
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
 * Рассчитывает заработную плату врача по 3 моделям IDENT:
 * 1. Gross (без вычета ЗТЛ и материалов)
 * 2. Net (за вычетом ЗТЛ и материалов Уровня 2, защищая Уровень 1 ст. 129 ТК РФ)
 * 3. Cash Basis (по факту денег в кассе с поддержкой «Цены для ЗП» и 4 политик скидки)
 */
export function calculateIdentDoctorSalary(
	params: IdentDoctorSalaryCalculationParams,
): IdentDoctorSalaryCalculationResult {
	const grossRevenueKop = toKop(params.grossRevenueRub, params.grossRevenueKop);
	const rawInvoiceTotal = toKop(params.invoiceTotalRub, params.invoiceTotalKop);
	const invoiceTotalKop = rawInvoiceTotal > 0 ? rawInvoiceTotal : grossRevenueKop;

	let expensiveMaterialsCostKop = toKop(params.expensiveMaterialsCostRub, params.expensiveMaterialsCostKop);
	let overheadMaterialsCostKop = toKop(params.overheadMaterialsCostRub, params.overheadMaterialsCostKop);

	if (params.materialWriteoffResult) {
		const extracted = extractDeductibleMaterialsFromWriteoff(params.materialWriteoffResult);
		if (expensiveMaterialsCostKop === 0) {
			expensiveMaterialsCostKop = extracted.expensiveClinicalCostKop;
		}
		if (overheadMaterialsCostKop === 0) {
			overheadMaterialsCostKop = extracted.cheapOverheadCostKop;
		}
	}

	const labCostKop = toKop(params.labCostRub, params.labCostKop);
	const salaryPriceKop = toKop(params.salaryPriceRub, params.salaryPriceKop);
	const fixedSalaryKop = toKop(params.fixedSalaryRub, params.fixedSalaryKop);
	const bonusesKop = toKop(params.bonusesRub, params.bonusesKop);
	const penaltiesKop = toKop(params.penaltiesRub, params.penaltiesKop);

	const doctorPercent = Math.max(0, Math.min(100, params.doctorPercent));
	const salaryPriceApp = params.salaryPriceApplication ?? "flat_addition";
	const discountPolicy = params.discountPolicy ?? "proportional";

	let effectiveBaseKop = 0 as Kopecks;
	let pieceworkAccruedKop = 0 as Kopecks;
	let salaryPriceAdditionKop = 0 as Kopecks;
	let deductedLabKop = 0 as Kopecks;
	let deductedExpensiveMaterialsKop = 0 as Kopecks;
	let coveredOverheadMaterialsKop = overheadMaterialsCostKop;
	let paidRatio = 1.0;
	let deferredPendingDoctorEarningsKop = 0 as Kopecks;

	switch (params.model) {
		case "gross": {
			// Модель 1: Валовая выручка без вычетов ЗТЛ и материалов
			const baseCandidate = (salaryPriceApp === "replaces_gross_base" && salaryPriceKop > 0)
				? salaryPriceKop
				: grossRevenueKop;
			effectiveBaseKop = Math.max(0, baseCandidate) as Kopecks;
			pieceworkAccruedKop = Math.round((effectiveBaseKop * doctorPercent) / 100) as Kopecks;
			salaryPriceAdditionKop = salaryPriceApp === "flat_addition" ? salaryPriceKop : 0 as Kopecks;
			deductedLabKop = 0 as Kopecks;
			deductedExpensiveMaterialsKop = 0 as Kopecks;
			paidRatio = 1.0;
			deferredPendingDoctorEarningsKop = 0 as Kopecks;
			break;
		}

		case "net": {
			// Модель 2: Чистая выручка (Gross - Lab - Expensive Materials)
			const baseCandidate = (salaryPriceApp === "replaces_gross_base" && salaryPriceKop > 0)
				? salaryPriceKop
				: grossRevenueKop;
			deductedLabKop = labCostKop;
			deductedExpensiveMaterialsKop = expensiveMaterialsCostKop;
			// Общеклинические материалы (Уровень 1) защищены ст. 129 ТК РФ и НЕ удерживаются
			effectiveBaseKop = Math.max(0, baseCandidate - labCostKop - expensiveMaterialsCostKop) as Kopecks;
			pieceworkAccruedKop = Math.round((effectiveBaseKop * doctorPercent) / 100) as Kopecks;
			salaryPriceAdditionKop = salaryPriceApp === "flat_addition" ? salaryPriceKop : 0 as Kopecks;
			paidRatio = 1.0;
			deferredPendingDoctorEarningsKop = 0 as Kopecks;
			break;
		}

		case "cash_basis": {
			// Модель 3: По факту денег в кассе (Cash Basis)
			const paidAmountKop = toKop(params.paidAmountRub, params.paidAmountKop);
			paidRatio = invoiceTotalKop > 0 ? Math.min(1, Math.max(0, paidAmountKop / invoiceTotalKop)) : 1.0;

			const targetBaseCandidate = (salaryPriceApp === "replaces_gross_base" && salaryPriceKop > 0)
				? salaryPriceKop
				: grossRevenueKop;
			const clinicCostsKop = (labCostKop + expensiveMaterialsCostKop) as Kopecks;

			const discountResult = calculateIdentDiscountSalaryBase({
				grossRevenueKop: targetBaseCandidate,
				invoiceTotalKop,
				paidKop: paidAmountKop,
				discountKop: Math.max(0, targetBaseCandidate - invoiceTotalKop) as Kopecks,
				clinicCostsKop,
				policy: discountPolicy,
			});

			effectiveBaseKop = discountResult.doctorBaseKop;
			pieceworkAccruedKop = Math.round((effectiveBaseKop * doctorPercent) / 100) as Kopecks;
			salaryPriceAdditionKop = salaryPriceApp === "flat_addition"
				? Math.round(salaryPriceKop * paidRatio) as Kopecks
				: 0 as Kopecks;

			deductedLabKop = labCostKop;
			deductedExpensiveMaterialsKop = expensiveMaterialsCostKop;

			// Расчет отложенного вознаграждения (если счет оплачен не полностью)
			const fullPotentialDiscountResult = calculateIdentDiscountSalaryBase({
				grossRevenueKop: targetBaseCandidate,
				invoiceTotalKop,
				paidKop: invoiceTotalKop,
				discountKop: Math.max(0, targetBaseCandidate - invoiceTotalKop) as Kopecks,
				clinicCostsKop,
				policy: discountPolicy,
			});
			const potentialBaseAt100 = fullPotentialDiscountResult.doctorBaseKop;
			const potentialPieceworkAt100 = Math.round((potentialBaseAt100 * doctorPercent) / 100) as Kopecks;
			const potentialSalaryPriceAt100 = salaryPriceApp === "flat_addition" ? salaryPriceKop : 0 as Kopecks;
			const potentialTotalAt100 = (potentialPieceworkAt100 + potentialSalaryPriceAt100) as Kopecks;

			deferredPendingDoctorEarningsKop = Math.max(
				0,
				potentialTotalAt100 - (pieceworkAccruedKop + salaryPriceAdditionKop),
			) as Kopecks;
			break;
		}
	}

	// Разовые удержания Dentaro (брак ЗТЛ, переделки) из сдельщины
	let oneTimeDeductionsTotalKop = 0 as Kopecks;
	if (params.oneTimeDeductions && params.oneTimeDeductions.length > 0) {
		for (const d of params.oneTimeDeductions) {
			oneTimeDeductionsTotalKop = (oneTimeDeductionsTotalKop + Math.max(0, d.amountKop)) as Kopecks;
		}
	}
	const grossDoctorEarningsKop = (pieceworkAccruedKop + salaryPriceAdditionKop) as Kopecks;
	const effectivePieceworkKop = Math.max(0, grossDoctorEarningsKop - oneTimeDeductionsTotalKop) as Kopecks;

	// Депремирование по ст. 137, 192 ТК РФ — только из бонусов, оклад и сдельная часть защищены
	const effectiveBonusesKop = Math.max(0, bonusesKop - penaltiesKop) as Kopecks;

	// Итого начислено до налога
	const totalAccruedKop = Math.max(0, effectivePieceworkKop + fixedSalaryKop + effectiveBonusesKop) as Kopecks;

	const ndflRatePercent = params.ndflRatePercent !== undefined ? Math.max(0, params.ndflRatePercent) : 13;
	const ndflTaxKop = Math.round((totalAccruedKop * ndflRatePercent) / 100) as Kopecks;
	const netPayoutKop = Math.max(0, totalAccruedKop - ndflTaxKop) as Kopecks;

	return {
		model: params.model,
		modelNameRu: IDENT_SALARY_MODEL_NAMES_RU[params.model],
		grossRevenueKop,
		grossRevenueRub: kopecksToRubles(grossRevenueKop),
		effectiveBaseKop,
		effectiveBaseRub: kopecksToRubles(effectiveBaseKop),
		appliedPercent: doctorPercent,
		pieceworkAccruedKop,
		pieceworkAccruedRub: kopecksToRubles(pieceworkAccruedKop),
		salaryPriceAdditionKop,
		salaryPriceAdditionRub: kopecksToRubles(salaryPriceAdditionKop),
		fixedSalaryKop,
		fixedSalaryRub: kopecksToRubles(fixedSalaryKop),
		bonusesKop,
		bonusesRub: kopecksToRubles(bonusesKop),
		penaltiesKop,
		penaltiesRub: kopecksToRubles(penaltiesKop),
		effectiveBonusesKop,
		effectiveBonusesRub: kopecksToRubles(effectiveBonusesKop),
		oneTimeDeductionsTotalKop,
		oneTimeDeductionsTotalRub: kopecksToRubles(oneTimeDeductionsTotalKop),
		totalAccruedKop,
		totalAccruedRub: kopecksToRubles(totalAccruedKop),
		ndflTaxKop,
		ndflTaxRub: kopecksToRubles(ndflTaxKop),
		netPayoutKop,
		netPayoutRub: kopecksToRubles(netPayoutKop),
		deferredPendingDoctorEarningsKop,
		deferredPendingDoctorEarningsRub: kopecksToRubles(deferredPendingDoctorEarningsKop),
		paidRatio,
		deductedLabKop,
		deductedLabRub: kopecksToRubles(deductedLabKop),
		deductedExpensiveMaterialsKop,
		deductedExpensiveMaterialsRub: kopecksToRubles(deductedExpensiveMaterialsKop),
		coveredOverheadMaterialsKop,
		coveredOverheadMaterialsRub: kopecksToRubles(coveredOverheadMaterialsKop),
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
			<div class="clinic-sub">${payload.organizationInn ? `ИНН: ${payload.organizationInn} • ` : ""}Стоматологическая клиника DENTE</div>
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
		<strong>Клинический стандарт DENTE:</strong> Общеклинические расходники (салфетки, ватные валики, слюноотсосы, перчатки, маски) на сумму <strong>${formatMoney(payload.overheadConsumablesCoveredRub || 0)}</strong> полностью оплачены клиникой и НЕ удерживаются из зарплаты врача.
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

	<!-- Справочно: Прямые клинические затраты -->
	${(payload.withheldLabRub > 0 || payload.withheldMaterialRub > 0) ? `
	<div class="section-title">2. Прямые клинические затраты, уменьшившие расчетную базу (ст. 129 ТК РФ)</div>
	<table>
		<thead>
			<tr>
				<th>Вид затрат</th>
				<th>Основание списания</th>
				<th style="text-align: right;">Сумма, руб.</th>
			</tr>
		</thead>
		<tbody>
			${payload.withheldLabRub > 0 ? `
			<tr>
				<td>Зуботехническая лаборатория (ЗТЛ)</td>
				<td>Заказ-наряды сторонних лабораторий (за вычетом гарантийных)</td>
				<td style="text-align: right; font-family: monospace;">${formatMoney(payload.withheldLabRub)}</td>
			</tr>` : ""}
			${payload.withheldMaterialRub > 0 ? `
			<tr>
				<td>Прямые расходные материалы</td>
				<td>Имплантаты, мембраны, костные материалы (без салфеток и валиков)</td>
				<td style="text-align: right; font-family: monospace;">${formatMoney(payload.withheldMaterialRub)}</td>
			</tr>` : ""}
			<tr style="background: #f8fafc; font-weight: bold;">
				<td colspan="2" style="text-transform: uppercase;">Итого прямых клинических затрат:</td>
				<td style="text-align: right; font-family: monospace; color: #475569;">${formatMoney(payload.withheldLabRub + payload.withheldMaterialRub)}</td>
			</tr>
		</tbody>
	</table>
	` : ""}

	<!-- 2. Удержания из заработной платы -->
	<div class="section-title">${(payload.withheldLabRub > 0 || payload.withheldMaterialRub > 0) ? "3" : "2"}. Удержания из заработной платы (ст. 137 ТК РФ, ст. 224 НК РФ)</div>
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
				<td>НДФЛ (налог на доходы физлиц 13%)</td>
				<td>Статья 224 НК РФ</td>
				<td style="text-align: right; font-family: monospace;">${formatMoney(payload.ndflTaxRub)}</td>
			</tr>
			<tr style="background: #f8fafc; font-weight: bold;">
				<td colspan="2" style="text-transform: uppercase;">Всего удержано:</td>
				<td style="text-align: right; font-family: monospace; color: #b91c1c;">${formatMoney(payload.ndflTaxRub)}</td>
			</tr>
		</tbody>
	</table>

	<!-- Итого к выплате -->
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
