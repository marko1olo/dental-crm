/**
 * distributionCalculator.ts — Расчет распределения стоимости услуги между ДМС и пациентом
 */

import { kopecksToRub, rubToKopecks } from "./currencyMath.js";

export function calculateServiceDmsDistribution(params: {
	priceRub: number;
	quantity?: number | undefined;
	isExcluded?: boolean | undefined;
	franchisePct?: number | undefined;
	franchiseFixedRub?: number | undefined;
	remainingLetterLimitRub?: number | null | undefined;
	remainingPolicyLimitRub?: number | null | undefined;
	isExplicitlyApproved?: boolean | undefined;
}): {
	lineTotalRub: number;
	dmsCoveredRub: number;
	patientPaidRub: number;
	effectiveCoveragePct: number;
	reason: string;
} {
	const quantity = Math.max(1, Math.round(params.quantity ?? 1));
	const unitPriceKop = rubToKopecks(params.priceRub);
	const lineTotalKop = unitPriceKop * quantity;
	const lineTotalRub = kopecksToRub(lineTotalKop);

	if (lineTotalKop <= 0) {
		return { lineTotalRub: 0, dmsCoveredRub: 0, patientPaidRub: 0, effectiveCoveragePct: 0, reason: "Нулевая стоимость услуги" };
	}

	if (params.isExcluded && !params.isExplicitlyApproved) {
		return {
			lineTotalRub, dmsCoveredRub: 0, patientPaidRub: lineTotalRub, effectiveCoveragePct: 0,
			reason: "Услуга входит в перечень исключений полиса ДМС (100% оплата пациентом)",
		};
	}

	let targetCoveredKop = lineTotalKop;
	let reason = "100% покрытие по условиям программы ДМС";

	if (params.franchisePct && params.franchisePct > 0) {
		const clamped = Math.min(100, Math.max(0, params.franchisePct));
		const patientShareKop = Math.round(lineTotalKop * (clamped / 100));
		targetCoveredKop = Math.max(0, lineTotalKop - patientShareKop);
		reason = `Покрытие ДМС с франшизой пациента ${clamped}%`;
	} else if (params.franchiseFixedRub && params.franchiseFixedRub > 0) {
		const fixedFranchiseKop = rubToKopecks(params.franchiseFixedRub);
		const patientShareKop = Math.min(lineTotalKop, fixedFranchiseKop);
		targetCoveredKop = Math.max(0, lineTotalKop - patientShareKop);
		reason = `Покрытие ДМС за вычетом фиксированной франшизы (${params.franchiseFixedRub} ₽)`;
	}

	if (params.remainingLetterLimitRub != null && Number.isFinite(params.remainingLetterLimitRub)) {
		const availKop = Math.max(0, rubToKopecks(params.remainingLetterLimitRub));
		if (targetCoveredKop > availKop) {
			targetCoveredKop = availKop;
			reason += ` (ограничено остатком гарантийного письма: ${params.remainingLetterLimitRub} ₽)`;
		}
	}

	if (params.remainingPolicyLimitRub != null && Number.isFinite(params.remainingPolicyLimitRub)) {
		const availPolicyKop = Math.max(0, rubToKopecks(params.remainingPolicyLimitRub));
		if (targetCoveredKop > availPolicyKop) {
			targetCoveredKop = availPolicyKop;
			reason += ` (ограничено годовым лимитом полиса: ${params.remainingPolicyLimitRub} ₽)`;
		}
	}

	const patientPaidKop = lineTotalKop - targetCoveredKop;
	const dmsCoveredRub = kopecksToRub(targetCoveredKop);
	const patientPaidRub = kopecksToRub(patientPaidKop);
	const effectiveCoveragePct = lineTotalKop > 0 ? Math.round((targetCoveredKop / lineTotalKop) * 100) : 0;

	return { lineTotalRub, dmsCoveredRub, patientPaidRub, effectiveCoveragePct, reason };
}
