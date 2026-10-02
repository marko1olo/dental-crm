/**
 * planInsuranceCoverage.ts — Расчет страхового покрытия ДМС по категориям услуг (DENTE CRM).
 *
 * Математика:
 * 1. Проценты покрытия берутся строго из договора ДМС для каждой категории услуг.
 * 2. Расчет ведется в базисных пунктах (1% = 100 б.п.) для исключения потери копеек.
 * 3. Никаких «средних арифметических» по договору: каждая позиция сметы покрывается по своему разделу.
 */

import {
	type Kopecks,
	percentageOfKopecks,
	sumKopecks,
} from "@dental/shared";

/**
 * Процент договора ДМС в базисные пункты (1% = 100 б.п.).
 *
 * `percentageOfKopecks` намеренно не принимает дробный процент: доля от суммы
 * должна считаться целыми. Больше двух знаков после запятой в проценте
 * покрытия — это не покрытие, а ошибка ввода, и молча округлять её нельзя.
 */
export function basisPointsFromPercent(percent: number): number | null {
	if (!Number.isFinite(percent) || percent < 0 || percent > 100) return null;
	const basisPoints = Math.round(percent * 100);
	if (Math.abs(percent * 100 - basisPoints) > 1e-6) return null;
	return basisPoints;
}

/** Проценты покрытия из договора ДМС. */
export interface InsuranceCoveragePercents {
	coverageTherapyPct: number;
	coverageOrthoPct: number;
	coverageHygienePct: number;
	coverageSurgeryPct: number;
}

/**
 * Процент покрытия для раздела прайса.
 *
 * Раскладка та же, что уже применяется в useAppLogic.tsx для сводки по
 * пациенту: терапия/консультация/периодонтология → терапевтический процент,
 * хирургия → хирургический, ортодонтия и протезирование → ортодонтический,
 * гигиена → гигиенический. Остальное не покрыто.
 */
export function coveragePercentForCategory(
	category: string | null | undefined,
	contract: InsuranceCoveragePercents,
): number {
	switch (category) {
		case "therapy":
		case "consultation":
		case "periodontology":
			return contract.coverageTherapyPct || 0;
		case "surgery":
			return contract.coverageSurgeryPct || 0;
		case "orthodontics":
		case "prosthetics":
			return contract.coverageOrthoPct || 0;
		case "hygiene":
			return contract.coverageHygienePct || 0;
		default:
			return 0;
	}
}

/** Строка плана вместе с разделом прайса, по которому считается покрытие ДМС. */
export interface InsuranceLine {
	lineKopecks: Kopecks;
	category: string | null | undefined;
}

/**
 * Доля ДМС по плану: построчно, по разделу каждой услуги.
 *
 * Каждая строка проверяется по своему разделу прейскуранта, исключая усреднение.
 */
export function insuranceCoverageKopecks(
	lines: readonly InsuranceLine[],
	contract: InsuranceCoveragePercents,
): Kopecks {
	const shares: Kopecks[] = [];
	for (const line of lines) {
		const basisPoints = basisPointsFromPercent(
			coveragePercentForCategory(line.category, contract),
		);
		if (basisPoints === null || basisPoints === 0) continue;
		shares.push(percentageOfKopecks(line.lineKopecks, basisPoints));
	}
	return sumKopecks(shares);
}
